import type { RedisClient } from "./redis.js";
import { z } from "zod";
import type { ToolResult } from "./errors.js";
export declare const publishInteragentMessageInputSchema: z.ZodObject<{
    channel: z.ZodString;
    sender_agent_key: z.ZodString;
    payload: z.ZodString;
}, z.core.$strip>;
export type PublishInteragentMessageInput = z.infer<typeof publishInteragentMessageInputSchema>;
export declare function publishInteragentMessageTool(redis: RedisClient, input: PublishInteragentMessageInput): Promise<ToolResult>;
export declare const getChannelLogInputSchema: z.ZodObject<{
    channel: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type GetChannelLogInput = z.infer<typeof getChannelLogInputSchema>;
export declare function getChannelLogTool(redis: RedisClient, { channel, limit }: GetChannelLogInput): Promise<ToolResult>;
//# sourceMappingURL=pubsubTools.d.ts.map