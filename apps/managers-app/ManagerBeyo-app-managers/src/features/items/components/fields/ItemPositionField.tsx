import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, FieldLabelRow, TextInput } from '@/components/primitives';

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
      <FieldLabelRow htmlFor="item-position" label="Position">
        <FieldErrorPill data-testid="item-position-error" message={error} />
      </FieldLabelRow>
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
