# mcp-memory-server

Servidor MCP de **memoria contextual** y avanzada sobre Redis: listas cronológicas, memoria semántica (Redis Stack), rollup de historial, scratchpad con TTL y Pub/Sub inter-agente. Pensado para orquestación de agentes.

## Arquitectura (hexagonal mínima)

- **domain/** — Contrato de resultado (`ToolResult`, `toolErrorResult`, `errorToToolResult`). Sin I/O.
- **ports/** — Interfaces: `ContextualMemoryPort`, `SemanticMemoryPort`, `ScratchpadPort`, `EventPublisherPort`.
- **application/** — Casos de uso que reciben un puerto y devuelven `ToolResult` (formateo y reglas de negocio).
- **adapters/redis/** — Implementación de los puertos con ioredis (y RediSearch para semántica).
- **adapters/mcp/** — Schemas Zod y registro de tools en el servidor MCP; cada tool parsea input y llama al caso de uso con el puerto inyectado.

El entrypoint (`index.ts`) crea el cliente Redis, instancia los adaptadores y arranca el servidor con `startServer(ports)`.

## Herramientas (Tools)

### Memoria cronológica (listas)

| Nombre | Parámetros | Descripción |
|--------|------------|-------------|
| `get_recent_context` | `agent_key`, `limit` (opcional, default 5) | Últimas N entradas de la bitácora (hidratación del agente). |
| `append_contextual_memory` | `agent_key`, `new_entry` | Registra un nuevo hito en la bitácora. |
| `get_all_context` | `agent_key` | Historial completo (para orquestador o resumen). |

### Memoria semántica (Redis Stack; búsqueda por similitud)

| Nombre | Parámetros | Descripción |
|--------|------------|-------------|
| `append_semantic_memory` | `agent_key`, `embedding` (number[]), `content`, `metadata` (opcional) | Guarda un recuerdo con vector para búsqueda asociativa. |
| `search_semantic_memory` | `agent_key`, `embedding`, `top_k` (opcional, default 5), `score_threshold` (opcional) | "Tráeme recuerdos similares a este contexto". |

### Rollup / compresión

| Nombre | Parámetros | Descripción |
|--------|------------|-------------|
| `get_memory_stats` | `agent_key` | Cantidad de entradas y primera/última ts; para decidir cuándo hacer rollup. |
| `rollup_memory_segment` | `agent_key`, `keep_last` (default 20), `summary_entry` | Reemplaza entradas antiguas por un ítem [RESUMEN HISTÓRICO]; el orquestador genera el resumen y pasa el texto. |

### Scratchpad (TTL)

| Nombre | Parámetros | Descripción |
|--------|------------|-------------|
| `set_scratchpad_entry` | `agent_key`, `name`, `value`, `ttl_seconds` (opcional, default 3600) | Guarda dato temporal; Redis lo borra al expirar. |
| `get_scratchpad_entry` | `agent_key`, `name` | Lee un scratchpad. |
| `clear_scratchpad_entry` | `agent_key`, `name` | Borra antes del TTL. |

### Comunicación inter-agente (Pub/Sub)

| Nombre | Parámetros | Descripción |
|--------|------------|-------------|
| `publish_interagent_message` | `channel`, `sender_agent_key`, `payload` | Publica en un canal; agentes suscritos (fuera del MCP) lo reciben. |
| `get_channel_log` | `channel`, `limit` (opcional, default 20) | Lee los últimos mensajes del log del canal (para quien no mantiene suscripción). |

**Nota:** El MCP no mantiene suscripciones; solo publica y escribe en log. La recepción en tiempo real la hace un proceso que ejecute SUBSCRIBE en Redis.

Datos en Redis: listas por `agent_key` con JSON `{ts, entry, type?}`; memoria semántica en hashes con RediSearch; scratchpad en claves con EX; canales con prefijo `channel:`.

## Cómo ejecutar

### Con Cursor (MCP en host, Redis en Docker)

1. Levantar Redis: desde la raíz del repo:
   ```bash
   docker compose up -d redis_db
   ```
2. En `mcp-memory-server`:
   ```bash
   cd mcp-memory-server
   npm install
   npm run build
   ```
3. En `.cursor/mcp.json` (raíz del workspace) añadí el servidor. Reiniciar Cursor tras cambiar `mcp.json`.

### Cursor: uso standalone (repo por separado)

Si este repo se usa solo (sin orquestador), en la raíz del proyecto donde está `mcp-memory-server`:

```bash
npm install && npm run build
```

En `.cursor/mcp.json` del workspace que use este MCP:

```json
"mcp-memory-server": {
  "command": "node",
  "args": ["mcp-memory-server/dist/index.js"],
  "env": {
    "REDIS_URL": "redis://localhost:6379"
  }
}
```

Si el MCP está en otra ruta, ajustá `args` (ej. path absoluto o relativo al cwd de Cursor).

### Todo en Docker

```bash
docker compose up -d
```

El servicio `mcp_memory_server` corre dentro de la red; para uso por stdio desde Cursor hay que ejecutar el MCP en el host (ver arriba).

## Orquestación y prompts de ejemplo

### Prompt para el agente (memoria cronológica)

> Eres un arquitecto experto. Para recordar en qué estás trabajando, usa la herramienta de memoria con la clave `agent:arq_1`. Al empezar, llama a `get_recent_context` con esa clave; cuando completes un paso, usa `append_contextual_memory` con la misma clave y un resumen breve.

### Playbook orquestador (cuándo llamar cada tool)

1. **Hidratación (agente):** `get_recent_context(agent_key, limit)` — solo los últimos 5 (o N) pasos.
2. **Trabajo (agente):** `append_contextual_memory(agent_key, new_entry)` — registrar hitos.
3. **Memoria a largo plazo:** El orquestador (o el agente) genera embeddings y usa `append_semantic_memory`; para recuperar contexto similar, `search_semantic_memory` con el embedding de la consulta actual.
4. **Compresión:** Si `get_memory_stats(agent_key)` devuelve más de 100 entradas, el orquestador puede generar un resumen de las más antiguas y llamar `rollup_memory_segment(agent_key, keep_last: 20, summary_entry: "[RESUMEN HISTÓRICO] ...")`.
5. **Pensamientos efímeros:** El agente usa `set_scratchpad_entry` para cálculos o planes de la tarea actual (TTL ej. 1h); `get_scratchpad_entry` para leer; `clear_scratchpad_entry` si termina antes.
6. **Comunicación:** Un agente publica en `publish_interagent_message(channel: "backend_devs", sender_agent_key, payload)`; otro puede leer el log con `get_channel_log("backend_devs")` si no está suscrito.
7. **Resumen final (orquestador):** `get_all_context(agent_key)` para pasar el historial a otro modelo o resumir.

Referencia de patrones: [.cursor/skills/orchestration-patterns](.cursor/skills/orchestration-patterns/SKILL.md).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `REDIS_URL` | Sí | URL de Redis (ej. `redis://localhost:6379`, en Docker `redis://redis_db:6379`). |
| `SEMANTIC_INDEX_NAME` | No | Nombre del índice RediSearch para memoria semántica (default: `idx:semantic_memory`). |
| `SEMANTIC_VECTOR_DIM` | No | Dimensión del vector de embeddings (default: 1536). |
| `SEMANTIC_DISTANCE_METRIC` | No | Métrica de distancia: COSINE, L2 o IP (default: COSINE). |

**Memoria semántica** requiere **Redis Stack** (RediSearch + Vector Search). El `docker-compose.yml` usa `redis/redis-stack-server:latest`. Si usas Redis sin Stack, las tools de memoria semántica fallarán; el resto (cronológica, scratchpad, pub/sub) funciona con Redis estándar.

No guardar secrets en el repo; documentar aquí y usar `env` en `mcp.json` o en el contenedor.

## Tests y desarrollo

- **Tests:** `npm test` (Vitest; tools con mock de Redis).
- **Desarrollo:** `npm run dev` (tsx watch) con Redis levantado.

## Spec y dependencias

- MCP: [modelcontextprotocol.io/specification/2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- SDK: `@modelcontextprotocol/sdk`
- Redis: `ioredis`; Redis Stack para memoria semántica (RediSearch + Vector Search). Listas, hashes, strings con TTL, Pub/Sub.
