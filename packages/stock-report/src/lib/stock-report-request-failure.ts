import { ApiRequestError } from "@beyo/api-client";

const GENERIC_FAILURE =
  "The change could not be saved. Pull to refresh and try again.";

/**
 * The sentence to show when a priority or reorder request is refused.
 *
 * The backend answers a domain refusal with `{ error: "…", ok: false }` and a
 * human sentence in `error` — that is what the user should read (the row's
 * priority was cleared, the target is out of range). A body-shape 422 instead
 * carries pydantic's array under `detail` with nothing readable, a schema
 * mismatch carries the zod report, and a transport failure may carry nothing;
 * all of those get the generic copy (contract §1, wiring guide W-3).
 */
export function stockReportRequestFailureMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return GENERIC_FAILURE;
  if (
    Array.isArray(error.details) ||
    error.code === "invalid_response" ||
    error.message.length === 0
  ) {
    return GENERIC_FAILURE;
  }
  return error.message;
}
