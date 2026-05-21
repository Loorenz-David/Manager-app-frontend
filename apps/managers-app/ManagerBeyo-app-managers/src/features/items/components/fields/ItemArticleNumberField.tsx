import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function ItemArticleNumberField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.article_number?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="item-article-number"
          className="text-sm font-medium text-muted-foreground"
        >
          Article number <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill
          data-testid="item-article-number-error"
          message={error}
        />
      </div>
      <TextInput
        data-testid="item-article-number-input"
        id="item-article-number"
        type="text"
        autoCapitalize="characters"
        placeholder="e.g. KN-123"
        invalid={Boolean(error)}
        {...register('item.article_number')}
      />
    </div>
  );
}
