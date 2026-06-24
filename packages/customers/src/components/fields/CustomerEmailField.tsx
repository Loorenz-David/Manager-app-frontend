import { useFormContext } from "react-hook-form";

import { FieldErrorPill, FieldLabelRow, TextInput } from "@beyo/ui";

export function CustomerEmailField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.primary_email?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabelRow htmlFor="customer-primary-email" label="Email">
        <FieldErrorPill data-testid="customer-email-error" message={error} />
      </FieldLabelRow>
      <TextInput
        data-testid="customer-email-input"
        id="customer-primary-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="email@example.com"
        invalid={Boolean(error)}
        {...register("customer.primary_email")}
      />
    </div>
  );
}
