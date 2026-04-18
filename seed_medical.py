from surrealdb import Surreal
import os
from dotenv import load_dotenv

SAMPLE_MEDICAL_DATA = [
    {
        "content": "Aspirin (acetylsalicylic acid) acts by irreversibly inhibiting cyclooxygenase (COX-1 and COX-2) enzymes. This inhibition prevents the conversion of arachidonic acid to prostaglandins and thromboxanes.",
        "metadata": {"source": "Katzung Pharmacology", "page": 562}
    },
    {
        "content": "Heart failure (HF) is a clinical syndrome characterized by symptoms such as dyspnea, orthopnea, and fatigue, accompanied by signs like peripheral edema.",
        "metadata": {"source": "Harrison's Medicine", "page": 1940}
    }
]

def seed():
    load_dotenv()
    url = os.getenv("SURREALDB_URL") or "ws://localhost:8000/rpc"
    ns = os.getenv("SURREALDB_NS") or "acadoc"
    db_name = os.getenv("SURREALDB_DB") or "prod"
    token = os.getenv("SURREALDB_TOKEN") # Targeted for Cloud
    user = os.getenv("SURREALDB_USER") or "root"
    password = os.getenv("SURREALDB_PASS") or "root"
    table = os.getenv("SURREALDB_TABLE") or "textbook_chunks"

    print(f"--- Connection Details ---")
    print(f"URL: {url}")
    print(f"Auth: {'Token Provided' if token else 'User/Pass Mode'}")
    print(f"Target: {ns}/{db_name} -> {table}")
    print(f"--------------------------")
    
    try:
        with Surreal(url) as db:
            if token:
                # Proper way for SurrealDB Cloud
                db.authenticate(token)
            else:
                # Default for local instances
                db.signin({"user": user, "pass": password})
            
            db.use(ns, db_name)
            
            print(f"Cleaning existing data in {table}...")
            db.query(f"DELETE {table}")
            
            print(f"Seeding {len(SAMPLE_MEDICAL_DATA)} medical facts...")
            for item in SAMPLE_MEDICAL_DATA:
                db.create(table, {
                    "content": item["content"],
                    "metadata": item["metadata"],
                    "embedding": [0.0] * 384 
                })
                
            print("✅ Success! Your Cloud knowledge base is primed.")
    except Exception as e:
        print(f"❌ Seeding failed: {e}")

if __name__ == "__main__":
    seed()
