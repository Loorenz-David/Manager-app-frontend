import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  preloadCalendarRangePickerSurface,
  preloadCalendarSinglePickerSurface,
} from '@beyo/task-creation';
import {
  formatLocalDateISO,
  TaskDeliveryDateField,
  TaskReadyByDateField,
} from '@beyo/tasks';
import { useUpdateTask } from '@/features/tasks/actions/use-update-task';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { TASK_SCHEDULED_DATE_SHEET_SURFACE_ID } from '@/features/tasks/surfaces';
import type { TaskScheduledDateSurfaceProps } from '@/features/tasks/surfaces';
import { usePreloadSurface } from '@/hooks/use-preload-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

type ScheduleForm = {
  ready_by_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
};

export function TaskScheduledDateSheetPage(): React.JSX.Element {
  usePreloadSurface(preloadCalendarSinglePickerSurface);
  usePreloadSurface(preloadCalendarRangePickerSurface);

  const header = useSurfaceHeader();
  const { taskId, prefill } = useSurfaceProps<TaskScheduledDateSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? '');
  const updateTask = useUpdateTask();
  const task = taskQuery.data?.task;

  const form = useForm<ScheduleForm>({
    defaultValues: prefill ?? {
      ready_by_at: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
    },
  });

  const hasResetRef = useRef(false);

  useEffect(() => {
    header?.setTitle('Schedule dates');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (taskQuery.isPending || hasResetRef.current || prefill) return;
    hasResetRef.current = true;
    form.reset({
      ready_by_at: formatLocalDateISO(task?.ready_by_at ?? null),
      scheduled_start_at: formatLocalDateISO(task?.scheduled_start_at ?? null),
      scheduled_end_at: formatLocalDateISO(task?.scheduled_end_at ?? null),
    });
  }, [form, prefill, task, taskQuery.isPending]);

  function handleSave(values: ScheduleForm) {
    if (!task) return;
    header?.requestClose();
    updateTask.mutate(
      {
        id: (taskId ?? '') as never,
        title: task.title ?? null,
        summary: task.summary ?? null,
        priority: task.priority,
        ready_by_at: values.ready_by_at as never,
        scheduled_start_at: values.scheduled_start_at as never,
        scheduled_end_at: values.scheduled_end_at as never,
        return_method: task.return_method ?? undefined,
        fulfillment_method: task.fulfillment_method ?? undefined,
        return_source: task.return_source ?? undefined,
        item_location: task.item_location ?? undefined,
        customer_id: task.customer_id ?? undefined,
        primary_phone_number: task.primary_phone_number ?? undefined,
        secondary_phone_number: task.secondary_phone_number ?? undefined,
        primary_email: task.primary_email ?? undefined,
        secondary_email: task.secondary_email ?? undefined,
        address: task.address ?? null,
        additional_details: task.additional_details ?? null,
      },
      {
        onError: () => {
          useSurfaceStore.getState().open(TASK_SCHEDULED_DATE_SHEET_SURFACE_ID, {
            taskId: taskId ?? '',
            prefill: values,
          });
        },
      },
    );
  }

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6">
        <TaskReadyByDateField />
        <TaskDeliveryDateField />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={updateTask.isPending}
          onClick={() => void form.handleSubmit(handleSave)()}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
