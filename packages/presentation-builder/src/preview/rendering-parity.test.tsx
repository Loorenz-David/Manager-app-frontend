import {
  SlideCompositionRenderer,
  type CompositionElement,
} from "@beyo/presentation-runtime";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  renderingParityBackgroundColorFixture,
  renderingParityCompositionFixture,
} from "../../../presentation-runtime/src/rendering-parity-fixture";

describe("builder preview rendering parity fixture", () => {
  it("renders existing published layer-0 media identically in editor and preview", () => {
    const layerZero: CompositionElement = {
      client_id: "aupe_existing_layer_zero",
      element_type: "media",
      sequence_order: 0,
      layer_index: 0,
      start_ms: 0,
      end_ms: null,
      media: {
        client_id: "aupm_existing_layer_zero",
        sequence_order: 0,
        media_type: "image",
        media_url: "https://cdn.example.com/existing-layer-zero.png",
        poster_url: null,
        fallback_url: null,
        alt_text: "Existing layer zero",
        mime_type: "image/png",
        width: 1080,
        height: 1920,
        duration_ms: null,
        is_looping: false,
      },
      text_content: null,
      layout: { x: 0, y: 0, width: 1, height: 1, fit: "cover" },
      style: null,
      enter_animation: null,
      exit_animation: null,
    };

    render(
      <>
        <div data-testid="editor-render">
          <SlideCompositionRenderer
            elements={[layerZero]}
            timeMs={0}
            containerWidth={390}
            containerHeight={690}
          />
        </div>
        <div data-testid="preview-render">
          <SlideCompositionRenderer
            elements={[layerZero]}
            timeMs={0}
            containerWidth={390}
            containerHeight={690}
          />
        </div>
      </>,
    );

    const images = screen.getAllByAltText("Existing layer zero");
    expect(images).toHaveLength(2);
    expect(images[0]?.getAttribute("style")).toBe(images[1]?.getAttribute("style"));
    expect(images[0]?.parentElement?.getAttribute("style")).toBe(
      images[1]?.parentElement?.getAttribute("style"),
    );
  });

  it("renders the shared composition recipe at reference scale", () => {
    const view = render(
      <SlideCompositionRenderer
        elements={renderingParityCompositionFixture}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
        backgroundColor={renderingParityBackgroundColorFixture}
      />,
    );
    expect(
      view.container.querySelector("[data-testid='slide-composition-renderer']"),
    ).toHaveStyle({
      backgroundColor: renderingParityBackgroundColorFixture,
    });
    const headline = screen.getByText("Shared parity headline");
    expect(headline).toHaveStyle({
      left: "31.2px",
      fontSize: "32px",
      color: "#FFFFFF",
      backgroundColor: "#3F78A8",
      borderRadius: "12px",
      padding: "8px",
      textAlign: "center",
    });
    expect(Number.parseFloat(headline.style.top)).toBeCloseTo(496.8);
  });
});
