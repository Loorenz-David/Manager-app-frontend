import {
  compositionTextStyle,
  SlideCompositionRenderer,
  type CompositionElement,
} from "@beyo/presentation-runtime";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EDITOR_CANVAS_HEIGHT, EDITOR_CANVAS_WIDTH } from "../../lib/composition-mapping";
import { CanvasTextEditOverlay } from "./CanvasTextEditOverlay";

afterEach(cleanup);

const element: CompositionElement = {
  client_id: "local-text-1",
  element_type: "text",
  sequence_order: 0,
  layer_index: 10,
  start_ms: 0,
  end_ms: null,
  media: null,
  text_content: "Antidisestablishmentarianism in a narrow column",
  layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.2, anchor: "center" },
  style: {
    text_align: "center",
    font_size: 44,
    font_weight: 700,
    text_color: "#123456",
    background_color: "#3F78A8",
    border_radius: 16,
    padding: 10,
  },
  enter_animation: null,
  exit_animation: null,
};

/** Properties that decide where a line breaks. Any drift here is a lying editor. */
const WRAP_PROPERTIES = [
  "fontSize",
  "fontWeight",
  "lineHeight",
  "whiteSpace",
  "overflowWrap",
  "padding",
  "textAlign",
  "boxSizing",
] as const;

describe("inline text editor / renderer wrap parity", () => {
  it("edits against exactly the style the renderer paints", () => {
    render(
      <SlideCompositionRenderer
        elements={[element]}
        timeMs={0}
        containerWidth={EDITOR_CANVAS_WIDTH}
        containerHeight={EDITOR_CANVAS_HEIGHT}
      />,
    );
    const rendered = document.querySelector<HTMLElement>("[data-element-id='local-text-1']");
    expect(rendered).not.toBeNull();

    render(
      <CanvasTextEditOverlay
        centerXFraction={0.5}
        centerYFraction={0.5}
        widthFraction={0.5}
        heightFraction={0.2}
        canvasHeightPx={EDITOR_CANVAS_HEIGHT}
        value={element.text_content ?? ""}
        textStyle={compositionTextStyle(element, EDITOR_CANVAS_WIDTH)}
        onChange={vi.fn()}
        onCommit={vi.fn()}
        testId="presentation-canvas-text-editor-local-text-1"
      />,
    );
    const editor = screen.getByLabelText("Edit text on canvas");

    for (const property of WRAP_PROPERTIES) {
      expect(editor.style[property], property).toBe(rendered!.style[property]);
    }
  });

  it("uses an outline so the edit affordance cannot consume content width", () => {
    render(
      <CanvasTextEditOverlay
        centerXFraction={0.5}
        centerYFraction={0.5}
        widthFraction={0.5}
        heightFraction={0.2}
        canvasHeightPx={EDITOR_CANVAS_HEIGHT}
        value="x"
        textStyle={compositionTextStyle(element, EDITOR_CANVAS_WIDTH)}
        onChange={vi.fn()}
        onCommit={vi.fn()}
        testId="presentation-canvas-text-editor-local-text-1"
      />,
    );
    const editor = screen.getByLabelText("Edit text on canvas");
    expect(editor.className).toContain("border-0");
    expect(editor.className).toContain("outline-1");
  });
});
