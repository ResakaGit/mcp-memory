/**
 * Puerto: memoria semántica (vectores por agente).
 * El adaptador Redis Stack implementa con RediSearch (FT.*, HSET).
 */

export interface SemanticSearchHit {
  id: string;
  score: number;
  ts: string;
  content: string;
}

export interface SemanticMemoryPort {
  ensureIndex(): Promise<void>;
  append(agentKey: string, id: string, ts: string, content: string, embeddingBuf: Buffer, meta?: string): Promise<void>;
  search(agentKey: string, embeddingBuf: Buffer, topK: number): Promise<SemanticSearchHit[]>;
}
