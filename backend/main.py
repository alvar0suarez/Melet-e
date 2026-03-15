import sys
from pathlib import Path

# Allow running as `cd backend && python main.py`
# by ensuring the project root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.database import init_db
from backend.routers.notes import router as notes_router

app = FastAPI(title="Melete", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:7749"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=7749, reload=True)
