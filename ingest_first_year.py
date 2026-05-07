import asyncio
import os
import sys
from pathlib import Path

# Ensure src/ is importable
_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "src"))
if _src_path not in sys.path:
    sys.path.insert(0, _src_path)

from src.ingest import process_file
from api.vector_store import VectorStoreManager

async def main():
    print("Initializing FAISS Vector Store...")
    vs = VectorStoreManager()
    
    data_dir = Path("data")
    
    if not data_dir.exists():
        print(f"Data directory not found.")
        return
        
    pdf_files = list(data_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {data_dir}.")
        return
        
    print(f"Found {len(pdf_files)} PDFs to process.")
    
    for pdf_path in pdf_files:
        print(f"\nProcessing File: {pdf_path}")
        
        # Determine subject from filename
        subject_metadata = None
        filename_lower = pdf_path.name.lower()
        if "physio" in filename_lower or "guyton" in filename_lower:
            subject_metadata = "Physiology"
        elif "bio" in filename_lower or "harper" in filename_lower:
            subject_metadata = "Biochemistry"
        elif "anat" in filename_lower or "chaurasia" in filename_lower or "bdc" in filename_lower:
            subject_metadata = "Anatomy"
            
        if subject_metadata is None:
            print(f"Skipping {pdf_path.name} (Not identified as a First Year textbook).")
            continue
            
        print(f"Assigned Subject: {subject_metadata}")
        
        documents = process_file(str(pdf_path))
        
        # Inject subject metadata
        for doc in documents:
            doc.metadata["subject"] = subject_metadata
            
        print(f"Generated {len(documents)} chunks. Adding to vector store...")
        await vs.add_documents(documents)
        print(f"Successfully ingested {pdf_path.name}")
        
    print("\nAll First Year ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())
