import { Redis } from "ioredis";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CONNECT_TIMEOUT = 10_000;

export type RedisClient = InstanceType<typeof Redis>;

export function createRedisClient(url: string): RedisClient {
  return new Redis(url, {
    maxRetriesPerRequest: DEFAULT_MAX_RETRIES,
    connectTimeout: DEFAULT_CONNECT_TIMEOUT,
    retryStrategy(times: number) {
      if (times > DEFAULT_MAX_RETRIES) return null;
      return Math.min(times * 200, 2000);
    },
  });
}
