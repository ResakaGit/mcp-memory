/**
 * Puerto: publicación y log de mensajes (Pub/Sub).
 * El adaptador Redis implementa con PUBLISH + lista para log.
 */

export interface EventPublisherPort {
  publish(channelName: string, message: string): Promise<number>;
  appendLog(channelName: string, message: string): Promise<void>;
  getLog(channelName: string, limit: number): Promise<string[]>;
  trimLog(channelName: string, maxLen: number): Promise<void>;
}
