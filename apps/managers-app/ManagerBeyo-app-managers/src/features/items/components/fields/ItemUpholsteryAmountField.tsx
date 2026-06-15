import { useEffect, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import {
  FieldErrorPill,
  FieldLabelRow,
  NumberInput,
} from "@/components/primitives";

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

type MultiplierFactor = 0.25 | 0.5;

type ItemUpholsteryAmountFieldProps = {
  quantity?: number | null;
};

function getComputedAmount(
  quantity: number | null | undefined,
  factor: MultiplierFactor,
): number {
  return roundToFourDecimals((quantity ?? 0) * factor);
}

export function ItemUpholsteryAmountField({
  quantity = 0,
}: ItemUpholsteryAmountFieldProps = {}) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const [selectedFactor, setSelectedFactor] = useState<MultiplierFactor | null>(
    null,
  );
  const { field } = useController({
    name: "item_upholstery.upholstery_amount_meters",
    control,
  });
  const error = (
    errors as { item_upholstery?: Record<string, { message?: string }> }
  ).item_upholstery?.upholstery_amount_meters?.message;

  useEffect(() => {
    if (selectedFactor === null) {
      return;
    }

    field.onChange(getComputedAmount(quantity, selectedFactor));
  }, [field, quantity, selectedFactor]);

  function applyMultiplier(factor: MultiplierFactor): void {
    setSelectedFactor(factor);
    field.onChange(getComputedAmount(quantity, factor));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <FieldLabelRow htmlFor="item-upholstery-amount" label="Amount" optional>
          <FieldErrorPill
            data-testid="item-upholstery-amount-error"
            message={error}
          />
        </FieldLabelRow>
        <NumberInput
          id="item-upholstery-amount"
          inputTestId="item-upholstery-amount-input"
          incrementTestId="item-upholstery-amount-increment-button"
          decrementTestId="item-upholstery-amount-decrement-button"
          min={0}
          allowDecimal
          unitLabel="m"
          placeholder="e.g. 2.5"
          step={0.25}
          invalid={Boolean(error)}
          value={field.value ?? null}
          onBlur={field.onBlur}
          onValueChange={(nextValue) => {
            setSelectedFactor(null);
            field.onChange(nextValue ?? undefined);
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="item-upholstery-amount-x025-button"
          className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-md  font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.25)}
        >
          × 0.25
        </button>
        <button
          type="button"
          data-testid="item-upholstery-amount-x05-button"
          className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-md  font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.5)}
        >
          × 0.5
        </button>
      </div>
    </div>
  );
}
