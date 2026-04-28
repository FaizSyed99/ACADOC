# api/agents.py
from typing import Any, List, Dict, Optional
import logging
import inspect
import re

logger = logging.getLogger(__name__)

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def expand_medical_query(query: str) -> list[str]:
    """
    Expands medical/academic queries to match textbook phrasing.
    Based on actual content from KS Narayan Reddy textbook.
    """
    expansions = [query]
    q_lower = query.lower().strip()
    
    # ✅ Detect definitional intent
    definitional_triggers = ["what is", "define", "concept of", "meaning of", "explain"]
    if any(trigger in q_lower for trigger in definitional_triggers):
        if "forensic" in q_lower:
            expansions.extend([
                "Forensic science is the study",
                "Forensic medicine is",
                "Forensic medicine deals",
                "Definition of Forensic Medicine", 
                "Introduction to Forensic Medicine",
                "Scope of Forensic Medicine",
                "Forensic sciences include"
            ])
    
    # ✅ Handle author-specific queries
    if any(name in q_lower for name in ["red", "narayan", "reddy", "ksn", "k.s.n"]):
        expansions.append("KS Narayan Reddy Forensic Medicine")
        expansions.append("Reddy textbook Forensic Medicine definition")
    
    # ✅ Handle "concept" queries specifically
    if "concept" in q_lower and "forensic" in q_lower:
        expansions.extend([
            "Forensic medicine concept",
            "Principles of Forensic Medicine",
            "Foundation of Forensic Medicine"
        ])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_expansions = []
    for exp in expansions:
        exp_normalized = exp.lower().strip()
        if exp_normalized not in seen:
            seen.add(exp_normalized)
            unique_expansions.append(exp)
    
    print(f"🔍 Query expansion: '{query}' → {unique_expansions}")
    return unique_expansions

def assess_context_sufficiency(retrieved: List[Dict], query: str) -> tuple[bool, float, str]:
    """
    Enhanced validator that accepts definition phrases and uses flexible keyword matching.
    Returns: (is_sufficient, confidence_score, reason_message)
    """
    if not retrieved:
        return False, 0.0, "No chunks retrieved"
    
    # Combine all retrieved content for analysis
    context_text = " ".join([r.get('content', '').lower() for r in retrieved])
    
    # ✅ PRIORITY CHECK: Look for definition phrases
    definition_phrases = [
        "forensic science is",
        "forensic medicine is", 
        "forensic medicine deals",
        "defined as",
        "introduction to forensic",
        "forensic sciences include",
        "branch of medicine"
    ]
    
    for phrase in definition_phrases:
        if phrase in context_text:
            print(f"✅ Validation PASS: Found definition phrase '{phrase}'")
            return True, 0.85, f"Found authoritative definition phrase"
    
    # ✅ SECONDARY CHECK: Flexible keyword overlap
    clean_query = re.sub(r'[^\w\s]', '', query.lower())
    query_words = set(clean_query.split())
    stop_words = {"what", "is", "the", "concept", "of", "and", "in", "a", "an", "to", "for", "by"}
    important_words = query_words - stop_words
    
    if not important_words:
        print(f"✅ Validation PASS: Generic query, allowing answer")
        return True, 0.7, "Generic query accepted"
    
    matches = sum(1 for word in important_words if word in context_text)
    overlap_score = matches / max(len(important_words), 1)
    
    if overlap_score >= 0.2:
        confidence = min(0.9, 0.6 + overlap_score)
        print(f"✅ Validation PASS: Keyword overlap {overlap_score:.2f}")
        return True, confidence, f"Keyword overlap sufficient ({overlap_score:.2f})"
    
    print(f"❌ Validation FAIL: Overlap {overlap_score:.2f}, no definition phrases")
    return False, overlap_score, f"Low overlap ({overlap_score:.2f})"

# ==============================================================================
# MAIN PIPELINE
# ==============================================================================

async def run_pipeline(question: str, vector_store, llm, subject: str = "Community Medicine", intent: str = "Revise") -> dict:
    """
    Main async pipeline for AcaDoc AI.
    """
    try:
        # === 1. RETRIEVE ===
        expanded_queries = expand_medical_query(question)
        all_retrieved = []
        
        for q in expanded_queries:
            method = None
            if hasattr(vector_store, 'retrieve'):
                method = vector_store.retrieve
            elif hasattr(vector_store, 'query'):
                method = vector_store.query
            
            if method:
                if inspect.iscoroutinefunction(method):
                    results = await method(q, n_results=6)
                else:
                    results = method(q, n_results=6)
                
                # Normalize results
                if isinstance(results, dict):
                    if 'documents' in results and results['documents']:
                        for i, doc in enumerate(results['documents'][0]):
                            all_retrieved.append({
                                'content': doc,
                                'page': results['metadatas'][0][i].get('page', 'N/A') if 'metadatas' in results else 'N/A',
                                'source': results['metadatas'][0][i].get('source', 'Unknown') if 'metadatas' in results else 'Unknown',
                                'file_name': results['metadatas'][0][i].get('file_name', 'Unknown') if 'metadatas' in results else 'Unknown'
                            })
                elif isinstance(results, list):
                    all_retrieved.extend(results)
        
        # Deduplicate
        retrieved = []
        seen_content = set()
        for r in all_retrieved:
            content = r.get('content', '')
            if content and content not in seen_content:
                seen_content.add(content)
                retrieved.append(r)
        retrieved = retrieved[:8]

        # === 2. VALIDATE ===
        is_sufficient, confidence, reason = assess_context_sufficiency(retrieved, question)
        
        if not is_sufficient:
            return {
                "answer": f"⚠️ The textbook content doesn't contain sufficient information to answer: '{question}'.\n\n🔍 Debug info: {reason}",
                "validated_context": "INSUFFICIENT",
                "sources": [],
                "validation_confidence": confidence,
                "validation_result": {"reason": reason}
            }

        # === 3. GENERATE ===
        context_text = "\n---\n".join([
            f"[Page {c.get('page', 'N/A')}] {c.get('content', '')}" 
            for c in retrieved
        ])
        
        intent_instructions = ""
        if intent == "Revise":
            intent_instructions = "Format the answer as a Long Answer Question (LAQ) structure: Definition -> Classification -> Pathophysiology -> Clinical -> Management."
        elif intent == "Test":
            intent_instructions = "Format the answer as a quick test. Provide the core fact and then ask a brief follow-up question to test the student."
        elif intent == "Notes":
            intent_instructions = "Format the answer as high-yield, extremely concise bullet points for quick revision."

        prompt = f"""You are AcaDoc AI, a textbook-grounded medical tutor acting as a friendly study buddy for a 3rd Year MBBS student.
Address the user input using ONLY the provided context. If information is missing, state so explicitly.
Keep your tone friendly, encouraging, and slightly humorous.

Subject: {subject}
Study Mode: {intent}
User Input: {question}

Context:
{context_text}

Instructions:
1. Answer directly based on the context.
2. {intent_instructions}
3. Do NOT add outside information not found in the context.
4. If the context is insufficient, state what is missing.

Response:"""

        # LLM Call
        if hasattr(llm, 'ainvoke'):
            response = await llm.ainvoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
        elif hasattr(llm, 'invoke'):
            response = llm.invoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
        else:
            answer = "LLM provider not configured correctly."
        
        # === 4. RETURN SUCCESS ===
        return {
            "answer": answer.strip(),
            "citations": retrieved,
            "validated_context": "SUFFICIENT",
            "validation_confidence": confidence,
            "validation_result": {"reason": reason}
        }
        
    except Exception as e:
        logger.error(f"[PIPELINE ERROR] {type(e).__name__}: {str(e)}")
        return {
            "answer": "⚠️ An internal error occurred.",
            "validated_context": "ERROR",
            "validation_confidence": 0.0,
            "validation_result": {"reason": str(e)}
        }

def create_initial_state(question: str) -> dict:
    return {
        "question": question,
        "retrieved_chunks": [],
        "validated_context": None,
        "answer": None,
        "citations": [],
        "validation_confidence": 0.0
    }