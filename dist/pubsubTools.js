import { z } from "zod";
import { buildChannelName, buildChannelLogKey } from "./keys.js";
const AGENT_KEY_MAX_LEN = 256;
const CHANNEL_MAX_LEN = 128;
const agentKeySchema = z
    .string()
    .min(1, "sender_agent_key no puede estar vacío")
    .max(AGENT_KEY_MAX_LEN, `agent_key máximo ${AGENT_KEY_MAX_LEN} caracteres`);
const channelSchema = z
    .string()
    .min(1, "channel no puede estar vacío")
    .max(CHANNEL_MAX_LEN, `channel máximo ${CHANNEL_MAX_LEN} caracteres`);
// --- publish_interagent_message ---
export const publishInteragentMessageInputSchema = z.object({
    channel: channelSchema,
    sender_agent_key: agentKeySchema,
    payload: z.string(),
});
export async function publishInteragentMessageTool(redis, input) {
    const { channel, sender_agent_key, payload } = input;
    const channelName = buildChannelName(channel);
    const message = JSON.stringify({
        ts: new Date().toISOString(),
        sender_agent_key,
        payload,
    });
    const subscribers = await redis.publish(channelName, message);
    const logKey = buildChannelLogKey(channelName);
    await redis.rpush(logKey, message);
    const maxLog = 1000;
    const len = await redis.llen(logKey);
    if (len > maxLog) {
        await redis.ltrim(logKey, -maxLog, -1);
    }
    return {
        content: [
            {
                type: "text",
                text: `Mensaje publicado en ${channelName}. Suscriptores que lo recibieron: ${subscribers}.`,
            },
        ],
    };
}
// --- get_channel_log ---
export const getChannelLogInputSchema = z.object({
    channel: channelSchema,
    limit: z.number().int().min(1).max(100).optional().default(20),
});
export async function getChannelLogTool(redis, { channel, limit }) {
    const channelName = buildChannelName(channel);
    const logKey = buildChannelLogKey(channelName);
    const raw = await redis.lrange(logKey, -limit, -1);
    if (raw.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `No hay mensajes en el log del canal ${channelName}.`,
                },
            ],
        };
    }
    const lines = raw.map((s) => {
        try {
            const { ts, sender_agent_key, payload } = JSON.parse(s);
            return `[${ts ?? "?"}] ${sender_agent_key ?? "?"}: ${payload ?? s}`;
        }
        catch {
            return s;
        }
    });
    return {
        content: [{ type: "text", text: lines.reverse().join("\n") }],
    };
}
//# sourceMappingURL=pubsubTools.js.map