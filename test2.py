import asyncio
from dotenv import load_dotenv
load_dotenv()
from surrealdb import AsyncSurreal as Surreal
from api.vector_store import VectorStoreManager

async def test():
    vs = VectorStoreManager()
    db = Surreal(vs.url)
    await db.connect()
    
    print("Testing signin logic directly...")
    try:
        await db.signin({"user": vs.user, "pass": vs.password})
        print("Success with user/pass")
    except Exception as e:
        print(f"Failed user/pass: {e}")
        try:
            await db.signin({"username": vs.user, "password": vs.password})
            print("Success with username/password")
        except Exception as e2:
            print(f"Failed username/password: {e2}")

if __name__ == "__main__":
    asyncio.run(test())
