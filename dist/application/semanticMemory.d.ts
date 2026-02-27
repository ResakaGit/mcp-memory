import type { SemanticMemoryPort } from "../ports/semanticMemory.js";
import { type ToolResult } from "../domain/errors.js";
export interface SemanticConfig {
    vectorDim: number;
}
export declare function appendSemanticMemory(port: SemanticMemoryPort, config: SemanticConfig, agentKey: string, embedding: number[], content: string, metadata?: Record<string, string>): Promise<ToolResult>;
export declare function searchSemanticMemory(port: SemanticMemoryPort, config: SemanticConfig, agentKey: string, embedding: number[], topK: number, scoreThreshold?: number): Promise<ToolResult>;
//# sourceMappingURL=semanticMemory.d.ts.map