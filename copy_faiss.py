import os
import shutil

src_faiss = r"D:\ACADOC2\faiss_index"
dest_faiss = r"D:\ACADOC2\acadoc-backend\faiss_index"

print(f"Copying {src_faiss} to {dest_faiss}...")

if os.path.exists(dest_faiss):
    shutil.rmtree(dest_faiss)

shutil.copytree(src_faiss, dest_faiss)

print("✅ FAISS index successfully copied to the Hugging Face Space repository!")
