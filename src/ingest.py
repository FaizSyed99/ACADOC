"""
Ingestion Module: PDF → Semantic Chunks with Metadata
Technical Plan v1.2 Section 3: Textbook Grounding
"""

import logging
from pathlib import Path
from typing import List, Dict, Any

from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_pdf(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Load PDF and extract text with page-level metadata.
    Each page is returned as a dict with 'page_content' and 'metadata'.
    """
    logger.info(f"Loading PDF: {pdf_path}")
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    reader = PdfReader(pdf_path)
    pages = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():
            pages.append(
                {
                    "page_content": text,
                    "metadata": {
                        "source": str(path.absolute()),
                        "page": i + 1,  # 1-indexed for human readability
                        "file_name": path.name,
                    },
                }
            )
            logger.debug(f"Extracted page {i + 1}, {len(text)} chars")

    logger.info(f"Loaded {len(pages)} pages from PDF")
    return pages


def chunk_pages(pages: List[Dict[str, Any]]) -> List[Document]:
    """
    Perform structure-aware chunking preserving semantic hierarchy.
    Uses heading separators to maintain logical context.
    Returns LangChain Document objects with embedded metadata.
    """
    logger.info("Starting structure-aware chunking")

    # Separator priority: higher-level headings first
    # This preserves ##, ### structure in chunks
    splitter = RecursiveCharacterTextSplitter(
        separators=["\n## ", "\n### ", "\n", " "],
        chunk_size=800,
        chunk_overlap=100,
        length_function=len,
        add_start_index=False,
    )

    documents = []
    for page_data in pages:
        # Split page into chunks
        splits = splitter.split_text(page_data["page_content"])

        for split in splits:
            if split.strip():
                doc = Document(
                    page_content=split, metadata=page_data["metadata"].copy()
                )
                documents.append(doc)

    logger.info(f"Created {len(documents)} chunks with metadata preservation")
    return documents


def ingest_pdf(pdf_path: str) -> List[Document]:
    """
    Main entry point: Load PDF → Chunk → Return Documents.
    Ensures every chunk carries source + page metadata for citation.
    """
    logger.info(f"Starting ingestion pipeline for: {pdf_path}")
    pages = load_pdf(pdf_path)
    documents = chunk_pages(pages)
    logger.info(f"Ingestion complete: {len(documents)} documents ready for indexing")
    return documents


if __name__ == "__main__":
    # Quick test
    test_pdf = "data/sample_pharma.pdf"
    if Path(test_pdf).exists():
        docs = ingest_pdf(test_pdf)
        print(f"Test: Generated {len(docs)} chunks")
    else:
        print(f"Test PDF not found at {test_pdf}")
