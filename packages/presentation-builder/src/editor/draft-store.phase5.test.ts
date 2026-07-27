import { describe, expect, it } from "vitest";

import type { Presentation } from "../types";
import { createEditorDraftStore } from "./draft-store";

const presentation = (): Presentation => ({
  client_id: "aup_fixture",
  title: "Fixture",
  status: "draft",
  slides: [{
    client_id: "aups_fixture",
    sequence_order: 1,
    title: null,
    description: null,
    layout_type: "media_full",
    playback_mode: "timed",
    duration_ms: 4_000,
    composition_schema_version: 1,
    background_color: null,
    media: [],
    action: null,
    elements: [{
      client_id: "aupe_existing",
      element_type: "text",
      sequence_order: 0,
      layer_index: 10,
      start_ms: 2_000,
      end_ms: 3_800,
      media: null,
      text_content: "Existing",
      layout: { x: 0.5, y: 0.5, width: 0.5, height: 0.1, anchor: "center" },
      style: { font_size: 44, font_weight: 400, text_role: "body" },
      enter_animation: { type: "fade" },
      exit_animation: { type: "fade" },
    }],
  }],
  audience: { audience_mode: "all_matching", app_keys: [], role_keys: [], workspace_ids: [], user_ids: [] },
} as unknown as Presentation);

describe("editor draft store phase 5", () => {
  it("adds text at the playhead with the confirmed slide/fade defaults", () => {
    const store = createEditorDraftStore();
    store.hydrate(presentation());
    store.setPlayback("aups_fixture", { playheadMs: 1_000 });
    const id = store.addTextElement("aups_fixture");
    const added = store.getState().localCompositions.aups_fixture?.at(-1);
    expect(id).toMatch(/^local-text-/);
    expect(added).toMatchObject({
      client_id: id,
      start_ms: 1_000,
      end_ms: 3_500,
      enter_animation: { type: "fade_up", duration_ms: 450 },
      exit_animation: { type: "fade", duration_ms: 450 },
    });
    expect(store.getState().selectedElementIds.aups_fixture).toBe(id);
    expect(store.getState().dirtySlideIds.has("aups_fixture")).toBe(true);
  });

  it("clamps timing and playhead when duration shrinks", () => {
    const store = createEditorDraftStore();
    store.hydrate(presentation());
    store.setPlayback("aups_fixture", { playheadMs: 3_900, playing: true });
    store.setSlideDuration("aups_fixture", 2_000);
    expect(store.getState().localCompositions.aups_fixture?.[0]).toMatchObject({
      start_ms: 1_600,
      end_ms: 2_000,
    });
    expect(store.getState().playbackBySlide.aups_fixture).toEqual({ playheadMs: 2_000, playing: true });
  });

  it("marks slide background changes dirty and preserves other dirty slide colors", () => {
    const first = presentation();
    const secondSlide = {
      ...first.slides[0]!,
      client_id: "aups_fixture_second",
      sequence_order: 2,
    };
    const fixture = { ...first, slides: [...first.slides, secondSlide] };
    const store = createEditorDraftStore();
    store.hydrate(fixture);

    store.setSlideBackgroundColor("aups_fixture", "#102A43");
    store.setSlideBackgroundColor("aups_fixture_second", "#ABCDEF");

    expect(store.getState().dirtySlideIds).toEqual(new Set([
      "aups_fixture",
      "aups_fixture_second",
    ]));
    expect(store.getState().slideRevisions.aups_fixture).toBe(1);
    expect(store.getState().presentation?.slides[0]?.background_color).toBe("#102A43");

    store.reconcileAfterFlush({
      ...fixture,
      slides: [
        { ...fixture.slides[0]!, background_color: "#102A43" },
        { ...fixture.slides[1]!, background_color: null },
      ],
    }, "aups_fixture", 1);

    expect(store.getState().dirtySlideIds).toEqual(new Set(["aups_fixture_second"]));
    expect(store.getState().presentation?.slides[1]?.background_color).toBe("#ABCDEF");
  });

  it("clears acknowledged dirty state without replacing the live local composition", () => {
    const store = createEditorDraftStore();
    const fixture = presentation();
    store.hydrate(fixture);
    store.updateElement("aups_fixture", "aupe_existing", (element) => ({ ...element, text_content: "Changed" }));
    expect(store.getState().dirtySlideIds.has("aups_fixture")).toBe(true);
    expect(store.getState().localCompositions.aups_fixture?.[0]?.text_content).toBe("Changed");
    store.reconcileAfterFlush(fixture, "aups_fixture", 1);
    expect(store.getState().dirtySlideIds.has("aups_fixture")).toBe(false);
    expect(store.getState().localCompositions.aups_fixture?.[0]?.text_content).toBe("Changed");
  });

  it("preserves selection and newer edits when an older flush response arrives", () => {
    const store = createEditorDraftStore();
    const fixture = presentation();
    store.hydrate(fixture);
    store.selectElement("aups_fixture", "aupe_existing");
    store.updateElement("aups_fixture", "aupe_existing", (element) => ({
      ...element,
      text_content: "Sent",
    }));
    const flushedRevision = store.getState().slideRevisions.aups_fixture!;

    store.updateElement("aups_fixture", "aupe_existing", (element) => ({
      ...element,
      text_content: "Still editing",
    }));
    store.reconcileAfterFlush({
      ...fixture,
      slides: [{
        ...fixture.slides[0]!,
        elements: [{
          ...fixture.slides[0]!.elements[0]!,
          client_id: "aupe_recreated_by_server",
          text_content: "Sent",
        }],
      }],
    }, "aups_fixture", flushedRevision);

    expect(store.getState().dirtySlideIds.has("aups_fixture")).toBe(true);
    expect(store.getState().selectedElementIds.aups_fixture).toBe("aupe_existing");
    expect(store.getState().localCompositions.aups_fixture?.[0]).toMatchObject({
      client_id: "aupe_existing",
      text_content: "Still editing",
    });
  });
});
