# Automated Tests

## Structure

```
tests/
├── fixtures/           # Shared test documents
├── e2e/                # Playwright browser + API tests
backend/tests/          # pytest unit + integration tests
```

## Prerequisites

Full E2E tests require the Docker stack running with Ollama models ready:

```bash
docker compose up -d
# Wait for ollama-init to complete
curl http://localhost:8081/health
```

## Backend tests (pytest)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Unit tests only (no running stack needed)
pytest -m "not integration"

# Full integration (requires API + Ollama + Chroma)
pytest -m integration
```

Environment variables for integration tests:

| Variable | Default |
|---|---|
| `API_BASE_URL` | `http://localhost:8081` |

## E2E tests (Playwright)

From repo root:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Environment variables:

| Variable | Default |
|---|---|
| `E2E_WEB_URL` | `http://localhost:3001` |
| `E2E_API_URL` | `http://localhost:8081` |

Run with UI:

```bash
npm run test:e2e:ui
```

## CI note

Integration and E2E tests are skipped automatically when services are unavailable.
