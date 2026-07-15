import "@testing-library/jest-dom/vitest";
import type React from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ShopifyProductSyncInventoryField } from "./ShopifyProductSyncInventoryField";
import type { ShopifyProductSyncFormValues } from "../../types";

const { locationsQueryMock, readStorageMock, writeStorageMock } = vi.hoisted(
  () => ({
    locationsQueryMock: vi.fn(),
    readStorageMock: vi.fn(),
    writeStorageMock: vi.fn(),
  }),
);

vi.mock("../../api/use-list-shopify-locations-query", () => ({
  useListShopifyLocationsQuery: locationsQueryMock,
}));

vi.mock("../../lib/shopify-product-sync-inventory-storage", () => ({
  readLastSelectedInventoryLocationIds: readStorageMock,
  writeLastSelectedInventoryLocationIds: writeStorageMock,
}));

const locations = [
  {
    location_id: "gid://shopify/Location/1",
    name: "Main warehouse",
    is_active: true,
  },
  {
    location_id: "gid://shopify/Location/2",
    name: "Inactive warehouse",
    is_active: false,
  },
];

function makeShop(
  shopIntegrationId: string,
  status: "ok" | "needs_reauth" | "error" = "ok",
) {
  return {
    shop_integration_id: shopIntegrationId,
    shop_domain: `${shopIntegrationId}.myshopify.com`,
    status,
    locations: status === "ok" ? locations : [],
  };
}

function makeFormValues(
  inventoryAdjustments: ShopifyProductSyncFormValues["inventoryAdjustments"] = [],
): ShopifyProductSyncFormValues {
  return {
    shopIntegrationIds: ["shop-1"],
    sku: "",
    metafields: [],
    inventoryAdjustments,
    title: "",
    description: "",
  };
}

function ValuesOutput({
  control,
}: {
  control: Parameters<typeof useWatch>[0]["control"];
}): React.JSX.Element {
  const value = useWatch({ control, name: "inventoryAdjustments" });
  return <output data-testid="inventory-values">{JSON.stringify(value)}</output>;
}

function TestForm({
  children,
  defaultValues = makeFormValues(),
  shopIntegrationIds = ["shop-1"],
}: {
  children: React.ReactNode;
  defaultValues?: ShopifyProductSyncFormValues;
  shopIntegrationIds?: string[];
}): React.JSX.Element {
  const form = useForm<ShopifyProductSyncFormValues>({ defaultValues });
  return (
    <FormProvider {...form}>
      {children}
      {shopIntegrationIds.map((shopIntegrationId) => (
        <ShopifyProductSyncInventoryField
          key={shopIntegrationId}
          shopIntegrationId={shopIntegrationId}
          shopIntegrationIds={shopIntegrationIds}
        />
      ))}
      <ValuesOutput control={form.control} />
    </FormProvider>
  );
}

function setQuery(
  shops: ReturnType<typeof makeShop>[],
): void {
  locationsQueryMock.mockReturnValue({
    data: { shops },
    isError: false,
    isLoading: false,
  });
}

describe("ShopifyProductSyncInventoryField", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("toggles a location into a quantity-one adjustment and remembers the selection", async () => {
    setQuery([makeShop("shop-1")]);
    readStorageMock.mockReturnValue(null);
    const user = userEvent.setup();

    render(<TestForm>{null}</TestForm>);

    const option = await screen.findByRole("button", {
      name: "Main warehouse",
    });
    expect(screen.getByText("Inactive — will be activated at 0 before adding units.")).toBeVisible();

    await user.click(option);
    expect(JSON.parse(screen.getByTestId("inventory-values").textContent ?? "null")).toEqual([
      {
        shopIntegrationId: "shop-1",
        locationId: "gid://shopify/Location/1",
        quantityToAdd: 1,
      },
    ]);
    expect(writeStorageMock).toHaveBeenCalledWith("shop-1", [
      "gid://shopify/Location/1",
    ]);

    await user.click(option);
    expect(JSON.parse(screen.getByTestId("inventory-values").textContent ?? "null")).toEqual([]);
    expect(writeStorageMock).toHaveBeenLastCalledWith("shop-1", []);
  });

  it("keeps another shop's adjustments when one shop changes", async () => {
    setQuery([makeShop("shop-1"), makeShop("shop-2")]);
    readStorageMock.mockReturnValue(null);
    const user = userEvent.setup();
    const defaultValues = makeFormValues([
      {
        shopIntegrationId: "shop-2",
        locationId: "gid://shopify/Location/2",
        quantityToAdd: 1,
      },
    ]);
    defaultValues.shopIntegrationIds = ["shop-1", "shop-2"];

    render(
      <TestForm
        defaultValues={defaultValues}
        shopIntegrationIds={["shop-1", "shop-2"]}
      >
        {null}
      </TestForm>,
    );

    expect(locationsQueryMock).toHaveBeenCalledWith(["shop-1", "shop-2"]);
    await user.click(screen.getAllByRole("button", { name: "Main warehouse" })[0]);

    expect(JSON.parse(screen.getByTestId("inventory-values").textContent ?? "null")).toEqual([
      {
        shopIntegrationId: "shop-2",
        locationId: "gid://shopify/Location/2",
        quantityToAdd: 1,
      },
      {
        shopIntegrationId: "shop-1",
        locationId: "gid://shopify/Location/1",
        quantityToAdd: 1,
      },
    ]);
    expect(screen.getAllByText("shop-1.myshopify.com")).toHaveLength(1);
    expect(screen.getAllByText("shop-2.myshopify.com")).toHaveLength(1);
  });

  it("auto-selects remembered locations that still exist", async () => {
    setQuery([makeShop("shop-1")]);
    readStorageMock.mockReturnValue([
      "gid://shopify/Location/2",
      "gid://shopify/Location/missing",
    ]);

    render(<TestForm>{null}</TestForm>);

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId("inventory-values").textContent ?? "null")).toEqual([
        {
          shopIntegrationId: "shop-1",
          locationId: "gid://shopify/Location/2",
          quantityToAdd: 1,
        },
      ]);
    });
  });

  it.each([
    ["needs_reauth", "Reauthorize this shop before adding inventory."],
    ["error", "Locations could not be fetched for this shop."],
  ] as const)("does not render a picker for %s locations", (status, message) => {
    setQuery([makeShop("shop-1", status)]);

    render(<TestForm>{null}</TestForm>);

    expect(screen.getByText(message)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Main warehouse" })).toBeNull();
  });
});
