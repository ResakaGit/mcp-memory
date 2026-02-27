/**
 * Sistema de errores para tools MCP.
 *
 * Según la spec 2025-11-25: los fallos de ejecución de una tool deben devolverse
 * dentro del resultado con `isError: true`, no como error de protocolo JSON-RPC,
 * para que el LLM pueda ver el mensaje y autocorregirse.
 *
 * - Errores de negocio/validación → resultado con isError: true (toolErrorResult).
 * - Errores de protocolo (tool no encontrada, request mal formado) → JSON-RPC error.
 */
/**
 * Construye un resultado de tool en error para devolver al cliente.
 * Usar para validaciones de negocio o fallos recuperables; no para fallos de protocolo.
 */
export function toolErrorResult(message) {
    return {
        content: [{ type: "text", text: message }],
        isError: true,
    };
}
/**
 * Error lanzable desde una tool para indicar fallo de negocio.
 * El handler en server.ts lo convierte a toolErrorResult(message) para no romper el protocolo.
 */
export class ToolError extends Error {
    constructor(message) {
        super(message);
        this.name = "ToolError";
        Object.setPrototypeOf(this, ToolError.prototype);
    }
}
/** Indica si un valor es una ToolError. */
export function isToolError(value) {
    return value instanceof ToolError;
}
/**
 * Convierte un error capturado en un resultado de tool con isError: true.
 * ToolError usa su message; el resto se stringifica de forma segura.
 */
export function errorToToolResult(error) {
    const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
    return toolErrorResult(message);
}
//# sourceMappingURL=errors.js.map