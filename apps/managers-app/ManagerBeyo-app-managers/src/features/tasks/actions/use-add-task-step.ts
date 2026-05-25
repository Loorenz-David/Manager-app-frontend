import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { addTaskStep } from '../api/add-task-step';

export type AddTaskStepVariables = {
  working_section_id: string;
  worker_id?: string;
  working_section_name_snapshot?: string | null;
  assigned_worker_display_name_snapshot?: string | null;
};

type AddTaskStepContext = {
  snapshot: TaskDetailRaw | undefined;
};

export function useAddTaskStep(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ working_section_name_snapshot: _sectionName, assigned_worker_display_name_snapshot: _workerName, ...input }: AddTaskStepVariables) =>
      addTaskStep({ ...input, task_id: taskId }),
    onMutate: async (input): Promise<AddTaskStepContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          task_steps: [
            ...old.task_steps,
            {
              client_id: crypto.randomUUID(),
              task_id: taskId,
              state: 'pending',
              readiness_status: 'ready',
              sequence_order: null,
              working_section_id: input.working_section_id,
              assigned_worker_id: input.worker_id ?? null,
              total_dependencies: 0,
              completed_dependencies: 0,
              working_section_name_snapshot: input.working_section_name_snapshot ?? null,
              assigned_worker_display_name_snapshot:
                input.assigned_worker_display_name_snapshot ?? null,
              created_at: new Date().toISOString(),
              closed_at: null,
              latest_state_records: null,
            },
          ],
        };
      });

      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(taskKeys.detail(taskId as never), context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
