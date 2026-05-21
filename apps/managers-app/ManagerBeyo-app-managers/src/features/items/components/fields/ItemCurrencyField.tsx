import { useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { cn } from '@/lib/utils';

const CURRENCY_LABELS: Record<string, string> = {
  swedish_krona: 'SEK — Swedish Krona',
  danish_krona: 'DKK — Danish Krone',
  euro: 'EUR — Euro',
};

export function ItemCurrencyField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { item?: Record<string, { message?: string }> }
  ).item?.item_currency?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="item-currency" className="text-sm font-medium text-foreground">
          Currency <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="item-currency-error" message={error} />
      </div>
      <select
        data-testid="item-currency-input"
        id="item-currency"
        aria-invalid={Boolean(error)}
        className={cn(
          'h-12 w-full rounded-lg border bg-input px-3 text-base text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          error
            ? 'border-destructive/45 bg-destructive/[0.06] ring-1 ring-destructive/20'
            : 'border-border',
        )}
        {...register('item.item_currency')}
      >
        <option value="">Select currency…</option>
        <option value="swedish_krona">{CURRENCY_LABELS.swedish_krona}</option>
        <option value="danish_krona">{CURRENCY_LABELS.danish_krona}</option>
        <option value="euro">{CURRENCY_LABELS.euro}</option>
      </select>
    </div>
  );
}
