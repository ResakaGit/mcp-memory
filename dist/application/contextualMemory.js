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
export async function getRecentContext(port, agentKey, limit) {
    const raw = await port.getRecent(agentKey, limit);
    return {
        content: [{ type: "text", text: formatEntries(raw) }],
    };
}
export async function appendContextualMemory(port, agentKey, newEntry) {
    const entryJson = JSON.stringify({
        ts: new Date().toISOString(),
        entry: newEntry,
    });
    await port.append(agentKey, entryJson);
    return {
        content: [{ type: "text", text: "Memoria guardada correctamente." }],
    };
}
export async function getAllContext(port, agentKey) {
    const raw = await port.getAll(agentKey);
    return {
        content: [{ type: "text", text: formatEntries(raw) }],
    };
}
export async function getMemoryStats(port, agentKey) {
    const { len, firstTs, lastTs } = await port.getStats(agentKey);
    const text = [
        `Entradas: ${len}`,
        firstTs ? `Primera: ${firstTs}` : "",
        lastTs ? `Última: ${lastTs}` : "",
    ]
        .filter(Boolean)
        .join("\n");
    return { content: [{ type: "text", text }] };
}
export async function rollupMemorySegment(port, agentKey, keepLast, summaryEntry) {
    const summaryJson = JSON.stringify({
        ts: new Date().toISOString(),
        entry: summaryEntry,
        type: "ROLLUP",
    });
    const recientes = await port.rollup(agentKey, keepLast, summaryJson);
    return {
        content: [
            {
                type: "text",
                text: `Rollup aplicado: 1 entrada de resumen + ${recientes} recientes.`,
            },
        ],
    };
}
//# sourceMappingURL=contextualMemory.js.map