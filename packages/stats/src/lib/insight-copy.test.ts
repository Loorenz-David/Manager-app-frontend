import { describe, expect, it } from "vitest";

import { isKnownInsight, resolveInsightCopy } from "./insight-copy";
import { KNOWN_INSIGHT_CODES } from './insight-codes';
import type { WorkerInsight } from "../types";

function makeInsight(overrides: Partial<WorkerInsight> = {}): WorkerInsight {
  return {
    code: "completion_surge",
    polarity: "positive",
    metric: "completed_count",
    target_value: 8,
    baseline_value: 3,
    delta: 5,
    delta_pct: 1.667,
    sample_size: 4,
    severity: "high",
    ...overrides,
  };
}

describe("resolveInsightCopy", () => {
  it('keeps the public kiosk insight-code set stable', () => {
    expect([...KNOWN_INSIGHT_CODES]).toEqual([
      'completion_surge',
      'completion_dip',
      'on_a_roll',
      'deep_focus',
      'faster_pace',
      'slower_pace',
      'rising_pauses',
      'leaving_steps_mid_shift',
      'choppy_work',
      'quality_watch',
    ]);
  });

  it("renders a count insight as 'target vs baseline'", () => {
    const copy = resolveInsightCopy(makeInsight());
    expect(copy).toMatchObject({
      code: "completion_surge",
      title: "Completion surge — 5 more than usual",
      rightValue: "8 vs 3",
      tone: "positive",
    });
  });

  it("renders a ratio insight as 'N.N× baseline'", () => {
    const copy = resolveInsightCopy(
      makeInsight({
        code: "rising_pauses",
        polarity: "negative",
        metric: "avg_pause_seconds",
        target_value: 660,
        baseline_value: 300,
        delta: 360,
      }),
    );
    expect(copy).toMatchObject({
      title: "Idle longer than usual",
      rightValue: "2.2× baseline",
      tone: "negative",
    });
  });

  it("takes valence from polarity, not the delta sign", () => {
    // avg pause went UP (delta positive) but this is a negative signal.
    const copy = resolveInsightCopy(
      makeInsight({
        code: "rising_pauses",
        polarity: "negative",
        delta: 200,
      }),
    );
    expect(copy?.tone).toBe("negative");
  });

  it("omits the right value when the baseline is zero (ratio undefined)", () => {
    const copy = resolveInsightCopy(
      makeInsight({
        code: "deep_focus",
        metric: "focus_ratio",
        baseline_value: 0,
      }),
    );
    expect(copy?.rightValue).toBeNull();
  });

  it("renders on_a_roll as a streak in the title", () => {
    const copy = resolveInsightCopy(
      makeInsight({
        code: "on_a_roll",
        target_value: 4,
        baseline_value: 2,
      }),
    );
    expect(copy?.title).toBe("On a roll — 4-day streak");
    expect(copy?.rightValue).toBe("prev best 2");
  });

  it("returns null for unknown codes", () => {
    expect(resolveInsightCopy(makeInsight({ code: "future_code" }))).toBeNull();
    expect(isKnownInsight(makeInsight({ code: "future_code" }))).toBe(false);
    expect(isKnownInsight(makeInsight())).toBe(true);
  });
});
