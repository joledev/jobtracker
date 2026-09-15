# Análisis de Arquitectura — JobTracker

## Decisiones de Stack

### ¿Por qué Tauri v2?

Tauri es la opción más inteligente para este caso de uso porque produce binarios nativos reales (no electron con chromium bundleado), pesa menos de 10MB vs los 80-150MB de Electron, tiene acceso directo al sistema de archivos para compilar LaTeX localmente, y Rust ya lo conoces. El frontend en React/TypeScript significa que puedes reusar patterns de tus otros proyectos. Tauri v2 además mejora el sistema de permisos, permitiendo control fino sobre qué puede hacer la app en el OS.

La alternativa sería Electron (más pesado, mismo JS) o Flutter Desktop (podrías compartir código con mobile pero el ecosistema desktop de Flutter todavía es inmaduro para apps complejas). Tauri gana en todos los frentes para este use case.

### ¿Por qué Hono + Bun?

Hono es el framework más minimalista y rápido del ecosistema TypeScript. Literalmente menos de 14KB, cero dependencias externas, y tiene type-safety nativo si usas Hono RPC. Con Bun como runtime eliminas el paso de transpilación — escribes TypeScript y corre directo. Para una API privada con poco tráfico (eres el único usuario) esto es perfecto: código mínimo, performance máxima.

FastAPI en Python sería más familiar si vinieras de ese stack, pero aquí preferimos TypeScript end-to-end para compartir tipos. Go también sería válido dado tu background, pero Hono + Bun te da más velocidad de desarrollo con igual performance para este caso.

### ¿Por qué Drizzle ORM?

Drizzle es el ORM más cercano a SQL puro con type-safety completo. El schema se define en TypeScript y las queries se ven casi idénticas a SQL. No hay "magia" oculta, lo que significa que entiendes exactamente qué query se está ejecutando. Las migraciones son archivos SQL reales que puedes revisar y versionar. Prisma sería la alternativa obvia pero tiene un runtime más pesado y su approach de "generar código" se siente menos transparente.

### ¿Por qué PostgreSQL y no MySQL?

Dado que ya tienes VPS con potencial para MySQL (lo usas en cooperativas), podrías pensar en MySQL. Pero para este proyecto PostgreSQL gana por varias razones: mejor soporte para JSONB (útil para guardar metadata flexible de ofertas), enums nativos (para status del pipeline), mejor performance en queries con JOINs complejos (timelines con múltiples entidades), y el ecosistema Drizzle tiene mejor soporte para features PG-específicas.

### ¿Por qué API Keys y no JWT?

JWT implica un servidor de autorización, refresh tokens, y lógica de sesión. Para una app personal donde eres el único usuario, es overkill. Las API Keys son simples: generas una string aleatoria de 64 chars, la hasheas con SHA-256 en DB, y la incluyes en cada request como header `X-API-Key`. Puedes rotar, revocar y crear nuevas desde la UI de Settings sin tocar código. La seguridad real viene del TLS + restricciones de IP opcionales a nivel firewall (que también configuras desde la app).

---

## Schema de Base de Datos

```sql
-- Workspaces / Tabs personalizados
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- "Backend Engineer", "Arquitecto", etc.
  description TEXT,
  icon TEXT,                                 -- emoji o nombre de icono
  color TEXT,                                -- color del tab
  sort_order INTEGER NOT NULL DEFAULT 0,
  filters JSONB NOT NULL DEFAULT '{}',       -- { level: "senior", type: "remote", ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Pipeline stages configurables
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                        -- "Aplicado", "Screening", etc.
  slug TEXT NOT NULL UNIQUE,                 -- "applied", "screening"
  color TEXT NOT NULL,                       -- hex color para la UI
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE, -- si es estado final (aceptado/rechazado)
  is_positive BOOLEAN,                       -- null=neutral, true=positivo, false=negativo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ofertas de trabajo (entidad central)
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Info básica
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  level TEXT,                                -- "junior", "mid", "senior", "staff", "architect"
  type TEXT,                                 -- "full-time", "contract", "freelance", "part-time"
  modality TEXT,                             -- "remote", "hybrid", "onsite"
  
  -- Económico
  salary_min INTEGER,                        -- en la moneda base
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  salary_period TEXT DEFAULT 'monthly',      -- "monthly", "annual", "hourly"
  
  -- Tracking
  current_stage_id UUID REFERENCES pipeline_stages(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Fuente
  source_url TEXT,                           -- URL de la oferta original
  source_platform TEXT,                      -- "LinkedIn", "Indeed", "referral", etc.
  
  -- CV enviado
  cv_snapshot_id UUID REFERENCES cv_snapshots(id),
  
  -- Workspace assignment
  workspace_id UUID REFERENCES workspaces(id),
  
  -- Notas generales
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Historial de cambios de status
CREATE TABLE offer_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  note TEXT,                                 -- observación del cambio
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contactos (recruiters, hiring managers)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  company TEXT,                              -- puede no coincidir con la empresa de la oferta
  role TEXT,                                 -- "recruiter", "hiring manager", "tech lead"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación ofertas <-> contactos
CREATE TABLE offer_contacts (
  offer_id UUID NOT NULL REFERENCES offers(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  PRIMARY KEY (offer_id, contact_id)
);

-- Llamadas telefónicas recibidas
CREATE TABLE phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  phone_number TEXT,
  contact_id UUID REFERENCES contacts(id),   -- si ya está registrado
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  notes TEXT,
  call_type TEXT DEFAULT 'inbound'           -- "inbound", "outbound"
);

-- Catálogo de tecnologías
CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,                 -- "React", "Go", "PostgreSQL"
  category TEXT,                             -- "frontend", "backend", "db", "cloud", "devops"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación ofertas <-> tecnologías
CREATE TABLE offer_technologies (
  offer_id UUID NOT NULL REFERENCES offers(id),
  technology_id UUID NOT NULL REFERENCES technologies(id),
  context TEXT,                              -- "required", "nice-to-have", "asked-in-interview"
  PRIMARY KEY (offer_id, technology_id)
);

-- Preguntas de entrevista
CREATE TABLE interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id),
  question TEXT NOT NULL,
  my_answer TEXT,
  difficulty TEXT,                           -- "easy", "medium", "hard"
  category TEXT,                             -- "technical", "behavioral", "system-design"
  asked_at TIMESTAMPTZ,                      -- en qué ronda se preguntó
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots de CV en LaTeX
CREATE TABLE cv_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,                       -- "Backend Focus v3", "Arquitecto Feb 2026"
  latex_source TEXT NOT NULL,               -- contenido .tex completo
  compiled_pdf BYTEA,                        -- PDF compilado (opcional, puede ser grande)
  notes TEXT,                                -- qué cambié en esta versión
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys para autenticación
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,                       -- "Desktop App", "Flutter Mobile", "VPS Admin"
  key_hash TEXT NOT NULL UNIQUE,             -- SHA-256 hash de la key real
  key_prefix TEXT NOT NULL,                  -- primeros 8 chars para identificación visual
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                    -- null = no expira
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

---

## Flujo de datos — Caso de uso principal

```
Usuario ve nueva oferta en LinkedIn
         │
         ▼
[Desktop App] → Formulario "Nueva Oferta"
  - empresa, posición, URL, salario
  - selecciona workspace (tab)
  - selecciona stage inicial (default: "Aplicado")
  - elige qué CV snapshot envió
  - añade tecnologías requeridas
         │
         ▼
POST /api/offers → Hono API → Drizzle → PostgreSQL
         │
         ▼
[Desktop App] actualiza UI → oferta aparece en timeline
```

```
Recruiter llama por teléfono
         │
         ▼
[Flutter App] → quick action "Log llamada"
  - número de teléfono
  - oferta relacionada (búsqueda rápida)
  - notas de la llamada
  - cambio de stage (ej: Aplicado → Screening)
         │
         ▼
PATCH /api/offers/:id/status + POST /api/phone-calls
         │
         ▼
[Desktop App] se actualiza en próximo sync/refresh
```

---

## Módulos de la App Desktop

### 1. Offers List / Board
Vista principal por workspace. Puede mostrarse como lista o como kanban por stage. Cada card muestra: empresa, posición, stage actual (con color), días desde aplicación, tecnologías tags, salario.

### 2. Offer Detail
Vista completa de una oferta. Tabs internos: Info General | Timeline de Status | Contactos | Preguntas | Tecnologías | CV enviado.

### 3. Timeline Global
Vista cronológica de todas las ofertas. Filtrable por workspace, stage, tecnología, rango de fechas. Muestra el flujo de cada oferta como línea con puntos de control.

### 4. CV Manager
Lista de snapshots de CV con preview del LaTeX. Editor Monaco integrado para editar el LaTeX. Botón "Compilar" que invoca el compilador LaTeX local vía Tauri command (si está instalado). Metadata: label, fecha, notes, dónde se usó.

### 5. Settings & Server Config
- Conexión a VPS: URL, API Key activa
- Gestión de API Keys: crear, revocar, ver última vez usado
- Pipeline stages: crear, reordenar, cambiar colores
- Tecnologías: gestionar catálogo
- Workspaces: crear, editar, configurar filtros
- Información del servidor (opcional): stats básicas de la DB

---

## Seguridad

### API Key flow
```
[Desktop/Flutter] genera 64 chars random → guarda en local secure storage
                    │
                    ▼ (una sola vez, al crear)
                  POST /api/apikeys
                    │
[API] hashea con SHA-256 → guarda hash en DB
                    │
[Desktop/Flutter] en cada request:
  Header: X-API-Key: <raw-key>
                    │
[API Middleware] hashea el header → compara con DB → autoriza/rechaza
```

### Restricciones adicionales (configurables desde Settings)
- Whitelist de IPs en Nginx config (app envía SSH command al VPS para actualizar)
- Rate limiting por API Key en Hono middleware
- Logs de acceso persistentes para auditoría

---

## Roadmap de features

### MVP (v1.0)
- [ ] CRUD completo de ofertas
- [ ] Pipeline stages configurables
- [ ] Workspaces/tabs como filtros guardados
- [ ] Timeline global
- [ ] Gestión de API Keys desde la app
- [ ] Contactos y phone calls
- [ ] Tecnologías y preguntas de entrevista
- [ ] Settings de conexión a VPS
- [ ] Gráficas básicas (ofertas por stage, por mes)

### v1.1
- [ ] App Flutter companion
- [ ] Sync bidireccional desktop ↔ mobile
- [ ] Notificaciones push mobile (recordatorios de follow-up)
- [ ] Export a CSV/Excel

### v2.0
- [ ] Editor LaTeX integrado (Monaco)
- [ ] Compilador LaTeX local via Tauri (requiere TeX Live instalado)
- [ ] Git integration para CVs (commits automáticos)
- [ ] Estadísticas avanzadas (tasa de respuesta, tiempo promedio por stage)
- [ ] Calendario de seguimientos

### v2.1
- [ ] Configuración de firewall/UFW desde la app via SSH
- [ ] Dashboard de salud del servidor (CPU, RAM, disk)
- [ ] Backup automático de DB desde la app

---

## Skills recomendados para Claude Code

```bash
# Instalar con:
npx skills add <skill>

# Skills útiles para este proyecto:
npx skills add anthropics/skills/frontend-design   # UI minimalista
npx skills add vercel-labs/agent-skills/vercel-react-best-practices
npx skills add obra/superpowers/systematic-debugging
npx skills add obra/superpowers/test-driven-development
npx skills add vercel-labs/agent-skills/web-design-guidelines
```

---

## MCPs útiles

Para trabajar en este proyecto con Claude Code, estos MCPs agregarían valor:

### PostgreSQL MCP
Para que el agente pueda consultar el schema real, correr queries de prueba y validar migraciones directamente.
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/jobtracker"]
    }
  }
}
```

### Filesystem MCP
Para que el agente acceda a tus archivos LaTeX locales y los snapshots de CV.
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/ruta/a/tus/latex/cvs"]
    }
  }
}
```

### GitHub MCP (v2 — cuando integres Git para CVs)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<tu-token>" }
    }
  }
}
```

---

## Performance considerations

- La app desktop no hace polling — usa invalidación de cache manual o WebSocket simple para sync con mobile
- Índices en Postgres: `offers.applied_at`, `offers.current_stage_id`, `offers.workspace_id`, `offer_technologies.technology_id`
- Las queries de timeline usan window functions de Postgres para calcular duración por stage eficientemente
- Los CVs compilados como PDF se guardan como BYTEA solo si el usuario lo solicita — el LaTeX source es lo primario