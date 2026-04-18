"""
Streamlit UI: AcaDoc AI POC Interface
Technical Plan v1.2 Section 8: Agent Architecture + UI Integration
"""

import logging
import os
from pathlib import Path

import streamlit as st
from langchain_openai import ChatOpenAI

from ingest import ingest_pdf
from index import VectorStoreManager, create_index
from agents import run_pipeline, AgentState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page config
st.set_page_config(
    page_title="AcaDoc AI - Medical Education Assistant", page_icon="🏥", layout="wide"
)


@st.cache_data
def initialize_vector_store(
    pdf_path: str, persist_dir: str = "chroma_db"
) -> VectorStoreManager:
    """
    Initialize or load vector store.
    Cached to avoid re-indexing on every interaction.
    """
    logger.info(f"Initializing vector store from: {pdf_path}")

    # Check if persistent store exists and has data
    if Path(persist_dir).exists():
        try:
            manager = VectorStoreManager(persist_directory=persist_dir)
            if manager.collection.count() > 0:
                logger.info("Loaded existing vector store")
                return manager
        except Exception as e:
            logger.warning(f"Could not load existing store: {e}")

    # Create new index
    documents = ingest_pdf(pdf_path)
    manager = create_index(documents, persist_directory=persist_dir)
    logger.info("Created new vector store")
    return manager


def get_llm():
    """
    Initialize LLM with strict settings for medical accuracy.
    Temperature = 0.0 (deterministic, per Technical Plan)
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        st.error("OPENAI_API_KEY not set in environment")
        return None

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
    logger.info("LLM initialized with temperature=0.0")
    return llm


def main():
    """Main Streamlit application."""

    # Header
    st.title("🏥 AcaDoc AI")
    st.markdown("*Medical Education Assistant - Proof of Concept*")
    st.markdown("---")

    # Sidebar: Configuration
    st.sidebar.header("Configuration")

    # PDF selection
    pdf_options = [r"C:\Users\MUFAQHAM\Downloads\Gray's Anatomy .pdf", "data/sample_pharma.pdf"]
    selected_pdf = st.sidebar.selectbox(
        "Select Textbook",
        pdf_options,
        help="Select which medical textbook to use for grounding",
    )

    # Check PDF exists
    if not Path(selected_pdf).exists():
        st.error(f"PDF not found: {selected_pdf}")
        st.info("Place a PDF file in the data/ directory")
        return

    # Initialize on first run
    with st.spinner("Loading textbook index..."):
        vector_store = initialize_vector_store(selected_pdf)
        st.sidebar.success(f"Indexed {vector_store.collection.count()} chunks")

    # LLM initialization
    llm = get_llm()
    if not llm:
        st.warning("Configure OPENAI_API_KEY to enable answer generation")
        return

    st.sidebar.markdown("---")
    st.sidebar.markdown("**Guardrails Active:**")
    st.sidebar.markdown("• Temperature = 0.0")
    st.sidebar.markdown("• Context validation enforced")
    st.sidebar.markdown("• Fallback on insufficient evidence")

    # Main content: Question input
    st.header("Ask a Medical Question")

    question = st.text_input(
        "Enter your question:",
        placeholder="e.g., What is the mechanism of action of aspirin?",
        help="Questions are grounded in the selected textbook",
    )

    # Process question
    if question:
        with st.spinner("Processing through 3-agent pipeline..."):
            logger.info(f"Processing question: {question}")

            # Run pipeline
            result = run_pipeline(question, vector_store, llm)

            # Display results
            st.markdown("---")
            st.header("Answer")

            # Validation indicator
            confidence = result.get("validation_confidence", 0.0)
            is_sufficient = result.get("validated_context") == "SUFFICIENT"

            if is_sufficient:
                st.success(f"✓ Context Validated (Confidence: {confidence:.1%})")
            else:
                st.warning("⚠ Insufficient Context - Using Fallback")

            # Answer display
            st.markdown(result.get("answer", "No answer generated"))

            # Citations panel
            citations = result.get("citations", [])
            if citations:
                st.markdown("---")
                with st.expander("📚 Source Citations", expanded=True):
                    for i, cit in enumerate(citations, 1):
                        file_name = Path(cit.get("file_name", "")).name
                        st.markdown(
                            f"**[{i}]** {file_name} - Page {cit.get('page', '?')}"
                        )
            else:
                st.info("No citations available (fallback response)")

            # Debug: Show retrieved chunks (collapsible)
            with st.expander("🔍 Debug: Retrieved Context"):
                chunks = result.get("retrieved_chunks", [])
                for i, chunk in enumerate(chunks, 1):
                    meta = chunk.get("metadata", {})
                    st.markdown(f"**Chunk {i}** (Page {meta.get('page', '?')}):")
                    st.text(chunk.get("content", "")[:500] + "...")

            # Validation details
            val_result = result.get("validation_result")
            if val_result:
                st.markdown("---")
                with st.expander("🔐 Validation Details"):
                    st.json(val_result)


if __name__ == "__main__":
    main()
