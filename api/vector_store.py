"""
FAISS Vector Store Manager for API
Replaces SurrealDB/ChromaDB with the new FAISS-based logic.
"""

import logging
import os
import json
import faiss
import numpy as np
from typing import List, Optional, Dict, Any
from sentence_transformers import SentenceTransformer
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStoreManager:
    """
    Manages FAISS vector storage for the API.
    Provides async-compatible interface for compatibility with existing endpoints.
    """

    def __init__(
        self,
        persist_dir: str = "chroma_db",
        model_name: str = "all-MiniLM-L6-v2",
    ):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.index_path = os.path.join(self.persist_dir, "faiss_index.bin")
        self.chunks_path = os.path.join(self.persist_dir, "chunks.json")
        
        # Load model
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        self.index = None
        self.chunks = []
        
        if os.path.exists(self.index_path) and os.path.exists(self.chunks_path):
            self.load()

    def load(self):
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.chunks_path, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)
            logger.info(f"Loaded FAISS index and {len(self.chunks)} chunks")
        except Exception as e:
            logger.error(f"Failed to load FAISS index: {e}")

    def save(self):
        if self.index is not None:
            faiss.write_index(self.index, self.index_path)
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2, ensure_ascii=False)

    async def add_documents(self, documents: List[Document]) -> None:
        """Add documents to FAISS index."""
        logger.info(f"Adding {len(documents)} documents to FAISS")
        
        texts_to_embed = []
        new_chunks = []
        
        for doc in documents:
            text = doc.page_content
            meta = doc.metadata
            
            chunk = {
                "chapter": meta.get("chapter", "Unknown"),
                "topic": meta.get("topic", "General"),
                "content": text,
                "metadata": meta
            }
            new_chunks.append(chunk)
            texts_to_embed.append(f"{chunk['chapter']} {chunk['topic']} {chunk['content']}")

        embeddings = self.model.encode(texts_to_embed)
        embeddings = np.array(embeddings).astype("float32")

        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
        
        self.index.add(embeddings)
        self.chunks.extend(new_chunks)
        self.save()

    async def query(
        self, query_text: str, n_results: int = 3
    ) -> Dict[str, Any]:
        """Query FAISS index. Matches src/agents.py interface."""
        if self.index is None:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
            
        query_vec = self.model.encode([query_text]).astype("float32")
        distances, indices = self.index.search(query_vec, n_results)

        formatted_docs = []
        formatted_metas = []
        formatted_dists = []

        for i, idx in enumerate(indices[0]):
            if idx == -1 or idx >= len(self.chunks):
                continue
            
            chunk = self.chunks[idx]
            formatted_docs.append(chunk["content"])
            formatted_metas.append(chunk["metadata"])
            formatted_dists.append(float(distances[0][i]))

        return {
            "documents": [formatted_docs],
            "metadatas": [formatted_metas],
            "distances": [formatted_dists]
        }

    async def retrieve(self, query_text: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """Query FAISS index. Matches api/agents.py interface."""
        res = await self.query(query_text, n_results)
        retrieved = []
        if res["documents"] and res["documents"][0]:
            for i, doc in enumerate(res["documents"][0]):
                chunk_data = res["metadatas"][0][i].copy()
                chunk_data["content"] = doc
                retrieved.append(chunk_data)
        return retrieved

    async def reset(self) -> None:
        """Clear the index."""
        self.index = None
        self.chunks = []
        if os.path.exists(self.index_path): os.remove(self.index_path)
        if os.path.exists(self.chunks_path): os.remove(self.chunks_path)
        logger.warning("FAISS index reset")
    
    async def close(self):
        pass
