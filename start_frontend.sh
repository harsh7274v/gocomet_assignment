#!/bin/bash
set -e
echo "Starting React Frontend on http://localhost:5173..."
cd "$(dirname "$0")/frontend"
npm run dev

