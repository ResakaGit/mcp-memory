import type { RedisClient } from "./redis.js";
import { z } from "zod";
import { type ToolResult } from "./errors.js";
/**
 * Asegura que el índice RediSearch para memoria semántica existe.
 * Idempotente: si ya existe, no hace nada.
 */
export declare function ensureSemanticIndex(redis: RedisClient): Promise<void>;
export declare const appendSemanticMemoryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    embedding: z.ZodArray<z.ZodNumber>;
    content: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type AppendSemanticMemoryInput = z.infer<typeof appendSemanticMemoryInputSchema>;
export declare function appendSemanticMemoryTool(redis: RedisClient, input: AppendSemanticMemoryInput): Promise<ToolResult>;
export declare const searchSemanticMemoryInputSchema: z.ZodObject<{
    agent_key: z.ZodString;
    embedding: z.ZodArray<z.ZodNumber>;
    top_k: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    score_threshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type SearchSemanticMemoryInput = z.infer<typeof searchSemanticMemoryInputSchema>;
export declare function searchSemanticMemoryTool(redis: RedisClient, input: SearchSemanticMemoryInput): Promise<ToolResult>;
//# sourceMappingURL=semanticTools.d.ts.map