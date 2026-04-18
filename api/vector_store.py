"""
SurrealDB Indexing Module: Embeddings → SurrealDB
Transitioning from ChromaDB for better scalability and relational hierarchy.
"""

import logging
import os
from typing import List, Optional, Dict, Any

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from surrealdb import AsyncSurreal as Surreal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStoreManager:
    """
    Manages SurrealDB vector storage.
    Enables future graph-based hierarchy as per Technical Architecture.
    """

    def __init__(
        self,
        url: str = "ws://localhost:8000/rpc",
        namespace: str = "acadoc",
        database: str = "prod",
        table: str = "textbook_chunks",
    ):
        self.url = os.getenv("SURREALDB_URL", url)
        self.namespace = os.getenv("SURREALDB_NS") or os.getenv("SURREALDB_NAMESPACE") or namespace
        self.database = os.getenv("SURREALDB_DB") or os.getenv("SURREALDB_DATABASE") or database
        self.table = os.getenv("SURREALDB_TABLE", table)
        self.token = os.getenv("SURREALDB_TOKEN")
        self.user = os.getenv("SURREALDB_USER", "root")
        self.password = os.getenv("SURREALDB_PASS", "root")

        logger.info(f"Initializing SurrealDB Manager on {self.url}")

        # Initialize embedding model
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2", model_kwargs={"device": "cpu"}
        )

    async def _get_db(self):
        """Connection to SurrealDB (supporting both Cloud Token and Local)."""
        db = Surreal(self.url)
        # Note: Using synchronous connection behavior if detected, 
        # but Surreal(url) in many versions handles the transport choice.
        # For this version, we call signin or authenticate.
        
        # We wrap in try/except to handle the specific driver version on user's machine
        try:
            if self.token:
                db.authenticate(self.token)
            else:
                db.signin({"user": self.user, "pass": self.password})
            
            db.use(self.namespace, self.database)
            return db
        except Exception as e:
            logger.error(f"SurrealDB Connection failed: {e}")
            raise e

    async def add_documents(self, documents: List[Document]) -> None:
        """
        Add documents to SurrealDB with vector embeddings.
        """
        logger.info(f"Adding {len(documents)} documents to SurrealDB table: {self.table}")
        
        db = await self._get_db()
        try:
            for i, doc in enumerate(documents):
                embedding = self.embedding_model.embed_query(doc.page_content)
                
                # Create record with vector and metadata
                await db.create(
                    self.table,
                    {
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "embedding": embedding,
                    }
                )
            logger.info("Successfully indexed documents in SurrealDB")
        finally:
            await db.close()

    async def query(
        self, query_text: str, n_results: int = 3
    ) -> Dict[str, Any]:
        """
        Query SurrealDB using vector similarity.
        """
        logger.info(f"Querying SurrealDB: '{query_text[:50]}...'")
        
        query_embedding = self.embedding_model.embed_query(query_text)
        
        db = await self._get_db()
        try:
            # SurrealQL vector similarity query
            # We use cosine similarity as defined in the technical plan logic.
            ql = f"""
            SELECT *, vector::similarity::cosine(embedding, $query_vec) AS similarity
            FROM {self.table}
            WHERE embedding <10> $query_vec
            ORDER BY similarity DESC
            LIMIT {n_results};
            """
            
            # Note: <10> is an example of an MTREE index search if defined.
            # For simplicity in POC, we can also use a raw order by if table is small.
            
            results = await db.query(ql, {"query_vec": query_embedding})
            
            # Format results to match the previous tool-friendly structure
            # To maintain compatibility with agents.py
            formatted_docs = []
            formatted_metas = []
            formatted_dists = []
            
            if results and results[0].get("result"):
                for row in results[0]["result"]:
                    formatted_docs.append(row["content"])
                    formatted_metas.append(row["metadata"])
                    formatted_dists.append(row.get("similarity", 0))
            
            return {
                "documents": [formatted_docs],
                "metadatas": [formatted_metas],
                "distances": [formatted_dists]
            }
        finally:
            await db.close()

    async def reset(self) -> None:
        """Wipe the table."""
        db = await self._get_db()
        try:
            await db.query(f"DELETE {self.table}")
            logger.warning(f"Cleared table {self.table}")
        finally:
            await db.close()
