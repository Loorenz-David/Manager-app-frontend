import { useFormContext } from "react-hook-form";

import { FieldErrorPill, TextArea } from "@beyo/ui";

export function TaskAdditionalDetailsField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-additional-details-field">
      <div className="flex items-center justify-between gap-3">
        <label
          className="text-sm font-medium text-muted-foreground"
          htmlFor="task-additional-details"
        >
          Additional details
        </label>
        <FieldErrorPill
          data-testid="task-additional-details-error"
          message={errors.additional_details?.message as string | undefined}
        />
      </div>
      <TextArea
        {...register("additional_details")}
        id="task-additional-details"
        data-testid="task-additional-details-input"
        placeholder="Add any extra context for the task"
        rows={4}
        invalid={Boolean(errors.additional_details)}
      />
    </div>
  );
}
