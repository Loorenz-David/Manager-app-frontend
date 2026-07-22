import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { notify } from "@beyo/lib";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fullPresentationFixture, envelope } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";
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

afterEach(() => cleanup());

describe("presentation editor controller", () => {
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
    expect(result.current.dirty).toBe(true);
    await act(async () => result.current.onSaveDraft());

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy.mock.calls[0]?.[0]).toMatchObject({
      playback_mode: "timed",
      duration_ms: fullPresentationFixture.slides[0].duration_ms,
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
    act(() => result.current.onAddText());

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
    act(() => result.current.onAddText());
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledTimes(1);
      expect(result.current.dirty).toBe(false);
    }, { timeout: 3_000 });
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
