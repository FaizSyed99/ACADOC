import asyncio
from api.vector_store import VectorStoreManager

async def test():
    vs = VectorStoreManager()
    print("Testing query...")
    try:
        res = await vs.query("Mechanism of action of Aspirin?")
        print(res)
    except Exception as e:
        print("Error!")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
