"""
Ingestion Module: Unified Document Ingestion
Supports: PDF, Markdown, Text, and Images (via Vision LLM).
"""

import logging
import re
import os
import base64
import fitz  # PyMuPDF
from pathlib import Path
from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
from langchain.chat_models import ChatOpenAI
from langchain_core.messages import HumanMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    text = re.sub(r"(\w)(\w)", r"\1\2", text)
    text = re.sub(r"-\s+", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()

def is_chapter_keyword(line: str) -> bool:
    return line.strip() == "CHAPTER"

def is_topic(line: str) -> bool:
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
    """Ingest PDF documents using PyMuPDF."""
    logger.info(f"Ingesting PDF: {pdf_path}")
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
        if len(content.split()) < 5:
            current_content = []
            return

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

            if is_topic(line):
                flush_chunk(page_num)
                current_topic = line
                continue

            current_content.append(line)

    flush_chunk(doc.page_count - 1)
    logger.info(f"Ingestion complete: {len(documents)} chunks created.")
    return documents

def ingest_markdown(file_path: str) -> List[Document]:
    """Ingest Markdown files preserving header structure."""
    logger.info(f"Ingesting Markdown: {file_path}")
    path = Path(file_path)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    headers_to_split_on = [
        ("#", "chapter"),
        ("##", "topic"),
        ("###", "subtopic"),
    ]
    markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    md_header_splits = markdown_splitter.split_text(content)
    
    # Further split long sections
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.split_documents(md_header_splits)
    
    for doc in docs:
        doc.metadata["source"] = str(path.absolute())
        doc.metadata["file_name"] = path.name
        # Ensure chapter and topic exist
        if "chapter" not in doc.metadata: doc.metadata["chapter"] = "Unknown"
        if "topic" not in doc.metadata: doc.metadata["topic"] = "General"
        
    return docs

def ingest_text(file_path: str) -> List[Document]:
    """Ingest raw text files."""
    logger.info(f"Ingesting Text: {file_path}")
    path = Path(file_path)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.create_documents([content])
    
    for doc in docs:
        doc.metadata = {
            "source": str(path.absolute()),
            "file_name": path.name,
            "chapter": "Unknown",
            "topic": "General"
        }
    return docs

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def ingest_image(file_path: str) -> List[Document]:
    """Ingest images using OpenAI Vision API to extract text and context."""
    logger.info(f"Ingesting Image using Vision LLM: {file_path}")
    path = Path(file_path)
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is required for image ingestion.")
        
    llm = ChatOpenAI(model="gpt-4o", max_tokens=1024, temperature=0.0)
    
    base64_image = encode_image(file_path)
    
    prompt = "Extract all text, labels, and structural information from this medical image, diagram, or page. Present it as clear text."
    
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
        ]
    )
    
    response = llm.invoke([message])
    content = response.content if hasattr(response, 'content') else str(response)
    
    # Chunk the extracted text
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = text_splitter.create_documents([content])
    
    for doc in docs:
        doc.metadata = {
            "source": str(path.absolute()),
            "file_name": path.name,
            "chapter": "Image Extraction",
            "topic": "Diagram/Scan"
        }
    return docs

def process_file(file_path: str) -> List[Document]:
    """Unified router to ingest various file formats."""
    ext = Path(file_path).suffix.lower()
    if ext == '.pdf':
        return ingest_pdf(file_path)
    elif ext in ['.md', '.markdown']:
        return ingest_markdown(file_path)
    elif ext in ['.txt', '.csv']:
        return ingest_text(file_path)
    elif ext in ['.png', '.jpg', '.jpeg', '.webp']:
        return ingest_image(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
