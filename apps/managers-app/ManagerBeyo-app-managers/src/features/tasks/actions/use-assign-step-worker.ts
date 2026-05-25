import { useMutation, useQueryClient } from '@tanstack/react-query';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';

import { assignStepWorker } from '../api/assign-step-worker';

export type AssignStepWorkerVariables = {
  step_id: string;
  worker_id: string;
  assigned_worker_display_name_snapshot?: string | null;
};

type AssignStepWorkerContext = {
  snapshot: TaskDetailRaw | undefined;
};

export function useAssignStepWorker(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assigned_worker_display_name_snapshot: _workerName, ...input }: AssignStepWorkerVariables) =>
      assignStepWorker({ ...input, task_id: taskId }),
    onMutate: async (input): Promise<AssignStepWorkerContext> => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId as never) });
      const snapshot = queryClient.getQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never));

      queryClient.setQueryData<TaskDetailRaw>(taskKeys.detail(taskId as never), (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          task_steps: old.task_steps.map((step) =>
            step.client_id === input.step_id
              ? {
                  ...step,
                  assigned_worker_id: input.worker_id,
                  assigned_worker_display_name_snapshot:
                    input.assigned_worker_display_name_snapshot ?? null,
                }
              : step,
          ),
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
    },
  });
}
