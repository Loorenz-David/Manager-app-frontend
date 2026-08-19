import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

// Note: prices render with a non-breaking space ("1\u00a0200 kr"), but
// jest-dom's toHaveTextContent normalizes whitespace before comparing — so
// these expectations use a plain space deliberately.

import { ItemPricingFieldGroup } from "./ItemPricingFieldGroup";
import {
  EMPTY_ITEM_PRICING_FIELDS,
  type ItemPricingFields,
} from "../../pricing-fields";

afterEach(cleanup);

type HostValues = { item_pricing: ItemPricingFields };

function Host({
  majorCategory,
  quantity,
  showPricedItemRefusal,
  onClearPrices,
  defaults = EMPTY_ITEM_PRICING_FIELDS,
}: {
  majorCategory: string | null;
  quantity: number | null;
  showPricedItemRefusal?: boolean;
  onClearPrices?: () => void;
  defaults?: ItemPricingFields;
}): React.JSX.Element {
  const form = useForm<HostValues>({
    defaultValues: { item_pricing: defaults },
  });

  return (
    <FormProvider {...form}>
      <ItemPricingFieldGroup
        majorCategory={majorCategory}
        quantity={quantity}
        showPricedItemRefusal={showPricedItemRefusal}
        onClearPrices={onClearPrices}
      />
    </FormProvider>
  );
}

describe("visibility", () => {
  it("renders nothing until a category is chosen", () => {
    const { container } = render(<Host majorCategory={null} quantity={4} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders both fields once a category is chosen", () => {
    render(<Host majorCategory="wood" quantity={null} />);

    expect(screen.getByTestId("item-purchase-price")).toBeInTheDocument();
    expect(screen.getByTestId("item-expected-sale-price")).toBeInTheDocument();
  });
});

describe("seat — per piece, with a running total", () => {
  const seatDefaults: ItemPricingFields = {
    purchase_cost_per_piece: 1200,
    expected_sale_price_per_piece: 4000,
  };

  it("shows each price's breakdown and total", () => {
    render(
      <Host majorCategory="seat" quantity={4} defaults={seatDefaults} />,
    );

    expect(
      screen.getByTestId("item-purchase-price-breakdown"),
    ).toHaveTextContent("4 pcs × 1 200 kr");
    expect(screen.getByTestId("item-purchase-price-total")).toHaveTextContent(
      "4 800 kr",
    );
    expect(
      screen.getByTestId("item-expected-sale-price-total"),
    ).toHaveTextContent("16 000 kr");
  });

  it("labels both prices per piece", () => {
    render(<Host majorCategory="seat" quantity={4} defaults={seatDefaults} />);

    expect(screen.getByText("Purchase price per piece")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Expected sale price per piece"),
    ).toBeInTheDocument();
  });

  it("shows a dash rather than zero for an empty sale price", () => {
    render(<Host majorCategory="seat" quantity={4} />);

    expect(
      screen.getByTestId("item-expected-sale-price-total"),
    ).toHaveTextContent("—");
  });

  it("updates the total as the price is typed", async () => {
    const user = userEvent.setup();
    render(<Host majorCategory="seat" quantity={3} />);

    await user.type(
      screen.getByTestId("item-expected-sale-price-input"),
      "500",
    );

    expect(
      screen.getByTestId("item-expected-sale-price-total"),
    ).toHaveTextContent("1 500 kr");
  });
});

describe("wood — a single piece, no breakdown", () => {
  it("omits the total row entirely", () => {
    render(
      <Host
        majorCategory="wood"
        quantity={null}
        defaults={{
          purchase_cost_per_piece: 1200,
          expected_sale_price_per_piece: 4000,
        }}
      />,
    );

    expect(
      screen.queryByTestId("item-purchase-price-total"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("item-expected-sale-price-total"),
    ).not.toBeInTheDocument();
  });

  it("drops the per-piece wording, since there is only one piece", () => {
    render(<Host majorCategory="wood" quantity={null} />);

    expect(screen.getByText("Purchase price")).toBeInTheDocument();
    expect(screen.getByLabelText("Expected sale price")).toBeInTheDocument();
  });

  it("shows the purchase price as a plain value, with no total row", () => {
    render(
      <Host
        majorCategory="wood"
        quantity={null}
        defaults={{
          purchase_cost_per_piece: 1250.5,
          expected_sale_price_per_piece: 4000,
        }}
      />,
    );

    expect(screen.getByTestId("item-purchase-price-value")).toHaveTextContent(
      "1 250,5 kr",
    );
    expect(
      screen.queryByTestId("item-purchase-price-total"),
    ).not.toBeInTheDocument();
  });
});

describe("optionality", () => {
  it("marks the sale price optional", () => {
    render(<Host majorCategory="seat" quantity={4} />);

    // Only the sale price is an input; the purchase price is read-only.
    expect(screen.getAllByText("optional")).toHaveLength(1);
  });
});

describe("purchase price is read-only", () => {
  it("offers no input to type into", () => {
    render(<Host majorCategory="seat" quantity={4} />);

    expect(
      screen.queryByTestId("item-purchase-price-input"),
    ).not.toBeInTheDocument();
  });

  it("explains where the number comes from when there is none", () => {
    render(<Host majorCategory="seat" quantity={4} />);

    expect(
      screen.getByTestId("item-purchase-price-unavailable"),
    ).toHaveTextContent("this price comes from the purchase system");
  });

  it("drops the explanation once the lookup supplies a price", () => {
    render(
      <Host
        majorCategory="seat"
        quantity={4}
        defaults={{
          purchase_cost_per_piece: 1250.5,
          expected_sale_price_per_piece: null,
        }}
      />,
    );

    expect(
      screen.queryByTestId("item-purchase-price-unavailable"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("item-purchase-price-total")).toHaveTextContent(
      "5 002 kr",
    );
  });
});

describe("priced-item refusal", () => {
  it("stays hidden by default", () => {
    render(<Host majorCategory="seat" quantity={4} />);

    expect(
      screen.queryByTestId("item-pricing-refusal-notice"),
    ).not.toBeInTheDocument();
  });

  it("explains what to do, beside the prices it refers to", () => {
    render(<Host majorCategory="seat" quantity={4} showPricedItemRefusal />);

    const notice = screen.getByTestId("item-pricing-refusal-notice");
    expect(notice).toHaveTextContent("This item already has a price");
    expect(notice).toHaveTextContent("Remove the prices from this task");
    expect(screen.getByTestId("item-purchase-price")).toBeInTheDocument();
  });

  it("offers a button, because the purchase price cannot be cleared by hand", async () => {
    const user = userEvent.setup();
    const onClearPrices = vi.fn();
    render(
      <Host
        majorCategory="seat"
        quantity={4}
        showPricedItemRefusal
        onClearPrices={onClearPrices}
      />,
    );

    await user.click(screen.getByTestId("item-pricing-refusal-action"));

    expect(onClearPrices).toHaveBeenCalledTimes(1);
  });
});
