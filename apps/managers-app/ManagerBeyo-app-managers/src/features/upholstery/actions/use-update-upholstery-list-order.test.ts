import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestQueryClient,
  createTestWrapper,
} from "@/test-utils/query-client";

import { upholsteryKeys } from "../api/upholstery-keys";
import type { UpholsteryPickerOption } from "../types";

const { fetchUpdateUpholsteryListOrderMock } = vi.hoisted(() => ({
  fetchUpdateUpholsteryListOrderMock: vi.fn(),
}));

vi.mock("../api/fetch-update-upholstery-list-order", () => ({
  fetchUpdateUpholsteryListOrder: fetchUpdateUpholsteryListOrderMock,
}));

import { useUpdateUpholsteryListOrder } from "./use-update-upholstery-list-order";

const TEST_ITEM: UpholsteryPickerOption = {
  client_id: "uph_1",
  name: "Natural Linen",
  code: "LN-001",
  image_url: null,
  favorite: false,
  list_order: 3,
  current_stored_amount_meters: "8.0",
  inventory_condition: "available",
  upholstery_category: null,
};

describe("useUpdateUpholsteryListOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically updates list_order and invalidates picker lists on settle", async () => {
    fetchUpdateUpholsteryListOrderMock.mockResolvedValue({
      ...TEST_ITEM,
      list_order: 1,
    });

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(upholsteryKeys.pickerList({ in_stock: true }), {
      upholsteries: [TEST_ITEM],
      has_more: false,
    });

    const { result } = renderHook(() => useUpdateUpholsteryListOrder(), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.updateListOrderAsync({
      client_id: "uph_1",
      list_order: 1,
    });

    expect(
      queryClient.getQueryData<{ upholsteries: UpholsteryPickerOption[] }>(
        upholsteryKeys.pickerList({ in_stock: true }),
      )?.upholsteries[0]?.list_order,
    ).toBe(1);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: upholsteryKeys.pickerLists(),
      });
    });
  });

  it("rolls back list_order when the mutation fails", async () => {
    fetchUpdateUpholsteryListOrderMock.mockRejectedValue(
      new Error("order failed"),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(upholsteryKeys.pickerList({ in_stock: true }), {
      upholsteries: [TEST_ITEM],
      has_more: false,
    });

    const { result } = renderHook(() => useUpdateUpholsteryListOrder(), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.updateListOrderAsync({
        client_id: "uph_1",
        list_order: 1,
      }),
    ).rejects.toThrow("order failed");

    expect(
      queryClient.getQueryData<{ upholsteries: UpholsteryPickerOption[] }>(
        upholsteryKeys.pickerList({ in_stock: true }),
      )?.upholsteries[0],
    ).toEqual(TEST_ITEM);
  });
});
