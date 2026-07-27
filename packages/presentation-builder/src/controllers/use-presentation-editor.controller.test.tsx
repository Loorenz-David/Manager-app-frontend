import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { notify } from "@beyo/lib";
import type { CompositionElement, SlideMedia } from "@beyo/presentation-runtime";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fullPresentationFixture, envelope } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
import type { CompositionElementInput, Presentation } from "../types";
import { compositionElementId } from "../editor/draft-store";
import {
  MEDIA_PANEL_DRAWERS,
  SLIDE_PANEL_DRAWERS,
  TEXT_PANEL_DRAWERS,
} from "../components/panels/PanelDrawer";
import { usePresentationEditorController } from "./use-presentation-editor.controller";

const API_PATTERN = "*/api/v1/app-update-presentations";

const secondSlide = {
  client_id: "aups_02JSLIDE",
  sequence_order: 2,
  title: null,
  description: null,
  layout_type: "media_top" as const,
  playback_mode: "timed" as const,
  duration_ms: 8_000,
  composition_schema_version: 1,
  background_color: null,
  media: [],
  action: null,
  elements: [],
};

function withSlides(slides: unknown[]) {
  return { ...fullPresentationFixture, slides };
}

function installDetail(presentation = fullPresentationFixture) {
  server.use(
    http.get(`${API_PATTERN}/:id`, () =>
      HttpResponse.json(envelope({ presentation })),
    ),
  );
}

function emptyMediaPresentation(): Presentation {
  return {
    ...fullPresentationFixture,
    slides: [{
      ...fullPresentationFixture.slides[0]!,
      media: [],
      elements: [],
    }],
  };
}

function selectionPresentation(): Presentation {
  const media: SlideMedia = {
    client_id: "aupm_drawer_selection",
    sequence_order: 0,
    media_type: "image",
    media_url: "https://cdn.example.com/drawer-selection.png",
    poster_url: null,
    fallback_url: null,
    alt_text: "Drawer selection",
    mime_type: "image/png",
    width: 1080,
    height: 1920,
    duration_ms: null,
    is_looping: false,
  };
  const mediaElement: CompositionElement = {
    client_id: "aupe_drawer_media",
    element_type: "media",
    sequence_order: 1,
    layer_index: 1,
    start_ms: 0,
    end_ms: null,
    media,
    text_content: null,
    layout: { x: 0.5, y: 0.5, width: 0.4, height: 0.2, fit: "cover", anchor: "center" },
    style: null,
    enter_animation: null,
    exit_animation: null,
  };
  return {
    ...fullPresentationFixture,
    slides: [{
      ...fullPresentationFixture.slides[0]!,
      media: [media],
      elements: [...fullPresentationFixture.slides[0]!.elements, mediaElement],
    }],
  };
}

function installUploadQueueHarness(
  initial: Presentation,
  failOnceFileName?: string,
): { uploadUrlCalls: string[] } {
  let current = initial;
  let failedOnce = false;
  const uploadUrlCalls: string[] = [];
  const fileNamesByPendingId = new Map<string, string>();

  server.use(
    http.get(`${API_PATTERN}/:id`, () =>
      HttpResponse.json(envelope({ presentation: current })),
    ),
    http.post(`${API_PATTERN}/:id/slides/:slideId/media/upload-url`, async ({ request }) => {
      const body = (await request.json()) as { file_name: string };
      uploadUrlCalls.push(body.file_name);
      if (body.file_name === failOnceFileName && !failedOnce) {
        failedOnce = true;
        return HttpResponse.json({ error: { message: "Upload URL failed" } }, { status: 500 });
      }
      const pendingId = `pu_${uploadUrlCalls.length}`;
      fileNamesByPendingId.set(pendingId, body.file_name);
      return HttpResponse.json(envelope({
        upload_url: `https://uploads.example.test/${encodeURIComponent(body.file_name)}`,
        pending_upload_client_id: pendingId,
        storage_key: `presentations/${body.file_name}`,
        expires_in: 900,
      }));
    }),
    http.put("https://uploads.example.test/:fileName", () =>
      new HttpResponse(null, { status: 200 }),
    ),
    http.post(`${API_PATTERN}/:id/slides/:slideId/media`, async ({ request }) => {
      const body = (await request.json()) as { pending_upload_client_id: string };
      const fileName = fileNamesByPendingId.get(body.pending_upload_client_id)!;
      const asset: SlideMedia = {
        client_id: `aupm_${current.slides[0]!.media.length + 1}`,
        sequence_order: current.slides[0]!.media.length,
        media_type: "image",
        media_url: `https://cdn.example.com/${fileName}`,
        poster_url: null,
        fallback_url: null,
        alt_text: fileName,
        mime_type: "image/png",
        width: 1080,
        height: 1920,
        duration_ms: null,
        is_looping: false,
      };
      current = {
        ...current,
        slides: [{
          ...current.slides[0]!,
          media: [...current.slides[0]!.media, asset],
        }],
      };
      return HttpResponse.json(envelope({ presentation: current }));
    }),
    http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, async ({ request }) => {
      const body = (await request.json()) as {
        duration_ms: number;
        elements: CompositionElementInput[];
      };
      const mediaById = new Map(
        current.slides[0]!.media.map((item) => [item.client_id, item]),
      );
      const elements: CompositionElement[] = body.elements.map((element, index) => ({
        client_id: `aupe_saved_${index}`,
        element_type: element.element_type,
        sequence_order: index,
        layer_index: element.layer_index ?? 0,
        start_ms: element.start_ms ?? 0,
        end_ms: element.end_ms ?? null,
        media: element.media_id ? mediaById.get(element.media_id) ?? null : null,
        text_content: element.text_content ?? null,
        layout: element.layout ?? null,
        style: element.style ?? null,
        enter_animation: element.enter_animation ?? null,
        exit_animation: element.exit_animation ?? null,
      }));
      current = {
        ...current,
        slides: [{
          ...current.slides[0]!,
          duration_ms: body.duration_ms,
          elements,
        }],
      };
      return HttpResponse.json(envelope({ presentation: current }));
    }),
  );

  return { uploadUrlCalls };
}

afterEach(() => cleanup());

describe("presentation editor controller", () => {
  it("toggles drawers independently for each panel type", async () => {
    installDetail();
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect([...result.current.openDrawersByPanel.slide]).toEqual([]);
    expect([...result.current.openDrawersByPanel.text]).toEqual([]);
    expect([...result.current.openDrawersByPanel.media]).toEqual([]);

    act(() => {
      result.current.toggleDrawer("text", TEXT_PANEL_DRAWERS.style);
      result.current.toggleDrawer("slide", SLIDE_PANEL_DRAWERS.timing);
    });
    expect([...result.current.openDrawersByPanel.text]).toEqual([TEXT_PANEL_DRAWERS.style]);
    expect([...result.current.openDrawersByPanel.slide]).toEqual([SLIDE_PANEL_DRAWERS.timing]);
    expect([...result.current.openDrawersByPanel.media]).toEqual([]);

    act(() => result.current.toggleDrawer("text", TEXT_PANEL_DRAWERS.style));
    expect([...result.current.openDrawersByPanel.text]).toEqual([]);
    expect([...result.current.openDrawersByPanel.slide]).toEqual([SLIDE_PANEL_DRAWERS.timing]);
  });

  it("resets session-local drawer state when the controller remounts", async () => {
    installDetail();
    const { Wrapper } = createTestContext();
    const first = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    act(() => first.result.current.toggleDrawer("text", TEXT_PANEL_DRAWERS.content));
    expect(first.result.current.openDrawersByPanel.text.has(TEXT_PANEL_DRAWERS.content)).toBe(true);
    first.unmount();

    const second = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));
    expect([...second.result.current.openDrawersByPanel.text]).toEqual([]);
  });

  it("auto-opens the text concern drawer by selection source without closing others", async () => {
    installDetail();
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const textElement = fullPresentationFixture.slides[0]!.elements.find(
      (element) => element.element_type === "text",
    );
    if (!textElement) throw new Error("Expected the text fixture element");
    const textElementId = compositionElementId(textElement);

    act(() => {
      result.current.toggleDrawer("text", TEXT_PANEL_DRAWERS.style);
      result.current.toggleDrawer("slide", SLIDE_PANEL_DRAWERS.background);
      result.current.onSelectElement(textElementId, "timeline");
    });
    expect(result.current.openDrawersByPanel.text).toEqual(
      new Set([TEXT_PANEL_DRAWERS.style, TEXT_PANEL_DRAWERS.animations]),
    );

    act(() => result.current.onSelectElement(textElementId, "canvas"));
    expect(result.current.openDrawersByPanel.text).toEqual(
      new Set([
        TEXT_PANEL_DRAWERS.style,
        TEXT_PANEL_DRAWERS.animations,
        TEXT_PANEL_DRAWERS.content,
      ]),
    );

    act(() => result.current.onDeselectElement());
    expect(result.current.openDrawersByPanel.slide).toEqual(
      new Set([SLIDE_PANEL_DRAWERS.background]),
    );
  });

  it("auto-opens media or animations for canvas and timeline selection", async () => {
    const presentation = selectionPresentation();
    installDetail(presentation);
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(presentation.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.onSelectElement("aupe_drawer_media", "canvas"));
    expect(result.current.openDrawersByPanel.media).toEqual(
      new Set([MEDIA_PANEL_DRAWERS.media]),
    );

    act(() => result.current.onSelectElement("aupe_drawer_media", "timeline"));
    expect(result.current.openDrawersByPanel.media).toEqual(
      new Set([MEDIA_PANEL_DRAWERS.media, MEDIA_PANEL_DRAWERS.animations]),
    );
  });

  it("uploads all queued files sequentially and preserves element order", async () => {
    const initial = emptyMediaPresentation();
    const { uploadUrlCalls } = installUploadQueueHarness(initial);
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(initial.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const files = ["one.png", "two.png", "three.png"].map(
      (name) => new File([name], name, { type: "image/png" }),
    );

    act(() => result.current.onFilesDropped(files));

    await waitFor(() => {
      const mediaElements = result.current.localCompositions[initial.slides[0]!.client_id]
        ?.filter((element) => element.element_type === "media");
      expect(mediaElements?.map((element) => element.media?.alt_text)).toEqual([
        "one.png",
        "two.png",
        "three.png",
      ]);
    });
    expect(uploadUrlCalls).toEqual(["one.png", "two.png", "three.png"]);
  });

  it("stops a queue on file two and retry resumes from the failed file", async () => {
    const initial = emptyMediaPresentation();
    const { uploadUrlCalls } = installUploadQueueHarness(initial, "two.png");
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(initial.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const files = ["one.png", "two.png", "three.png"].map(
      (name) => new File([name], name, { type: "image/png" }),
    );

    act(() => result.current.onFilesDropped(files));

    await waitFor(() => expect(result.current.uploadState?.errorMessage).toBeTruthy());
    expect(uploadUrlCalls).toEqual(["one.png", "two.png"]);
    expect(
      result.current.localCompositions[initial.slides[0]!.client_id]
        ?.filter((element) => element.element_type === "media"),
    ).toHaveLength(1);

    act(() => result.current.retryUpload());

    await waitFor(() => {
      const mediaElements = result.current.localCompositions[initial.slides[0]!.client_id]
        ?.filter((element) => element.element_type === "media");
      expect(mediaElements?.map((element) => element.media?.alt_text)).toEqual([
        "one.png",
        "two.png",
        "three.png",
      ]);
    });
    expect(uploadUrlCalls).toEqual(["one.png", "two.png", "two.png", "three.png"]);
  });

  // Regression (2026-07-23): fresh presentations arrive with slides: [] and the
  // timeline/+Text were inert — a draft deck must auto-create its first slide.
  it("auto-creates and selects the first slide when a draft hydrates empty", async () => {
    const emptyDraft = withSlides([]);
    const afterAutoAdd = withSlides([fullPresentationFixture.slides[0]]);
    installDetail(emptyDraft as typeof fullPresentationFixture);
    server.use(
      http.post(`${API_PATTERN}/:id/slides`, async ({ request }) => {
        expect(await request.json()).toEqual({
          duration_ms: 4_000,
          playback_mode: "timed",
        });
        return (
        HttpResponse.json(envelope({ presentation: afterAutoAdd })),
        );
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() =>
      expect(result.current.presentation?.slides).toHaveLength(1),
    );
    expect(result.current.selectedSlideId).toBe(
      fullPresentationFixture.slides[0]!.client_id,
    );
  });

  it("adds and selects the server-returned slide", async () => {
    const response = withSlides([fullPresentationFixture.slides[0], secondSlide]);
    installDetail();
    server.use(
      http.post(`${API_PATTERN}/:id/slides`, () => HttpResponse.json(envelope({ presentation: response }))),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(async () => result.current.onAddSlide());

    expect(result.current.selectedSlideId).toBe(secondSlide.client_id);
    expect(result.current.presentation?.slides).toHaveLength(2);
  });

  it("blocks deletion of the last remaining slide", async () => {
    const deleteSpy = vi.fn();
    installDetail();
    server.use(
      http.delete(`${API_PATTERN}/:id/slides/:slideId`, () => {
        deleteSpy();
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => result.current.onDeleteSlide(fullPresentationFixture.slides[0].client_id));
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(result.current.presentation?.slides).toHaveLength(1);
  });

  it("selects a surviving neighbor when deleting the selected slide", async () => {
    const initial = withSlides([fullPresentationFixture.slides[0], secondSlide]);
    const response = withSlides([secondSlide]);
    installDetail(initial);
    server.use(
      http.delete(`${API_PATTERN}/:id/slides/:slideId`, () => HttpResponse.json(envelope({ presentation: response }))),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.selectedSlideId).toBe(fullPresentationFixture.slides[0].client_id));

    await act(async () => result.current.onDeleteSlide(fullPresentationFixture.slides[0].client_id));
    expect(result.current.selectedSlideId).toBe(secondSlide.client_id);
  });

  it("sends the complete ordered id list and reconciles the reorder response", async () => {
    const initial = withSlides([fullPresentationFixture.slides[0], secondSlide]);
    const response = withSlides([secondSlide, fullPresentationFixture.slides[0]]);
    installDetail(initial);
    server.use(
      http.post(`${API_PATTERN}/:id/slides/reorder`, async ({ request }) => {
        const body = (await request.json()) as { ordered_slide_ids: string[] };
        expect(body.ordered_slide_ids).toEqual([
          secondSlide.client_id,
          fullPresentationFixture.slides[0].client_id,
        ]);
        return HttpResponse.json(envelope({ presentation: response }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.presentation?.slides).toHaveLength(2));

    await act(async () => result.current.onReorder(secondSlide.client_id, 0));
    expect(result.current.presentation?.slides.map((slide) => slide.client_id)).toEqual([
      secondSlide.client_id,
      fullPresentationFixture.slides[0].client_id,
    ]);
  });

  it("debounces a changed draft title into one metadata PATCH", async () => {
    const response = { ...fullPresentationFixture, title: "Updated title" };
    const patchSpy = vi.fn();
    installDetail();
    server.use(
      http.patch(`${API_PATTERN}/:id`, async ({ request }) => {
        patchSpy((await request.json()) as { title: string });
        return HttpResponse.json(envelope({ presentation: response }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.onTitleChange("Updated title");
      result.current.onTitleCommit("Updated title");
      result.current.onTitleCommit("Updated title");
    });
    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1), { timeout: 1_500 });
    expect(patchSpy).toHaveBeenCalledWith({ title: "Updated title" });
  });

  it("derives published presentations as read-only with no mutation requests", async () => {
    const published = { ...fullPresentationFixture, status: "published" as const };
    installDetail(published);
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.readOnly).toBe(true));

    await act(async () => {
      await result.current.onAddSlide();
      await result.current.onDeleteSlide(fullPresentationFixture.slides[0].client_id);
      await result.current.onReorder(fullPresentationFixture.slides[0].client_id, 0);
      await result.current.onUploadFile(new File(["bytes"], "blocked.png", { type: "image/png" }));
      result.current.onTitleCommit("blocked");
      result.current.onAddText();
      await result.current.onSaveDraft();
    });

    expect(result.current.readOnly).toBe(true);
    expect(result.current.notice).toBeNull();
    expect(result.current.dirty).toBe(false);
  });

  it("flushes a dirty text composition with the confirmed defaults on Save draft", async () => {
    const putSpy = vi.fn();
    installDetail();
    server.use(
      http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, async ({ request }) => {
        putSpy(await request.json());
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.onAddText());
    act(() => result.current.onBackgroundColorChange("#102A43"));
    expect(result.current.dirty).toBe(true);
    await act(async () => result.current.onSaveDraft());

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy.mock.calls[0]?.[0]).toMatchObject({
      playback_mode: "timed",
      duration_ms: fullPresentationFixture.slides[0].duration_ms,
      background_color: "#102A43",
      elements: expect.arrayContaining([
        expect.objectContaining({
          element_type: "text",
          enter_animation: { type: "fade_up", duration_ms: 450 },
          exit_animation: { type: "fade", duration_ms: 450 },
        }),
      ]),
    });
    expect(result.current.dirty).toBe(false);
  });

  it("flushes a null-duration one-text slide before publish and proceeds", async () => {
    const nullDuration = {
      ...fullPresentationFixture,
      slides: [{
        ...fullPresentationFixture.slides[0],
        duration_ms: null,
        elements: [],
      }],
    };
    const putSpy = vi.fn();
    const publishSpy = vi.fn();
    let current: typeof fullPresentationFixture | typeof nullDuration = nullDuration;
    installDetail(nullDuration);
    server.use(
      http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, async ({ request }) => {
        const body = (await request.json()) as {
          duration_ms: number;
          elements: Array<Record<string, unknown>>;
        };
        putSpy(body);
        current = {
          ...fullPresentationFixture,
          slides: [{
            ...fullPresentationFixture.slides[0],
            duration_ms: body.duration_ms,
            elements: body.elements.map((element, index) => ({
              client_id: `aupe_saved_${index}`,
              element_type: "text" as const,
              sequence_order: index,
              layer_index: element.layer_index as number,
              start_ms: element.start_ms as number,
              end_ms: element.end_ms as number | null,
              media: null,
              text_content: element.text_content as string,
              layout: element.layout as typeof fullPresentationFixture.slides[0]["elements"][0]["layout"],
              style: element.style as typeof fullPresentationFixture.slides[0]["elements"][0]["style"],
              enter_animation: element.enter_animation as typeof fullPresentationFixture.slides[0]["elements"][0]["enter_animation"],
              exit_animation: element.exit_animation as null,
            })),
          }],
        };
        return HttpResponse.json(envelope({ presentation: current }));
      }),
      http.put(`${API_PATTERN}/:id/audience`, () =>
        HttpResponse.json(envelope({ presentation: current })),
      ),
      http.patch(`${API_PATTERN}/:id`, () =>
        HttpResponse.json(envelope({ presentation: current })),
      ),
      http.post(`${API_PATTERN}/:id/publish`, () => {
        publishSpy();
        current = { ...current, status: "published" as const };
        return HttpResponse.json(envelope({ presentation: current }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.onAddText());
    expect(result.current.inlineEditingElementId).toMatch(/^local-text-/);
    let issues: Awaited<ReturnType<typeof result.current.onPublish>> = null;
    await act(async () => {
      issues = await result.current.onPublish({
        audienceMode: "all_matching",
        appKeys: [],
        roleKeys: [],
        userIds: [],
        category: "improvement",
        presentationType: "slide_page",
        isDismissible: true,
        priorityValue: "",
        startsAtLocal: "",
        expiresAtLocal: "",
      });
    });

    expect(issues).toBeNull();
    expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({
      duration_ms: 4_000,
      elements: [expect.objectContaining({ element_type: "text" })],
    }));
    expect(publishSpy).toHaveBeenCalledTimes(1);
  });

  it("enters inline edit for new text and exits on commit", async () => {
    installDetail();
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.onAddText());
    expect(result.current.inlineEditingElementId).toMatch(/^local-text-/);
    act(() => result.current.onFinishInlineEdit());
    expect(result.current.inlineEditingElementId).toBeNull();
  });

  it("flushes the previous slide when switching", async () => {
    const initial = withSlides([fullPresentationFixture.slides[0], secondSlide]);
    const putSpy = vi.fn();
    installDetail(initial);
    server.use(
      http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, ({ params }) => {
        putSpy(params.slideId);
        return HttpResponse.json(envelope({ presentation: initial }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.onAddText();
      result.current.onSelectSlide(secondSlide.client_id);
    });
    await waitFor(() => expect(putSpy).toHaveBeenCalledWith(fullPresentationFixture.slides[0].client_id));
    expect(result.current.selectedSlideId).toBe(secondSlide.client_id);
  });

  it("keeps failed composition state local, notifies once, and retries", async () => {
    const notifyError = vi.spyOn(notify, "error").mockImplementation(() => undefined);
    const putSpy = vi.fn();
    installDetail();
    server.use(
      http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, () => {
        putSpy();
        return HttpResponse.json({ error: { message: "Save failed" } }, { status: 500 });
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.onAddText();
      result.current.onFinishInlineEdit();
    });

    await act(async () => result.current.onSaveDraft());
    await act(async () => result.current.onSaveDraft());

    expect(putSpy).toHaveBeenCalledTimes(2);
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(result.current.dirty).toBe(true);
    expect(result.current.localCompositions[fullPresentationFixture.slides[0].client_id]).toHaveLength(2);
  });

  it("mirrors CTA route validation before PATCH", async () => {
    const patchSpy = vi.fn();
    installDetail();
    server.use(
      http.patch(`${API_PATTERN}/:id/slides/:slideId`, async ({ request }) => {
        patchSpy(await request.json());
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.onCtaRouteChange("products"));
    await act(async () => result.current.onCtaCommit());
    expect(result.current.ctaRouteError).toMatch(/start with/);
    await waitFor(() =>
      expect(result.current.openDrawersByPanel.slide.has(SLIDE_PANEL_DRAWERS.button)).toBe(true),
    );
    expect(patchSpy).not.toHaveBeenCalled();

    act(() => {
      result.current.onCtaLabelChange("Open");
      result.current.onCtaRouteChange("/products");
    });
    await act(async () => result.current.onCtaCommit());
    expect(patchSpy).toHaveBeenCalledWith({ action_label: "Open", action_route: "/products" });
  });

  it("autosaves after roughly two idle seconds and guards a dirty unload", async () => {
    const putSpy = vi.fn();
    installDetail();
    server.use(
      http.put(`${API_PATTERN}/:id/slides/:slideId/composition`, () => {
        putSpy();
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(() => usePresentationEditorController(fullPresentationFixture.client_id), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.onAddText();
      result.current.onFinishInlineEdit();
    });
    const addedElementId = compositionElementId(
      result.current.localCompositions[fullPresentationFixture.slides[0].client_id]!.at(-1)!,
    );
    act(() => result.current.onSelectElement(addedElementId, "canvas"));
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(result.current.dirty).toBe(false);
    }, { timeout: 3_000 });
    expect(result.current.selectedElementId).toBe(addedElementId);
    expect(result.current.openDrawersByPanel.text.has(TEXT_PANEL_DRAWERS.content)).toBe(true);
  });

  it("does not guard beforeunload when the editor has no local changes", async () => {
    installDetail();
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(false);
  });

  it("refetches expired media URLs without discarding dirty local composition", async () => {
    const asset = {
      client_id: "aupm_expiring",
      sequence_order: 1,
      media_type: "image" as const,
      media_url: "https://cdn.example.com/expired.png",
      poster_url: null,
      fallback_url: null,
      alt_text: "Expiring media",
      mime_type: "image/png",
      width: 1080,
      height: 1920,
      duration_ms: null,
      is_looping: false,
    };
    const mediaElement = {
      ...fullPresentationFixture.slides[0].elements[0],
      element_type: "media" as const,
      layer_index: 0,
      media: asset,
      text_content: null,
      style: null,
    };
    const expired = {
      ...fullPresentationFixture,
      slides: [{
        ...fullPresentationFixture.slides[0],
        media: [asset],
        elements: [mediaElement],
      }],
    };
    const freshUrl = "https://cdn.example.com/fresh.png";
    const fresh = {
      ...expired,
      slides: [{
        ...expired.slides[0],
        media: [{ ...asset, media_url: freshUrl }],
        elements: [{ ...mediaElement, media: { ...asset, media_url: freshUrl } }],
      }],
    };
    let detailCalls = 0;
    server.use(
      http.get(`${API_PATTERN}/:id`, () => {
        detailCalls += 1;
        return HttpResponse.json(envelope({ presentation: detailCalls === 1 ? expired : fresh }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationEditorController(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.onAddText());

    await act(async () => {
      await result.current.onMediaError();
    });

    expect(detailCalls).toBe(2);
    expect(result.current.dirty).toBe(true);
    expect(result.current.localCompositions[expired.slides[0].client_id]).toHaveLength(2);
    expect(
      result.current.localCompositions[expired.slides[0].client_id]?.[0]?.media?.media_url,
    ).toBe(freshUrl);
  });

  it("clears a pending title PATCH when presentationId changes", async () => {
    const patchSpy = vi.fn();
    installDetail();
    server.use(
      http.patch(`${API_PATTERN}/:id`, () => {
        patchSpy();
        return HttpResponse.json(envelope({ presentation: fullPresentationFixture }));
      }),
    );
    const { Wrapper } = createTestContext();
    const { result, rerender } = renderHook(
      ({ id }) => usePresentationEditorController(id),
      { initialProps: { id: fullPresentationFixture.client_id }, wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.onTitleCommit("Must not leak"));
    rerender({ id: "aup_other_editor" });
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(patchSpy).not.toHaveBeenCalled();
  });
});
