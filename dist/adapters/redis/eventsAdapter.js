import { buildChannelLogKey } from "../../keys.js";
export function createEventsAdapter(redis) {
    return {
        async publish(channelName, message) {
            return redis.publish(channelName, message);
        },
        async appendLog(channelName, message) {
            await redis.rpush(buildChannelLogKey(channelName), message);
        },
        async getLog(channelName, limit) {
            return redis.lrange(buildChannelLogKey(channelName), -limit, -1);
        },
        async trimLog(channelName, maxLen) {
            const key = buildChannelLogKey(channelName);
            const len = await redis.llen(key);
            if (len > maxLen) {
                await redis.ltrim(key, -maxLen, -1);
            }
        },
    };
}
//# sourceMappingURL=eventsAdapter.js.map