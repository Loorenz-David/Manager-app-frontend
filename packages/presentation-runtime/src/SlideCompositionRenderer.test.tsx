import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REFERENCE_CANVAS_WIDTH,
  SlideCompositionRenderer,
} from "./SlideCompositionRenderer";
import { compareCompositionElements, sortCompositionElements } from "./ordering";
import {
  renderingParityBackgroundColorFixture,
  renderingParityCompositionFixture,
} from "./rendering-parity-fixture";
import type { CompositionElement, SlideMedia } from "./schemas";

afterEach(cleanup);

const IMAGE_MEDIA: SlideMedia = {
  client_id: "aupm_image",
  sequence_order: 1,
  media_type: "image",
  media_url: "https://example.test/image.jpg",
  poster_url: null,
  fallback_url: null,
  alt_text: "Product update",
  mime_type: "image/jpeg",
  width: 390,
  height: 690,
  duration_ms: null,
  is_looping: false,
};

const VIDEO_MEDIA: SlideMedia = {
  ...IMAGE_MEDIA,
  client_id: "aupm_video",
  media_type: "video",
  media_url: "https://example.test/video.mp4",
  poster_url: "https://example.test/poster.jpg",
  mime_type: "video/mp4",
  duration_ms: 8_000,
};

function element(overrides: Partial<CompositionElement>): CompositionElement {
  return {
    client_id: "aupe_default",
    element_type: "text",
    sequence_order: 0,
    layer_index: 10,
    start_ms: 0,
    end_ms: null,
    media: null,
    text_content: "Default",
    layout: null,
    style: null,
    enter_animation: null,
    exit_animation: null,
    ...overrides,
  };
}

function visibleText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-element-type='text']"))
    .map((node) => node.textContent ?? "")
    .join("|");
}

describe("SlideCompositionRenderer backend recipes", () => {
  it("paints the slide background behind every composition element", () => {
    const { getByTestId, getByText } = render(
      <SlideCompositionRenderer
        elements={renderingParityCompositionFixture}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
        backgroundColor={renderingParityBackgroundColorFixture}
      />,
    );

    expect(
      getByTestId("slide-composition-renderer").style.backgroundColor,
    ).toBe("rgb(16, 42, 67)");
    expect(getByText("Shared parity headline")).not.toBeNull();
  });

  it("reports failed backend media so a host can refresh presigned URLs", () => {
    const onMediaError = vi.fn();
    render(
      <SlideCompositionRenderer
        elements={[
          element({
            client_id: "aupe_image_error",
            element_type: "media",
            layer_index: 0,
            media: IMAGE_MEDIA,
            text_content: null,
          }),
          element({
            client_id: "aupe_video_error",
            element_type: "media",
            layer_index: 1,
            media: VIDEO_MEDIA,
            text_content: null,
          }),
        ]}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
        onMediaError={onMediaError}
      />,
    );

    const image = document.querySelector("img");
    const video = document.querySelector("video");
    if (!image || !video) throw new Error("Expected image and video media elements");
    fireEvent.error(image);
    fireEvent.error(video);
    expect(onMediaError).toHaveBeenCalledTimes(2);
  });

  it("renders the text-only timed recipe using [start_ms, end_ms) windows", () => {
    const elements = [
      element({ client_id: "aupe_a", text_content: "A faster workflow", start_ms: 0, end_ms: 3_000 }),
      element({ client_id: "aupe_b", text_content: "Fewer taps", start_ms: 3_000, end_ms: 6_000 }),
      element({ client_id: "aupe_c", text_content: "More control", start_ms: 6_000, end_ms: 8_000 }),
    ];
    const { container, rerender } = render(
      <SlideCompositionRenderer
        elements={elements}
        timeMs={0}
        containerWidth={390}
        containerHeight={690}
      />,
    );

    expect(visibleText(container)).toBe("A faster workflow");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={2_999} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("A faster workflow");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={3_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("Fewer taps");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={6_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("More control");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={8_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("");
  });

  it("renders the media-driven video and synchronized captions", () => {
    const elements = [
      element({
        client_id: "aupe_video",
        element_type: "media",
        layer_index: 0,
        media: VIDEO_MEDIA,
        text_content: null,
      }),
      element({ client_id: "aupe_step_1", text_content: "Step one", start_ms: 1_000, end_ms: 4_000 }),
      element({ client_id: "aupe_step_2", text_content: "Step two", start_ms: 4_000, end_ms: 7_000 }),
    ];
    const { container, rerender } = render(
      <SlideCompositionRenderer elements={elements} timeMs={0} containerWidth={390} containerHeight={690} />,
    );

    expect(container.querySelector("video")?.getAttribute("src")).toBe(VIDEO_MEDIA.media_url);
    expect(visibleText(container)).toBe("");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={1_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("Step one");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={4_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("Step two");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={7_000} containerWidth={390} containerHeight={690} />);
    expect(visibleText(container)).toBe("");
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("renders the manual image-and-caption recipe for the whole slide", () => {
    const elements = [
      element({
        client_id: "aupe_image",
        element_type: "media",
        layer_index: 0,
        media: IMAGE_MEDIA,
        text_content: null,
        layout: { x: 0, y: 0, width: 1, height: 0.7, fit: "cover" },
      }),
      element({
        client_id: "aupe_caption",
        text_content: "Now available on all devices",
        layout: { x: 0.05, y: 0.75, width: 0.9, height: 0.2 },
        style: { text_role: "caption", text_align: "center" },
      }),
    ];
    const { container, rerender } = render(
      <SlideCompositionRenderer elements={elements} timeMs={0} containerWidth={390} containerHeight={690} />,
    );

    const image = container.querySelector("img");
    expect(Number.parseFloat(image?.style.height ?? "NaN")).toBeCloseTo(483);
    expect(image?.style.objectFit).toBe("cover");
    expect(visibleText(container)).toBe("Now available on all devices");
    rerender(<SlideCompositionRenderer elements={elements} timeMs={120_000} containerWidth={390} containerHeight={690} />);
    expect(container.querySelector("img")).not.toBeNull();
    expect(visibleText(container)).toBe("Now available on all devices");
  });
});

describe("SlideCompositionRenderer scaling", () => {
  it.each([
    { width: 58, height: 104 },
    { width: 264, height: 470 },
    { width: 780, height: 900 },
  ])("scales normalized geometry and reference-width fonts at $width×$height", ({ width, height }) => {
    const elements = [
      element({
        layout: { x: 0.1, y: 0.2, width: 0.5, height: 0.25 },
        style: { font_size: 39 },
      }),
    ];
    const { container } = render(
      <SlideCompositionRenderer elements={elements} timeMs={0} containerWidth={width} containerHeight={height} />,
    );
    const node = container.querySelector<HTMLElement>("[data-composition-element]");

    expect(Number.parseFloat(node?.style.left ?? "NaN")).toBeCloseTo(width * 0.1);
    expect(Number.parseFloat(node?.style.top ?? "NaN")).toBeCloseTo(height * 0.2);
    expect(Number.parseFloat(node?.style.width ?? "NaN")).toBeCloseTo(width * 0.5);
    expect(Number.parseFloat(node?.style.height ?? "NaN")).toBeCloseTo(height * 0.25);
    expect(Number.parseFloat(node?.style.fontSize ?? "NaN")).toBeCloseTo(
      39 * (width / REFERENCE_CANVAS_WIDTH),
    );
  });

  it("positions center-anchored layouts around their normalized center", () => {
    const { container } = render(
      <SlideCompositionRenderer
        elements={[
          element({ layout: { x: 0.5, y: 0.5, width: 0.2, height: 0.4, anchor: "center" } }),
        ]}
        timeMs={0}
        containerWidth={200}
        containerHeight={300}
      />,
    );
    const node = container.querySelector<HTMLElement>("[data-composition-element]");

    expect(node?.style.left).toBe("80px");
    expect(node?.style.top).toBe("90px");
  });
});

describe("composition element ordering", () => {
  it("orders by layer, sequence, start, and client id with null ids last and stable", () => {
    const legacyFirst = element({ client_id: null, text_content: "legacy first", layer_index: 3, sequence_order: 2, start_ms: 10 });
    const clientB = element({ client_id: "aupe_b", text_content: "client b", layer_index: 3, sequence_order: 2, start_ms: 10 });
    const legacySecond = element({ client_id: null, text_content: "legacy second", layer_index: 3, sequence_order: 2, start_ms: 10 });
    const earlierStart = element({ client_id: "aupe_z", text_content: "earlier start", layer_index: 3, sequence_order: 2, start_ms: 5 });
    const lowerSequence = element({ client_id: "aupe_y", text_content: "lower sequence", layer_index: 3, sequence_order: 1 });
    const lowerLayer = element({ client_id: "aupe_x", text_content: "lower layer", layer_index: 2 });

    expect(compareCompositionElements(lowerLayer, lowerSequence)).toBeLessThan(0);
    expect(
      sortCompositionElements([
        legacyFirst,
        clientB,
        legacySecond,
        earlierStart,
        lowerSequence,
        lowerLayer,
      ]).map((item) => item.text_content),
    ).toEqual([
      "lower layer",
      "lower sequence",
      "earlier start",
      "client b",
      "legacy first",
      "legacy second",
    ]);
  });

  it("renders legacy synthesized elements whose client_id is null", () => {
    const { container } = render(
      <SlideCompositionRenderer
        elements={[
          element({ client_id: null, text_content: "Legacy headline" }),
          element({ client_id: "aupe_real", text_content: "Stored body", sequence_order: 1 }),
        ]}
        timeMs={0}
        containerWidth={264}
        containerHeight={470}
      />,
    );

    expect(visibleText(container)).toContain("Legacy headline");
    expect(container.querySelector("[data-element-id='legacy']")).not.toBeNull();
  });
});
