import asyncio
import os
from langchain_core.documents import Document
from api.vector_store import VectorStoreManager

SAMPLE_MEDICAL_DATA = [
    {
        "content": "Aspirin (acetylsalicylic acid) acts by irreversibly inhibiting cyclooxygenase (COX-1 and COX-2) enzymes. This inhibition prevents the conversion of arachidonic acid to prostaglandins and thromboxanes.",
        "metadata": {"source": "Katzung Pharmacology", "page": 562, "chapter": "Analgesics"}
    },
    {
        "content": "Heart failure (HF) is a clinical syndrome characterized by symptoms such as dyspnea, orthopnea, and fatigue, accompanied by signs like peripheral edema.",
        "metadata": {"source": "Harrison's Medicine", "page": 1940, "chapter": "Cardiology"}
    }
]

async def seed_faiss():
    print("Initializing FAISS Vector Store...")
    vs = VectorStoreManager()
    
    docs = []
    for item in SAMPLE_MEDICAL_DATA:
        doc = Document(
            page_content=item["content"],
            metadata=item["metadata"]
        )
        docs.append(doc)
        
    print(f"Seeding {len(docs)} medical facts into FAISS...")
    await vs.add_documents(docs)
    print("✅ Success! Your local FAISS knowledge base is primed.")

if __name__ == "__main__":
    asyncio.run(seed_faiss())
