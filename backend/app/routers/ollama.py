import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.services.ollama_client import OllamaError, ollama

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ollama", tags=["ollama"])


@router.get("/status")
async def ollama_status():
    return await ollama.status()


@router.get("/models")
async def list_models():
    if not await ollama.ping():
        raise HTTPException(status_code=503, detail="Ollama is not reachable")
    return {"models": await ollama.list_models()}


@router.post("/pull/{model_name}")
async def pull_model(model_name: str):
    if not await ollama.ping():
        raise HTTPException(status_code=503, detail="Ollama is not reachable")
    try:
        await ollama.pull_model(model_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"model": model_name, "status": "ready"}


@router.post("/ensure")
async def ensure_models():
    if not await ollama.ping():
        raise HTTPException(status_code=503, detail="Ollama is not reachable")
    results = await ollama.ensure_models()
    status = await ollama.status()
    return {"pull_results": results, "status": status}


@asynccontextmanager
async def ollama_lifespan():
    logger.info("Connecting to Ollama at %s", settings.ollama_base_url)
    try:
        await ollama.wait_until_ready()
        if settings.ollama_auto_pull:
            results = await ollama.ensure_models()
            logger.info("Ollama model bootstrap: %s", results)
    except OllamaError as exc:
        logger.warning("Ollama startup: %s — API will start but LLM features may fail", exc)
    yield
    await ollama.close()
