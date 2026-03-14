#!/bin/bash
set -e

echo "Setting up Financial Dashboard..."

# Create venv
python3 -m venv ./venv

# Install backend deps
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r backend/requirements.txt

echo "Backend dependencies installed."

# Install frontend deps
cd frontend
npm install
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the backend (port 3000):"
echo "  ./venv/bin/python -m uvicorn backend.main:app --reload --port 3000"
echo ""
echo "To start the frontend (port 3001, proxies API to backend):"
echo "  cd frontend && set PORT=3001 && npm start   (Windows CMD)"
echo "  cd frontend && PORT=3001 npm start           (Mac/Linux)"
