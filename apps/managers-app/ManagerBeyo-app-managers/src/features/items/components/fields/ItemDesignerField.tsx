import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, FieldLabelRow, TextInput } from '@/components/primitives';

export function ItemDesignerField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.designer?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="item-designer" label="Designer" optional>
        <FieldErrorPill data-testid="item-designer-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="item-designer-input"
        id="item-designer"
        type="text"
        placeholder="e.g. Knoll"
        invalid={Boolean(error)}
        {...register('item.designer')}
      />
    </div>
  );
}
