import { useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { cn } from '@/lib/utils';

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  person: 'Person',
  company: 'Company',
  unknown: 'Unknown',
};

export function CustomerTypeField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.customer_type?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="customer-type" className="text-sm font-medium text-muted-foreground">
          Type
        </label>
        <FieldErrorPill data-testid="customer-type-error" message={error} />
      </div>
      <select
        data-testid="customer-type-input"
        id="customer-type"
        aria-invalid={Boolean(error)}
        className={cn(
          'h-12 w-full rounded-lg border bg-transparent px-3 text-base text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          error
            ? 'border-destructive/45 bg-destructive/[0.06] ring-1 ring-destructive/20'
            : 'border-border',
        )}
        {...register('customer.customer_type')}
      >
        <option value="">Select type…</option>
        <option value="person">{CUSTOMER_TYPE_LABELS.person}</option>
        <option value="company">{CUSTOMER_TYPE_LABELS.company}</option>
        <option value="unknown">{CUSTOMER_TYPE_LABELS.unknown}</option>
      </select>
    </div>
  );
}
