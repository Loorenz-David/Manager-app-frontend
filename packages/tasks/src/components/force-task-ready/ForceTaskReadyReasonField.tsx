import { useFormContext } from "react-hook-form";

import { FieldErrorPill, TextArea } from "@beyo/ui";

import type { ForceTaskReadyFormValues } from "./force-task-ready-form";

export function ForceTaskReadyReasonField(): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext<ForceTaskReadyFormValues>();

  return (
    <div className="flex flex-col gap-1.5" data-testid="force-task-ready-reason-field">
      <label
        className="text-sm font-medium text-muted-foreground"
        htmlFor="force-task-ready-reason"
      >
        Reason
      </label>
      <TextArea
        {...register("reason")}
        id="force-task-ready-reason"
        data-testid="force-task-ready-reason-input"
        invalid={Boolean(errors.reason)}
        placeholder="Why is this task being forced ready?"
        rows={4}
      />
      <FieldErrorPill
        data-testid="force-task-ready-reason-error"
        message={errors.reason?.message}
      />
    </div>
  );
}
