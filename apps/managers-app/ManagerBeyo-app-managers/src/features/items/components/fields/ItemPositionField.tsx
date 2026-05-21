import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function ItemPositionField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.item_position?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-position" className="text-sm font-medium text-foreground">
          Position <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-position-error" message={error} />
      </div>
      <TextInput
        data-testid="item-position-input"
        id="item-position"
        type="text"
        placeholder="e.g. Top-left corner"
        invalid={Boolean(error)}
        {...register('item.item_position')}
      />
    </div>
  );
}
