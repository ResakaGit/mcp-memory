/**
 * Configuración desde variables de entorno.
 * Valores por defecto para memoria semántica (Redis Stack).
 */
const VALID_DISTANCE_METRICS = ["COSINE", "L2", "IP"];
function parseVectorDim() {
    const raw = parseInt(process.env.SEMANTIC_VECTOR_DIM ?? "1536", 10);
    if (!Number.isInteger(raw) || raw < 1 || raw > 8192)
        return 1536;
    return raw;
}
function parseDistanceMetric() {
    const v = process.env.SEMANTIC_DISTANCE_METRIC?.toUpperCase();
    if (v && VALID_DISTANCE_METRICS.includes(v))
        return v;
    return "COSINE";
}
export const semanticConfig = {
    indexName: process.env.SEMANTIC_INDEX_NAME ?? "idx:semantic_memory",
    vectorDim: parseVectorDim(),
    distanceMetric: parseDistanceMetric(),
};
export const scratchpadConfig = {
    defaultTtlSeconds: 3600,
    minTtlSeconds: 60,
    maxTtlSeconds: 86400,
};
export const channelLogPrefix = "chanlog:";
export const channelPrefix = "channel:";
export const scratchPrefix = "scratch:";
export const semPrefix = "sem:";
//# sourceMappingURL=config.js.map