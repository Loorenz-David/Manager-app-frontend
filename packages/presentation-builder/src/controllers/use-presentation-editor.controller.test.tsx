import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

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
    });

    expect(result.current.readOnly).toBe(true);
    expect(result.current.notice).toBeNull();
  });
});
