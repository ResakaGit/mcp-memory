import { describe, it, expect } from "vitest";
import type { RedisClient } from "./client.js";
import { createSemanticMemoryAdapter } from "./semanticMemoryAdapter.js";
import * as app from "../../application/semanticMemory.js";
import * as schemas from "../mcp/schemas.js";

const VECTOR_DIM = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);

function createMockRedis(): RedisClient & { callCalls: unknown[][]; hsetCalls: { key: string; fields: Record<string, unknown> }[] } {
  let indexExists = false;
  const callCalls: unknown[][] = [];
  const hsetCalls: { key: string; fields: Record<string, unknown> }[] = [];
  return {
    callCalls,
    hsetCalls,
    async call(...args: unknown[]) {
      callCalls.push(args);
      const cmd = String(args[0]).toUpperCase();
      if (cmd === "FT.INFO") {
        if (!indexExists) throw new Error("Unknown index");
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
          ["content", "Recuerdo de prueba", "ts", "2025-01-01T12:00:00Z", "score", "0.95"],
        ];
      }
      return "OK";
    },
    async hset(key: string, fields: Record<string, unknown>) {
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
    disconnect() {},
  } as unknown as RedisClient & { callCalls: unknown[][]; hsetCalls: { key: string; fields: Record<string, unknown> }[] };
}

describe("appendSemanticMemory", () => {
  it("rechaza embedding con dimensión incorrecta", async () => {
    const redis = createMockRedis();
    const port = createSemanticMemoryAdapter(redis);
    const input = schemas.appendSemanticMemorySchema.parse({
      agent_key: "agent:arq_1",
      embedding: Array(VECTOR_DIM - 1).fill(0),
      content: "texto",
    });
    const result = await app.appendSemanticMemory(
      port,
      { vectorDim: VECTOR_DIM },
      input.agent_key,
      input.embedding,
      input.content,
      input.metadata
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("dimensiones");
  });

  it("guarda entrada y llama ensureIndex y append", async () => {
    const redis = createMockRedis();
    const port = createSemanticMemoryAdapter(redis);
    const embedding = Array.from({ length: VECTOR_DIM }, (_, i) => (i * 0.001) % 1);
    const result = await app.appendSemanticMemory(
      port,
      { vectorDim: VECTOR_DIM },
      "agent:arq_1",
      embedding,
      "Resolví un problema de base de datos"
    );
    expect("isError" in result ? result.isError : undefined).toBeFalsy();
    expect(result.content[0].text).toContain("guardada");
    expect(redis.hsetCalls.length).toBe(1);
    expect(redis.hsetCalls[0].fields.content).toBe("Resolví un problema de base de datos");
  });
});

describe("searchSemanticMemory", () => {
  it("rechaza embedding con dimensión incorrecta", async () => {
    const redis = createMockRedis();
    const port = createSemanticMemoryAdapter(redis);
    const result = await app.searchSemanticMemory(
      port,
      { vectorDim: VECTOR_DIM },
      "agent:arq_1",
      Array(VECTOR_DIM - 1).fill(0),
      5
    );
    expect(result.isError).toBe(true);
  });

  it("devuelve resultados formateados cuando el mock retorna hits", async () => {
    const redis = createMockRedis();
    const port = createSemanticMemoryAdapter(redis);
    const result = await app.searchSemanticMemory(
      port,
      { vectorDim: VECTOR_DIM },
      "agent:arq_1",
      Array(VECTOR_DIM).fill(0.1),
      3
    );
    expect("isError" in result ? result.isError : undefined).toBeFalsy();
    expect(result.content[0].text).toContain("Recuerdo de prueba");
  });
});
