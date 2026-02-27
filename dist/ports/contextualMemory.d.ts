/**
 * Puerto: memoria contextual (listas por agente).
 * El adaptador Redis implementa con LRANGE/RPUSH/LLEN/MULTI.
 */
export interface ContextualMemoryPort {
    getRecent(agentKey: string, limit: number): Promise<string[]>;
    append(agentKey: string, entryJson: string): Promise<void>;
    getAll(agentKey: string): Promise<string[]>;
    getStats(agentKey: string): Promise<{
        len: number;
        firstTs: string;
        lastTs: string;
    }>;
    rollup(agentKey: string, keepLast: number, summaryJson: string): Promise<number>;
}
//# sourceMappingURL=contextualMemory.d.ts.map