import { describe, expect, it } from "vitest";

import type { AnimationEasing, AnimationType, CompositionElement } from "./schemas";
import {
  animationRegistry,
  easingFunctions,
  getElementAnimationFrame,
} from "./animation-registry";

const element = (patch: Partial<CompositionElement> = {}): CompositionElement => ({
  client_id: "aupe_fixture",
  element_type: "text",
  sequence_order: 0,
  layer_index: 10,
  start_ms: 1_000,
  end_ms: 3_000,
  media: null,
  text_content: "Fixture",
  layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.2, anchor: "center" },
  style: null,
  enter_animation: { type: "fade_up", duration_ms: 450 },
  exit_animation: { type: "fade", duration_ms: 450 },
  ...patch,
});

describe("animation registry", () => {
  it("contains a recipe for all eight wire animation types", () => {
    const types: AnimationType[] = [
      "none", "fade", "fade_up", "fade_down", "slide_left", "slide_right", "scale_in", "scale_out",
    ];
    expect(Object.keys(animationRegistry).sort()).toEqual(types.sort());
    for (const type of types) expect(animationRegistry[type](0.5, "enter", 20)).toBeDefined();
  });

  it("contains and bounds every wire easing", () => {
    const easings: AnimationEasing[] = ["linear", "ease", "ease_in", "ease_out", "ease_in_out"];
    expect(Object.keys(easingFunctions).sort()).toEqual(easings.sort());
    for (const easing of easings) {
      expect(easingFunctions[easing](0)).toBe(0);
      expect(easingFunctions[easing](1)).toBe(1);
      expect(easingFunctions[easing](0.5)).toBeGreaterThanOrEqual(0);
      expect(easingFunctions[easing](0.5)).toBeLessThanOrEqual(1);
    }
  });

  it("uses the exact pIn/pOut formulas, 450ms default, and 20px fade-up offset", () => {
    expect(getElementAnimationFrame(element(), 999)).toEqual({ opacity: 0 });
    expect(getElementAnimationFrame(element(), 1_000)).toMatchObject({
      opacity: 0,
      transform: "translateY(20px)",
    });
    expect(getElementAnimationFrame(element(), 1_225)).toMatchObject({
      opacity: 0.5,
      transform: "translateY(10px)",
    });
    expect(getElementAnimationFrame(element(), 2_775)).toMatchObject({ opacity: 0.5 });
    expect(getElementAnimationFrame(element(), 3_000)).toEqual({ opacity: 0 });
  });

  it("treats none as an instant step on both boundaries", () => {
    const frame = getElementAnimationFrame(element({
      enter_animation: { type: "none" },
      exit_animation: { type: "none" },
    }), 1_000);
    expect(frame).toEqual({ opacity: 1, transform: undefined });
    expect(getElementAnimationFrame(element({ enter_animation: null, exit_animation: null }), 1_000))
      .toEqual({ opacity: 1, transform: undefined });
  });
});
