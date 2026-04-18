from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

# Import our logic (assuming they are in the same directory)
try:
    from .agents import run_pipeline, create_initial_state
    from .vector_store import VectorStoreManager
except ImportError:
    from agents import run_pipeline, create_initial_state
    from vector_store import VectorStoreManager

load_dotenv()

app = FastAPI(title="AcaDoc AI API")

# Initialize Vector Store once
# Note: For Vercel, we'd ideally use a Cloud Vector Store.
# For now, we use the local chroma_db if it exists, or assume it's pre-built.
vector_store = None

def get_vector_store():
    global vector_store
    if vector_store is None:
        try:
            vector_store = VectorStoreManager()
        except Exception as e:
            print(f"Error loading vector store: {e}")
            return None
    return vector_store

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

@app.post("/api/chat", response_model=QueryResponse)
async def chat(request: QueryRequest):
    from langchain_ollama import ChatOllama
    
    vs = get_vector_store()
    if not vs:
        raise HTTPException(status_code=500, detail="Vector store not initialized")
    
    # Configuration for Ollama
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model_name = os.getenv("OLLAMA_MODEL", "medgemma")
    ollama_api_key = os.getenv("OLLAMA_API_KEY")
    
    headers = {}
    if ollama_api_key:
        headers["Authorization"] = f"Bearer {ollama_api_key}"
    
    llm = ChatOllama(
        model=model_name,
        base_url=ollama_base_url,
        temperature=0.0,
        headers=headers if headers else None
    )
    
    try:
        result = await run_pipeline(request.question, vs, llm)
        
        return QueryResponse(
            answer=result.get("answer", "No answer generated"),
            citations=result.get("citations", []),
            is_sufficient=result.get("validated_context") == "SUFFICIENT",
            confidence=result.get("validation_confidence", 0.0),
            validation_reason=result.get("validation_result", {}).get("reason")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "AcaDoc AI"}
