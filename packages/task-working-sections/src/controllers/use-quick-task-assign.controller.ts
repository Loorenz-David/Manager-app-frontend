import { useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { addTaskStep, type TaskListItemRaw, type TaskType } from "@beyo/tasks";

import { quickTaskKeys } from "../api/quick-task-keys";
import { useQuickTaskListQuery } from "../api/use-quick-task-list-query";
import { useTaskCountsQuery } from "../api/use-task-counts-query";
import type {
  QuickTaskAssignSurfaceOpeners,
  RecoveredPendingAdd,
} from "../surface-ids";

const QUICK_TASK_STATES = "pending";
const QUICK_TASK_LIMIT = 50;

type UseQuickTaskAssignControllerArgs = {
  taskType: TaskType;
  surfaceOpeners?: QuickTaskAssignSurfaceOpeners;
};

function getTaskTypeLabel(taskType: TaskType): string {
  switch (taskType) {
    case "pre_order":
      return "Pre-orders";
    case "return":
      return "Returns";
    default:
      return "Tasks";
  }
}

export function useQuickTaskAssignController({
  taskType,
  surfaceOpeners,
}: UseQuickTaskAssignControllerArgs) {
  const queryClient = useQueryClient();
  const listQuery = useQuickTaskListQuery({
    taskType,
    taskStates: QUICK_TASK_STATES,
    limit: QUICK_TASK_LIMIT,
  });
  const countsQuery = useTaskCountsQuery({
    taskType,
    taskStates: QUICK_TASK_STATES,
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [optimisticallyRemovedTaskIds, setOptimisticallyRemovedTaskIds] =
    useState<string[]>([]);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const allTasks = listQuery.data?.items ?? [];
  const removedTaskIdSet = useMemo(
    () => new Set(optimisticallyRemovedTaskIds),
    [optimisticallyRemovedTaskIds],
  );
  const tasks = useMemo(
    () =>
      allTasks.filter((task) => !removedTaskIdSet.has(task.task.client_id)),
    [allTasks, removedTaskIdSet],
  );
  const selectedTask = useMemo<TaskListItemRaw | null>(
    () =>
      allTasks.find((task) => task.task.client_id === selectedTaskIds[0]) ??
      null,
    [allTasks, selectedTaskIds],
  );

  function handleToggleTask(taskId: string): void {
    if (savingTaskId) {
      return;
    }

    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((candidate) => candidate !== taskId)
        : [...current, taskId],
    );
  }

  function clearSelection(): void {
    setSelectedTaskIds([]);
  }

  function handleSaveStarted(taskId: string): void {
    setSavingTaskId(taskId);
    setOptimisticallyRemovedTaskIds((current) =>
      current.includes(taskId) ? current : [...current, taskId],
    );
  }

  function handleSaveFailed(taskId: string): void {
    setSavingTaskId((current) => (current === taskId ? null : current));
    setOptimisticallyRemovedTaskIds((current) =>
      current.filter((candidate) => candidate !== taskId),
    );
  }

  function handleSaveCompleted(
    taskId: string,
    appliedAdds: RecoveredPendingAdd[],
  ): number {
    const remainingTaskIds = selectedTaskIds.filter((id) => id !== taskId);
    const savedTaskIds =
      appliedAdds.length > 0 ? [taskId, ...remainingTaskIds] : [taskId];

    setSavingTaskId((current) => (current === taskId ? null : current));
    setSelectedTaskIds((current) =>
      current.filter((candidate) => !savedTaskIds.includes(candidate)),
    );
    setOptimisticallyRemovedTaskIds((current) => [
      ...current,
      ...savedTaskIds.filter((id) => !current.includes(id)),
    ]);

    if (remainingTaskIds.length > 0 && appliedAdds.length > 0) {
      void Promise.allSettled(
        remainingTaskIds.map((id) =>
          addTaskStep({
            task_id: id,
            steps: appliedAdds.map((pendingAdd) => ({
              working_section_id: pendingAdd.working_section_id,
              worker_id: pendingAdd.worker_id ?? undefined,
            })),
          }),
        ),
      ).then(() => {
        setOptimisticallyRemovedTaskIds((current) =>
          current.filter((id) => !remainingTaskIds.includes(id)),
        );
        void queryClient.invalidateQueries({ queryKey: quickTaskKeys.all });
      });
    } else {
      void Promise.all([listQuery.refetch(), countsQuery.refetch()]);
    }

    return tasks.filter(
      (task) =>
        !savedTaskIds.includes(task.task.client_id),
    ).length;
  }

  async function refetch(): Promise<void> {
    await Promise.all([listQuery.refetch(), countsQuery.refetch()]);
  }

  return {
    taskType,
    taskTypeLabel: getTaskTypeLabel(taskType),
    taskStates: QUICK_TASK_STATES,
    taskLimit: QUICK_TASK_LIMIT,
    taskCount: countsQuery.data?.total ?? tasks.length,
    tasks,
    selectedTaskIds,
    selectedTask,
    savingTaskId,
    isInitialLoading: listQuery.isPending,
    isRefreshing: listQuery.isFetching || countsQuery.isFetching,
    isError: listQuery.isError,
    countsError: countsQuery.isError,
    handleToggleTask,
    clearSelection,
    handleSaveStarted,
    handleSaveFailed,
    handleSaveCompleted,
    refetch,
    closeSurface: surfaceOpeners?.closeSurface,
    openTaskDetail: surfaceOpeners?.openTaskDetail,
    openTaskActions: surfaceOpeners?.openTaskActions,
    openImageViewer: surfaceOpeners?.openImageViewer,
  };
}

export type QuickTaskAssignController = ReturnType<
  typeof useQuickTaskAssignController
>;
