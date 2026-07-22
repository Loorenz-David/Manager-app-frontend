import type { ConsumerPresentation, ConsumerPresentationSlide } from "../types";

export function makeConsumerSlide(
  playbackMode: ConsumerPresentationSlide["playback_mode"] = "manual",
  durationMs = 1_000,
  sequenceOrder = 1,
): ConsumerPresentationSlide {
  return {
    client_id: `aups_01JSLIDE${sequenceOrder}`,
    sequence_order: sequenceOrder,
    title: null,
    description: null,
    layout_type: "media_top",
    playback_mode: playbackMode,
    duration_ms: durationMs,
    composition_schema_version: 1,
    media: [],
    action: null,
    elements: [],
  };
}

export const consumerPresentationFixture: ConsumerPresentation = {
  client_id: "aup_01JCONSUMER",
  logical_client_id: "aup_01JCONSUMER",
  version: 2,
  title: "A faster way to find products",
  summary: "Search by SKU, article number, or customer.",
  presentation_type: "modal",
  category: "improvement",
  is_dismissible: true,
  display_priority: 100,
  published_at: "2026-07-22T18:00:00+00:00",
  starts_at: null,
  expires_at: null,
  slides: [makeConsumerSlide("manual", 1_000, 1), makeConsumerSlide("manual", 1_000, 2)],
  view_state: { status: "unseen", last_slide_index: 0 },
};

export const envelope = <T,>(data: T) => ({ data, ok: true as const, warnings: [] });

