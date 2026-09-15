# JobTracker

> Private, cross-platform desktop app for tracking your entire job search — from first application to final offer.

<p align="center">
  <img src="apps/desktop/src-tauri/icons/icon.png" alt="JobTracker" width="128" />
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#download">Download</a> ·
  <a href="#self-hosting">Self-Hosting</a> ·
  <a href="#development">Development</a> ·
  <a href="#screenshots">Screenshots</a>
</p>

---

## Why JobTracker?

Spreadsheets break at 20+ applications. JobTracker gives you a **real pipeline** — stage tracking, contact logs, interview questions, CV versioning, and timeline analytics — all in a native desktop app under 10 MB.

- **No AI, no tracking, no subscriptions.** Everything runs on your infrastructure.
- **No accounts or logins.** Security via rotatable API Keys + TLS.
- **Cross-platform.** Windows (.exe), macOS (.dmg), Linux (.AppImage).
- **Local or self-hosted.** SQLite on your machine by default, or sync with your own VPS.

---

## Features

### Offer Management
- Full CRUD with soft delete (nothing is lost)
- Fields: company, position, level, type, modality, salary range, URL, platform, notes
- Bulk import from **LinkedIn, Indeed, OCC, Computrabajo** (paste HTML)
- Filter by text, stage, workspace, level

### Configurable Pipeline
- 8 default stages: Applied > Screening > Technical Interview > Final Interview > Offer > Accepted > Rejected > Withdrawn
- Create, edit, delete, reorder (drag & drop), custom colors
- Full history of stage changes with timestamps and notes

### Offer Detail — 6 Tabs
| Tab | What it does |
|-----|-------------|
| **General** | All offer fields in a clean 2-column layout |
| **History** | Vertical timeline of every stage change |
| **Contacts** | Recruiters and hiring managers — inline search + creation |
| **Calls** | Phone call logs with number, duration, notes |
| **Technologies** | Required / nice-to-have / asked-in-interview tags |
| **Questions** | Interview Q&A with difficulty, category, inline editing |

### Timeline & Analytics
- Chronological view of all events (applications + stage changes)
- Grouped by month
- Stats: total active, in-process, this month, response rate
- Bar chart: applications per week (last 8 weeks)

### CV Manager
- Store LaTeX CV versions as snapshots with labels and notes
- Monaco editor with syntax highlighting
- Associate which CV was sent to each offer
- Track: "Where was this CV used?"

### Workspaces
- Custom views for different job search profiles ("Backend Engineer", "Architect", etc.)
- Saved filters per workspace
- Drag-reorder tabs in sidebar

### API Key Management
- Create, revoke, view last usage
- Raw key shown only once at creation (irreversible)
- Protection: cannot revoke your only active key

---

## Download

Download the latest version from [**Releases**](../../releases):

| Platform | File | Notes |
|----------|------|-------|
| **Windows** | `JobTracker_x.x.x_x64-setup.exe` | Installer (recommended) |
| **Windows** | `JobTracker_x.x.x_x64_en-US.msi` | MSI package |
| **macOS (Apple Silicon)** | `JobTracker_x.x.x_aarch64.dmg` | M1/M2/M3/M4 |
| **macOS (Intel)** | `JobTracker_x.x.x_x64.dmg` | Intel Macs |
| **Linux** | `JobTracker_x.x.x_amd64.AppImage` | Universal (recommended) |
| **Linux** | `JobTracker_x.x.x_amd64.deb` | Debian/Ubuntu |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Desktop App (Tauri v2)                                 │
│  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │  Rust Core   │  │  React 19 + TypeScript          │  │
│  │  (WebView)   │  │  Zustand · Tailwind · Recharts  │  │
│  └──────────────┘  └──────────┬──────────────────────┘  │
└───────────────────────────────┼─────────────────────────┘
                                │ HTTPS + X-API-Key
                                ▼
┌─────────────────────────────────────────────────────────┐
│  API Server (Bun + Hono)                                │
│  22 endpoints · Zod validation · SHA-256 API Keys       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL 16 · Drizzle ORM · 12 tables           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

**Desktop App**

| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2 (Rust + WebView) — native binary < 10 MB |
| UI | React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Editor | Monaco (lazy-loaded) |
| Drag & Drop | @dnd-kit/sortable |
| Local config | tauri-plugin-store |

**Backend API**

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Framework | Hono (14 KB, type-safe) |
| ORM | Drizzle ORM (SQL-first) |
| Database | PostgreSQL 16 |
| Auth | API Keys (SHA-256) |
| Validation | Zod on all endpoints |
| Deploy | Docker Compose |
| Linting | Biome |

---

## Self-Hosting

The desktop app connects to a self-hosted API. You control where your data lives.

**Quick start with Docker Compose** (5 minutes):

```bash
git clone https://github.com/joledev/jobtracker.git
cd jobtracker/services/api

cp .env.example .env
# Edit .env with secure credentials (see below)

docker compose up -d

# Apply migrations
cat drizzle/0000_third_gravity.sql | \
  docker compose exec -T postgres psql -U jobtracker -d jobtracker

# Seed default data
docker compose exec api bun run dist/db/seed.js

# Verify
curl http://localhost:3000/health
```

Generate secure credentials:
```bash
openssl rand -hex 16   # POSTGRES_PASSWORD
openssl rand -hex 32   # MASTER_API_KEY
```

For the full guide (manual install, Kubernetes, TLS, backups, maintenance), see **[docs/SELF-HOSTING.md](docs/SELF-HOSTING.md)**.

---

## Storage Modes

| Mode | Status | Description |
|------|--------|-------------|
| **Local SQLite** | Available (default) | Everything stored locally, zero setup |
| **Remote API** | Available | Connect to your self-hosted API (Docker/VPS) |

In **Settings > Connection** you can switch between local SQLite (default, no server needed) and remote API mode (self-hosted VPS/Docker).

---

## Development

### Prerequisites

- [Rust](https://rustup.rs/) + Cargo
- [Node.js 22+](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [Bun](https://bun.sh/) (for the API)
- [Docker](https://docker.com/) (for the database)

### Setup

```bash
# 1. Start the database
cd services/api
cp .env.example .env
docker compose up -d postgres

# 2. Run migrations + seed
bun install
bun run db:migrate
bun run seed

# 3. Start the API
bun run dev

# 4. Start the desktop app (new terminal)
cd apps/desktop
pnpm install
pnpm tauri dev
```

### Project Structure

```
jobtracker/
├── apps/
│   └── desktop/                 # Tauri v2 + React 19
│       ├── src-tauri/           # Rust backend
│       │   ├── src/             # Commands, IPC
│       │   └── icons/           # App icons (all platforms)
│       └── src/                 # React frontend
│           ├── components/      # UI components (atomic design)
│           ├── pages/           # Route pages
│           ├── stores/          # Zustand state management
│           ├── types/           # TypeScript API contracts
│           └── lib/             # HTTP client, parsers
│
├── services/
│   └── api/                     # Hono + Bun + PostgreSQL
│       ├── src/
│       │   ├── db/              # Drizzle schema + migrations + seed
│       │   ├── middleware/      # API Key auth (SHA-256)
│       │   └── routes/          # 12 route modules
│       ├── drizzle/             # Generated SQL migrations
│       ├── Dockerfile           # Multi-stage build
│       └── docker-compose.yml
│
├── docs/
│   └── SELF-HOSTING.md          # Full deployment guide
│
└── .github/
    └── workflows/
        └── release.yml          # CI/CD: auto-build installers on tag
```

### Build for Production

```bash
cd apps/desktop
pnpm tauri build
# Output:
#   Windows → .exe + .msi
#   macOS   → .dmg + .app
#   Linux   → .deb + .AppImage
```

---

## CI/CD

When you push a git tag (`v*`), GitHub Actions automatically:

1. Builds the desktop app for **Windows, macOS (ARM + Intel), and Linux**
2. Creates a **GitHub Release** with all installers attached
3. Publishes the release

```bash
# Create a release
git tag v1.0.0
git push origin v1.0.0
# → GitHub Actions builds and publishes installers
```

---

## Screenshots

<!-- TODO: Add screenshots of the app -->
<!--
<p align="center">
  <img src="docs/screenshots/offers.png" alt="Offers view" width="800" />
</p>
<p align="center">
  <img src="docs/screenshots/detail.png" alt="Offer detail" width="800" />
</p>
<p align="center">
  <img src="docs/screenshots/timeline.png" alt="Timeline" width="800" />
</p>
<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings" width="800" />
</p>
-->

*Screenshots coming soon.*

---

## Design Decisions

- **No login system.** API Keys are simpler, rotatable, and don't need sessions or refresh tokens.
- **No AI.** All logic is deterministic. Filters, timeline, stats — pure code. Faster, predictable, private.
- **Workspaces = saved views.** One dataset, multiple lenses. "Backend Engineer" and "Architect" are the same PostgreSQL with different filters.
- **CVs = database snapshots.** The full LaTeX source is stored in Postgres. You know exactly which CV you sent to each company.
- **Pipeline is fully configurable.** The 8 default stages are a starting point. Create, delete, reorder, change colors from the UI.
- **Last API Key protection.** You can't revoke your only active key — the server returns 400. Without this, you could lock yourself out.

---

## Roadmap

- [x] **v1.0** — Desktop MVP (offers, pipeline, timeline, contacts, calls, questions, technologies)
- [x] **v1.1** — CV Manager with Monaco editor
- [x] **v2.0** — Local SQLite mode (no VPS required)
- [ ] **v3.0** — Flutter companion app (iOS/Android)
- [ ] **v4.0** — Server management (backups, firewall, stats)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
