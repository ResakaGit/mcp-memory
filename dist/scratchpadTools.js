import { z } from "zod";
import { scratchpadConfig } from "./config.js";
import { buildScratchKey } from "./keys.js";
const AGENT_KEY_MAX_LEN = 256;
const agentKeySchema = z
    .string()
    .min(1, "agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
const nameSchema = z
    .string()
    .min(1, "name no puede estar vacío")
    .max(128, "name máximo 128 caracteres");
// --- set_scratchpad_entry ---
export const setScratchpadEntryInputSchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
    value: z.string(),
    ttl_seconds: z
        .number()
        .int()
        .min(scratchpadConfig.minTtlSeconds)
        .max(scratchpadConfig.maxTtlSeconds)
        .optional()
        .default(scratchpadConfig.defaultTtlSeconds),
});
export async function setScratchpadEntryTool(redis, input) {
    const { agent_key, name, value, ttl_seconds } = input;
    const key = buildScratchKey(agent_key, name);
    await redis.set(key, value, "EX", ttl_seconds);
    return {
        content: [
            {
                type: "text",
                text: `Scratchpad "${name}" guardado. TTL: ${ttl_seconds}s.`,
            },
        ],
    };
}
// --- get_scratchpad_entry ---
export const getScratchpadEntryInputSchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
});
export async function getScratchpadEntryTool(redis, { agent_key, name }) {
    const key = buildScratchKey(agent_key, name);
    const value = await redis.get(key);
    if (value == null) {
        return {
            content: [
                {
                    type: "text",
                    text: `No hay scratchpad activo para "${name}".`,
                },
            ],
        };
    }
    return {
        content: [{ type: "text", text: value }],
    };
}
// --- clear_scratchpad_entry ---
export const clearScratchpadEntryInputSchema = z.object({
    agent_key: agentKeySchema,
    name: nameSchema,
});
export async function clearScratchpadEntryTool(redis, { agent_key, name }) {
    const key = buildScratchKey(agent_key, name);
    await redis.del(key);
    return {
        content: [
            {
                type: "text",
                text: `Scratchpad "${name}" borrado.`,
            },
        ],
    };
}
//# sourceMappingURL=scratchpadTools.js.map