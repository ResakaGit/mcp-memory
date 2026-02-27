export async function setScratchpadEntry(port, agentKey, name, value, ttlSeconds) {
    await port.set(agentKey, name, value, ttlSeconds);
    return {
        content: [
            { type: "text", text: `Scratchpad "${name}" guardado. TTL: ${ttlSeconds}s.` },
        ],
    };
}
export async function getScratchpadEntry(port, agentKey, name) {
    const value = await port.get(agentKey, name);
    if (value == null) {
        return {
            content: [
                { type: "text", text: `No hay scratchpad activo para "${name}".` },
            ],
        };
    }
    return { content: [{ type: "text", text: value }] };
}
export async function clearScratchpadEntry(port, agentKey, name) {
    await port.clear(agentKey, name);
    return {
        content: [{ type: "text", text: `Scratchpad "${name}" borrado.` }],
    };
}
//# sourceMappingURL=scratchpad.js.map