import { ApiRequestError } from "@beyo/api-client";
import { describe, expect, it } from "vitest";
import { stockReportRequestFailureMessage } from "./stock-report-request-failure";

const GENERIC = "The change could not be saved. Pull to refresh and try again.";

/**
 * Mirrors the three response shapes of the 2026-09-22 contract §1 as the
 * api-client hands them over: a domain refusal lifts `error` into `message`, a
 * body-shape 422 keeps pydantic's array under `details`, and a 403 puts its
 * sentence in `message` with the same string under `details`.
 */
describe("stockReportRequestFailureMessage", () => {
  it("shows the backend's own sentence for a domain refusal", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "Row has no priority."),
      ),
    ).toBe("Row has no priority.");
  });

  it("shows the role refusal sentence", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(403, "forbidden", "Insufficient role permissions.", {
          details: "Insufficient role permissions.",
        }),
      ),
    ).toBe("Insufficient role permissions.");
  });

  it("falls back for a pydantic body-shape 422, a schema mismatch and a bare transport failure", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "Request failed.", {
          details: [{ type: "int_type", loc: ["body", "priority_order"], msg: "…" }],
        }),
      ),
    ).toBe(GENERIC);
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(502, "invalid_response", "API response did not match expected schema: …"),
      ),
    ).toBe(GENERIC);
    expect(stockReportRequestFailureMessage(new ApiRequestError(500, "server_error", ""))).toBe(GENERIC);
    expect(stockReportRequestFailureMessage(new TypeError("Failed to fetch"))).toBe(GENERIC);
  });
});
