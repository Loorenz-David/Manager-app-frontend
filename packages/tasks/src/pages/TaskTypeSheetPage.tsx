import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

import { useUpdateTask } from "../actions/use-update-task";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { TaskReturnSourceField } from "../components/fields/TaskReturnSourceField";
import { TASK_TYPE_ICON, TASK_TYPE_LABEL } from "../lib/task-detail";
import type { TaskReturnSource, TaskType } from "../types";
import type { TaskTypeSheetSurfaceProps } from "../surface-ids";

type TaskTypeFormValues = {
  task_type: TaskType;
  return_source: TaskReturnSource | null;
};

const TASK_TYPE_ORDER: TaskType[] = ["internal", "pre_order", "return"];

const TASK_TYPE_OPTIONS: BoxPickerOptionType<TaskType>[] = TASK_TYPE_ORDER.map(
  (type) => ({
    value: type,
    label: TASK_TYPE_LABEL[type],
    icon: TASK_TYPE_ICON[type],
    testId: `task-type-${type}-option`,
  }),
);

export function TaskTypeSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskTypeSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateTask = useUpdateTask();
  const task = taskQuery.data?.task ?? null;

  const form = useForm<TaskTypeFormValues>({
    defaultValues: { task_type: "internal", return_source: null },
  });

  useEffect(() => {
    header?.setTitle("Task type");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!task) return;
    form.reset({
      task_type: task.task_type,
      return_source: task.return_source,
    });
    // Seed the form from the task once it loads; keyed on the task identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.client_id]);

  const selectedType = useWatch({ control: form.control, name: "task_type" });
  const returnSource = useWatch({
    control: form.control,
    name: "return_source",
  });
  const isReturn = selectedType === "return";

  function handleTypeChange(value: TaskType) {
    form.setValue("task_type", value, { shouldDirty: true });
    if (value !== "return") {
      form.setValue("return_source", null, { shouldDirty: true });
    }
  }

  function handleSubmit(values: TaskTypeFormValues) {
    if (!taskId) return;

    header?.requestClose();
    updateTask.mutate({
      id: taskId,
      task_type: values.task_type,
      // Reset the return source in the backend whenever the task is no longer
      // a return (null lands in model_fields_set → column set to NULL).
      return_source:
        values.task_type === "return" ? (values.return_source ?? null) : null,
    });
  }

  const saveDisabled =
    updateTask.isPending || !task || (isReturn && !returnSource);

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-10 p-6"
        data-testid="task-type-sheet-page"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Task type
            </label>
            <BoxPicker
              mode="single"
              value={selectedType ?? null}
              options={TASK_TYPE_OPTIONS}
              onValueChange={handleTypeChange}
              layout="grid"
              visualVariant="default"
              columns={3}
              showIcon
              data-testid="task-type-picker"
            />
          </div>
          {isReturn ? <TaskReturnSourceField /> : null}
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
          data-testid="task-type-save-button"
          disabled={saveDisabled}
        >
          Save
        </button>
      </form>
    </FormProvider>
  );
}
