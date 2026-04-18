# api/index.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# Import your agent pipeline and vector store
try:
    from .agents import run_pipeline, create_initial_state  # noqa: F401
    from .vector_store import VectorStoreManager
except ImportError:
    from agents import run_pipeline
    from .vector_store import VectorStoreManager

load_dotenv()

app = FastAPI(title="AcaDoc AI API")
vector_store = None


def get_vector_store():
    """Singleton vector store initializer"""
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
    """
    llm = get_llm()
    vs = get_vector_store()

    if not vs:
        raise HTTPException(
            status_code=503,
            detail="Vector store not initialized. Check ingestion pipeline.",
        )

    try:
        # Execute the agent pipeline (Technical Plan §8: coordinated specialized agents)
        result = await run_pipeline(request.question, vs, llm)

        # Map pipeline output to API response (Technical Plan §3: textbook grounding)
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
        # Technical Plan §9: fail gracefully, never hallucinate
        raise HTTPException(status_code=500, detail=f"Pipeline Error: {str(e)}")


@app.get("/api/health")
async def health():
    """Health check for load balancers / monitoring"""
    vs_status = "connected" if vector_store else "not_initialized"
    return {"status": "healthy", "service": "AcaDoc AI", "vector_store": vs_status}
