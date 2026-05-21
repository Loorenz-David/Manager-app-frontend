import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function ItemQuantityField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.quantity?.message;
  const field = register('item.quantity', { valueAsNumber: true });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-quantity" className="text-sm font-medium text-foreground">
          Quantity <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-quantity-error" message={error} />
      </div>
      <TextInput
        data-testid="item-quantity-input"
        id="item-quantity"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="e.g. 1"
        invalid={Boolean(error)}
        {...field}
      />
    </div>
  );
}
