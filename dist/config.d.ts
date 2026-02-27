/**
 * Configuración desde variables de entorno.
 * Valores por defecto para memoria semántica (Redis Stack).
 */
export declare const semanticConfig: {
    readonly indexName: string;
    readonly vectorDim: number;
    readonly distanceMetric: "COSINE" | "L2" | "IP";
};
export declare const scratchpadConfig: {
    readonly defaultTtlSeconds: 3600;
    readonly minTtlSeconds: 60;
    readonly maxTtlSeconds: 86400;
};
export declare const channelLogPrefix = "chanlog:";
export declare const channelPrefix = "channel:";
export declare const scratchPrefix = "scratch:";
export declare const semPrefix = "sem:";
//# sourceMappingURL=config.d.ts.map