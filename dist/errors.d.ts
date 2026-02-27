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
/** Resultado exitoso de una tool: content sin isError (o isError: false). */
export type ToolSuccessResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: false;
};
/** Resultado de error de una tool: content + isError: true. */
export type ToolErrorResult = {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError: true;
};
/** Resultado de una tool: éxito o error de negocio (siempre mismo shape para el cliente). */
export type ToolResult = ToolSuccessResult | ToolErrorResult;
/**
 * Construye un resultado de tool en error para devolver al cliente.
 * Usar para validaciones de negocio o fallos recuperables; no para fallos de protocolo.
 */
export declare function toolErrorResult(message: string): ToolErrorResult;
/**
 * Error lanzable desde una tool para indicar fallo de negocio.
 * El handler en server.ts lo convierte a toolErrorResult(message) para no romper el protocolo.
 */
export declare class ToolError extends Error {
    constructor(message: string);
}
/** Indica si un valor es una ToolError. */
export declare function isToolError(value: unknown): value is ToolError;
/**
 * Convierte un error capturado en un resultado de tool con isError: true.
 * ToolError usa su message; el resto se stringifica de forma segura.
 */
export declare function errorToToolResult(error: unknown): ToolErrorResult;
//# sourceMappingURL=errors.d.ts.map