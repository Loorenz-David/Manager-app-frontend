import { describe, expect, it } from "vitest";

import {
  buildStockVersionFormSchema,
  hasStockVersionUpdate,
  initialStockVersionFormValues,
  needsActivationChoice,
  stockVersionFormPlan,
  toCreateStockVersionBody,
  toStockVersionFormOriginal,
  toUpdateStockVersionBody,
  type StockVersionFormOriginal,
  type StockVersionFormValues,
} from "./version-form";
import { sameInstant } from "./version-format";

// Projection R18: instants from local constructors, never ISO literals —
// except the backend's own echo, which is the point of R1.
const NOW = new Date(2026, 9, 1, 12, 0).getTime();
const LATER = new Date(2026, 9, 7, 6, 0).toISOString();
const PAST = new Date(2026, 8, 28, 6, 0).toISOString();
/** v10 §6.7's own example: the backend echoes UTC with "+00:00", never "Z". */
const ECHOED = "2026-10-05T04:00:00+00:00";

function draft(overrides: Partial<StockVersionFormOriginal> = {}): StockVersionFormOriginal {
  return { state: "draft", title: "Autumn run", scheduledAt: null, keepActiveMissing: false, createdAt: new Date(2026, 8, 20).toISOString(), ...overrides };
}
function active(overrides: Partial<StockVersionFormOriginal> = {}): StockVersionFormOriginal {
  return draft({ state: "active", ...overrides });
}
function values(overrides: Partial<StockVersionFormValues> = {}): StockVersionFormValues {
  return { state: "draft", title: "", scheduledAt: null, ...overrides };
}
function validate(original: StockVersionFormOriginal | null, input: StockVersionFormValues) {
  return buildStockVersionFormSchema(original, () => NOW).safeParse(input);
}

describe("version form plans", () => {
  it("creates a draft or an active version, and never demotes an active one", () => {
    expect(stockVersionFormPlan({ state: "draft" }, null)).toBe("create-draft");
    expect(stockVersionFormPlan({ state: "active" }, null)).toBe("create-active");
    expect(stockVersionFormPlan({ state: "draft" }, draft())).toBe("patch");
    expect(stockVersionFormPlan({ state: "active" }, draft())).toBe("patch-then-activate");
    expect(stockVersionFormPlan({ state: "active" }, active())).toBe("patch");
    expect(stockVersionFormPlan({ state: "draft" }, active())).toBe("patch");
  });

  it("starts a new version as a draft and normalises a stored schedule to the form's own format", () => {
    expect(initialStockVersionFormValues(null)).toEqual({ state: "draft", title: "", scheduledAt: null });
    const loaded = initialStockVersionFormValues(draft({ scheduledAt: ECHOED, title: null }));
    expect(loaded).toEqual({ state: "draft", title: "", scheduledAt: new Date(ECHOED).toISOString() });
    expect(initialStockVersionFormValues(active()).state).toBe("active");
  });

  it("reads the original off a version row", () => {
    expect(
      toStockVersionFormOriginal({ state: "draft", title: "X", scheduled_activation_at: ECHOED, scheduled_activation_keeps_active_missing: true, created_at: "2026-09-20T08:00:00+00:00" }),
    ).toEqual({ state: "draft", title: "X", scheduledAt: ECHOED, keepActiveMissing: true, createdAt: "2026-09-20T08:00:00+00:00" });
  });
});

describe("needsActivationChoice (OC-16, OC-17)", () => {
  it("asks on every save of a scheduled draft — new, moved or unchanged", () => {
    expect(needsActivationChoice(values({ scheduledAt: LATER }), null)).toBe("schedule");
    const scheduled = draft({ scheduledAt: ECHOED });
    expect(needsActivationChoice(values({ scheduledAt: LATER }), scheduled)).toBe("schedule");
    expect(needsActivationChoice(values({ title: "Retitled", scheduledAt: new Date(ECHOED).toISOString() }), scheduled)).toBe("schedule");
  });

  it("asks nothing for an unscheduled draft, an active create or an active edit", () => {
    expect(needsActivationChoice(values(), null)).toBeNull();
    expect(needsActivationChoice(values({ title: "New" }), draft())).toBeNull();
    expect(needsActivationChoice(values({ state: "active" }), null)).toBeNull();
    expect(needsActivationChoice(values({ state: "active", title: "New" }), active())).toBeNull();
  });

  it("asks the activate question on a promote, scheduled or not", () => {
    expect(needsActivationChoice(values({ state: "active" }), draft())).toBe("activate");
    expect(needsActivationChoice(values({ state: "active", scheduledAt: null }), draft({ scheduledAt: ECHOED }))).toBe("activate");
  });
});

describe("toCreateStockVersionBody (v9 §5.8)", () => {
  it("stores the placeholder for a blank title, trimmed otherwise", () => {
    expect(toCreateStockVersionBody(values({ title: "   " }), "Thu, 1st October")).toEqual({ draft: true, title: "Thu, 1st October" });
    expect(toCreateStockVersionBody(values({ title: "  Autumn  " }), "Thu, 1st October")).toEqual({ draft: true, title: "Autumn" });
  });

  it("sends the schedule and the flag with a draft, the flag only when the sheet ran", () => {
    expect(toCreateStockVersionBody(values({ scheduledAt: LATER }), "P", true)).toEqual({ draft: true, title: "P", scheduledAt: LATER, keepActiveMissing: true });
    expect(toCreateStockVersionBody(values({ scheduledAt: LATER }), "P")).toEqual({ draft: true, title: "P", scheduledAt: LATER });
  });

  it("never sends a schedule key with draft: false — either one is a 422", () => {
    const body = toCreateStockVersionBody(values({ state: "active", scheduledAt: LATER }), "P", false);
    expect(body).toEqual({ draft: false, title: "P" });
  });
});

describe("toUpdateStockVersionBody (v9 §5.19)", () => {
  /** Projection R1: the backend's "+00:00" echo against the form's "Z" is the same instant. */
  it("sends only the title when only the title changed, against a +00:00 stored schedule", () => {
    const original = draft({ scheduledAt: ECHOED });
    const form = { ...initialStockVersionFormValues(original), title: "Retitled" };
    expect(sameInstant(form.scheduledAt, original.scheduledAt)).toBe(true);
    expect(form.scheduledAt).not.toBe(ECHOED);
    expect(toUpdateStockVersionBody(form, original)).toEqual({ title: "Retitled" });
  });

  it("sends nothing for an untouched form, and null for a cleared title or schedule", () => {
    const original = draft({ scheduledAt: ECHOED });
    const untouched = toUpdateStockVersionBody(initialStockVersionFormValues(original), original);
    expect(untouched).toEqual({});
    expect(hasStockVersionUpdate(untouched)).toBe(false);
    expect(toUpdateStockVersionBody(values({ title: " ", scheduledAt: null }), original)).toEqual({ title: null, scheduledAt: null });
  });

  it("sends a moved schedule and the flag when given", () => {
    const original = draft({ title: null, scheduledAt: ECHOED });
    expect(toUpdateStockVersionBody(values({ scheduledAt: LATER }), original, true)).toEqual({ scheduledAt: LATER, keepActiveMissing: true });
  });

  it("never sends a schedule key for an active version", () => {
    expect(toUpdateStockVersionBody(values({ state: "active", title: "Renamed", scheduledAt: LATER }), active({ title: "Old" }), true)).toEqual({ title: "Renamed" });
  });

  /** Projection R14: activation clears the schedule itself — the promote's patch is the title alone. */
  it("sends the title only on a promote, and nothing when it did not change", () => {
    const original = draft({ scheduledAt: ECHOED });
    expect(toUpdateStockVersionBody(values({ state: "active", title: "Live now" }), original, true)).toEqual({ title: "Live now" });
    const unchanged = toUpdateStockVersionBody(values({ state: "active", title: "Autumn run" }), original, true);
    expect(hasStockVersionUpdate(unchanged)).toBe(false);
  });
});

describe("form validation", () => {
  it("accepts the backend's +00:00 echo and the form's Z alike (R1)", () => {
    expect(validate(null, values({ scheduledAt: new Date(2026, 9, 7, 6, 0).toISOString() })).success).toBe(true);
    const original = draft({ scheduledAt: "2026-10-05T04:00:00+00:00" });
    expect(validate(original, values({ scheduledAt: "2026-10-05T04:00:00+00:00" })).success).toBe(true);
  });

  it("refuses a changed instant in the past, and a schedule on an active version", () => {
    const refused = validate(draft(), values({ scheduledAt: PAST }));
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0]).toMatchObject({ path: ["scheduledAt"], message: "Pick a time in the future." });
    expect(validate(null, values({ state: "active", scheduledAt: LATER })).success).toBe(false);
  });

  /** Projection R2: an overdue draft's untouched schedule never blocks a save. */
  it("lets an overdue draft be retitled, promoted and unscheduled", () => {
    const overdue = draft({ scheduledAt: PAST });
    const loaded = initialStockVersionFormValues(overdue);
    expect(validate(overdue, { ...loaded, title: "Retitled" }).success).toBe(true);
    expect(validate(overdue, { ...loaded, state: "active", scheduledAt: null }).success).toBe(true);
    expect(validate(overdue, { ...loaded, scheduledAt: null }).success).toBe(true);
    // …while moving it to another past instant is still refused.
    expect(validate(overdue, { ...loaded, scheduledAt: new Date(2026, 8, 29, 6, 0).toISOString() }).success).toBe(false);
  });

  it("trims, then caps the title at 200", () => {
    expect(validate(null, values({ title: `  ${"a".repeat(200)}  ` })).success).toBe(true);
    expect(validate(null, values({ title: "a".repeat(201) })).success).toBe(false);
  });
});
