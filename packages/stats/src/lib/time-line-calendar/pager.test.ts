import { describe, expect, it } from "vitest";

import {
  applyEdgeResistance,
  computeReleaseVelocity,
  EDGE_RESISTANCE_DIVISOR,
  resolvePanAxis,
  resolvePanSettle,
} from "./pager";

describe("resolvePanAxis", () => {
  it("stays undecided below the lock threshold", () => {
    expect(resolvePanAxis(4, 4)).toBeNull();
    expect(resolvePanAxis(-7, 3)).toBeNull();
  });

  it("locks to the dominant axis once past the threshold", () => {
    expect(resolvePanAxis(-20, 5)).toBe("x");
    expect(resolvePanAxis(9, 2)).toBe("x");
    expect(resolvePanAxis(3, 12)).toBe("y");
    expect(resolvePanAxis(10, 30)).toBe("y");
  });
});

describe("applyEdgeResistance", () => {
  it("rubber-bands drags toward the future clamp", () => {
    expect(applyEdgeResistance(-90, false)).toBe(-90 / EDGE_RESISTANCE_DIVISOR);
  });

  it("leaves permitted directions untouched", () => {
    expect(applyEdgeResistance(-90, true)).toBe(-90);
    expect(applyEdgeResistance(90, false)).toBe(90);
    expect(applyEdgeResistance(90, true)).toBe(90);
  });
});

describe("resolvePanSettle", () => {
  // Day mode: span 1, far from the clamp.
  const day = { viewportWidth: 400, spanDays: 1, maxNextDays: 10 };
  // Three-day mode, far from the clamp.
  const threeDay = { viewportWidth: 400, spanDays: 3, maxNextDays: 10 };

  it("commits one day by distance in either direction (20% of width)", () => {
    expect(resolvePanSettle({ ...day, dx: -90, velocityX: 0 })).toEqual({
      kind: "commit",
      direction: "next",
      days: 1,
    });
    expect(resolvePanSettle({ ...day, dx: 90, velocityX: 0 })).toEqual({
      kind: "commit",
      direction: "prev",
      days: 1,
    });
  });

  it("snaps back on a short slow drag (below 20%)", () => {
    expect(resolvePanSettle({ ...day, dx: -70, velocityX: -0.1 })).toEqual({
      kind: "stay",
    });
    expect(resolvePanSettle({ ...day, dx: 70, velocityX: 0.1 })).toEqual({
      kind: "stay",
    });
  });

  it("steps ONE day on a controlled slide in three-day mode", () => {
    expect(resolvePanSettle({ ...threeDay, dx: -120, velocityX: 0 })).toEqual({
      kind: "commit",
      direction: "next",
      days: 1,
    });
    // Even a long controlled drag stays a one-day step.
    expect(resolvePanSettle({ ...threeDay, dx: 350, velocityX: 0 })).toEqual({
      kind: "commit",
      direction: "prev",
      days: 1,
    });
  });

  it("pages the full span on a momentum fling in three-day mode", () => {
    expect(resolvePanSettle({ ...threeDay, dx: -60, velocityX: -0.8 })).toEqual(
      { kind: "commit", direction: "next", days: 3 },
    );
    expect(resolvePanSettle({ ...threeDay, dx: 60, velocityX: 0.8 })).toEqual({
      kind: "commit",
      direction: "prev",
      days: 3,
    });
  });

  it("caps a next fling to the days remaining before today", () => {
    expect(
      resolvePanSettle({
        ...threeDay,
        maxNextDays: 2,
        dx: -60,
        velocityX: -0.8,
      }),
    ).toEqual({ kind: "commit", direction: "next", days: 2 });
    // Prev flings are never capped.
    expect(
      resolvePanSettle({
        ...threeDay,
        maxNextDays: 2,
        dx: 60,
        velocityX: 0.8,
      }),
    ).toEqual({ kind: "commit", direction: "prev", days: 3 });
  });

  it("ignores flings against the drag direction and negligible drags", () => {
    expect(resolvePanSettle({ ...day, dx: -60, velocityX: 0.8 })).toEqual({
      kind: "stay",
    });
    expect(resolvePanSettle({ ...day, dx: -10, velocityX: -2 })).toEqual({
      kind: "stay",
    });
  });

  it("never commits next at the today clamp", () => {
    expect(
      resolvePanSettle({
        ...day,
        maxNextDays: 0,
        dx: -300,
        velocityX: -2,
      }),
    ).toEqual({ kind: "stay" });
    // Going back is always allowed at the clamp.
    expect(
      resolvePanSettle({
        ...day,
        maxNextDays: 0,
        dx: 300,
        velocityX: 0,
      }),
    ).toEqual({ kind: "commit", direction: "prev", days: 1 });
  });
});

describe("computeReleaseVelocity", () => {
  it("measures over the trailing window only", () => {
    const samples = [
      { t: 0, x: 0 },
      { t: 500, x: 10 },
      { t: 950, x: 100 },
    ];
    // Reference = first sample inside the 100ms window (t >= 900).
    expect(computeReleaseVelocity(samples, 1000, 150)).toBe(1);
  });

  it("reads ~0 for a drag held still before release", () => {
    const samples = [
      { t: 0, x: -200 },
      { t: 950, x: -200 },
    ];
    expect(computeReleaseVelocity(samples, 1000, -200)).toBe(0);
  });

  it("is safe with no samples or zero dt", () => {
    expect(computeReleaseVelocity([], 100, 50)).toBe(0);
    expect(computeReleaseVelocity([{ t: 100, x: 0 }], 100, 50)).toBe(0);
  });
});
