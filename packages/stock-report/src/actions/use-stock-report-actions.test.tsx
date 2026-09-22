import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createStockAssignment: vi.fn(),
  removeStockAssignment: vi.fn(),
  reorderStockReportItem: vi.fn(),
  setStockReportPriority: vi.fn(),
}));
const notify = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("../api/stock-report-api", () => api);
vi.mock("@beyo/lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/lib")>()),
  notify,
}));

import { ApiRequestError } from "@beyo/api-client";
import {
  useCreateStockAssignment,
  useRemoveStockAssignment,
  useReorderStockReportItem,
  useSetStockReportPriority,
} from "./use-stock-report-actions";
import { stockReportKeys } from "../api/stock-report-keys";
import {
  wireStockReportAssignment,
  wireStockReportItem,
} from "../fixtures/stock-report-wire-fixtures";
import {
  EMPTY_STOCK_REPORT_FILTER as ALL,
  type StockReportAssignment,
  type StockReportItem,
} from "../stock-report.types";

const WOOD = { majorCategory: "wood" as const };

function item(client_id: string, priority: "high" | "low" | null): StockReportItem {
  return wireStockReportItem({ client_id, priority, priority_order: priority ? 1 : null });
}

function assignment(client_id: string): StockReportAssignment {
  return wireStockReportAssignment({ client_id });
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe("stock-report mutations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves a priority optimistically and restores every bucket on failure", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [item("sri-2", "low")]);
    api.setStockReportPriority.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalledWith("sri-1", "low"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL))?.map((row) => row.client_id)).toEqual(["sri-2"]);
    // A silent snap-back reads as a glitch (W-3); a non-API failure gets the generic copy.
    expect(notify.error).toHaveBeenCalledWith("Priority not changed", "The change could not be saved. Pull to refresh and try again.");
  });

  it("lands an optimistic priority move in every cached list of the destination bucket, filtered or not", async () => {
    // The board may hold the same bucket under two filters (a worker's Wood
    // default and a later "all"); the moved row must not vanish from either.
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high")]);
    queryClient.setQueryData(stockReportKeys.list("low", ALL), [item("sri-2", "low")]);
    queryClient.setQueryData(stockReportKeys.list("low", WOOD), [item("sri-2", "low")]);
    api.setStockReportPriority.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useSetStockReportPriority(), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", priority: "low" }));
    await waitFor(() => expect(api.setStockReportPriority).toHaveBeenCalled());

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))).toEqual([]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", ALL))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("low", WOOD))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
  });

  it("reorders the list of the bucket *and* filter being viewed, not the unfiltered one", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", WOOD), [item("sri-1", "high"), item("sri-2", "high")]);
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high"), item("sri-2", "high")]);
    api.reorderStockReportItem.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReorderStockReportItem("high", WOOD), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", toIndex: 1 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalled());

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", WOOD))?.map((row) => row.client_id)).toEqual(["sri-2", "sri-1"]);
    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1", "sri-2"]);
  });

  it("converts a drop index to the one-based request and rolls back on refusal", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.list("high", ALL), [item("sri-1", "high"), item("sri-2", "high")]);
    // The backend's own sentence for STOCK_REPORT_TARGET_OUT_OF_RANGE, in the
    // `{ error, ok: false }` shape the api-client lifts into `message`.
    api.reorderStockReportItem.mockRejectedValueOnce(new ApiRequestError(422, "unprocessable", "Target position is out of range."));
    const { result } = renderHook(() => useReorderStockReportItem("high", ALL), { wrapper });

    act(() => result.current.mutate({ stockNeedId: "sri-1", toIndex: 1 }));
    await waitFor(() => expect(api.reorderStockReportItem).toHaveBeenCalledWith("sri-1", 2));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportItem[]>(stockReportKeys.list("high", ALL))?.map((row) => row.client_id)).toEqual(["sri-1", "sri-2"]);
    expect(notify.error).toHaveBeenCalledWith("Order not changed", "Target position is out of range.");
  });

  it("writes a successful created assignment straight to the detail cache", async () => {
    const { queryClient, wrapper } = setup();
    api.createStockAssignment.mockResolvedValueOnce(assignment("sta-1"));
    const { result } = renderHook(() => useCreateStockAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ stockReportItemId: "sri-1", taskId: "tsk-1", itemId: "itm-1", overridePropertyMismatch: true });
    });

    expect(queryClient.getQueryData<StockReportAssignment[]>(stockReportKeys.assignmentList("sri-1"))?.map((row) => row.client_id)).toEqual(["sta-1"]);
    expect(api.createStockAssignment.mock.calls[0]?.[0]).toMatchObject({ overridePropertyMismatch: true });
  });

  it("removes optimistically and restores the exact assignment list on failure", async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(stockReportKeys.assignmentList("sri-1"), [assignment("sta-1"), assignment("sta-2")]);
    api.removeStockAssignment.mockRejectedValueOnce(new Error("not found"));
    const { result } = renderHook(() => useRemoveStockAssignment("sri-1"), { wrapper });

    act(() => result.current.mutate("sta-1"));
    await waitFor(() => expect(api.removeStockAssignment.mock.calls[0]?.[0]).toBe("sta-1"));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<StockReportAssignment[]>(stockReportKeys.assignmentList("sri-1"))?.map((row) => row.client_id)).toEqual(["sta-1", "sta-2"]);
  });
});
