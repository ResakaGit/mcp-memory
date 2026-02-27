import { describe, it, expect } from "vitest";
import { appendSemanticMemoryInputSchema, appendSemanticMemoryTool, searchSemanticMemoryInputSchema, searchSemanticMemoryTool, ensureSemanticIndex, } from "./semanticTools.js";
function createMockRedis() {
    let indexExists = false;
    const callCalls = [];
    const hsetCalls = [];
    return {
        callCalls,
        hsetCalls,
        async call(...args) {
            callCalls.push(args);
            const cmd = String(args[0]).toUpperCase();
            if (cmd === "FT.INFO") {
                if (!indexExists)
                    throw new Error("Unknown index");
                return [];
            }
            if (cmd === "FT.CREATE") {
                indexExists = true;
                return "OK";
            }
            if (cmd === "FT.SEARCH") {
                return [
                    1,
                    "sem:agent:1:fake-id",
                    [
                        "content",
                        "Recuerdo de prueba",
                        "ts",
                        "2025-01-01T12:00:00Z",
                        "score",
                        "0.95",
                    ],
                ];
            }
            return "OK";
        },
        async hset(key, fields) {
            hsetCalls.push({ key, fields });
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
describe("appendSemanticMemory", () => {
    it("rechaza embedding con dimensión incorrecta", async () => {
        const redis = createMockRedis();
        const dim = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);
        const shortEmbedding = Array.from({ length: dim - 1 }, () => 0);
        const input = appendSemanticMemoryInputSchema.parse({
            agent_key: "agent:arq_1",
            embedding: shortEmbedding,
            content: "texto",
        });
        const result = await appendSemanticMemoryTool(redis, input);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("dimensiones");
    });
    it("guarda entrada y llama FT.CREATE y HSET", async () => {
        const redis = createMockRedis();
        const dim = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);
        const embedding = Array.from({ length: dim }, (_, i) => (i * 0.001) % 1);
        const input = appendSemanticMemoryInputSchema.parse({
            agent_key: "agent:arq_1",
            embedding,
            content: "Resolví un problema de base de datos",
        });
        const result = await appendSemanticMemoryTool(redis, input);
        expect("isError" in result ? result.isError : undefined).toBeFalsy();
        expect(result.content[0].text).toContain("guardada");
        expect(redis.callCalls.some((c) => String(c[0]) === "FT.CREATE" || String(c[0]) === "FT.INFO")).toBe(true);
        expect(redis.hsetCalls.length).toBe(1);
        expect(redis.hsetCalls[0].fields.content).toBe("Resolví un problema de base de datos");
    });
});
describe("searchSemanticMemory", () => {
    it("rechaza embedding con dimensión incorrecta", async () => {
        const redis = createMockRedis();
        const dim = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);
        const input = searchSemanticMemoryInputSchema.parse({
            agent_key: "agent:arq_1",
            embedding: Array(dim - 1).fill(0),
            top_k: 5,
        });
        const result = await searchSemanticMemoryTool(redis, input);
        expect(result.isError).toBe(true);
    });
    it("devuelve resultados formateados cuando el mock retorna hits", async () => {
        const redis = createMockRedis();
        const dim = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);
        const input = searchSemanticMemoryInputSchema.parse({
            agent_key: "agent:arq_1",
            embedding: Array(dim).fill(0.1),
            top_k: 3,
        });
        const result = await searchSemanticMemoryTool(redis, input);
        expect("isError" in result ? result.isError : undefined).toBeFalsy();
        expect(result.content[0].text).toContain("Recuerdo de prueba");
        expect(result.content[0].text).toContain("score");
    });
});
describe("ensureSemanticIndex", () => {
    it("crea índice si no existe", async () => {
        const redis = createMockRedis();
        await ensureSemanticIndex(redis);
        expect(redis.callCalls.length).toBeGreaterThanOrEqual(1);
    });
});
//# sourceMappingURL=semanticTools.test.js.map