# Setup Guide — Cloning and Running the Sales App (Level 2) from Scratch

The **Level 2 sales engine** consumes the pharma intelligence data produced by
the Level 1 scraper ("AIVOA Sentinel"), but it is **fully independent of the
scraper at runtime**: it never calls the scraper over HTTP/MCP, and it runs its
own Temporal worker for lead research.

> **TL;DR:** the sales app only needs (1) the **shared remote Pharma Postgres
> DB** (it reads scraped data from `sdr_data` and stores its own tables in
> `sales_app`) and (2) a **Temporal server** for lead research. It does **not**
> depend on the scraper process/stack for anything.

---

## 0. What this project is

A full-stack **sales / CRM UI** over the pharma intelligence data. It provides:

- **React 19 + Vite + Tailwind** frontend (sales-oriented lead UI, confidence
  badges, campaigns, chat).
- **FastAPI backend** that serves signals, runs Groq-based chat, web-evidence,
  lead research, campaigns, and reports — all from the **shared database**
  (no network proxy to Level 1).
- **ChromaDB** vector store for conversation/company memory.
- **Temporal `lead_worker`** that executes `LeadResearchWorkflow` (Tavily +
  Groq + Playwright) and writes results to the shared DB.

### External dependencies

| What the sales app needs | Where it comes from | Env var |
|---|---|---|
| Scraped regulatory data (read) | Shared Pharma Postgres — schema `sdr_data` | `DATABASE_URL` |
| Sales-app tables (users, campaigns, …) | Same Pharma Postgres — schema `sales_app` (created on startup) | `DATABASE_URL` |
| Lead-research + web-evidence execution | The compose stack starts its own `temporal` service (`start-dev`); the sales-app **`lead_worker`** executes `LeadResearchWorkflow` (lead research) and `WebEvidenceWorkflow` (web-evidence search) on `sales-lead-task-queue` | `TEMPORAL_HOST` / `TEMPORAL_TASK_QUEUE` |
| Groq LLM | Groq console key | `GROQ_API_KEY` |
| Tavily web search | Tavily console key (used by lead-research activities) | `TAVILY_API_KEY` |

The backend reaches the **Temporal server** (e.g. `localhost:7233`) and the
**Pharma DB** over the network. No scraper service is contacted.

---

## 1. Components / ports

| Component | How to run | Default port |
|---|---|---|
| Frontend (nginx) | Docker compose `frontend` | `3000` (host) / `80` (container) |
| Backend (FastAPI) | Docker compose `backend` (or venv) | `8000` |
| ChromaDB | Docker compose `chromadb` | `8100` (host) / `8000` (container) |
| Temporal server | started by the sales-app compose (`temporal` service, `temporal server start-dev --ip 0.0.0.0`); internal `temporal:7233`, no host port | `7233` (internal) / `8233` (UI, not exposed) |
| Shared Pharma Postgres | remote instance (no container in either stack) | `5432` |

> There is **no Postgres container in the sales-app stack** — both the scraped
> data and the app's own tables live in the shared remote Pharma DB.

---

## 2. Environment variables (`backend/.env`)

The backend uses **pydantic-settings** (`backend/app/config.py`); it reads a
`.env` file from the working directory it runs in. For Docker Compose that file
is **`backend/.env`** (gitignored — never commit it).

```env
# Shared Pharma Postgres — scraped data (sdr_data) + sales-app tables (sales_app)
DATABASE_URL=postgresql+asyncpg://pharmabkp:aivoadma25@216.48.184.249:5432/pharma

# JWT auth
SECRET_KEY=change-me-to-a-random-64-char-string

# Groq (LLM for chat)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=openai/gpt-oss-120b

# Temporal — sales-app starts LeadResearchWorkflow; its own lead_worker executes it
TEMPORAL_HOST=localhost:7233
TEMPORAL_TASK_QUEUE=sales-lead-task-queue

# ChromaDB vector store
CHROMA_HOST=chromadb
CHROMA_PORT=8000
```

### Reference

| Var | Default | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://…@216.48.184.249:5432/pharma` | Yes | Must be `asyncpg`. Single shared DB; sales-app writes its own tables in the `sales_app` schema and reads scraped data from `sdr_data`. |
| `SECRET_KEY` | `change-me-in-production` | Yes (prod) | Generate: `openssl rand -hex 32` |
| `GROQ_API_KEY` | `""` | Yes (chat features) | <https://console.groq.com/keys> |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | No | Groq model id |
| `TEMPORAL_HOST` | `localhost:7233` | Yes (lead research) | Default in compose is `temporal:7233` (the in-compose Temporal service). Override via `TEMPORAL_HOST=host.docker.internal:7233` to use a Temporal you already run on the host |
| `TEMPORAL_TASK_QUEUE` | `sales-lead-task-queue` | Yes (lead research) | Task queue the sales-app `lead_worker` listens on |
| `TAVILY_API_KEY` | `""` | Yes (lead research) | Tavily web-search key used by the research activities |
| `CHROMA_HOST` / `CHROMA_PORT` | `chromadb` / `8000` | No | Chroma vector store |
| `CORS_ORIGINS` | `["http://localhost:3000", ...]` | No | Comma list of allowed origins |

> pydantic-settings is **case-insensitive**, so `DATABASE_URL` maps to the
> `database_url` field automatically.

**The database schema is created automatically** at backend startup — the
FastAPI lifespan runs `CREATE SCHEMA IF NOT EXISTS sales_app` +
`Base.metadata.create_all` (see `backend/app/main.py`). The scraped `sdr_data`
tables are owned by Level 1. No alembic migration step is needed.

---

## 3. Prerequisites

- **Git**
- **Docker Engine + Docker Compose v2** (recommended path), OR
- **Local dev path:** Python 3.12+, Node.js 22+, `pnpm` (via `corepack`)
- **A Temporal server** — the sales-app compose starts one for you (`temporal`
  service). If you already run a Temporal server on the host, set
  `TEMPORAL_HOST=host.docker.internal:7233` and start only
  `frontend backend lead_worker chromadb` (omit the `temporal` service).

The sales app does **not** require the Level 1 scraper stack at all — it reads
the shared Pharma DB directly and runs its own `lead_worker`.

---

## 4. Clone the sales app

```bash
git clone git@github.com:ManiGOo/LEVEL_2_sales_engine.git sales-app
cd sales-app
```

---

## 5. Option A — Run with Docker Compose (recommended)

### 5.1 Create `backend/.env`

```bash
cd backend
cp .env.example .env   # if committed; otherwise create manually:
```

If no `.env.example` exists, create `backend/.env` with the template from §2.

### 5.2 Start the stack

```bash
cd /path/to/sales-app
docker compose up -d --build
```

Compose details (`docker-compose.yml`):

| Service | Build | Depends on | Notes |
|---|---|---|---|
| `frontend` | `./frontend` (node:22 → nginx) | `backend` | Serves built SPA on `:3000`; nginx proxies `/api/` → `backend:8000` |
| `backend` | `./backend` (python:3.12-slim) | `chromadb`, `temporal` | `uvicorn app.main:app --port 8000`; `TEMPORAL_HOST=${TEMPORAL_HOST:-temporal:7233}` |
| `lead_worker` | `./backend` (`Dockerfile.lead_worker`, Playwright base) | `chromadb` | `python -m app.temporal.worker`; runs `LeadResearchWorkflow` (lead research) **and** `WebEvidenceWorkflow` (web-evidence search) on `sales-lead-task-queue` |
| `chromadb` | `chromadb/chroma:latest` | — | Volume `chromadata`, host port `8100` |

The `backend` and `lead_worker` containers reach the **in-compose** Temporal
server via `temporal:7233` (the `temporal` service, started with
`temporal server start-dev --ip 0.0.0.0`). No external Docker network to the
scraper is required. To use a Temporal you already run on the host instead, set
`TEMPORAL_HOST=host.docker.internal:7233` and `docker network connect` is not
needed (the `extra_hosts: host.docker.internal:host-gateway` mapping is already
present in the compose file).

> There is no `db` service — the backend uses the shared remote Pharma DB from
> §2, writing its own tables into the `sales_app` schema. The only external
> dependency is the Pharma DB; Temporal is started by the stack.

---

## 6. Option B — Local development (venv + pnpm)

### 6.1 Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Point `.env` at the shared Pharma DB and the Temporal server you are running
(localhost `7233`, already present on the dev server, or run Temporal locally).
No local `sales_app` database needs to be created — the sales-app
creates its `sales_app` schema automatically on startup:

```env
DATABASE_URL=postgresql+asyncpg://pharmabkp:aivoadma25@216.48.184.249:5432/pharma
TEMPORAL_HOST=localhost:7233
```

Run:

```bash
set -a && source .env && set +a
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 6.2 Frontend

```bash
cd frontend
corepack enable && pnpm install
pnpm dev        # Vite on http://localhost:3000
```

`vite.config.ts` already proxies `/api` → `http://localhost:8000`, so no extra
proxy config is needed. For the proxy to work the backend must be running
locally on `8000`.

---

## 7. Verify

```bash
# 1) Sales-app stack running (+ a Temporal server reachable on :7233)
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
#    sales-app-frontend-1 -> 3000 | sales-app-backend-1 -> 8000
#    sales-app-lead_worker-1 | sales-app-chromadb-1 -> 8100

# 2) Backend health (also proves DB reached on first startup)
curl -s http://localhost:8000/health          # {"status":"ok"}

# 3) Backend can read the shared data directly (no API/MCP to the scraper)
curl -s "http://localhost:8000/api/v1/companies/count"

# 4) Frontend loads
open http://localhost:3000
```

---

## 8. First login

There is **no seeded user** — create one via the API, then log in from the UI:

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"sales@example.com","password":"your-password","name":"Sales User"}'

curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sales@example.com","password":"your-password"}'
```

### API surface (`/api/v1`, from `backend/app/api/v1/router.py`)

| Router | Prefix | Purpose |
|---|---|---|
| auth | `/auth` | register, login, refresh, me |
| chat | `/chat` | Groq-backed assistant chat (local tools over the shared DB) |
| signals | `/signals` | High-priority signals (from shared DB) |
| companies | `/companies` | Company list / detail / ranking |
| conversations | `/conversations` | Chat conversation history |
| web_evidence | `/web-evidence` | Web evidence: read results, trigger a search (`POST /search/{event_id}`, runs `WebEvidenceWorkflow`), poll status (`GET /status/{workflow_id}`) |
| leads | `/leads` | Lead research (starts `LeadResearchWorkflow` on Temporal) + status |
| reports | `/reports` | XLSX / reporting export |
| campaigns | `/campaigns` | Campaign create / approve / start |

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `network scrapper_default not found` | Removed — the sales-app no longer uses the scraper network; ensure `host.docker.internal` resolves (Linux compose uses `extra_hosts`) |
| Backend keeps restarting | Wait for `chromadb` to start — backend depends on it |
| UI loads but no signal/company data | `DATABASE_URL` wrong, or the Pharma DB has no scraped data yet (run scraping into `sdr_data`) |
| `DATABASE_URL` connection refused | Use a `postgresql+asyncpg://` URL to the shared Pharma host; check network egress |
| Lead research never completes | Temporal server down, or the sales-app `lead_worker` not running; check `TEMPORAL_HOST` and `TEMPORAL_TASK_QUEUE` |
| Login fails | Register the user first (`/auth/register`); no seed user exists |
| Frontend proxy 502 (local dev) | Backend must run on `localhost:8000` for the Vite proxy |

---

## 10. More docs

- **`HOW_TO_START.md`** — quick Docker Compose start/stop for the sales app.
- **`DEV_SERVER_SETUP.md`** — full remote dev-server provisioning
  (Docker, env files, firewall, nginx + HTTPS, operations).
- **`docs/adr-001-tavily-vs-groq-compound.md`** — why Tavily-direct won over
  the Groq compound pipeline for web evidence.
