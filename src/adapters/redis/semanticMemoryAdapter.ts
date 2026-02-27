import type { RedisClient } from "./client.js";
import type {
  SemanticMemoryPort,
  SemanticSearchHit,
} from "../../ports/semanticMemory.js";
import { semanticConfig } from "../../config.js";
import { buildSemanticKey } from "../../keys.js";

function parseFtSearchReply(reply: unknown): SemanticSearchHit[] {
  if (!Array.isArray(reply) || reply.length < 1) return [];
  if (Number(reply[0]) === 0) return [];
  const hits: SemanticSearchHit[] = [];
  let i = 1;
  while (i < reply.length) {
    const docId = String(reply[i]);
    i += 1;
    const fieldValues = reply[i];
    i += 1;
    const rec: Record<string, string> = {};
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
    hits.push({
      id: docId,
      score: rec["score"] ? parseFloat(rec["score"]) : 0,
      ts: rec["ts"] ?? "",
      content: rec["content"] ?? "",
    });
  }
  return hits;
}

export function createSemanticMemoryAdapter(
  redis: RedisClient
): SemanticMemoryPort {
  const { indexName, vectorDim, distanceMetric } = semanticConfig;
  return {
    async ensureIndex() {
      try {
        await redis.call("FT.INFO", indexName);
        return;
      } catch {
        /* create */
      }
      await redis.call("FT.CREATE", indexName, "ON", "HASH", "PREFIX", "1", "sem:", "SCHEMA", "agent_key", "TAG", "ts", "TEXT", "content", "TEXT", "embedding", "VECTOR", "HNSW", "10", "TYPE", "FLOAT32", "DIM", vectorDim, "DISTANCE_METRIC", distanceMetric);
    },
    async append(agentKey, id, ts, content, embeddingBuf, meta) {
      const key = buildSemanticKey(agentKey, id);
      await redis.hset(key, {
        agent_key: agentKey,
        ts,
        content,
        embedding: embeddingBuf,
        ...(meta && { meta }),
      });
    },
    async search(agentKey, embeddingBuf, topK) {
      const query = `@agent_key:{${agentKey}} => [KNN ${topK} @embedding $vec AS score]`;
      const reply = await redis.call("FT.SEARCH", indexName, query, "PARAMS", "2", "vec", embeddingBuf, "RETURN", "3", "content", "ts", "score", "SORTBY", "score", "DESC");
      return parseFtSearchReply(reply);
    },
  };
}
