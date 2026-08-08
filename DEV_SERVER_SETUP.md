# Dev Server Setup Guide

How to deploy both stacks (scrapper + sales app) on a remote dev SSH server.

**Assumptions:**
- Ubuntu 22.04/24.04 LTS, fresh SSH access (root or sudo user)
- Docker Engine + Docker Compose v2 not yet installed
- You have SSH key or password access

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

# clone both repos
git clone git@github.com:ManiGOo/AIVOA-Sentinel-level-1.git scrapper
git clone git@github.com:ManiGOo/LEVEL_2_sales_engine.git sales-app
```

Verify:

```bash
docker --version          # 24+
docker compose version    # 2.x
```

---

## 2) Configure Environment Variables

Both stacks need `.env` files. These are gitignored — create them manually on the server.

### Scrapper stack (`scrapper/.env`)

```bash
cd scrapper

cat > .env <<'EOF'
GROQ_API_KEY=gsk_your_groq_key_here
VIEW_ONLY=false
DATABASE_URL=postgresql://user:password@host:5432/dbname
TAVILY_API_KEY=tvly-your-tavily-key
BACKUP_TAVILY_API_KEY=tvly-your-backup-tavily-key
EOF
```

| Var | Source |
|-----|--------|
| `GROQ_API_KEY` | <https://console.groq.com/keys> |
| `DATABASE_URL` | Your Postgres connection string (remote or hosted) |
| `TAVILY_API_KEY` | <https://app.tavily.com/home> |
| `BACKUP_TAVILY_API_KEY` | Second Tavily key for overflow |
| `VIEW_ONLY` | `false` to enable research/campaign writes |

### Sales app stack (`sales-app/backend/.env`)

```bash
cd sales-app

cat > backend/.env <<'EOF'
DATABASE_URL=postgresql+asyncpg://sales:password@localhost:5432/sales_app
SECRET_KEY=change-me-to-a-random-64-char-string
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=openai/gpt-oss-120b
SENTINEL_MCP_URL=http://app:5000/mcp
SENTINEL_API_URL=http://app:5000
EOF
```

| Var | Notes |
|-----|-------|
| `DATABASE_URL` | Points to the local Postgres container (`db:5432`) — leave as-is |
| `SECRET_KEY` | Generate with `openssl rand -hex 32` |
| `GROQ_API_KEY` | Same key as scrapper, or a separate one |
| `SENTINEL_API_URL` | `http://app:5000` — reaches scrapper via the shared Docker network |

---

## 3) Open Firewall Ports

Expose the ports you need. For a dev server, at minimum:

```bash
# if using ufw
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3000/tcp    # Frontend (React app)
sudo ufw allow 8000/tcp    # Backend API (FastAPI)
sudo ufw allow 5000/tcp    # Scrapper API (optional, direct access)
sudo ufw enable
```

For production, put these behind nginx + HTTPS (see §6).

---

## 4) Build & Start the Stacks

**Order matters:** scrapper first (it creates the `scrapper_default` network), then sales app.

```bash
# 1) scrapper
cd ~/scrapper
docker compose up -d --build

# 2) sales app (joins scrapper_default network)
cd ~/sales-app
docker compose up -d --build
```

One-liner:

```bash
cd ~/scrapper && docker compose up -d --build \
&& cd ~/sales-app && docker compose up -d --build
```

---

## 5) Verify

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected:

| Container | Port | Status |
|-----------|------|--------|
| `scrapper-temporal-1` | 7233, 8233 | Up |
| `scrapper-app-1` | 5000 | Up |
| `scrapper-worker-1` | — | Up |
| `scrapper-enricher-1` | — | Up |
| `sales-app-frontend-1` | 3000 | Up |
| `sales-app-backend-1` | 8000 | Up |
| `sales-app-db-1` | 5434 | Up (healthy) |
| `sales-app-chromadb-1` | 8100 | Up |

Health checks:

```bash
curl -s http://localhost:8000/health        # backend: {"status":"ok"}
curl -s http://localhost:5000/api/v1/companies/count  # scrapper API
```

Open in browser: `http://<server-ip>:3000`

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
        proxy_pass http://localhost:3000;
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
docker logs -f scrapper-enricher-1      # lead research + campaign worker
docker logs -f sales-app-backend-1      # backend API
docker logs -f scrapper-app-1           # scrapper API
```

### Update after code changes

```bash
cd ~/scrapper && git pull && docker compose up -d --build
cd ~/sales-app && git pull && docker compose up -d --build
```

### Stop everything

```bash
cd ~/sales-app && docker compose down
cd ~/scrapper   && docker compose down
```

### Reset all data (including DB volumes)

```bash
cd ~/sales-app && docker compose down -v
cd ~/scrapper   && docker compose down -v
```

### Restart a single service

```bash
docker compose restart scrapper-enricher-1
```

### Check worker is running (lead research / campaigns)

```bash
docker logs scrapper-enricher-1 | tail -5
# Should show: "Starting Temporal Worker for Enrichment on 'enrichment-task-queue'..."
```

---

## Troubleshooting

| Symptom | Fix |
|-----|-----|
| `network scrapper_default not found` | Start scrapper stack first |
| `connection to server at ... failed: Connection timed out` | DB host not reachable from container — check `DATABASE_URL` and firewall |
| `sales-app-backend-1` keeps restarting | DB not healthy yet — `db` container healthcheck gates backend; wait 30s |
| Worker won't connect to Temporal | Check `TEMPORAL_HOST=temporal:7233` in `.env` |
| Build cache bloated | `docker builder prune -af` |
| Out of disk | `docker system prune -af --volumes` (careful — removes unused data) |
