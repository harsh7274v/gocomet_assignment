#!/bin/bash
set -e
echo "Starting FastAPI Backend for British Auction RFQ System..."
cd "$(dirname "$0")/backend"
source venv/bin/activate
export PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

