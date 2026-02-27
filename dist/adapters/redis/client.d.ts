import { Redis } from "ioredis";
export type RedisClient = InstanceType<typeof Redis>;
export declare function createRedisClient(url: string): RedisClient;
//# sourceMappingURL=client.d.ts.map