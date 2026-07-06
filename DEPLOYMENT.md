# AeroDocs Platform — Deployment Guide

This document covers the best deployment options for AeroDocs Platform, trade-offs between them, and step-by-step instructions for each.

## What you are deploying

AeroDocs is **not a static site**. A full deployment includes:

| Service | Role | Needs persistence? | Resource notes |
|---|---|---|---|
| **web** | Next.js frontend | No | Light (512 MB–1 GB RAM) |
| **api** | FastAPI + YOLOv8 | Yes (uploads) | 2–4 GB RAM; CPU ok, GPU optional |
| **chroma** | Vector database | Yes | 1–2 GB RAM |
| **ollama** | LLaMA 3.2, LLaVA, embeddings | Yes (models) | **8 GB+ RAM minimum**; GPU strongly recommended |

Because Ollama runs local models, serverless-only platforms (Vercel Functions, AWS Lambda) **cannot** host the full stack. You need a VM, container service, or hybrid split.

---

## Option comparison

| Option | Best for | Difficulty | Cost (approx.) | Full stack? | GPU support |
|---|---|---|---|---|---|
| **[1] VPS + Docker Compose** | Most teams, demos, Honeywell VPC-style private deploy | Low | $20–80/mo | Yes | Optional |
| **[2] Split: Vercel + GPU VPS** | Production UI on CDN, ML on dedicated box | Medium | $20–100/mo | Yes (split) | On VPS |
| **[3] Railway / Render** | Quick cloud deploy, small teams | Low–Medium | $25–100/mo | Partial | Limited |
| **[4] AWS (EC2 / ECS)** | Enterprise, compliance, VPC isolation | High | $50–300+/mo | Yes | Yes (g4/g5 instances) |
| **[5] Google Cloud (GCE / GKE)** | Same as AWS, ML-friendly | High | $50–300+/mo | Yes | Yes |
| **[6] On-prem / air-gapped** | Honeywell-style secure environments | High | Hardware cost | Yes | Recommended |

### Recommendation

| Scenario | Recommended option |
|---|---|
| Fastest path to a working demo | **Option 1** — single VPS + Docker Compose |
| Best production UX (fast frontend + powerful backend) | **Option 2** — Vercel frontend + GPU VPS backend |
| Enterprise / VPC / compliance requirements | **Option 4 or 6** — AWS EC2 in private subnet or on-prem |
| Minimal DevOps experience | **Option 1** on Hetzner or DigitalOcean |

---

## Pre-deployment checklist

Before any option:

- [ ] Domain name (optional but recommended for HTTPS)
- [ ] Production API URL decided (e.g. `https://api.yourdomain.com`)
- [ ] Production frontend URL decided (e.g. `https://aerodocs.yourdomain.com`)
- [ ] Server with **at least 16 GB RAM** for comfortable Ollama performance (8 GB absolute minimum)
- [ ] **50+ GB disk** for Ollama models, Chroma data, and uploads
- [ ] Firewall: expose only ports 80/443 publicly; keep 11434, 8000, 8080 internal

---

## Option 1 — Single VPS + Docker Compose (recommended)

Best all-in-one deployment. Works on DigitalOcean, Hetzner, Linode, AWS EC2, Azure VM, etc.

### Minimum server specs

| Resource | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16–32 GB |
| CPU | 4 vCPU | 8 vCPU |
| Disk | 50 GB SSD | 100 GB SSD |
| GPU | None (slow) | NVIDIA GPU for Ollama |

### Step 1 — Provision the server

**DigitalOcean example:**

1. Create a Droplet → **Ubuntu 24.04 LTS**
2. Choose **8 GB RAM / 4 vCPU** or higher
3. Add your SSH key
4. Enable backups (optional)

**Hetzner example:**

1. Create a **CPX31** (8 GB RAM) or **CPX41** (16 GB RAM) instance
2. Select Ubuntu 24.04

### Step 2 — Install Docker

SSH into the server:

```bash
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt-get update && apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Step 3 — Clone the repository

```bash
git clone https://github.com/RishithMody/aero_docs_platform.git
cd aero_docs_platform
```

### Step 4 — Create production environment file

Create `docker-compose.prod.yml` overrides (or export env vars):

```bash
cat > .env.production << 'EOF'
# Public URLs — replace with your domain
PUBLIC_WEB_URL=https://aerodocs.yourdomain.com
PUBLIC_API_URL=https://api.yourdomain.com

# Used at Next.js build time
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EOF
```

Update `docker-compose.yml` environment for production:

```yaml
# api service
environment:
  - CORS_ORIGINS=https://aerodocs.yourdomain.com

# web service — rebuild with production API URL
build:
  args:
    - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Step 5 — Build and start

```bash
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com

docker compose build --build-arg NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
docker compose up -d
```

First boot takes **10–30 minutes** while Ollama pulls `llama3.2`, `llava`, and `nomic-embed-text`.

Monitor progress:

```bash
docker compose logs -f ollama-init
docker compose logs -f api
```

### Step 6 — Add HTTPS with Caddy (reverse proxy)

Install Caddy:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```caddyfile
aerodocs.yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8080
}
```

```bash
systemctl reload caddy
```

Ensure DNS A records point both subdomains to your server IP.

### Step 7 — Lock down the firewall

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Do **not** expose ports 11434, 8000, or 8080 publicly — Caddy handles external traffic.

### Step 8 — Verify deployment

```bash
curl https://api.yourdomain.com/health
```

Open `https://aerodocs.yourdomain.com` in a browser. The Ollama status panel should show all three models as **Ready**.

### Step 9 — Enable auto-restart on reboot

```bash
# Docker Compose services already restart unless stopped
# Add to crontab or systemd if needed
docker compose up -d
```

---

## Option 2 — Split: Vercel (frontend) + VPS (backend + ML)

Best when you want a global CDN for the UI and a powerful private server for Ollama/YOLOv8.

### Architecture

```
User → Vercel (Next.js) → VPS API (FastAPI) → Ollama + ChromaDB
```

### Step 1 — Deploy backend on VPS

Follow **Option 1, Steps 1–5**, but run only backend services:

Create `docker-compose.backend.yml`:

```yaml
services:
  chroma:
    image: chromadb/chroma:0.5.23
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
    networks:
      - aerodocs-vpc

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - aerodocs-vpc

  ollama-init:
    image: curlimages/curl:8.11.1
    depends_on:
      - ollama
    volumes:
      - ./docker/pull-models.sh:/pull-models.sh:ro
    environment:
      - OLLAMA_HOST=http://ollama:11434
    entrypoint: ["/bin/sh", "/pull-models.sh"]
    networks:
      - aerodocs-vpc

  api:
    build:
      context: ./backend
    ports:
      - "8080:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - CHROMA_HOST=chroma
      - CHROMA_PORT=8000
      - CORS_ORIGINS=https://your-app.vercel.app
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      - ollama-init
    networks:
      - aerodocs-vpc

volumes:
  chroma_data:
  ollama_data:
  uploads_data:

networks:
  aerodocs-vpc:
    driver: bridge
```

```bash
docker compose -f docker-compose.backend.yml up -d --build
```

### Step 2 — Expose API with HTTPS

Use Caddy (same as Option 1, Step 6) for `api.yourdomain.com → localhost:8080`.

### Step 3 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and import `RishithMody/aero_docs_platform`
2. Set **Root Directory** to `apps/web`
3. Add environment variable:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |

4. Deploy

### Step 4 — Update CORS on the API

After Vercel gives you a URL, update the API:

```bash
# In docker-compose.backend.yml or .env
CORS_ORIGINS=https://your-app.vercel.app,https://aerodocs.yourdomain.com
```

```bash
docker compose -f docker-compose.backend.yml up -d api
```

### Step 5 — Verify

- Frontend: `https://your-app.vercel.app`
- API health: `https://api.yourdomain.com/health`
- Upload a test PDF and run a search

---

## Option 3 — Railway or Render

Good for quick experiments. **Not ideal for Ollama** due to memory limits and ephemeral disks on free/small tiers.

### Railway

1. Create a new project at [railway.app](https://railway.app)
2. Deploy from GitHub → `aero_docs_platform`
3. Add services:
   - **ChromaDB** — use Railway template or Docker image
   - **Ollama** — requires a **Pro plan** with enough RAM (16 GB+)
   - **API** — deploy from `backend/Dockerfile`
   - **Web** — deploy from `apps/web/Dockerfile`
4. Set environment variables per service (same as `backend/.env.example`)
5. Set `NEXT_PUBLIC_API_URL` to the Railway API public URL before building web

**Limitation:** Railway charges scale with RAM. Running Ollama + LLaVA on Railway is often more expensive than a Hetzner VPS.

### Render

1. Create a **Web Service** for the API from `backend/Dockerfile`
2. Create a **Private Service** for ChromaDB and Ollama (internal networking)
3. Create a **Web Service** for Next.js from `apps/web/Dockerfile`
4. Attach a **Persistent Disk** to Ollama and Chroma services
5. Set env vars in the Render dashboard

**Limitation:** Render free tier cannot run Ollama. Use at least the **Standard** plan with 4 GB+ RAM per service.

---

## Option 4 — AWS (EC2 + Docker Compose in VPC)

Best for enterprise Honeywell-style deployments with network isolation.

### Architecture

```
Internet → ALB (HTTPS) → EC2 (Docker Compose) → Ollama + Chroma + API + Web
                         Private subnet, no public DB ports
```

### Step 1 — Create a VPC

1. AWS Console → **VPC** → Create VPC
2. Use **VPC and more** wizard:
   - 2 public subnets (ALB)
   - 2 private subnets (EC2, optional internal services)
   - NAT gateway for outbound model pulls

### Step 2 — Launch EC2 instance

1. **AMI:** Ubuntu 24.04 LTS
2. **Instance type:** `g4dn.xlarge` (GPU) or `t3.xlarge` (16 GB RAM, CPU-only)
3. **Subnet:** Private subnet (access via SSM Session Manager or bastion)
4. **Storage:** 100 GB gp3 EBS
5. **Security group:**
   - Inbound: 443 from ALB security group only
   - No public inbound on 8080, 11434, 8000

### Step 3 — Install Docker on EC2

```bash
# Connect via SSM Session Manager
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
```

### Step 4 — Deploy application

```bash
git clone https://github.com/RishithMody/aero_docs_platform.git
cd aero_docs_platform
docker compose up -d --build
```

### Step 5 — Application Load Balancer

1. Create **Target Group** → port 3000 (web) and port 8080 (api)
2. Create **ALB** in public subnets with ACM HTTPS certificate
3. Add listener rules:
   - `aerodocs.yourdomain.com` → web target group
   - `api.yourdomain.com` → api target group

### Step 6 — Persist data with EBS

Mount EBS volumes for:

- `/var/lib/docker/volumes/aero_docs_platform_ollama_data`
- `/var/lib/docker/volumes/aero_docs_platform_chroma_data`
- `/var/lib/docker/volumes/aero_docs_platform_uploads_data`

Or use **EFS** for shared storage if scaling to multiple instances later.

### Step 7 — Secrets

Store secrets in **AWS Secrets Manager** or **SSM Parameter Store**:

- `API_SECRET`
- `CORS_ORIGINS`
- Any future auth tokens

Inject at container start via an entrypoint script or ECS task definitions if you migrate to ECS later.

---

## Option 5 — Google Cloud (Compute Engine)

Similar to AWS EC2.

### Steps

1. Create a VPC network with private subnet
2. Launch **e2-standard-4** (16 GB RAM) or **g2-standard-4** (GPU)
3. Install Docker, clone repo, run `docker compose up -d`
4. Use **Cloud Load Balancing** + managed SSL certificates
5. Persist disks for Ollama/Chroma volumes
6. Optional: **Cloud NAT** for outbound Ollama model pulls from private instances

---

## Option 6 — On-prem / air-gapped (Honeywell VPC)

For environments with no public internet on production networks.

### Steps

1. **Build images on a connected build machine:**

   ```bash
   docker compose build
   docker save -o aerodocs-images.tar \
     aerodocs-platform-api \
     aerodocs-platform-web \
     chromadb/chroma:0.5.23 \
     ollama/ollama:latest
   ```

2. **Transfer** the tar archive and model files to the secure network via approved media.

3. **Load images on-prem:**

   ```bash
   docker load -i aerodocs-images.tar
   ```

4. **Pre-pull Ollama models** on a staging machine, copy `/root/.ollama` volume data.

5. **Run Docker Compose** on internal hardware with internal DNS:
   - `aerodocs.internal.company.com` → web
   - `api.aerodocs.internal.company.com` → api

6. **Disable `OLLAMA_AUTO_PULL`** if outbound internet is blocked:

   ```env
   OLLAMA_AUTO_PULL=false
   ```

7. Place services on an isolated VLAN with access restricted to maintenance workstations.

---

## Production environment variables

### Backend (`api` service)

| Variable | Production example |
|---|---|
| `OLLAMA_BASE_URL` | `http://ollama:11434` (internal Docker network) |
| `LLM_MODEL` | `llama3.2` |
| `LLAVA_MODEL` | `llava` |
| `EMBEDDING_MODEL` | `nomic-embed-text` |
| `OLLAMA_AUTO_PULL` | `true` (set `false` for air-gapped) |
| `CHROMA_HOST` | `chroma` |
| `CHROMA_PORT` | `8000` |
| `CORS_ORIGINS` | `https://aerodocs.yourdomain.com` |
| `API_SECRET` | Strong random string |
| `UPLOAD_DIR` | `./uploads` |

### Frontend (`web` service)

| Variable | When to set | Production example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Build time** | `https://api.yourdomain.com` |

> **Important:** `NEXT_PUBLIC_API_URL` is baked into the Next.js bundle at build time. Rebuild the web image whenever the API URL changes.

---

## Post-deployment verification

Run these checks after any deployment option:

```bash
# 1. API health
curl https://api.yourdomain.com/health
# Expect: "status": "ok", ollama.ready: true

# 2. Ollama models
curl https://api.yourdomain.com/ollama/status

# 3. Upload a test document
curl -X POST https://api.yourdomain.com/documents/upload \
  -F "file=@manual.pdf" \
  -F "title=Test Manual"

# 4. Semantic search
curl "https://api.yourdomain.com/search/?q=replace%20hydraulic%20pump"

# 5. Frontend
# Open browser → Ollama panel green → run a search
```

---

## Monitoring and maintenance

### Logs

```bash
docker compose logs -f api
docker compose logs -f ollama
docker compose logs -f web
```

### Backups (critical)

Back up these Docker volumes regularly:

| Volume | Contents |
|---|---|
| `ollama_data` | Downloaded models (several GB) |
| `chroma_data` | Vector embeddings |
| `uploads_data` | Uploaded PDFs and documents |

```bash
# Example backup
docker run --rm \
  -v aero_docs_platform_chroma_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/chroma-$(date +%F).tar.gz -C /data .
```

### Updates

```bash
git pull origin main
docker compose build
docker compose up -d
```

### Scaling notes

- **Web** — scale horizontally behind a load balancer (stateless)
- **API** — scale with shared Chroma + Ollama; or split Ollama to a dedicated GPU node
- **Ollama** — one instance per GPU; use a queue (Redis/Celery) for heavy concurrent load
- **Chroma** — single writer; use Chroma Cloud or a managed vector DB for multi-node API

---

## Quick decision guide

```
Need everything running in 30 minutes?
  → Option 1: Hetzner/DigitalOcean + Docker Compose

Need fast global frontend + private ML server?
  → Option 2: Vercel + VPS

Need AWS VPC / compliance / enterprise?
  → Option 4: EC2 in private subnet + ALB

No internet in production?
  → Option 6: On-prem with pre-loaded models

Just prototyping, okay with cost?
  → Option 3: Railway/Render (16 GB+ plan)
```

---

## Related docs

- [README.md](./README.md) — local development setup
- [backend/.env.example](./backend/.env.example) — backend configuration reference
- [apps/web/.env.local.example](./apps/web/.env.local.example) — frontend configuration reference
