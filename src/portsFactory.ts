/**
 * Factory de puertos para uso standalone o por el orquestador.
 * Crea cliente Redis, hace ping y devuelve los adapters; lanza si falla.
 */
import { createRedisClient } from "./adapters/redis/client.js";
import { createContextualMemoryAdapter } from "./adapters/redis/contextualMemoryAdapter.js";
import { createSemanticMemoryAdapter } from "./adapters/redis/semanticMemoryAdapter.js";
import { createScratchpadAdapter } from "./adapters/redis/scratchpadAdapter.js";
import { createEventsAdapter } from "./adapters/redis/eventsAdapter.js";
import type { ServerPorts } from "./adapters/mcp/server.js";

export type { ServerPorts };

export interface MemoryPortsResult {
  ports: ServerPorts;
  disconnect: () => void;
}

export async function createMemoryPorts(redisUrl: string): Promise<MemoryPortsResult> {
  const redis = createRedisClient(redisUrl);
  try {
    await redis.ping();
  } catch (err) {
    redis.disconnect();
    throw err;
  }
  const ports: ServerPorts = {
    contextual: createContextualMemoryAdapter(redis),
    semantic: createSemanticMemoryAdapter(redis),
    scratchpad: createScratchpadAdapter(redis),
    events: createEventsAdapter(redis),
  };
  return {
    ports,
    disconnect: () => redis.disconnect(),
  };
}
