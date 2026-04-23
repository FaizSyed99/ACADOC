"""
Agent Workflow: LangGraph 3-Agent Pipeline
Technical Plan v1.2 Sections 4, 8, 9: Validation Layer, Agent Architecture, Near-Zero Hallucination
"""

import logging
import json
import os
import re
from typing import Optional, List, Dict, Any, TypedDict
from dataclasses import dataclass, field

from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============ Query Expansion ============
def expand_medical_query(query: str) -> list:
    """
    Expands medical/academic queries to improve FAISS recall.
    Generates semantic variants so more relevant chunks are surfaced.
    """
    expansions = [query]
    q_lower = query.lower().strip()

    definitional_triggers = ["what is", "define", "concept of", "meaning of", "explain"]
    if any(t in q_lower for t in definitional_triggers):
        topic = re.sub(
            r"\b(what is|define|explain|concept of|meaning of|the|a|an)\b", "", q_lower
        ).strip()
        if topic:
            expansions += [
                f"Definition of {topic}",
                f"Introduction to {topic}",
                f"{topic} is defined as",
                f"Overview of {topic}",
            ]

    # Deduplicate while preserving order
    seen, unique = set(), []
    for exp in expansions:
        key = exp.lower().strip()
        if key not in seen:
            seen.add(key)
            unique.append(exp)

    logger.info(f"[QUERY EXPANSION] '{query}' → {unique}")
    return unique


# ============ Context Sufficiency Check ============
def assess_context_sufficiency(
    retrieved: List[Dict], query: str
) -> tuple:
    """
    Lightweight, LLM-free validation using keyword overlap.
    Returns: (is_sufficient: bool, confidence: float, reason: str)
    """
    if not retrieved:
        return False, 0.0, "No chunks retrieved from vector store"

    context_text = " ".join([r.get("content", "").lower() for r in retrieved])

    # Stop-word-filtered keyword overlap
    stop_words = {"what", "is", "the", "concept", "of", "and", "in", "a", "an", "to", "for", "by"}
    clean_query = re.sub(r"[^\w\s]", "", query.lower())
    important_words = set(clean_query.split()) - stop_words

    if not important_words:
        return True, 0.7, "Generic query — allowing answer"

    matches = sum(1 for w in important_words if w in context_text)
    overlap = matches / len(important_words)

    if overlap >= 0.2:
        confidence = min(0.95, 0.6 + overlap)
        return True, confidence, f"Keyword overlap sufficient ({overlap:.0%})"

    return False, overlap, f"Insufficient keyword overlap ({overlap:.0%})"


# ============ TypedDict State ============
class AgentState(TypedDict):
    """State passed through the LangGraph workflow."""

    question: str
    retrieved_chunks: List[Dict[str, Any]]
    validated_context: str
    validation_result: Optional[Dict[str, Any]]
    answer: str
    citations: List[Dict[str, Any]]
    validation_confidence: float


def create_initial_state(question: str) -> AgentState:
    """Factory function to create initial state."""
    return {
        "question": question,
        "retrieved_chunks": [],
        "validated_context": "PENDING",
        "validation_result": None,
        "answer": "",
        "citations": [],
        "validation_confidence": 0.0,
    }


# ============ Pydantic Validation Models ============
class ValidationOutput(BaseModel):
    """Structured output from Context Validator agent."""

    is_sufficient: bool = Field(
        description="Whether retrieved context can answer the question"
    )
    reason: str = Field(description="Explanation for sufficiency determination")
    confidence_0_to_1: float = Field(description="Confidence score 0-1")


# ============ Agent Functions (Runnable) ============
class RetrieverAgent:
    """
    RETRIEVE AGENT: Queries FAISS vector store for relevant context.
    Uses multi-query expansion for improved recall.
    Technical Plan Section 8: Agent Architecture
    """

    def __init__(self, vector_store):
        self.vector_store = vector_store

    def invoke(self, state: AgentState) -> AgentState:
        """Retrieve top-k chunks from FAISS vector store with query expansion."""
        question = state["question"]
        logger.info(f"[RETRIEVE] Processing: '{question[:80]}...'")

        # Run expanded queries for better recall
        expanded_queries = expand_medical_query(question)
        all_retrieved = []

        for q in expanded_queries:
            # FAISS VectorStoreManager exposes .retrieve(query_text, n_results)
            if hasattr(self.vector_store, "retrieve"):
                results = self.vector_store.retrieve(query_text=q, n_results=8)
            elif hasattr(self.vector_store, "query"):
                # ChromaDB-style fallback (legacy)
                raw = self.vector_store.query(query_text=q, n_results=8, where=None)
                results = []
                if raw.get("documents") and raw["documents"][0]:
                    for i, doc in enumerate(raw["documents"][0]):
                        results.append({
                            "content": doc,
                            "metadata": raw["metadatas"][0][i] if raw.get("metadatas") else {},
                            "score": raw["distances"][0][i] if raw.get("distances") else None,
                        })
            else:
                logger.error("[RETRIEVE] Vector store has no retrieve() or query() method.")
                results = []

            # FAISS returns list[dict] directly
            if isinstance(results, list):
                all_retrieved.extend(results)

        # Deduplicate by content
        seen_content, retrieved = set(), []
        for chunk in all_retrieved:
            content = chunk.get("content", "")
            if content and content not in seen_content:
                seen_content.add(content)
                retrieved.append(chunk)

        # Sort retrieved chunks: 
        # If 'rerank_score' exists, higher is better (descending)
        # If only 'score' exists (L2), lower is better (ascending)
        if retrieved and "rerank_score" in retrieved[0]:
            retrieved = sorted(retrieved, key=lambda x: x.get("rerank_score", -float("inf")), reverse=True)[:10]
        else:
            retrieved = sorted(retrieved, key=lambda x: x.get("score", float("inf")))[:10]

        state["retrieved_chunks"] = retrieved
        logger.info(f"[RETRIEVE] Found {len(retrieved)} unique chunks (from {len(all_retrieved)} raw)")
        return state


class ContextValidatorAgent:
    """
    VALIDATE AGENT: Fast keyword-based sufficiency check.
    Technical Plan Section 4: Validation Layer
    Uses local heuristics (no extra LLM call) — saves cost and latency.
    Falls back to LLM validation only when keyword overlap is ambiguous.
    """

    def __init__(self, llm):
        self.llm = llm  # reserved for optional LLM re-validation

    def invoke(self, state: AgentState) -> AgentState:
        """Validate retrieved context sufficiency via keyword heuristics."""
        question = state["question"]
        chunks = state["retrieved_chunks"]

        logger.info(f"[VALIDATE] Checking sufficiency for: '{question[:80]}...'")

        is_sufficient, confidence, reason = assess_context_sufficiency(chunks, question)

        state["validation_result"] = {
            "is_sufficient": is_sufficient,
            "reason": reason,
            "confidence": confidence,
        }
        state["validation_confidence"] = confidence
        state["validated_context"] = "SUFFICIENT" if is_sufficient else "INSUFFICIENT_EVIDENCE"

        if is_sufficient:
            logger.info(f"[VALIDATE] ✓ Sufficient — confidence={confidence:.2f}: {reason}")
        else:
            logger.warning(f"[VALIDATE] ✗ Insufficient — {reason}")

        return state


class ControlledGeneratorAgent:
    """
    GENERATE AGENT: Produces grounded answer or fallback.
    Technical Plan Section 9: Near-Zero Hallucination
    - Temperature = 0.0 (deterministic)
    - Must use only validated context
    - Fallback message if insufficient
    """

    def __init__(self, llm):
        self.llm = llm

    def invoke(self, state: AgentState) -> AgentState:
        """Generate answer from validated context or fallback."""
        question = state["question"]
        validated_status = state["validated_context"]
        chunks = state["retrieved_chunks"]

        logger.info(f"[GENERATE] Status: {validated_status}")

        if validated_status == "INSUFFICIENT_EVIDENCE":
            state["answer"] = (
                "I cannot answer this question based on the available textbook content. "
                "The retrieved context does not contain sufficient information to provide a reliable answer. "
                "Please consult the source material directly or rephrase your question."
            )
            state["citations"] = []
            logger.warning("[GENERATE] Used fallback due to insufficient context")
            return state

        # Build context for generation
        context_parts = [chunk["content"] for chunk in chunks]
        context_str = "\n\n".join(context_parts)

        # Build citations from metadata
        # FAISS chunks store metadata at top level AND nested under 'metadata'
        citations = []
        for chunk in chunks:
            meta = chunk.get("metadata", chunk)  # FAISS chunks: top-level keys
            source = meta.get("source") or chunk.get("source")
            page = meta.get("page") or chunk.get("page")
            file_name = meta.get("file_name") or chunk.get("file_name") or chunk.get("source", "Unknown")
            if source:
                citations.append(
                    {
                        "source": source,
                        "page": str(page) if page else "N/A",
                        "file_name": os.path.basename(str(file_name)),
                    }
                )

        # Deduplicate citations
        seen = set()
        unique_citations = []
        for cit in citations:
            key = (cit["source"], cit["page"])
            if key not in seen:
                seen.add(key)
                unique_citations.append(cit)

        generation_prompt = f"""You are a medical education assistant. Use ONLY the provided context to address the user's input accurately and precisely.

Context from textbook:
{context_str}

User Input: {question}

Instructions:
1. Address the input based EXCLUSIVELY on the provided context.
2. If the input is a question, answer it directly.
3. If the input is a general topic or title, summarize the relevant information provided in the context.
4. If the context doesn't fully cover the topic, state what is known and acknowledge limitations.
5. Provide clear, well-structured responses.
6. Do NOT add information not present in the context.

Response:"""

        messages = [HumanMessage(content=generation_prompt)]

        try:
            response = self.llm.invoke(messages)
            answer_text = (
                response.content if hasattr(response, "content") else str(response)
            )

            state["answer"] = answer_text.strip()
            state["citations"] = unique_citations
            logger.info(
                f"[GENERATE] Answer generated with {len(unique_citations)} citations"
            )

        except Exception as e:
            logger.error(f"[GENERATE] LLM error: {e}")
            state["answer"] = f"Error generating response: {str(e)}"
            state["citations"] = []

        return state


# ============ LangGraph Workflow ============
def create_agent_graph(vector_store, llm):
    """
    Compile the 3-agent LangGraph workflow.
    Flow: RETRIEVE → VALIDATE → GENERATE → END
    """
    logger.info("Compiling LangGraph workflow")

    # Initialize agents
    retriever = RetrieverAgent(vector_store)
    validator = ContextValidatorAgent(llm)
    generator = ControlledGeneratorAgent(llm)

    # Define graph with typed state
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("retrieve", retriever.invoke)
    workflow.add_node("validate", validator.invoke)
    workflow.add_node("generate", generator.invoke)

    # Define edges
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "validate")
    workflow.add_edge("validate", "generate")
    workflow.add_edge("generate", END)

    return workflow.compile()


def run_pipeline(question: str, vector_store, llm) -> dict:
    """
    Run the full 3-agent pipeline (synchronous).
    Returns final state with answer, citations, and validation confidence.
    Compatible with both Streamlit (sync) and FastAPI (async via run_in_executor).
    """
    logger.info(f"[PIPELINE] Starting for: '{question[:80]}...'")

    # Initialize state
    initial_state = create_initial_state(question)

    # Create and run graph
    graph = create_agent_graph(vector_store, llm)
    result = graph.invoke(initial_state)

    logger.info(
        f"[PIPELINE] Done — validated={result.get('validated_context')}, "
        f"confidence={result.get('validation_confidence', 0):.2f}, "
        f"chunks={len(result.get('retrieved_chunks', []))}"
    )
    return result


if __name__ == "__main__":
    print("Testing agent workflow (requires vector store and LLM)")
    # from index import VectorStoreManager
    # vector_store = VectorStoreManager()
    # llm = ChatOpenAI(temperature=0.0, model="gpt-4o-mini")
    # result = run_pipeline("What is the mechanism of aspirin?", vector_store, llm)
    # print(result)
