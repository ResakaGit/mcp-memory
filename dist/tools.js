import { z } from "zod";
const AGENT_KEY_MAX_LEN = 256;
const agentKeySchema = z
    .string()
    .min(1, "agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
// --- get_recent_context ---
export const getRecentContextInputSchema = z.object({
    agent_key: agentKeySchema,
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(5)
        .describe("Cantidad de entradas recientes a devolver (1-100, default 5)"),
});
const EMPTY_MEMORY_MESSAGE = "La memoria está vacía.";
function formatEntries(raw) {
    const lines = [];
    for (const s of raw) {
        try {
            const { ts, entry } = JSON.parse(s);
            lines.push(`[${ts ?? "?"}] ${entry ?? s}`);
        }
        catch {
            lines.push(s);
        }
    }
    return lines.length ? lines.join("\n") : EMPTY_MEMORY_MESSAGE;
}
export async function getRecentContextTool(redis, { agent_key, limit }) {
    const raw = await redis.lrange(agent_key, -limit, -1);
    return {
        content: [{ type: "text", text: formatEntries(raw) }],
    };
}
// --- append_contextual_memory ---
export const appendContextualMemoryInputSchema = z.object({
    agent_key: agentKeySchema,
    new_entry: z.string().min(1, "new_entry no puede estar vacío"),
});
export async function appendContextualMemoryTool(redis, { agent_key, new_entry }) {
    const payload = JSON.stringify({
        ts: new Date().toISOString(),
        entry: new_entry,
    });
    await redis.rpush(agent_key, payload);
    return {
        content: [
            {
                type: "text",
                text: "Memoria guardada correctamente.",
            },
        ],
    };
}
// --- get_all_context ---
export const getAllContextInputSchema = z.object({
    agent_key: agentKeySchema,
});
export async function getAllContextTool(redis, { agent_key }) {
    const raw = await redis.lrange(agent_key, 0, -1);
    return {
        content: [{ type: "text", text: formatEntries(raw) }],
    };
}
//# sourceMappingURL=tools.js.map