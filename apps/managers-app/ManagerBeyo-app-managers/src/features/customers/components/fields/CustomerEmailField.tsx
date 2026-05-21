import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function CustomerEmailField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.primary_email?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="customer-primary-email"
          className="text-sm font-medium text-foreground"
        >
          Email <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="customer-email-error" message={error} />
      </div>
      <TextInput
        data-testid="customer-email-input"
        id="customer-primary-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="email@example.com"
        invalid={Boolean(error)}
        {...register('customer.primary_email')}
      />
    </div>
  );
}
