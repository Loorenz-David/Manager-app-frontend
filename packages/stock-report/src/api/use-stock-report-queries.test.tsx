import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchActiveStockReportVersion: vi.fn(),
  fetchStockReportAssignments: vi.fn(),
  fetchStockReportDraftCount: vi.fn(),
  fetchStockReportItems: vi.fn(),
  fetchStockReportMissingSummary: vi.fn(),
  fetchStockReportVersion: vi.fn(),
  fetchStockReportVersions: vi.fn(),
  progressPriorityParam: (filter: readonly string[] | "all") => (filter === "all" ? "all" : filter.join(",")),
  STOCK_REPORT_PROGRESS_PRIORITIES: ["high", "medium", "low"],
}));

vi.mock("./stock-report-api", () => api);

import {
  useStockReportDraftCountQuery,
  useStockReportListQuery,
  useStockReportVersionQuery,
  useStockReportVersionsQuery,
} from "./use-stock-report-queries";
import { stockReportKeys } from "./stock-report-keys";
import { EMPTY_STOCK_REPORT_FILTER } from "../stock-report.types";

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe("useStockReportListQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the next server offset and refreshes a changed board from zero only", async () => {
    api.fetchStockReportItems.mockImplementation(
      (_bucket, _filter, pagination: { limit: number; offset: number }) =>
        Promise.resolve({
          items: [],
          hasMore: pagination.offset === 0,
          limit: pagination.limit,
          offset: pagination.offset,
        }),
    );
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useStockReportListQuery("high", EMPTY_STOCK_REPORT_FILTER),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchStockReportItems).toHaveBeenLastCalledWith(
      "high",
      EMPTY_STOCK_REPORT_FILTER,
      { limit: 20, offset: 0 },
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(api.fetchStockReportItems).toHaveBeenLastCalledWith(
      "high",
      EMPTY_STOCK_REPORT_FILTER,
      { limit: 20, offset: 20 },
    );
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    api.fetchStockReportItems.mockClear();
    await act(async () => {
      await result.current.refetchFromStart();
    });

    expect(api.fetchStockReportItems).toHaveBeenCalledTimes(1);
    expect(api.fetchStockReportItems).toHaveBeenCalledWith(
      "high",
      EMPTY_STOCK_REPORT_FILTER,
      { limit: 20, offset: 0 },
    );
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1));
  });
});

describe("useStockReportVersionQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads one version under its own key and does not retry a 404 (v7 §5.13)", async () => {
    const notFound = Object.assign(new Error("Stock report snapshot version not found."), { status: 404 });
    api.fetchStockReportVersion.mockRejectedValue(notFound);
    const { queryClient, wrapper } = setup();
    // Leave the client's retry to the hook so the predicate is what decides.
    queryClient.setDefaultOptions({ queries: {} });
    const { result } = renderHook(() => useStockReportVersionQuery("srv-draft"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.fetchStockReportVersion).toHaveBeenCalledTimes(1);
    expect(api.fetchStockReportVersion).toHaveBeenCalledWith("srv-draft", ["high", "medium", "low"]);
    expect(queryClient.getQueryState(stockReportKeys.version("srv-draft", "high,medium,low"))?.status).toBe("error");
  });

  it("stays idle without an id", () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useStockReportVersionQuery(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(api.fetchStockReportVersion).not.toHaveBeenCalled();
  });
});

describe("useStockReportDraftCountQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the count under the draft-count key (v10 §5.23)", async () => {
    api.fetchStockReportDraftCount.mockResolvedValue(2);
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useStockReportDraftCountQuery(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(2));
    expect(queryClient.getQueryData(stockReportKeys.draftCount())).toBe(2);
  });
});

describe("useStockReportVersionsQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keys each state filter apart and passes it to the read (v10 §5.9)", async () => {
    api.fetchStockReportVersions.mockResolvedValue({ versions: [], hasMore: false, limit: 20, offset: 0 });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useStockReportVersionsQuery({ states: ["active", "closed"] }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchStockReportVersions).toHaveBeenCalledWith({ limit: 20, offset: 0, priorities: ["high", "medium", "low"], states: ["active", "closed"] });
    expect(queryClient.getQueryData(stockReportKeys.versionList({ states: ["active", "closed"], progressPriority: "high,medium,low" }))).toBeDefined();
    expect(queryClient.getQueryData(stockReportKeys.versionList({ states: ["draft"], progressPriority: "high,medium,low" }))).toBeUndefined();
  });
});
