/**
 * AI tool calling — type contract.
 *
 * Each role-specific tool is a `Tool` instance: a JSON-schema'd function
 * the model can call, plus the server-side `execute` that actually runs
 * the work. The runtime in `src/lib/ai/chat.ts` turns the model's
 * `tool_calls` array into `execute()` calls and feeds the results back
 * into a second model turn (the "tool-augmented response loop").
 *
 * Why typed this way:
 *   1. OpenAI's `tools` field expects exactly this JSON-schema shape, so
 *      `toOpenAI(tool)` is a zero-cost transform.
 *   2. Each tool's `args` are validated against its schema before
 *      `execute` runs — the model occasionally hallucinates argument
 *      shapes (wrong type, missing field), and we want to fail loudly
 *      and tell the model to try again, not crash the worker.
 *   3. `context` carries the calling tenant + worker + conversation
 *      so every tool can enforce isolation + audit-log its own
 *      activity without reaching for ambient state.
 */
import type { Locale } from "@/lib/i18n/config";

export interface ToolContext {
  tenantId: string;
  workerId: string;
  conversationId: string;
  /** Customer-facing channel — used by `escalate` to know how to ping
   *  the human ("Slack with a link" vs "email with body" etc). */
  channel: "web" | "whatsapp" | "email" | "instagram" | "manual";
  /** Approval mode of the worker — auto/approve/suggest. Some tools
   *  refuse to execute in `suggest` mode (e.g. process_refund) because
   *  they would actually move money; the model should pivot to a
   *  human-readable draft instead. */
  autonomy: "auto" | "approve" | "suggest";
  /** Customer's locale, used for date/currency formatting in tool
   *  results before they go back to the model. */
  locale: Locale;
  /** Role-specific settings the operator pinned on hire (refund
   *  ceiling, escalation policy, etc). Shape varies by role; see
   *  `src/lib/role-configs.ts`. */
  workerSettings: Record<string, unknown>;
}

/**
 * JSON-schema fragment for a tool argument. We deliberately accept a
 * loose `Record<string, unknown>` here so tools can express OpenAPI-ish
 * shapes without dragging in a full type system; the validation step
 * (`validateArgs`) rejects unexpected fields and coerces basic types.
 */
export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
  additionalProperties?: false;
}

export type ToolPropertySchema =
  | { type: "string"; description?: string; enum?: readonly string[] }
  | { type: "number"; description?: string; minimum?: number; maximum?: number }
  | { type: "integer"; description?: string; minimum?: number; maximum?: number }
  | { type: "boolean"; description?: string }
  | { type: "array"; description?: string; items: ToolPropertySchema }
  // For nested object schemas (e.g. array-of-record fields). We keep
  // validation light at the runtime layer — the model's free-form
  // object content gets verified by the tool's execute() rather than
  // by a deep schema walker.
  | {
      type: "object";
      description?: string;
      properties?: Record<string, ToolPropertySchema>;
    };

/**
 * The two outcomes of an execute(): success (anything serializable) or
 * a structured refusal that the model can act on ("not allowed in your
 * autonomy mode", "argument out of range", "external service down").
 *
 * `refused: true` results are NOT errors — they're a valid signal the
 * model should explain to the user. Throwing from `execute` is reserved
 * for actual bugs (network exception, panic) and surfaces as a 5xx in
 * the audit log.
 */
export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; refused: true; reason: string };

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  /** Runs the tool. ALL side effects (Stripe refund, escalation flag,
   *  Brand Bible search) happen here. Receives validated args. */
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<ToolResult>;
}

/**
 * Minimal runtime arg validator. Returns `null` when the args conform
 * to `schema`, otherwise a human-readable string describing the first
 * mismatch — fed back to the model as the tool result so it knows what
 * to fix in its next call.
 */
export function validateArgs(
  schema: ToolParameterSchema,
  raw: unknown,
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object") {
    return { ok: false, error: "arguments must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const value = obj[key];
    if (value === undefined) {
      if (schema.required?.includes(key)) {
        return { ok: false, error: `missing required field: ${key}` };
      }
      continue;
    }
    const validation = validateProperty(propSchema, value, key);
    if (validation !== null) {
      return { ok: false, error: validation };
    }
    out[key] = value;
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!(key in schema.properties)) {
        return { ok: false, error: `unexpected field: ${key}` };
      }
    }
  }
  return { ok: true, args: out };
}

function validateProperty(
  schema: ToolPropertySchema,
  value: unknown,
  path: string,
): string | null {
  if (schema.type === "string") {
    if (typeof value !== "string") return `${path}: expected string`;
    if (schema.enum && !schema.enum.includes(value)) {
      return `${path}: must be one of ${schema.enum.join(", ")}`;
    }
    return null;
  }
  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number") return `${path}: expected number`;
    if (schema.type === "integer" && !Number.isInteger(value)) {
      return `${path}: expected integer`;
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      return `${path}: below minimum ${schema.minimum}`;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return `${path}: above maximum ${schema.maximum}`;
    }
    return null;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") return `${path}: expected boolean`;
    return null;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return `${path}: expected array`;
    for (let i = 0; i < value.length; i++) {
      const sub = validateProperty(schema.items, value[i], `${path}[${i}]`);
      if (sub !== null) return sub;
    }
    return null;
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return `${path}: expected object`;
    }
    // Optional shallow check on declared properties.
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        const v = (value as Record<string, unknown>)[k];
        if (v === undefined) continue;
        const err = validateProperty(sub, v, `${path}.${k}`);
        if (err !== null) return err;
      }
    }
    return null;
  }
  return null;
}

/** Convert internal Tool shape → OpenAI's chat.completions tools entry.
 *  OpenAI's SDK types the parameters field as `Record<string, unknown>`
 *  (FunctionParameters), so we coerce our richer typed schema down at
 *  the boundary. Inside our codebase the strong type still applies. */
export function toOpenAI(tool: Tool) {
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as unknown as Record<string, unknown>,
    },
  };
}
