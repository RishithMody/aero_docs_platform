from fastapi import APIRouter, File, UploadFile

from app.services.rag import rag
from app.services.vision import analyze_image

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/")
async def semantic_search(q: str, limit: int = 5):
    results = await rag.search(q, limit=limit)
    return {"query": q, "results": results}


@router.get("/part-number")
async def search_by_part_number(part_number: str, limit: int = 10):
    results = await rag.search("", limit=limit, part_number=part_number)
    return {"part_number": part_number, "results": results}


@router.get("/barcode")
async def search_by_barcode(barcode: str, limit: int = 10):
    results = await rag.search("", limit=limit, barcode=barcode)
    return {"barcode": barcode, "results": results}


@router.post("/image")
async def search_by_image(file: UploadFile = File(...), limit: int = 5):
    content = await file.read()
    analysis = await analyze_image(content, file.filename or "upload.jpg")

    search_terms = " ".join(
        filter(
            None,
            [
                analysis["llava_description"],
                " ".join(analysis["part_numbers"]),
                " ".join(analysis["barcodes"]),
                " ".join(d["label"] for d in analysis["yolo_detections"]),
            ],
        )
    )
    results = await rag.search(search_terms, limit=limit)

    return {
        "analysis": analysis,
        "results": results,
    }


@router.get("/ask")
async def ask_question(q: str):
    response = await rag.ask(q)
    return response
