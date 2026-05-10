
import os
import sys
from api.vector_store import VectorStoreManager

print("Initializing VectorStoreManager...")
vsm = VectorStoreManager()
print("VectorStoreManager initialized.")
print(f"Chunks loaded: {len(vsm.chunks)}")
