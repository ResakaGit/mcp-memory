import { z } from "zod";
const AGENT_KEY_MAX_LEN = 256;
const agentKeySchema = z
    .string()
    .min(1, "agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
// --- get_memory_stats ---
export const getMemoryStatsInputSchema = z.object({
    agent_key: agentKeySchema,
});
export async function getMemoryStatsTool(redis, { agent_key }) {
    const key = agent_key;
    const len = await redis.llen(key);
    let firstTs = "";
    let lastTs = "";
    if (len > 0) {
        const first = await redis.lrange(key, 0, 0);
        const last = await redis.lrange(key, -1, -1);
        try {
            if (first[0]) {
                const p = JSON.parse(first[0]);
                firstTs = p.ts ?? "";
            }
            if (last[0]) {
                const p = JSON.parse(last[0]);
                lastTs = p.ts ?? "";
            }
        }
        catch {
            // ignore parse errors
        }
    }
    const text = [
        `Entradas: ${len}`,
        firstTs ? `Primera: ${firstTs}` : "",
        lastTs ? `Última: ${lastTs}` : "",
    ]
        .filter(Boolean)
        .join("\n");
    return {
        content: [{ type: "text", text }],
    };
}
// --- rollup_memory_segment ---
export const rollupMemorySegmentInputSchema = z.object({
    agent_key: agentKeySchema,
    keep_last: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(20)
        .describe("Cantidad de entradas recientes a conservar"),
    summary_entry: z
        .string()
        .min(1, "summary_entry no puede estar vacío")
        .describe("Texto del resumen histórico (ej. [RESUMEN HISTÓRICO] ...)"),
});
export async function rollupMemorySegmentTool(redis, input) {
    const { agent_key, keep_last, summary_entry } = input;
    const key = agent_key;
    const tail = await redis.lrange(key, -keep_last, -1);
    const summaryJson = JSON.stringify({
        ts: new Date().toISOString(),
        entry: summary_entry,
        type: "ROLLUP",
    });
    const multi = redis.multi();
    multi.del(key);
    multi.rpush(key, summaryJson);
    if (tail.length > 0) {
        multi.rpush(key, ...tail);
    }
    await multi.exec();
    return {
        content: [
            {
                type: "text",
                text: `Rollup aplicado: 1 entrada de resumen + ${tail.length} recientes.`,
            },
        ],
    };
}
//# sourceMappingURL=rollupTools.js.map