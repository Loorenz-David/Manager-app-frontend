import { describe, expect, it } from "vitest";

import { humanizeReason, pauseReasonLabel } from "./pause-reason-labels";

describe("pauseReasonLabel", () => {
  it("maps every known reason to its display label", () => {
    expect(pauseReasonLabel("pause_lunch_break")).toBe("Lunch break");
    expect(pauseReasonLabel("pause_coffee_break")).toBe("Coffee break");
    expect(pauseReasonLabel("pause_meeting")).toBe("Meeting");
    expect(pauseReasonLabel("pause_case_created")).toBe("Case created");
    expect(pauseReasonLabel("pause_other_task_priority")).toBe(
      "Other task priority",
    );
    expect(pauseReasonLabel("pause_ended_shift")).toBe("Ended shift");
    expect(pauseReasonLabel("waiting_for_upholstery")).toBe(
      "Waiting for upholstery",
    );
    expect(pauseReasonLabel("unspecified")).toBe("Pause");
  });

  it("humanizes unknown reasons instead of failing", () => {
    expect(pauseReasonLabel("waiting_for_material")).toBe(
      "Waiting for material",
    );
    expect(pauseReasonLabel("pause_new_backend_reason")).toBe(
      "New backend reason",
    );
  });

  it("falls back to a generic label for null/empty values", () => {
    expect(pauseReasonLabel(null)).toBe("Pause");
    expect(pauseReasonLabel(undefined)).toBe("Pause");
    expect(pauseReasonLabel("")).toBe("Pause");
    expect(humanizeReason("pause_")).toBe("Pause");
  });
});
