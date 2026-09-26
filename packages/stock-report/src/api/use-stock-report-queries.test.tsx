import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchActiveStockReportVersion: vi.fn(),
  fetchStockReportAssignments: vi.fn(),
  fetchStockReportItems: vi.fn(),
  fetchStockReportMissingSummary: vi.fn(),
  fetchStockReportVersions: vi.fn(),
}));

vi.mock("./stock-report-api", () => api);

import { useStockReportListQuery } from "./use-stock-report-queries";
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
