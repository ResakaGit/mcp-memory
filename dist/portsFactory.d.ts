import type { ServerPorts } from "./adapters/mcp/server.js";
export type { ServerPorts };
export interface MemoryPortsResult {
    ports: ServerPorts;
    disconnect: () => void;
}
export declare function createMemoryPorts(redisUrl: string): Promise<MemoryPortsResult>;
//# sourceMappingURL=portsFactory.d.ts.map