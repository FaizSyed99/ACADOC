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
    print("Initializing FAISS Vector Store for PYQs...")
    vs = VectorStoreManager()
    
    data_dir = Path("data")
    
    if not data_dir.exists():
        print(f"Data directory {data_dir} not found.")
        return
        
    # Support both PDF and Markdown for PYQs
    all_files = list(data_dir.glob("*.pdf")) + list(data_dir.glob("*.md"))
    pyq_files = [f for f in all_files if "pyq" in f.name.lower()]
    
    if not pyq_files:
        print(f"No PYQ files found in {data_dir}. Make sure your filename contains 'pyq'.")
        return
        
    print(f"Found {len(pyq_files)} PYQ files to process.")
    
    for pyq_path in pyq_files:
        print(f"\nProcessing PYQ: {pyq_path}")
        
        # Determine subject heuristically
        subject_metadata = "Unknown"
        filename_lower = pyq_path.name.lower()
        
        if "forensic" in filename_lower or "fmt" in filename_lower:
            subject_metadata = "Forensic"
        elif "psm" in filename_lower or "community" in filename_lower:
            subject_metadata = "PSM"
        elif "anat" in filename_lower:
            subject_metadata = "Anatomy"
        elif "physio" in filename_lower:
            subject_metadata = "Physiology"
        elif "bio" in filename_lower:
            subject_metadata = "Biochemistry"
            
        print(f"Assigned Subject: {subject_metadata}")
        
        documents = process_file(str(pyq_path))
        
        # Inject metadata to mark this as an Exam Paper
        for doc in documents:
            doc.metadata["subject"] = subject_metadata
            doc.metadata["doc_type"] = "exam_paper"
            
        print(f"Generated {len(documents)} chunks. Adding to vector store...")
        await vs.add_documents(documents)
        print(f"Successfully ingested {pyq_path.name}")
        
    print("\nAll PYQ ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())
