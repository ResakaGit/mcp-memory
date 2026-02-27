/**
 * Puerto: scratchpad efímero (KV con TTL).
 * El adaptador Redis implementa con SET/GET/DEL + EX.
 */
export interface ScratchpadPort {
    set(agentKey: string, name: string, value: string, ttlSeconds: number): Promise<void>;
    get(agentKey: string, name: string): Promise<string | null>;
    clear(agentKey: string, name: string): Promise<void>;
}
//# sourceMappingURL=scratchpad.d.ts.map