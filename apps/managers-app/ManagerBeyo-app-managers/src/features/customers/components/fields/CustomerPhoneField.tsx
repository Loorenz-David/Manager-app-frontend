import { useFormContext } from 'react-hook-form';

import { FieldErrorPill, TextInput } from '@/components/primitives';

export function CustomerPhoneField() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.primary_phone_number?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="customer-primary-phone"
          className="text-sm font-medium text-foreground"
        >
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="customer-phone-error" message={error} />
      </div>
      <TextInput
        data-testid="customer-phone-input"
        id="customer-primary-phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+1 555 000 0000"
        invalid={Boolean(error)}
        {...register('customer.primary_phone_number')}
      />
    </div>
  );
}
