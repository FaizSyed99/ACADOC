import json
import faiss
import numpy as np
import os
import logging
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

SYNONYMS = {
    "cell membrane": ["plasma membrane"],
    "plasma membrane": ["cell membrane"],
    "cell wall": ["cell boundary"],
    "dna": ["genetic material", "genome"],
    "genome": ["dna", "genetic material"],
    "cell division": ["mitosis", "cell cycle"],
    "mitosis": ["cell division"],
    "rbc": ["red blood cell", "erythrocyte"],
    "red blood cell": ["rbc", "erythrocyte"],
    "wbc": ["white blood cell", "leukocyte"],
    "epithelium": ["epithelial tissue"],
    "connective tissue": ["stroma"],
    "basement membrane": ["basal lamina"],
    "basal lamina": ["basement membrane"],
    "mitochondria": ["mitochondrion"],
    "ribosome": ["ribosomes"],
    "pharmacokinetics": ["adme", "absorption", "distribution", "metabolism", "excretion"],
    "adme": ["pharmacokinetics"],
    "pharmacodynamics": ["mechanism of action", "drug effect"],
    "aspirin": ["acetylsalicylic acid", "asa"],
    "digoxin": ["lanoxin", "cardiac glycoside"],
    "heart failure": ["congestive heart failure", "chf"],
    "myocardial infarction": ["heart attack", "mi"],
}


class VectorStoreManager:
    """
    Manages FAISS vector storage with MiniLM embeddings.
    Replaces SurrealDB/ChromaDB for the new medical textbook backend.
    """

    def __init__(
        self,
        index_path: str = "faiss_index.bin",
        chunks_path: str = "chunks.json",
        model_name: str = "all-MiniLM-L6-v2",
    ):
        self.index_path = index_path
        self.chunks_path = chunks_path
        self.model = SentenceTransformer(model_name)
        
        self.index = None
        self.chunks = []
        
        if os.path.exists(self.index_path) and os.path.exists(self.chunks_path):
            self.load()
        else:
            logger.warning(f"Index or chunks not found at {index_path}. Ready for new data.")

    def load(self):
        """Load the FAISS index and chunks from disk."""
        logger.info(f"Loading FAISS index from {self.index_path}")
        self.index = faiss.read_index(self.index_path)
        
        with open(self.chunks_path, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)
        logger.info(f"Loaded {len(self.chunks)} chunks")

    def save(self):
        """Save the FAISS index and chunks to disk."""
        if self.index is not None:
            faiss.write_index(self.index, self.index_path)
        
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2, ensure_ascii=False)
        logger.info("Saved index and chunks")

    def add_documents(self, documents: List[Any]):
        """
        Add documents (usually LangChain Document objects or dicts).
        Converts them to the internal chunk format and updates the index.
        """
        new_chunks = []
        texts_to_embed = []
        
        for doc in documents:
            # Handle LangChain Document or raw dict
            if hasattr(doc, "page_content"):
                content = doc.page_content
                metadata = doc.metadata
            else:
                content = doc.get("page_content") or doc.get("content")
                metadata = doc.get("metadata") or {}

            chunk = {
                "chapter": metadata.get("chapter", "Unknown"),
                "topic": metadata.get("topic", "General"),
                "content": content,
                "metadata": metadata
            }
            new_chunks.append(chunk)
            # Combine fields for better embedding context as in AcaDocAI/embeddings.py
            texts_to_embed.append(f"{chunk['chapter']} {chunk['topic']} {chunk['content']}")

        embeddings = self.model.encode(texts_to_embed, show_progress_bar=True)
        embeddings = np.array(embeddings).astype("float32")

        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
        
        self.index.add(embeddings)
        self.chunks.extend(new_chunks)
        self.save()

    def query(self, query_text: str, n_results: int = 10, where: Optional[dict] = None) -> Dict[str, Any]:
        """
        Query the FAISS index with hybrid search (Semantic + Exact Keyword).
        """
        if self.index is None or not self.chunks:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

        # 1. Semantic Search with Query Expansion
        expanded_query = query_text.lower()
        for key, values in SYNONYMS.items():
            if key in expanded_query:
                expanded_query += " " + " ".join(values)

        query_vec = self.model.encode([expanded_query]).astype("float32")
        # Retrieve more chunks initially to allow blending
        distances, indices = self.index.search(query_vec, max(n_results * 2, 20))

        semantic_results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.chunks):
                semantic_results.append((idx, float(distances[0][i])))

        # 2. Exact Keyword Search (Naïve BM25-like)
        # Extract meaningful words from query
        import re
        words = re.findall(r'\b[a-zA-Z]{4,}\b', query_text.lower())
        
        keyword_results = []
        if words:
            for idx, chunk in enumerate(self.chunks):
                content = chunk.get("content", "").lower()
                # Score based on how many query words are in the chunk
                score = sum(1 for w in words if w in content)
                if score > 0:
                    # Higher score means better match, we use negative for distance sorting
                    keyword_results.append((idx, -score))
            
            # Sort keyword results by highest score
            keyword_results.sort(key=lambda x: x[1])

        # 3. Blend Results
        seen_idx = set()
        blended_indices = []
        
        # Prioritize top keyword matches first (extremely important for rare terms like "BOBBIT")
        for idx, score in keyword_results[:5]:
            if idx not in seen_idx:
                seen_idx.add(idx)
                blended_indices.append(idx)
                
        # Fill the rest with semantic matches
        for idx, dist in semantic_results:
            if len(blended_indices) >= n_results:
                break
            if idx not in seen_idx:
                seen_idx.add(idx)
                blended_indices.append(idx)

        # 4. Format Output
        formatted_docs = []
        formatted_metas = []
        formatted_dists = []

        for idx in blended_indices:
            chunk = self.chunks[idx]
            formatted_docs.append(chunk["content"])
            
            meta = chunk.get("metadata", {}).copy()
            meta["chapter"] = chunk.get("chapter", "Unknown")
            meta["topic"] = chunk.get("topic", "General")
            
            formatted_metas.append(meta)
            # Dummy distance for keyword matches
            formatted_dists.append(0.0)

        return {
            "documents": [formatted_docs],
            "metadatas": [formatted_metas],
            "distances": [formatted_dists]
        }

    @property
    def collection(self):
        """Compatibility property for UI status checks."""
        class MockCollection:
            def __init__(self, count): self.count_val = count
            def count(self): return self.count_val
        return MockCollection(len(self.chunks))
