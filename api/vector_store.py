# api/vector_store.py
"""
FAISS Vector Store Manager for API
Replaces SurrealDB/ChromaDB with the new FAISS-based logic.
Optimized for medical textbook retrieval with definition-aware chunking.
"""

import logging
import os
import json
import re
import faiss
import numpy as np
from typing import List, Optional, Dict, Any
from sentence_transformers import SentenceTransformer
from langchain_core.documents import Document

try:
    from google.cloud import storage
    HAS_GCS = True
except ImportError:
    HAS_GCS = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStoreManager:
    """
    Manages FAISS vector storage for the API.
    Provides async-compatible interface with enhanced retrieval for medical content.
    """

    def __init__(
        self,
        persist_dir: str = "faiss_index",
        model_name: str = "all-MiniLM-L6-v2",
    ):
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.index_path = os.path.join(self.persist_dir, "faiss_index.bin")
        self.chunks_path = os.path.join(self.persist_dir, "chunks.json")
        
        # Load embedding model
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        self.index = None
        self.chunks = []

        # GCS sync (optional)
        self.gcs_bucket = os.getenv("FAISS_GCS_BUCKET")
        if self.gcs_bucket and HAS_GCS:
            self._sync_from_gcs()
        
        # Load existing index if available
        if os.path.exists(self.index_path) and os.path.exists(self.chunks_path):
            self.load()

    def load(self):
        """Load FAISS index and chunks from disk."""
        try:
            if os.path.exists(self.index_path):
                self.index = faiss.read_index(self.index_path)
            if os.path.exists(self.chunks_path):
                with open(self.chunks_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
            logger.info(f"✅ Loaded FAISS index with {len(self.chunks)} chunks")
        except Exception as e:
            logger.error(f"❌ Failed to load FAISS index: {e}")

    def save(self):
        """Save FAISS index and chunks to disk."""
        if self.index is not None:
            faiss.write_index(self.index, self.index_path)
        with open(self.chunks_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2, ensure_ascii=False)
        
        if self.gcs_bucket and HAS_GCS:
            self._sync_to_gcs()

    def _sync_from_gcs(self):
        """Download index files from GCS."""
        if not HAS_GCS:
            return
        try:
            client = storage.Client()
            bucket = client.bucket(self.gcs_bucket)
            
            for file_path in [self.index_path, self.chunks_path]:
                blob_name = os.path.basename(file_path)
                blob = bucket.blob(blob_name)
                if blob.exists():
                    logger.info(f"📥 Downloading {blob_name} from GCS")
                    blob.download_to_filename(file_path)
        except Exception as e:
            logger.error(f"❌ GCS sync failed: {e}")

    def _sync_to_gcs(self):
        """Upload index files to GCS."""
        if not HAS_GCS:
            return
        try:
            client = storage.Client()
            bucket = client.bucket(self.gcs_bucket)
            
            for file_path in [self.index_path, self.chunks_path]:
                if os.path.exists(file_path):
                    blob_name = os.path.basename(file_path)
                    blob = bucket.blob(blob_name)
                    logger.info(f"📤 Uploading {blob_name} to GCS")
                    blob.upload_from_filename(file_path)
        except Exception as e:
            logger.error(f"❌ GCS sync failed: {e}")

    async def add_documents(self, documents: List[Document]) -> None:
        """Add documents to FAISS index with medical-optimized embedding."""
        logger.info(f"📚 Adding {len(documents)} documents to FAISS")
        
        texts_to_embed = []
        new_chunks = []
        
        for doc in documents:
            text = doc.page_content.strip()
            if not text:
                continue
                
            meta = doc.metadata
            
            # ✅ Enhance embedding text with metadata for better retrieval
            embedding_text = f"{meta.get('chapter', '')} {meta.get('topic', '')} {text}".strip()
            
            chunk = {
                "chapter": meta.get("chapter", "Unknown"),
                "topic": meta.get("topic", "General"),
                "page": meta.get("page", "N/A"),
                "source": meta.get("source", "Unknown"),
                "file_name": meta.get("file_name", "Unknown"),
                "content": text,
                "metadata": meta
            }
            new_chunks.append(chunk)
            texts_to_embed.append(embedding_text)

        if not texts_to_embed:
            logger.warning("⚠️ No valid texts to embed")
            return

        # Generate embeddings
        embeddings = self.model.encode(texts_to_embed, show_progress_bar=False)
        embeddings = np.array(embeddings).astype("float32")

        # Initialize index if needed
        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            logger.info(f"🆕 Created new FAISS index (dim={dimension})")
        
        # Add to index
        self.index.add(embeddings)
        self.chunks.extend(new_chunks)
        self.save()
        logger.info(f"✅ Indexed {len(new_chunks)} new chunks (total: {len(self.chunks)})")

    async def query(
        self, 
        query_text: str, 
        n_results: int = 10, 
        similarity_threshold: float = 0.0
    ) -> Dict[str, Any]:
        """
        Search FAISS index with hybrid search (Semantic + Keyword).
        Optimized for medical/academic textbook content.
        """
        if self.index is None or not self.chunks:
            logger.warning("⚠️ Index not loaded or empty")
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "scores": [[]]}
            
        # Generate query embedding
        query_embedding = self.model.encode([query_text])
        query_embedding = np.array(query_embedding).astype("float32")
        
        # Safe search: don't request more than we have
        safe_n_results = min(max(n_results * 2, 20), len(self.chunks))
        if safe_n_results <= 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "scores": [[]]}

        # Semantic search (FAISS)
        distances, indices = self.index.search(query_embedding, safe_n_results)
        
        semantic_results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1 or idx >= len(self.chunks):
                continue
            # Convert L2 distance to similarity score (0-1 range)
            similarity = 1 / (1 + distances[0][i])
            if similarity >= similarity_threshold:
                semantic_results.append({
                    "idx": idx,
                    "distance": float(distances[0][i]),
                    "similarity": similarity,
                    "chunk": self.chunks[idx]
                })
        
        # ✅ Keyword search for exact phrase matching (critical for definitions)
        keyword_results = []
        query_words = re.findall(r'\b[a-zA-Z]{3,}\b', query_text.lower())
        
        if query_words:
            for idx, chunk in enumerate(self.chunks):
                content = chunk.get("content", "").lower()
                # Score: count exact word matches + phrase bonuses
                score = sum(1 for w in query_words if w in content)
                
                # ✅ Bonus for definition phrases
                definition_phrases = [
                    "forensic science is", "forensic medicine is", 
                    "defined as", "introduction to", "scope of"
                ]
                for phrase in definition_phrases:
                    if phrase in content:
                        score += 3  # Heavy boost for definition content
                
                if score > 0:
                    keyword_results.append({
                        "idx": idx,
                        "score": score,
                        "chunk": chunk
                    })
            
            # Sort by keyword score (descending)
            keyword_results.sort(key=lambda x: x["score"], reverse=True)
        
        # ✅ Blend results: prioritize keyword matches for definitional queries
        seen_idx = set()
        blended = []
        
        # First: add top keyword matches (exact phrase priority)
        for item in keyword_results[:5]:
            if item["idx"] not in seen_idx:
                seen_idx.add(item["idx"])
                blended.append(item)
        
        # Then: fill remaining slots with semantic results
        for item in semantic_results:
            if len(blended) >= n_results:
                break
            if item["idx"] not in seen_idx:
                seen_idx.add(item["idx"])
                blended.append(item)
        
        # Format output
        filtered_docs = []
        filtered_metas = []
        filtered_dists = []
        filtered_scores = []
        
        for item in blended:
            chunk = item["chunk"]
            filtered_docs.append(chunk.get("content", ""))
            filtered_metas.append({
                "page": chunk.get("page", "N/A"),
                "source": chunk.get("source", "Unknown"),
                "file_name": chunk.get("file_name", "Unknown"),
                "chapter": chunk.get("chapter", "Unknown"),
                "topic": chunk.get("topic", "General")
            })
            filtered_dists.append(item.get("distance", 0.0))
            filtered_scores.append(item.get("similarity", item.get("score", 0.0)))
        
        logger.debug(f"🔍 Query '{query_text[:50]}...' → {len(filtered_docs)} results")
        
        return {
            "documents": [filtered_docs],
            "metadatas": [filtered_metas],
            "distances": [filtered_dists],
            "scores": [filtered_scores]
        }

    async def retrieve(self, query_text: str, n_results: int = 8) -> List[Dict[str, Any]]:
        """
        Query FAISS index and return formatted chunks.
        Interface matches api/agents.py expectations.
        """
        logger.info(f"🔎 Retrieving for: '{query_text[:60]}...'")
        
        res = await self.query(query_text, n_results)
        retrieved = []
        
        if res["documents"] and res["documents"][0]:
            for i, doc in enumerate(res["documents"][0]):
                if not doc.strip():
                    continue
                    
                # Build chunk with all necessary fields for agents.py
                chunk_data = {
                    "content": doc,
                    "page": res["metadatas"][0][i].get("page", "N/A"),
                    "source": res["metadatas"][0][i].get("source", "Unknown"),
                    "file_name": res["metadatas"][0][i].get("file_name", "Unknown"),
                    "chapter": res["metadatas"][0][i].get("chapter", "Unknown"),
                    "topic": res["metadatas"][0][i].get("topic", "General"),
                    "score": res["scores"][0][i] if "scores" in res else 0.0,
                    "metadata": res["metadatas"][0][i]
                }
                retrieved.append(chunk_data)
        
        logger.info(f"✅ Retrieved {len(retrieved)} chunks")
        return retrieved

    async def reset(self) -> None:
        """Clear the index and chunk storage."""
        self.index = None
        self.chunks = []
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.chunks_path):
            os.remove(self.chunks_path)
        logger.warning("🗑️ FAISS index reset")
    
    async def close(self):
        """Cleanup resources (optional)."""
        self.save()
        logger.info("💾 Vector store saved and closed")