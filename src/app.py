import logging
import os
import hashlib
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama

# Import your local modules
from ingest import process_file
from vector_store_faiss import VectorStoreManager
from agents import run_pipeline, AgentState

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

st.set_page_config(
    page_title="AcaDoc AI - Medical Education Assistant", 
    page_icon="🏥", 
    layout="wide"
)

@st.cache_resource
def get_vector_store(pdf_path):
    """
    Initializes or loads a FAISS vector store for a specific PDF.
    """
    # Create a unique ID for the file to prevent index collisions
    file_hash = hashlib.md5(pdf_path.encode()).hexdigest()[:10]
    base_dir = os.path.dirname(os.path.abspath(__file__))
    persist_dir = os.path.join(base_dir, "..", "faiss_index", file_hash)
    
    manager = VectorStoreManager(
        persist_dir=persist_dir,
        model_name="all-MiniLM-L6-v2"  # Ensure this matches your embedding model
    )

    # Check if we need to ingest the file
    if not os.path.exists(os.path.join(persist_dir, "index.faiss")):
        with st.spinner(f"First-time indexing: {Path(pdf_path).name}..."):
            logger.info(f"Indexing new file: {pdf_path}")
            chunks = process_file(pdf_path)
            if not chunks:
                st.error("Failed to extract text from PDF.")
                return None
            manager.add_documents(chunks)
    else:
        logger.info(f"Loading existing index from {persist_dir}")
        manager.load()
    
    return manager

def get_llm(provider="OpenAI", model="gpt-4o-mini"):
    if provider == "OpenAI":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            st.error("OPENAI_API_KEY not set in environment")
            return None
        return ChatOpenAI(model=model, temperature=0.0)
    else:
        # Ollama (Local or Hosted)
        ollama_key = os.getenv("OLLAMA_API_KEY")
        logger.info(f"Using Ollama model: {model} (Key present: {bool(ollama_key)})")
        
        # If there's an API key, it might be a hosted service requiring headers
        # Otherwise, standard local ChatOllama works
        return ChatOllama(
            model=model, 
            temperature=0.0,
        )

def main():
    st.title("🏥 AcaDoc AI")
    st.markdown("*Medical Education Assistant - Proof of Concept*")
    st.markdown("---")

    # Sidebar: Configuration
    st.sidebar.header("Configuration")

    uploaded_file = st.sidebar.file_uploader(
        "Upload Medical Reference", 
        type=["pdf", "md", "txt"], 
        help="Upload a new file to analyze"
    )
    
    if uploaded_file:
        os.makedirs("data", exist_ok=True)
        pdf_path = os.path.join("data", uploaded_file.name)
        with open(pdf_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        selected_pdf = pdf_path
    else:
        # Define paths clearly
        pdf_options = [
            "data/Grays_Anatomy_Extracted_2.pdf",
            "data/sample_pharma.pdf"
        ]
        selected_pdf = st.sidebar.selectbox("Or Select Existing Textbook", pdf_options)

    if not Path(selected_pdf).exists():
        st.sidebar.warning("Selected file not found in /data directory.")
        return

    # --- FAISS Initialization ---
    vector_store = get_vector_store(selected_pdf)
    
    if vector_store is None:
        st.error("Vector store initialization failed.")
        st.stop()

    # Get count for display (Update this according to your VectorStoreManager attributes)
    try:
        num_chunks = vector_store.index.ntotal
        st.sidebar.success(f"Indexed {num_chunks} chunks")
    except:
        st.sidebar.info("Index loaded successfully")

    # LLM initialization
    llm_provider = st.sidebar.selectbox("LLM Provider", ["OpenAI", "Ollama"], index=1) # Default to Ollama given quota issues
    
    if llm_provider == "OpenAI":
        llm_model = "gpt-4o-mini"
    else:
        default_model = os.getenv("OLLAMA_MODEL", "llama3")
        llm_model = st.sidebar.text_input("Ollama Model", value=default_model)
        st.sidebar.info(f"Using model: {llm_model}")

    llm = get_llm(provider=llm_provider, model=llm_model)
    if not llm: return

    st.sidebar.markdown("---")
    st.sidebar.markdown("**Guardrails:**\n- Temp: 0.0\n- Context: Strict")

    # Main UI
    st.header("Ask a Medical Question")
    question = st.text_input("Enter your question:", placeholder="e.g., Describe the anatomy of the heart.")

    if question:
        with st.spinner("Analyzing medical context..."):
            # Ensure your run_pipeline accepts the manager and the llm
            result = run_pipeline(question, vector_store, llm)

            st.markdown("---")
            st.header("Answer")

            # Validation Metadata
            is_sufficient = result.get("validated_context") == "SUFFICIENT"
            if is_sufficient:
                st.success(f"✓ Context Validated")
            else:
                st.warning("⚠ Fallback used: Information not found in source.")

            st.markdown(result.get("answer", "No answer generated"))

            # Citations
            citations = result.get("citations", [])
            if citations:
                with st.expander("📚 Source Citations"):
                    for i, cit in enumerate(citations, 1):
                        st.markdown(f"**[{i}]** Page {cit.get('page', 'N/A')}")

            # Debug
            with st.expander("🔍 Debug: Retrieved Context"):
                chunks = result.get("retrieved_chunks", [])
                for i, chunk in enumerate(chunks, 1):
                    content = getattr(chunk, 'page_content', str(chunk))
                    st.markdown(f"**Chunk {i}:**")
                    st.text(content[:300] + "...")

if __name__ == "__main__":
    main()