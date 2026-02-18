# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobTracker is a privacy-first desktop app for tracking job applications, backed by a self-hosted API on a personal VPS with a Flutter companion mobile app. Single-user, no AI logic, purely deterministic. Currently in **design/planning phase** — source code has not been implemented yet.

## Monorepo Structure

- `apps/desktop/` — Tauri v2 (Rust + React 19 + TypeScript + Vite)
- `apps/mobile/` — Flutter 3.x companion app
- `services/api/` — Hono + Bun backend with Drizzle ORM + PostgreSQL 16

## Commands

### API (`services/api/`)
```bash
bun install                # install deps
bun run dev                # dev server with hot reload
bun run db:generate        # generate new Drizzle migrations after schema changes
bun run db:migrate         # apply migrations
bun run db:studio          # Drizzle Studio (DB UI)
bun run build              # production build
bun test                   # all tests
bun test src/routes/offers.test.ts  # single test file
docker compose up -d       # deploy on VPS
```

### Desktop (`apps/desktop/`)
```bash
pnpm install
pnpm tauri dev             # dev mode
pnpm tauri build           # native binary
pnpm test                  # vitest
pnpm vitest run            # all tests
pnpm lint                  # eslint + tsc
```

### Mobile (`apps/mobile/`)
```bash
flutter pub get
flutter run
flutter build apk --release
```

## Architecture

```
Desktop (Tauri) ──HTTPS + X-API-Key──→ Hono API (Bun) ──Drizzle──→ PostgreSQL 16
Flutter (Companion) ──HTTPS + X-API-Key──↗
```

- **Auth:** API Keys hashed with SHA-256 in DB, sent as `X-API-Key` header. No JWT, no login system.
- **State:** Zustand (desktop), Riverpod (mobile)
- **Validation:** Zod schemas on all API endpoints and React forms
- **Styling:** Tailwind CSS v4, dark minimalist theme with muted status colors
- **ORM:** Drizzle (SQL-first, type-safe). Migrations are real SQL files.
- **Desktop config:** `tauri-plugin-store` persists VPS URL, API key, active workspace in `$APPDATA`/`$HOME/.config/jobtracker/`

## Database

Core entities: `offers` (central), `workspaces`, `pipeline_stages`, `offer_status_log`, `contacts`, `offer_contacts`, `phone_calls`, `technologies`, `offer_technologies`, `interview_questions`, `cv_snapshots`, `api_keys`.

All tables use: UUID PKs, `created_at`/`updated_at` timestamps, soft deletes via `deleted_at`.

See `Architecture.md` for the full SQL schema.

## Code Conventions

### TypeScript (API + Desktop)
- Strict mode, single quotes, no semicolons
- Functional patterns — avoid classes
- Zod for all input validation
- Drizzle for all DB access — never raw SQL except in migrations
- Hono RPC for type-safety between API and client when possible

### Rust (Tauri)
- Commands in `src-tauri/src/commands/`
- `Result<T, String>` for frontend serialization
- Config read from `$APPDATA`/`$HOME/.config/jobtracker/`, never hardcoded

### Flutter
- Riverpod for state, feature-first folders in `lib/features/`
- Dio with interceptor for API key injection
- `flutter_secure_storage` for secrets

### SQL / Drizzle
- snake_case tables and columns
- UUIDs as PKs, soft deletes with `deleted_at`

### React Components
- Atomic design: `atoms/` → `molecules/` → `organisms/`
- Zustand stores in `src/stores/`, hooks in `src/hooks/`, API client in `src/lib/api.ts`

## Agent Rules

1. **Never** add AI/ML logic — everything is deterministic
2. **Never** hardcode credentials — always config files or env vars
3. **Always** run `bun run db:generate` after modifying the Drizzle schema
4. **Always** add Zod schemas for each new endpoint
5. Declare new Tauri commands in `tauri.conf.json` allowlist
6. When modifying status palette: update both the DB defaults and CSS variables
7. Tests first for critical business logic (timeline calculations, status validations)
8. CORS: add VPS URL to `tauri.conf.json` → `allowlist.http.scope`

## UI Color Palette

Dark minimalist theme. Base: `#0a0a0a` bg, `#f5f5f5` text. Status colors are muted/opaque (green, yellow, orange, blue, red, gray) and configurable from DB. Full palette defined in `Agents.md`.

## Common Errors

| Error | Fix |
|---|---|
| CORS error in desktop | Add VPS URL to `tauri.conf.json` → `allowlist.http.scope` |
| `relation does not exist` | Run `bun run db:migrate` |
| `401 Unauthorized` | Rotate API key from Settings |
| `Cannot find module` in Rust | Add `pub mod name;` to the corresponding `mod.rs` |

## Implementation Roadmap

Phase 0: Infrastructure (Docker, DB, API skeleton) → Phase 1: MVP (CRUD offers, pipeline, workspaces, timeline) → Phase 2: Flutter companion → Phase 3: CV Manager (LaTeX) → Phase 4: Server management. See `Todo.md` for the full checklist.

## Key Documentation

- `readme.md` — Project overview and stack rationale (Spanish)
- `Architecture.md` — Design decisions, full DB schema, data flows
- `Agents.md` — Developer conventions, API routes, color palette, testing
- `Todo.md` — Implementation checklist by phase
- `Skills and mcps.md` — Recommended Claude Code skills and MCP configs

# CLAUDE.md — JobTracker

Instrucciones específicas para Claude Code trabajando en este proyecto.

> Este archivo complementa AGENTS.md con contexto adicional sobre decisiones y preferencias del proyecto.

---

## Contexto del proyecto

JobTracker es una app de escritorio privada para tracking de búsqueda de empleo. El autor es Joel, Software Architect con experiencia en TypeScript, Rust, Flutter, y Go. Prefiere código limpio, minimalista y funcional. No busca abstracción prematura — código directo que haga lo que tiene que hacer.

**Principio rector:** Con poco código, mucho resultado.

---

## Lo que NO hacer

- No agregar dependencias sin justificar su necesidad
- No crear abstracciones de capa adicionales si no hay más de 2 casos de uso
- No usar `any` en TypeScript — nunca
- No hardcodear strings de URL, keys, o configuración
- No crear clases donde funciones bastan
- No agregar comentarios obvios — el código debe ser autoexplicativo
- No IA, no ML, no embeddings, no clasificadores — pure logic only
- No electron, no Next.js, no frameworks pesados

---

## Preferencias de estilo

```typescript
// ✅ Así sí
const getOffer = async (id: string): Promise<Offer> => {
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1)
  if (!result[0]) throw new Error(`Offer ${id} not found`)
  return result[0]
}

// ❌ Así no
class OfferRepository {
  constructor(private readonly db: Database) {}
  async findById(id: string): Promise<Offer | null> {
    try {
      // Get the offer by ID from the database
      const result = await this.db.select().from(offers).where(eq(offers.id, id))
      return result[0] ?? null
    } catch (error) {
      console.error('Error finding offer', error)
      return null
    }
  }
}
```

---

## Estructura de componentes React

Atomic design simplificado:
- `components/ui/` — átomos puros (Button, Input, Badge, Modal)
- `components/[feature]/` — organismos de feature (OfferCard, TimelineRow, etc.)
- `pages/` — páginas/vistas completas
- `stores/` — Zustand stores por dominio
- `hooks/` — hooks custom reutilizables
- `lib/` — utilidades y cliente HTTP

---

## Manejo de estado con Zustand

```typescript
// Patrón preferido: un store por dominio
import { create } from 'zustand'

interface OffersStore {
  offers: Offer[]
  isLoading: boolean
  fetchOffers: (filters?: OfferFilters) => Promise<void>
  createOffer: (data: CreateOfferInput) => Promise<void>
}

export const useOffersStore = create<OffersStore>((set, get) => ({
  offers: [],
  isLoading: false,
  fetchOffers: async (filters) => {
    set({ isLoading: true })
    const offers = await api.offers.list(filters)
    set({ offers, isLoading: false })
  },
  createOffer: async (data) => {
    const offer = await api.offers.create(data)
    set(state => ({ offers: [offer, ...state.offers] }))
  }
}))
```

---

## API Client pattern

```typescript
// lib/api.ts — cliente tipado simple
const createClient = (baseUrl: string, apiKey: string) => ({
  offers: {
    list: (filters?: OfferFilters) =>
      fetch<Offer[]>(`${baseUrl}/api/offers`, { params: filters }),
    create: (data: CreateOfferInput) =>
      post<Offer>(`${baseUrl}/api/offers`, data),
    // etc.
  }
})
```

---

## Drizzle patterns

```typescript
// ✅ Query preferida en Drizzle
const offersWithStage = await db
  .select({
    id: offers.id,
    company: offers.company,
    position: offers.position,
    stageName: pipelineStages.name,
    stageColor: pipelineStages.color,
  })
  .from(offers)
  .leftJoin(pipelineStages, eq(offers.currentStageId, pipelineStages.id))
  .where(and(
    eq(offers.workspaceId, workspaceId),
    isNull(offers.deletedAt)
  ))
  .orderBy(desc(offers.appliedAt))
```

---

## Tauri Commands pattern

```rust
// src-tauri/src/commands/offers.rs
#[tauri::command]
pub async fn get_offers(
    state: tauri::State<'_, AppState>,
    workspace_id: Option<String>,
) -> Result<Vec<Offer>, String> {
    state.api_client
        .get_offers(workspace_id)
        .await
        .map_err(|e| e.to_string())
}
```

```typescript
// En el frontend
import { invoke } from '@tauri-apps/api/core'
const offers = await invoke<Offer[]>('get_offers', { workspaceId })
```

---

## Flujo de trabajo esperado

Cuando Claude Code trabaje en una nueva feature:

1. Primero crear/actualizar el schema de Drizzle si aplica
2. Generar migración con `bun run db:generate`
3. Crear el route de Hono con validación Zod
4. Actualizar el cliente HTTP en `lib/api.ts`
5. Crear/actualizar el Zustand store
6. Implementar el componente UI
7. Integrar en la página correspondiente

---

## Testing priorities

Testear principalmente:
- Middleware de autenticación (API Key validation)
- Transformaciones de datos del schema (mappers)
- Lógica de filtros de workspaces
- Cálculos de timeline (duraciones por stage)

No es crítico testear:
- Componentes de UI simples
- CRUD endpoints simples sin lógica compleja