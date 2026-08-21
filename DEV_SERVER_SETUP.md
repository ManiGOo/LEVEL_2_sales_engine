# Dev Server Setup Guide

How to deploy the **sales app** standalone on a remote dev SSH server.

The sales app is **fully independent** — it does **not** depend on the scraper
for anything. It only needs:
- the **shared remote Pharma Postgres DB** (`pharma`, schema `sdr_data` for
  scraped data + `sales_app` for the app's own tables), and
- a **Temporal server** (the dev server already runs one at `localhost:7233`).

> Scraped data is produced elsewhere (the scraper writes into the same Pharma
> DB), but the sales app never talks to the scraper over the network — it reads
> the DB directly and runs its own `lead_worker` Temporal worker.

**Assumptions:**
- Ubuntu 22.04/24.04 LTS, fresh SSH access (root or sudo user)
- Docker Engine + Docker Compose v2 not yet installed
- You have SSH key or password access
- Port 3000 may already be in use — use **3200** for the frontend

---

## 1) Provision the Server

SSH in and install dependencies:

```bash
ssh user@your-dev-server

# system updates
sudo apt update && sudo apt upgrade -y

# install Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in for group to take effect, or:
newgrp docker

# install Docker Compose v2 (included with get.docker.com)
docker compose version

# clone the sales app
git clone git@github.com:ManiGOo/LEVEL_2_sales_engine.git sales-app
```

Verify:

```bash
docker --version          # 24+
docker compose version    # 2.x
```

> The sales-app compose starts its own Temporal server (`temporal` service,
> `temporal server start-dev --ip 0.0.0.0`) on the internal network, so no
> separate Temporal is needed. If the dev server already runs a Temporal you
> want to reuse, set `TEMPORAL_HOST=host.docker.internal:7233` and start only
> `frontend backend lead_worker chromadb` (omit the `temporal` service).

---

## 2) Configure Environment Variables

The sales app needs a `.env` file (gitignored — create it manually on the server).

### Sales app stack (`sales-app/backend/.env`)

```bash
cd sales-app

cat > backend/.env <<'EOF'
# Shared Pharma Postgres — scraped data (sdr_data) + sales-app tables (sales_app)
DATABASE_URL=postgresql+asyncpg://pharmabkp:aivoadma25@216.48.184.249:5432/pharma

SECRET_KEY=change-me-to-a-random-64-char-string

# Groq (LLM for chat + lead research)
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Tavily (web search used by lead-research activities)
TAVILY_API_KEY=tvly-your-tavily-key

# Temporal — sales-app starts LeadResearchWorkflow; its own lead_worker executes it.
# localhost for bare-metal; the compose file overrides this to host.docker.internal:7233.
TEMPORAL_HOST=localhost:7233
TEMPORAL_TASK_QUEUE=sales-lead-task-queue

# ChromaDB vector store
CHROMA_HOST=chromadb
CHROMA_PORT=8000
EOF
```

| Var | Notes |
|-----|-------|
| `DATABASE_URL` | Shared remote Pharma DB (`postgresql+asyncpg://…@216.48.184.249:5432/pharma`). The `sales_app` schema is created automatically on startup. |
| `SECRET_KEY` | Generate with `openssl rand -hex 32` |
| `GROQ_API_KEY` | <https://console.groq.com/keys> |
| `TAVILY_API_KEY` | <https://app.tavily.com/home> |
| `TEMPORAL_HOST` | `localhost:7233` (the dev server's Temporal); inside the compose containers it is overridden to `host.docker.internal:7233` |
| `TEMPORAL_TASK_QUEUE` | `sales-lead-task-queue` — the queue the sales-app `lead_worker` listens on |
| `CHROMA_HOST` / `CHROMA_PORT` | `chromadb` / `8000` |

> **Note:** If using port 3200 for the frontend, add it to CORS origins in
> `backend/app/config.py`:
> ```python
> cors_origins: list[str] = ["http://localhost:3000", "http://localhost:80", "http://localhost:3200"]
> ```

---

## 3) Open Firewall Ports

Expose the ports you need. For a dev server, at minimum:

```bash
# if using ufw
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3200/tcp    # Frontend (React app)
sudo ufw allow 8000/tcp    # Backend API (FastAPI)
sudo ufw enable
```

For production, put these behind nginx + HTTPS (see §6).

---

## 4) Build & Start the Sales App

The sales app is a single, self-contained stack — the compose file includes a
`frontend`, `backend`, `temporal`, `lead_worker`, and `chromadb`:

```bash
cd ~/sales-app
docker compose up -d --build
```

One-liner:

```bash
cd ~/sales-app && docker compose up -d --build
```

> **Dev server port override:** If port 3000 is in use, override the frontend port:
> ```bash
> cd ~/sales-app
> docker compose up -d --build -e FRONTEND_PORT=3200
> ```
> Or edit `docker-compose.yml` temporarily:
> ```yaml
> services:
>   frontend:
>     ports:
>       - "3200:80"
> ```

---

## 5) Verify

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected:

| Container | Port | Status |
|-----------|------|--------|
| `sales-app-frontend-1` | 3200 | Up |
| `sales-app-backend-1` | 8000 | Up |
| `sales-app-lead_worker-1` | — | Up |
| `sales-app-chromadb-1` | 8100 | Up |

Health checks:

```bash
curl -s http://localhost:8000/health        # backend: {"status":"ok"}
curl -s "http://localhost:8000/api/v1/companies/count"   # reads shared Pharma DB
```

Open in browser: `http://<server-ip>:3200`

> **Note:** The frontend defaults to port 3000 locally. On the dev server, map it to 3200 to avoid conflicts:
> ```yaml
> # docker-compose.yml override on dev server
> services:
>   frontend:
>     ports:
>       - "3200:80"
> ```

---

## 6) (Optional) Nginx Reverse Proxy + HTTPS

For a real dev/staging domain:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

```nginx
# /etc/nginx/sites-available/sales-app
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sales-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS
sudo certbot --nginx -d your-domain.com
```

---

## 7) Operations

### View logs

```bash
docker logs -f sales-app-lead_worker-1  # lead-research Temporal worker
docker logs -f sales-app-backend-1      # backend API
```

### Update after code changes

**CRITICAL NOTE**: The `frontend` and `backend` containers use baked-in images (`COPY . .` in Dockerfile), not live volume mounts. Any time you pull new code or make changes, you **must** rebuild the specific containers for the changes to take effect:

```bash
cd ~/sales-app && git pull
docker compose up -d --build frontend backend
```
*(If you omit `--build`, Docker will just restart the old images without the new code.)*

### Stop everything

```bash
cd ~/sales-app && docker compose down
```

### Reset data (Chromadb volume only — the Pharma DB is remote/shared)

```bash
cd ~/sales-app && docker compose down -v
```

### Restart a single service

```bash
docker compose restart sales-app-lead_worker-1
```

### Check the lead worker is running

```bash
docker logs sales-app-lead_worker-1 | tail -5
# Should show: "Starting sales-app LeadResearch Temporal Worker on 'sales-lead-task-queue'..."
```

---

## Troubleshooting

| Symptom | Fix |
|-----|-----|
| `connection to server at ... failed: Connection timed out` | DB host not reachable from container — check `DATABASE_URL` and firewall to the Pharma host |
| `sales-app-backend-1` keeps restarting | Wait for `chromadb` to start — backend depends on it |
| UI loads but no signal/company data | `DATABASE_URL` wrong, or the Pharma DB has no scraped data yet (`sdr_data` empty) |
| Lead research never completes | Temporal server down, or `sales-app-lead_worker-1` not running; check `TEMPORAL_HOST` / `TEMPORAL_TASK_QUEUE` |
| Worker won't connect to Temporal | Inside containers it must reach `host.docker.internal:7233` (Linux uses `extra_hosts: host.docker.internal:host-gateway` in compose) |
| Build cache bloated | `docker builder prune -af` |
| Out of disk | `docker system prune -af --volumes` (careful — removes unused data) |

---

## 8) Recent Application Features (Changelog)

As of the latest updates, the following features have been integrated into the app:
- **Date Persistence on Quotations**: Quotation dates are now fully manageable and persistently saved in the DB, visible on the quotation form and preview.
- **Dark/Light Theme Toggle**: Implemented a global dark/light mode toggle in the `ProfilePage` using standard Tailwind CSS variables and React Context.
- **Mobile Responsive Enhancements**:
  - `AccountsPage` lists stack elegantly into vertical cards on mobile devices.
  - `AccountDetailPage` action buttons wrap dynamically instead of overflowing.
  - The `WorkflowBoard` inputs and forms are optimized for narrow screens.
- **Dashboard Notifications**: The Dashboard now prominently features real-time dynamic "div boxes" showing the latest global Workflow Alerts and the most recently updated Quotation.
