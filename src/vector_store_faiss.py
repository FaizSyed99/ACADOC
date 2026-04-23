import logging
import os
import json
import faiss
import numpy as np
import pickle
import re
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorStoreManager:
    """FAISS vector store manager optimized for Markdown medical texts."""

    def __init__(
        self,
        persist_dir: str = "faiss_index",
        model_name: str = "all-MiniLM-L6-v2",
        rerank_model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
    ):
        self.persist_dir = os.path.abspath(persist_dir)
        os.makedirs(self.persist_dir, exist_ok=True)
        
        self.index_path = os.path.join(self.persist_dir, "faiss_index.bin")
        self.chunks_path = os.path.join(self.persist_dir, "chunks.json")
        self.bm25_path = os.path.join(self.persist_dir, "bm25.pkl")
        
        logger.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)
        
        logger.info(f"Loading re-ranker model: {rerank_model_name}")
        self.reranker = CrossEncoder(rerank_model_name)
        
        self.index = None
        self.chunks = []
        self.bm25 = None
        
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
            
            if os.path.exists(self.bm25_path):
                with open(self.bm25_path, "rb") as f:
                    self.bm25 = pickle.load(f)
            elif self.chunks:
                logger.info("⚡ BM25 index missing but chunks found. Rebuilding...")
                tokenized_corpus = [self._tokenize(c["content"]) for c in self.chunks]
                self.bm25 = BM25Okapi(tokenized_corpus)
                self.save()
            
            # Integrity Check
            if self.index and len(self.chunks) != self.index.ntotal:
                logger.warning(f"⚠️ Sync mismatch: Index ({self.index.ntotal}) != Chunks ({len(self.chunks)})")
            
            logger.info(f"✅ Loaded FAISS index with {len(self.chunks)} chunks")
            if self.bm25:
                logger.info("✅ Loaded BM25 fuzzy search engine")
        except Exception as e:
            logger.error(f"❌ Failed to load FAISS index: {e}")

    def save(self):
        """Save FAISS index and chunks to disk atomically."""
        try:
            if self.index is not None:
                faiss.write_index(self.index, self.index_path)
            
            if self.bm25 is not None:
                with open(self.bm25_path, "wb") as f:
                    pickle.dump(self.bm25, f)
            
            # Write to a temp file first to prevent corruption if the app stops mid-save
            temp_chunks_path = self.chunks_path + ".tmp"
            with open(temp_chunks_path, "w", encoding="utf-8") as f:
                json.dump(self.chunks, f, indent=2, ensure_ascii=False)
            os.replace(temp_chunks_path, self.chunks_path)
            
            logger.info(f"💾 Saved FAISS index and BM25 to {self.persist_dir}")
        except Exception as e:
            logger.error(f"❌ Failed to save FAISS index: {e}")

    def load_index(self):
        """Alias for load() for backward compatibility."""
        self.load()

    def add_documents(self, documents: List[Document]) -> None:
        """Add documents to FAISS index with structural metadata support."""
        if not documents:
            return

        logger.info(f"📚 Processing {len(documents)} documents...")
        
        texts_to_embed = []
        new_chunks = []
        
        for doc in documents:
            text = doc.page_content.strip()
            if not text:
                continue
                
            meta = doc.metadata
            # Prioritize Markdown headers for search context
            h1 = meta.get("Header_1", meta.get("Category", ""))
            h2 = meta.get("Header_2", meta.get("Topic", ""))
            
            embedding_text = f"{h1} {h2} {text}".strip()
            
            # Clean chunk for storage
            chunk = {
                "content": text,
                "metadata": meta,
                "header_path": f"{h1} > {h2}".strip(" > "),
                "source": meta.get("source", "Unknown"),
                "file_name": os.path.basename(meta.get("source", "Unknown"))
            }
            new_chunks.append(chunk)
            texts_to_embed.append(embedding_text)

        if not texts_to_embed:
            return

        # Generate Embeddings
        embeddings = self.model.encode(texts_to_embed, show_progress_bar=True)
        embeddings = np.array(embeddings).astype("float32")

        # Initialize Index if it's the first time
        if self.index is None:
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            logger.info(f"🆕 Created new FAISS index (dim={dimension})")
        
        # Update FAISS
        self.index.add(embeddings)
        self.chunks.extend(new_chunks)
        
        # Rebuild BM25 for the entire corpus to maintain consistency
        logger.info("🔄 Rebuilding BM25 fuzzy search index...")
        tokenized_corpus = [self._tokenize(c["content"]) for c in self.chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
        
        # Update and Save
        self.save()
        logger.info(f"✅ Indexed {len(new_chunks)} new chunks (Total: {len(self.chunks)})")

    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenizer for medical terms and general text."""
        # Lowercase, remove non-alphanumeric, and split
        text = text.lower()
        tokens = re.findall(r'\b\w+\b', text)
        return tokens

    def retrieve(self, query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Hybrid retrieval: Combines Vector Search (FAISS) and Fuzzy Search (BM25)
        using Reciprocal Rank Fusion (RRF).
        """
        if self.index is None or not self.chunks:
            logger.warning("🔍 Search attempted on empty index.")
            return []

        # 1. Vector Search (FAISS)
        query_embedding = self.model.encode([query_text])
        query_embedding = np.array(query_embedding).astype("float32")
        
        k_vector = min(n_results * 2, len(self.chunks))
        distances, indices = self.index.search(query_embedding, k_vector)
        
        # 2. Fuzzy Search (BM25)
        bm25_results = []
        if self.bm25:
            tokenized_query = self._tokenize(query_text)
            bm25_scores = self.bm25.get_scores(tokenized_query)
            # Get top indices for BM25
            bm25_indices = np.argsort(bm25_scores)[::-1][:k_vector]
            bm25_results = bm25_indices.tolist()

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF formula: Score = sum(1 / (k + rank))
        # k is a constant (usually 60)
        rrf_const = 60
        scores = {} # doc_index -> rrf_score

        # Process Vector results
        for rank, idx in enumerate(indices[0]):
            if idx == -1: continue
            scores[idx] = scores.get(idx, 0) + 1 / (rrf_const + rank + 1)

        # Process BM25 results
        for rank, idx in enumerate(bm25_results):
            scores[idx] = scores.get(idx, 0) + 1 / (rrf_const + rank + 1)

        # Sort by RRF score
        top_candidates_indices = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:n_results * 3]
        
        # 4. Cross-Encoder Re-ranking (The "Precision" Enhancement)
        if not top_candidates_indices:
            return []
            
        logger.info(f"🎯 Re-ranking {len(top_candidates_indices)} candidates...")
        pairs = [[query_text, self.chunks[idx]["content"]] for idx in top_candidates_indices]
        rerank_scores = self.reranker.predict(pairs)
        
        # Combine indices with their rerank scores
        reranked_results = []
        for i, idx in enumerate(top_candidates_indices):
            chunk_data = self.chunks[int(idx)].copy()
            score = float(rerank_scores[i])
            chunk_data["rerank_score"] = score
            chunk_data["score"] = score # For compatibility with existing agents
            reranked_results.append(chunk_data)
        
        # Sort by rerank score
        reranked_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        
        return reranked_results[:n_results]

    def reset(self) -> None:
        """Clear the index and files."""
        self.index = None
        self.chunks = []
        for path in [self.index_path, self.chunks_path]:
            if os.path.exists(path):
                os.remove(path)
        logger.warning("🗑️ FAISS index fully reset.")