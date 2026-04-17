"""
Agent Workflow: LangGraph 3-Agent Pipeline
Technical Plan v1.2 Sections 4, 8, 9: Validation Layer, Agent Architecture, Near-Zero Hallucination
"""

import logging
import json
import os
from typing import Optional, List, Dict, Any, TypedDict
from dataclasses import dataclass, field

from pydantic import BaseModel, Field
# LLM integration handled in caller
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    RETRIEVE AGENT: Queries ChromaDB for relevant context.
    Technical Plan Section 8: Agent Architecture
    """

    def __init__(self, vector_store):
        self.vector_store = vector_store

    async def invoke(self, state: AgentState) -> AgentState:
        """Retrieve top-k chunks from vector store."""
        question = state["question"]
        logger.info(f"[RETRIEVE] Processing: '{question[:50]}...'")

        # Await the async SurrealDB query
        results = await self.vector_store.query(query_text=question, n_results=3)

        # Extract documents and metadata
        retrieved = []
        if results.get("documents") and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                retrieved.append(
                    {
                        "content": doc,
                        "metadata": results["metadatas"][0][i]
                        if results.get("metadatas")
                        else {},
                        "distance": results["distances"][0][i]
                        if results.get("distances")
                        else None,
                    }
                )

        state["retrieved_chunks"] = retrieved
        logger.info(f"[RETRIEVE] Found {len(retrieved)} chunks")
        return state


class ContextValidatorAgent:
    """
    VALIDATE AGENT: Checks if retrieved context is sufficient.
    Technical Plan Section 4: Validation Layer
    Outputs strict JSON; enforces no improvisation on insufficient context.
    """

    def __init__(self, llm):
        self.llm = llm

    def invoke(self, state: AgentState) -> AgentState:
        """Validate retrieved context sufficiency."""
        question = state["question"]
        chunks = state["retrieved_chunks"]

        logger.info(f"[VALIDATE] Checking sufficiency for: '{question[:50]}...'")

        # Build context string from chunks
        context_parts = [
            f"[Chunk {i + 1}]\n{chunk['content']}" for i, chunk in enumerate(chunks)
        ]
        context_str = "\n\n".join(context_parts)

        validation_prompt = f"""You are a strict medical context validator. Your job is to determine if the retrieved context is sufficient to answer the user's question.

Question: {question}

Retrieved Context:
{context_str}

Output ONLY a JSON object with this exact structure:
{{
    "is_sufficient": true or false,
    "reason": "explanation of why context is or isn't sufficient",
    "confidence_0_to_1": a float between 0 and 1
}}

If you cannot answer the question using ONLY the provided context, set is_sufficient to false. Do NOT make up information."""

        messages = [HumanMessage(content=validation_prompt)]

        try:
            response = self.llm.invoke(messages)
            response_text = (
                response.content if hasattr(response, "content") else str(response)
            )

            # Parse JSON output
            try:
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    parsed = json.loads(json_str)

                    validation = ValidationOutput(**parsed)
                    state["validation_result"] = {
                        "is_sufficient": validation.is_sufficient,
                        "reason": validation.reason,
                        "confidence": validation.confidence_0_to_1,
                    }
                    state["validation_confidence"] = validation.confidence_0_to_1

                    if validation.is_sufficient:
                        state["validated_context"] = "SUFFICIENT"
                        logger.info(
                            f"[VALIDATE] ✓ Sufficient (confidence: {validation.confidence_0_to_1})"
                        )
                    else:
                        state["validated_context"] = "INSUFFICIENT_EVIDENCE"
                        logger.warning(
                            f"[VALIDATE] ✗ Insufficient: {validation.reason}"
                        )
                else:
                    raise ValueError("No JSON found in response")

            except (json.JSONDecodeError, ValueError) as parse_error:
                logger.error(f"[VALIDATE] JSON parse failed: {parse_error}")
                state["validated_context"] = "INSUFFICIENT_EVIDENCE"
                state["validation_result"] = {
                    "is_sufficient": False,
                    "reason": "Failed to parse validator response",
                    "confidence": 0.0,
                }
                state["validation_confidence"] = 0.0

        except Exception as e:
            logger.error(f"[VALIDATE] LLM error: {e}")
            state["validated_context"] = "INSUFFICIENT_EVIDENCE"
            state["validation_result"] = {
                "is_sufficient": False,
                "reason": f"Validation error: {str(e)}",
                "confidence": 0.0,
            }
            state["validation_confidence"] = 0.0

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
        citations = []
        for chunk in chunks:
            meta = chunk.get("metadata", {})
            if meta.get("source") and meta.get("page"):
                citations.append(
                    {
                        "source": meta.get("source", "Unknown"),
                        "page": str(meta.get("page", "?")),
                        "file_name": meta.get("file_name", "Unknown"),
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

        generation_prompt = f"""You are a medical education assistant. Use ONLY the provided context to answer the question accurately and precisely.

Context from textbook:
{context_str}

Question: {question}

Instructions:
1. Answer based EXCLUSIVELY on the provided context
2. If the context doesn't fully answer the question, state what is known and acknowledge limitations
3. Provide clear, exam-oriented answers
4. Do NOT add information not present in the context
5. Use appropriate medical terminology

Answer:"""

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
            state["answer"] = "Error generating response"
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


async def run_pipeline(question: str, vector_store, llm) -> dict:
    """
    Run the full 3-agent pipeline.
    Returns final state with answer, citations, and validation confidence.
    """
    logger.info(f"Running pipeline for: '{question[:50]}...'")

    # Initialize state
    initial_state = create_initial_state(question)

    # Create and run graph
    graph = create_agent_graph(vector_store, llm)
    result = await graph.ainvoke(initial_state)

    logger.info("Pipeline completed")
    return result
