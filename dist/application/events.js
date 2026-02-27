const MAX_LOG_LEN = 1000;
export async function publishInteragentMessage(port, channelName, senderAgentKey, payload) {
    const message = JSON.stringify({
        ts: new Date().toISOString(),
        sender_agent_key: senderAgentKey,
        payload,
    });
    const subscribers = await port.publish(channelName, message);
    await port.appendLog(channelName, message);
    await port.trimLog(channelName, MAX_LOG_LEN);
    return {
        content: [
            {
                type: "text",
                text: `Mensaje publicado en ${channelName}. Suscriptores que lo recibieron: ${subscribers}.`,
            },
        ],
    };
}
export async function getChannelLog(port, channelName, limit) {
    const raw = await port.getLog(channelName, limit);
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
//# sourceMappingURL=events.js.map