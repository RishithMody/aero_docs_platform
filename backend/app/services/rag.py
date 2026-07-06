import uuid
from pathlib import Path

import chromadb
from pypdf import PdfReader

from app.config import settings
from app.services.ollama_client import ollama
from app.services.vision import extract_part_numbers


class RAGService:
    def __init__(self) -> None:
        self.client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
        self.collection = self.client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )

    def _chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
        words = text.split()
        chunks: list[str] = []
        start = 0
        while start < len(words):
            end = start + chunk_size
            chunks.append(" ".join(words[start:end]))
            start = end - overlap
        return [c for c in chunks if c.strip()]

    async def ingest_text(
        self,
        text: str,
        metadata: dict,
        doc_id: str | None = None,
    ) -> str:
        document_id = doc_id or str(uuid.uuid4())
        part_numbers = extract_part_numbers(text)
        chunks = self._chunk_text(text)

        ids: list[str] = []
        embeddings: list[list[float]] = []
        documents: list[str] = []
        metadatas: list[dict] = []

        for index, chunk in enumerate(chunks):
            chunk_id = f"{document_id}-{index}"
            embedding = await ollama.embed(chunk)
            chunk_meta = {
                **metadata,
                "document_id": document_id,
                "chunk_index": index,
                "part_numbers": ",".join(part_numbers),
                "barcodes": metadata.get("barcodes", ""),
            }
            ids.append(chunk_id)
            embeddings.append(embedding)
            documents.append(chunk)
            metadatas.append(chunk_meta)

        if ids:
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
            )
        return document_id

    async def ingest_pdf(self, file_path: Path, metadata: dict) -> str:
        reader = PdfReader(str(file_path))
        text_parts = [page.extract_text() or "" for page in reader.pages]
        full_text = "\n".join(text_parts)
        part_numbers = extract_part_numbers(full_text)
        meta = {**metadata, "part_numbers": ",".join(part_numbers), "source_type": "pdf"}
        return await self.ingest_text(full_text, meta, doc_id=file_path.stem)

    async def search(
        self,
        query: str,
        limit: int = 5,
        part_number: str | None = None,
        barcode: str | None = None,
    ) -> list[dict]:
        if part_number or barcode:
            results = self.collection.get(include=["documents", "metadatas"])
            hits: list[dict] = []
            needle = (part_number or barcode or "").upper()
            for doc, meta in zip(results["documents"], results["metadatas"]):
                parts = (meta.get("part_numbers") or "").upper()
                codes = (meta.get("barcodes") or "").upper()
                haystack = f"{parts},{codes},{doc.upper()}"
                if needle and needle in haystack:
                    hits.append({"text": doc, "metadata": meta, "score": 1.0})
            return hits[:limit]

        query_embedding = await ollama.embed(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"],
        )

        hits: list[dict] = []
        for doc, meta, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append(
                {
                    "text": doc,
                    "metadata": meta,
                    "score": round(1 - distance, 4),
                }
            )
        return hits

    async def ask(self, question: str, context_limit: int = 5) -> dict:
        hits = await self.search(question, limit=context_limit)
        context = "\n\n---\n\n".join(hit["text"] for hit in hits)
        system = (
            "You are AeroDocs, a secure Honeywell aviation maintenance knowledge assistant. "
            "Answer using only the provided context. Cite part numbers when relevant."
        )
        prompt = f"Context:\n{context}\n\nQuestion: {question}\n\nAnswer:"
        answer = await ollama.chat(prompt, system=system)
        return {"answer": answer, "sources": hits}


rag = RAGService()
