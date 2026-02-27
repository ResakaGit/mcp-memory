/**
 * Prefijos y construcción de claves Redis.
 */
import { channelLogPrefix, channelPrefix, scratchPrefix, semPrefix } from "./config.js";
export function buildSemanticKey(agentKey, id) {
    return `${semPrefix}${agentKey}:${id}`;
}
export function buildScratchKey(agentKey, name) {
    return `${scratchPrefix}${agentKey}:${name}`;
}
export function buildChannelName(channel) {
    const trimmed = channel.trim();
    if (trimmed.startsWith(channelPrefix))
        return trimmed;
    return `${channelPrefix}${trimmed}`;
}
export function buildChannelLogKey(channelName) {
    return `${channelLogPrefix}${channelName}`;
}
//# sourceMappingURL=keys.js.map