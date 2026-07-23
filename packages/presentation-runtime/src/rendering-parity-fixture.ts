import type { CompositionElement } from "./schemas";

export const renderingParityBackgroundColorFixture = "#102A43";

/** Shared by builder-preview and phone-player tests to prevent renderer recipe drift. */
export const renderingParityCompositionFixture = [
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
