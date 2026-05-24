import { useMemo } from 'react';

import { useDeleteItemIssue } from '@/features/items/actions/use-delete-item-issue';
import { useIssueCategoryConfigsQuery } from '@/features/items/api/use-issue-category-configs';
import { useSetUpholsteryQuantity } from '@/features/items/actions/use-set-upholstery-quantity';
import { useUpdateItem } from '@/features/items/actions/use-update-item';
import { useDeleteTask } from '@/features/tasks/actions/use-delete-task';
import { useResolveTask } from '@/features/tasks/actions/use-resolve-task';
import { useUpdateTask } from '@/features/tasks/actions/use-update-task';

import { useGetTaskQuery } from '../api/use-get-task-query';
import { useTaskFlowRecordsQuery } from '../api/use-task-flow-records-query';
import { useTaskDetailFlow } from '../flows/use-task-detail.flow';
import { getTaskTitle } from '../lib/task-detail';

export function useTaskDetailController(taskId: string) {
  const taskQuery = useGetTaskQuery(taskId);
  const flowRecordsQuery = useTaskFlowRecordsQuery(taskId);

  const itemId = taskQuery.data?.item?.client_id ?? null;
  const itemCategoryId = taskQuery.data?.item?.item_category_id ?? undefined;
  const flow = useTaskDetailFlow(taskId, itemId);

  const issueCategoryConfigsQuery = useIssueCategoryConfigsQuery(
    { item_category_id: itemCategoryId },
    { enabled: !!itemCategoryId },
  );

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const resolveTask = useResolveTask();
  const updateItem = useUpdateItem(taskId);
  const deleteItemIssue = useDeleteItemIssue(taskId);
  const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId);

  const issueNameByTypeId = useMemo(() => {
    const configs = issueCategoryConfigsQuery.data?.issueConfigs ?? [];
    return new Map(configs.map((c) => [c.issue_type_id, c.issue_type_name]));
  }, [issueCategoryConfigsQuery.data]);

  const requirementsById = useMemo(() => {
    const entries = taskQuery.data?.requirements ?? [];
    return new Map<string, (typeof entries)[number]>(entries.map((entry) => [entry.client_id, entry]));
  }, [taskQuery.data?.requirements]);

  const activeUpholstery = useMemo(
    () =>
      (taskQuery.data?.item_upholstery ?? []).map((entry) => ({
        ...entry,
        activeRequirement: entry.active_requirement_id
          ? (requirementsById.get(entry.active_requirement_id) ?? null)
          : null,
      })),
    [requirementsById, taskQuery.data?.item_upholstery],
  );

  return {
    taskId,
    taskDetail: taskQuery.data ?? null,
    issueNameByTypeId,
    flowRecords: flowRecordsQuery.data?.flow_records ?? [],
    title: taskQuery.data ? getTaskTitle(taskQuery.data.task) : 'Task',
    isPending: taskQuery.isPending,
    isError: taskQuery.isError,
    isFlowPending: flowRecordsQuery.isPending,
    refetch: taskQuery.refetch,
    activeUpholstery,
    updateTask,
    deleteTask,
    resolveTask,
    updateItem,
    deleteItemIssue,
    setUpholsteryQuantity,
    ...flow,
  };
}

export type TaskDetailController = ReturnType<typeof useTaskDetailController>;
