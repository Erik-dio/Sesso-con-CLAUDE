# Project Setup

## Environment
- Python 3.11+
- Always use the venv at ./venv — never install packages globally
- Run backend with: ./venv/bin/python -m uvicorn main:app --reload --port 8000
- Frontend runs on port 3000

## Stack
- Backend: FastAPI + yfinance + numpy + pandas + scipy
- Frontend: React + Recharts

## Rules
- Provide a setup.sh to create venv, install requirements, and start the app
- Keep backend and frontend in separate folders: /backend and /frontend