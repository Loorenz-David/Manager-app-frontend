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
