import os
import uuid
import json
import psycopg2
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import MarkdownTextSplitter, RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Neon DB Connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("PGHOST"),
        database=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD"),
        sslmode=os.getenv("PGSSLMODE", "require")
    )

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    # Enable pgvector
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    # Create parent documents table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS parent_documents (
        id text PRIMARY KEY,
        text text,
        metadata jsonb
    );
    """)
    
    # Create child chunks table with vector column
    cur.execute("""
    CREATE TABLE IF NOT EXISTS child_chunks (
        id text PRIMARY KEY,
        parent_id text REFERENCES parent_documents(id),
        text text,
        metadata jsonb,
        embedding vector(384)
    );
    """)
    conn.commit()
    cur.close()
    conn.close()

def ingest_markdown(file_path: str, model_name="all-MiniLM-L6-v2"):
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    # Hierarchical Chunking
    # 1. Parent chunks (larger context)
    print("Performing Hierarchical Chunking...")
    parent_splitter = MarkdownTextSplitter(chunk_size=2000, chunk_overlap=200)
    parent_chunks = parent_splitter.split_text(text)
    
    # 2. Child chunks (smaller context for precise retrieval)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    faiss_data = []
    
    parent_dict = {}
    
    for p_chunk in parent_chunks:
        parent_id = str(uuid.uuid4())
        parent_dict[parent_id] = p_chunk
        
        # Insert parent
        cur.execute(
            "INSERT INTO parent_documents (id, text, metadata) VALUES (%s, %s, %s)",
            (parent_id, p_chunk, json.dumps({"source": file_path, "type": "parent"}))
        )
        
        # Split into children
        children = child_splitter.split_text(p_chunk)
        if not children:
            continue
            
        embeddings = model.encode(children)
        
        for child_text, emb in zip(children, embeddings):
            child_id = str(uuid.uuid4())
            emb_list = emb.tolist()
            
            # Insert into Neon DB (Primary)
            cur.execute(
                "INSERT INTO child_chunks (id, parent_id, text, metadata, embedding) VALUES (%s, %s, %s, %s, %s)",
                (child_id, parent_id, child_text, json.dumps({"source": file_path, "type": "child"}), emb_list)
            )
            
            # Add to FAISS data (Fallback)
            faiss_data.append({
                "id": child_id,
                "parent_id": parent_id,
                "text": child_text,
                "embedding": emb_list
            })
            
    conn.commit()
    cur.close()
    conn.close()
    
    # Update FAISS Index
    print("Updating FAISS fallback index...")
    faiss_dir = os.path.join(os.path.dirname(__file__), "..", "faiss_index")
    os.makedirs(faiss_dir, exist_ok=True)
    
    if faiss_data:
        dim = len(faiss_data[0]["embedding"])
        index = faiss.IndexFlatL2(dim)
        embeddings_matrix = np.array([d["embedding"] for d in faiss_data]).astype('float32')
        index.add(embeddings_matrix)
        
        faiss.write_index(index, os.path.join(faiss_dir, "faiss_index.bin"))
        
        # Save chunks info for FAISS
        with open(os.path.join(faiss_dir, "chunks.json"), "w", encoding="utf-8") as f:
            json.dump([{"id": d["id"], "parent_id": d["parent_id"], "text": d["text"]} for d in faiss_data], f)
            
        # Save parents info for FAISS fallback
        with open(os.path.join(faiss_dir, "parents.json"), "w", encoding="utf-8") as f:
            json.dump(parent_dict, f)
            
    print("✅ Ingestion complete! Data stored in Neon DB (pgvector) and FAISS (fallback).")

if __name__ == "__main__":
    init_db()
    # Provide a sample markdown file path or change this
    sample_md = os.path.join(os.path.dirname(__file__), "..", "sample.md")
    if not os.path.exists(sample_md):
        with open(sample_md, "w", encoding="utf-8") as f:
            f.write("# Sample Medical Document\n\nThis is a sample document for testing hierarchical chunking and pgvector.\n\n## Section 1\n\nCommunity Medicine is crucial for public health.")
    ingest_markdown(sample_md)
