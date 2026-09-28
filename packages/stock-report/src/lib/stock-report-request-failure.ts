import { ApiRequestError } from "@beyo/api-client";

const GENERIC_FAILURE =
  "The change could not be saved. Pull to refresh and try again.";

/**
 * The sentence for each refusal identity this UI can meet (v6 §8, v7 §8,
 * v8 §8). The backend writes `error` as `IDENTITY: its own sentence`; the
 * identity is what the app keys on, the sentence after it is the fallback for
 * an identity this build does not know (v7 §8 "the leading token of `error`").
 */
const IDENTITY_SENTENCE: Record<string, string> = {
  STOCK_REPORT_ROW_HAS_NO_PRIORITY: "This stock need has no priority yet.",
  STOCK_REPORT_TARGET_OUT_OF_RANGE: "That position is out of range.",
  STOCK_REPORT_NO_ACTIVE_SNAPSHOT: "This stock need is not on the live version.",
  STOCK_REPORT_MISSING_EXCEEDS_CEILING: "That is more than what is still uncovered.",
  STOCK_REPORT_VERSION_NOT_DRAFT: "Only a draft can do that.",
  STOCK_REPORT_VERSION_NOT_ACTIVE: "Only the live version can be refreshed.",
  STOCK_REPORT_VERSION_IS_CLOSED: "This version is closed.",
  STOCK_REPORT_SCHEDULE_IN_THE_PAST: "Pick a time in the future.",
  STOCK_REPORT_UNKNOWN_VERSION_STATE: "Unknown version state.",
  STOCK_REPORT_SOURCE_IS_TARGET: "Source and target are the same version.",
  STOCK_REPORT_TARGET_VERSION_IS_CLOSED: "The target version is closed.",
};

const IDENTITY_PATTERN = /^([A-Z][A-Z0-9_]+):\s*([\s\S]*)$/;

/**
 * Splits `IDENTITY: sentence` into its two parts; `null` when the message
 * does not start with an identity token.
 */
export function stockReportFailureIdentity(
  message: string,
): { identity: string; remainder: string } | null {
  const match = IDENTITY_PATTERN.exec(message);
  if (!match) return null;
  return { identity: match[1]!, remainder: match[2]!.trim() };
}

/**
 * The sentence to show when a stock-report request is refused.
 *
 * The backend answers a domain refusal with `{ error: "…", ok: false }` and a
 * human sentence in `error` — that is what the user should read (the row's
 * priority was cleared, the target is out of range). When that sentence
 * starts with an identity token, a known identity reads as this package's
 * sentence and an unknown one as the remainder after the colon. A body-shape
 * 422 instead carries pydantic's array under `detail` with nothing readable,
 * a schema mismatch carries the zod report, and a transport failure may carry
 * nothing; all of those get the generic copy (contract §1, wiring guide W-3).
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
  const parsed = stockReportFailureIdentity(error.message);
  if (!parsed) return error.message;
  const known = IDENTITY_SENTENCE[parsed.identity];
  if (known) return known;
  return parsed.remainder.length > 0 ? parsed.remainder : error.message;
}
