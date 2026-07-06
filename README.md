# AeroDocs Platform

Secure Honeywell aviation knowledge base with a RAG vector search pipeline, document upload/retrieval, and multimodal search (text, part numbers, barcodes, and images).

## Stack

| Layer | Technology |
|---|---|
| Frontend | **Next.js**, **TypeScript**, **Node.js**, Tailwind CSS |
| Backend | **Python**, FastAPI, Uvicorn |
| LLM | **Ollama LLaMA 3.2** |
| Vision | **LLaVA** (Ollama), **YOLOv8** (Ultralytics) |
| Vector DB | ChromaDB |
| Barcode | pyzbar |
| Deployment | Docker Compose (isolated VPC-style network) |

## Features

- **RAG pipeline** — ingest PDFs and text, embed with Ollama, search with ChromaDB
- **Part number search** — regex extraction + metadata filtering
- **Barcode search** — decode barcodes from uploaded images
- **Image recognition** — YOLOv8 object detection + LLaVA visual description
- **Q&A** — LLaMA 3.2 answers maintenance questions with cited sources
- **Document upload** — stream repair manuals, photos, and technician notes

## Project Structure

```
aerodocs-platform/
├── apps/web/          # Next.js + TypeScript frontend
├── backend/           # Python FastAPI + ML services
├── docker/            # Model bootstrap scripts
└── docker-compose.yml # Chroma, Ollama, API, Web
```

## Ollama Integration

All LLM, embedding, and vision workloads run through **Ollama**:

| Model | Role | Used for |
|---|---|---|
| `llama3.2` | LLM | RAG Q&A, chat |
| `llava` | Vision | Image description |
| `nomic-embed-text` | Embeddings | Vector search |

### Local dev with Ollama

```bash
# Start Ollama (Docker)
npm run dev:ollama

# Or install Ollama natively: https://ollama.com
ollama pull llama3.2
ollama pull llava
ollama pull nomic-embed-text
```

The API **waits for Ollama on startup** and auto-pulls missing models when `OLLAMA_AUTO_PULL=true`.

### Ollama API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/ollama/status` | Connection + model readiness |
| `GET` | `/ollama/models` | List installed models |
| `POST` | `/ollama/pull/{model}` | Pull a specific model |
| `POST` | `/ollama/ensure` | Pull all required models |

The frontend shows a live **Ollama status panel** with a one-click model pull button.

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d chroma ollama
```

### 2. Pull Ollama models

```bash
npm run models:pull
# Pulls: llama3.2, llava, nomic-embed-text
```

### 3. Run backend (Python)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8080
```

### 4. Run frontend (Node.js)

```bash
cd apps/web
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Full Docker stack

```bash
docker compose up --build
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/documents/upload` | Upload PDF, image, or text document |
| `GET` | `/search/` | Semantic vector search |
| `GET` | `/search/part-number` | Search by part number |
| `GET` | `/search/barcode` | Search by barcode |
| `POST` | `/search/image` | YOLOv8 + LLaVA image search |
| `GET` | `/search/ask` | RAG Q&A with LLaMA 3.2 |
| `GET` | `/health` | Service health check |

## VPC / Security Notes

- Services run on an isolated Docker bridge network (`aerodocs-vpc`)
- ChromaDB and Ollama are not exposed publicly in production — bind only to internal network
- Set `API_SECRET` and restrict `CORS_ORIGINS` before deploying
- Store uploads on encrypted volumes in production environments

## License

MIT
