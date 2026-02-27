/**
 * Entrypoint: infra Redis + adaptadores + servidor MCP (hexagonal).
 * Valida dependencias al arranque y emite mensajes accionables para que un LLM pueda sugerir la corrección.
 */
import { createRedisClient } from "./adapters/redis/client.js";
import { createContextualMemoryAdapter } from "./adapters/redis/contextualMemoryAdapter.js";
import { createSemanticMemoryAdapter } from "./adapters/redis/semanticMemoryAdapter.js";
import { createScratchpadAdapter } from "./adapters/redis/scratchpadAdapter.js";
import { createEventsAdapter } from "./adapters/redis/eventsAdapter.js";
import { startServer } from "./adapters/mcp/server.js";
const MCP_NAME = "mcp-memory-server";
function failValidation(title, cause, steps) {
    const lines = [
        `[MCP: ${MCP_NAME}] Validación fallida: ${title}`,
        `Causa: ${cause}`,
        "Para corregir:",
        ...steps.map((s) => `  - ${s}`),
    ];
    console.error(lines.join("\n"));
    process.exit(1);
}
async function main() {
    const url = process.env.REDIS_URL;
    if (!url?.trim()) {
        failValidation("REDIS_URL no definida.", "Variable de entorno obligatoria para conectar a Redis.", [
            "Define REDIS_URL en tu entorno o en .cursor/mcp.json (mcpServers.mcp-memory-server.env.REDIS_URL). Ejemplo: redis://localhost:6379",
            "Si usas el docker-compose de este repo: desde la raíz ejecuta: docker compose -f personal-mcps/docker-compose.yml up -d redis_db",
            "O desde la carpeta personal-mcps/: docker compose up -d redis_db",
            "Alternativa sin docker-compose: docker run -d -p 6379:6379 redis:alpine y usa REDIS_URL=redis://localhost:6379",
        ]);
    }
    let redis;
    try {
        redis = createRedisClient(url);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failValidation("No se pudo crear el cliente Redis.", msg, [
            "Instala dependencias: npm install (ioredis debe estar en package.json).",
            "Si Redis debe ir en otro host, verifica que REDIS_URL sea correcta (ej. redis://host:6379).",
        ]);
    }
    try {
        console.log(`[MCP: ${MCP_NAME}] Usando REDIS_URL=${url}. Configurable en .cursor/mcp.json → mcpServers.mcp-memory-server.env.REDIS_URL`);
        await redis.ping();
    }
    catch (err) {
        redis.disconnect();
        const msg = err instanceof Error ? err.message : String(err);
        failValidation("Redis no está disponible (ping falló).", msg, [
            "Inicia Redis en local: docker run -d -p 6379:6379 redis:alpine (entonces usa REDIS_URL=redis://localhost:6379).",
            "Si usas el docker-compose de este repo: desde la raíz ejecuta docker compose -f personal-mcps/docker-compose.yml up -d redis_db o desde personal-mcps/: docker compose up -d redis_db.",
            "Comprueba que el puerto 6379 esté libre y que REDIS_URL coincida (si el MCP corre en tu host vía Cursor, normalmente redis://localhost:6379).",
        ]);
    }
    const ports = {
        contextual: createContextualMemoryAdapter(redis),
        semantic: createSemanticMemoryAdapter(redis),
        scratchpad: createScratchpadAdapter(redis),
        events: createEventsAdapter(redis),
    };
    await startServer(ports);
}
main().catch((error) => {
    console.error(`[MCP: ${MCP_NAME}]`, error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map