import { describe, expect, it } from "vitest";

import type { CompositionElement, SlideMedia } from "@beyo/presentation-runtime";
import {
  editorAnimationToWire,
  editorCompositionToPutBody,
  editorFontSizeToWire,
  putElementToServerElement,
  serverElementsToEditorComposition,
  wireAnimationToEditor,
  wireFontSizeToEditor,
  type EditorComposition,
  type TextMeasurementAdapter,
} from "./composition-mapping";

const media: SlideMedia = {
  client_id: "aupm_fixture",
  sequence_order: 1,
  media_type: "image",
  media_url: "https://example.com/fixture.png",
  poster_url: null,
  fallback_url: null,
  alt_text: "Fixture",
  mime_type: "image/png",
  width: 1080,
  height: 1920,
  duration_ms: null,
  is_looping: false,
};

const measure: TextMeasurementAdapter = () => ({ widthPx: 132, heightPx: 47 });

const editorFixture: EditorComposition = {
  durationMs: 4_000,
  elements: [
    {
      id: "aupe_media",
      kind: "media",
      sequenceOrder: 0,
      layerIndex: 0,
      startMs: 0,
      endMs: null,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fit: "cover",
      media,
      animIn: "none",
      animOut: "none",
    },
    {
      id: "aupe_text",
      kind: "text",
      sequenceOrder: 1,
      layerIndex: 10,
      startMs: 500,
      endMs: 3_500,
      x: 0.5,
      y: 0.32,
      width: 0.5,
      height: 0.1,
      content: "See what's new",
      sizePx: 30,
      weight: 700,
      role: "heading",
      textAlign: "center",
      animIn: "slide",
      animOut: "fade",
    },
  ],
};

describe("composition mapping", () => {
  it("maps the authoritative ms/layout/font/animation contract", () => {
    const body = editorCompositionToPutBody(editorFixture, measure);
    expect(body).toMatchObject({
      playback_mode: "timed",
      duration_ms: 4_000,
      composition_schema_version: 1,
    });
    expect(body.elements[1]).toMatchObject({
      element_type: "text",
      start_ms: 500,
      end_ms: 3_500,
      layout: { x: 0.5, y: 0.32, width: 0.5, height: 0.1, anchor: "center" },
      style: { font_size: 44, font_weight: 700, text_role: "headline" },
      enter_animation: { type: "fade_up", duration_ms: 450 },
      exit_animation: { type: "fade", duration_ms: 450 },
    });
  });

  it("round-trips editor state → PUT body → server response → hydrate with deep equality", () => {
    const body = editorCompositionToPutBody(editorFixture, measure);
    const mediaById = new Map([[media.client_id, media]]);
    const serverElements = body.elements.map((element, index) =>
      putElementToServerElement(
        element,
        {
          clientId: editorFixture.elements[index]!.id,
          sequenceOrder: index,
          mediaById,
        },
      ),
    );
    const hydrated = serverElementsToEditorComposition(body.duration_ms!, serverElements);

    expect(hydrated).toEqual(editorFixture);
  });

  it("maps every animation choice and font-size direction", () => {
    expect(editorAnimationToWire("none")).toEqual({ type: "none" });
    expect(editorAnimationToWire("fade")).toEqual({ type: "fade", duration_ms: 450 });
    expect(editorAnimationToWire("slide")).toEqual({ type: "fade_up", duration_ms: 450 });
    expect(wireAnimationToEditor(null)).toBe("none");
    expect(wireAnimationToEditor({ type: "none" })).toBe("none");
    expect(wireAnimationToEditor({ type: "fade" })).toBe("fade");
    expect(wireAnimationToEditor({ type: "zoom" })).toBe("slide");
    expect(wireFontSizeToEditor(editorFontSizeToWire(30))).toBe(30);
  });

  it("clamps measured text dimensions and maps body/default timing", () => {
    const body = editorCompositionToPutBody({
      durationMs: 4_000,
      elements: [{
        ...editorFixture.elements[1]!,
        kind: "text",
        role: "body",
        weight: 400,
        endMs: null,
        startMs: 9_000,
      }],
    }, () => ({ widthPx: 0, heightPx: 10_000 }));

    expect(body.elements[0]).toMatchObject({
      start_ms: 4_000,
      end_ms: null,
      layout: { width: Number.EPSILON, height: 1 },
      style: { text_role: "body", font_weight: 400 },
    });
  });

  it("maps overlay media with a centered anchor", () => {
    const overlay = editorCompositionToPutBody({
      durationMs: 4_000,
      elements: [{
        ...editorFixture.elements[0]!,
        kind: "media",
        layerIndex: 2,
        endMs: 3_000,
      }],
    }, measure);
    expect(overlay.elements[0]?.layout).toMatchObject({ anchor: "center" });
  });

  it("hydrates media/text defaults, alternate fits, and drops unusable elements", () => {
    const base = {
      client_id: "aupe_base",
      sequence_order: 0,
      layer_index: 0,
      start_ms: 0,
      end_ms: null,
      layout: null,
      style: null,
      enter_animation: null,
      exit_animation: null,
    } as const;
    const elements: CompositionElement[] = [
      { ...base, client_id: "aupe_missing_media", element_type: "media", media: null, text_content: null },
      { ...base, client_id: "aupe_contain", element_type: "media", media, text_content: null, layout: { fit: "contain" } },
      { ...base, client_id: "aupe_fill", sequence_order: 2, element_type: "media", media, text_content: null, layout: { x: 0.2, y: 0.3, width: 0, height: 2, fit: "fill" } },
      { ...base, client_id: "aupe_cover", sequence_order: 3, element_type: "media", media, text_content: null, layout: { fit: "none" } },
      { ...base, client_id: "aupe_missing_text", sequence_order: 4, element_type: "text", media: null, text_content: null },
      { ...base, client_id: "aupe_body", sequence_order: 5, element_type: "text", media: null, text_content: "Body" },
      { ...base, client_id: "aupe_heading", sequence_order: 6, element_type: "text", media: null, text_content: "Heading", style: { font_weight: 700, font_size: 44, text_align: "left" } },
    ];

    const hydrated = serverElementsToEditorComposition(4_000, elements);
    expect(hydrated.elements.map((element) => element.id)).toEqual([
      "aupe_contain",
      "aupe_fill",
      "aupe_cover",
      "aupe_body",
      "aupe_heading",
    ]);
    expect(hydrated.elements[0]).toMatchObject({ fit: "contain", x: 0, y: 0, width: 1, height: 1 });
    expect(hydrated.elements[1]).toMatchObject({ fit: "fill", x: 0.2, y: 0.3, width: Number.EPSILON, height: 1 });
    expect(hydrated.elements[2]).toMatchObject({ fit: "cover" });
    expect(hydrated.elements[3]).toMatchObject({ role: "body", weight: 400, textAlign: "center" });
    expect(hydrated.elements[4]).toMatchObject({ role: "heading", weight: 700, textAlign: "left", sizePx: 30 });
  });

  it("fills optional server fields and resolves present, missing, and absent media ids", () => {
    const mediaById = new Map([[media.client_id, media]]);
    expect(putElementToServerElement({ element_type: "media", media_id: media.client_id }, {
      clientId: null,
      sequenceOrder: 1,
      mediaById,
    }).media).toEqual(media);
    expect(putElementToServerElement({ element_type: "media", media_id: "missing" }, {
      clientId: null,
      sequenceOrder: 2,
      mediaById,
    }).media).toBeNull();
    expect(putElementToServerElement({ element_type: "text" }, {
      clientId: null,
      sequenceOrder: 3,
      mediaById,
    })).toMatchObject({
      layer_index: 0,
      start_ms: 0,
      end_ms: null,
      media: null,
      text_content: null,
      layout: null,
      style: null,
      enter_animation: null,
      exit_animation: null,
    });
  });
});
