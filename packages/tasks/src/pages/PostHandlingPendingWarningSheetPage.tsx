import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useUpdatePostHandling } from "../actions/use-update-post-handling";
import { useGetTaskQuery } from "../api/use-get-task-query";
import { TaskAssortmentField } from "../components/fields/TaskAssortmentField";
import { TaskDeliveryDateField } from "../components/fields/TaskDeliveryDateField";
import { TaskFulfillmentMethodField } from "../components/fields/TaskFulfillmentMethodField";
import { getPostHandlingMissingRequirements } from "../lib/post-handling-requirements";
import type { TaskPostHandlingPendingWarningSheetSurfaceProps } from "../surface-ids";
import type { TaskFulfillmentMethod } from "../types";

const FIELD_WARNING_CLASS = "rounded-xl p-3";

type PendingRevisionFormValues = {
  fulfillment_method: TaskFulfillmentMethod | null | undefined;
  scheduled_start_at: string | null | undefined;
  scheduled_end_at: string | null | undefined;
  assortment: string | undefined;
};

export function PostHandlingPendingWarningSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, onOpenCalendarRangePicker } =
    useSurfaceProps<TaskPostHandlingPendingWarningSheetSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updatePostHandling = useUpdatePostHandling();
  const task = taskQuery.data?.task ?? null;
  const hasInitializedRef = useRef(false);

  const form = useForm<PendingRevisionFormValues>({
    defaultValues: {
      fulfillment_method: undefined,
      scheduled_start_at: null,
      scheduled_end_at: null,
      assortment: "",
    },
  });

  useEffect(() => {
    if (!task || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    form.reset({
      fulfillment_method: task.fulfillment_method ?? undefined,
      scheduled_start_at: task.scheduled_start_at ?? null,
      scheduled_end_at: task.scheduled_end_at ?? null,
      assortment: task.assortment ?? "",
    });
  }, [task, form]);

  const missingKeys = new Set(
    task
      ? getPostHandlingMissingRequirements(task).map(
          (requirement) => requirement.key,
        )
      : [],
  );
  const showFulfillmentAndDelivery = task?.task_type === "pre_order";
  const showAssortment = task?.task_type === "return";

  function handleSave(): void {
    if (!taskId || !task) {
      return;
    }

    const values = form.getValues();
    updatePostHandling.mutate({
      taskId,
      ...(showFulfillmentAndDelivery
        ? {
            fulfillment_method: values.fulfillment_method ?? null,
            scheduled_start_at: values.scheduled_start_at ?? null,
            scheduled_end_at: values.scheduled_end_at ?? null,
          }
        : {}),
      ...(showAssortment
        ? { assortment: values.assortment?.trim() || null }
        : {}),
    });
    header?.requestClose();
  }

  if (taskQuery.isPending) {
    return (
      <div
        className="p-4 text-sm text-muted-foreground"
        data-testid="post-handling-pending-revision-sheet-page"
      >
        Loading...
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div
        className="flex flex-col gap-4  pb-4"
        data-testid="post-handling-pending-revision-sheet-page"
      >
        <div className="px-4">
          <h2 className="text-lg font-semibold text-foreground">
            Pending revision
          </h2>
          <p className="text-sm text-muted-foreground">
            Fill in the required fields to move this task to filled.
          </p>
        </div>

        {showFulfillmentAndDelivery || showAssortment ? (
          <div className="rounded-xl bg-card p-3 shadow-sm">
            <div className="flex flex-col gap-4">
              {showFulfillmentAndDelivery ? (
                <>
                  <div
                    className={
                      missingKeys.has("fulfillment_method")
                        ? FIELD_WARNING_CLASS
                        : undefined
                    }
                  >
                    <TaskFulfillmentMethodField />
                  </div>
                  <div
                    className={
                      missingKeys.has("schedule")
                        ? FIELD_WARNING_CLASS
                        : undefined
                    }
                  >
                    <TaskDeliveryDateField
                      onOpenCalendarRangePicker={onOpenCalendarRangePicker}
                    />
                  </div>
                </>
              ) : null}

              {showAssortment ? (
                <div
                  className={
                    missingKeys.has("assortment")
                      ? FIELD_WARNING_CLASS
                      : undefined
                  }
                >
                  <TaskAssortmentField />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="px-4">
          <button
            className="w-full mt-4 rounded-2xl bg-primary py-3.5 text-card text-md font-semibold disabled:opacity-50"
            data-testid="post-handling-revision-save-button"
            disabled={!task || updatePostHandling.isPending}
            type="button"
            onClick={handleSave}
          >
            {updatePostHandling.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </FormProvider>
  );
}
