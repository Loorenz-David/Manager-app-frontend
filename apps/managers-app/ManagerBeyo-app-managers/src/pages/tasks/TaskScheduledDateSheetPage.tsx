import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { useUpdateTask } from '@/features/tasks/actions/use-update-task';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { TaskDeliveryDateField, TaskReadyByDateField } from '@/features/tasks';
import type { TaskScheduledDateSurfaceProps } from '@/features/tasks/surfaces';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

type ScheduleForm = {
  ready_by_at: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
};

export function TaskScheduledDateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { taskId } = useSurfaceProps<TaskScheduledDateSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? '');
  const updateTask = useUpdateTask();
  const task = taskQuery.data?.task;

  const form = useForm<ScheduleForm>({
    defaultValues: {
      ready_by_at: task?.ready_by_at ?? null,
      scheduled_start_at: task?.scheduled_start_at ?? null,
      scheduled_end_at: task?.scheduled_end_at ?? null,
    },
  });

  const hasResetRef = useRef(false);

  useEffect(() => {
    header?.setTitle('Schedule dates');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (taskQuery.isPending || hasResetRef.current) return;
    hasResetRef.current = true;
    form.reset({
      ready_by_at: task?.ready_by_at ?? null,
      scheduled_start_at: task?.scheduled_start_at ?? null,
      scheduled_end_at: task?.scheduled_end_at ?? null,
    });
  }, [form, task, taskQuery.isPending]);

  function handleSave(values: ScheduleForm) {
    if (!task) return;
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
        onSuccess: () => surface.closeTop(),
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
