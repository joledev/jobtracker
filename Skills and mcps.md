# Skills & MCPs — JobTracker

## Skills para Claude Code (skills.sh)

Instalar antes de comenzar a trabajar en el proyecto:

```bash
# UI y frontend
npx skills add anthropics/skills/frontend-design
# → Best practices para UI minimalista, paletas, componentes

npx skills add vercel-labs/agent-skills/vercel-react-best-practices
# → Patterns modernos de React, hooks, performance

npx skills add vercel-labs/agent-skills/web-design-guidelines
# → Principios de diseño aplicables a la UI de la app

# Calidad de código
npx skills add obra/superpowers/systematic-debugging
# → Útil cuando algo falla en la integración Tauri ↔ React ↔ API

npx skills add obra/superpowers/test-driven-development
# → Para el middleware de auth y la lógica de timeline

# Expo skill (para cuando trabajes en Flutter / mobile)
npx skills add expo/skills/building-native-ui
# → Patterns de UI nativa en mobile, aplica a Flutter también
```

---

## MCPs recomendados

Configura estos MCPs en tu `~/.claude/claude_desktop_config.json` (o equivalente para Claude Code).

### 1. PostgreSQL MCP ⭐ Esencial

Permite a Claude Code consultar tu schema real, validar queries, y hacer debugging de la DB directamente.

```json
{
  "mcpServers": {
    "postgres-jobtracker": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://jobtracker_user:tu_password@tu-vps-ip:5432/jobtracker"
      ]
    }
  }
}
```

**Uso típico:**
- "¿Cuál es el schema actual de la tabla `offers`?"
- "¿Qué índices tiene la DB?"
- "Valida que esta query de Drizzle genera el SQL correcto"

---

### 2. Filesystem MCP ⭐ Esencial

Para que Claude Code acceda a tus archivos LaTeX de CVs y los gestione directamente.

```json
{
  "mcpServers": {
    "filesystem-cvs": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/ruta/a/tus/latex/cvs",
        "/ruta/al/proyecto/jobtracker"
      ]
    }
  }
}
```

**Uso típico:**
- Leer tus CVs en LaTeX para crear el snapshot inicial
- Navegar la estructura del proyecto sin tener que copiar/pegar paths

---

### 3. GitHub MCP 🔧 Útil en v2

Cuando implementes el versionado Git de CVs en la Fase 3.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "tu-github-token"
      }
    }
  }
}
```

---

### 4. Brave Search MCP 💡 Opcional

Para que Claude Code busque documentación de Tauri, Hono, Drizzle sin salir del contexto.

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "tu-brave-api-key"
      }
    }
  }
}
```

---

## Config completa para Claude Code

`~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "postgres-jobtracker": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://jobtracker_user:PASSWORD@VPS_IP:5432/jobtracker"
      ]
    },
    "filesystem-jobtracker": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/ruta/local/al/proyecto/jobtracker"
      ]
    }
  }
}
```

> Reemplaza `PASSWORD` y `VPS_IP` con tus valores reales.  
> Si tu VPS tiene firewall, abre el puerto 5432 solo a tu IP local o usa SSH tunnel.

### SSH Tunnel para Postgres (más seguro)

En lugar de exponer el puerto 5432 en el VPS, usa un tunnel:

```bash
# En tu máquina local, antes de trabajar con Claude Code:
ssh -L 5432:localhost:5432 tu-usuario@tu-vps-ip -N &

# Luego en la config del MCP usa:
# postgresql://jobtracker_user:PASSWORD@localhost:5432/jobtracker
```

Esto es más seguro porque el puerto 5432 nunca queda expuesto en internet.