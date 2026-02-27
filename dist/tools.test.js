import { describe, it, expect } from "vitest";
import { getRecentContextInputSchema, getRecentContextTool, appendContextualMemoryInputSchema, appendContextualMemoryTool, getAllContextInputSchema, getAllContextTool, } from "./tools.js";
/** Mock Redis: listas en memoria por clave. LRANGE/RPUSH con semántica Redis (índices negativos). */
function createMockRedis() {
    const store = new Map();
    const resolveIndex = (arr, i) => i < 0 ? Math.max(0, arr.length + i) : i;
    return {
        lrange(key, start, stop) {
            const list = store.get(key) ?? [];
            const s = resolveIndex(list, start);
            const e = resolveIndex(list, stop);
            const end = e >= 0 ? e + 1 : list.length;
            return Promise.resolve(list.slice(s, end));
        },
        rpush(key, ...values) {
            let list = store.get(key);
            if (!list) {
                list = [];
                store.set(key, list);
            }
            list.push(...values);
            return Promise.resolve(list.length);
        },
        ping() {
            return Promise.resolve("PONG");
        },
        disconnect() { },
    };
}
describe("get_recent_context", () => {
    it("devuelve mensaje de memoria vacía si la lista está vacía", async () => {
        const redis = createMockRedis();
        const input = getRecentContextInputSchema.parse({
            agent_key: "agent:arq_1",
            limit: 5,
        });
        const result = await getRecentContextTool(redis, input);
        expect(result.content[0].text).toBe("La memoria está vacía.");
        expect("isError" in result ? result.isError : undefined).toBeFalsy();
    });
    it("devuelve últimas N entradas formateadas", async () => {
        const redis = createMockRedis();
        const key = "agent:arq_1";
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "Paso 1" }));
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "Paso 2" }));
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T12:00:00Z", entry: "Paso 3" }));
        const input = getRecentContextInputSchema.parse({ agent_key: key, limit: 2 });
        const result = await getRecentContextTool(redis, input);
        const text = result.content[0].text;
        expect(text).toContain("Paso 2");
        expect(text).toContain("Paso 3");
        expect(text).not.toContain("Paso 1");
    });
});
describe("append_contextual_memory", () => {
    it("guarda entrada y devuelve confirmación", async () => {
        const redis = createMockRedis();
        const input = appendContextualMemoryInputSchema.parse({
            agent_key: "agent:arq_1",
            new_entry: "Revisé el módulo X",
        });
        const result = await appendContextualMemoryTool(redis, input);
        expect(result.content[0].text).toBe("Memoria guardada correctamente.");
        expect("isError" in result ? result.isError : undefined).toBeFalsy();
        const raw = await redis.lrange("agent:arq_1", 0, -1);
        expect(raw).toHaveLength(1);
        const parsed = JSON.parse(raw[0]);
        expect(parsed.entry).toBe("Revisé el módulo X");
        expect(typeof parsed.ts).toBe("string");
    });
});
describe("get_all_context", () => {
    it("devuelve memoria vacía si no hay entradas", async () => {
        const redis = createMockRedis();
        const input = getAllContextInputSchema.parse({ agent_key: "agent:other" });
        const result = await getAllContextTool(redis, input);
        expect(result.content[0].text).toBe("La memoria está vacía.");
    });
    it("devuelve todo el historial", async () => {
        const redis = createMockRedis();
        const key = "agent:full";
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T10:00:00Z", entry: "A" }));
        await redis.rpush(key, JSON.stringify({ ts: "2025-01-01T11:00:00Z", entry: "B" }));
        const input = getAllContextInputSchema.parse({ agent_key: key });
        const result = await getAllContextTool(redis, input);
        expect(result.content[0].text).toContain("A");
        expect(result.content[0].text).toContain("B");
    });
});
describe("schemas", () => {
    it("getRecentContextInputSchema rechaza agent_key vacío", () => {
        expect(() => getRecentContextInputSchema.parse({ agent_key: "", limit: 5 })).toThrow();
    });
    it("getRecentContextInputSchema aplica default limit 5", () => {
        const out = getRecentContextInputSchema.parse({ agent_key: "agent:x" });
        expect(out.limit).toBe(5);
    });
    it("appendContextualMemoryInputSchema rechaza new_entry vacío", () => {
        expect(() => appendContextualMemoryInputSchema.parse({
            agent_key: "agent:x",
            new_entry: "",
        })).toThrow();
    });
});
//# sourceMappingURL=tools.test.js.map