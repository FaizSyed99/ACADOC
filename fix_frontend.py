import os
import shutil

root_dir = r"D:\ACADOC2"
frontend_dir = os.path.join(root_dir, "frontend")

items_to_move = [
    "app", "components", "next-env.d.ts", "next.config.ts", 
    "package.json", "package-lock.json", "postcss.config.js", 
    "tailwind.config.ts", "tsconfig.json", "vercel.json", 
    "Dockerfile.frontend"
]

for item in items_to_move:
    src_path = os.path.join(root_dir, item)
    dest_path = os.path.join(frontend_dir, item)
    
    if os.path.exists(src_path):
        if os.path.isdir(src_path):
            # If destination folder exists, merge them
            if os.path.exists(dest_path):
                shutil.rmtree(dest_path)
            shutil.move(src_path, dest_path)
            print(f"Moved directory: {item}")
        else:
            # If destination file exists, overwrite it
            if os.path.exists(dest_path):
                os.remove(dest_path)
            shutil.move(src_path, dest_path)
            print(f"Moved file: {item}")
    else:
        print(f"Skipped {item} (Already moved or doesn't exist)")

print("\n✅ Frontend successfully assembled!")
