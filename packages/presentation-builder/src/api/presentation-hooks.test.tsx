import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { useCreatePresentation } from "../actions/use-create-presentation";
import { usePublishPresentation } from "../actions/use-publish-presentation";
import { presentationKeys } from "./presentation-keys";
import { usePresentationDetail } from "./use-presentation-detail";
import { usePresentationsList } from "./use-presentations-list";
import { envelope, fullPresentationFixture, presentationListItemFixture } from "../test/fixtures";
import { server } from "../test/server";
import { createTestContext } from "../test/test-utils";

const API_PATTERN = "*/api/v1/app-update-presentations";

describe("presentation query and action hooks", () => {
  it("maps list filters to backend query parameters and parses pagination", async () => {
    server.use(
      http.get(API_PATTERN, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("q")).toBe("product");
        expect(url.searchParams.get("status")).toBe("draft");
        expect(url.searchParams.get("limit")).toBe("20");
        expect(url.searchParams.get("offset")).toBe("0");
        return HttpResponse.json(
          envelope({
            app_update_presentations_pagination: {
              items: [presentationListItemFixture],
              has_more: false,
              limit: 20,
              offset: 0,
            },
          }),
        );
      }),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationsList({ q: "product", status: "draft", limit: 20, offset: 0 }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });

  it("fetches and validates a presentation detail", async () => {
    server.use(
      http.get(`${API_PATTERN}/:id`, () =>
        HttpResponse.json(envelope({ presentation: fullPresentationFixture })),
      ),
    );
    const { Wrapper } = createTestContext();
    const { result } = renderHook(
      () => usePresentationDetail(fullPresentationFixture.client_id),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.slides[0]?.elements[0]?.client_id).toBeNull();
  });

  it("writes create responses to detail cache and invalidates lists", async () => {
    server.use(
      http.put(API_PATTERN, () =>
        HttpResponse.json(envelope({ presentation: fullPresentationFixture })),
      ),
    );
    const { queryClient, Wrapper } = createTestContext();
    const listKey = presentationKeys.list({});
    queryClient.setQueryData(listKey, {
      items: [],
      has_more: false,
      limit: 50,
      offset: 0,
    });
    const { result } = renderHook(() => useCreatePresentation(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.createPresentationAsync({ title: fullPresentationFixture.title });
    });
    expect(queryClient.getQueryData(presentationKeys.detail(fullPresentationFixture.client_id))).toEqual(
      fullPresentationFixture,
    );
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });

  it("writes publish responses through and invalidates list-visible status data", async () => {
    const published = {
      ...fullPresentationFixture,
      status: "published" as const,
      published_at: "2026-07-22T18:00:00+00:00",
      updated_at: "2026-07-22T18:00:00+00:00",
    };
    server.use(
      http.post(`${API_PATTERN}/:id/publish`, () =>
        HttpResponse.json(envelope({ presentation: published })),
      ),
    );
    const { queryClient, Wrapper } = createTestContext();
    const listKey = presentationKeys.list({ status: "draft" });
    queryClient.setQueryData(listKey, {
      items: [presentationListItemFixture],
      has_more: false,
      limit: 50,
      offset: 0,
    });
    const { result } = renderHook(() => usePublishPresentation(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.publishPresentationAsync(fullPresentationFixture.client_id);
    });
    expect(
      queryClient.getQueryData<typeof published>(presentationKeys.detail(fullPresentationFixture.client_id))
        ?.status,
    ).toBe("published");
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
  });
});
