import type { RedisClient } from "./redis.js";
import { z } from "zod";
import { type ToolResult } from "./errors.js";
export declare const getMemoryStatsInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
}, z.core.$strip>;
export type GetMemoryStatsInput = z.infer<typeof getMemoryStatsInputSchema>;
export declare function getMemoryStatsTool(redis: RedisClient, { agent_key }: GetMemoryStatsInput): Promise<ToolResult>;
export declare const rollupMemorySegmentInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    keep_last: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    summary_entry: z.ZodString;
}, z.core.$strip>;
export type RollupMemorySegmentInput = z.infer<typeof rollupMemorySegmentInputSchema>;
export declare function rollupMemorySegmentTool(redis: RedisClient, input: RollupMemorySegmentInput): Promise<ToolResult>;
//# sourceMappingURL=rollupTools.d.ts.map