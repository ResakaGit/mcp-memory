import type { RedisClient } from "./redis.js";
import { z } from "zod";
import { type ToolResult } from "./errors.js";
export declare const getRecentContextInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type GetRecentContextInput = z.infer<typeof getRecentContextInputSchema>;
export declare function getRecentContextTool(redis: RedisClient, { agent_key, limit }: GetRecentContextInput): Promise<ToolResult>;
export declare const appendContextualMemoryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    new_entry: z.ZodString;
}, z.core.$strip>;
export type AppendContextualMemoryInput = z.infer<typeof appendContextualMemoryInputSchema>;
export declare function appendContextualMemoryTool(redis: RedisClient, { agent_key, new_entry }: AppendContextualMemoryInput): Promise<ToolResult>;
export declare const getAllContextInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
}, z.core.$strip>;
export type GetAllContextInput = z.infer<typeof getAllContextInputSchema>;
export declare function getAllContextTool(redis: RedisClient, { agent_key }: GetAllContextInput): Promise<ToolResult>;
//# sourceMappingURL=tools.d.ts.map