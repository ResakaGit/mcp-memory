import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { errorToToolResult, type ToolResult } from "../../domain/errors.js";
import type { ContextualMemoryPort } from "../../ports/contextualMemory.js";
import type { SemanticMemoryPort } from "../../ports/semanticMemory.js";
import type { ScratchpadPort } from "../../ports/scratchpad.js";
import type { EventPublisherPort } from "../../ports/events.js";
import * as contextualApp from "../../application/contextualMemory.js";
import * as semanticApp from "../../application/semanticMemory.js";
import * as scratchpadApp from "../../application/scratchpad.js";
import * as eventsApp from "../../application/events.js";
import { semanticConfig } from "../../config.js";
import { buildChannelName } from "../../keys.js";
import * as schemas from "./schemas.js";

function wrapToolHandler<TArgs, TResult extends ToolResult>(
  handler: (args: TArgs) => TResult | Promise<TResult>
) {
  return async (args: TArgs): Promise<TResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return errorToToolResult(error) as unknown as TResult;
    }
  };
}

export interface ServerPorts {
  contextual: ContextualMemoryPort;
  semantic: SemanticMemoryPort;
  scratchpad: ScratchpadPort;
  events: EventPublisherPort;
}

/**
 * Registra las tools del mcp-memory-server en un McpServer existente.
 * Usado por el orquestador o por startServer (standalone).
 */
export function registerMemoryModuleTools(server: McpServer, ports: ServerPorts): void {
  const { contextual, semantic, scratchpad, events } = ports;
  const semConfig = { vectorDim: semanticConfig.vectorDim };

  server.registerTool(
    "get_recent_context",
    {
      description: "Devuelve las últimas N entradas de la bitácora del agente (hidratación). Por defecto 5.",
      inputSchema: schemas.getRecentContextSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.getRecentContext(
        contextual,
        args.agent_key,
        args.limit
      )
    )
  );

  server.registerTool(
    "append_contextual_memory",
    {
      description: "Registra un nuevo hito o paso en la bitácora del agente (agent_key + new_entry).",
      inputSchema: schemas.appendContextualMemorySchema,
    },
    wrapToolHandler((args) =>
      contextualApp.appendContextualMemory(
        contextual,
        args.agent_key,
        args.new_entry
      )
    )
  );

  server.registerTool(
    "get_all_context",
    {
      description: "Devuelve todo el historial del agente para el orquestador (resumen, reporte).",
      inputSchema: schemas.getAllContextSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.getAllContext(contextual, args.agent_key)
    )
  );

  server.registerTool(
    "append_semantic_memory",
    {
      description: "Guarda un recuerdo con embedding para búsqueda por similitud (requiere Redis Stack).",
      inputSchema: schemas.appendSemanticMemorySchema,
    },
    wrapToolHandler((args) =>
      semanticApp.appendSemanticMemory(
        semantic,
        semConfig,
        args.agent_key,
        args.embedding,
        args.content,
        args.metadata
      )
    )
  );

  server.registerTool(
    "search_semantic_memory",
    {
      description: "Busca recuerdos similares por vector.",
      inputSchema: schemas.searchSemanticMemorySchema,
    },
    wrapToolHandler((args) =>
      semanticApp.searchSemanticMemory(
        semantic,
        semConfig,
        args.agent_key,
        args.embedding,
        args.top_k,
        args.score_threshold
      )
    )
  );

  server.registerTool(
    "get_memory_stats",
    {
      description: "Devuelve cantidad de entradas y timestamps primera/última para decidir rollup.",
      inputSchema: schemas.getMemoryStatsSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.getMemoryStats(contextual, args.agent_key)
    )
  );

  server.registerTool(
    "rollup_memory_segment",
    {
      description: "Reemplaza entradas antiguas por un único ítem [RESUMEN HISTÓRICO]; conserva los keep_last más recientes.",
      inputSchema: schemas.rollupMemorySegmentSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.rollupMemorySegment(
        contextual,
        args.agent_key,
        args.keep_last,
        args.summary_entry
      )
    )
  );

  server.registerTool(
    "set_scratchpad_entry",
    {
      description: "Guarda un valor temporal con TTL (ej. 1h). Redis lo borra automáticamente.",
      inputSchema: schemas.setScratchpadEntrySchema,
    },
    wrapToolHandler((args) =>
      scratchpadApp.setScratchpadEntry(
        scratchpad,
        args.agent_key,
        args.name,
        args.value,
        args.ttl_seconds
      )
    )
  );

  server.registerTool(
    "get_scratchpad_entry",
    {
      description: "Lee un scratchpad por agent_key y name.",
      inputSchema: schemas.getScratchpadEntrySchema,
    },
    wrapToolHandler((args) =>
      scratchpadApp.getScratchpadEntry(
        scratchpad,
        args.agent_key,
        args.name
      )
    )
  );

  server.registerTool(
    "clear_scratchpad_entry",
    {
      description: "Borra un scratchpad antes de que expire el TTL.",
      inputSchema: schemas.clearScratchpadEntrySchema,
    },
    wrapToolHandler((args) =>
      scratchpadApp.clearScratchpadEntry(
        scratchpad,
        args.agent_key,
        args.name
      )
    )
  );

  server.registerTool(
    "publish_interagent_message",
    {
      description: "Publica un mensaje en un canal (Pub/Sub). Otros agentes suscritos lo reciben.",
      inputSchema: schemas.publishInteragentMessageSchema,
    },
    wrapToolHandler((args) =>
      eventsApp.publishInteragentMessage(
        events,
        buildChannelName(args.channel),
        args.sender_agent_key,
        args.payload
      )
    )
  );

  server.registerTool(
    "get_channel_log",
    {
      description: "Lee los últimos mensajes del log de un canal.",
      inputSchema: schemas.getChannelLogSchema,
    },
    wrapToolHandler((args) =>
      eventsApp.getChannelLog(
        events,
        buildChannelName(args.channel),
        args.limit
      )
    )
  );
}

const MEMORY_MCP_VERSION = "1.0.0";

/** Descriptor del módulo para el orquestador. */
export const memoryMcpModule = {
  name: "mcp-memory-server",
  version: MEMORY_MCP_VERSION,
  register: registerMemoryModuleTools,
};

export async function startServer(ports: ServerPorts): Promise<void> {
  const server = new McpServer(
    { name: memoryMcpModule.name, version: memoryMcpModule.version },
    { capabilities: { tools: { listChanged: false } } }
  );
  registerMemoryModuleTools(server, ports);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
