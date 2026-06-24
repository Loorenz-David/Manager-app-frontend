import { useFormContext } from "react-hook-form";

import { FieldErrorPill, TextInput } from "@beyo/ui";

export function CustomerDisplayNameField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = (
    errors as { customer?: Record<string, { message?: string }> }
  ).customer?.display_name?.message;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="customer-display-name"
          className="text-sm font-medium text-muted-foreground"
        >
          Name
        </label>
        <FieldErrorPill
          data-testid="customer-display-name-error"
          message={error}
        />
      </div>
      <TextInput
        data-testid="customer-display-name-input"
        id="customer-display-name"
        type="text"
        autoComplete="name"
        placeholder="Customer name"
        invalid={Boolean(error)}
        {...register("customer.display_name")}
      />
    </div>
  );
}
