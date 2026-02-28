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
      description: "Devuelve las últimas N entradas de la bitácora del agente para hidratar contexto. Parámetros: agent_key (identificador del agente), limit (opcional, por defecto 5). Usar al iniciar un subagente para recuperar memoria reciente.",
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
      description: "Registra un nuevo hito o paso en la bitácora del agente. Parámetros: agent_key (ej. MM/DD/YYYY-clase), new_entry (texto del paso). Usar al finalizar un subagente (agent_key = MM/DD/YYYY-clase) o por el orquestador al cierre del flujo (agent_key del flujo, ej. trymellon-orchestrator) para que otros agentes o sesiones recuperen el contexto.",
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
      description: "Devuelve todo el historial de la bitácora del agente. Parámetro: agent_key. Usar para reportes del orquestador o antes de un rollup.",
      inputSchema: schemas.getAllContextSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.getAllContext(contextual, args.agent_key)
    )
  );

  server.registerTool(
    "append_semantic_memory",
    {
      description: "Guarda un recuerdo con embedding para búsqueda semántica posterior. Parámetros: agent_key, embedding (vector), content, metadata (opcional). Requiere Redis Stack con módulo vector.",
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
      description: "Busca recuerdos almacenados por similitud de embedding. Parámetros: agent_key, embedding, top_k (opcional), score_threshold (opcional). Requiere Redis Stack.",
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
      description: "Devuelve estadísticas de la bitácora del agente: número de entradas y timestamps primera/última. Parámetro: agent_key. Usar para decidir si ejecutar rollup_memory_segment.",
      inputSchema: schemas.getMemoryStatsSchema,
    },
    wrapToolHandler((args) =>
      contextualApp.getMemoryStats(contextual, args.agent_key)
    )
  );

  server.registerTool(
    "rollup_memory_segment",
    {
      description: "Consolida entradas antiguas en un único ítem de resumen y mantiene las keep_last más recientes. Parámetros: agent_key, summary_entry, keep_last (opcional, default 20, máx 500). Reduce ruido en bitácoras largas.",
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
      description: "Guarda un valor temporal por agente y nombre, con TTL en segundos (Redis borra al expirar). Parámetros: agent_key, name, value, ttl_seconds (opcional, default desde config). Útil para handoffs entre agentes. En cierre de flujo orquestado: name tipo session-{session_id}, value = resumen + enlaces; ttl_seconds según necesidad (ej. 86400).",
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
      description: "Lee un valor temporal previamente guardado con set_scratchpad_entry. Parámetros: agent_key, name. Devuelve null si no existe o expiró.",
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
      description: "Elimina una entrada del scratchpad antes de que expire el TTL. Parámetros: agent_key, name. Útil al cerrar un flujo.",
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
      description: "Publica un mensaje en un canal (Pub/Sub). Parámetros: channel, sender_agent_key, payload. Los agentes que lean get_channel_log verán el mensaje. Coordinación ligera entre agentes.",
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
      description: "Lee los últimos mensajes publicados en un canal (Pub/Sub). Parámetros: channel, limit (opcional). Complementa publish_interagent_message para coordinación entre agentes.",
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
