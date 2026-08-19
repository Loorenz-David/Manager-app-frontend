import { describe, expect, it } from "vitest";

import { PriceScenarioDomainSchema, type PriceScenarioDomain } from "../types";
import {
  clampSnap,
  priceDraftReducer,
  priceToSliderFraction,
  resolveProvenanceVariant,
  sliderFractionToPrice,
  type PriceDraftState,
} from "./price-draft";

/** The standard band of every worked example — 82 steps wide. */
const BAND: PriceScenarioDomain = PriceScenarioDomainSchema.parse({
  rule: "break_even_band_v1",
  min_minor: 420000,
  max_minor: 1650000,
  step_minor: 15000,
});

const STEP_COUNT = 82;

/** Every field is overwritten by INIT; this is only the reducer's seat. */
const BLANK: PriceDraftState = {
  draft: 0,
  lastDraft: null,
  initialDefault: null,
  savedExpected: null,
  lastEditedAt: null,
};

function state(overrides: Partial<PriceDraftState>): PriceDraftState {
  return { ...BLANK, ...overrides };
}

const NOW = Date.parse("2026-08-19T09:00:00+00:00");

describe("priceDraftReducer — the M4 transition table", () => {
  it("criterion 14 (T1): initialises the draft from the saved expected price", () => {
    const next = priceDraftReducer(BLANK, {
      type: "INIT",
      savedExpected: 855000,
      purchaseCostMinor: null,
      domain: BAND,
    });

    expect(next.draft).toBe(855000);
    expect(next.lastDraft).toBeNull();
    expect(next.savedExpected).toBe(855000);
    expect(next.initialDefault).toBeNull();
  });

  it("criterion 15 (T2): initialises an unpriced item at purchase cost × 4, snapped", () => {
    const next = priceDraftReducer(BLANK, {
      type: "INIT",
      savedExpected: null,
      purchaseCostMinor: 285000,
      domain: BAND,
    });

    expect(next.draft).toBe(1140000);
    expect(next.initialDefault).toBe(1140000);
    expect(next.draft).toBe(clampSnap(285000 * 4, BAND));
    expect(next.lastDraft).toBeNull();
  });

  it("criterion 16 (T3): a drag moves the draft and leaves lastDraft untouched", () => {
    const next = priceDraftReducer(
      state({ draft: 855000, lastDraft: 1005000, savedExpected: 855000 }),
      { type: "DRAG", priceMinor: 1335000, now: NOW },
    );

    expect(next.draft).toBe(1335000);
    expect(next.lastDraft).toBe(1005000);
    expect(next.lastEditedAt).toBe(NOW);
  });

  it("criterion 17 (T4): Back from a dirty draft stores it and restores the saved price", () => {
    const next = priceDraftReducer(
      state({ draft: 1335000, lastDraft: null, savedExpected: 855000 }),
      { type: "BACK", now: NOW },
    );

    expect(next.draft).toBe(855000);
    expect(next.lastDraft).toBe(1335000);
  });

  it("criterion 18 (T5): Back from the saved price restores lastDraft and clears it", () => {
    const next = priceDraftReducer(
      state({ draft: 855000, lastDraft: 1335000, savedExpected: 855000 }),
      { type: "BACK", now: NOW },
    );

    expect(next.draft).toBe(1335000);
    expect(next.lastDraft).toBeNull();
  });

  it("criterion 19 (T6): a successful save clears the abandoned draft", () => {
    const next = priceDraftReducer(
      state({ draft: 855000, lastDraft: 1335000, savedExpected: 855000 }),
      { type: "SAVE_OK" },
    );

    expect(next.lastDraft).toBeNull();
    expect(next.draft).toBe(855000);
  });

  it("criterion 20 (T7): a refetch with an unchanged saved price preserves draft and lastDraft", () => {
    const before = state({
      draft: 1335000,
      lastDraft: 1005000,
      savedExpected: 855000,
    });

    const next = priceDraftReducer(before, {
      type: "REFETCH",
      savedExpected: 855000,
    });

    expect(next.draft).toBe(1335000);
    expect(next.lastDraft).toBe(1005000);
  });

  it("criterion 21 (T8): a changed saved price is adopted while the draft is pristine", () => {
    const next = priceDraftReducer(
      state({ draft: 855000, lastDraft: null, savedExpected: 855000 }),
      { type: "REFETCH", savedExpected: 900000 },
    );

    expect(next.draft).toBe(900000);
    expect(next.savedExpected).toBe(900000);
  });

  it("criterion 22 (T9): a changed saved price never overwrites a dirty draft", () => {
    const next = priceDraftReducer(
      state({ draft: 1335000, lastDraft: null, savedExpected: 855000 }),
      { type: "REFETCH", savedExpected: 900000 },
    );

    expect(next.draft).toBe(1335000);
    expect(next.savedExpected).toBe(900000);
  });

  it("criterion 23: the M4 invariant sequence ends on the saved price with the abandoned draft remembered", () => {
    let current = priceDraftReducer(BLANK, {
      type: "INIT",
      savedExpected: 855000,
      purchaseCostMinor: null,
      domain: BAND,
    });

    current = priceDraftReducer(current, {
      type: "DRAG",
      priceMinor: 1335000,
      now: NOW,
    });
    current = priceDraftReducer(current, { type: "BACK", now: NOW });
    current = priceDraftReducer(current, { type: "BACK", now: NOW });
    current = priceDraftReducer(current, {
      type: "DRAG",
      priceMinor: 1005000,
      now: NOW,
    });
    current = priceDraftReducer(current, { type: "BACK", now: NOW });

    expect(current.draft).toBe(855000);
    expect(current.savedExpected).toBe(855000);
    expect(current.lastDraft).toBe(1005000);
    expect(resolveProvenanceVariant(current).backTargetMinor).toBe(1005000);

    const saved = priceDraftReducer(current, { type: "SAVE_OK" });

    expect(resolveProvenanceVariant(saved).backTargetMinor).toBeNull();
  });
});

describe("resolveProvenanceVariant — one row per §3.5 variant and guard", () => {
  it("criterion 24a: an untouched unpriced default hides the Back toggle", () => {
    // savedExpected null → cannot be saved-pristine; draft === initialDefault
    // and lastDraft null → neither BACK guard can hold.
    expect(
      resolveProvenanceVariant(
        state({ draft: 1140000, initialDefault: 1140000, savedExpected: null }),
      ),
    ).toEqual({ variant: "unpriced-pristine", backTargetMinor: null });
  });

  it("criterion 24b: sitting on the saved price with nothing abandoned hides the toggle", () => {
    expect(
      resolveProvenanceVariant(
        state({ draft: 855000, lastDraft: null, savedExpected: 855000 }),
      ),
    ).toEqual({ variant: "saved-pristine", backTargetMinor: null });
  });

  it("criterion 24c: sitting on the saved price with an abandoned draft offers it back", () => {
    expect(
      resolveProvenanceVariant(
        state({ draft: 855000, lastDraft: 1005000, savedExpected: 855000 }),
      ),
    ).toEqual({ variant: "saved-pristine", backTargetMinor: 1005000 });
  });

  it("criterion 24d: a dirty draft over a saved price offers the saved price back", () => {
    expect(
      resolveProvenanceVariant(
        state({ draft: 1335000, lastDraft: null, savedExpected: 855000 }),
      ),
    ).toEqual({ variant: "dirty", backTargetMinor: 855000 });
  });

  it("criterion 24e: a dirty draft with no saved price has nowhere to go back to", () => {
    expect(
      resolveProvenanceVariant(
        state({ draft: 1200000, initialDefault: 1140000, savedExpected: null }),
      ),
    ).toEqual({ variant: "dirty", backTargetMinor: null });
  });
});

describe("clampSnap (M5)", () => {
  it("criterion 25: leaves a value already on the grid alone", () => {
    expect(clampSnap(1140000, BAND)).toBe(1140000);
  });

  it("criterion 26: clamps above the band to its top end", () => {
    expect(clampSnap(2000000, BAND)).toBe(1650000);
  });

  it("criterion 27: rounds a half-step tie up", () => {
    expect(clampSnap(427500, BAND)).toBe(435000);
  });

  it("criterion 28: rounds one minor unit below the tie down", () => {
    expect(clampSnap(427499, BAND)).toBe(420000);
  });

  it("criterion 29: is the identity with no band", () => {
    expect(clampSnap(427499, null)).toBe(427499);
  });
});

describe("slider ↔ price mapping (M6)", () => {
  it("criterion 30: fraction 0 is the bottom of the band", () => {
    expect(sliderFractionToPrice(0, BAND)).toBe(420000);
  });

  it("criterion 30a: fraction 0.5 is the middle step of the band", () => {
    expect(sliderFractionToPrice(0.5, BAND)).toBe(1035000);
  });

  it("criterion 30b: fraction 1 is the top of the band", () => {
    expect(sliderFractionToPrice(1, BAND)).toBe(1650000);
  });

  it("criterion 31: an off-grid draft renders at its exact position and survives the round trip", () => {
    const draft = 858000;
    const fraction = priceToSliderFraction(draft, BAND);

    expect(fraction).toBe(438000 / 1230000);
    expect(sliderFractionToPrice(fraction, BAND)).toBe(855000);
    // The render round trip is display-only: the draft it came from is intact.
    expect(draft).toBe(858000);
  });

  it("maps every step index onto its own grid price", () => {
    expect(sliderFractionToPrice(1 / STEP_COUNT, BAND)).toBe(435000);
  });
});
