import { describe, expect, it } from "vitest";

import {
  COLOURED_BUDGET_PERCENT,
  SEGMENT_MIN_PERCENT,
  computeFulfilmentSegments,
} from "./fulfilment-bar";

/**
 * The state ids (A1–A7) are the ones in
 * `ui_design_documentation/05-ui-states.md`.
 */
describe("computeFulfilmentSegments", () => {
  it("A1 — no progress: only the remainder, the whole track grey", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 0,
      inProgress: 0,
      inQueue: 0, missing: 0
    });

    expect(segments.fulfilled).toBeNull();
    expect(segments.inProgress).toBeNull();
    expect(segments.remaining).toEqual({ value: 30 });
  });

  it("A2 — partially fulfilled: three segments, proportional, inside the budget", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 8,
      inProgress: 4,
      inQueue: 0, missing: 0
    });

    expect(segments.fulfilled?.value).toBe(8);
    expect(segments.inProgress?.value).toBe(4);
    expect(segments.remaining).toEqual({ value: 18 });

    // 8/30 and 4/30 both clear the 14 % floor, so the raw proportions stand.
    expect(segments.fulfilled?.widthPercent).toBeCloseTo(26.667, 3);
    expect(segments.inProgress?.widthPercent).toBeCloseTo(SEGMENT_MIN_PERCENT, 3);
  });

  it("A3 — work started, nothing fulfilled: no blue segment at all", () => {
    const segments = computeFulfilmentSegments({
      requested: 16,
      fulfilled: 0,
      inProgress: 6,
      inQueue: 0, missing: 0
    });

    expect(segments.fulfilled).toBeNull();
    expect(segments.inProgress?.value).toBe(6);
    expect(segments.inProgress?.widthPercent).toBeCloseTo(37.5, 3);
    expect(segments.remaining).toEqual({ value: 10 });
  });

  it("A4 — a thin slice keeps its 14 % floor while the pair stays inside the 84 % budget", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 28,
      inProgress: 1,
      inQueue: 0, missing: 0
    });

    const colouredTotal =
      (segments.fulfilled?.widthPercent ?? 0) +
      (segments.inProgress?.widthPercent ?? 0);

    expect(segments.remaining).toEqual({ value: 1 });
    expect(colouredTotal).toBeCloseTo(COLOURED_BUDGET_PERCENT, 6);
    // Scaled down proportionally — the raw 3.3 % slice still ends up far wider
    // than its share, because the floor was applied before the scaling.
    expect(segments.inProgress?.widthPercent).toBeGreaterThan(10);
    expect(segments.fulfilled?.widthPercent).toBeGreaterThan(
      segments.inProgress?.widthPercent ?? 0,
    );
  });

  it("A4 — the grey remainder always keeps at least the leftover budget", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 29,
      inProgress: 0,
      inQueue: 0, missing: 0
    });

    expect(segments.remaining).toEqual({ value: 1 });
    expect(segments.fulfilled?.widthPercent).toBeCloseTo(
      COLOURED_BUDGET_PERCENT,
      6,
    );
  });

  it("A5 — fully accounted, none delivered: the pair fills the track, no remainder", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 20,
      inProgress: 10,
      inQueue: 0, missing: 0
    });

    expect(segments.remaining).toBeNull();
    expect(
      (segments.fulfilled?.widthPercent ?? 0) +
        (segments.inProgress?.widthPercent ?? 0),
    ).toBeCloseTo(100, 6);
  });

  it("A6 — complete: blue fills the whole track", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 30,
      inProgress: 0,
      inQueue: 0, missing: 0
    });

    expect(segments.fulfilled).toEqual({ value: 30, widthPercent: 100 });
    expect(segments.inProgress).toBeNull();
    expect(segments.remaining).toBeNull();
  });

  it("A7 — over-fulfilled: the bar clamps at 100 % and the surplus is invisible", () => {
    const segments = computeFulfilmentSegments({
      requested: 10,
      fulfilled: 12,
      inProgress: 0,
      inQueue: 0, missing: 0
    });

    expect(segments.fulfilled).toEqual({ value: 12, widthPercent: 100 });
    expect(segments.remaining).toBeNull();
  });

  it("A7 — over-fulfilled with work in progress still totals exactly 100 %", () => {
    const segments = computeFulfilmentSegments({
      requested: 10,
      fulfilled: 9,
      inProgress: 6,
      inQueue: 0, missing: 0
    });

    expect(segments.remaining).toBeNull();
    expect(
      (segments.fulfilled?.widthPercent ?? 0) +
        (segments.inProgress?.widthPercent ?? 0),
    ).toBeCloseTo(100, 6);
  });

  it("gives queued work its own segment instead of folding it into in progress", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 8,
      inProgress: 4,
      inQueue: 6, missing: 0
    });

    expect(segments.fulfilled?.value).toBe(8);
    expect(segments.inProgress?.value).toBe(4);
    expect(segments.inQueue?.value).toBe(6);
    expect(segments.remaining).toEqual({ value: 12 });
  });

  it("counts queued work against the remainder", () => {
    const withoutQueue = computeFulfilmentSegments({
      requested: 10,
      fulfilled: 2,
      inProgress: 0,
      inQueue: 0, missing: 0
    });
    const withQueue = computeFulfilmentSegments({
      requested: 10,
      fulfilled: 2,
      inProgress: 0,
      inQueue: 3, missing: 0
    });

    expect(withoutQueue.remaining).toEqual({ value: 8 });
    expect(withQueue.remaining).toEqual({ value: 5 });
  });

  it("renders no queue segment when nothing is queued", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 8,
      inProgress: 4,
      inQueue: 0, missing: 0
    });

    expect(segments.inQueue).toBeNull();
  });

  it("shows queued work alone when nothing has started", () => {
    const segments = computeFulfilmentSegments({
      requested: 12,
      fulfilled: 0,
      inProgress: 0,
      inQueue: 5, missing: 0
    });

    expect(segments.fulfilled).toBeNull();
    expect(segments.inProgress).toBeNull();
    expect(segments.inQueue?.value).toBe(5);
    expect(segments.remaining).toEqual({ value: 7 });
  });

  it("keeps three coloured segments inside the budget, each above its floor", () => {
    const segments = computeFulfilmentSegments({
      requested: 100,
      fulfilled: 1,
      inProgress: 1,
      inQueue: 1, missing: 0
    });

    const widths = [
      segments.fulfilled?.widthPercent ?? 0,
      segments.inProgress?.widthPercent ?? 0,
      segments.inQueue?.widthPercent ?? 0,
    ];

    // Three floors come to 42 %, well inside the 84 % budget, so nothing is
    // scaled and every single digit keeps its minimum.
    for (const width of widths) {
      expect(width).toBeCloseTo(SEGMENT_MIN_PERCENT, 6);
    }
    expect(segments.remaining).toEqual({ value: 97 });
  });

  it("scales all three down together when their floors exceed the budget", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 26,
      inProgress: 1,
      inQueue: 1, missing: 0
    });

    const total =
      (segments.fulfilled?.widthPercent ?? 0) +
      (segments.inProgress?.widthPercent ?? 0) +
      (segments.inQueue?.widthPercent ?? 0);

    expect(total).toBeCloseTo(COLOURED_BUDGET_PERCENT, 6);
    expect(segments.inProgress?.widthPercent).toBeCloseTo(
      segments.inQueue?.widthPercent ?? 0,
      6,
    );
    expect(segments.remaining).toEqual({ value: 2 });
  });

  it("floors the remainder at zero rather than reporting a negative shortfall", () => {
    const segments = computeFulfilmentSegments({
      requested: 4,
      fulfilled: 3,
      inProgress: 5,
      inQueue: 0, missing: 0
    });

    expect(segments.remaining).toBeNull();
  });

  it("renders nothing at all when there is no quantity anywhere", () => {
    expect(
      computeFulfilmentSegments({ requested: 0, fulfilled: 0, inProgress: 0, inQueue: 0, missing: 0 }),
    ).toEqual({
      fulfilled: null,
      inProgress: null,
      inQueue: null,
      missing: null,
      remaining: null,
    });
  });

  it("treats a requested quantity of zero as a goal defined by the work itself", () => {
    const segments = computeFulfilmentSegments({
      requested: 0,
      fulfilled: 2,
      inProgress: 2,
      inQueue: 0, missing: 0
    });

    expect(segments.remaining).toBeNull();
    expect(segments.fulfilled?.widthPercent).toBeCloseTo(50, 6);
    expect(segments.inProgress?.widthPercent).toBeCloseTo(50, 6);
  });

  it("ignores negative and non-finite inputs instead of inverting the bar", () => {
    const segments = computeFulfilmentSegments({
      requested: 10,
      fulfilled: -4,
      inProgress: Number.NaN,
      inQueue: -1, missing: 0
    });

    expect(segments.fulfilled).toBeNull();
    expect(segments.inProgress).toBeNull();
    expect(segments.inQueue).toBeNull();
    expect(segments.remaining).toEqual({ value: 10 });
  });
});

/**
 * Missing is the fourth coloured segment (owner, 2026-09-26): units the buyer
 * still has to find, drawn after the work and before the grey remainder.
 */
describe("computeFulfilmentSegments — missing", () => {
  it("renders missing as its own segment and counts it against the remainder", () => {
    const segments = computeFulfilmentSegments({
      requested: 30,
      fulfilled: 8,
      inProgress: 4,
      inQueue: 6,
      missing: 5,
    });

    expect(segments.missing?.value).toBe(5);
    expect(segments.remaining).toEqual({ value: 7 });
  });

  it("renders no missing segment at zero", () => {
    expect(
      computeFulfilmentSegments({ requested: 30, fulfilled: 8, inProgress: 0, inQueue: 0, missing: 0 }).missing,
    ).toBeNull();
  });

  it("keeps four coloured segments inside the budget, each above its floor", () => {
    const segments = computeFulfilmentSegments({
      requested: 100,
      fulfilled: 1,
      inProgress: 1,
      inQueue: 1,
      missing: 1,
    });

    // Four floors come to 56 %, still inside the 84 % budget.
    for (const segment of [segments.fulfilled, segments.inProgress, segments.inQueue, segments.missing]) {
      expect(segment?.widthPercent).toBeCloseTo(SEGMENT_MIN_PERCENT, 6);
    }
    expect(segments.remaining).toEqual({ value: 96 });
  });

  it("fills the track when everything not done is missing", () => {
    const segments = computeFulfilmentSegments({
      requested: 10,
      fulfilled: 6,
      inProgress: 0,
      inQueue: 0,
      missing: 4,
    });

    expect(segments.remaining).toBeNull();
    expect((segments.fulfilled?.widthPercent ?? 0) + (segments.missing?.widthPercent ?? 0)).toBeCloseTo(100, 6);
  });
});
