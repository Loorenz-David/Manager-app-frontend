import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useShopifyMetafieldPickerController } from "./use-shopify-metafield-picker.controller";

const mocks = vi.hoisted(() => ({
  shopsQuery: { data: { shops: [] } },
  searchQuery: vi.fn(),
  categoryQuery: vi.fn(),
  fetchNextPage: vi.fn(),
  reorderPreference: vi.fn(),
  createPreference: vi.fn(),
  deletePreference: vi.fn(),
}));

vi.mock("../api/use-list-shopify-shops-query", () => ({
  useListShopifyShopsQuery: () => mocks.shopsQuery,
}));
vi.mock("../api/use-shopify-metafield-preferences-query", () => ({
  useShopifyMetafieldPreferencesCategoryQuery: mocks.categoryQuery,
  useShopifyMetafieldPreferencesSearchInfiniteQuery: mocks.searchQuery,
}));
vi.mock("../actions/use-create-shopify-metafield-preference", () => ({
  useCreateShopifyMetafieldPreference: () => ({ createPreference: mocks.createPreference }),
}));
vi.mock("../actions/use-delete-shopify-metafield-preference", () => ({
  useDeleteShopifyMetafieldPreference: () => ({ deletePreference: mocks.deletePreference }),
}));
vi.mock("../actions/use-reorder-shopify-metafield-preference", () => ({
  useReorderShopifyMetafieldPreference: () => ({ reorderPreference: mocks.reorderPreference }),
}));

function definition(name: string, id: string) {
  return {
    shopify_metafield_definition_id: id,
    name,
    namespace: "custom",
    key: id,
    description: null,
    type: "single_line_text_field",
    validations: [],
  };
}

function preference(name: string, id: string, sequenceOrder: number) {
  return {
    ...definition(name, id),
    client_id: `preference-${id}`,
    item_category_id: "category-1",
    shop_integration_id: "shop-1",
    sequence_order: sequenceOrder,
    is_enabled: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: null,
    created_by: null,
  };
}

function page(saved: ReturnType<typeof preference>[], searched: ReturnType<typeof definition>[]) {
  return {
    shops: [{
      shop_integration_id: "shop-1",
      shop_domain: "shop-1.myshopify.com",
      item_categories: [{ item_category_id: "category-1", metafield_preferences: saved }],
      unavailable_definition_ids: [],
      search_results: searched,
      search_pagination: { offset: 0, limit: 20, has_more: true, next_offset: 20 },
    }],
  };
}

const saved = [
  preference("First condition", "first", 0),
  preference("Material", "material", 1),
  preference("Second CONDITION", "second", 2),
];
const selectedShops = ["shop-1"];

describe("useShopifyMetafieldPickerController step filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryQuery.mockReturnValue({ data: { pages: [page(saved, [])] }, isPending: false, fetchStatus: "idle" });
    mocks.searchQuery.mockReturnValue({
      data: { pages: [page([], [definition("Third condition", "third"), definition("Reconditioning", "other")])] },
      hasNextPage: true,
      isFetching: false,
      isFetchingNextPage: false,
      fetchNextPage: mocks.fetchNextPage,
    });
  });

  it("shows saved Report fields on entry and searches for additional condition fields only after typing", async () => {
    mocks.categoryQuery.mockReturnValue({
      data: { pages: [page(saved, [definition("Implicit condition", "implicit")])] },
      isPending: false,
      fetchStatus: "idle",
    });
    const onChange = vi.fn();
    const value = [{ shopIntegrationId: "shop-1", shopifyMetafieldDefinitionId: "material", namespace: "custom", key: "material", type: "single_line_text_field", value: "Cotton" }];
    const { result } = renderHook(() => useShopifyMetafieldPickerController({
      step: "report",
      shopIntegrationIds: selectedShops,
      itemCategoryId: "category-1",
      value,
      onChange,
    }));

    await waitFor(() => expect(result.current.activeFields.map((field) => field.name)).toEqual([
      "First condition", "Second CONDITION",
    ]));
    expect(mocks.searchQuery).toHaveBeenCalledWith(expect.objectContaining({ q: "", enabled: false }));
    expect(result.current.hasMoreSearchResults).toBe(false);
    act(() => result.current.loadMoreSearchResults());
    expect(mocks.fetchNextPage).not.toHaveBeenCalled();

    act(() => result.current.setSearchQuery("Third"));
    await waitFor(() => expect(mocks.searchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Third", enabled: true }),
    ));
    await waitFor(() => expect(result.current.activeFields.map((field) => field.name)).toEqual([
      "Third condition",
    ]));
    expect(result.current.hasMoreSearchResults).toBe(true);
    act(() => result.current.loadMoreSearchResults());
    expect(mocks.fetchNextPage).toHaveBeenCalledOnce();
    act(() => result.current.setSearchQuery(""));
    await waitFor(() => expect(result.current.activeFields.map((field) => field.name)).toEqual([
      "First condition", "Second CONDITION",
    ]));
    act(() => result.current.updateFieldValue(result.current.activeFields[0], "Good"));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ key: "material", value: "Cotton" }),
      expect.objectContaining({ key: "first", value: "Good" }),
    ]));
    act(() => result.current.setSearchQuery("Third"));
    await waitFor(() => expect(result.current.activeFields.map((field) => field.name)).toEqual([
      "Third condition",
    ]));
    const searchedField = result.current.activeFields.find((field) => field.name === "Third condition");
    expect(searchedField).toBeDefined();
    act(() => result.current.addPreference(searchedField!));
    expect(mocks.createPreference).toHaveBeenCalledWith(expect.objectContaining({
      preference: expect.objectContaining({ sequence_order: 3 }),
    }));
  });

  it("keeps ordinary fields in Metafields and maps Report drag to the full sequence", async () => {
    const emptyValues: [] = [];
    const onChange = vi.fn();
    const { result: ordinary } = renderHook(() => useShopifyMetafieldPickerController({
      step: "metafields", shopIntegrationIds: selectedShops, itemCategoryId: "category-1", value: emptyValues, onChange,
    }));
    await waitFor(() => expect(ordinary.current.activeFields.map((field) => field.name)).toEqual(["Material"]));
    act(() => ordinary.current.setSearchQuery("Reconditioning"));
    await waitFor(() => expect(ordinary.current.activeFields.map((field) => field.name)).toEqual(["Reconditioning"]));

    const { result: report } = renderHook(() => useShopifyMetafieldPickerController({
      step: "report", shopIntegrationIds: selectedShops, itemCategoryId: "category-1", value: emptyValues, onChange,
    }));
    act(() => report.current.toggleEditMode());
    await waitFor(() => expect(report.current.activeFields.map((field) => field.name)).toEqual(["First condition", "Second CONDITION"]));
    act(() => report.current.reorderPreference(report.current.activeFields[1], report.current.activeFields, 1, 0));
    expect(mocks.reorderPreference).toHaveBeenCalledWith({ preferenceClientId: "preference-second", sequenceOrder: 0 });
  });
});
