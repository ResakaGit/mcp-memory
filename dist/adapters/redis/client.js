import { Redis } from "ioredis";
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CONNECT_TIMEOUT = 10_000;
export function createRedisClient(url) {
    return new Redis(url, {
        maxRetriesPerRequest: DEFAULT_MAX_RETRIES,
        connectTimeout: DEFAULT_CONNECT_TIMEOUT,
        retryStrategy(times) {
            if (times > DEFAULT_MAX_RETRIES)
                return null;
            return Math.min(times * 200, 2000);
        },
    });
}
//# sourceMappingURL=client.js.map