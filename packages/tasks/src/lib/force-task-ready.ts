import { ApiRequestError } from "@beyo/api-client";

import type { TaskState } from "../types";
import type { StepState } from "./step-state-variants";

/**
 * Step states the backend will close when a task is forced ready. Everything
 * else is already terminal and is left untouched, keeping its own credit.
 */
export const TASK_STEP_OPEN_STATES = [
  "pending",
  "working",
  "paused",
  "ended_shift",
  "blocked",
] as const satisfies readonly StepState[];

export function isOpenStepState(state: string): boolean {
  return (TASK_STEP_OPEN_STATES as readonly string[]).includes(state);
}

/**
 * Task states the endpoint rejects with a 409: already ready, or already
 * closed out. The action is hidden rather than disabled for these.
 */
export const TASK_FORCE_READY_BLOCKED_STATES = [
  "ready",
  "resolved",
  "failed",
  "cancelled",
] as const satisfies readonly TaskState[];

export function canForceTaskReady(state: TaskState | null | undefined): boolean {
  if (!state) {
    return false;
  }

  return !(TASK_FORCE_READY_BLOCKED_STATES as readonly string[]).includes(state);
}

/**
 * The backend returns a flat `{ error: string }` with no error code, so the
 * code is derived from the HTTP status by the api client. Conflict and
 * unprocessable messages are domain-specific and worth showing verbatim; the
 * rest get a written message.
 */
export function resolveForceTaskReadyErrorMessage(
  error: unknown,
): string | null {
  if (!error) {
    return null;
  }

  if (!(error instanceof ApiRequestError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "not_found":
      return "This task no longer exists.";
    case "forbidden":
      return "You do not have permission to force a task ready.";
    case "conflict":
    case "unprocessable":
      return error.message;
    case "network_error":
      return "Check your connection and try again.";
    case "server_error":
      return "Something went wrong on our end. Please try again.";
    default:
      return error.message;
  }
}
