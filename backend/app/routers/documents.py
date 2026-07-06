import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.services.rag import rag
from app.services.vision import analyze_image, extract_part_numbers

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = "",
    comments: str = "",
):
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    doc_id = str(uuid.uuid4())
    suffix = Path(file.filename or "document").suffix.lower()
    saved_path = upload_dir / f"{doc_id}{suffix}"

    async with aiofiles.open(saved_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    metadata = {
        "title": title or file.filename or "Untitled",
        "comments": comments,
        "filename": file.filename or saved_path.name,
        "barcodes": "",
        "part_numbers": "",
    }

    if suffix == ".pdf":
        document_id = await rag.ingest_pdf(saved_path, metadata)
    elif suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        analysis = await analyze_image(content, file.filename or saved_path.name)
        metadata["barcodes"] = ",".join(analysis["barcodes"])
        metadata["part_numbers"] = ",".join(analysis["part_numbers"])
        text = (
            f"Title: {metadata['title']}\n"
            f"Comments: {comments}\n"
            f"Part Numbers: {metadata['part_numbers']}\n"
            f"Barcodes: {metadata['barcodes']}\n"
            f"YOLO Detections: {analysis['yolo_detections']}\n"
            f"LLaVA Description: {analysis['llava_description']}"
        )
        document_id = await rag.ingest_text(text, metadata, doc_id=doc_id)
    else:
        text = content.decode("utf-8", errors="ignore")
        part_numbers = extract_part_numbers(text)
        metadata["part_numbers"] = ",".join(part_numbers)
        document_id = await rag.ingest_text(text, metadata, doc_id=doc_id)

    return {
        "document_id": document_id,
        "filename": metadata["filename"],
        "title": metadata["title"],
        "part_numbers": metadata["part_numbers"].split(",") if metadata["part_numbers"] else [],
        "barcodes": metadata["barcodes"].split(",") if metadata["barcodes"] else [],
    }


@router.get("/{document_id}")
async def get_document(document_id: str):
    upload_dir = Path(settings.upload_dir)
    matches = list(upload_dir.glob(f"{document_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"document_id": document_id, "path": str(matches[0])}
