# api/index.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import sys
import asyncio
import shutil
import json
import re
from pathlib import Path
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure src/ is importable for VectorStoreManager and ingest
_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

# Import agent pipeline — api/agents.py is async-capable with query expansion
try:
    from .agents import run_pipeline, create_initial_state  # noqa: F401
except ImportError:
    from agents import run_pipeline, create_initial_state  # noqa: F401

# Import vector store (SurrealDB Cloud)
try:
    from .vector_store import VectorStoreManager
except ImportError:
    from vector_store import VectorStoreManager

load_dotenv()

app = FastAPI(title="AcaDoc AI API")
vector_store = None

# =============================================================================
# TECHNICAL PLAN v1.2: SYSTEM PROMPT LIBRARY
# 4 Subjects × 3 Intents = 12 Variants (§3, §8, §10)
# =============================================================================

SYSTEM_PROMPTS = {
    # ==================== COMMUNITY MEDICINE (PSM) ====================
    "PSM-revise": """You are a 3rd Year MBBS Community Medicine tutor specializing in K. Park's Preventive and Social Medicine.
    
STRUCTURE YOUR ANSWER IN LAQ FORMAT:
1. DEFINITION: Clear, textbook definition from K. Park
2. CLASSIFICATION: Types/categories if applicable
3. PATHOPHYSIOLOGY/MECHANISM: Stepwise explanation with arrows/flow
4. CLINICAL FEATURES/EPIDEMIOLOGICAL ASPECTS: Key signs, symptoms, or epidemiological indicators
5. MANAGEMENT/PREVENTION: Immediate measures, definitive treatment, preventive strategies
6. DIAGRAM SUGGESTION: Suggest appropriate visualization (flowchart, triad, cycle)

CITATION REQUIREMENT: Cite specific sections/chapters from K. Park textbook.
TONE: Friendly, encouraging, slightly humorous. Examples: "Let's break down Park's epidemiology triad 🔬"
ACCURACY: Near-zero hallucination tolerance (§9). Only use information from retrieved context.""",

    "PSM-test": """You are a Community Medicine exam tutor for quick revision.

RESPONSE STYLE:
- Concise, high-yield answers for MCQs and short notes
- Focus on: Definitions, classifications, key numbers, formulas, national programs
- Bullet points preferred over paragraphs
- Include: Sensitivity/specificity values, incubation periods, dosages where relevant

CITATION: Cite K. Park chapter/section.
TONE: Direct, exam-focused. "Here's what you need to know for the exam..."
LENGTH: Maximum 150-200 words.""",

    "PSM-notes": """You are a PSM note-making assistant for structured revision.

FORMAT:
📌 TOPIC: [Topic name]

KEY DEFINITIONS:
• [Definition 1]
• [Definition 2]

CLASSIFICATIONS:
• Type 1: Brief description
• Type 2: Brief description

IMPORTANT FACTS:
✓ Fact 1 (include numbers/statistics)
✓ Fact 2

NATIONAL PROGRAMS:
• Program name → Key objectives

DIAGRAM IDEAS:
→ [Suggested flowchart/triad/cycle]

CITATION: K. Park, [Chapter/Section]
TONE: Organized, clear, exam-ready.""",

    # ==================== ENT (OTOLARYNGOLOGY) ====================
    "ENT-revise": """You are a 3rd Year MBBS ENT tutor specializing in PL Dhingra's Diseases of Ear, Nose and Throat.

STRUCTURE YOUR ANSWER IN LAQ FORMAT:
1. DEFINITION: Clear, textbook definition from PL Dhingra
2. CLASSIFICATION: Types (conductive/sensorineural/mixed for hearing loss, etc.)
3. PATHOPHYSIOLOGY: Anatomical basis, disease mechanism
4. CLINICAL FEATURES: Symptoms, signs (include tuning fork tests, otoscopy findings)
5. INVESTIGATIONS: Audiometry, imaging, lab tests
6. MANAGEMENT: Medical treatment, surgical steps (with diagram suggestions)

CITATION REQUIREMENT: Cite PL Dhingra chapter/edition.
TONE: Academic, professional, and strictly clinical.
ACCURACY: Near-zero hallucination tolerance (§9).""",

    "ENT-test": """You are an ENT exam tutor for rapid revision.

RESPONSE STYLE:
- Concise, high-yield answers
- Focus on: Clinical signs, classifications, surgical steps, instrument names
- Include: Tuning fork test interpretations, audiogram patterns
- Bullet points for quick scanning

CITATION: PL Dhingra, [Chapter].
TONE: Direct, exam-oriented. "Key points for your ENT practical..."
LENGTH: Maximum 150-200 words.""",

    "ENT-notes": """You are an ENT note-making assistant.

FORMAT:
👂 TOPIC: [Topic name]

ANATOMY RECAP:
• [Key anatomical structures]

CLASSIFICATIONS:
• Type 1: Description
• Type 2: Description

CLINICAL FEATURES:
→ Symptom 1
→ Sign 1 (e.g., Rinne negative)

INVESTIGATIONS:
✓ Test 1: Interpretation
✓ Test 2: Findings

MANAGEMENT:
• Medical: Drug names, dosages
• Surgical: Procedure name, key steps

DIAGRAM: [Anatomical diagram suggestion]

CITATION: PL Dhingra, [Chapter].""",

    # ==================== OPHTHALMOLOGY ====================
    "Ophthalmology-revise": """You are a 3rd Year MBBS Ophthalmology tutor specializing in AK Khurana's Comprehensive Ophthalmology.

STRUCTURE YOUR ANSWER IN LAQ FORMAT:
1. DEFINITION: Clear, textbook definition from AK Khurana
2. CLASSIFICATION: Types/stages (e.g., diabetic retinopathy stages)
3. PATHOPHYSIOLOGY: Disease mechanism with flow diagrams
4. CLINICAL FEATURES: Symptoms, signs (include visual acuity, fundus findings)
5. INVESTIGATIONS: Slit-lamp, tonometry, fundoscopy, imaging
6. MANAGEMENT: Medical (drug names), surgical (procedure steps), complications

CITATION REQUIREMENT: Cite AK Khurana chapter/edition.
TONE: Academic, professional, and strictly clinical.
ACCURACY: Near-zero hallucination tolerance (§9).""",

    "Ophthalmology-test": """You are an Ophthalmology exam tutor for quick revision.

RESPONSE STYLE:
- Concise, high-yield answers
- Focus on: Clinical staging, drug names, surgical procedures, instrument names
- Include: Visual acuity ranges, IOP values, lens powers
- Bullet points for rapid review

CITATION: AK Khurana, [Chapter].
TONE: Direct, practical-focused. "What you need for your ophthalmology practical..."
LENGTH: Maximum 150-200 words.""",

    "Ophthalmology-notes": """You are an Ophthalmology note-making assistant.

FORMAT:
👁️ TOPIC: [Topic name]

DEFINITION:
• [Clear definition]

CLASSIFICATION/STAGING:
• Stage 1: Description
• Stage 2: Description

CLINICAL FEATURES:
→ Symptom 1
→ Sign 1 (e.g., cup-disc ratio)

INVESTIGATIONS:
✓ Test 1: Normal values
✓ Test 2: Abnormal findings

MANAGEMENT:
• Medical: Drug names, concentrations
• Surgical: Procedure name, indications

DIAGRAM: [Clinical staging table/diagram suggestion]

CITATION: AK Khurana, [Chapter].""",

    # ==================== FORENSIC MEDICINE ====================
    "Forensic-revise": """You are a 3rd Year MBBS Forensic Medicine tutor specializing in KS Narayan Reddy's Essentials of Forensic Medicine and Toxicology.

STRUCTURE YOUR ANSWER IN LAQ FORMAT (MATCHING LAQ.pdf):
1. DEFINITION: Clear, textbook definition from KS Narayan Reddy
2. TYPES/CLASSIFICATION: Detailed categorization
3. PATHOPHYSIOLOGY: Stepwise mechanism with arrows/flow
4. CLINICAL/LEGAL FEATURES: Post-mortem findings, legal implications
5. CAUSES/ETIOLOGY: Comprehensive list
6. MANAGEMENT: Treatment, medico-legal procedures
7. IPC/CrPC SECTIONS: Relevant legal sections

CITATION REQUIREMENT: Cite KS Narayan Reddy chapter/edition with page numbers if available.
TONE: Academic, professional, and strictly medico-legal.
INCLUDE: Cause-of-death trees, post-mortem interval timelines where relevant.
ACCURACY: Near-zero hallucination tolerance (§9).""",

    "Forensic-test": """You are a Forensic Medicine exam tutor for rapid revision.

RESPONSE STYLE:
- Concise, high-yield answers
- Focus on: IPC/CrPC sections, post-mortem findings, time since death, poison characteristics
- Include: Legal sections, punishment details, key differentiating features
- Bullet points for quick memorization

CITATION: KS Narayan Reddy, [Chapter/Page].
TONE: Direct, exam-focused. "Key medico-legal points for your viva..."
LENGTH: Maximum 150-200 words.""",

    "Forensic-notes": """You are a Forensic Medicine note-making assistant.

FORMAT:
⚖️ TOPIC: [Topic name]

DEFINITION:
• [Legal/medical definition]

TYPES:
• Type 1: Description
• Type 2: Description

POST-MORTEM FINDINGS:
→ External: Finding 1
→ Internal: Finding 2

MEDICO-LEGAL ASPECTS:
✓ IPC Section: [Number] - Description
✓ CrPC Section: [Number] - Description

CAUSE OF DEATH TREE:
[Hierarchical breakdown if applicable]

DIFFERENTIAL DIAGNOSIS:
• Condition 1 vs Condition 2: Key differences

CITATION: KS Narayan Reddy, [Chapter/Page].""",
}

# ==================== VALID SUBJECTS & INTENTS ====================
VALID_SUBJECTS = ["PSM", "ENT", "Ophthalmology", "Forensic"]
VALID_INTENTS = ["revise", "test", "notes"]
SUBJECT_TEXTBOOK_MAP = {
    "PSM": "K. Park",
    "ENT": "PL Dhingra",
    "Ophthalmology": "AK Khurana",
    "Forensic": "KS Narayan Reddy"
}


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
    """Model Factory: Uses Gemini with Temperature=0 for determinism (§9)."""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and len(gemini_key) > 10:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=gemini_key,
                temperature=0.0,
            )
        except (ImportError, Exception) as e:
            print(f"[WARN] Gemini init failed: {e}. Falling back to Ollama...")

    # Fallback to Ollama
    try:
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "gemma2:9b"),
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            temperature=0.0,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No LLM provider available: {e}")


# === Pydantic Models for 3rd Year MBBS API (§10) ===

class ChatRequest(BaseModel):
    """
    Request model for 3rd Year MBBS chat endpoint.
    Supports subject-specific, intent-driven queries with conversation memory.
    Technical Plan: §3 (Textbook Grounding), §8 (Agent Architecture), §10 (Start Small)
    """
    query: str                                    # User's question
    subject: str                                  # "PSM" | "ENT" | "Ophthalmology" | "Forensic"
    intent: str                                   # "revise" | "test" | "notes"
    history_summary: Optional[str] = None         # Compressed context from previous turns (§8)
    user_id: Optional[str] = None                 # For analytics (can be session_id)


class Citation(BaseModel):
    source: str
    page: str
    file_name: str


class VisualizationSuggestion(BaseModel):
    """
    Placeholder for future diagram/flowchart generation.
    Technical Plan: Task 4 - Image Generation Stub
    """
    suggested_type: str
    description: str
    status: str  # "placeholder" until integrated with image generation API


class QueryResponse(BaseModel):
    """
    Enhanced response model with validation layer outputs (§9).
    """
    answer: str
    citations: List[Citation]
    is_sufficient: bool
    confidence: float
    validation_reason: Optional[str] = None
    fallback_reason: Optional[str] = None       # Why fallback was triggered
    visualization: Optional[VisualizationSuggestion] = None
    error_details: Optional[str] = None
    action_required: Optional[str] = None       # e.g., "new_session" if token limit exceeded


# === Token Management Constants (§8 - Token Conservation) ===
SOFT_TOKEN_LIMIT = 4000  # Warn user
HARD_TOKEN_LIMIT = 6000  # Force new session


# =============================================================================
# HELPER FUNCTIONS FOR 3RD YEAR MBBS API
# Technical Plan: §3, §4, §8, §9, §10
# =============================================================================

def get_system_prompt(subject: str, intent: str) -> str:
    """
    Dynamic System Prompt Routing based on subject + intent.
    Technical Plan: §3 (Textbook Grounding), §8 (Agent Architecture)
    
    Returns appropriate system prompt from the 12-variant library.
    Falls back to PSM-revise if invalid combination provided.
    """
    key = f"{subject}-{intent}"
    
    # Validate subject and intent
    if subject not in VALID_SUBJECTS:
        logger.warning(f"Invalid subject '{subject}', defaulting to PSM")
        subject = "PSM"
    
    if intent not in VALID_INTENTS:
        logger.warning(f"Invalid intent '{intent}', defaulting to revise")
        intent = "revise"
    
    key = f"{subject}-{intent}"
    
    # Get prompt or fallback
    prompt = SYSTEM_PROMPTS.get(key, SYSTEM_PROMPTS["PSM-revise"])
    if key not in SYSTEM_PROMPTS:
        logger.warning(f"Prompt key '{key}' not found, using PSM-revise fallback")
    
    return prompt


def suggest_visualization(answer_text: str, subject: str) -> VisualizationSuggestion:
    """
    Analyze answer and suggest appropriate diagram type.
    Technical Plan: Task 4 - Image Generation Stub (Future-Ready)
    
    For now, returns metadata. Later, integrate with Google Imagen or 
    lightweight diagram generator.
    """
    visualization_map = {
        "Forensic": ("cause_of_death_tree", "Hierarchical tree showing cause-of-death relationships"),
        "PSM": ("epidemiology_flowchart", "Flowchart showing disease transmission or epidemiological triad"),
        "ENT": ("anatomical_diagram", "Anatomical diagram of ear/nose/throat structures"),
        "Ophthalmology": ("clinical_staging_table", "Clinical staging table or fundus diagram")
    }
    
    suggested_type, description = visualization_map.get(
        subject, 
        ("generic_flowchart", "Visual representation of medical concept")
    )
    
    return VisualizationSuggestion(
        suggested_type=suggested_type,
        description=description,
        status="placeholder"  # TODO: Integrate image generation API
    )


def format_laq_answer(answer_text: str, subject: str, textbook: str) -> str:
    """
    Format answer in LAQ (Long Answer Question) structure matching LAQ.pdf.
    Technical Plan: §3 (Textbook Grounding), §10 (Start Small - 3rd Year Focus)
    
    Structure:
    DEFINITION → TYPES/CLASSIFICATION → PATHOPHYSIOLOGY → CLINICAL FEATURES 
    → CAUSES/ETIOLOGY → MANAGEMENT → DIAGRAM SUGGESTION
    """
    # Check if answer already has structured sections
    has_sections = any(section in answer_text.upper() for section in [
        "DEFINITION", "CLASSIFICATION", "PATHOPHYSIOLOGY", "CLINICAL"
    ])
    
    if has_sections:
        # Answer is already structured, just ensure proper formatting
        return answer_text
    
    # If not structured, wrap it with LAQ template guidance
    laq_template = f"""Based on {textbook} textbook for {subject}:

📚 DEFINITION
[The following information is provided based on retrieved context:]

    try:
        # api/agents.run_pipeline is async — await directly
        result = await run_pipeline(request.question, vs, llm, request.subject, request.intent)

---
💡 NOTE: For complete LAQ format, structure your answer as:
→ Definition → Classification → Pathophysiology → Clinical Features → Management → Diagram

CITATION: {textbook}, relevant chapter."""
    
    return laq_template


def estimate_token_count(text: str) -> int:
    """
    Rough token estimation (1 token ≈ 4 characters for English text).
    Technical Plan: §8 (Token Conservation Strategy)
    """
    return len(text) // 4


def summarize_conversation_history(history_summary: Optional[str], current_query: str) -> str:
    """
    Lightweight conversation summarizer that preserves key entities.
    Technical Plan: §8 (Conversation Memory & Summarization)
    
    Extracts and maintains:
    - Key entities (drug names, classifications, IPC sections)
    - Topic progression
    - Unresolved questions
    
    Returns compressed context (100-150 tokens) instead of full transcript.
    """
    if not history_summary:
        return current_query
    
    # Combine history with current query
    combined = f"Previous context: {history_summary}\n\nCurrent query: {current_query}"
    
    # Simple entity extraction (can be enhanced with NER later)
    entity_patterns = [
        r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Proper nouns (drug names, diseases)
        r'\bIPC\s*\d+\b',  # IPC sections
        r'\bCrPC\s*\d+\b',  # CrPC sections
        r'\b\d+(?:th|st|nd|rd)\s+(?:stage|type|class)\b',  # Staging
        r'\b[a-z]+\s*:\s*[a-z]+\b',  # Ratios like sensitivity:specificity
    ]
    
    entities = []
    for pattern in entity_patterns:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        entities.extend(matches[:3])  # Limit per category
    
    # Create concise summary
    if entities:
        summary = f"Context: {history_summary[:200]}... | Entities: {', '.join(set(entities)[:5])} | Query: {current_query}"
    else:
        summary = f"Context: {history_summary[:250]} | Query: {current_query}"
    
    # Enforce token limit (approximate)
    if len(summary) > 600:
        summary = summary[:597] + "..."
    
    return summary


def check_token_limit(token_count: int) -> tuple[bool, Optional[str]]:
    """
    Check if token count exceeds limits.
    Technical Plan: §8 (Token Conservation Strategy)
    
    Returns: (is_within_limit, action_required_message)
    """
    if token_count >= HARD_TOKEN_LIMIT:
        return False, "new_session"
    elif token_count >= SOFT_TOKEN_LIMIT:
        return True, "warning"
    return True, None


def log_user_activity(
    user_id: str,
    subject: str,
    intent: str,
    query: str,
    tokens_used: int,
    validation_confidence: float,
    fallback_triggered: bool
):
    """
    Log activity to user_activity table for analytics.
    Technical Plan: §9 (Validation Layer Analytics)
    
    In production, this would write to SurrealDB or your database.
    For now, logs to console/logger for debugging.
    """
    activity_record = {
        "timestamp": datetime.now().isoformat(),
        "user_id": user_id or "anonymous",
        "subject": subject,
        "intent": intent,
        "query_length": len(query),
        "tokens_used": tokens_used,
        "validation_confidence": validation_confidence,
        "fallback_triggered": fallback_triggered
    }
    
    logger.info(f"[ANALYTICS] User Activity: {json.dumps(activity_record)}")
    
    # TODO: In production, write to database:
    # await db.create("user_activity", activity_record)


# =============================================================================
# UPDATED CHAT ENDPOINT FOR 3RD YEAR MBBS
# Technical Plan: §3, §4, §8, §9, §10
# =============================================================================
@app.post("/api/chat", response_model=QueryResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for 3rd Year MBBS AI tutor.
    Technical Plan: §3 (Textbook Grounding), §4 (Validation Layer), §8 (Agent Architecture), 
                    §9 (Near-Zero Hallucination), §10 (Start Small)
    
    Features:
    - Subject-specific retrieval (PSM, ENT, Ophthalmology, Forensic)
    - Intent-driven response formatting (revise/test/notes)
    - Conversation memory with history summarization
    - Validation layer blocks unsupported claims
    - Token conservation with session limits
    - Analytics logging for monitoring
    
    Error Handling (§5):
    - Missing subject/intent → defaults to PSM-revise
    - LLM API failure → graceful error message
    - Token limit exceeded → suggests new session
    - Insufficient context → validation fallback
    """
    llm = None
    vs = get_vector_store()
    
    # Validate inputs
    subject = request.subject if request.subject in VALID_SUBJECTS else "PSM"
    intent = request.intent if request.intent in VALID_INTENTS else "revise"
    textbook = SUBJECT_TEXTBOOK_MAP.get(subject, "K. Park")
    
    logger.info(f"[CHAT] Subject: {subject}, Intent: {intent}, Query: {request.query[:50]}...")
    
    # Check token limit if history provided
    total_tokens = 0
    if request.history_summary:
        total_tokens = estimate_token_count(request.history_summary) + estimate_token_count(request.query)
        is_within_limit, action_required = check_token_limit(total_tokens)
        
        if not is_within_limit:
            logger.warning(f"[CHAT] Token limit exceeded: {total_tokens} tokens")
            return QueryResponse(
                answer="📝 Session limit reached. Please start a new session to continue.",
                citations=[],
                is_sufficient=True,
                confidence=1.0,
                action_required="new_session",
                fallback_reason="Token limit exceeded"
            )
    
    # Get system prompt for this subject-intent combination
    system_prompt = get_system_prompt(subject, intent)
    
    # Summarize conversation history for context preservation (§8)
    context_query = summarize_conversation_history(request.history_summary, request.query)
    
    try:
        # Initialize LLM
        llm = get_llm()
        
        if not vs:
            raise HTTPException(
                status_code=503,
                detail="Vector store not initialized. Check ingestion pipeline.",
            )
        
        # === TASK 3: Subject-filtered retrieval ===
        # Note: Current vector_store_faiss.py doesn't support filtering yet
        # This is a placeholder for future implementation
        # chunks = vs.retrieve(context_query, n_results=6, filter={"subject": subject})
        chunks = await run_pipeline(context_query, vs, llm)
        
        # === VALIDATION LAYER (§4, §9) ===
        is_sufficient = chunks.get("validated_context") == "SUFFICIENT"
        confidence = float(chunks.get("validation_confidence", 0.0))
        
        if not is_sufficient or confidence < 0.7:
            # Validation failed - block unsupported claims
            fallback_reason = chunks.get("validation_result", {}).get("reason", "Low confidence")
            logger.warning(f"[VALIDATION] Fallback triggered: {fallback_reason}")
            
            # Log analytics for fallback
            log_user_activity(
                user_id=request.user_id,
                subject=subject,
                intent=intent,
                query=request.query,
                tokens_used=total_tokens,
                validation_confidence=confidence,
                fallback_triggered=True
            )
            
            return QueryResponse(
                answer=f"⚠️ The textbook content doesn't contain sufficient information to answer this. Please consult your primary textbook ({textbook}).",
                citations=[],
                is_sufficient=False,
                confidence=confidence,
                fallback_reason=f"Low overlap ({confidence:.2f})",
                validation_reason=fallback_reason
            )
        
        # === GENERATE RESPONSE ===
        answer_text = chunks.get("answer", "No answer generated")
        
        # Format answer based on intent (§3, §10)
        if intent == "revise":
            # Apply LAQ formatting for revise mode
            answer_text = format_laq_answer(answer_text, subject, textbook)
        
        # Estimate response tokens
        response_tokens = estimate_token_count(answer_text)
        total_tokens += response_tokens
        
        # === IMAGE GENERATION STUB (Task 4) ===
        visualization = suggest_visualization(answer_text, subject)
        
        # === ANALYTICS LOGGING (§9) ===
        log_user_activity(
            user_id=request.user_id,
            subject=subject,
            intent=intent,
            query=request.query,
            tokens_used=total_tokens,
            validation_confidence=confidence,
            fallback_triggered=False
        )
        
        # Build citations from retrieved chunks
        citations_list = []
        raw_citations = chunks.get("citations", [])
        for c in raw_citations[:5]:  # Limit to top 5 citations
            if isinstance(c, dict):
                citations_list.append(Citation(
                    source=c.get("source", "Unknown"),
                    page=str(c.get("page", "N/A")),
                    file_name=c.get("file_name", "Unknown")
                ))
        
        # Check for token warning
        _, token_action = check_token_limit(total_tokens)
        warning_message = ""
        if token_action == "warning":
            warning_message = f"\n\n⚠️ Approaching session token limit ({total_tokens}/{SOFT_TOKEN_LIMIT}). Consider starting a new session soon."
            answer_text += warning_message
        
        return QueryResponse(
            answer=answer_text,
            citations=citations_list,
            is_sufficient=True,
            confidence=confidence,
            visualization=visualization,
            validation_reason="Context validated successfully"
        )
        
    except Exception as e:
        # === LLM API FAILURE HANDLING (§5) ===
        logger.error(f"[CHAT ERROR] {type(e).__name__}: {str(e)}")
        
        # Log the error for analytics
        log_user_activity(
            user_id=request.user_id,
            subject=subject,
            intent=intent,
            query=request.query,
            tokens_used=total_tokens,
            validation_confidence=0.0,
            fallback_triggered=True
        )
        
        return QueryResponse(
            answer="⚠️ Service temporarily unavailable. Please try again in a few moments.",
            citations=[],
            is_sufficient=False,
            confidence=0.0,
            error_details=str(e),
            fallback_reason="LLM API failure"
        )


# Keep old endpoint for backward compatibility during transition
class QueryRequest(BaseModel):
    question: str
    subject: Optional[str] = "Community Medicine"
    intent: Optional[str] = "Revise"

@app.post("/api/chat/legacy", response_model=QueryResponse, deprecated=True)
async def chat_legacy(request: QueryRequest):
    """
    Legacy chat endpoint - will be removed in future versions.
    Use /api/chat with ChatRequest instead.
    """
    # Convert legacy request to new format
    new_request = ChatRequest(
        query=request.question,
        subject="PSM",  # Default
        intent="revise",  # Default
        history_summary=None,
        user_id=None
    )
    return await chat(new_request)


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
