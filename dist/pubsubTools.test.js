import { describe, it, expect } from "vitest";
import { publishInteragentMessageInputSchema, publishInteragentMessageTool, getChannelLogInputSchema, getChannelLogTool, } from "./pubsubTools.js";
function createMockRedis() {
    const published = [];
    const logStore = new Map();
    return {
        published,
        logStore,
        async publish(channel, message) {
            published.push({ channel, message });
            const key = `chanlog:${channel}`;
            let list = logStore.get(key);
            if (!list) {
                list = [];
                logStore.set(key, list);
            }
            list.push(message);
            return 0;
        },
        async rpush(key, ...values) {
            let list = logStore.get(key);
            if (!list) {
                list = [];
                logStore.set(key, list);
            }
            list.push(...values);
            return list.length;
        },
        async llen(key) {
            return (logStore.get(key) ?? []).length;
        },
        async ltrim(key, start, stop) {
            const list = logStore.get(key) ?? [];
            const len = list.length;
            const s = start < 0 ? Math.max(0, len + start) : start;
            const e = stop < 0 ? len + stop + 1 : Math.min(stop + 1, len);
            const trimmed = list.slice(s, e);
            logStore.set(key, trimmed);
        },
        async lrange(key, start, stop) {
            const list = logStore.get(key) ?? [];
            const len = list.length;
            const s = start < 0 ? Math.max(0, len + start) : start;
            const e = stop < 0 ? len + stop + 1 : stop + 1;
            return list.slice(s, e);
        },
        async ping() {
            return "PONG";
        },
        disconnect() { },
    };
}
describe("publish_interagent_message", () => {
    it("publica mensaje y escribe en log", async () => {
        const redis = createMockRedis();
        const input = publishInteragentMessageInputSchema.parse({
            channel: "backend_devs",
            sender_agent_key: "agent:arq_1",
            payload: "Necesito revisión del schema de usuarios",
        });
        const result = await publishInteragentMessageTool(redis, input);
        expect(result.content[0].text).toContain("publicado");
        expect(redis.published.length).toBe(1);
        expect(redis.published[0].channel).toContain("channel:");
        const parsed = JSON.parse(redis.published[0].message);
        expect(parsed.sender_agent_key).toBe("agent:arq_1");
        expect(parsed.payload).toBe("Necesito revisión del schema de usuarios");
    });
});
describe("get_channel_log", () => {
    it("devuelve mensaje cuando no hay log", async () => {
        const redis = createMockRedis();
        const input = getChannelLogInputSchema.parse({
            channel: "empty_channel",
            limit: 10,
        });
        const result = await getChannelLogTool(redis, input);
        expect(result.content[0].text).toContain("No hay mensajes");
    });
    it("devuelve últimos mensajes formateados", async () => {
        const redis = createMockRedis();
        const msg = JSON.stringify({
            ts: "2025-01-01T12:00:00Z",
            sender_agent_key: "agent:1",
            payload: "Hola",
        });
        redis.logStore.set("chanlog:channel:devs", [msg]);
        const input = getChannelLogInputSchema.parse({
            channel: "devs",
            limit: 5,
        });
        const result = await getChannelLogTool(redis, input);
        expect(result.content[0].text).toContain("agent:1");
        expect(result.content[0].text).toContain("Hola");
    });
});
//# sourceMappingURL=pubsubTools.test.js.map