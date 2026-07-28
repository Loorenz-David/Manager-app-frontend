import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuickPreOrderItemFormValues } from "../types";
import { QuickPreOrderItemStep } from "./QuickPreOrderItemStep";

afterEach(() => {
  localStorage.clear();
});

function ItemStepHarness({
  hasItem = true,
  articleNumber = "ART-123",
}: {
  hasItem?: boolean;
  articleNumber?: string | null;
}): React.JSX.Element {
  const form = useForm<QuickPreOrderItemFormValues>({
    defaultValues: {
      item: {
        article_number: "",
        quantity: 1,
      },
    },
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...form}>
        <QuickPreOrderItemStep
          hasItem={hasItem}
          itemPreview={{
            articleNumber,
            imageUrl: "https://example.test/item.jpg",
            sku: "SKU-456",
          }}
          onLookupResult={vi.fn()}
        />
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("QuickPreOrderItemStep", () => {
  it("pins the identity field to article number without reading or writing tab memory", () => {
    localStorage.setItem("item-identity-field-active-tab", "sku");

    render(<ItemStepHarness />);

    expect(screen.getByTestId("item-article-number-input")).toBeTruthy();
    expect(screen.getByTestId("item-quantity-input")).toBeTruthy();
    expect(
      screen.getByTestId("quick-preorder-item-preview-sku").textContent,
    ).toBe("SKU-456");
    expect(
      screen.getByTestId("quick-preorder-item-preview-article-number")
        .textContent,
    ).toBe("ART-123");
    expect(
      screen
        .getByTestId("quick-preorder-item-preview-image")
        .querySelector("img")
        ?.getAttribute("src"),
    ).toBe("https://example.test/item.jpg");
    expect(screen.queryByTestId("item-identity-tab-picker")).toBeNull();
    expect(screen.queryByTestId("item-sku-input")).toBeNull();
    expect(localStorage.getItem("item-identity-field-active-tab")).toBe("sku");
  });

  it("omits the article number row when the selected item has none", () => {
    render(<ItemStepHarness articleNumber="  " />);

    expect(
      screen.queryByTestId("quick-preorder-item-preview-article-number"),
    ).toBeNull();
  });

  it("renders an explanatory message when the task has no primary item", () => {
    render(<ItemStepHarness hasItem={false} />);

    expect(screen.getByTestId("quick-preorder-item-missing")).toBeTruthy();
    expect(
      screen.getByText(
        "This pre-order has no item attached, so it cannot be assigned here.",
      ),
    ).toBeTruthy();
  });
});
