import { z } from "zod";
import { toolErrorResult } from "./errors.js";
import { semanticConfig } from "./config.js";
import { buildSemanticKey } from "./keys.js";
const AGENT_KEY_MAX_LEN = 256;
const agentKeySchema = z
    .string()
    .min(1, "agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
function embeddingToBuffer(embedding) {
    const fa = new Float32Array(embedding);
    return Buffer.from(fa.buffer, fa.byteOffset, fa.byteLength);
}
/**
 * Asegura que el índice RediSearch para memoria semántica existe.
 * Idempotente: si ya existe, no hace nada.
 */
export async function ensureSemanticIndex(redis) {
    const { indexName, vectorDim, distanceMetric } = semanticConfig;
    try {
        await redis.call("FT.INFO", indexName);
        return;
    }
    catch {
        // Index does not exist, create it
    }
    const args = [
        indexName,
        "ON",
        "HASH",
        "PREFIX",
        "1",
        "sem:",
        "SCHEMA",
        "agent_key",
        "TAG",
        "ts",
        "TEXT",
        "content",
        "TEXT",
        "embedding",
        "VECTOR",
        "HNSW",
        "10",
        "TYPE",
        "FLOAT32",
        "DIM",
        vectorDim,
        "DISTANCE_METRIC",
        distanceMetric,
    ];
    await redis.call("FT.CREATE", ...args);
}
// --- append_semantic_memory ---
const metadataSchema = z.record(z.string(), z.string()).optional();
export const appendSemanticMemoryInputSchema = z.object({
    agent_key: agentKeySchema,
    embedding: z.array(z.number()),
    content: z.string().min(1, "content no puede estar vacío"),
    metadata: metadataSchema,
});
function randomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export async function appendSemanticMemoryTool(redis, input) {
    const { agent_key, embedding, content, metadata } = input;
    const dim = semanticConfig.vectorDim;
    if (embedding.length !== dim) {
        return toolErrorResult(`embedding debe tener ${dim} dimensiones, recibido ${embedding.length}`);
    }
    await ensureSemanticIndex(redis);
    const id = randomId();
    const key = buildSemanticKey(agent_key, id);
    const ts = new Date().toISOString();
    const embeddingBuf = embeddingToBuffer(embedding);
    const metaStr = metadata ? JSON.stringify(metadata) : "";
    await redis.hset(key, {
        agent_key,
        ts,
        content,
        embedding: embeddingBuf,
        ...(metaStr && { meta: metaStr }),
    });
    return {
        content: [{ type: "text", text: `Memoria semántica guardada. id=${id}` }],
    };
}
// --- search_semantic_memory ---
export const searchSemanticMemoryInputSchema = z.object({
    agent_key: agentKeySchema,
    embedding: z.array(z.number()),
    top_k: z.number().int().min(1).max(50).optional().default(5),
    score_threshold: z.number().min(0).max(1).optional(),
});
function parseFtSearchReply(reply) {
    if (!Array.isArray(reply) || reply.length < 1)
        return [];
    const count = Number(reply[0]);
    if (count === 0)
        return [];
    const hits = [];
    // Reply: [ count, docId1, [ field1, val1, field2, val2, ... ], docId2, ... ]
    let i = 1;
    while (i < reply.length) {
        const docId = String(reply[i]);
        i += 1;
        const fieldValues = reply[i];
        i += 1;
        const rec = {};
        if (Array.isArray(fieldValues)) {
            for (let j = 0; j < fieldValues.length - 1; j += 2) {
                const k = String(fieldValues[j]);
                const v = fieldValues[j + 1];
                rec[k] =
                    typeof v === "string"
                        ? v
                        : Buffer.isBuffer(v)
                            ? v.toString("utf8")
                            : String(v);
            }
        }
        const score = rec["score"] ? parseFloat(rec["score"]) : 0;
        hits.push({
            id: docId,
            score,
            ts: rec["ts"] ?? "",
            content: rec["content"] ?? "",
        });
    }
    return hits;
}
export async function searchSemanticMemoryTool(redis, input) {
    const { agent_key, embedding, top_k, score_threshold } = input;
    const dim = semanticConfig.vectorDim;
    if (embedding.length !== dim) {
        return toolErrorResult(`embedding debe tener ${dim} dimensiones, recibido ${embedding.length}`);
    }
    await ensureSemanticIndex(redis);
    const indexName = semanticConfig.indexName;
    const vecBuf = embeddingToBuffer(embedding);
    // KNN query: filter by agent_key, then KNN on embedding
    const query = `@agent_key:{${agent_key}} => [KNN ${top_k} @embedding $vec AS score]`;
    const reply = await redis.call("FT.SEARCH", indexName, query, "PARAMS", "2", "vec", vecBuf, "RETURN", "3", "content", "ts", "score", "SORTBY", "score", "DESC");
    const hits = parseFtSearchReply(reply);
    let filtered = hits;
    if (score_threshold != null) {
        filtered = hits.filter((h) => h.score >= score_threshold);
    }
    if (filtered.length === 0) {
        return {
            content: [{ type: "text", text: "No se encontraron recuerdos similares." }],
        };
    }
    const lines = filtered.map((h) => `[score=${h.score.toFixed(4)}] [${h.ts}] ${h.content}`);
    return {
        content: [{ type: "text", text: lines.join("\n") }],
    };
}
//# sourceMappingURL=semanticTools.js.map