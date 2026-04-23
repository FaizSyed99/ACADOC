# api/index.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
import asyncio
import shutil
from pathlib import Path
from dotenv import load_dotenv

# Ensure src/ is importable for VectorStoreManager and ingest
_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

# Import agent pipeline — api/agents.py is async-capable with query expansion
try:
    from .agents import run_pipeline, create_initial_state  # noqa: F401
except ImportError:
    from agents import run_pipeline, create_initial_state  # noqa: F401

# Import FAISS vector store from src/
try:
    from vector_store_faiss import VectorStoreManager
except ImportError:
    from src.vector_store_faiss import VectorStoreManager

load_dotenv()

app = FastAPI(title="AcaDoc AI API")
vector_store = None


def get_vector_store():
    """Singleton FAISS vector store initializer."""
    global vector_store
    if vector_store is None:
        try:
            vector_store = VectorStoreManager()
        except Exception as e:
            print(f"[ERROR] Vector store init failed: {e}")
            return None
    return vector_store


def get_llm():
    """Model Factory: Tries OpenAI first, falls back to Ollama. Temperature=0 for determinism (§9)."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and len(openai_key) > 10:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                api_key=openai_key,
                temperature=0.0,  # §9: near-zero hallucination tolerance
            )
        except (ImportError, Exception) as e:
            print(f"[WARN] OpenAI init failed: {e}. Falling back to Ollama...")

    # Fallback to Ollama
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "gemma2:9b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            temperature=0.0,  # §9: deterministic medical outputs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No LLM provider available: {e}")


# === Pydantic Models ===
class QueryRequest(BaseModel):
    question: str


class Citation(BaseModel):
    source: str
    page: str
    file_name: str


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    is_sufficient: bool
    confidence: float
    validation_reason: Optional[str] = None


# === Endpoints ===
@app.post("/api/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    """
    Main chat endpoint implementing Technical Plan §4, §8, §9:
    Retrieve → Validate → Generate pipeline with source-backed outputs.
    api/agents.py run_pipeline is async; supports query expansion + dedup.
    """
    llm = get_llm()
    vs = get_vector_store()

    if not vs:
        raise HTTPException(
            status_code=503,
            detail="Vector store not initialized. Check ingestion pipeline.",
        )

    try:
        # api/agents.run_pipeline is async — await directly
        result = await run_pipeline(request.question, vs, llm)

        return QueryResponse(
            answer=result.get("answer", "No answer generated"),
            citations=[
                Citation(
                    source=c.get("source", "Unknown"),
                    page=str(c.get("page", "N/A")),
                    file_name=c.get("file_name", "Unknown"),
                )
                for c in result.get("citations", [])
            ],
            is_sufficient=result.get("validated_context") == "SUFFICIENT",
            confidence=float(result.get("validation_confidence", 0.0)),
            validation_reason=result.get("validation_result", {}).get("reason"),
        )

    except Exception as e:
        print(f"[CHAT ERROR] {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")


@app.get("/api/health")
async def health():
    """Health check for load balancers / monitoring."""
    vs_status = "connected" if vector_store else "not_initialized"
    return {"status": "healthy", "service": "AcaDoc AI", "vector_store": vs_status}


@app.post("/api/ingest")
async def ingest_file(file: UploadFile = File(...)):
    """
    Unified ingestion endpoint. Supports PDF, Markdown, Text, and Images.
    Extracts text, chunks semantically, and adds to FAISS vector store.
    """
    vs = get_vector_store()
    if not vs:
        raise HTTPException(status_code=503, detail="Vector store not initialized.")

    try:
        # Save file temporarily
        os.makedirs("data", exist_ok=True)
        file_path = os.path.join("data", file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Import ingest processor (src/ already on sys.path)
        from ingest import process_file

        # Process the file based on its extension
        documents = process_file(file_path)

        # VectorStoreManager.add_documents is sync — run in executor to avoid blocking
        if documents:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, vs.add_documents, documents)

        return {
            "status": "success",
            "message": f"Successfully ingested {file.filename}",
            "chunks_added": len(documents) if documents else 0,
        }

    except Exception as e:
        print(f"[INGEST ERROR] {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
