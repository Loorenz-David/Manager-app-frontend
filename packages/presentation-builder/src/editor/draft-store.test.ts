import { describe, expect, it } from "vitest";

import { PresentationSchema } from "../types";
import { envelope, fullPresentationFixture } from "../test/fixtures";
import {
  appendMediaElement,
  createEditorDraftStore,
  replaceMediaElementSource,
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

  it("appends first and subsequent media with unified timed defaults", () => {
    const text = fullPresentationFixture.slides[0].elements[0]!;
    const first = appendMediaElement([text], embeddedMedia, 4_000, 1_250);
    const firstMedia = first[1]!;

    expect(firstMedia).toMatchObject({
      element_type: "media",
      layer_index: 0,
      start_ms: 0,
      end_ms: null,
      layout: {
        x: 0.5,
        y: 0.5,
        width: 1,
        height: 1,
        fit: "cover",
        anchor: "center",
      },
    });

    const secondMedia = { ...embeddedMedia, client_id: "aupm_01JSECOND" };
    const second = appendMediaElement(first, secondMedia, 4_000, 1_250);
    expect(second[2]).toMatchObject({
      element_type: "media",
      layer_index: 11,
      start_ms: 1_250,
      end_ms: 3_750,
      layout: {
        x: 0.5,
        y: 0.5,
        width: 0.6,
        height: 0.6,
        fit: "contain",
        anchor: "center",
      },
    });
  });

  it("replaces only a media element source while preserving its timed layout", () => {
    const current = appendMediaElement([], embeddedMedia, 4_000, 0);
    const replacement = { ...embeddedMedia, client_id: "aupm_01JREPLACEMENT" };
    const next = replaceMediaElementSource(current, "legacy-0", replacement);

    expect(next[0]).toEqual({ ...current[0], media: replacement });
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
