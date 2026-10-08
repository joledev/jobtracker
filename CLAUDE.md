# jobtracker

App de escritorio de un solo usuario para seguir postulaciones de empleo (Tauri 2 + React 19 + TypeScript) con dos modos: SQLite local o una API Hono + Bun + Drizzle sobre PostgreSQL 16 autoalojada. Sin lógica de IA: todo es determinista. Repo público en GitHub (cuenta joledev) desde 2026-09-16; versión 1.1.0.

## Comandos (verificados 2026-10-08)
- Escritorio, desde `apps/desktop/`: `cd apps/desktop && pnpm install --frozen-lockfile`, luego pnpm run lint, pnpm run test:run (vitest), pnpm run build (`tsc -b && vite build`), pnpm run tauri dev y pnpm run tauri build.
- API, desde `services/api/`: bun install, bun run dev (hot reload), bun run check (Biome), bun run typecheck (`tsc --noEmit`), bun run build, bun run check:fix (Biome con --write), bun run db:generate, bun run db:migrate, bun run db:studio (drizzle-kit studio), bun run seed.
- Self-hosting: en `services/api/` copiar `.env.example` a `.env`, `docker compose up -d --build`, luego `docker compose exec api bun run db:migrate` y el seed. Guía completa en `docs/SELF-HOSTING.md`.
- CI (`.github/workflows/ci.yml`, push y PR a main): escritorio (lint, tests, build), API (check, typecheck, build) y un job que levanta el compose, aplica todas las migraciones y llama a la API.
- Release: tag `v*` dispara `.github/workflows/release.yml` (release en draft, binarios Windows, macOS y Linux). Paquete Arch en `packaging/arch/` con makepkg.

## Mapa
- `services/api/src/index.ts`: app Hono, CORS (`CORS_ORIGIN`), cabeceras seguras, montaje de rutas.
- `services/api/src/routes/`: una ruta por archivo; `schemas.ts` son los Zod compartidos; `offer-contacts` y `offer-technologies` salen de `contacts.ts` y `technologies.ts`.
- `services/api/src/middleware/`: `auth.ts` (API key) y `rate-limit.ts`.
- `services/api/src/db/schema.ts` y `services/api/drizzle/`: esquema Drizzle y migraciones SQL 0000 a 0002.
- `apps/desktop/src/lib/api.ts` y `apps/desktop/src/lib/local-db.ts`: los dos clientes que implementan la misma interfaz `ApiClient`.
- `apps/desktop/src/stores/`: Zustand, un store por dominio.
- `apps/desktop/src/lib/parsers/` y `apps/desktop/src/lib/html-extractor/`: importadores de ofertas; ahí viven todas las pruebas.
- `apps/desktop/src-tauri/src/commands.rs` y `lib.rs`: tres comandos (LaTeX y guardar PDF) y el registro en `generate_handler!`.
- `ops/respaldo-jobtracker.sh`: respaldo `pg_dump` a R2, escrito y sin instalar.

## Invariantes y trampas
- Auth: API keys con hash SHA-256 en la cabecera `X-API-Key`; sin JWT ni login. El seed crea la primera clave desde `MASTER_API_KEY`; sin seed todo responde 401.
- Toda funcionalidad va en los dos modos: tabla y migración Drizzle más ruta para el remoto, y la misma operación en `local-db.ts` para SQLite. Olvidar uno deja la pantalla vacía en ese modo.
- `tauri://localhost` debe estar en `CORS_ORIGIN`: sin él la app ve una lista vacía y el servidor no registra error (commit `d05a429`, 2026-09-16). En Tauri 2 no hay `allowlist`.
- Un comando Tauri nuevo se registra en `generate_handler!` de `lib.rs` y sus permisos en `src-tauri/capabilities/default.json`, no en `tauri.conf.json`.
- `TRUST_PROXY` vale 0 sin proxy delante; con 1 y sin proxy el rate limiter se puentea con `X-Forwarded-For` (2026-09-16).
- Tras cambiar el esquema: bun run db:generate y aplicar todas las migraciones; aplicar solo la 0000 rompe las rutas de CVs.
- Soft delete (`deleted_at`) solo en `workspaces`, `cv_snapshots`, `offers` y `reminders`; el resto borra de verdad.
- `phone_calls` es la única fuente de llamadas; `communications` (correo, LinkedIn, WhatsApp) no admite el canal teléfono (2026-09-16).
- En update y delete de hijos de una oferta, `offer_id` va en el WHERE, no solo en la URL.
- La compilación LaTeX corre aislada con bubblewrap en Linux; `--no-shell-escape` no impide leer archivos.
- Las acciones de GitHub van pineadas por SHA con su versión en comentario.
- Validación Zod en cada endpoint; Biome en la API prohíbe `any`.

## Flujo de trabajo
- Rama `main`; los cambios grandes pasaron por PR (#1, 2026-09-15) y el CI de tres jobs debe quedar en verde. Antes de commitear: lint, test:run y build del escritorio; check, typecheck y build de la API.

## Qué no hacer
- No añadir lógica de IA ni dependencias sin justificarlas.
- No escribir credenciales, rutas del servidor ni usuarios reales: el repo es público y su historial ya se purgó una vez (2026-09-16).
- No acceder a la base sin Drizzle salvo en migraciones.
- No usar `docs/internal/Todo.md` como estado: ningún ítem está marcado.

## Dónde está lo demás
- Pendientes: `$SECOND_BRAIN/Bitacora/NEXT/jobtracker.md`.
- Contexto movido de este archivo: `$SECOND_BRAIN/projects/jobtracker/handoff-2026-10-08-contexto-movido-del-claude-md.md`.
- Diseño y rutas: `Architecture.md`, `Agents.md`, `README.md` del repo.
