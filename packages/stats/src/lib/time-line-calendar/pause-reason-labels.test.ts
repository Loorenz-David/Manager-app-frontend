import { describe, expect, it } from "vitest";

import type { PauseReasonLookupMap } from "../../types";
import {
  humanizeReason,
  resolvePauseReasonLabel,
} from "./pause-reason-labels";

const MAP: PauseReasonLookupMap = {
  par_lunch: { name: "Lunch break", image_url: null, pause_type: "personal" },
};

describe("resolvePauseReasonLabel", () => {
  it("resolves a known id to its name", () => {
    expect(resolvePauseReasonLabel("par_lunch", MAP)).toBe("Lunch break");
  });

  it("renders the unspecified sentinel as readable copy", () => {
    expect(resolvePauseReasonLabel("unspecified", MAP)).toBe(
      "No reason specified",
    );
  });

  it("falls back to the raw key for a missing id or free-text", () => {
    // Deleted reason id — not in the map.
    expect(resolvePauseReasonLabel("par_deleted", MAP)).toBe("par_deleted");
    // Roster manual whole-shift pause free-text — already readable.
    expect(resolvePauseReasonLabel("Waiting on manager", MAP)).toBe(
      "Waiting on manager",
    );
  });

  it("returns null for empty values", () => {
    expect(resolvePauseReasonLabel(null, MAP)).toBeNull();
    expect(resolvePauseReasonLabel(undefined, MAP)).toBeNull();
    expect(resolvePauseReasonLabel("", MAP)).toBeNull();
  });
});

describe("humanizeReason", () => {
  it("humanizes a raw state token", () => {
    expect(humanizeReason("ended_shift")).toBe("Ended shift");
    expect(humanizeReason("paused")).toBe("Paused");
  });
});
