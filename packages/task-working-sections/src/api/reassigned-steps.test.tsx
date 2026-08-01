import { createElement, type PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeReassignedStepItem } from "../mocks/reassigned-steps-fixtures";
import { reassignedStepsTestServer } from "../test/reassigned-steps-server";
import {
  REASSIGNED_STEPS_PAGE_SIZE,
  normalizeReassignedStepsQuery,
} from "./fetch-reassigned-steps";
import { fetchReassignedStepsCount } from "./fetch-reassigned-steps-count";
import { reassignedStepKeys } from "./reassigned-step-keys";
import { usePaginatedReassignedStepsQuery } from "./use-reassigned-steps-query";
import { useReassignedStepsCountQuery } from "./use-reassigned-steps-count-query";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { queryClient, Wrapper };
}

describe("reassignedStepKeys", () => {
  it("scopes list entries by their params and keeps count param-free", () => {
    expect(reassignedStepKeys.list({ q: "sofa", limit: 20, offset: 0 })).toEqual(
      [
        "reassigned-steps",
        "list",
        { q: "sofa", limit: 20, offset: 0, unacknowledged_only: undefined },
      ],
    );
    expect(reassignedStepKeys.count()).toEqual(["reassigned-steps", "count"]);
    // The count key is a prefix-child of `all`, so one invalidate covers both.
    expect(reassignedStepKeys.count()[0]).toBe(reassignedStepKeys.all[0]);
  });
});

describe("normalizeReassignedStepsQuery", () => {
  it("drops empty and whitespace-only values", () => {
    expect(normalizeReassignedStepsQuery(undefined)).toBeUndefined();
    expect(normalizeReassignedStepsQuery("")).toBeUndefined();
    expect(normalizeReassignedStepsQuery("   ")).toBeUndefined();
  });

  it("trims and caps at 200 characters so a 422 can never be sent", () => {
    expect(normalizeReassignedStepsQuery("  sofa  ")).toBe("sofa");
    expect(normalizeReassignedStepsQuery("x".repeat(500))).toHaveLength(200);
  });
});

describe("usePaginatedReassignedStepsQuery", () => {
  it("returns the first page with its merged working_sections map", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePaginatedReassignedStepsQuery({}), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toHaveLength(3);
    expect(Object.keys(result.current.workingSections).sort()).toEqual([
      "wsec_carpentry",
      "wsec_upholstery",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("narrows on a partial, mixed-case q and drops item-less steps", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ q: "SoFa" }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Matches the SKU "SOFA-3S-GREY"; the item: null step is not returned.
    expect(result.current.items.map((item) => item.client_id)).toEqual([
      "tstp_9f3a1c",
    ]);
  });

  it("matches on sku when article_number does not match", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ q: "TABLE-OAK" }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items.map((item) => item.client_id)).toEqual([
      "tstp_carpentry_1",
    ]);
  });

  it("returns an empty list for a query that matches nothing", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ q: "zzzz-no-match" }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("restores the item-less step when q is cleared", async () => {
    const { Wrapper } = createWrapper();
    const { rerender, result } = renderHook(
      ({ q }: { q?: string }) => usePaginatedReassignedStepsQuery({ q }),
      { initialProps: { q: "sofa" as string | undefined }, wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ q: undefined });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(
      result.current.items.some((item) => item.client_id === "tstp_no_item"),
    ).toBe(true);
  });

  it("defaults to the standard page size when no limit is given", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePaginatedReassignedStepsQuery({}), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(REASSIGNED_STEPS_PAGE_SIZE).toBe(20);
    // All three mock items fit on one page.
    expect(result.current.hasMore).toBe(false);
  });

  it("honours an explicit limit and pages through with loadMore", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ limit: 2 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.hasMore).toBe(false);
    // Both pages' section maps are merged, so every group can render a header.
    expect(Object.keys(result.current.workingSections).sort()).toEqual([
      "wsec_carpentry",
      "wsec_upholstery",
    ]);
  });

  it("composes q with pagination — has_more reflects the filtered set", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ q: "sofa", limit: 2 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Only one item matches, so the filtered set fits on the first page.
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(false);
  });

  it("dedupes by client_id when pages overlap", async () => {
    // A reassignment landing between two requests can shift the window and
    // repeat a row across the page boundary; a duplicate would collide in the
    // grouping keys, so the flattening step drops it.
    const overlapping = makeReassignedStepItem({
      client_id: "tstp_dupe",
      acknowledgment: { step_id: "tstp_dupe" },
    });

    reassignedStepsTestServer.use(
      http.get(
        "*/api/v1/task-step-acknowledgments/reassigned-steps",
        ({ request }) => {
          const offset = Number(
            new URL(request.url).searchParams.get("offset") ?? 0,
          );
          return HttpResponse.json({
            ok: true,
            warnings: [],
            data: {
              steps_pagination: {
                items: [overlapping],
                limit: 1,
                offset,
                has_more: offset === 0,
              },
              working_sections: {},
            },
          });
        },
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePaginatedReassignedStepsQuery({ limit: 1 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    // The same row came back on both pages — it is still listed once.
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.client_id).toBe("tstp_dupe");
  });
});

describe("useReassignedStepsCountQuery", () => {
  it("agrees with the fully-paged list length (handoff §13 canary)", async () => {
    const { Wrapper } = createWrapper();
    const { result: countResult } = renderHook(
      () => useReassignedStepsCountQuery(),
      { wrapper: Wrapper },
    );
    const { result: listResult } = renderHook(
      () => usePaginatedReassignedStepsQuery({}),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(countResult.current.isPending).toBe(false));
    await waitFor(() => expect(listResult.current.isPending).toBe(false));

    expect(countResult.current.data?.total).toBe(listResult.current.items.length);
  });

  it("never sends query parameters", async () => {
    let requestedUrl = "";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = typeof input === "string" ? input : String(input);
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      await fetchReassignedStepsCount();
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(requestedUrl).toContain("/reassigned-steps/count");
    expect(requestedUrl).not.toContain("?");
  });
});
