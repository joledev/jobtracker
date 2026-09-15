# AGENTS.md — JobTracker

Guía para agentes de código (Claude Code, Cursor, Copilot, etc.) trabajando en este proyecto.

---

## Estructura del proyecto

Este es un monorepo con tres piezas principales:

- `apps/desktop` — App Tauri (Rust + React + TypeScript)
- `apps/mobile` — App Flutter companion
- `services/api` — Backend Hono + Bun + Drizzle + PostgreSQL

---

## Setup y comandos

### API (services/api)
```bash
cd services/api
bun install               # instalar dependencias
bun run dev               # dev server con hot reload
bun run db:migrate        # correr migraciones de Drizzle
bun run db:studio         # Drizzle Studio (UI de DB)
bun run db:generate       # generar nuevas migraciones
bun run build             # build producción
docker compose up -d      # levantar todo en VPS
```

### Desktop (apps/desktop)
```bash
cd apps/desktop
pnpm install
pnpm tauri dev            # modo desarrollo
pnpm tauri build          # build nativo
pnpm test                 # vitest
pnpm lint                 # eslint + tsc
```

### Mobile (apps/mobile)
```bash
cd apps/mobile
flutter pub get
flutter run
flutter build apk --release
flutter build ios --release
```

---

## Convenciones de código

### TypeScript (API + Desktop frontend)
- TypeScript strict mode siempre
- Single quotes, no semicolons
- Functional patterns — evitar clases salvo excepciones justificadas
- Zod para validación de inputs en API y forms
- Drizzle para **todo** acceso a DB — nunca SQL crudo salvo en migraciones
- Hono RPC para type-safety entre API y cliente cuando sea posible

### Rust (Tauri backend)
- Todos los Tauri commands en `src-tauri/src/commands/`
- Manejo de errores con `Result<T, String>` para serialización simple hacia el frontend
- Config de conexión a VPS en `config.rs` — leer desde archivo en `$APPDATA`/`$HOME/.config/jobtracker/`
- No hardcodear URLs ni API keys — siempre desde config

### Flutter (Mobile)
- Riverpod para estado global
- Feature-first folder structure en `lib/features/`
- Dio con interceptor para inyectar API key en cada request
- `flutter_secure_storage` para guardar API key de forma segura

### SQL / Drizzle Schema
- snake_case para nombres de tablas y columnas
- Timestamps siempre: `created_at`, `updated_at` en cada tabla
- UUIDs como PKs (más seguro para API pública)
- Soft deletes con `deleted_at` nullable en entidades principales

---

## Paleta de colores (UI)

La app usa una estética minimalista. Al trabajar en componentes, respetar esta paleta:

```
Base:
  --bg-primary:    #0a0a0a   (negro casi puro)
  --bg-secondary:  #111111
  --bg-card:       #1a1a1a
  --bg-hover:      #222222
  --border:        #2a2a2a
  --text-primary:  #f5f5f5
  --text-secondary:#888888
  --text-muted:    #555555

Status (opacos/muted):
  --status-applied:    #4a7c59   (verde oscuro)
  --status-screening:  #7c6b2a   (amarillo oscuro)
  --status-interview:  #7c4a2a   (naranja oscuro)
  --status-offer:      #2a5c7c   (azul oscuro)
  --status-rejected:   #7c2a2a   (rojo oscuro)
  --status-accepted:   #2a7c4a   (verde claro oscuro)
  --status-withdrawn:  #444444   (gris)
```

Los status colors son configurables desde la DB — esta es la paleta default.

---

## Schema de base de datos (referencia rápida)

```sql
-- Tablas principales
workspaces          -- tabs/vistas configurables
offers              -- ofertas de trabajo
offer_status_log    -- historial de cambios de status
contacts            -- recruiters / contactos
offer_contacts      -- relación N:M offers <-> contacts
phone_calls         -- llamadas recibidas por oferta
technologies        -- catálogo de tecnologías
offer_technologies  -- relación N:M offers <-> technologies
interview_questions -- preguntas de entrevista + respuestas
cv_snapshots        -- versiones del CV en LaTeX
api_keys            -- API keys para autenticación
pipeline_stages     -- stages configurables del pipeline
workspace_filters   -- configuración de filtros por workspace
```

---

## Rutas de la API

```
GET     /health
POST    /api/offers
GET     /api/offers
GET     /api/offers/:id
PUT     /api/offers/:id
DELETE  /api/offers/:id
PATCH   /api/offers/:id/status

GET     /api/timeline
GET     /api/workspaces
POST    /api/workspaces
PUT     /api/workspaces/:id

POST    /api/cvs
GET     /api/cvs
GET     /api/cvs/:id

POST    /api/apikeys
GET     /api/apikeys
DELETE  /api/apikeys/:id

GET     /api/pipeline-stages
POST    /api/pipeline-stages
PUT     /api/pipeline-stages/:id
```

---

## Reglas para el agente

1. **Nunca** añadir lógica de IA o modelos de lenguaje — todo es lógica determinista
2. **Nunca** hardcodear credenciales — siempre config files o env vars
3. **Siempre** correr `bun run db:generate` después de modificar el schema de Drizzle
4. **Siempre** añadir tipos Zod para cada nuevo endpoint
5. Al agregar un nuevo Tauri command: declararlo en `tauri.conf.json` bajo `allowlist`
6. Los componentes React siguen atomic design: `atoms/` → `molecules/` → `organisms/`
7. Al modificar la paleta de status: actualizar tanto la DB default como los CSS vars
8. **Tests primero** para lógica de negocio crítica (cálculo de timelines, validaciones de status)

---

## Testing

### API
```bash
bun test                          # todos los tests
bun test src/routes/offers.test.ts # test específico
```

### Desktop
```bash
pnpm vitest run                   # todos
pnpm vitest run --reporter=verbose
```

---

## Docker Compose (VPS)

El `docker-compose.yml` en `services/api/` levanta:
- `postgres` — PostgreSQL 16 con volumen persistente
- `api` — Hono/Bun app compilada
- `nginx` — Reverse proxy con TLS (certbot)

Para producción, la API escucha solo en `localhost:3000` y Nginx expone el 443.

---

## Errores comunes

| Error | Causa | Fix |
|---|---|---|
| `CORS error en desktop` | Tauri bloquea requests a hosts no declarados | Añadir VPS URL en `tauri.conf.json` → `allowlist.http.scope` |
| `relation does not exist` | Migración no aplicada | `bun run db:migrate` |
| `401 Unauthorized` | API Key incorrecta o expirada | Rotar key desde Settings en la app |
| `Cannot find module` en Rust | Falta declarar módulo en `mod.rs` | Añadir `pub mod nombre;` al mod correspondiente |