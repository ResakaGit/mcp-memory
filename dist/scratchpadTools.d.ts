import type { RedisClient } from "./redis.js";
import { z } from "zod";
import { type ToolResult } from "./errors.js";
export declare const setScratchpadEntryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
    value: z.ZodString;
    ttl_seconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SetScratchpadEntryInput = z.infer<typeof setScratchpadEntryInputSchema>;
export declare function setScratchpadEntryTool(redis: RedisClient, input: SetScratchpadEntryInput): Promise<ToolResult>;
export declare const getScratchpadEntryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type GetScratchpadEntryInput = z.infer<typeof getScratchpadEntryInputSchema>;
export declare function getScratchpadEntryTool(redis: RedisClient, { agent_key, name }: GetScratchpadEntryInput): Promise<ToolResult>;
export declare const clearScratchpadEntryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export type ClearScratchpadEntryInput = z.infer<typeof clearScratchpadEntryInputSchema>;
export declare function clearScratchpadEntryTool(redis: RedisClient, { agent_key, name }: ClearScratchpadEntryInput): Promise<ToolResult>;
//# sourceMappingURL=scratchpadTools.d.ts.map