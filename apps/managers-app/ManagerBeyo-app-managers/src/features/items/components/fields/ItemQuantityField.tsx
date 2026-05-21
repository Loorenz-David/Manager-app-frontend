import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill, NumberInput } from '@/components/primitives';

export function ItemQuantityField() {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { field } = useController({
    name: 'item.quantity',
    control,
  });
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.quantity?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-quantity" className="text-sm font-medium text-muted-foreground">
          Quantity <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-quantity-error" message={error} />
      </div>
      <NumberInput
        id="item-quantity"
        inputTestId="item-quantity-input"
        incrementTestId="item-quantity-increment-button"
        decrementTestId="item-quantity-decrement-button"
        min={0}
        placeholder="e.g. 1"
        step={1}
        invalid={Boolean(error)}
        value={field.value ?? null}
        onBlur={field.onBlur}
        onValueChange={(nextValue) => field.onChange(nextValue ?? undefined)}
      />
    </div>
  );
}
