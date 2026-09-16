# Self-Hosting Guide

This guide covers how to deploy the JobTracker API on your own server so the desktop app can sync your data.

> **Don't want to self-host?** JobTracker includes a built-in local SQLite mode that stores everything on your machine with zero setup. See [Local Storage Mode](#local-storage-mode) below.

---

## Table of Contents

- [Requirements](#requirements)
- [Option A: Docker Compose (recommended)](#option-a-docker-compose-recommended)
- [Option B: Manual setup with Bun](#option-b-manual-setup-with-bun)
- [Option C: Existing Kubernetes cluster](#option-c-existing-kubernetes-cluster)
- [Connecting the Desktop App](#connecting-the-desktop-app)
- [Maintenance](#maintenance)
- [Local Storage Mode](#local-storage-mode)

---

## Requirements

| Component | Minimum |
|-----------|---------|
| VPS/Server | 1 vCPU, 512 MB RAM, 5 GB disk |
| OS | Ubuntu 22.04+ / Debian 12+ / any Linux with Docker |
| Domain (optional) | For HTTPS via Let's Encrypt |
| Ports | 80/443 (with domain) or any custom port (IP-only) |

---

## Option A: Docker Compose (recommended)

The fastest way. Everything runs in containers — no need to install Bun or PostgreSQL on the host.

### 1. Clone and configure

```bash
# On your server
git clone https://github.com/joledev/jobtracker.git
cd jobtracker/services/api

# Create .env from template
cp .env.example .env
```

Edit `.env` with secure credentials:

```env
# Generate secure values:
#   openssl rand -hex 16   → for POSTGRES_PASSWORD
#   openssl rand -hex 32   → for MASTER_API_KEY

DATABASE_URL=postgresql://jobtracker:YOUR_DB_PASSWORD@postgres:5432/jobtracker
POSTGRES_PASSWORD=YOUR_DB_PASSWORD
MASTER_API_KEY=YOUR_64_CHAR_HEX_KEY
PORT=3000
```

### 2. Start the services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** — database with persistent volume
- **API (Bun + Hono)** — REST API on port 3000
- **Nginx** — reverse proxy (optional, for TLS)

### 3. Run database migrations

```bash
# Apply every migration, not just the first one. Piping 0000 by hand skips
# 0001, which adds the `type`, `updated_at` and `deleted_at` columns that the
# CV manager routes query -- GET /api/cvs fails without them.
docker compose exec api bun run db:migrate
```

### 4. Seed initial data

```bash
docker compose exec api bun run dist/db/seed.js
```

This creates:
- 8 default pipeline stages
- 2 example workspaces
- A bootstrap API key from your `MASTER_API_KEY`

### 5. Verify

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Test with API key
curl -H "X-API-Key: YOUR_MASTER_API_KEY" http://localhost:3000/api/offers
# Expected: []
```

### 6. Expose to the internet

> **The API key travels in the `X-API-Key` header on every single request.**
> Over plain HTTP it is readable by anyone on the path: the coffee-shop Wi-Fi,
> the hotel network, every hop in between. Keys are stored hashed server-side,
> which protects them at rest but does nothing in transit. Use TLS.

**Option 1 — With domain + HTTPS (recommended):**

Point your domain's DNS to your server IP, then configure the included Nginx with certbot or use a reverse proxy like Caddy/Traefik.

Example with Caddy (simpler than Nginx+certbot):

```bash
# Install Caddy
sudo apt install caddy

# /etc/caddy/Caddyfile
jobtracker.yourdomain.com {
    reverse_proxy localhost:3000
}

sudo systemctl restart caddy
# TLS is automatic
```

Your API URL: `https://jobtracker.yourdomain.com`


**Option 2 — Direct, no domain (local network or testing only):**

```yaml
ports:
  - "0.0.0.0:3000:3000"  # was 127.0.0.1:3000:3000
```

Your API URL: `http://YOUR_VPS_IP:3000`

This exposes the API over plain HTTP. Every request carries your API key in
clear text, so only do this on a network you control, or behind a VPN. For
anything reachable from the internet, use Option 1.

**Set `TRUST_PROXY=0` in your `.env` for this option.** Requests reach the API
directly, with no proxy to append the real client address, so any client could
send its own `X-Forwarded-For` and land in a private rate-limit bucket. With
`TRUST_PROXY=0` the limiter uses the TCP peer address, which the client cannot
forge.

---

## Option B: Manual setup with Bun

If you prefer running directly on the host without Docker.

### 1. Install dependencies

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### 2. Create database

```bash
sudo -u postgres psql <<SQL
CREATE USER jobtracker WITH PASSWORD 'your_secure_password';
CREATE DATABASE jobtracker OWNER jobtracker;
SQL
```

### 3. Clone and setup

```bash
git clone https://github.com/joledev/jobtracker.git
cd jobtracker/services/api
bun install

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://jobtracker:your_secure_password@localhost:5432/jobtracker
#   MASTER_API_KEY=<openssl rand -hex 32>
#   PORT=3000
```

### 4. Run migrations and seed

```bash
bun run db:migrate
bun run seed
```

### 5. Run as a service

Create `/etc/systemd/system/jobtracker-api.service`:

```ini
[Unit]
Description=JobTracker API
After=postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/jobtracker/services/api
ExecStart=/home/YOUR_USER/.bun/bin/bun run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now jobtracker-api
```

---

## Option C: Existing Kubernetes cluster

If you already run k3s/k8s with Traefik (like the author does):

1. Build and push the API image:
```bash
cd services/api
docker build -t ghcr.io/YOUR_USER/jobtracker-api:latest .
docker push ghcr.io/YOUR_USER/jobtracker-api:latest
```

2. Create a namespace and deploy PostgreSQL + API as Deployments/Services.

3. Create an Ingress with your domain and cert-manager annotation. Note
`router.entrypoints: websecure`: without it the same Ingress also answers on
port 80, and since the API authenticates with an `X-API-Key` header, anyone
who reaches it over plain HTTP sends that key in the clear.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jobtracker
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
spec:
  ingressClassName: traefik
  rules:
    - host: jobtracker.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: jobtracker-api
                port:
                  number: 3000
  tls:
    - hosts:
        - jobtracker.yourdomain.com
      secretName: jobtracker-tls
```

4. Send port 80 to HTTPS instead of leaving it unanswered, so an old
bookmark or a copied `http://` URL still lands somewhere — just not in the
clear:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: redirect-https
spec:
  redirectScheme:
    scheme: https
    port: "443"
    permanent: true
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jobtracker-http-redirect
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
    # <namespace>-<middleware name>@kubernetescrd
    traefik.ingress.kubernetes.io/router.middlewares: jobtracker-redirect-https@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
    - host: jobtracker.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: jobtracker-api
                port:
                  number: 3000
```

This does not break certificate renewal: cert-manager's HTTP-01 solver
creates its own Ingress for `/.well-known/acme-challenge/...`, and that longer
path wins over the catch-all `/` above.

---

## Connecting the Desktop App

1. Open JobTracker desktop
2. Go to **Settings** > **Connection**
3. Enter your API URL (e.g., `https://jobtracker.yourdomain.com` or `http://YOUR_IP:3000`)
4. Enter your API Key (the `MASTER_API_KEY` you set, or create a new one from the API Keys tab)
5. Click **Test Connection** — you should see a green checkmark

---

## Maintenance

### Backup the database

```bash
# Docker Compose
docker compose exec postgres pg_dump -U jobtracker jobtracker > backup_$(date +%Y%m%d).sql

# Manual install
pg_dump -U jobtracker jobtracker > backup_$(date +%Y%m%d).sql
```

### Restore from backup

```bash
# Docker Compose
cat backup_20260307.sql | docker compose exec -T postgres psql -U jobtracker -d jobtracker

# Manual install
psql -U jobtracker -d jobtracker < backup_20260307.sql
```

### Update the API

```bash
cd jobtracker/services/api
git pull origin main

# Docker Compose
docker compose up -d --build api

# Manual install
bun install
bun run db:migrate
sudo systemctl restart jobtracker-api
```

### Rotate API keys

1. Open the desktop app > **Settings** > **API Keys**
2. Click **Create new key** — copy and save the raw key (shown only once)
3. Update the Connection tab with the new key
4. Revoke the old key

---

## Local Storage Mode

> **Status: Available**

JobTracker includes a **built-in local mode** that stores all data in a SQLite database on your machine:

- **Zero infrastructure** — no VPS, no Docker, no PostgreSQL
- **Works offline** — everything is local to your computer
- **Switch anytime** — start local, move to a VPS later if you want multi-device access

```
┌─────────────────────────────────────────┐
│  JobTracker Desktop                     │
│                                         │
│  ┌─────────────┐   ┌────────────────┐   │
│  │  React UI   │──>│  Data Layer    │   │
│  └─────────────┘   │                │   │
│                     │  Mode: local   │   │
│                     │  └─> SQLite    │   │
│                     │                │   │
│                     │  Mode: remote  │   │
│                     │  └─> HTTP API  │   │
│                     └────────────────┘   │
└─────────────────────────────────────────┘
```

In **Settings > Connection**, choose:
- **Local** — data lives in `jobtracker.db` (SQLite via Tauri plugin). This is the default.
- **Remote API** — connects to your self-hosted API (Docker/VPS)

No migration tool exists yet between modes — they use separate databases.
