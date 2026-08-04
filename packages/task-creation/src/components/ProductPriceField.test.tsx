import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { buildPreOrderFormDefaultValues } from "../lib/pre-order-form-default-values";
import { ProductPriceField } from "./ProductPriceField";
import type { PreOrderFormValues } from "../types";

function Harness({ quantity }: { quantity: number }): React.JSX.Element {
  const form = useForm<PreOrderFormValues>({
    defaultValues: {
      ...buildPreOrderFormDefaultValues(true),
      item: { ...buildPreOrderFormDefaultValues(true).item, quantity },
    },
  });

  return (
    <FormProvider {...form}>
      <ProductPriceField />
    </FormProvider>
  );
}

describe("ProductPriceField", () => {
  it("prices per piece and totals against the item quantity", () => {
    render(<Harness quantity={12} />);

    fireEvent.change(screen.getByTestId("pre-order-product-price-input"), {
      target: { value: "100" },
    });

    const total = screen.getByTestId("pre-order-product-price-total");
    expect(total).toHaveTextContent("12 pcs × 100 kr");
    expect(total).toHaveTextContent("1 200 kr");
  });

  it("waits for a price before showing a total", () => {
    render(<Harness quantity={1} />);

    const total = screen.getByTestId("pre-order-product-price-total");
    expect(total).toHaveTextContent("1 pc");
    expect(total).toHaveTextContent("—");
  });
});
