import { Redis } from "ioredis";
export type RedisClient = InstanceType<typeof Redis>;
/**
 * Crea un cliente Redis con reconexión y timeout razonables para uso en contenedor/host.
 */
export declare function createRedisClient(url: string): RedisClient;
//# sourceMappingURL=redis.d.ts.map