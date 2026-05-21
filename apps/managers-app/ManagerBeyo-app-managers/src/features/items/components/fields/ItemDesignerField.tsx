import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

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
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-designer" className="text-sm font-medium text-foreground">
          Designer <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-designer-error" message={error} />
      </div>
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
