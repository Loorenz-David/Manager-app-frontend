import { describe, expect, it } from "vitest";

import {
  applyTimelineGesture,
  clampCanvasPosition,
  clampWindowToDuration,
  generateTimelineTicks,
  resizeElementLayout,
  scrubFractionToTime,
  timeToX,
  timelineWindowFractions,
  xToTime,
} from "./timeline-geometry";

function expectLayout(
  actual: ReturnType<typeof resizeElementLayout>,
  expected: { x: number; y: number; width: number; height: number },
) {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.width).toBeCloseTo(expected.width);
  expect(actual.height).toBeCloseTo(expected.height);
}

describe("timeline geometry", () => {
  it("converts time and px across the lane", () => {
    expect(timeToX(2_000, 8_000, 600)).toBe(150);
    expect(xToTime(150, 8_000, 600)).toBe(2_000);
    expect(xToTime(-20, 8_000, 600)).toBe(0);
    expect(xToTime(700, 8_000, 600)).toBe(8_000);
    expect(timeToX(-1_000, 8_000, 600)).toBe(0);
    expect(timeToX(9_000, 8_000, 600)).toBe(600);
    expect(timeToX(1_000, 0, 600)).toBe(0);
    expect(timeToX(1_000, 8_000, 0)).toBe(0);
    expect(xToTime(1, 0, 600)).toBe(0);
    expect(xToTime(1, 8_000, 0)).toBe(0);
  });

  it("moves a window while preserving its length and clamping both edges", () => {
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "move", deltaPx: 400, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 2_000, endMs: 4_000 });
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "move", deltaPx: -400, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 0, endMs: 2_000 });
  });

  it("resizes either handle with a 400ms minimum and duration bounds", () => {
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "resize-start", deltaPx: 700, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 2_600, endMs: 3_000 });
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "resize-end", deltaPx: -700, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 1_000, endMs: 1_400 });
  });

  it("clamps elements when duration shrinks instead of blocking", () => {
    expect(clampWindowToDuration({ startMs: 4_500, endMs: 7_000 }, 5_000)).toEqual({
      startMs: 4_500,
      endMs: 5_000,
    });
    expect(clampWindowToDuration({ startMs: 4_900, endMs: 7_000 }, 5_000)).toEqual({
      startMs: 4_600,
      endMs: 5_000,
    });
    expect(clampWindowToDuration({ startMs: -100, endMs: 50 }, 300, 400)).toEqual({
      startMs: 0,
      endMs: 300,
    });
    expect(clampWindowToDuration({ startMs: 10, endMs: 20 }, -1, -100)).toEqual({
      startMs: 0,
      endMs: 0,
    });
  });

  it("generates second ticks and clamps scrub/canvas fractions", () => {
    expect(generateTimelineTicks(4_500)).toEqual([
      { label: "0s", fraction: 0 },
      { label: "1s", fraction: 1 / 4.5 },
      { label: "2s", fraction: 2 / 4.5 },
      { label: "3s", fraction: 3 / 4.5 },
      { label: "4s", fraction: 4 / 4.5 },
    ]);
    expect(scrubFractionToTime(1.5, 4_000)).toBe(4_000);
    expect(scrubFractionToTime(-1, -4_000)).toBe(0);
    expect(clampCanvasPosition(-1, 2)).toEqual({ x: 0.05, y: 0.94 });
    expect(clampCanvasPosition(0.5, 0.5)).toEqual({ x: 0.5, y: 0.5 });
    expect(generateTimelineTicks(0)).toEqual([]);
    expect(timelineWindowFractions({ startMs: -500, endMs: 9_000 }, 8_000)).toEqual({
      leftFraction: 0,
      widthFraction: 1,
    });
    expect(timelineWindowFractions({ startMs: 2_000, endMs: 4_000 }, 0)).toEqual({
      leftFraction: 0,
      widthFraction: 0,
    });
  });

  it("normalizes invalid gesture geometry and clamps both resize bounds", () => {
    expect(applyTimelineGesture(
      { startMs: 100, endMs: 800 },
      { kind: "move", deltaPx: 20, laneWidthPx: 0 },
      1_000,
    )).toEqual({ startMs: 100, endMs: 800 });
    expect(applyTimelineGesture(
      { startMs: 100, endMs: 800 },
      { kind: "move", deltaPx: 20, laneWidthPx: 100 },
      0,
    )).toEqual({ startMs: 0, endMs: 0 });
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "resize-start", deltaPx: -900, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 0, endMs: 3_000 });
    expect(applyTimelineGesture(
      { startMs: 1_000, endMs: 3_000 },
      { kind: "resize-end", deltaPx: 900, laneWidthPx: 800 },
      4_000,
    )).toEqual({ startMs: 1_000, endMs: 4_000 });
  });
});

describe("canvas resize geometry", () => {
  const landscape = { x: 0.5, y: 0.5, width: 0.4, height: 0.2 };

  it.each([
    ["e", 0.1, 0, { x: 0.55, y: 0.5, width: 0.5, height: 0.2 }],
    ["w", -0.1, 0, { x: 0.45, y: 0.5, width: 0.5, height: 0.2 }],
    ["s", 0, 0.1, { x: 0.5, y: 0.55, width: 0.4, height: 0.3 }],
    ["n", 0, -0.1, { x: 0.5, y: 0.45, width: 0.4, height: 0.3 }],
  ] as const)("resizes the %s edge freely", (handle, deltaXFraction, deltaYFraction, expected) => {
    expectLayout(
      resizeElementLayout(landscape, { handle, deltaXFraction, deltaYFraction }),
      expected,
    );
  });

  it.each([
    ["se", 0.2, 0.02, { x: 0.6, y: 0.55, width: 0.6, height: 0.3 }],
    ["sw", -0.2, 0.02, { x: 0.4, y: 0.55, width: 0.6, height: 0.3 }],
    ["ne", 0.2, -0.02, { x: 0.6, y: 0.45, width: 0.6, height: 0.3 }],
    ["nw", -0.2, -0.02, { x: 0.4, y: 0.45, width: 0.6, height: 0.3 }],
  ] as const)(
    "aspect-locks the %s corner from a horizontal-dominant landscape gesture",
    (handle, deltaXFraction, deltaYFraction, expected) => {
      expectLayout(
        resizeElementLayout(landscape, { handle, deltaXFraction, deltaYFraction }),
        expected,
      );
    },
  );

  it.each([
    ["se", 0.02, 0.2, { x: 0.55, y: 0.6, width: 0.3, height: 0.6 }],
    ["sw", -0.02, 0.2, { x: 0.45, y: 0.6, width: 0.3, height: 0.6 }],
    ["ne", 0.02, -0.2, { x: 0.55, y: 0.4, width: 0.3, height: 0.6 }],
    ["nw", -0.02, -0.2, { x: 0.45, y: 0.4, width: 0.3, height: 0.6 }],
  ] as const)(
    "aspect-locks the %s corner from a vertical-dominant portrait gesture",
    (handle, deltaXFraction, deltaYFraction, expected) => {
      expectLayout(
        resizeElementLayout(
          { x: 0.5, y: 0.5, width: 0.2, height: 0.4 },
          { handle, deltaXFraction, deltaYFraction },
        ),
        expected,
      );
    },
  );

  it.each([
    ["e", -1, 0, { x: 0.325, y: 0.5, width: 0.05, height: 0.2 }],
    ["w", 1, 0, { x: 0.675, y: 0.5, width: 0.05, height: 0.2 }],
    ["s", 0, -1, { x: 0.5, y: 0.425, width: 0.4, height: 0.05 }],
    ["n", 0, 1, { x: 0.5, y: 0.575, width: 0.4, height: 0.05 }],
  ] as const)("applies minimum size at the %s edge", (
    handle,
    deltaXFraction,
    deltaYFraction,
    expected,
  ) => {
    expectLayout(
      resizeElementLayout(landscape, { handle, deltaXFraction, deltaYFraction }),
      expected,
    );
  });

  it.each([
    ["e", 1, 0, { x: 0.65, y: 0.5, width: 0.7, height: 0.2 }],
    ["w", -1, 0, { x: 0.35, y: 0.5, width: 0.7, height: 0.2 }],
    ["s", 0, 1, { x: 0.5, y: 0.7, width: 0.4, height: 0.6 }],
    ["n", 0, -1, { x: 0.5, y: 0.3, width: 0.4, height: 0.6 }],
  ] as const)("clamps the %s edge to the canvas", (
    handle,
    deltaXFraction,
    deltaYFraction,
    expected,
  ) => {
    expectLayout(
      resizeElementLayout(landscape, { handle, deltaXFraction, deltaYFraction }),
      expected,
    );
  });

  it.each([
    ["se", 1, 1, { x: 0.65, y: 0.575, width: 0.7, height: 0.35 }],
    ["sw", -1, 1, { x: 0.35, y: 0.575, width: 0.7, height: 0.35 }],
    ["ne", 1, -1, { x: 0.65, y: 0.425, width: 0.7, height: 0.35 }],
    ["nw", -1, -1, { x: 0.35, y: 0.425, width: 0.7, height: 0.35 }],
  ] as const)("clamps the aspect-locked %s corner to the canvas", (
    handle,
    deltaXFraction,
    deltaYFraction,
    expected,
  ) => {
    expectLayout(
      resizeElementLayout(landscape, { handle, deltaXFraction, deltaYFraction }),
      expected,
    );
  });

  it("applies the minimum to aspect-locked corners and normalizes an invalid base", () => {
    expectLayout(
      resizeElementLayout(landscape, {
        handle: "se",
        deltaXFraction: -1,
        deltaYFraction: -1,
      }),
      { x: 0.35, y: 0.425, width: 0.1, height: 0.05 },
    );
    expectLayout(
      resizeElementLayout(
        { x: -1, y: 2, width: 2, height: 0.01 },
        { handle: "e", deltaXFraction: 0, deltaYFraction: 0 },
      ),
      { x: 0.5, y: 0.975, width: 1, height: 0.05 },
    );
  });
});
