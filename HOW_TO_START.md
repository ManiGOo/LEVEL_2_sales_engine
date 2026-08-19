# How to Start the Sales App

The sales app is **fully self-contained** — it does **not** depend on the scraper
for anything. It talks only to:

- the **shared remote Pharma Postgres DB** (`pharma`, schema `sdr_data` for
  scraped data + `sales_app` for the sales-app's own tables), and
- a **Temporal server** (your dev server already runs one at `localhost:7233`).

Scraped data is produced elsewhere (the scraper writes into the same Pharma
DB), but the sales app never calls the scraper over the network — it reads the
DB directly and runs its own `lead_worker` Temporal worker.

> **Prerequisites:** Docker Engine + Docker Compose v2, and a Temporal server
> reachable at `localhost:7233` (already present on the dev server). If you do
> not have one, start a dev server first:
> `docker run -p 7233:7233 temporalio/admin-tools temporal server start-dev`

---

## Start the sales app

```bash
cd /home/many-wallnut/Desktop/sales-app
docker compose up -d --build
```

Services / ports:

| Service    | Host port | Notes |
|------------|-----------|-------|
| `frontend` | 3000      | React + Tailwind (`Dockerfile`) |
| `backend`  | 8000      | FastAPI (`Dockerfile`); needs `backend/.env` (Pharma `DATABASE_URL` + `GROQ_API_KEY`) |
| `lead_worker` | —      | Dedicated Temporal worker running `LeadResearchWorkflow` (lead research) **and** `WebEvidenceWorkflow` (web-evidence search) on `sales-lead-task-queue` (needs `TAVILY_API_KEY` + Temporal) |
| `chromadb` | 8100      | Chroma vector store |

Requires `backend/.env` (already present) — **keep it gitignored**, it holds the
Groq key, Tavily key, and the shared Pharma DB credentials.

### One-liner

```bash
cd /home/many-wallnut/Desktop/sales-app && docker compose up -d --build
```

## Verify

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
# frontend -> 3000, backend -> 8000, lead_worker -> (internal), chromadb -> 8100
```

Health check: `curl -s http://localhost:8000/health`

End-to-end lead research:

```bash
# start a lead-research workflow (sales-app's own worker executes it)
curl -s -X POST http://localhost:8000/api/v1/leads/research \
  -H 'Content-Type: application/json' \
  -d '{"company_keys":["rivpra formulation"],"companies":[]}'
```

---

## Stop & clean

```bash
cd /home/many-wallnut/Desktop/sales-app && docker compose down -v
docker image prune -af
docker builder prune -af
```

Notes:
- `down -v` removes the `chromadata` volume. The sales-app's Postgres data
  lives in the shared remote Pharma DB, so it is **not** affected by stopping
  this stack.
- Env files are gitignored (`.gitignore` covers `.env`, `.env.*`); never commit them.
