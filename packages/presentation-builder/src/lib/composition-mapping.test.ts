import { describe, expect, it } from "vitest";

import type { SlideMedia } from "@beyo/presentation-runtime";
import {
  editorCompositionToPutBody,
  putElementToServerElement,
  serverElementsToEditorComposition,
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
});
