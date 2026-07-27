import type { CompositionElement } from "./schemas";

export const renderingParityBackgroundColorFixture = "#102A43";

/** Shared by builder-preview and phone-player tests to prevent renderer recipe drift. */
export const renderingParityCompositionFixture = [
  {
    client_id: "aupe_01JPARITYMEDIA",
    element_type: "media",
    sequence_order: 0,
    layer_index: 0,
    start_ms: 0,
    end_ms: null,
    media: {
      client_id: "aupm_01JPARITYMEDIA",
      sequence_order: 0,
      media_type: "image",
      media_url: "https://cdn.example.com/shared-parity-layer-zero.png",
      poster_url: null,
      fallback_url: null,
      alt_text: "Shared parity layer zero",
      mime_type: "image/png",
      width: 1080,
      height: 1920,
      duration_ms: null,
      is_looping: false,
    },
    text_content: null,
    layout: {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fit: "cover",
    },
    style: null,
    enter_animation: null,
    exit_animation: null,
  },
  {
    client_id: "aupe_01JPARITYTEXT",
    element_type: "text",
    sequence_order: 0,
    layer_index: 10,
    start_ms: 0,
    end_ms: null,
    media: null,
    text_content: "Shared parity headline",
    layout: {
      x: 0.08,
      y: 0.72,
      width: 0.84,
      height: 0.15,
      anchor: "top_left",
    },
    style: {
      text_role: "headline",
      text_align: "center",
      font_size: 32,
      font_weight: 700,
      text_color: "#FFFFFF",
      background_color: "#3F78A8",
      border_radius: 12,
      padding: 8,
    },
    enter_animation: { type: "none" },
    exit_animation: null,
  },
] satisfies readonly CompositionElement[];
