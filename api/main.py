"""
api/main.py

Run with:
    uvicorn api.main:app --reload --port 8000

Then e.g.:
    curl -X POST http://localhost:8000/workflows/run \
        -H "Content-Type: application/json" \
        -d '{"max_results": 5}'
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router

app = FastAPI(
    title="Inbox Agent API",
    description="API for the Email Automation multi-agent workflow.",
    version="0.1.0",
)

# Adjust allow_origins to your actual frontend URL(s) before deploying —
# "*" is fine for local dev only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
