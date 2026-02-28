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

const DESCRIPTION_DOC = "TOOL_DESCRIPTION_CONVENTION.md";

function requireToolDescription(
  name: string,
  config: { description?: string; inputSchema: unknown }
): void {
  if (typeof config.description !== "string" || !config.description.trim()) {
    throw new Error(`Tool ${name}: description is required (${DESCRIPTION_DOC}).`);
  }
}

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

  {
    const config = {
      description: "Returns the last N entries from the agent's log for context hydration. Args: agent_key (required), limit (optional, default 5). Use when starting a subagent to recover recent memory.",
      inputSchema: schemas.getRecentContextSchema,
    };
    requireToolDescription("get_recent_context", config);
    server.registerTool(
      "get_recent_context",
      config,
      wrapToolHandler((args) =>
        contextualApp.getRecentContext(
          contextual,
          args.agent_key,
          args.limit
        )
      )
    );
  }
  {
    const config = {
      description: "Appends a step or milestone to the agent's log. Args: agent_key (e.g. MM/DD/YYYY-class), new_entry (text). Use when a subagent finishes (agent_key = MM/DD/YYYY-class) or when the orchestrator closes the flow (e.g. trymellon-orchestrator) so other agents can recover context.",
      inputSchema: schemas.appendContextualMemorySchema,
    };
    requireToolDescription("append_contextual_memory", config);
    server.registerTool(
      "append_contextual_memory",
      config,
      wrapToolHandler((args) =>
        contextualApp.appendContextualMemory(
          contextual,
          args.agent_key,
          args.new_entry
        )
      )
    );
  }
  {
    const config = {
      description: "Returns the full log history for an agent. Args: agent_key (required). Use for orchestrator reports or before calling rollup_memory_segment.",
      inputSchema: schemas.getAllContextSchema,
    };
    requireToolDescription("get_all_context", config);
    server.registerTool(
      "get_all_context",
      config,
      wrapToolHandler((args) =>
        contextualApp.getAllContext(contextual, args.agent_key)
      )
    );
  }
  {
    const config = {
      description: "Stores a memory with an embedding for later semantic search. Args: agent_key, embedding (vector), content, metadata (optional). Requires Redis Stack with vector module.",
      inputSchema: schemas.appendSemanticMemorySchema,
    };
    requireToolDescription("append_semantic_memory", config);
    server.registerTool(
      "append_semantic_memory",
      config,
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
  }
  {
    const config = {
      description: "Searches stored memories by embedding similarity. Args: agent_key, embedding (required), top_k (optional), score_threshold (optional). Requires Redis Stack.",
      inputSchema: schemas.searchSemanticMemorySchema,
    };
    requireToolDescription("search_semantic_memory", config);
    server.registerTool(
      "search_semantic_memory",
      config,
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
  }
  {
    const config = {
      description: "Returns log stats for an agent: entry count and first/last timestamps. Args: agent_key (required). Use to decide whether to call rollup_memory_segment.",
      inputSchema: schemas.getMemoryStatsSchema,
    };
    requireToolDescription("get_memory_stats", config);
    server.registerTool(
      "get_memory_stats",
      config,
      wrapToolHandler((args) =>
        contextualApp.getMemoryStats(contextual, args.agent_key)
      )
    );
  }
  {
    const config = {
      description: "Rolls up old log entries into one summary entry; keeps the most recent keep_last entries. Args: agent_key, summary_entry (required), keep_last (optional, default 20, max 500). Use when the log is too long.",
      inputSchema: schemas.rollupMemorySegmentSchema,
    };
    requireToolDescription("rollup_memory_segment", config);
    server.registerTool(
      "rollup_memory_segment",
      config,
      wrapToolHandler((args) =>
        contextualApp.rollupMemorySegment(
          contextual,
          args.agent_key,
          args.keep_last,
          args.summary_entry
        )
      )
    );
  }
  {
    const config = {
      description: "Stores a temporary value by agent and name; Redis deletes it after TTL seconds. Args: agent_key, name, value, ttl_seconds (optional). Use for handoffs. At flow close: name like session-{session_id}, value = summary + links, ttl_seconds e.g. 86400.",
      inputSchema: schemas.setScratchpadEntrySchema,
    };
    requireToolDescription("set_scratchpad_entry", config);
    server.registerTool(
      "set_scratchpad_entry",
      config,
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
  }
  {
    const config = {
      description: "Reads a value previously stored with set_scratchpad_entry. Args: agent_key, name (required). Returns null if missing or expired.",
      inputSchema: schemas.getScratchpadEntrySchema,
    };
    requireToolDescription("get_scratchpad_entry", config);
    server.registerTool(
      "get_scratchpad_entry",
      config,
      wrapToolHandler((args) =>
        scratchpadApp.getScratchpadEntry(
          scratchpad,
          args.agent_key,
          args.name
        )
      )
    );
  }
  {
    const config = {
      description: "Deletes a scratchpad entry before TTL expiry. Args: agent_key, name (required). Use when closing a flow.",
      inputSchema: schemas.clearScratchpadEntrySchema,
    };
    requireToolDescription("clear_scratchpad_entry", config);
    server.registerTool(
      "clear_scratchpad_entry",
      config,
      wrapToolHandler((args) =>
        scratchpadApp.clearScratchpadEntry(
          scratchpad,
          args.agent_key,
          args.name
        )
      )
    );
  }
  {
    const config = {
      description: "Publishes a message to a channel (Pub/Sub). Args: channel, sender_agent_key, payload (required). Subscribers read it via get_channel_log. Use for light coordination between agents.",
      inputSchema: schemas.publishInteragentMessageSchema,
    };
    requireToolDescription("publish_interagent_message", config);
    server.registerTool(
      "publish_interagent_message",
      config,
      wrapToolHandler((args) =>
        eventsApp.publishInteragentMessage(
          events,
          buildChannelName(args.channel),
          args.sender_agent_key,
          args.payload
        )
      )
    );
  }
  {
    const config = {
      description: "Returns the latest messages published to a channel. Args: channel (required), limit (optional). Pair with publish_interagent_message for agent coordination.",
      inputSchema: schemas.getChannelLogSchema,
    };
    requireToolDescription("get_channel_log", config);
    server.registerTool(
      "get_channel_log",
      config,
      wrapToolHandler((args) =>
        eventsApp.getChannelLog(
          events,
          buildChannelName(args.channel),
          args.limit
        )
      )
    );
  }
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
