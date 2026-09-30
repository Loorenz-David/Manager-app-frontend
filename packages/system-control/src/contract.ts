import { z } from "zod";

/**
 * The system-control contract, schema version 1.
 *
 *   GET  /system/status -> 200 application/json (no-store)
 *   POST /system/wake   -> 202 application/json, same body; idempotent, no
 *                          request body
 *
 * Production answers it from infrastructure; staging and local stacks from the
 * proxy stub (always READY); `vite dev`/`vite preview` from this package's Vite
 * plugin. The backend has no implementation of it.
 */
export const SYSTEM_STATUS_PATH = "/system/status";
export const SYSTEM_WAKE_PATH = "/system/wake";
export const SYSTEM_CONTRACT_VERSION = 1;

export const SYSTEM_STATUS_STATES = [
  "READY",
  "SLEEPING",
  "STARTING",
  "FAILED",
] as const;
export type SystemStatusState = (typeof SYSTEM_STATUS_STATES)[number];

export const SYSTEM_PHASES = [
  "DATABASE",
  "SERVER",
  "APPLICATION",
  "HEALTH_CHECK",
] as const;
export type SystemPhase = (typeof SYSTEM_PHASES)[number];

const SECONDS = z.number().finite().nonnegative();

/**
 * Strict on everything that decides the gate: `version` must be exactly 1 and
 * `state` one of the four known values. Optional fields must have the declared
 * type when present. Unknown extra keys are ignored (additive changes stay
 * compatible within version 1). `phase` is any string or null: an unknown
 * phase is read as a generic "starting" (null), never as an error.
 */
const SystemStatusBodySchema = z.object({
  version: z.literal(SYSTEM_CONTRACT_VERSION),
  state: z.enum(SYSTEM_STATUS_STATES),
  phase: z.string().nullable().optional(),
  retry_after_seconds: SECONDS.optional(),
  estimated_remaining_seconds: SECONDS.nullable().optional(),
  message_code: z.string().optional(),
});

/** A parsed, well-formed version-1 status body. */
export type SystemStatus = {
  state: SystemStatusState;
  /** A known phase, or null (absent, null or unknown). */
  phase: SystemPhase | null;
  retryAfterSeconds: number | null;
  estimatedRemainingSeconds: number | null;
  messageCode: string | null;
};

function knownPhase(value: string | null | undefined): SystemPhase | null {
  return (SYSTEM_PHASES as readonly string[]).includes(value ?? "")
    ? (value as SystemPhase)
    : null;
}

/** Parses a decoded JSON body; null when it is not a valid version-1 body. */
export function parseSystemStatusBody(body: unknown): SystemStatus | null {
  const parsed = SystemStatusBodySchema.safeParse(body);
  if (!parsed.success) return null;
  const data = parsed.data;
  return {
    state: data.state,
    phase: knownPhase(data.phase),
    retryAfterSeconds: data.retry_after_seconds ?? null,
    estimatedRemainingSeconds: data.estimated_remaining_seconds ?? null,
    messageCode: data.message_code ?? null,
  };
}
