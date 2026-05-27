import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ItemUpholsteryAmountField } from "./ItemUpholsteryAmountField";

type FormValues = {
  item_upholstery: {
    upholstery_amount_meters: number | null;
  };
};

function FormDebugValue() {
  const value = useWatch<FormValues>({
    name: "item_upholstery.upholstery_amount_meters",
  });

  return <output data-testid="upholstery-amount-value">{String(value)}</output>;
}

function TestHarness() {
  const methods = useForm<FormValues>({
    defaultValues: {
      item_upholstery: {
        upholstery_amount_meters: null,
      },
    },
  });
  const [quantity, setQuantity] = useState(4);

  return (
    <FormProvider {...methods}>
      <ItemUpholsteryAmountField quantity={quantity} />
      <FormDebugValue />
      <button
        type="button"
        data-testid="set-quantity-6"
        onClick={() => setQuantity(6)}
      >
        Set quantity 6
      </button>
      <button
        type="button"
        data-testid="set-quantity-8"
        onClick={() => setQuantity(8)}
      >
        Set quantity 8
      </button>
    </FormProvider>
  );
}

describe("ItemUpholsteryAmountField", () => {
  it("stays manual until a multiplier pill is tapped", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "null",
    );

    await user.click(screen.getByTestId("set-quantity-6"));

    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "null",
    );
  });

  it("computes amount from quantity and selected factor and recomputes on quantity changes", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByTestId("item-upholstery-amount-x025-button"));
    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "1",
    );

    await user.click(screen.getByTestId("set-quantity-6"));
    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "1.5",
    );
  });

  it("clears active multiplier when manually edited", async () => {
    const user = userEvent.setup();
    render(<TestHarness />);

    await user.click(screen.getByTestId("item-upholstery-amount-x025-button"));
    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "1",
    );

    const input = screen.getByTestId("item-upholstery-amount-input");
    await user.clear(input);
    await user.type(input, "2");

    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "2",
    );

    await user.click(screen.getByTestId("set-quantity-8"));
    expect(screen.getByTestId("upholstery-amount-value")).toHaveTextContent(
      "2",
    );
  });
});
