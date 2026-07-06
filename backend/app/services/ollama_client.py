import asyncio
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class OllamaError(Exception):
    pass


class OllamaClient:
    REQUIRED_MODELS: tuple[str, ...] = ()

    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None
        self.REQUIRED_MODELS = (
            settings.llm_model,
            settings.llava_model,
            settings.embedding_model,
        )

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(300.0, connect=10.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def ping(self) -> bool:
        try:
            client = await self._get_client()
            response = await client.get("/")
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def wait_until_ready(self, timeout: int | None = None) -> None:
        timeout = timeout or settings.ollama_startup_timeout
        elapsed = 0
        while elapsed < timeout:
            if await self.ping():
                logger.info("Ollama is ready at %s", self.base_url)
                return
            await asyncio.sleep(2)
            elapsed += 2
        raise OllamaError(f"Ollama not reachable at {self.base_url} after {timeout}s")

    async def list_models(self) -> list[dict]:
        client = await self._get_client()
        response = await client.get("/api/tags")
        response.raise_for_status()
        return response.json().get("models", [])

    async def model_names(self) -> set[str]:
        models = await self.list_models()
        names: set[str] = set()
        for model in models:
            name = model.get("name", "")
            names.add(name)
            if ":" in name:
                names.add(name.split(":")[0])
        return names

    async def pull_model(self, name: str) -> None:
        logger.info("Pulling Ollama model: %s", name)
        client = await self._get_client()
        async with client.stream(
            "POST",
            "/api/pull",
            json={"name": name, "stream": True},
        ) as response:
            response.raise_for_status()
            async for _line in response.aiter_lines():
                pass
        logger.info("Model ready: %s", name)

    async def ensure_models(self) -> dict[str, str]:
        if not settings.ollama_auto_pull:
            return {"status": "skipped"}

        installed = await self.model_names()
        results: dict[str, str] = {}

        for model in self.REQUIRED_MODELS:
            base = model.split(":")[0]
            if model in installed or base in installed:
                results[model] = "ready"
                continue
            try:
                await self.pull_model(model)
                results[model] = "pulled"
            except httpx.HTTPError as exc:
                logger.error("Failed to pull %s: %s", model, exc)
                results[model] = f"error: {exc}"

        return results

    async def embed(self, text: str) -> list[float]:
        client = await self._get_client()
        try:
            response = await client.post(
                "/api/embed",
                json={"model": settings.embedding_model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings")
            if embeddings:
                return embeddings[0]
        except httpx.HTTPStatusError:
            pass

        response = await client.post(
            "/api/embeddings",
            json={"model": settings.embedding_model, "prompt": text},
        )
        response.raise_for_status()
        return response.json()["embedding"]

    async def chat(
        self,
        prompt: str,
        system: str | None = None,
        model: str | None = None,
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        client = await self._get_client()
        response = await client.post(
            "/api/chat",
            json={
                "model": model or settings.llm_model,
                "messages": messages,
                "stream": False,
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"]

    async def describe_image(self, image_base64: str, prompt: str) -> str:
        client = await self._get_client()
        response = await client.post(
            "/api/chat",
            json={
                "model": settings.llava_model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [image_base64],
                    }
                ],
                "stream": False,
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"]

    async def status(self) -> dict:
        reachable = await self.ping()
        if not reachable:
            return {
                "reachable": False,
                "base_url": self.base_url,
                "models": [],
                "required": {
                    "llm": settings.llm_model,
                    "vision": settings.llava_model,
                    "embedding": settings.embedding_model,
                },
                "required_status": {m: False for m in self.REQUIRED_MODELS},
                "ready": False,
            }

        installed = await self.model_names()
        required_status = {
            model: model in installed or model.split(":")[0] in installed
            for model in self.REQUIRED_MODELS
        }

        return {
            "reachable": True,
            "base_url": self.base_url,
            "models": sorted(installed),
            "required": {
                "llm": settings.llm_model,
                "vision": settings.llava_model,
                "embedding": settings.embedding_model,
            },
            "required_status": required_status,
            "ready": all(required_status.values()),
        }


ollama = OllamaClient()
