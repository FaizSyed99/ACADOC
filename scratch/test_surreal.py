import asyncio
import os
from dotenv import load_dotenv
from surrealdb import AsyncSurreal as Surreal

async def test_connection():
    load_dotenv()
    url = os.getenv("SURREALDB_URL")
    ns = os.getenv("SURREALDB_NAMESPACE")
    db_name = os.getenv("SURREALDB_DATABASE")
    user = os.getenv("SURREALDB_USER", "root")
    password = os.getenv("SURREALDB_PASS", "root")
    token = os.getenv("SURREALDB_TOKEN")
    
    print(f"Connecting to: {url}")
    print(f"Namespace: {ns}, DB: {db_name}")
    print(f"Token present: {True if token else False}")

    try:
        async with Surreal(url) as db:
            # Try token first (Cloud standard)
            if token:
                try:
                    await db.authenticate(token)
                    print("SUCCESS: Successfully authenticated with TOKEN")
                except Exception as e:
                    print(f"ERROR: Token authentication failed: {e}")
            
            # Try signin as fallback
            try:
                await db.signin({"user": user, "pass": password})
                print("SUCCESS: Successfully signed in with user/pass")
            except Exception as e:
                print(f"ERROR: User/Pass signin failed: {e}")
                
            await db.use(ns, db_name)
            
            # Simple query
            res = await db.query("INFO FOR DB")
            print("SUCCESS: DB Info retrieved successfully")
            print(f"Result: {res}")
            
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
