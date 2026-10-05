import { act, renderHook } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePreorderShopifyAvailability } from "./use-preorder-shopify-availability";
import { buildPreOrderFormDefaultValues } from "../lib/pre-order-form-default-values";
import { buildShopifyPreorderSection } from "../lib/normalize-task-form-payload";
import { PreOrderFormSchema, type PreOrderFormValues } from "../types";

const queries = vi.hoisted(() => ({ shops: vi.fn(), locations: vi.fn() }));
vi.mock("@beyo/shopify", async (importOriginal) => ({
  ...await importOriginal<typeof import("@beyo/shopify")>(),
  useListShopifyShopsQuery: queries.shops,
  useListShopifyLocationsQuery: queries.locations,
}));

function locationsResult(
  status: "ok" | "needs_reauth" | "error" = "ok",
  locations: { location_id: string }[] = [],
) {
  return {
    isSuccess: true,
    isError: false,
    data: { shops: [{ shop_integration_id: "shop-1", status, locations }] },
  };
}

function setup(inventoryQuantities: PreOrderFormValues["inventoryQuantities"] = []) {
  return renderHook(() => {
    const defaults = buildPreOrderFormDefaultValues(true);
    const form = useForm<PreOrderFormValues>({
      resolver: zodResolver(PreOrderFormSchema),
      defaultValues: {
        ...defaults,
        item: { ...defaults.item, major_category: "wood", item_category_id: "cat-1" },
        customer: {
          ...defaults.customer,
          display_name: "Ada", customer_type: "private",
          primary_phone_number: "+46700000000",
        },
        shopIntegrationIds: ["shop-1"],
        inventoryQuantities,
      },
    });
    usePreorderShopifyAvailability(form);
    return form;
  });
}

async function validate(form: ReturnType<typeof setup>["result"]["current"]) {
  let valid = false;
  await act(async () => { valid = await form.trigger(); });
  return valid;
}

describe("pre-order Shopify availability", () => {
  beforeEach(() => {
    queries.shops.mockReturnValue({
      isSuccess: true, data: { shops: [{ client_id: "shop-1" }] },
    });
    queries.locations.mockReturnValue(locationsResult());
  });

  it.each([
    ["failed request", { isSuccess: false, isError: true }],
    ["no locations", locationsResult()],
    ["needs reauthorization", locationsResult("needs_reauth")],
    ["shop lookup error", locationsResult("error")],
  ])("allows creation without Shopify for %s", async (_name, query) => {
    queries.locations.mockReturnValue(query);
    const { result } = setup([
      { shopIntegrationId: "shop-1", locationId: "old-location", quantity: 1 },
    ]);
    expect(await validate(result.current)).toBe(true);
    expect(result.current.getValues("inventoryQuantities")).toEqual([]);
    expect(buildShopifyPreorderSection(result.current.getValues())).toBeUndefined();
  });

  it("requires inventory while locations are loading", async () => {
    queries.locations.mockReturnValue({ isSuccess: false, isError: false });
    const { result } = setup();
    expect(await validate(result.current)).toBe(false);
  });

  it("requires inventory when locations are available", async () => {
    queries.locations.mockReturnValue(locationsResult("ok", [{ location_id: "loc-1" }]));
    const { result } = setup();
    expect(await validate(result.current)).toBe(false);
    await act(async () => {
      result.current.setValue("inventoryQuantities", [
        { shopIntegrationId: "shop-1", locationId: "loc-1", quantity: 1 },
      ]);
    });
    expect(await validate(result.current)).toBe(true);
    expect(buildShopifyPreorderSection(result.current.getValues())).toBeDefined();
  });

  it("restores the requirement when a failed lookup recovers", async () => {
    queries.locations.mockReturnValue({ isSuccess: false, isError: true });
    const { result, rerender } = setup();
    expect(await validate(result.current)).toBe(true);
    queries.locations.mockReturnValue(locationsResult("ok", [{ location_id: "loc-1" }]));
    rerender();
    expect(await validate(result.current)).toBe(false);
  });

  it("does not carry an unavailable shop's exemption to another shop", async () => {
    const { result } = setup();
    expect(await validate(result.current)).toBe(true);
    queries.locations.mockReturnValue({ isSuccess: false, isError: false });
    await act(async () => { result.current.setValue("shopIntegrationIds", ["shop-2"]); });
    expect(await validate(result.current)).toBe(false);
  });

  it("clears stale shop and inventory selections when the shop list is empty", async () => {
    queries.shops.mockReturnValue({ isSuccess: true, data: { shops: [] } });
    const { result } = setup();
    expect(await validate(result.current)).toBe(true);
    expect(result.current.getValues("shopIntegrationIds")).toEqual([]);
    expect(buildShopifyPreorderSection(result.current.getValues())).toBeUndefined();
  });
});
