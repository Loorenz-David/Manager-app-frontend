import { describe, expect, it } from "vitest";
import { resolvePauseReasonTransition } from "./pause-reason-transition";

describe("resolvePauseReasonTransition", () => {
  it("ends the shift only for the reserved ended-shift slug", () => {
    expect(
      resolvePauseReasonTransition({
        slug: "pause_ended_shift",
        requires_description: false,
      }),
    ).toEqual({ newState: "ended_shift", requiresDescription: false });
  });

  it("pauses other reasons and carries the description gate", () => {
    expect(
      resolvePauseReasonTransition({
        slug: "pause_supplier_call",
        requires_description: true,
      }),
    ).toEqual({ newState: "paused", requiresDescription: true });
  });
});
