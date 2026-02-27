import { describe, it, expect } from "vitest";
import { createScratchpadAdapter } from "./scratchpadAdapter.js";
import * as app from "../../application/scratchpad.js";
import * as schemas from "../mcp/schemas.js";
function createMockRedis() {
    const store = new Map();
    return {
        store,
        async set(key, value) {
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
        const port = createScratchpadAdapter(redis);
        const input = schemas.setScratchpadEntrySchema.parse({
            agent_key: "agent:1",
            name: "current_plan",
            value: "Paso 1: revisar schema",
            ttl_seconds: 3600,
        });
        const result = await app.setScratchpadEntry(port, input.agent_key, input.name, input.value, input.ttl_seconds);
        expect(result.content[0].text).toContain("guardado");
        expect(redis.store.get("scratch:agent:1:current_plan")).toBe("Paso 1: revisar schema");
    });
});
describe("get_scratchpad_entry", () => {
    it("devuelve valor cuando existe", async () => {
        const redis = createMockRedis();
        redis.store.set("scratch:agent:1:plan", "mi plan");
        const port = createScratchpadAdapter(redis);
        const result = await app.getScratchpadEntry(port, "agent:1", "plan");
        expect(result.content[0].text).toBe("mi plan");
    });
    it("devuelve mensaje cuando no existe", async () => {
        const redis = createMockRedis();
        const port = createScratchpadAdapter(redis);
        const result = await app.getScratchpadEntry(port, "agent:1", "missing");
        expect(result.content[0].text).toContain("No hay scratchpad activo");
    });
});
describe("clear_scratchpad_entry", () => {
    it("borra la clave y confirma", async () => {
        const redis = createMockRedis();
        redis.store.set("scratch:agent:1:temp", "data");
        const port = createScratchpadAdapter(redis);
        const result = await app.clearScratchpadEntry(port, "agent:1", "temp");
        expect(result.content[0].text).toContain("borrado");
        expect(redis.store.has("scratch:agent:1:temp")).toBe(false);
    });
});
//# sourceMappingURL=scratchpadAdapter.test.js.map