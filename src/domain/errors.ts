/**
 * Dominio: contrato de resultado de tools MCP (spec 2025-11-25).
 * Sin I/O; errores de ejecución se devuelven en el resultado con isError: true.
 */

export type ToolSuccessResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: false;
};

export type ToolErrorResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
};

export type ToolResult = ToolSuccessResult | ToolErrorResult;

export function toolErrorResult(message: string): ToolErrorResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}

export function isToolError(value: unknown): value is ToolError {
  return value instanceof ToolError;
}

export function errorToToolResult(error: unknown): ToolErrorResult {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  return toolErrorResult(message);
}
