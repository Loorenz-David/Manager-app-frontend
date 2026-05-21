import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { ManagedPhoneInput } from '@/features/phone-input';

export function CustomerPhoneField() {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { field } = useController({
    name: 'customer.primary_phone_number',
    control,
  });
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.primary_phone_number?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="customer-primary-phone"
          className="text-sm font-medium text-muted-foreground"
        >
          Phone <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <FieldErrorPill data-testid="customer-phone-error" message={error} />
      </div>
      <ManagedPhoneInput
        autoComplete="tel-national"
        id="customer-primary-phone"
        inputTestId="customer-phone-input"
        invalid={Boolean(error)}
        placeholder="073 726 21 36"
        selectorTestId="customer-phone-country-selector"
        value={field.value ?? ''}
        onValueChange={(nextValue) => field.onChange(nextValue)}
      />
    </div>
  );
}
