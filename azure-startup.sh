#!/bin/bash
# Move to the root directory so the 'api' and 'src' folders are accessible
cd /home/site/wwwroot

# Start the production server with Gunicorn and Uvicorn workers
gunicorn --bind=0.0.0.0:8000 --workers=4 --worker-class=uvicorn.workers.UvicornWorker --timeout=600 api.index:app
