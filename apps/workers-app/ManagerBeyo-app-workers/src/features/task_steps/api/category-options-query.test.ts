import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAllItemCategoryPickerOptionsQuery } from "@beyo/item-categories";

const get = vi.hoisted(() => vi.fn());
vi.mock("@beyo/api-client", () => ({ apiClient: { get } }));

describe("useAllItemCategoryPickerOptionsQuery", () => {
  it("loads every category page in order", async () => {
    get.mockReset();
    get
      .mockResolvedValueOnce({ data: {
        item_categories: [{ client_id: "first" }],
        item_categories_pagination: { has_more: true, limit: 200, offset: 0 },
      } })
      .mockResolvedValueOnce({ data: {
        item_categories: [{ client_id: "second" }],
        item_categories_pagination: { has_more: false, limit: 200, offset: 200 },
      } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAllItemCategoryPickerOptionsQuery(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((category) => category.client_id)).toEqual(["first", "second"]);
    expect(get).toHaveBeenNthCalledWith(
      1, "/api/v1/item-categories", expect.anything(),
      expect.objectContaining({ limit: 200, offset: 0 }),
    );
    expect(get).toHaveBeenNthCalledWith(
      2, "/api/v1/item-categories", expect.anything(),
      expect.objectContaining({ limit: 200, offset: 200 }),
    );
  });
});
