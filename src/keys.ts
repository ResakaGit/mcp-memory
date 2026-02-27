/**
 * Prefijos y construcción de claves Redis.
 */

import { channelLogPrefix, channelPrefix, scratchPrefix, semPrefix } from "./config.js";

export function buildSemanticKey(agentKey: string, id: string): string {
  return `${semPrefix}${agentKey}:${id}`;
}

export function buildScratchKey(agentKey: string, name: string): string {
  return `${scratchPrefix}${agentKey}:${name}`;
}

export function buildChannelName(channel: string): string {
  const trimmed = channel.trim();
  if (trimmed.startsWith(channelPrefix)) return trimmed;
  return `${channelPrefix}${trimmed}`;
}

export function buildChannelLogKey(channelName: string): string {
  return `${channelLogPrefix}${channelName}`;
}
