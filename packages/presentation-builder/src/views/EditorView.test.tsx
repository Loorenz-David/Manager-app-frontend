import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { envelope, fullPresentationFixture } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
import type { Presentation } from "../types";
import { MediaElementPanel } from "../components/panels/MediaElementPanel";
import { SlidePropertiesPanel } from "../components/panels/SlidePropertiesPanel";
import { TextBlockPanel } from "../components/panels/TextBlockPanel";
import { EditorView } from "./EditorView";

const API_PATTERN = "*/api/v1/app-update-presentations";

afterEach(() => cleanup());

function renderEditor(presentation: Presentation = fullPresentationFixture) {
  server.use(
    http.get(`${API_PATTERN}/:id`, () =>
      HttpResponse.json(envelope({ presentation })),
    ),
  );
  const { Wrapper } = createTestContext();
  return render(
    <Wrapper>
      <EditorView presentationId={fullPresentationFixture.client_id} onBack={() => undefined} />
    </Wrapper>,
  );
}

function mediaPresentation(): Presentation {
  const media = {
    client_id: "aupm_stage_c",
    sequence_order: 0,
    media_type: "image" as const,
    media_url: "https://cdn.example.com/stage-c.png",
    poster_url: null,
    fallback_url: null,
    alt_text: "Stage C media",
    mime_type: "image/png",
    width: 1080,
    height: 1920,
    duration_ms: null,
    is_looping: false,
  };
  return {
    ...fullPresentationFixture,
    slides: [{
      ...fullPresentationFixture.slides[0]!,
      media: [media],
      elements: [{
        client_id: "aupe_stage_c",
        element_type: "media",
        sequence_order: 0,
        layer_index: 0,
        start_ms: 0,
        end_ms: null,
        media,
        text_content: null,
        layout: { x: 0.5, y: 0.5, width: 0.4, height: 0.2, fit: "cover", anchor: "center" },
        style: null,
        enter_animation: null,
        exit_animation: null,
      }],
    }],
  };
}

describe("EditorView text canvas interactions", () => {
  it("wires the slide background picker to the canvas renderer and none state", async () => {
    renderEditor();
    fireEvent.click(await screen.findByTestId("presentation-panel-drawer-background"));
    await screen.findByTestId("presentation-panel-slide-background-color");
    const renderer = screen.getAllByTestId("slide-composition-renderer").find(
      (node) => node.closest("[data-testid='presentation-editor-renderer-layer']"),
    );
    if (!renderer) throw new Error("Expected the canvas runtime renderer");

    fireEvent.click(
      screen.getByTestId("presentation-panel-slide-background-color-swatch-3f78a8"),
    );
    expect(renderer).toHaveStyle({ backgroundColor: "#3F78A8" });

    fireEvent.click(
      screen.getByTestId("presentation-panel-slide-background-color-none"),
    );
    expect(renderer.style.backgroundColor).toBe("");
  });

  it("shows existing layer-0 media as one full-width timeline bar and canvas box", async () => {
    const media = {
      client_id: "aupm_layer_zero",
      sequence_order: 0,
      media_type: "image" as const,
      media_url: "https://cdn.example.com/layer-zero.png",
      poster_url: null,
      fallback_url: null,
      alt_text: "Layer zero",
      mime_type: "image/png",
      width: 1080,
      height: 1920,
      duration_ms: null,
      is_looping: false,
    };
    const presentation: Presentation = {
      ...fullPresentationFixture,
      slides: [{
        ...fullPresentationFixture.slides[0]!,
        media: [media],
        elements: [{
          client_id: "aupe_layer_zero",
          element_type: "media",
          sequence_order: 0,
          layer_index: 0,
          start_ms: 0,
          end_ms: null,
          media,
          text_content: null,
          layout: { x: 0, y: 0, width: 1, height: 1, fit: "cover" },
          style: null,
          enter_animation: null,
          exit_animation: null,
        }],
      }],
    };

    renderEditor(presentation);

    const bar = await screen.findByTestId("presentation-timeline-bar-aupe_layer_zero");
    expect(bar).toHaveStyle({ left: "0%", width: "100%" });
    expect(screen.getByTestId("presentation-canvas-element-aupe_layer_zero")).toBeInTheDocument();
    expect(screen.getByTestId("presentation-timeline-add-media-button")).toBeInTheDocument();
    expect(screen.getByTestId("presentation-editor-media-file-input")).toHaveAttribute("multiple");
  });

  it("keeps the runtime renderer pointer-inert and edits new text immediately", async () => {
    renderEditor();
    await screen.findByTestId("presentation-timeline-add-text-button");

    const rendererLayer = screen.getByTestId("presentation-editor-renderer-layer");
    expect(rendererLayer).toHaveClass("pointer-events-none", "select-none");

    fireEvent.click(screen.getByTestId("presentation-timeline-add-text-button"));
    const inlineEditor = await screen.findByLabelText("Edit text on canvas");
    expect(document.activeElement).toBe(inlineEditor);
    expect(inlineEditor).toHaveValue("New text");

    fireEvent.change(inlineEditor, { target: { value: "Hello" } });
    expect(inlineEditor).toHaveValue("Hello");
    fireEvent.keyDown(inlineEditor, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByLabelText("Edit text on canvas")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("presentation-panel-drawer-content"));
    expect(screen.getByTestId("presentation-panel-text-content")).toHaveValue("Hello");
  });

  it("enters inline edit on double-click and applies panel styling to the canvas", async () => {
    renderEditor();
    await screen.findByTestId("presentation-timeline-add-text-button");
    fireEvent.click(screen.getByTestId("presentation-timeline-add-text-button"));
    const inlineEditor = await screen.findByLabelText("Edit text on canvas");
    fireEvent.change(inlineEditor, { target: { value: "Styled text" } });
    fireEvent.keyDown(inlineEditor, { key: "Escape" });

    const canvasElement = await screen.findByTestId(
      "presentation-canvas-element-local-text-1",
    );
    fireEvent.doubleClick(canvasElement);
    expect(await screen.findByLabelText("Edit text on canvas")).toHaveValue("Styled text");
    fireEvent.keyDown(screen.getByLabelText("Edit text on canvas"), { key: "Escape" });

    fireEvent.click(screen.getByTestId("presentation-panel-drawer-style"));
    fireEvent.click(screen.getByTestId("presentation-panel-text-alignment-right"));
    fireEvent.change(screen.getByTestId("presentation-panel-text-color-hex"), {
      target: { value: "#123456" },
    });
    fireEvent.click(
      screen.getByTestId("presentation-panel-text-background-swatch-3f78a8"),
    );
    fireEvent.change(screen.getByTestId("presentation-panel-text-radius-input"), {
      target: { value: "16" },
    });
    fireEvent.change(screen.getByTestId("presentation-panel-text-padding-input"), {
      target: { value: "10" },
    });

    // Scope to the canvas: the slide-rail thumbnail renders the same element id at a
    // different width, and sizes now scale with the container.
    const rendered = screen
      .getByTestId("presentation-editor-canvas")
      .querySelector<HTMLElement>("[data-element-id='local-text-1']");
    const canvasScale = 264 / 390;
    expect(rendered).toHaveStyle({
      textAlign: "right",
      color: "#123456",
      backgroundColor: "#3F78A8",
      // Padding and radius are authored at the reference width and scale like the font,
      // so the editor canvas and the phone break lines in the same places.
      borderRadius: `${16 * canvasScale}px`,
      padding: `${10 * canvasScale}px`,
      lineHeight: "1.2",
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
    });
  });

  it("round-trips a raw media corner resize through controller layout state", async () => {
    renderEditor(mediaPresentation());
    const box = await screen.findByTestId("presentation-canvas-element-aupe_stage_c");
    fireEvent.pointerDown(box, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(window);

    const handle = screen.getByTestId("presentation-canvas-element-aupe_stage_c-resize-se");
    Object.defineProperty(box.parentElement, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 0,
        top: 0,
        right: 1_000,
        bottom: 1_000,
        left: 0,
        width: 1_000,
        height: 1_000,
        toJSON: () => undefined,
      }),
    });

    fireEvent.pointerDown(handle, { clientX: 400, clientY: 400 });
    fireEvent.pointerMove(window, { clientX: 500, clientY: 410 });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(Number.parseFloat(box.style.left)).toBeCloseTo(55);
      expect(Number.parseFloat(box.style.top)).toBeCloseTo(52.5);
      expect(Number.parseFloat(box.style.width)).toBeCloseTo(50);
      expect(Number.parseFloat(box.style.height)).toBeCloseTo(25);
    });
    expect(screen.getByTestId("presentation-panel-media-geometry")).toHaveTextContent(
      "50% × 25% at 55%, 53%",
    );
  });

  it("patches media appears and disappears through the selected-element update path", async () => {
    renderEditor(mediaPresentation());
    const box = await screen.findByTestId("presentation-canvas-element-aupe_stage_c");
    fireEvent.pointerDown(box);
    fireEvent.pointerUp(window);
    expect(screen.getByTestId("presentation-panel-drawer-media")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByTestId("presentation-panel-drawer-animations"));
    fireEvent.click(screen.getByTestId("presentation-panel-media-appears-fade"));
    fireEvent.click(screen.getByTestId("presentation-panel-media-disappears-slide"));
    expect(screen.getByTestId("presentation-panel-media-appears-fade")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("presentation-panel-media-disappears-slide")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByTestId("presentation-panel-media-close-button"));
    fireEvent.pointerDown(box);
    fireEvent.pointerUp(window);
    expect(screen.getByTestId("presentation-panel-drawer-animations")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByTestId("presentation-panel-media-appears-fade")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("presentation-panel-media-disappears-slide")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("panel kit flat fallback", () => {
  it("renders all panel controls flat when the drawers prop is absent", () => {
    const noop = () => undefined;
    const slide = render(
      <SlidePropertiesPanel
        onReplaceMedia={noop}
        durationSeconds={4}
        onDurationChange={noop}
        backgroundColor={null}
        onBackgroundColorChange={noop}
        ctaLabel=""
        onCtaLabelChange={noop}
        ctaRoute=""
        onCtaRouteChange={noop}
        onCtaCommit={noop}
      />,
    );
    expect(screen.queryByTestId("presentation-panel-drawer-timing")).not.toBeInTheDocument();
    expect(screen.getByTestId("presentation-panel-slide-duration")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-slide-background-color")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-cta-route")).toBeVisible();
    slide.unmount();

    const text = render(
      <TextBlockPanel
        content="Flat text"
        onContentChange={noop}
        onContentCommit={noop}
        appears="none"
        onAppearsChange={noop}
        disappears="none"
        onDisappearsChange={noop}
        sizePx={24}
        onSizeChange={noop}
        styleRole="body"
        onStyleRoleChange={noop}
        styling={{
          align: "left",
          onAlignChange: noop,
          onTextColorChange: noop,
          onBackgroundColorChange: noop,
          borderRadius: 0,
          onBorderRadiusChange: noop,
          padding: 0,
          onPaddingChange: noop,
        }}
        windowLabel="On screen 0.0s → 4.0s"
        onDelete={noop}
        onClose={noop}
      />,
    );
    expect(screen.queryByTestId("presentation-panel-drawer-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("presentation-panel-text-content")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-appears-none")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-text-size")).toBeVisible();
    text.unmount();

    render(
      <MediaElementPanel
        mediaLabel="IMAGE · flat.png"
        fit="cover"
        onFitChange={noop}
        appears="none"
        onAppearsChange={noop}
        disappears="none"
        onDisappearsChange={noop}
        windowLabel="On screen 0.0s → 4.0s"
        onReplace={noop}
        onDelete={noop}
        onClose={noop}
      />,
    );
    expect(screen.queryByTestId("presentation-panel-drawer-media")).not.toBeInTheDocument();
    expect(screen.getByTestId("presentation-panel-media-fit")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-media-appears-none")).toBeVisible();
    expect(screen.getByTestId("presentation-panel-media-replace-button")).toBeVisible();
  });
});
