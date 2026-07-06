import base64
import io
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from pyzbar.pyzbar import decode
from ultralytics import YOLO

from app.config import settings
from app.services.ollama_client import ollama

_yolo_model: YOLO | None = None

PART_NUMBER_PATTERN = re.compile(
    r"\b(?:P/N|PN|PART\s*#?|PART\s*NO\.?)\s*:?\s*([A-Z0-9][A-Z0-9\-/]{3,})\b",
    re.IGNORECASE,
)
STANDALONE_PART_PATTERN = re.compile(r"\b([A-Z]{2,4}-\d{3,6}(?:-[A-Z0-9]+)?)\b")


def get_yolo_model() -> YOLO:
    global _yolo_model
    if _yolo_model is None:
        _yolo_model = YOLO("yolov8n.pt")
    return _yolo_model


def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def decode_barcodes(image_bytes: bytes) -> list[str]:
    image = Image.open(io.BytesIO(image_bytes))
    results = decode(image)
    return [item.data.decode("utf-8") for item in results]


def detect_objects(image_bytes: bytes) -> list[dict]:
    model = get_yolo_model()
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        return []

    results = model(frame, verbose=False)
    detections: list[dict] = []
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            detections.append(
                {
                    "label": result.names[cls_id],
                    "confidence": round(float(box.conf[0]), 3),
                }
            )
    return detections


async def analyze_image(image_bytes: bytes, filename: str) -> dict:
    barcodes = decode_barcodes(image_bytes)
    detections = detect_objects(image_bytes)
    image_b64 = image_to_base64(image_bytes)

    llava_prompt = (
        "You are an aviation maintenance assistant. Describe this image in detail. "
        "Identify any visible part numbers, serial numbers, barcodes, labels, "
        "component types, and damage or wear if present."
    )
    description = await ollama.describe_image(image_b64, llava_prompt)

    part_numbers = extract_part_numbers(description)
    if barcodes:
        part_numbers.extend(barcodes)

    return {
        "filename": filename,
        "barcodes": barcodes,
        "part_numbers": sorted(set(part_numbers)),
        "yolo_detections": detections,
        "llava_description": description,
    }


def extract_part_numbers(text: str) -> list[str]:
    found: set[str] = set()
    for match in PART_NUMBER_PATTERN.finditer(text):
        found.add(match.group(1).upper())
    for match in STANDALONE_PART_PATTERN.finditer(text):
        found.add(match.group(1).upper())
    return list(found)
