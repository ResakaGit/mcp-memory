import { describe, it, expect } from "vitest";
import { setScratchpadEntryInputSchema, setScratchpadEntryTool, getScratchpadEntryInputSchema, getScratchpadEntryTool, clearScratchpadEntryInputSchema, clearScratchpadEntryTool, } from "./scratchpadTools.js";
function createMockRedis() {
    const store = new Map();
    return {
        store,
        async set(key, value, _mode, _ttl) {
            store.set(key, value);
        },
        async get(key) {
            return store.get(key) ?? null;
        },
        async del(key) {
            store.delete(key);
            return 1;
        },
        async lrange() {
            return [];
        },
        async rpush() {
            return 1;
        },
        async ping() {
            return "PONG";
        },
        disconnect() { },
    };
}
describe("set_scratchpad_entry", () => {
    it("guarda valor y devuelve confirmación", async () => {
        const redis = createMockRedis();
        const input = setScratchpadEntryInputSchema.parse({
            agent_key: "agent:1",
            name: "current_plan",
            value: "Paso 1: revisar schema",
            ttl_seconds: 3600,
        });
        const result = await setScratchpadEntryTool(redis, input);
        expect(result.content[0].text).toContain("guardado");
        expect(redis.store.get("scratch:agent:1:current_plan")).toBe("Paso 1: revisar schema");
    });
    it("rechaza ttl fuera de rango", () => {
        expect(() => setScratchpadEntryInputSchema.parse({
            agent_key: "agent:1",
            name: "x",
            value: "v",
            ttl_seconds: 30,
        })).toThrow();
    });
});
describe("get_scratchpad_entry", () => {
    it("devuelve valor cuando existe", async () => {
        const redis = createMockRedis();
        redis.store.set("scratch:agent:1:plan", "mi plan");
        const input = getScratchpadEntryInputSchema.parse({
            agent_key: "agent:1",
            name: "plan",
        });
        const result = await getScratchpadEntryTool(redis, input);
        expect(result.content[0].text).toBe("mi plan");
    });
    it("devuelve mensaje cuando no existe", async () => {
        const redis = createMockRedis();
        const input = getScratchpadEntryInputSchema.parse({
            agent_key: "agent:1",
            name: "missing",
        });
        const result = await getScratchpadEntryTool(redis, input);
        expect(result.content[0].text).toContain("No hay scratchpad activo");
    });
});
describe("clear_scratchpad_entry", () => {
    it("borra la clave y confirma", async () => {
        const redis = createMockRedis();
        redis.store.set("scratch:agent:1:temp", "data");
        const input = clearScratchpadEntryInputSchema.parse({
            agent_key: "agent:1",
            name: "temp",
        });
        const result = await clearScratchpadEntryTool(redis, input);
        expect(result.content[0].text).toContain("borrado");
        expect(redis.store.has("scratch:agent:1:temp")).toBe(false);
    });
});
//# sourceMappingURL=scratchpadTools.test.js.map