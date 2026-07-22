import { describe, expect, it } from "vitest";

import { PresentationSchema } from "../types";
import { envelope, fullPresentationFixture } from "../test/fixtures";
import {
  createEditorDraftStore,
  replaceBackgroundMediaElement,
} from "./draft-store";

const embeddedMedia = {
  client_id: "aupm_01JEMBEDDED",
  sequence_order: 1,
  media_type: "image" as const,
  media_url: "https://cdn.example.com/background.webp",
  poster_url: null,
  fallback_url: null,
  alt_text: "A background",
  mime_type: "image/webp",
  width: 1080,
  height: 1920,
  duration_ms: null,
  is_looping: false,
};

describe("editor draft store", () => {
  it("hydrates legacy null-client elements and atomically reconciles server responses", () => {
    const store = createEditorDraftStore();
    store.hydrate(fullPresentationFixture);

    expect(store.getState().localCompositions[fullPresentationFixture.slides[0].client_id]?.[0]?.client_id).toBeNull();
    store.setLocalComposition(fullPresentationFixture.slides[0].client_id, []);
    expect(store.getState().dirtySlideIds.has(fullPresentationFixture.slides[0].client_id)).toBe(true);

    store.reconcile(fullPresentationFixture);
    expect(store.getState().localCompositions[fullPresentationFixture.slides[0].client_id]).toHaveLength(1);
    expect(store.getState().dirtySlideIds.size).toBe(0);
    expect(store.getState().revision).toBe(3);
  });

  it("replaces a background element while preserving overlay elements", () => {
    const current = fullPresentationFixture.slides[0].elements;
    const next = replaceBackgroundMediaElement(
      [
        {
          ...current[0],
          client_id: null,
          element_type: "media",
          layer_index: 0,
          media: embeddedMedia,
          text_content: null,
        },
        current[0],
      ],
      { ...embeddedMedia, client_id: "aupm_01JNEWBACKGROUND" },
    );

    expect(next).toHaveLength(2);
    expect(next[0]?.layer_index).toBe(0);
    expect(next[0]?.layout).toMatchObject({ x: 0, y: 0, width: 1, height: 1, fit: "cover" });
    expect(next[1]?.element_type).toBe("text");
  });

  it("round-trips element-embedded media without flattening it into the asset list", () => {
    const fixture = {
      ...fullPresentationFixture,
      slides: [{
        ...fullPresentationFixture.slides[0],
        media: [embeddedMedia],
        elements: [{
          ...fullPresentationFixture.slides[0].elements[0],
          element_type: "media" as const,
          media: embeddedMedia,
          text_content: null,
          style: null,
          layer_index: 0,
        }],
      }],
    };
    const parsed = PresentationSchema.parse(JSON.parse(JSON.stringify(fixture)));
    const serialized = JSON.parse(JSON.stringify(parsed));

    expect(serialized.slides[0].elements[0].media).toEqual(embeddedMedia);
    expect(serialized.slides[0].media[0].client_id).toBe(embeddedMedia.client_id);
    expect(envelope({ presentation: parsed }).data.presentation.slides[0]?.elements[0]?.media?.media_url).toBe(
      embeddedMedia.media_url,
    );
  });

  it("refreshes presigned media URLs without discarding local dirty edits", () => {
    const fixture = PresentationSchema.parse({
      ...fullPresentationFixture,
      slides: [{
        ...fullPresentationFixture.slides[0],
        media: [embeddedMedia],
        elements: [{
          ...fullPresentationFixture.slides[0].elements[0],
          element_type: "media",
          media: embeddedMedia,
          text_content: null,
          style: null,
          layer_index: 0,
        }],
      }],
    });
    const store = createEditorDraftStore();
    store.hydrate(fixture);
    store.addTextElement(fixture.slides[0]!.client_id);

    const refreshedUrl = "https://cdn.example.com/background.webp?signature=fresh";
    const refreshed = PresentationSchema.parse({
      ...fixture,
      slides: [{
        ...fixture.slides[0],
        media: [{ ...embeddedMedia, media_url: refreshedUrl }],
        elements: [{
          ...fixture.slides[0]!.elements[0],
          media: { ...embeddedMedia, media_url: refreshedUrl },
        }],
      }],
    });
    store.refreshMediaUrls(refreshed);

    expect(store.getState().dirtySlideIds.has(fixture.slides[0]!.client_id)).toBe(true);
    expect(store.getState().localCompositions[fixture.slides[0]!.client_id]).toHaveLength(2);
    expect(
      store.getState().localCompositions[fixture.slides[0]!.client_id]?.[0]?.media?.media_url,
    ).toBe(refreshedUrl);
  });
});
