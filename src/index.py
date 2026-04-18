"""
Indexing Module: Embeddings → ChromaDB
Technical Plan v1.2 Section 3: Textbook Grounding
"""

import logging
from pathlib import Path
from typing import List, Optional

import chromadb
from chromadb.config import Settings
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorStoreManager:
    """
    Manages ChromaDB vector store with persistent storage.
    Uses all-MiniLM-L6-v2 for lightweight, local embeddings.
    """

    def __init__(
        self,
        persist_directory: str = "chroma_db",
        collection_name: str = "acadoc_chunks",
    ):
        logger.info(f"Initializing VectorStoreManager: {collection_name}")

        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False, allow_reset=True),
        )

        # Initialize embedding model (lightweight, local)
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2", model_kwargs={"device": "cpu"}
        )

        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"description": "AcaDoc medical textbook chunks"},
        )

        logger.info(
            f"Collection ready: {self.collection.name}, count: {self.collection.count()}"
        )

    def add_documents(self, documents: List[Document]) -> None:
        """
        Add documents to vector store with metadata.
        Each document must have source + page metadata for citation.
        """
        logger.info(f"Adding {len(documents)} documents to vector store")

        if not documents:
            logger.warning("No documents to add")
            return

        # Prepare data for ChromaDB
        ids = [f"doc_{i}" for i in range(len(documents))]
        embeddings = self.embedding_model.embed_documents(
            [doc.page_content for doc in documents]
        )
        documents_text = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]

        # Add to collection
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents_text,
            metadatas=metadatas,
        )

        logger.info(f"Successfully indexed {len(documents)} documents")

    def query(
        self, query_text: str, n_results: int = 3, where: Optional[dict] = None
    ) -> dict:
        """
        Query vector store for relevant context.
        Returns documents with metadata (source, page) for citation.
        """
        logger.info(f"Querying: '{query_text[:50]}...' (n={n_results})")

        query_embedding = self.embedding_model.embed_query(query_text)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        logger.info(f"Query returned {len(results.get('documents', [[]])[0])} results")
        return results

    def reset(self) -> None:
        """Clear all data from collection (for testing)."""
        logger.warning("Resetting vector store")
        self.client.delete_collection(self.collection.name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection.name,
            metadata={"description": "AcaDoc medical textbook chunks"},
        )


def create_index(
    documents: List[Document], persist_directory: str = "chroma_db"
) -> VectorStoreManager:
    """
    Main entry point: Create vector store from documents.
    """
    logger.info("Creating vector index")
    manager = VectorStoreManager(persist_directory=persist_directory)
    manager.add_documents(documents)
    logger.info(f"Index created at {Path(persist_directory).absolute()}")
    return manager


if __name__ == "__main__":
    # Quick test - requires sample docs from ingest.py
    from ingest import ingest_pdf

    test_pdf = "data/sample_pharma.pdf"
    if Path(test_pdf).exists():
        docs = ingest_pdf(test_pdf)
        store = create_index(docs)
        results = store.query("aspirin mechanism of action")
        print(f"Test query returned {len(results['documents'][0])} results")
    else:
        print(f"Test PDF not found")
