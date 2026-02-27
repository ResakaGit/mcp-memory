import { toolErrorResult } from "../domain/errors.js";
function embeddingToBuffer(embedding) {
    const fa = new Float32Array(embedding);
    return Buffer.from(fa.buffer, fa.byteOffset, fa.byteLength);
}
function randomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export async function appendSemanticMemory(port, config, agentKey, embedding, content, metadata) {
    if (embedding.length !== config.vectorDim) {
        return toolErrorResult(`embedding debe tener ${config.vectorDim} dimensiones, recibido ${embedding.length}`);
    }
    await port.ensureIndex();
    const id = randomId();
    const ts = new Date().toISOString();
    const embeddingBuf = embeddingToBuffer(embedding);
    const metaStr = metadata ? JSON.stringify(metadata) : undefined;
    await port.append(agentKey, id, ts, content, embeddingBuf, metaStr);
    return {
        content: [{ type: "text", text: `Memoria semántica guardada. id=${id}` }],
    };
}
export async function searchSemanticMemory(port, config, agentKey, embedding, topK, scoreThreshold) {
    if (embedding.length !== config.vectorDim) {
        return toolErrorResult(`embedding debe tener ${config.vectorDim} dimensiones, recibido ${embedding.length}`);
    }
    await port.ensureIndex();
    const embeddingBuf = embeddingToBuffer(embedding);
    const hits = await port.search(agentKey, embeddingBuf, topK);
    const filtered = scoreThreshold != null
        ? hits.filter((h) => h.score >= scoreThreshold)
        : hits;
    if (filtered.length === 0) {
        return {
            content: [{ type: "text", text: "No se encontraron recuerdos similares." }],
        };
    }
    const lines = filtered.map((h) => `[score=${h.score.toFixed(4)}] [${h.ts}] ${h.content}`);
    return {
        content: [{ type: "text", text: lines.join("\n") }],
    };
}
//# sourceMappingURL=semanticMemory.js.map