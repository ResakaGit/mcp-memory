import { z } from "zod";
import { scratchpadConfig } from "../../config.js";
const AGENT_KEY_MAX_LEN = 256;
const CHANNEL_MAX_LEN = 128;
export const agentKeySchema = z
    .string()
    .min(1, "agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
export const getRecentContextSchema = z.object({
    agent_key: agentKeySchema,
    limit: z.number().int().min(1).max(100).optional().default(5),
});
export const appendContextualMemorySchema = z.object({
    agent_key: agentKeySchema,
    new_entry: z.string().min(1, "new_entry no puede estar vacío"),
});
export const getAllContextSchema = z.object({
    agent_key: agentKeySchema,
});
export const getMemoryStatsSchema = z.object({
    agent_key: agentKeySchema,
});
export const rollupMemorySegmentSchema = z.object({
    agent_key: agentKeySchema,
    keep_last: z.number().int().min(1).max(500).optional().default(20),
    summary_entry: z.string().min(1, "summary_entry no puede estar vacío"),
});
export const appendSemanticMemorySchema = z.object({
    agent_key: agentKeySchema,
    embedding: z.array(z.number()),
    content: z.string().min(1, "content no puede estar vacío"),
    metadata: z.record(z.string(), z.string()).optional(),
});
export const searchSemanticMemorySchema = z.object({
    agent_key: agentKeySchema,
    embedding: z.array(z.number()),
    top_k: z.number().int().min(1).max(50).optional().default(5),
    score_threshold: z.number().min(0).max(1).optional(),
});
const nameSchema = z
    .string()
    .min(1, "name no puede estar vacío")
    .max(128, "name máximo 128 caracteres");
export const setScratchpadEntrySchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
    value: z.string(),
    ttl_seconds: z
        .number()
        .int()
        .min(scratchpadConfig.minTtlSeconds)
        .max(scratchpadConfig.maxTtlSeconds)
        .optional()
        .default(scratchpadConfig.defaultTtlSeconds),
});
export const getScratchpadEntrySchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
});
export const clearScratchpadEntrySchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
});
const channelSchema = z
    .string()
    .min(1, "channel no puede estar vacío")
    .max(CHANNEL_MAX_LEN, `channel máximo ${CHANNEL_MAX_LEN} caracteres`);
export const publishInteragentMessageSchema = z.object({
    channel: channelSchema,
    sender_agent_key: agentKeySchema,
    payload: z.string(),
});
export const getChannelLogSchema = z.object({
    channel: channelSchema,
    limit: z.number().int().min(1).max(100).optional().default(20),
});
//# sourceMappingURL=schemas.js.map