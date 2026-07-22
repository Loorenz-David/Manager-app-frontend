import { describe, expect, it } from "vitest";
import {
  ConfirmSlideMediaInputSchema,
  CreateMediaUploadUrlInputSchema,
  PresentationListItemSchema,
  PresentationSchema,
  ReplaceAudienceInputSchema,
  ReplaceCompositionInputSchema,
} from "./types";
import { fullPresentationFixture, presentationListItemFixture } from "./test/fixtures";

describe("presentation schemas", () => {
  it("parses the full backend presentation graph including a synthesized legacy element", () => {
    const parsed = PresentationSchema.parse(fullPresentationFixture);
    expect(parsed.slides[0]?.elements[0]?.client_id).toBeNull();
    expect(parsed.logical_client_id).toBe(parsed.client_id);
  });

  // Regression (live backend, 2026-07-22): drafts carry sequence_order 0 on media —
  // the backend only normalizes sequences to 1..N at publish.
  it("parses draft media with sequence_order 0 at both the slide and element level", () => {
    const draftMedia = {
      client_id: "aupm_01JDRAFTMEDIA0",
      sequence_order: 0,
      media_type: "image",
      media_url: "https://example.com/cover.jpg",
      poster_url: null,
      fallback_url: null,
      alt_text: "Draft cover",
      mime_type: null,
      width: null,
      height: null,
      duration_ms: null,
      is_looping: false,
    };
    const fixture = structuredClone(fullPresentationFixture) as Record<string, unknown> & {
      slides: Array<Record<string, unknown> & { media: unknown[]; elements: unknown[] }>;
    };
    fixture.slides[0]!.media = [draftMedia];
    fixture.slides[0]!.elements = [
      {
        client_id: "aupe_01JDRAFTELEMENT0",
        element_type: "media",
        sequence_order: 0,
        layer_index: 0,
        start_ms: 0,
        end_ms: null,
        media: draftMedia,
        text_content: null,
        layout: { x: 0, y: 0, fit: "cover", width: 1, height: 1 },
        style: null,
        enter_animation: null,
        exit_animation: null,
      },
    ];
    const parsed = PresentationSchema.parse(fixture);
    expect(parsed.slides[0]?.media[0]?.sequence_order).toBe(0);
  });

  it("parses admin-list card preview fields including the empty fallback shape", () => {
    const withPreview = PresentationListItemSchema.parse(presentationListItemFixture);
    expect(withPreview.slide_count).toBe(3);
    expect(withPreview.media_kinds).toEqual(["image", "video"]);
    expect(withPreview.cover_url).toBe("https://cdn.example.com/presentation-cover.jpg");

    const withoutMedia = PresentationListItemSchema.parse({
      ...presentationListItemFixture,
      slide_count: 0,
      media_kinds: [],
      cover_url: null,
    });
    expect(withoutMedia).toMatchObject({ slide_count: 0, media_kinds: [], cover_url: null });
  });

  it("requires a storage reference when confirming media", () => {
    const parsed = ConfirmSlideMediaInputSchema.safeParse({
      presentationId: "aup_01JPHASE1PRESENTATION",
      slideId: "aups_01JSLIDE",
      media_type: "image",
    });
    expect(parsed.success).toBe(false);
  });

  it("enforces documented media MIME and size limits", () => {
    const parsed = CreateMediaUploadUrlInputSchema.safeParse({
      presentationId: "aup_01JPHASE1PRESENTATION",
      slideId: "aups_01JSLIDE",
      media_type: "image",
      content_type: "video/mp4",
      file_size_bytes: 21 * 1024 * 1024,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid composition payload combinations", () => {
    const parsed = ReplaceCompositionInputSchema.safeParse({
      presentationId: "aup_01JPHASE1PRESENTATION",
      slideId: "aups_01JSLIDE",
      playback_mode: "timed",
      elements: [{ element_type: "media", text_content: "wrong payload" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires direct users for selected_users_only audiences", () => {
    const parsed = ReplaceAudienceInputSchema.safeParse({
      presentationId: "aup_01JPHASE1PRESENTATION",
      audience_mode: "selected_users_only",
      user_ids: [],
    });
    expect(parsed.success).toBe(false);
  });
});
