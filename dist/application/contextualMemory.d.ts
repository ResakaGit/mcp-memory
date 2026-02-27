import type { ContextualMemoryPort } from "../ports/contextualMemory.js";
import type { ToolResult } from "../domain/errors.js";
export declare function getRecentContext(port: ContextualMemoryPort, agentKey: string, limit: number): Promise<ToolResult>;
export declare function appendContextualMemory(port: ContextualMemoryPort, agentKey: string, newEntry: string): Promise<ToolResult>;
export declare function getAllContext(port: ContextualMemoryPort, agentKey: string): Promise<ToolResult>;
export declare function getMemoryStats(port: ContextualMemoryPort, agentKey: string): Promise<ToolResult>;
export declare function rollupMemorySegment(port: ContextualMemoryPort, agentKey: string, keepLast: number, summaryEntry: string): Promise<ToolResult>;
//# sourceMappingURL=contextualMemory.d.ts.map