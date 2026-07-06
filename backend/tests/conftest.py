import os

import httpx
import pytest

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8081")
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "fixtures")


@pytest.fixture
def api_available():
    try:
        response = httpx.get(f"{API_BASE_URL}/health", timeout=5.0)
        return response.status_code == 200
    except httpx.HTTPError:
        return False


@pytest.fixture
def require_api(api_available):
    if not api_available:
        pytest.skip("API not available — start docker compose first")


@pytest.fixture
def sample_manual_path():
    path = os.path.join(FIXTURES_DIR, "hydraulic-pump-manual.txt")
    assert os.path.exists(path), f"Missing fixture: {path}"
    return path
