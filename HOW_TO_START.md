# How to Start the Services

Two **independent** Docker Compose stacks power this project. They must be
started in order because the **sales app joins the `scrapper_default` network**
that the scrapper stack creates.

| Stack | Compose file | Working dir |
|-------|--------------|-------------|
| Scrapper (Temporal + API + workers) | `docker-compose.yml` | `/home/many-wallnut/Desktop/scrapper` |
| Sales app (frontend/backend/db/chroma) | `docker-compose.yml` | `/home/many-wallnut/Desktop/sales-app` |

> **Prerequisites:** Docker Engine + Docker Compose v2.

---

## 1) Start the scrapper containers (start first)

```bash
cd /home/many-wallnut/Desktop/scrapper
docker compose up -d --build
```

Services / default ports:

| Service    | Image / build            | Host port | Notes |
|------------|--------------------------|-----------|-------|
| `temporal` | `temporalio/admin-tools` | 7233, 8233 | Temporal dev server (workflow engine) |
| `app`      | `Dockerfile` (app)       | 5000      | Scrapper API (`uvicorn main:app`) |
| `worker`   | `Dockerfile.worker`      | —         | Runs Temporal workflows |
| `enricher` | `Dockerfile.enricher`    | —         | Enrichment worker |

Requires a `.env` in the `scrapper/` dir (already present): `scrapper/.env`.

## 2) Start the sales app containers (start after scrapper)

```bash
cd /home/many-wallnut/Desktop/sales-app
docker compose up -d --build
```

Services / ports:

| Service    | Host port | Notes |
|------------|-----------|-------|
| `frontend` | 3000      | React + Tailwind (`Dockerfile`) |
| `backend`  | 8000      | FastAPI (`Dockerfile`); needs `backend/.env` (DB + `GROQ_API_KEY`) |
| `db`       | 5434      | Postgres 16 (healthcheck gates `backend`) |
| `chromadb` | 8100      | Chroma vector store |

Requires `backend/.env` (already present) — **keep it gitignored**, it holds the
Groq key and DB credentials.

### One-liner for both

```bash
cd /home/many-wallnut/Desktop/scrapper  && docker compose up -d --build \
&& cd /home/many-wallnut/Desktop/sales-app && docker compose up -d --build
```

## Verify

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
# frontend -> 3000, backend -> 8000, db -> 5434, chromadb -> 8100, app -> 5000
```

Health check: `curl -s http://localhost:8000/health`

---

## Stop & clean

```bash
# stop both stacks
cd /home/many-wallnut/Desktop/sales-app && docker compose down -v
cd /home/many-wallnut/Desktop/scrapper   && docker compose down -v

# prune build cache + unused images (~4 GB reclaimed)
docker image prune -af
docker builder prune -af
```

Notes:
- `down -v` also removes named volumes (`pgdata`, `chromadata`) — this resets
  the local Postgres and Chroma data. Omit `-v` to keep the data.
- If you see `network scrapper_default is still in use`, stop the sales app
  stack first, then the scrapper stack.
- Env files are gitignored (`.gitignore` covers `.env`, `.env.*`); never commit them.
