import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function ItemSkuField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.sku?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-sku" className="text-sm font-medium text-foreground">
          SKU <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-sku-error" message={error} />
      </div>
      <TextInput
        data-testid="item-sku-input"
        id="item-sku"
        type="text"
        autoCapitalize="characters"
        placeholder="e.g. SKU-456"
        invalid={Boolean(error)}
        {...register('item.sku')}
      />
    </div>
  );
}
