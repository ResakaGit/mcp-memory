import { describe, it, expect } from "vitest";
import { createContextualMemoryAdapter } from "./contextualMemoryAdapter.js";
import * as app from "../../application/contextualMemory.js";
import * as schemas from "../mcp/schemas.js";
function createMockRedis() {
    const store = new Map();
    const resolveIndex = (arr, i) => i < 0 ? Math.max(0, arr.length + i) : i;
    return {
        lrange(key, start, stop) {
            const list = store.get(key) ?? [];
            const s = resolveIndex(list, start);
            const e = resolveIndex(list, stop);
            return Promise.resolve(list.slice(s, e >= 0 ? e + 1 : list.length));
        },
        rpush(key, ...values) {
            let list = store.get(key);
            if (!list)
                store.set(key, (list = []));
            list.push(...values);
            return Promise.resolve(list.length);
        },
        llen(key) {
            return Promise.resolve((store.get(key) ?? []).length);
        },
        multi() {
            return {
                del(k) {
                    store.delete(k);
                },
                rpush(k, ...v) {
                    let list = store.get(k);
                    if (!list)
                        store.set(k, (list = []));
                    list.push(...v);
                },
                async exec() {
                    return [];
                },
            };
        },
        ping: () => Promise.resolve("PONG"),
        disconnect() { },
    };
}
describe("contextual memory (get_recent_context, append, get_all)", () => {
    it("devuelve memoria vacía si la lista está vacía", async () => {
        const redis = createMockRedis();
        const port = createContextualMemoryAdapter(redis);
        const input = schemas.getRecentContextSchema.parse({
            agent_key: "agent:arq_1",
            limit: 5,
        });
        const result = await app.getRecentContext(port, input.agent_key, input.limit);
        expect(result.content[0].text).toBe("La memoria está vacía.");
    });
    it("devuelve últimas N entradas formateadas", async () => {
        const redis = createMockRedis();
        const key = "agent:arq_1";
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "Paso 1" }));
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "Paso 2" }));
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T12:00:00Z", entry: "Paso 3" }));
        const port = createContextualMemoryAdapter(redis);
        const input = schemas.getRecentContextSchema.parse({ agent_key: key, limit: 2 });
        const result = await app.getRecentContext(port, input.agent_key, input.limit);
        const text = result.content[0].text;
        expect(text).toContain("Paso 2");
        expect(text).toContain("Paso 3");
        expect(text).not.toContain("Paso 1");
    });
    it("append y get_all", async () => {
        const redis = createMockRedis();
        const port = createContextualMemoryAdapter(redis);
        const input = schemas.appendContextualMemorySchema.parse({
            agent_key: "agent:arq_1",
            new_entry: "Revisé el módulo X",
        });
        const result = await app.appendContextualMemory(port, input.agent_key, input.new_entry);
        expect(result.content[0].text).toBe("Memoria guardada correctamente.");
        const raw = await redis.lrange("agent:arq_1", 0, -1);
        expect(raw).toHaveLength(1);
        expect(JSON.parse(raw[0]).entry).toBe("Revisé el módulo X");
    });
    it("get_all_context vacío y con datos", async () => {
        const redis = createMockRedis();
        const port = createContextualMemoryAdapter(redis);
        expect((await app.getAllContext(port, "agent:other")).content[0].text).toBe("La memoria está vacía.");
        await redis.rpush("agent:full", JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "A" }));
        await redis.rpush("agent:full", JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "B" }));
        const res = await app.getAllContext(port, "agent:full");
        expect(res.content[0].text).toContain("A");
        expect(res.content[0].text).toContain("B");
    });
});
describe("get_memory_stats y rollup_memory_segment", () => {
    it("getMemoryStats devuelve 0 y con primera/última ts", async () => {
        const redis = createMockRedis();
        const port = createContextualMemoryAdapter(redis);
        let result = await app.getMemoryStats(port, "agent:1");
        expect(result.content[0].text).toContain("Entradas: 0");
        await redis.rpush("agent:1", JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "A" }));
        await redis.rpush("agent:1", JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "B" }));
        result = await app.getMemoryStats(port, "agent:1");
        expect(result.content[0].text).toContain("Entradas: 2");
        expect(result.content[0].text).toContain("2025-01-01T10:00:00Z");
        expect(result.content[0].text).toContain("2025-01-01T11:00:00Z");
    });
    it("rollupMemorySegment reemplaza por resumen + últimos N", async () => {
        const redis = createMockRedis();
        await redis.rpush("agent:1", JSON.stringify({ ts: "2025-01-01T09:00:00Z", entry: "old1" }));
        await redis.rpush("agent:1", JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "old2" }));
        await redis.rpush("agent:1", JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "recent" }));
        const port = createContextualMemoryAdapter(redis);
        const result = await app.rollupMemorySegment(port, "agent:1", 2, "[RESUMEN HISTÓRICO] Trabajo previo completado.");
        expect(result.content[0].text).toContain("1 entrada de resumen");
        expect(result.content[0].text).toContain("2 recientes");
        const list = await redis.lrange("agent:1", 0, -1);
        expect(list).toHaveLength(3);
        expect(JSON.parse(list[0]).type).toBe("ROLLUP");
        expect(list[1]).toContain("old2");
        expect(list[2]).toContain("recent");
    });
});
describe("schemas", () => {
    it("getRecentContextSchema rechaza agent_key vacío", () => {
        expect(() => schemas.getRecentContextSchema.parse({ agent_key: "", limit: 5 })).toThrow();
    });
    it("getRecentContextSchema aplica default limit 5", () => {
        expect(schemas.getRecentContextSchema.parse({ agent_key: "agent:x" }).limit).toBe(5);
    });
    it("appendContextualMemorySchema rechaza new_entry vacío", () => {
        expect(() => schemas.appendContextualMemorySchema.parse({ agent_key: "agent:x", new_entry: "" })).toThrow();
    });
});
//# sourceMappingURL=contextualMemoryAdapter.test.js.map