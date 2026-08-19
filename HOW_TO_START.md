# How to Start the Sales App

The sales app is **fully self-contained** — it does **not** depend on the scraper
for anything. It talks only to the **shared remote Pharma Postgres DB**
(`pharma`, schema `sdr_data` for scraped data + `sales_app` for the sales-app's
own tables). Lead research and web-evidence search run in the sales-app's own
Temporal worker (`lead_worker`), which connects to a **Temporal server that the
compose stack starts for you** (`temporal` service, `temporal server start-dev`).

Scraped data is produced elsewhere (the scraper writes into the same Pharma
DB), but the sales app never calls the scraper over the network — it reads the
DB directly and runs its own `lead_worker` Temporal worker.

> **Prerequisites:** Docker Engine + Docker Compose v2. No external Temporal or
> Postgres needed — `docker compose up` brings up Temporal, Chroma, the backend,
> the frontend, and the lead worker together.

---

## Start the sales app

```bash
cd /home/many-wallnut/Desktop/sales-app
docker compose up -d --build
```

This starts (on the internal compose network, no host ports for Temporal):
`frontend` (3000), `backend` (8000), `temporal` (internal `temporal:7233`),
`lead_worker`, and `chromadb` (8100).

Services / ports:

| Service    | Host port | Notes |
|------------|-----------|-------|
| `frontend` | 3000      | React + Tailwind (`Dockerfile`) |
| `backend`  | 8000      | FastAPI (`Dockerfile`); needs `backend/.env` (Pharma `DATABASE_URL` + `GROQ_API_KEY`) |
| `temporal` | — (internal `temporal:7233`) | `temporal server start-dev` — auto-started; no host port published, so it won't clash with a Temporal you already run on the host |
| `lead_worker` | —      | Dedicated Temporal worker running `LeadResearchWorkflow` (lead research) **and** `WebEvidenceWorkflow` (web-evidence search) on `sales-lead-task-queue` (needs `TAVILY_API_KEY`) |
| `chromadb` | 8100      | Chroma vector store |

Requires `backend/.env` (already present) — **keep it gitignored**, it holds the
Groq key, Tavily key, and the shared Pharma DB credentials.

### One-liner

```bash
cd /home/many-wallnut/Desktop/sales-app && docker compose up -d --build
```

> **Using a Temporal server you already run (e.g. on the dev server):** set
> `TEMPORAL_HOST` and skip the `temporal` service:
> ```bash
> TEMPORAL_HOST=host.docker.internal:7233 docker compose up -d --build \
>   frontend backend lead_worker chromadb
> ```
> (The in-compose `temporal` service is omitted in that case.)

> **Temporal Web UI:** not exposed by default. To open it, run a separate
> container: `docker run -p 8233:8233 temporalio/admin-tools` and visit
> `http://localhost:8233`.

## Verify

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
# frontend -> 3000, backend -> 8000, temporal -> (internal), lead_worker -> (internal), chromadb -> 8100
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
