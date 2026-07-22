import { describe, expect, it } from "vitest";

import {
  applyTimelineGesture,
  clampCanvasPosition,
  clampWindowToDuration,
  generateTimelineTicks,
  scrubFractionToTime,
  timeToX,
  xToTime,
} from "./timeline-geometry";

describe("timeline geometry", () => {
  it("converts time and px across the lane", () => {
    expect(timeToX(2_000, 8_000, 600)).toBe(150);
    expect(xToTime(150, 8_000, 600)).toBe(2_000);
    expect(xToTime(-20, 8_000, 600)).toBe(0);
    expect(xToTime(700, 8_000, 600)).toBe(8_000);
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
    expect(clampCanvasPosition(-1, 2)).toEqual({ x: 0.05, y: 0.94 });
  });
});
