# Setup Guide — Cloning and Running the Sales App (Level 2) from Scratch

The **Level 2 sales engine** sits on top of the Level 1 scrapper ("AIVOA
Sentinel"). Follow the steps **in order**.

> **TL;DR:** the sales app is not standalone — it needs the **Level 1
> (scrapper) stack running first**, because it consumes the Sentinel API + MCP
> over a shared Docker network. See §2.

---

## 0. What this project is

A full-stack **sales / CRM UI** over the pharma intelligence data produced by
Level 1. It provides:

- **React 19 + Vite + Tailwind** frontend (sales-oriented lead UI, confidence
  badges, campaigns, chat).
- **FastAPI backend** that proxies/gathers Sentinel signals, runs Groq-based
  chat, web-evidence, lead research, campaigns, reports.
- **PostgreSQL 16** for app data (users, conversations, campaigns, …).
- **ChromaDB** vector store for conversation/company memory.

### Relationship to Level 1

| What the sales app needs | Where it comes from | Env var |
|---|---|---|
| Signal/company/scraper data (REST) | Sentinel API → Level 1 `app` container, port `5000` | `SENTINEL_API_URL` |
| MCP tools (`query_signals`, `trigger_*`, …) | Sentinel MCP streamable HTTP at `/mcp` | `SENTINEL_MCP_URL` |
| Groq LLM | Groq console key | `GROQ_API_KEY` |

The backend reaches Sentinel **through the external `scrapper_default` Docker
network** — so Level 1 must be running and its `app` service must be up before
the backend works end-to-end.

---

## 1. Components / ports

| Component | How to run | Default port |
|---|---|---|
| Frontend (nginx) | Docker compose `frontend` | `3000` (host) / `80` (container) |
| Backend (FastAPI) | Docker compose `backend` (or venv) | `8000` |
| PostgreSQL 16 | Docker compose `db` | `5434` (host) / `5432` (container) |
| ChromaDB | Docker compose `chromadb` | `8100` (host) / `8000` (container) |
| Sentinel API (Level 1) | scrapper stack, service `app` | `5000` (host) / `5000` (container) |

---

## 2. Environment variables (`backend/.env`)

The backend uses **pydantic-settings** (`backend/app/config.py`); it reads a
`.env` file from the working directory it runs in. For Docker Compose that file
is **`backend/.env`** (gitignored — never commit it).

```env
# Postgres (the compose `db` service) — leave as-is for Docker
DATABASE_URL=postgresql+asyncpg://sales:password@db:5432/sales_app

# JWT auth
SECRET_KEY=change-me-to-a-random-64-char-string

# Groq (LLM for chat / enrichment)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=openai/gpt-oss-120b

# Level 1 Sentinel — reachable via the shared scrapper_default network
SENTINEL_MCP_URL=http://app:5000/mcp
SENTINEL_API_URL=http://app:5000
```

### Reference

| Var | Default | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://sales:password@db:5432/sales_app` | Yes | Must be `asyncpg`. For local dev, point at your local Postgres. |
| `SECRET_KEY` | `change-me-in-production` | Yes (prod) | Generate: `openssl rand -hex 32` |
| `GROQ_API_KEY` | `""` | Yes (chat features) | <https://console.groq.com/keys> |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | No | Groq model id |
| `SENTINEL_MCP_URL` | `http://sentinel:5000/mcp` | Yes (data) | `http://app:5000/mcp` inside compose |
| `SENTINEL_API_URL` | `http://sentinel:5000` | Yes (data) | `http://app:5000` inside compose |
| `CHROMA_HOST` / `CHROMA_PORT` | `chromadb` / `8000` | No | Chroma vector store |
| `CORS_ORIGINS` | `["http://localhost:3000", ...]` | No | Comma list of allowed origins |

> pydantic-settings is **case-insensitive**, so `DATABASE_URL` maps to the
> `database_url` field automatically.

**The database schema is created automatically** at backend startup — the
FastAPI lifespan runs `Base.metadata.create_all` (see `backend/app/main.py`).
No alembic migration step is needed.

---

## 3. Prerequisites

- **Git**
- **Docker Engine + Docker Compose v2** (recommended path), OR
- **Local dev path:** Python 3.12+, Node.js 22+, `pnpm` (via `corepack`)
- **The Level 1 scrapper stack cloned and running** (see its `setup/README.md`)

Clone Level 1 first (it creates the `scrapper_default` network):

```bash
git clone git@github.com:ManiGOo/AIVOA-Sentinel-level-1.git scrapper
cd scrapper && docker compose up -d --build   # wait for app on :5000
```

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
| `backend` | `./backend` (python:3.12-slim) | `db` healthy, `chromadb` | `uvicorn app.main:app --port 8000` |
| `db` | `postgres:16-alpine` | — | Volume `pgdata`, host port `5434` |
| `chromadb` | `chromadb/chroma:latest` | — | Volume `chromadata`, host port `8100` |

The backend joins **two networks**: its own default network and the external
`scrapper_default` network (declared `external: true`) — that is how it reaches
`http://app:5000`. **Level 1 must be up first**, otherwise
`docker compose up` fails with `network scrapper_default not found`.

---

## 6. Option B — Local development (venv + pnpm)

### 6.1 Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Point `.env` at a local Postgres instead of the compose `db` service
(e.g. `postgresql+asyncpg://sales:password@localhost:5432/sales_app`) and at
the locally running Sentinel (`SENTINEL_MCP_URL=http://localhost:5000/mcp`,
`SENTINEL_API_URL=http://localhost:5000`). Make sure the database exists:

```bash
psql -U postgres -h localhost -c "CREATE USER sales WITH PASSWORD 'password';"
psql -U postgres -h localhost -c "CREATE DATABASE sales_app OWNER sales;"
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
# 1) Both stacks running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
#    scrapper-app-1 -> 5000 | sales-app-frontend-1 -> 3000
#    sales-app-backend-1 -> 8000 | sales-app-db-1 -> 5434 | sales-app-chromadb-1 -> 8100

# 2) Backend health (also proves DB reached the first time)
curl -s http://localhost:8000/health          # {"status":"ok"}

# 3) Backend can reach Sentinel through scrapper_default
curl -s http://localhost:5000/api/v1/config

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
| chat | `/chat` | Groq-backed assistant chat |
| signals | `/signals` | High-priority signals (from Sentinel) |
| companies | `/companies` | Company list / detail / ranking |
| conversations | `/conversations` | Chat conversation history |
| web_evidence | `/web_evidence` | Web evidence lookups |
| leads | `/leads` | Lead research |
| reports | `/reports` | XLSX / reporting export |
| campaigns | `/campaigns` | Campaign create / approve / start |

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `network scrapper_default not found` | Start the Level 1 scrapper stack first (`docker compose up -d --build`) |
| Backend keeps restarting | Wait for `db` to become healthy — backend is gated on it (`depends_on: condition: service_healthy`) |
| UI loads but no data | `SENTINEL_API_URL`/`SENTINEL_MCP_URL` wrong, or scrapper `app` not up. `curl http://app:5000/api/v1/companies/count` from the backend container |
| `DATABASE_URL` connection refused (local dev) | Use a `postgresql+asyncpg://` URL and make sure the DB/user exist |
| Login fails | Register the user first (`/auth/register`); no seed user exists |
| Frontend proxy 502 (local dev) | Backend must run on `localhost:8000` for the Vite proxy |
| MCP calls time out | Sentinel `/mcp` is only mounted when Level 1 runs with `ENABLE_MCP=1` (default) |

---

## 10. More docs

- **`HOW_TO_START.md`** — quick Docker Compose start/stop for both stacks.
- **`DEV_SERVER_SETUP.md`** — full remote dev-server provisioning
  (Docker, env files, firewall, nginx + HTTPS, operations).
- **`docs/adr-001-tavily-vs-groq-compound.md`** — why Tavily-direct won over
  the Groq compound pipeline for web evidence.
