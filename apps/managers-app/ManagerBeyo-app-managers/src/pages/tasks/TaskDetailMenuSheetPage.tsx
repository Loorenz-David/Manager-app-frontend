import { useEffect } from 'react';

import { ConfirmActionButton } from '@/components/primitives';
import { useDeleteTask } from '@/features/tasks/actions/use-delete-task';
import { useResolveTask } from '@/features/tasks/actions/use-resolve-task';
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  type TaskActionsSurfaceProps,
} from '@/features/tasks/surfaces';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

export function TaskDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { taskId } = useSurfaceProps<TaskActionsSurfaceProps>();
  const deleteTask = useDeleteTask();
  const resolveTask = useResolveTask();

  useEffect(() => {
    header?.setTitle('Task actions');
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-3 p-6">
      <ConfirmActionButton
        className="w-full"
        confirmLabel="Tap again to resolve"
        label="Resolve task"
        onConfirm={() => {
          if (!taskId) return;
          resolveTask.mutate(taskId, {
            onSuccess: () => {
              surface.close(TASK_ACTIONS_SHEET_SURFACE_ID);
            },
          });
        }}
      />
      <ConfirmActionButton
        className="w-full"
        confirmLabel="Tap again to delete"
        fillColor="var(--color-destructive)"
        label="Delete task"
        onConfirm={() => {
          if (!taskId) return;
          deleteTask.mutate(taskId, {
            onSuccess: () => {
              surface.close(TASK_ACTIONS_SHEET_SURFACE_ID);
              surface.close(TASK_DETAIL_SURFACE_ID);
            },
          });
        }}
      />
    </div>
  );
}
