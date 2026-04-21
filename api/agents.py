# api/agents.py
from typing import Any

async def run_pipeline(question: str, vector_store, llm) -> dict:
    """
    Minimal async-safe pipeline for POC.
    Technical Plan §8: coordinated agents (simplified for Phase 1)
    """
    try:
        # === RETRIEVE ===
        import inspect
        if hasattr(vector_store, 'retrieve'):
            if inspect.iscoroutinefunction(vector_store.retrieve):
                retrieved = await vector_store.retrieve(question)
            else:
                retrieved = vector_store.retrieve(question)
        else:
            retrieved = []  # Fallback for mock mode
        
        # === VALIDATE ===
        is_sufficient = len(retrieved) > 0
        validation_confidence = 0.9 if is_sufficient else 0.0
        
        if not is_sufficient:
            return {
                "answer": "⚠️ The provided textbook section does not contain sufficient information to answer this query. Please consult your primary textbook.",
                "citations": [],
                "validated_context": "INSUFFICIENT",
                "validation_confidence": 0.0,
                "validation_result": {"reason": "No relevant context retrieved"}
            }
        
        # === GENERATE ===
        context_text = "\n---\n".join([
            f"[Page {c.get('page', 'N/A')}] {c.get('content', '')}" 
            for c in (retrieved if isinstance(retrieved, list) else [])
        ])
        
        prompt = f"""You are AcaDoc AI, a textbook-grounded medical tutor.
Answer using ONLY the provided context. If information is missing, state so explicitly.

Question: {question}

Context:
{context_text}

Answer (structured for exam preparation, concise, factual):"""

        # Ensure LLM call is awaited properly
        if hasattr(llm, 'ainvoke'):
            response = await llm.ainvoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
        elif hasattr(llm, 'invoke'):
            response = llm.invoke(prompt)  # sync call
            answer = response.content if hasattr(response, 'content') else str(response)
        else:
            answer = "LLM provider not configured correctly."
        
        # === RETURN STRUCTURED RESULT (§3, §9) ===
        return {
            "answer": answer.strip(),
            "citations": retrieved if isinstance(retrieved, list) else [],
            "validated_context": "SUFFICIENT",
            "validation_confidence": validation_confidence,
            "validation_result": {"reason": "Context sufficient for grounded response"}
        }
        
    except Exception as e:
        print(f"[PIPELINE ERROR] {type(e).__name__}: {str(e)}")
        # Technical Plan §9: fail gracefully, never hallucinate
        return {
            "answer": "⚠️ An internal error occurred. Please try again.",
            "citations": [],
            "validated_context": "ERROR",
            "validation_confidence": 0.0,
            "validation_result": {"reason": f"Pipeline error: {str(e)}"}
        }

def create_initial_state(question: str) -> dict:
    """Helper to initialize agent state (Technical Plan §8)"""
    return {
        "question": question,
        "retrieved_chunks": [],
        "validated_context": None,
        "answer": None,
        "citations": [],
        "validation_confidence": 0.0
    }