import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { errorToToolResult } from "./errors.js";
import { appendContextualMemoryInputSchema, appendContextualMemoryTool, getAllContextInputSchema, getAllContextTool, getRecentContextInputSchema, getRecentContextTool, } from "./tools.js";
import { appendSemanticMemoryInputSchema, appendSemanticMemoryTool, searchSemanticMemoryInputSchema, searchSemanticMemoryTool, } from "./semanticTools.js";
import { getMemoryStatsInputSchema, getMemoryStatsTool, rollupMemorySegmentInputSchema, rollupMemorySegmentTool, } from "./rollupTools.js";
import { setScratchpadEntryInputSchema, setScratchpadEntryTool, getScratchpadEntryInputSchema, getScratchpadEntryTool, clearScratchpadEntryInputSchema, clearScratchpadEntryTool, } from "./scratchpadTools.js";
import { publishInteragentMessageInputSchema, publishInteragentMessageTool, getChannelLogInputSchema, getChannelLogTool, } from "./pubsubTools.js";
function wrapToolHandler(handler) {
    return async (args) => {
        try {
            return await handler(args);
        }
        catch (error) {
            return errorToToolResult(error);
        }
    };
}
export async function startServer(redis) {
    const server = new McpServer({
        name: "mcp-memory-server",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {
                listChanged: false,
            },
        },
    });
    server.registerTool("get_recent_context", {
        description: "Devuelve las últimas N entradas de la bitácora del agente (hidratación). Por defecto 5.",
        inputSchema: getRecentContextInputSchema,
    }, wrapToolHandler((args) => getRecentContextTool(redis, args)));
    server.registerTool("append_contextual_memory", {
        description: "Registra un nuevo hito o paso en la bitácora del agente (agent_key + new_entry).",
        inputSchema: appendContextualMemoryInputSchema,
    }, wrapToolHandler((args) => appendContextualMemoryTool(redis, args)));
    server.registerTool("get_all_context", {
        description: "Devuelve todo el historial del agente para el orquestador (resumen, reporte).",
        inputSchema: getAllContextInputSchema,
    }, wrapToolHandler((args) => getAllContextTool(redis, args)));
    server.registerTool("append_semantic_memory", {
        description: "Guarda un recuerdo con embedding para búsqueda por similitud (requiere Redis Stack).",
        inputSchema: appendSemanticMemoryInputSchema,
    }, wrapToolHandler((args) => appendSemanticMemoryTool(redis, args)));
    server.registerTool("search_semantic_memory", {
        description: "Busca recuerdos similares por vector (ej. 'última vez que resolví algo parecido').",
        inputSchema: searchSemanticMemoryInputSchema,
    }, wrapToolHandler((args) => searchSemanticMemoryTool(redis, args)));
    server.registerTool("get_memory_stats", {
        description: "Devuelve cantidad de entradas y timestamps primera/última para decidir rollup.",
        inputSchema: getMemoryStatsInputSchema,
    }, wrapToolHandler((args) => getMemoryStatsTool(redis, args)));
    server.registerTool("rollup_memory_segment", {
        description: "Reemplaza entradas antiguas por un único ítem [RESUMEN HISTÓRICO]; conserva los keep_last más recientes.",
        inputSchema: rollupMemorySegmentInputSchema,
    }, wrapToolHandler((args) => rollupMemorySegmentTool(redis, args)));
    server.registerTool("set_scratchpad_entry", {
        description: "Guarda un valor temporal con TTL (ej. 1h). Redis lo borra automáticamente.",
        inputSchema: setScratchpadEntryInputSchema,
    }, wrapToolHandler((args) => setScratchpadEntryTool(redis, args)));
    server.registerTool("get_scratchpad_entry", {
        description: "Lee un scratchpad por agent_key y name.",
        inputSchema: getScratchpadEntryInputSchema,
    }, wrapToolHandler((args) => getScratchpadEntryTool(redis, args)));
    server.registerTool("clear_scratchpad_entry", {
        description: "Borra un scratchpad antes de que expire el TTL.",
        inputSchema: clearScratchpadEntryInputSchema,
    }, wrapToolHandler((args) => clearScratchpadEntryTool(redis, args)));
    server.registerTool("publish_interagent_message", {
        description: "Publica un mensaje en un canal (Pub/Sub). Otros agentes suscritos lo reciben.",
        inputSchema: publishInteragentMessageInputSchema,
    }, wrapToolHandler((args) => publishInteragentMessageTool(redis, args)));
    server.registerTool("get_channel_log", {
        description: "Lee los últimos mensajes del log de un canal (para agentes que no mantienen suscripción).",
        inputSchema: getChannelLogInputSchema,
    }, wrapToolHandler((args) => getChannelLogTool(redis, args)));
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=server.js.map