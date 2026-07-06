# AeroDocs Platform

Secure Honeywell aviation knowledge base with a RAG vector search pipeline, document upload/retrieval, and multimodal search — by text, part numbers, barcodes, and images.

**Repository:** [github.com/RishithMody/aero_docs_platform](https://github.com/RishithMody/aero_docs_platform)

## Overview

AeroDocs Platform is a full-stack monorepo for aviation maintenance workflows. Technicians can upload repair manuals and photos, search the knowledge base multiple ways, and ask LLaMA 3.2 questions grounded in retrieved documents.

The frontend UI is based on the original [AeroDocs Frontend branch](https://github.com/FornaxChemica/aero_docs/tree/Frontend) — RetroGrid background, local Geist fonts, and a shadcn-style dark theme — integrated with the platform API, Ollama, and ML services.

## Stack

| Layer | Technology |
|---|---|
| Frontend | **Next.js 16**, **TypeScript**, **Node.js**, Tailwind CSS v3, shadcn/ui tokens, Lucide icons |
| Backend | **Python**, FastAPI, Uvicorn |
| LLM | **Ollama LLaMA 3.2** |
| Vision | **LLaVA** (Ollama), **YOLOv8** (Ultralytics) |
| Vector DB | ChromaDB |
| Barcode | pyzbar |
| Deployment | Docker Compose (isolated VPC-style network) |

## Features

### Backend
- **RAG pipeline** — ingest PDFs and text, embed with Ollama, search with ChromaDB
- **Part number search** — regex extraction + metadata filtering
- **Barcode search** — decode barcodes from uploaded images
- **Image recognition** — YOLOv8 object detection + LLaVA visual description
- **Q&A** — LLaMA 3.2 answers maintenance questions with cited sources
- **Document upload** — repair manuals, photos, and technician notes

### Frontend
- **RetroGrid UI** — animated background from the original AeroDocs frontend
- **Tabbed search** — semantic, part number, barcode, image, Q&A, and upload
- **Ollama status panel** — live model readiness with one-click pull
- **Result cards** — scored hits with part number and barcode tags

## Project Structure

```
aerodocs-platform/
├── apps/web/                    # Next.js + TypeScript frontend
│   ├── src/app/                 # App Router pages and layout
│   ├── src/components/          # UI components (Ollama panel, result cards)
│   ├── src/components/ui/       # RetroGrid and shadcn-style primitives
│   └── src/lib/                 # API client and Ollama helpers
├── backend/
│   ├── app/
│   │   ├── routers/             # documents, search, ollama routes
│   │   └── services/            # RAG, vision, Ollama client
│   ├── requirements.txt
│   └── Dockerfile
├── docker/
│   └── pull-models.sh           # Bootstrap Ollama models
└── docker-compose.yml           # Chroma, Ollama, API, Web
```

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Docker** and Docker Compose (recommended)
- **Ollama** — via Docker or [native install](https://ollama.com)

## Quick Start

### Option A — Docker (recommended)

```bash
git clone https://github.com/RishithMody/aero_docs_platform.git
cd aero_docs_platform
docker compose up --build
```

This starts ChromaDB, Ollama (with model bootstrap), the FastAPI backend, and the Next.js frontend.

Open [http://localhost:3000](http://localhost:3000).

### Option B — Local development

**1. Start infrastructure**

```bash
docker compose up -d chroma ollama
npm run models:pull
```

**2. Run the backend**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8080
```

**3. Run the frontend**

```bash
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev:web` | Start Next.js dev server |
| `npm run dev:api` | Start FastAPI with hot reload |
| `npm run dev:ollama` | Start Ollama container and pull models |
| `npm run models:pull` | Pull llama3.2, llava, nomic-embed-text |
| `npm run docker:up` | Build and start full Docker stack |
| `npm run docker:down` | Stop all containers |

## Ollama Integration

All LLM, embedding, and vision workloads run through **Ollama**:

| Model | Role | Used for |
|---|---|---|
| `llama3.2` | LLM | RAG Q&A, chat |
| `llava` | Vision | Image description |
| `nomic-embed-text` | Embeddings | Vector search |

The API waits for Ollama on startup and auto-pulls missing models when `OLLAMA_AUTO_PULL=true`. The frontend Ollama panel shows connection status and model readiness in real time.

### Ollama API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/ollama/status` | Connection + model readiness |
| `GET` | `/ollama/models` | List installed models |
| `POST` | `/ollama/pull/{model}` | Pull a specific model |
| `POST` | `/ollama/ensure` | Pull all required models |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/documents/upload` | Upload PDF, image, or text document |
| `GET` | `/search/` | Semantic vector search |
| `GET` | `/search/part-number` | Search by part number |
| `GET` | `/search/barcode` | Search by barcode |
| `POST` | `/search/image` | YOLOv8 + LLaVA image search |
| `GET` | `/search/ask` | RAG Q&A with LLaMA 3.2 |
| `GET` | `/health` | Service + Ollama health check |

API docs (when running locally): [http://localhost:8080/docs](http://localhost:8080/docs)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `LLM_MODEL` | `llama3.2` | Chat / Q&A model |
| `LLAVA_MODEL` | `llava` | Vision model |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `OLLAMA_AUTO_PULL` | `true` | Pull missing models on startup |
| `CHROMA_HOST` | `localhost` | ChromaDB host |
| `CHROMA_PORT` | `8000` | ChromaDB port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |

### Frontend (`apps/web/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API base URL |

## VPC / Security Notes

- Services run on an isolated Docker bridge network (`aerodocs-vpc`)
- In production, keep ChromaDB and Ollama on internal networks only
- Set `API_SECRET` and restrict `CORS_ORIGINS` before deploying
- Store uploads on encrypted volumes in production environments

## License

MIT
