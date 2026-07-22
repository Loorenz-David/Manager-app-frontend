import { describe, expect, it } from "vitest";

import {
  applyTimelineGesture,
  clampCanvasPosition,
  clampWindowToDuration,
  generateTimelineTicks,
  scrubFractionToTime,
  timeToX,
  timelineWindowFractions,
  xToTime,
} from "./timeline-geometry";

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
