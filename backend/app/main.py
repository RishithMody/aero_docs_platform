import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import documents, ollama as ollama_router, search
from app.services.ollama_client import ollama

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with ollama_router.ollama_lifespan():
        yield


app = FastAPI(
    title="AeroDocs API",
    description="Secure Honeywell knowledge base with RAG, YOLOv8, LLaVA, and Ollama",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app.include_router(documents.router)
app.include_router(search.router)
app.include_router(ollama_router.router)


@app.get("/health")
async def health():
    ollama_status = await ollama.status()
    return {
        "status": "ok" if ollama_status["ready"] else "degraded",
        "ollama": ollama_status,
        "chroma": {"host": settings.chroma_host, "port": settings.chroma_port},
    }
