import { describe, it, expect } from "vitest";
import { getMemoryStatsInputSchema, getMemoryStatsTool, rollupMemorySegmentInputSchema, rollupMemorySegmentTool, } from "./rollupTools.js";
function createMockRedis() {
    const list = [];
    const execCalls = [];
    return {
        list,
        execCalls,
        async llen(key) {
            return list.length;
        },
        async lrange(_key, start, stop) {
            const len = list.length;
            const s = start < 0 ? Math.max(0, len + start) : start;
            const e = stop < 0 ? len + stop + 1 : stop + 1;
            return list.slice(s, e);
        },
        multi() {
            return {
                del(_k) {
                    execCalls.push(["del"]);
                    list.length = 0;
                },
                rpush(_k, ...vals) {
                    execCalls.push(["rpush", ...vals]);
                    list.push(...vals);
                },
                async exec() {
                    return [];
                },
            };
        },
        async rpush() {
            return list.length;
        },
        async ping() {
            return "PONG";
        },
        disconnect() { },
    };
}
describe("get_memory_stats", () => {
    it("devuelve 0 entradas cuando la lista está vacía", async () => {
        const redis = createMockRedis();
        const input = getMemoryStatsInputSchema.parse({ agent_key: "agent:1" });
        const result = await getMemoryStatsTool(redis, input);
        expect(result.content[0].text).toContain("Entradas: 0");
    });
    it("incluye primera y última ts cuando hay entradas", async () => {
        const redis = createMockRedis();
        redis.list.push(JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "A" }), JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "B" }));
        const input = getMemoryStatsInputSchema.parse({ agent_key: "agent:1" });
        const result = await getMemoryStatsTool(redis, input);
        expect(result.content[0].text).toContain("Entradas: 2");
        expect(result.content[0].text).toContain("2025-01-01T10:00:00Z");
        expect(result.content[0].text).toContain("2025-01-01T11:00:00Z");
    });
});
describe("rollup_memory_segment", () => {
    it("reemplaza lista por resumen + últimos N", async () => {
        const redis = createMockRedis();
        redis.list.push(JSON.stringify({ ts: "2025-01-01T09:00:00Z", entry: "old1" }), JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "old2" }), JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "recent" }));
        const input = rollupMemorySegmentInputSchema.parse({
            agent_key: "agent:1",
            keep_last: 2,
            summary_entry: "[RESUMEN HISTÓRICO] Trabajo previo completado.",
        });
        const result = await rollupMemorySegmentTool(redis, input);
        expect("isError" in result ? result.isError : undefined).toBeFalsy();
        expect(result.content[0].text).toContain("1 entrada de resumen");
        expect(result.content[0].text).toContain("2 recientes");
        expect(redis.list.length).toBe(3);
        const first = JSON.parse(redis.list[0]);
        expect(first.type).toBe("ROLLUP");
        expect(first.entry).toContain("RESUMEN HISTÓRICO");
        expect(redis.list[1]).toContain("old2");
        expect(redis.list[2]).toContain("recent");
    });
});
//# sourceMappingURL=rollupTools.test.js.map