# AeroDocs Platform — Manual Testing Guide

Use this checklist to verify the full stack before releases or after infrastructure changes.

## Prerequisites

| Requirement | How to verify |
|---|---|
| Docker stack running | `docker compose ps` — all services **Up** |
| Ollama models ready | Ollama panel shows llama3.2, llava, nomic-embed-text as **Ready** |
| Frontend reachable | http://localhost:3001 |
| API reachable | http://localhost:8081/health returns `"status": "ok"` |
| Test fixture available | `tests/fixtures/hydraulic-pump-manual.txt` |

Start the stack if needed:

```bash
docker compose up -d
docker compose logs -f ollama-init   # wait for "All Ollama models ready"
```

---

## Test matrix

| ID | Area | Test | Priority |
|---|---|---|---|
| MT-01 | Health | API health check | P0 |
| MT-02 | Ollama | Model status panel | P0 |
| MT-03 | Upload | Text document ingest | P0 |
| MT-04 | Search | Semantic search | P0 |
| MT-05 | Search | Part number search | P0 |
| MT-06 | Search | Barcode search | P1 |
| MT-07 | Search | Ask LLaMA 3.2 (RAG Q&A) | P0 |
| MT-08 | Search | Image recognition | P1 |
| MT-09 | UI | Tab navigation | P1 |
| MT-10 | UI | Error handling (API down) | P2 |

---

## MT-01 — API health check

**Steps**

1. Open a terminal.
2. Run:

```bash
curl -s http://localhost:8081/health | jq
```

**Expected**

- HTTP 200
- `"status": "ok"` (or `"degraded"` if a model is missing)
- `"ollama"."ready": true`
- `"ollama"."required"` lists llama3.2, llava, nomic-embed-text

**Pass / Fail:** ___________

---

## MT-02 — Ollama status panel

**Steps**

1. Open http://localhost:3001
2. Locate the **Ollama** panel at the top of the page.
3. Confirm green status dot and all three models show **Ready**.

**Optional:** Click **Pull / refresh models** — panel should refresh without error.

**Expected**

- Panel shows `http://ollama:11434` or localhost Ollama URL
- llm, vision, embedding models all **Ready**

**Pass / Fail:** ___________

---

## MT-03 — Upload text document

**Steps**

1. Click **Upload Document** tab.
2. Set **Document title:** `Hydraulic Pump Manual`
3. Set **Technician comments:** `Routine inspection Q3`
4. Upload `tests/fixtures/hydraulic-pump-manual.txt`
5. Click **Upload**

**Expected**

- Green status message: `Uploaded hydraulic-pump-manual.txt`
- Part numbers extracted (includes `PN-HYD-4521-A` or `HYD-4521`)

**API equivalent:**

```bash
curl -X POST http://localhost:8081/documents/upload \
  -F "file=@tests/fixtures/hydraulic-pump-manual.txt" \
  -F "title=Hydraulic Pump Manual" \
  -F "comments=Routine inspection Q3"
```

**Pass / Fail:** ___________

---

## MT-04 — Semantic search

**Steps**

1. Click **Semantic Search** tab.
2. Enter: `hydraulic pump seal replacement`
3. Click **Search**

**Expected**

- One or more result cards appear
- Results mention hydraulic pump, seal, or related content
- Each card shows a score

**API equivalent:**

```bash
curl "http://localhost:8081/search/?q=hydraulic+pump+seal+replacement"
```

**Pass / Fail:** ___________

---

## MT-05 — Part number search

**Steps**

1. Click **Part Number** tab.
2. Enter: `HYD-4521`
3. Click **Search**

**Expected**

- Results include the uploaded manual
- Part number tag visible on result card

**API equivalent:**

```bash
curl "http://localhost:8081/search/part-number?part_number=HYD-4521"
```

**Pass / Fail:** ___________

---

## MT-06 — Barcode search

**Steps**

1. Click **Barcode** tab.
2. Enter: `1234567890128`
3. Click **Search**

**Expected**

- Results include document containing that barcode reference

**API equivalent:**

```bash
curl "http://localhost:8081/search/barcode?barcode=1234567890128"
```

**Pass / Fail:** ___________

---

## MT-07 — Ask LLaMA 3.2 (RAG Q&A)

**Steps**

1. Click **Ask LLaMA 3.2** tab.
2. Enter: `What torque should mounting bolts be tightened to?`
3. Click **Search**

**Expected**

- **LLaMA 3.2 Answer** section appears
- Answer references **45 Nm** (from test fixture)
- Source result cards shown below

**Note:** First query may take 30–60s on CPU.

**API equivalent:**

```bash
curl "http://localhost:8081/search/ask?q=What+torque+should+mounting+bolts+be+tightened+to"
```

**Pass / Fail:** ___________

---

## MT-08 — Image recognition (optional)

**Steps**

1. Click **Image Recognition** tab.
2. Upload a photo of aviation equipment, a label, or part.
3. Click **Search**

**Expected**

- **LLaVA Analysis** section with image description
- Search results returned (may be empty if no matching docs)

**Note:** Requires LLaVA model; slow on CPU (1–3 min).

**Pass / Fail:** ___________

---

## MT-09 — Tab navigation

**Steps**

1. Click each tab in order: Semantic → Part Number → Barcode → Image → Ask → Upload
2. Confirm placeholder text changes in the input area
3. Confirm **Search** button label changes to **Upload** on Upload tab

**Expected**

- No console errors (F12 → Console)
- Correct input type per tab (textarea vs file picker)

**Pass / Fail:** ___________

---

## MT-10 — Error handling

**Steps**

1. Stop the API: `docker compose stop api`
2. On the frontend, run any search
3. Restart API: `docker compose start api`

**Expected**

- Error message shown (not a blank screen)
- App recovers after API restarts

**Pass / Fail:** ___________

---

## Regression smoke test (5 minutes)

Run after every deploy:

```bash
# 1. Health
curl -sf http://localhost:8081/health | jq -e '.ollama.ready == true'

# 2. Upload fixture
curl -sf -X POST http://localhost:8081/documents/upload \
  -F "file=@tests/fixtures/hydraulic-pump-manual.txt" \
  -F "title=Smoke Test"

# 3. Search
curl -sf "http://localhost:8081/search/?q=hydraulic+pump" | jq -e '.results | length > 0'

# 4. Frontend loads
curl -sf http://localhost:3001 | grep -q "AeroDocs Knowledge Base"
```

All four commands must exit 0.

---

## Automated tests

See [tests/README.md](./tests/README.md) for running Playwright E2E and pytest suites.

```bash
# Backend unit + integration tests
cd backend && pip install -r requirements-dev.txt && pytest

# Frontend + API E2E (stack must be running)
npm run test:e2e
```

---

## Sign-off template

| Field | Value |
|---|---|
| Tester | |
| Date | |
| Environment | Docker local / VPS / other |
| Git commit | |
| MT-01 – MT-07 | Pass / Fail |
| MT-08 – MT-10 | Pass / Fail / N/A |
| Notes | |
