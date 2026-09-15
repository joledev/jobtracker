# TODO — JobTracker

Checklist de implementación por fases. Cada item es una tarea discreta ejecutable por Claude Code o por ti directamente.

---

## Fase 0 — Infraestructura base

### VPS / Backend
- [ ] Crear repo Git con estructura monorepo
- [ ] Setup `services/api/` con Bun + Hono
  - [ ] `package.json` con scripts: `dev`, `build`, `start`, `db:generate`, `db:migrate`, `db:studio`
  - [ ] Configurar TypeScript strict mode
  - [ ] Configurar Biome (linter/formatter, reemplaza ESLint + Prettier con un solo tool)
- [ ] Configurar Drizzle ORM
  - [ ] `drizzle.config.ts` apuntando a `DATABASE_URL` desde `.env`
  - [ ] Crear schema completo en `src/db/schema.ts`
  - [ ] Generar y correr migración inicial
- [ ] Middleware de autenticación por API Key
  - [ ] Función `hashApiKey(key: string): string` con SHA-256
  - [ ] Middleware Hono que valida `X-API-Key` header
  - [ ] Seed inicial: crear una API Key de bootstrap via script `bun run seed`
- [ ] Health check endpoint `GET /health`
- [ ] Dockerfile + docker-compose.yml
  - [ ] Servicio `postgres` con volumen persistente y healthcheck
  - [ ] Servicio `api` con build multi-stage
  - [ ] Servicio `nginx` con reverse proxy + TLS via certbot
- [ ] Variables de entorno documentadas en `.env.example`

### Desktop App (Tauri)
- [ ] Crear proyecto Tauri v2 con React + TypeScript + Vite
  - [ ] `apps/desktop/` como base
  - [ ] Configurar `tauri.conf.json`: nombre, identificador, permisos
- [ ] Instalar y configurar Tailwind CSS v4
- [ ] Instalar Zustand, React Hook Form, Zod, Recharts
- [ ] Crear cliente HTTP en `src/lib/api.ts`
  - [ ] Función base con API Key en headers
  - [ ] Interceptor de errores (401, 404, 500)
  - [ ] Config de URL base leída desde Tauri store
- [ ] Tauri plugin `tauri-plugin-store` para persistir config local
  - [ ] Store: `vps_url`, `api_key`, `active_workspace_id`
- [ ] Setup de rutas con React Router v6
  - [ ] `/` → Offers (workspace activo)
  - [ ] `/timeline` → Timeline global
  - [ ] `/cv` → CV Manager
  - [ ] `/settings` → Settings & Server Config

---

## Fase 1 — MVP Core

### API Routes

**Ofertas:**
- [ ] `POST /api/offers` — crear oferta
- [ ] `GET /api/offers` — listar con filtros (workspace_id, stage_id, search)
- [ ] `GET /api/offers/:id` — detalle completo
- [ ] `PUT /api/offers/:id` — editar oferta
- [ ] `DELETE /api/offers/:id` — soft delete
- [ ] `PATCH /api/offers/:id/status` — cambiar stage + log automático

**Pipeline:**
- [ ] `GET /api/pipeline-stages` — listar stages
- [ ] `POST /api/pipeline-stages` — crear stage
- [ ] `PUT /api/pipeline-stages/:id` — editar (nombre, color, orden)
- [ ] `DELETE /api/pipeline-stages/:id` — borrar (solo si no hay ofertas en ese stage)

**Workspaces:**
- [ ] `GET /api/workspaces` — listar
- [ ] `POST /api/workspaces` — crear
- [ ] `PUT /api/workspaces/:id` — editar (nombre, filtros, color)
- [ ] `DELETE /api/workspaces/:id`

**Timeline:**
- [ ] `GET /api/timeline` — eventos ordenados cronológicamente (filtros: workspace, stage, desde/hasta)

**Contactos:**
- [ ] `GET /api/contacts`
- [ ] `POST /api/contacts`
- [ ] `PUT /api/contacts/:id`
- [ ] `POST /api/offers/:id/contacts` — asociar contacto a oferta

**Llamadas:**
- [ ] `GET /api/offers/:id/calls`
- [ ] `POST /api/offers/:id/calls`

**Tecnologías:**
- [ ] `GET /api/technologies`
- [ ] `POST /api/technologies`
- [ ] `POST /api/offers/:id/technologies`
- [ ] `DELETE /api/offers/:id/technologies/:tech_id`

**Preguntas de entrevista:**
- [ ] `GET /api/offers/:id/questions`
- [ ] `POST /api/offers/:id/questions`
- [ ] `PUT /api/offers/:id/questions/:q_id`
- [ ] `DELETE /api/offers/:id/questions/:q_id`

**API Keys:**
- [ ] `GET /api/apikeys` — listar keys (solo prefix, nunca el hash)
- [ ] `POST /api/apikeys` — crear nueva key (retorna la key RAW solo una vez)
- [ ] `DELETE /api/apikeys/:id` — revocar

### Desktop — Componentes UI

**Layout:**
- [ ] `Sidebar` — lista de workspaces como tabs verticales, nav items
- [ ] `TopBar` — nombre del workspace activo, acciones rápidas
- [ ] `StatusBadge` — muestra el stage con su color opaco configurado
- [ ] `TechTag` — chip de tecnología con categoría

**Vista Offers:**
- [ ] `OffersPage` — contenedor principal
- [ ] `OfferCard` — card compacta para list view (empresa, posición, stage, días, salario)
- [ ] `OfferList` — lista scrollable con filtros
- [ ] `OffersFilterBar` — barra de filtros: stage, modalidad, nivel, search text
- [ ] `NewOfferModal` — formulario crear oferta (React Hook Form + Zod)
- [ ] `EditOfferModal` — mismo form en modo edición

**Vista Offer Detail:**
- [ ] `OfferDetailPage` — layout con tabs internos
- [ ] `OfferInfoTab` — datos generales + edición inline
- [ ] `OfferStatusTab` — historial de cambios de stage como timeline vertical
- [ ] `OfferContactsTab` — lista + agregar contactos
- [ ] `OfferCallsTab` — log de llamadas
- [ ] `OfferQuestionsTab` — preguntas de entrevista + respuestas
- [ ] `OfferTechTab` — tecnologías requeridas/mencionadas

**Vista Timeline:**
- [ ] `TimelinePage` — contenedor
- [ ] `GlobalTimeline` — línea de tiempo horizontal con todas las ofertas
  - [ ] Cada oferta como fila
  - [ ] Puntos de control por stage con tooltip
  - [ ] Filtros de fecha (rango)
  - [ ] Colores por stage actual

**Vista Settings:**
- [ ] `SettingsPage` — tabs: Conexión | Pipeline | API Keys | Workspaces | Tecnologías
- [ ] `ConnectionSettings` — input URL VPS, input API Key, botón "Test conexión"
- [ ] `ApiKeyManager` — lista keys, crear nueva (muestra key raw una sola vez con copy), revocar
- [ ] `PipelineEditor` — drag & drop para reordenar stages, color picker, agregar/eliminar
- [ ] `WorkspaceEditor` — CRUD de workspaces con config de filtros

**Gráficas:**
- [ ] `StageDistributionChart` — pie/donut de ofertas por stage actual
- [ ] `ApplicationsOverTimeChart` — bar chart de aplicaciones por semana/mes
- [ ] `SalaryRangeChart` — scatter o box plot de rangos salariales por posición

---

## Fase 2 — App Flutter Companion

- [ ] Setup proyecto Flutter en `apps/mobile/`
- [ ] Configurar Riverpod
- [ ] Configurar Dio con interceptor de API Key
- [ ] Setup `flutter_secure_storage` para API Key
- [ ] Pantalla de configuración inicial (URL VPS + API Key)
- [ ] Lista de ofertas recientes (read-only por ahora)
- [ ] Quick action: "Log llamada" para una oferta
  - [ ] Selección de oferta (search)
  - [ ] Captura de número, duración, notas
  - [ ] Opción de cambiar stage al guardar
- [ ] Quick action: "Actualizar status" de una oferta
- [ ] Push notifications locales para recordatorios de follow-up

---

## Fase 3 — CV Manager con LaTeX

- [ ] Vista `CVManagerPage` con lista de snapshots
- [ ] Formulario de nuevo snapshot (label, notes, pegar LaTeX source)
- [ ] Editor Monaco integrado para LaTeX (syntax highlighting)
- [ ] Tauri command `compile_latex` que invoca `pdflatex` local
  - [ ] Detección de si pdflatex está instalado
  - [ ] Ejecución async con progress feedback
  - [ ] Retornar PDF como bytes o path temporal
- [ ] Preview del PDF compilado en panel derecho
- [ ] Asociación de CV snapshot a oferta desde `NewOfferModal`
- [ ] Vista "¿Dónde usé este CV?" — lista de ofertas que lo referenciaron

---

## Fase 4 — Server Management

- [ ] Tab "Server" en Settings
- [ ] Stats básicas del servidor (via endpoint especial en la API)
  - [ ] Versión de la app
  - [ ] Total de ofertas, contactos, CVs
  - [ ] Uptime de la API
- [ ] Gestión de firewall (UFW) via SSH desde la app
  - [ ] Listar reglas activas
  - [ ] Agregar/remover IPs de whitelist
  - [ ] Tauri plugin SSH o ejecución de comandos remotos
- [ ] Backup de DB: endpoint que genera dump y lo descarga

---

## Chores / Infra

- [ ] CI/CD: GitHub Actions para build del binario Tauri (Windows, macOS, Linux)
- [ ] Auto-update: Tauri updater con GitHub Releases
- [ ] Logging: structured logs en la API con timestamps
- [ ] Error monitoring: Sentry en API (opcional)
- [ ] Rate limiting en Hono middleware
- [ ] Documentación de API con Scalar o Hono OpenAPI

---

## Definition of Done por feature

Cada feature se considera completa cuando:
1. El endpoint de API tiene schema Zod de validación
2. El componente React tiene tipos TypeScript correctos
3. Los errores se muestran apropiadamente en la UI
4. La feature funciona en los 3 OS (Windows, macOS, Linux)