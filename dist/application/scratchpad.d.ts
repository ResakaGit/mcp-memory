import type { ScratchpadPort } from "../ports/scratchpad.js";
import type { ToolResult } from "../domain/errors.js";
export declare function setScratchpadEntry(port: ScratchpadPort, agentKey: string, name: string, value: string, ttlSeconds: number): Promise<ToolResult>;
export declare function getScratchpadEntry(port: ScratchpadPort, agentKey: string, name: string): Promise<ToolResult>;
export declare function clearScratchpadEntry(port: ScratchpadPort, agentKey: string, name: string): Promise<ToolResult>;
//# sourceMappingURL=scratchpad.d.ts.map