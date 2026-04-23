import sys
import os

# Add src to path
sys.path.append(os.getcwd())

from vector_store_faiss import VectorStoreManager

def test_search():
    # Use the existing index path found earlier
    persist_dir = r"..\faiss_index\024d572563"
    
    if not os.path.exists(persist_dir):
        # Fallback to local faiss_index if not found
        persist_dir = "faiss_index"
        
    print(f"--- Initializing VectorStoreManager with persist_dir: {persist_dir} ---")
    vsm = VectorStoreManager(persist_dir=persist_dir)
    
    query = "medicolegal cases in Inddia" # Added a typo in India
    print(f"\n--- Testing Hybrid Search ---")
    print(f"Query: '{query}'")
    
    results = vsm.retrieve(query, n_results=3)
    
    print(f"\nRetrieved {len(results)} results:")
    for i, res in enumerate(results):
        print(f"\n[{i+1}] (Score: {res.get('rerank_score', 'N/A')})")
        print(f"Source: {res.get('file_name', 'Unknown')}")
        print(f"Snippet: {res.get('content')[:200]}...")

if __name__ == "__main__":
    test_search()
