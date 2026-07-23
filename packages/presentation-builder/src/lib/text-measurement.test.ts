import { afterEach, describe, expect, it, vi } from "vitest";

import { measureText } from "./text-measurement";

afterEach(() => vi.restoreAllMocks());

describe("measureText", () => {
  it("uses the rendered DOM box when layout is available", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 120,
      bottom: 48,
      left: 0,
      width: 120,
      height: 48,
      toJSON: () => undefined,
    });

    expect(measureText({
      content: "Measured",
      fontSizePx: 20,
      fontWeight: 700,
    })).toEqual({ widthPx: 120, heightPx: 48 });
    expect(document.body.querySelector("span")).toBeNull();
  });

  it("uses one wrapped approximation for mapping and canvas hit areas", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
      toJSON: () => undefined,
    });

    const unwrapped = measureText({
      content: "abcdefghij",
      fontSizePx: 20,
      fontWeight: 400,
    });
    const wrapped = measureText({
      content: "abcdefghij",
      fontSizePx: 20,
      fontWeight: 400,
      maxWidthPx: 60,
      paddingPx: 4,
    });

    expect(unwrapped.widthPx).toBeCloseTo(116);
    expect(unwrapped.heightPx).toBe(24);
    expect(wrapped.widthPx).toBe(60);
    expect(wrapped.heightPx).toBe(80);
  });
});
