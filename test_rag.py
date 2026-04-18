import asyncio
from api.vector_store import VectorStoreManager
from src.ingest import ingest_pdf
from langchain_core.documents import Document

async def main():
    print("Testing RAG Implementation using SurrealDB...")
    
    # We will test vector store creation and single query
    print("1. Initializing VectorStoreManager (SurrealDB)")
    vs = VectorStoreManager()
    
    try:
        # Mock add document to test without needing real PDF
        print("2. Indexing a mock medical document")
        mock_docs = [
            Document(
                page_content="Aspirin is a nonsteroidal anti-inflammatory drug (NSAID) used to reduce pain, fever, or inflammation.",
                metadata={"source": "mock_textbook.pdf", "page": 1, "file_name": "mock_textbook.pdf"}
            ),
             Document(
                page_content="Aspirin's mechanism of action involves the irreversible inhibition of cyclooxygenase (COX-1 and COX-2) enzymes.",
                metadata={"source": "mock_textbook.pdf", "page": 2, "file_name": "mock_textbook.pdf"}
            )
        ]
        
        # Test add_documents
        # Note: This will only work if SurrealDB is actually running locally.
        # But we'll try just to see the error or success
        await vs.add_documents(mock_docs)
        
        # Test query
        print("3. Querying Vector Store for 'Aspirin mechanism of action'")
        results = await vs.query("Aspirin mechanism of action")
        print("Vector Store Query Results:")
        print(results)
        
    except Exception as e:
        print(f"Error connecting to or interacting with SurrealDB: {e}")
        print("Please ensure SurrealDB is running locally at ws://localhost:8000/rpc")

if __name__ == "__main__":
    asyncio.run(main())
