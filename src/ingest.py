"""
Ingestion Module: PDF → Semantic Chunks with Metadata
Refactored to use PyMuPDF and Chapter/Topic detection from AcaDocAI.
"""

import logging
import re
import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict, Any
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """Clean extracted text from PDF artifacts."""
    text = re.sub(r"(\w)(\w)", r"\1\2", text)
    text = re.sub(r"-\s+", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()

def is_chapter_keyword(line: str) -> bool:
    return line.strip() == "CHAPTER"

def is_topic(line: str) -> bool:
    """Detect if a line is a topic heading (All uppercase, specific length)."""
    return (
        line.isupper()
        and 2 <= len(line.split()) <= 10
        and not line.startswith("SECTION")
        and not line.startswith("CHAPTER")
        and not re.match(r"^CHAPTER\s*\d*", line)
        and not any(char.isdigit() for char in line)
        and len(line) > 8
    )

def is_noise(line: str) -> bool:
    if len(line) < 3: return True
    if re.match(r"^\d+$", line): return True
    if line.startswith("Fig"): return True
    return False

def ingest_pdf(pdf_path: str) -> List[Document]:
    """
    Main entry point: Load PDF → Detect Chapters/Topics → Return Documents.
    Refactored with AcaDocAI logic for medical textbooks.
    """
    logger.info(f"Starting ingestion pipeline for: {pdf_path}")
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = fitz.open(pdf_path)
    
    current_chapter = "Unknown"
    current_topic = "General"
    current_content = []
    
    documents = []
    
    expecting_chapter_title = False
    chapter_number = None

    def flush_chunk(page_num):
        nonlocal current_content, current_chapter, current_topic
        if not current_content or not current_topic:
            current_content = []
            return

        content = " ".join(current_content).strip()
        # Relaxed filter: capture any significant text block
        if len(content.split()) < 5:
            current_content = []
            return

        # Create LangChain Document for compatibility
        doc_obj = Document(
            page_content=content,
            metadata={
                "source": str(path.absolute()),
                "file_name": path.name,
                "page": page_num + 1,
                "chapter": current_chapter,
                "topic": current_topic
            }
        )
        documents.append(doc_obj)
        current_content = []

    for page_num, page in enumerate(doc):
        text = clean_text(page.get_text("text"))
        lines = text.split("\n")

        for line in lines:
            line = line.strip()
            if not line or is_noise(line): continue
            if line.startswith("SECTION"): continue

            # Chapter Detection
            if is_chapter_keyword(line):
                expecting_chapter_title = True
                continue
            elif expecting_chapter_title:
                flush_chunk(page_num)
                if re.match(r"^\d+$", line):
                    chapter_number = line
                    expecting_chapter_title = "title"
                    continue
                else:
                    current_chapter = f"{chapter_number} {line}" if chapter_number else line
                    expecting_chapter_title = False
                    continue
            elif expecting_chapter_title == "title":
                current_chapter = f"{chapter_number} {line}"
                expecting_chapter_title = False
                continue

            # Topic Detection
            if is_topic(line):
                flush_chunk(page_num)
                current_topic = line
                continue

            # Content Accumulation
            current_content.append(line)

    flush_chunk(doc.page_count - 1)
    logger.info(f"Ingestion complete: {len(documents)} structured chunks created.")
    return documents

if __name__ == "__main__":
    # Quick test
    test_pdf = "data/sample_pharma.pdf"
    if Path(test_pdf).exists():
        docs = ingest_pdf(test_pdf)
        print(f"Test: Generated {len(docs)} chunks")
    else:
        print(f"Test PDF not found at {test_pdf}")
