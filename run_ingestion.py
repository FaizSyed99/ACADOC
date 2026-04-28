import asyncio
import os
import sys

# Ensure src/ is importable
_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "src"))
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

from src.ingest import process_file
from api.vector_store import VectorStoreManager

async def main():
    print("Initializing FAISS Vector Store...")
    vs = VectorStoreManager()
    
    file_path = "data/Essentials_of_Forensic_Medicine_KSN_Reddy MD.md"
    print(f"Processing Markdown File: {file_path}")
    
    documents = process_file(file_path)
    print(f"Generated {len(documents)} chunks from markdown.")
    
    await vs.add_documents(documents)
    print("Ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())
