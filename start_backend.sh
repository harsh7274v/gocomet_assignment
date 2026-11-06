#!/bin/bash
set -e
PORT="${PORT:-8001}"
echo "Starting FastAPI Backend on port $PORT..."
cd "$(dirname "$0")/backend"
source venv/bin/activate
export PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
