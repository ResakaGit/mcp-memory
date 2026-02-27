import { z } from "zod";
export declare const agentKeySchema: z.ZodString;
export declare const getRecentContextSchema: z.ZodObject<{
    agent_key: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const appendContextualMemorySchema: z.ZodObject<{
    agent_key: z.ZodString;
    new_entry: z.ZodString;
}, z.core.$strip>;
export declare const getAllContextSchema: z.ZodObject<{
    agent_key: z.ZodString;
}, z.core.$strip>;
export declare const getMemoryStatsSchema: z.ZodObject<{
    agent_key: z.ZodString;
}, z.core.$strip>;
export declare const rollupMemorySegmentSchema: z.ZodObject<{
    agent_key: z.ZodString;
    keep_last: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    summary_entry: z.ZodString;
}, z.core.$strip>;
export declare const appendSemanticMemorySchema: z.ZodObject<{
    agent_key: z.ZodString;
    embedding: z.ZodArray<z.ZodNumber>;
    content: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export declare const searchSemanticMemorySchema: z.ZodObject<{
    agent_key: z.ZodString;
    embedding: z.ZodArray<z.ZodNumber>;
    top_k: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    score_threshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const setScratchpadEntrySchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
    value: z.ZodString;
    ttl_seconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const getScratchpadEntrySchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const clearScratchpadEntrySchema: z.ZodObject<{
    agent_key: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const publishInteragentMessageSchema: z.ZodObject<{
    channel: z.ZodString;
    sender_agent_key: z.ZodString;
    payload: z.ZodString;
}, z.core.$strip>;
export declare const getChannelLogSchema: z.ZodObject<{
    channel: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map