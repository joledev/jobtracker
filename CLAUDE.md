# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobTracker is a privacy-first desktop app for tracking job applications, backed by a self-hosted Hono API on a personal VPS. Single-user, no AI logic, purely deterministic. Author: Joel, Software Architect (TypeScript, Rust, Flutter, Go).

**Guiding principle:** Minimal code, maximum result. No premature abstractions, no classes where functions suffice, no dependencies without justification.

**Status:** Phase 0 (infrastructure) and Phase 1 (MVP) are complete. Phase 3 (CV Manager, offer import, offline mode) is implemented. Phase 2 (Flutter companion) and Phase 4 (server management) are planned but not started. See `Todo.md` for the full checklist.

## Monorepo Structure

- `services/api/` — Hono + Bun backend, Drizzle ORM + PostgreSQL 16
- `apps/desktop/` — Tauri v2 (Rust + React 19 + TypeScript + Vite)
- `apps/mobile/` — Flutter companion (not yet created)

## Commands

### API (`services/api/`)
```bash
bun install                  # install deps
bun run dev                  # dev server with hot reload (--hot)
bun run build                # production build
bun run db:generate          # generate Drizzle migrations after schema changes
bun run db:migrate           # apply migrations
bun run db:studio            # Drizzle Studio (DB UI)
bun run seed                 # seed database
bun run check                # biome lint + format check
bun run check:fix            # biome auto-fix
docker compose up -d         # deploy on VPS (PostgreSQL + API + Nginx)
```

### Desktop (`apps/desktop/`)
```bash
pnpm install
pnpm tauri dev               # dev mode (Vite + Tauri)
pnpm tauri build             # native binary
pnpm test                    # vitest watch mode
pnpm test:run                # vitest single run (all tests)
pnpm lint                    # eslint
```

## Architecture

```
Desktop (Tauri) ──HTTPS + X-API-Key──→ Hono API (Bun) ──Drizzle──→ PostgreSQL 16
       └──── SQLite (offline mode, same ApiClient interface) ──┘
```

- **Auth:** API keys hashed with SHA-256, sent as `X-API-Key` header. No JWT, no login.
- **Dual-mode storage:** Desktop can use remote API (PostgreSQL) or local SQLite — both implement the same `ApiClient` interface (`src/lib/api.ts` vs `src/lib/local-db.ts`).
- **Validation:** Zod schemas on all API endpoints and React forms.
- **ORM:** Drizzle (SQL-first, type-safe). Migrations are real SQL files in `services/api/drizzle/`.
- **Desktop state:** Zustand — one store per domain (`offers`, `cvs`, `pipeline`, `connection`, `ui`, `templates`).
- **Desktop config:** `tauri-plugin-store` persists VPS URL, API key, active workspace.

### API route structure
13 route files in `services/api/src/routes/`: `offers`, `workspaces`, `pipeline-stages`, `contacts`, `calls`, `technologies`, `questions`, `reminders`, `cvs`, `apikeys`, `timeline`, `health`, plus `schemas` (shared zod definitions, not a route). Note that `offer-contacts` and `offer-technologies` are exports of `contacts.ts` and `technologies.ts`, not files of their own.

### Desktop component organization
- `components/ui/` — atoms (Button, Input, Modal, Select, etc.)
- `components/[feature]/` — feature organisms (offers/, cv/, settings/, layout/)
- `pages/` — 5 pages: Offers, OfferDetail, CV, Timeline, Settings
- `lib/parsers/` — job board importers (LinkedIn, Indeed, Computrabajo, OCC, generic)
- `lib/html-extractor/` — CSS selector learning for offer import

### Tauri Rust layer
Minimal — 3 commands in `src-tauri/src/commands.rs`: `check_latex_installed`, `compile_latex` (pdflatex → base64 PDF), `save_pdf_to_disk`. No business logic in Rust.

## Database

Core entities: `offers` (central), `workspaces`, `pipeline_stages`, `offer_status_log`, `contacts`, `offer_contacts`, `phone_calls`, `technologies`, `offer_technologies`, `interview_questions`, `cv_snapshots`, `api_keys`.

All tables: UUID PKs, `created_at`/`updated_at` timestamps, soft deletes via `deleted_at`. Schema in `services/api/src/db/schema.ts`. Full design in `Architecture.md`.

## Code Conventions

### TypeScript (API + Desktop)
- Strict mode, single quotes, no semicolons, tabs (Biome for API, ESLint for desktop)
- Functional patterns — no classes, no `any`
- Zod for all input validation, Drizzle for all DB access (never raw SQL except migrations)

### Hard rules
1. **Never** add AI/ML logic — everything is deterministic
2. **Never** hardcode credentials — always config files or env vars
3. **Never** add dependencies without justification
4. **Always** run `bun run db:generate` after modifying the Drizzle schema
5. **Always** add Zod schemas for each new endpoint
6. Register new Tauri commands in `tauri.conf.json`
7. When modifying status palette: update both DB defaults and CSS variables

### Feature implementation workflow
1. Create/update Drizzle schema if needed
2. Generate migration: `bun run db:generate`
3. Create Hono route with Zod validation
4. Update the API client in `src/lib/api.ts` (and `local-db.ts` if offline mode needs it)
5. Create/update Zustand store
6. Implement UI component
7. Integrate in page

### Testing priorities
Test: auth middleware, data transformations, workspace filters, timeline calculations, parsers.
Skip: simple UI components, basic CRUD without logic.

## Common Errors

| Error | Fix |
|---|---|
| CORS error in desktop | Add VPS URL to `tauri.conf.json` → `allowlist.http.scope` |
| `relation does not exist` | Run `bun run db:migrate` |
| `401 Unauthorized` | Rotate API key from Settings |

## Key Documentation

- `Architecture.md` — Design decisions, full DB schema, data flows
- `Agents.md` — API routes, color palette, developer conventions
- `Todo.md` — Implementation checklist by phase
- `README.md` — Project overview and stack rationale (Spanish)
