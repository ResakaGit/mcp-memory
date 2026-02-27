import type { RedisClient } from "./client.js";
import type { ScratchpadPort } from "../../ports/scratchpad.js";
import { buildScratchKey } from "../../keys.js";

export function createScratchpadAdapter(redis: RedisClient): ScratchpadPort {
  return {
    async set(agentKey, name, value, ttlSeconds) {
      await redis.set(buildScratchKey(agentKey, name), value, "EX", ttlSeconds);
    },
    async get(agentKey, name) {
      return redis.get(buildScratchKey(agentKey, name));
    },
    async clear(agentKey, name) {
      await redis.del(buildScratchKey(agentKey, name));
    },
  };
}
