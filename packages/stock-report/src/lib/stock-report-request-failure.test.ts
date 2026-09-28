import { ApiRequestError } from "@beyo/api-client";
import { describe, expect, it } from "vitest";
import {
  stockReportFailureIdentity,
  stockReportRequestFailureMessage,
} from "./stock-report-request-failure";

const GENERIC = "The change could not be saved. Pull to refresh and try again.";

/**
 * Mirrors the three response shapes of the 2026-09-22 contract §1 as the
 * api-client hands them over: a domain refusal lifts `error` into `message`, a
 * body-shape 422 keeps pydantic's array under `details`, and a 403 puts its
 * sentence in `message` with the same string under `details`.
 */
describe("stockReportRequestFailureMessage", () => {
  it("shows the backend's own sentence for a domain refusal without an identity token", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "Row has no priority."),
      ),
    ).toBe("Row has no priority.");
  });

  it("reads a known identity token as this package's sentence (v7 §8, projection R16)", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "STOCK_REPORT_ROW_HAS_NO_PRIORITY: this stock report item has no priority"),
      ),
    ).toBe("This stock need has no priority yet.");
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "STOCK_REPORT_VERSION_NOT_ACTIVE: only the active version can be refreshed"),
      ),
    ).toBe("Only the live version can be refreshed.");
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "STOCK_REPORT_SCHEDULE_IN_THE_PAST: scheduled_activation_at must be in the future"),
      ),
    ).toBe("Pick a time in the future.");
  });

  it("reads an unknown identity token as the sentence after the colon", () => {
    expect(
      stockReportRequestFailureMessage(
        new ApiRequestError(422, "unprocessable", "STOCK_REPORT_SOMETHING_NEW: the backend grew a refusal"),
      ),
    ).toBe("the backend grew a refusal");
    // A bare token with nothing after it still reads as itself, never as "".
    expect(
      stockReportRequestFailureMessage(new ApiRequestError(422, "unprocessable", "STOCK_REPORT_SOMETHING_NEW:")),
    ).toBe("STOCK_REPORT_SOMETHING_NEW:");
  });

  it("does not mistake a capitalised sentence for an identity", () => {
    expect(stockReportFailureIdentity("Insufficient role permissions.")).toBeNull();
    expect(stockReportFailureIdentity("Note: keep it")).toBeNull();
    expect(stockReportFailureIdentity("STOCK_REPORT_VERSION_IS_CLOSED: closed")).toEqual({
      identity: "STOCK_REPORT_VERSION_IS_CLOSED",
      remainder: "closed",
    });
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
