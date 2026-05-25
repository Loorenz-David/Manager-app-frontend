import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill, FieldLabelRow, NumberInput } from '@/components/primitives';

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function ItemUpholsteryAmountField() {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { field } = useController({
    name: 'item_upholstery.upholstery_amount_meters',
    control,
  });
  const error = (
    errors as { item_upholstery?: Record<string, { message?: string }> }
  ).item_upholstery?.upholstery_amount_meters?.message;

  function applyMultiplier(factor: number): void {
    const currentValue = typeof field.value === 'number' ? field.value : null;
    const nextValue = currentValue === null ? factor : roundToFourDecimals(currentValue * factor);
    field.onChange(nextValue);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="item-upholstery-amount" label="Amount" optional>
        <FieldErrorPill data-testid="item-upholstery-amount-error" message={error} />
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
        onValueChange={(nextValue) => field.onChange(nextValue ?? undefined)}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="item-upholstery-amount-x025-button"
          className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.25)}
        >
          × 0.25
        </button>
        <button
          type="button"
          data-testid="item-upholstery-amount-x05-button"
          className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          onClick={() => applyMultiplier(0.5)}
        >
          × 0.5
        </button>
      </div>
    </div>
  );
}
