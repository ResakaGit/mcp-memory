import type { ContextualMemoryPort } from "../ports/contextualMemory.js";
import type { ToolResult } from "../domain/errors.js";

const EMPTY_MEMORY_MESSAGE = "La memoria está vacía.";

function formatEntries(raw: string[]): string {
  const lines: string[] = [];
  for (const s of raw) {
    try {
      const { ts, entry } = JSON.parse(s) as { ts?: string; entry?: string };
      lines.push(`[${ts ?? "?"}] ${entry ?? s}`);
    } catch {
      lines.push(s);
    }
  }
  return lines.length ? lines.join("\n") : EMPTY_MEMORY_MESSAGE;
}

export async function getRecentContext(
  port: ContextualMemoryPort,
  agentKey: string,
  limit: number
): Promise<ToolResult> {
  const raw = await port.getRecent(agentKey, limit);
  return {
    content: [{ type: "text", text: formatEntries(raw) }],
  };
}

export async function appendContextualMemory(
  port: ContextualMemoryPort,
  agentKey: string,
  newEntry: string
): Promise<ToolResult> {
  const entryJson = JSON.stringify({
    ts: new Date().toISOString(),
    entry: newEntry,
  });
  await port.append(agentKey, entryJson);
  return {
    content: [{ type: "text", text: "Memoria guardada correctamente." }],
  };
}

export async function getAllContext(
  port: ContextualMemoryPort,
  agentKey: string
): Promise<ToolResult> {
  const raw = await port.getAll(agentKey);
  return {
    content: [{ type: "text", text: formatEntries(raw) }],
  };
}

export async function getMemoryStats(
  port: ContextualMemoryPort,
  agentKey: string
): Promise<ToolResult> {
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

export async function rollupMemorySegment(
  port: ContextualMemoryPort,
  agentKey: string,
  keepLast: number,
  summaryEntry: string
): Promise<ToolResult> {
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
