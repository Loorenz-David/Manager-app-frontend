import "@testing-library/jest-dom/vitest";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ShopifyProductSyncSkuField } from "./ShopifyProductSyncSkuField";
import { ShopifyProductSyncFormProvider } from "../../providers/ShopifyProductSyncFormProvider";
import type { ShopifyProductSyncFormValues } from "../../types";

const { suggestionQueryMock, refetchMock } = vi.hoisted(() => ({
  suggestionQueryMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock("../../api/use-item-sku-suggestion-query", () => ({
  useItemSkuSuggestionQuery: suggestionQueryMock,
}));

let latestValues: () => ShopifyProductSyncFormValues = () => {
  throw new Error("form not rendered");
};

function Harness({ sku, title }: { sku: string; title: string }) {
  const form = useForm<ShopifyProductSyncFormValues>({
    defaultValues: {
      shopIntegrationIds: ["shop-1"],
      sku,
      metafields: [],
      inventoryQuantities: [],
      title,
      description: "",
    },
  });
  latestValues = form.getValues;
  return (
    <ShopifyProductSyncFormProvider
      itemClientId="item-1"
      itemArticleNumber={null}
      itemSku={null}
      itemCategoryId="category-tables"
      productCategory={null}
      defaultTitle="Default title"
      mode="submit"
      surfaceOpeners={{}}
    >
      <FormProvider {...form}>
        <ShopifyProductSyncSkuField />
      </FormProvider>
    </ShopifyProductSyncFormProvider>
  );
}

function suggestionResult(sku: string | null) {
  return {
    data: { sku, prefix: sku ? "T" : null, sequence: sku ? 3 : null },
    isFetching: false,
    refetch: refetchMock,
  };
}

describe("ShopifyProductSyncSkuField suggestion", () => {
  beforeEach(() => {
    suggestionQueryMock.mockReturnValue(suggestionResult("T3-201126"));
    refetchMock.mockResolvedValue({ data: { sku: "T4-201126" } });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fills an empty SKU on open and lets the title follow the default", async () => {
    render(<Harness sku="" title="Default title" />);

    await waitFor(() =>
      expect(screen.getByTestId("shopify-product-sync-sku-input")).toHaveValue("T3-201126"),
    );
    expect(latestValues().title).toBe("T3-201126");
    expect(suggestionQueryMock).toHaveBeenCalledWith({
      itemCategoryId: "category-tables",
      enabled: true,
    });
  });

  it("keeps a title that is the product's own", async () => {
    render(<Harness sku="" title="Teak dining table" />);

    await waitFor(() =>
      expect(screen.getByTestId("shopify-product-sync-sku-input")).toHaveValue("T3-201126"),
    );
    expect(latestValues().title).toBe("Teak dining table");
  });

  it("does not ask for a suggestion when the SKU is already set", () => {
    render(<Harness sku="T1-191126" title="T1-191126" />);

    expect(screen.getByTestId("shopify-product-sync-sku-input")).toHaveValue("T1-191126");
    expect(suggestionQueryMock).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(screen.queryByTestId("shopify-product-sync-sku-suggest")).not.toBeInTheDocument();
  });

  it("suggests again after the user clears the field", async () => {
    const user = userEvent.setup();
    render(<Harness sku="" title="" />);
    const input = screen.getByTestId("shopify-product-sync-sku-input");
    await waitFor(() => expect(input).toHaveValue("T3-201126"));

    await user.clear(input);
    await user.click(screen.getByTestId("shopify-product-sync-sku-suggest"));

    await waitFor(() => expect(input).toHaveValue("T4-201126"));
    expect(refetchMock).toHaveBeenCalledOnce();
  });

  it("leaves the field empty for a category without a prefix", () => {
    suggestionQueryMock.mockReturnValue(suggestionResult(null));
    render(<Harness sku="" title="" />);

    expect(screen.getByTestId("shopify-product-sync-sku-input")).toHaveValue("");
  });
});
