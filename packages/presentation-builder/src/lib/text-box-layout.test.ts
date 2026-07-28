import type { CompositionElement } from "@beyo/presentation-runtime";
import { describe, expect, it } from "vitest";

import {
  isHuggingTextHeight,
  textBoxHeightFraction,
  withMeasuredTextHeight,
} from "./text-box-layout";

const textElement = (
  overrides: Partial<CompositionElement> = {},
): CompositionElement => ({
  client_id: "local-text-1",
  element_type: "text",
  sequence_order: 0,
  layer_index: 10,
  start_ms: 0,
  end_ms: 2_000,
  media: null,
  text_content: "The quick brown fox jumps over the lazy dog",
  layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.1, anchor: "center" },
  style: { text_role: "body", text_align: "center", font_size: 44, font_weight: 400 },
  enter_animation: null,
  exit_animation: null,
  ...overrides,
});

/** An element already sitting at its measured height, i.e. still auto-height. */
const hugged = (element: CompositionElement): CompositionElement => ({
  ...element,
  layout: { ...(element.layout ?? {}), height: textBoxHeightFraction(element) },
});

describe("text box layout", () => {
  it("grows as the box narrows and shrinks as it widens", () => {
    const narrow = textBoxHeightFraction(textElement({
      layout: { x: 0.5, y: 0.5, width: 0.25, anchor: "center" },
    }));
    const wide = textBoxHeightFraction(textElement({
      layout: { x: 0.5, y: 0.5, width: 1, anchor: "center" },
    }));
    expect(narrow).toBeGreaterThan(wide);
    expect(wide).toBeGreaterThan(0);
    expect(narrow).toBeLessThanOrEqual(1);
  });

  it("grows with the font size at a fixed width", () => {
    const small = textBoxHeightFraction(textElement({ style: { font_size: 20 } }));
    const large = textBoxHeightFraction(textElement({ style: { font_size: 120 } }));
    expect(large).toBeGreaterThan(small);
  });

  it("re-hugs an auto-height box and leaves the rest of the layout alone", () => {
    const hugging = hugged(textElement());
    const edited = { ...hugging, text_content: "A much longer line that has to wrap several times over" };
    const next = withMeasuredTextHeight(hugging, edited);
    expect(next.layout?.height).toBeCloseTo(textBoxHeightFraction(edited));
    expect(next.layout?.height).toBeGreaterThan(hugging.layout!.height!);
    expect(next.layout?.x).toBe(0.5);
    expect(next.layout?.width).toBe(0.5);
    expect(next.layout?.anchor).toBe("center");
  });

  it("leaves a box the author resized vertically alone", () => {
    const fixed = textElement({
      layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.6, anchor: "center" },
    });
    expect(isHuggingTextHeight(fixed)).toBe(false);
    const edited = { ...fixed, text_content: "Much longer text that would otherwise re-hug the box" };
    expect(withMeasuredTextHeight(fixed, edited).layout?.height).toBe(0.6);
  });

  it("keeps hugging across a font-size change, judging by the pre-edit element", () => {
    const hugging = hugged(textElement());
    const bigger = { ...hugging, style: { ...hugging.style, font_size: 120 } };
    const next = withMeasuredTextHeight(hugging, bigger);
    expect(next.layout?.height).toBeCloseTo(textBoxHeightFraction(bigger));
    expect(next.layout?.height).toBeGreaterThan(hugging.layout!.height!);
  });

  it("returns the same object when nothing needs to change", () => {
    const settled = hugged(textElement());
    expect(withMeasuredTextHeight(settled, settled)).toBe(settled);
  });

  it("never touches media elements", () => {
    const media = textElement({
      element_type: "media",
      text_content: null,
      layout: { x: 0.5, y: 0.5, width: 1, height: 1, fit: "cover" },
    });
    expect(withMeasuredTextHeight(media, media)).toBe(media);
  });
});
