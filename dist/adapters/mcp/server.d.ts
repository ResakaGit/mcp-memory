import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ContextualMemoryPort } from "../../ports/contextualMemory.js";
import type { SemanticMemoryPort } from "../../ports/semanticMemory.js";
import type { ScratchpadPort } from "../../ports/scratchpad.js";
import type { EventPublisherPort } from "../../ports/events.js";
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
export declare function registerMemoryModuleTools(server: McpServer, ports: ServerPorts): void;
/** Descriptor del módulo para el orquestador. */
export declare const memoryMcpModule: {
    name: string;
    version: string;
    register: typeof registerMemoryModuleTools;
};
export declare function startServer(ports: ServerPorts): Promise<void>;
//# sourceMappingURL=server.d.ts.map