import type { EventPublisherPort } from "../ports/events.js";
import type { ToolResult } from "../domain/errors.js";
export declare function publishInteragentMessage(port: EventPublisherPort, channelName: string, senderAgentKey: string, payload: string): Promise<ToolResult>;
export declare function getChannelLog(port: EventPublisherPort, channelName: string, limit: number): Promise<ToolResult>;
//# sourceMappingURL=events.d.ts.map