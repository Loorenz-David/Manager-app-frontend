import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CompositionElement } from "./schemas";
import { SlideCompositionRenderer } from "./SlideCompositionRenderer";

const recipe: CompositionElement = {
  client_id: "aupe_timed",
  element_type: "text",
  sequence_order: 0,
  layer_index: 10,
  start_ms: 1_000,
  end_ms: 3_000,
  media: null,
  text_content: "Timed",
  layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.1, anchor: "center" },
  style: { font_size: 44, font_weight: 700 },
  enter_animation: { type: "fade_up", duration_ms: 450 },
  exit_animation: { type: "fade", duration_ms: 450 },
};

describe("time-driven SlideCompositionRenderer", () => {
  it("renders the same recipe at multiple timeline times", () => {
    const view = render(<SlideCompositionRenderer elements={[recipe]} timeMs={1_000} containerWidth={264} containerHeight={470} />);
    const element = () => view.container.querySelector<HTMLElement>("[data-element-id='aupe_timed']");
    expect(element()?.style.opacity).toBe("0");
    expect(element()?.style.transform).toContain("translateY(20px)");

    view.rerender(<SlideCompositionRenderer elements={[recipe]} timeMs={1_225} containerWidth={264} containerHeight={470} />);
    expect(element()?.style.opacity).toBe("0.5");
    expect(element()?.style.transform).toContain("translateY(10px)");

    view.rerender(<SlideCompositionRenderer elements={[recipe]} timeMs={2_775} containerWidth={264} containerHeight={470} />);
    expect(element()?.style.opacity).toBe("0.5");

    view.rerender(<SlideCompositionRenderer elements={[recipe]} timeMs={3_000} containerWidth={264} containerHeight={470} />);
    expect(element()).toBeNull();

    view.rerender(<SlideCompositionRenderer elements={[recipe]} timeMs={3_000} containerWidth={264} containerHeight={470} forceVisibleElementId="aupe_timed" />);
    expect(element()?.style.opacity).toBe("0.25");
  });
});
