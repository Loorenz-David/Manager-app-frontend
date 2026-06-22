import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestQueryClient,
  createTestWrapper,
} from "@/test-utils/query-client";

import { upholsteryKeys } from "../api/upholstery-keys";
import type { UpholsteryPickerOption } from "../types";

const { fetchToggleUpholsteryFavoriteMock } = vi.hoisted(() => ({
  fetchToggleUpholsteryFavoriteMock: vi.fn(),
}));

vi.mock("../api/fetch-toggle-upholstery-favorite", () => ({
  fetchToggleUpholsteryFavorite: fetchToggleUpholsteryFavoriteMock,
}));

import { useToggleUpholsteryFavorite } from "./use-toggle-upholstery-favorite";

const TEST_ITEM: UpholsteryPickerOption = {
  client_id: "uph_1",
  name: "Natural Linen",
  code: "LN-001",
  image_url: null,
  favorite: true,
  list_order: 1,
  current_stored_amount_meters: "8.0",
  inventory_condition: "available",
  upholstery_category: null,
};

describe("useToggleUpholsteryFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically patches all picker lists and removes unfavorited records from favorites lists", async () => {
    fetchToggleUpholsteryFavoriteMock.mockImplementation(
      () => new Promise(() => undefined),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(upholsteryKeys.pickerList({ in_stock: true }), {
      upholsteries: [TEST_ITEM],
      has_more: false,
    });
    queryClient.setQueryData(upholsteryKeys.pickerList({ favorite: true }), {
      upholsteries: [TEST_ITEM],
      has_more: false,
    });

    const { result } = renderHook(() => useToggleUpholsteryFavorite(), {
      wrapper: createTestWrapper(queryClient),
    });

    result.current.toggleFavorite({
      client_id: "uph_1",
      favorite: false,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData<{ upholsteries: UpholsteryPickerOption[] }>(
          upholsteryKeys.pickerList({ in_stock: true }),
        )?.upholsteries[0]?.favorite,
      ).toBe(false);
      expect(
        queryClient.getQueryData<{ upholsteries: UpholsteryPickerOption[] }>(
          upholsteryKeys.pickerList({ favorite: true }),
        )?.upholsteries,
      ).toEqual([]);
    });
  });

  it("rolls back picker lists when the mutation fails", async () => {
    fetchToggleUpholsteryFavoriteMock.mockRejectedValue(
      new Error("favorite failed"),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(upholsteryKeys.pickerList({ in_stock: true }), {
      upholsteries: [TEST_ITEM],
      has_more: false,
    });

    const { result } = renderHook(() => useToggleUpholsteryFavorite(), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.toggleFavoriteAsync({
        client_id: "uph_1",
        favorite: false,
      }),
    ).rejects.toThrow("favorite failed");

    expect(
      queryClient.getQueryData<{ upholsteries: UpholsteryPickerOption[] }>(
        upholsteryKeys.pickerList({ in_stock: true }),
      )?.upholsteries[0],
    ).toEqual(TEST_ITEM);
  });
});
