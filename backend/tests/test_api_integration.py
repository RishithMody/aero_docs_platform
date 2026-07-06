import os

import httpx
import pytest

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8081")


@pytest.mark.integration
def test_health(require_api):
    response = httpx.get(f"{API_BASE_URL}/health", timeout=10.0)
    assert response.status_code == 200
    data = response.json()
    assert "ollama" in data
    assert data["ollama"]["reachable"] is True


@pytest.mark.integration
def test_ollama_status(require_api):
    response = httpx.get(f"{API_BASE_URL}/ollama/status", timeout=10.0)
    assert response.status_code == 200
    data = response.json()
    assert data["reachable"] is True
    assert "llm" in data["required"]


@pytest.mark.integration
def test_upload_and_semantic_search(require_api, sample_manual_path):
    with open(sample_manual_path, "rb") as handle:
        upload = httpx.post(
            f"{API_BASE_URL}/documents/upload",
            files={"file": ("hydraulic-pump-manual.txt", handle, "text/plain")},
            data={"title": "E2E Test Manual", "comments": "pytest upload"},
            timeout=120.0,
        )
    assert upload.status_code == 200
    body = upload.json()
    assert body["title"] == "E2E Test Manual"
    assert "HYD-4521" in body["part_numbers"] or "PN-HYD-4521-A" in body["part_numbers"]

    search = httpx.get(
        f"{API_BASE_URL}/search/",
        params={"q": "hydraulic pump seal"},
        timeout=60.0,
    )
    assert search.status_code == 200
    results = search.json()["results"]
    assert len(results) > 0


@pytest.mark.integration
def test_part_number_search(require_api, sample_manual_path):
    with open(sample_manual_path, "rb") as handle:
        httpx.post(
            f"{API_BASE_URL}/documents/upload",
            files={"file": ("hydraulic-pump-manual.txt", handle, "text/plain")},
            data={"title": "Part Number Test"},
            timeout=120.0,
        )

    response = httpx.get(
        f"{API_BASE_URL}/search/part-number",
        params={"part_number": "HYD-4521"},
        timeout=30.0,
    )
    assert response.status_code == 200
    assert len(response.json()["results"]) > 0


@pytest.mark.integration
def test_barcode_search(require_api, sample_manual_path):
    with open(sample_manual_path, "rb") as handle:
        httpx.post(
            f"{API_BASE_URL}/documents/upload",
            files={"file": ("hydraulic-pump-manual.txt", handle, "text/plain")},
            data={"title": "Barcode Test"},
            timeout=120.0,
        )

    response = httpx.get(
        f"{API_BASE_URL}/search/barcode",
        params={"barcode": "1234567890128"},
        timeout=30.0,
    )
    assert response.status_code == 200
    assert len(response.json()["results"]) > 0
