import type { RedisClient } from "./client.js";
import type { ContextualMemoryPort } from "../../ports/contextualMemory.js";

export function createContextualMemoryAdapter(redis: RedisClient): ContextualMemoryPort {
  return {
    async getRecent(agentKey: string, limit: number) {
      return redis.lrange(agentKey, -limit, -1);
    },
    async append(agentKey: string, entryJson: string) {
      await redis.rpush(agentKey, entryJson);
    },
    async getAll(agentKey: string) {
      return redis.lrange(agentKey, 0, -1);
    },
    async getStats(agentKey: string) {
      const len = await redis.llen(agentKey);
      let firstTs = "";
      let lastTs = "";
      if (len > 0) {
        const [first] = await redis.lrange(agentKey, 0, 0);
        const [last] = await redis.lrange(agentKey, -1, -1);
        try {
          if (first) firstTs = (JSON.parse(first) as { ts?: string }).ts ?? "";
          if (last) lastTs = (JSON.parse(last) as { ts?: string }).ts ?? "";
        } catch {
          /* ignore */
        }
      }
      return { len, firstTs, lastTs };
    },
    async rollup(agentKey: string, keepLast: number, summaryJson: string) {
      const tail = await redis.lrange(agentKey, -keepLast, -1);
      const multi = redis.multi();
      multi.del(agentKey);
      multi.rpush(agentKey, summaryJson);
      if (tail.length > 0) multi.rpush(agentKey, ...tail);
      await multi.exec();
      return tail.length;
    },
  };
}
