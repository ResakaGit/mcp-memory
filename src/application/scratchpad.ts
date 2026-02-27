import type { ScratchpadPort } from "../ports/scratchpad.js";
import type { ToolResult } from "../domain/errors.js";

export async function setScratchpadEntry(
  port: ScratchpadPort,
  agentKey: string,
  name: string,
  value: string,
  ttlSeconds: number
): Promise<ToolResult> {
  await port.set(agentKey, name, value, ttlSeconds);
  return {
    content: [
      { type: "text", text: `Scratchpad "${name}" guardado. TTL: ${ttlSeconds}s.` },
    ],
  };
}

export async function getScratchpadEntry(
  port: ScratchpadPort,
  agentKey: string,
  name: string
): Promise<ToolResult> {
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

export async function clearScratchpadEntry(
  port: ScratchpadPort,
  agentKey: string,
  name: string
): Promise<ToolResult> {
  await port.clear(agentKey, name);
  return {
    content: [{ type: "text", text: `Scratchpad "${name}" borrado.` }],
  };
}
