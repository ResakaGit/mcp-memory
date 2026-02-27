export function createContextualMemoryAdapter(redis) {
    return {
        async getRecent(agentKey, limit) {
            return redis.lrange(agentKey, -limit, -1);
        },
        async append(agentKey, entryJson) {
            await redis.rpush(agentKey, entryJson);
        },
        async getAll(agentKey) {
            return redis.lrange(agentKey, 0, -1);
        },
        async getStats(agentKey) {
            const len = await redis.llen(agentKey);
            let firstTs = "";
            let lastTs = "";
            if (len > 0) {
                const [first] = await redis.lrange(agentKey, 0, 0);
                const [last] = await redis.lrange(agentKey, -1, -1);
                try {
                    if (first)
                        firstTs = JSON.parse(first).ts ?? "";
                    if (last)
                        lastTs = JSON.parse(last).ts ?? "";
                }
                catch {
                    /* ignore */
                }
            }
            return { len, firstTs, lastTs };
        },
        async rollup(agentKey, keepLast, summaryJson) {
            const tail = await redis.lrange(agentKey, -keepLast, -1);
            const multi = redis.multi();
            multi.del(agentKey);
            multi.rpush(agentKey, summaryJson);
            if (tail.length > 0)
                multi.rpush(agentKey, ...tail);
            await multi.exec();
            return tail.length;
        },
    };
}
//# sourceMappingURL=contextualMemoryAdapter.js.map