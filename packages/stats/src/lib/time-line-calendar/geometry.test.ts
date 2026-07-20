import { describe, expect, it } from "vitest";

import {
  clampPxPerHour,
  computeEventLayout,
  DEFAULT_PX_PER_HOUR,
  dayHeightPxOf,
  eventLineBudget,
  groupMarkerMinutes,
  markerOffsetWithinEventPx,
  MAX_PX_PER_HOUR,
  MIN_EVENT_HIT_PX,
  MIN_EVENT_VISUAL_PX,
  MIN_PX_PER_HOUR,
  minuteToOffsetPx,
  pxPerMinuteOf,
} from "./geometry";

const PPH = DEFAULT_PX_PER_HOUR;
const PPM = pxPerMinuteOf(PPH);
const DAY = dayHeightPxOf(PPH);

describe("event geometry", () => {
  it("positions a whole-hour event on the shared scale", () => {
    const layout = computeEventLayout(9 * 60, 10 * 60, PPM);
    expect(layout.top).toBe(9 * PPH);
    expect(layout.height).toBe(PPH);
  });

  it("positions partial-hour and multi-hour events at minute precision", () => {
    const partial = computeEventLayout(9 * 60 + 32, 9 * 60 + 47, PPM);
    expect(partial.top).toBeCloseTo((9 * 60 + 32) * PPM);
    expect(partial.height).toBeCloseTo(15 * PPM);

    const multi = computeEventLayout(7 * 60 + 32, 9 * 60 + 15, PPM);
    expect(multi.height).toBeCloseTo(103 * PPM);
  });

  it("scales with pxPerMinute (zoom)", () => {
    const zoomed = pxPerMinuteOf(MAX_PX_PER_HOUR);
    const layout = computeEventLayout(600, 602, zoomed);
    // A 2-min event clears one text line only when zoomed in.
    expect(layout.height).toBeCloseTo(2 * zoomed);
    expect(layout.height).toBeGreaterThanOrEqual(20);
  });

  it("keeps very short events visible without falsifying their duration", () => {
    const layout = computeEventLayout(600, 601, PPM);
    expect(layout.height).toBe(MIN_EVENT_VISUAL_PX);
    expect(layout.hitHeight).toBe(MIN_EVENT_HIT_PX);
    // The hit target is centered around the visual block.
    expect(layout.hitTop).toBeLessThan(layout.top);
  });

  it("clamps the hit target inside the day bounds at any scale", () => {
    const atTop = computeEventLayout(0, 1, PPM);
    expect(atTop.hitTop).toBe(0);

    const atBottom = computeEventLayout(1439, 1440, PPM);
    expect(atBottom.hitTop + atBottom.hitHeight).toBeLessThanOrEqual(DAY);

    const zoomed = pxPerMinuteOf(MAX_PX_PER_HOUR);
    const atBottomZoomed = computeEventLayout(1439, 1440, zoomed);
    expect(
      atBottomZoomed.hitTop + atBottomZoomed.hitHeight,
    ).toBeLessThanOrEqual(dayHeightPxOf(MAX_PX_PER_HOUR));
  });

  it("spans the full day height", () => {
    expect(minuteToOffsetPx(1440, PPM)).toBe(DAY);
  });
});

describe("zoom scale helpers", () => {
  it("clamps pxPerHour to the zoom range", () => {
    expect(clampPxPerHour(10)).toBe(MIN_PX_PER_HOUR);
    expect(clampPxPerHour(9999)).toBe(MAX_PX_PER_HOUR);
    expect(clampPxPerHour(PPH)).toBe(PPH);
  });

  it("derives pxPerMinute and day height from pxPerHour", () => {
    expect(pxPerMinuteOf(120)).toBe(2);
    expect(dayHeightPxOf(120)).toBe(2880);
  });
});

describe("eventLineBudget", () => {
  it("grants more lines as the block grows, and none when too short", () => {
    expect(eventLineBudget(10)).toBe(0);
    expect(eventLineBudget(19)).toBe(0);
    expect(eventLineBudget(20)).toBe(1);
    expect(eventLineBudget(39)).toBe(1);
    expect(eventLineBudget(40)).toBe(2);
    expect(eventLineBudget(57)).toBe(2);
    expect(eventLineBudget(58)).toBe(3);
    expect(eventLineBudget(500)).toBe(3);
  });
});

describe("markerOffsetWithinEventPx", () => {
  it("positions a marker at its minute inside the event", () => {
    expect(markerOffsetWithinEventPx(630, 600, 660, PPM)).toBeCloseTo(
      30 * PPM,
    );
  });

  it("clips markers outside the event to its bounds", () => {
    expect(markerOffsetWithinEventPx(500, 600, 660, PPM)).toBe(0);
    expect(markerOffsetWithinEventPx(700, 600, 660, PPM)).toBeCloseTo(
      60 * PPM,
    );
  });
});

describe("groupMarkerMinutes", () => {
  it("groups near-coincident markers and keeps distant ones separate", () => {
    const groups = groupMarkerMinutes([
      { minute: 100 },
      { minute: 104 },
      { minute: 130 },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("chains transitively within the threshold", () => {
    const groups = groupMarkerMinutes(
      [{ minute: 10 }, { minute: 16 }, { minute: 22 }],
      8,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(3);
  });
});
