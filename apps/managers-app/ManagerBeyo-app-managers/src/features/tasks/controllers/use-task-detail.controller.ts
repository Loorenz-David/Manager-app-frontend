import { useQueryClient } from "@tanstack/react-query";
import { itemUpholsteryKeys, taskFlowRecordKeys } from "@beyo/tasks";

import { useCreateItemUpholstery } from "@/features/items/actions/use-create-item-upholstery";
import { useSetUpholsteryQuantity } from "@/features/items/actions/use-set-upholstery-quantity";
import { useUpdateItemUpholstery } from "@/features/items/actions/use-update-item-upholstery";
import { useUpdateItem } from "@/features/items/actions/use-update-item";
import { useDeleteTask } from "@/features/tasks/actions/use-delete-task";
import { useResolveTask } from "@/features/tasks/actions/use-resolve-task";
import { useUpdateTask } from "@/features/tasks/actions/use-update-task";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useTaskDetailFlow } from "../flows/use-task-detail.flow";
import { getTaskTitle } from "../lib/task-detail";

export function useTaskDetailController(taskId: string) {
  const queryClient = useQueryClient();
  const taskQuery = useGetTaskQuery(taskId);

  const itemId = taskQuery.data?.item?.client_id ?? null;
  const flow = useTaskDetailFlow(taskId, itemId);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const resolveTask = useResolveTask();
  const updateItem = useUpdateItem(taskId);
  const createItemUpholstery = useCreateItemUpholstery(taskId, itemId);
  const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId, itemId);
  const updateItemUpholstery = useUpdateItemUpholstery(taskId, itemId);

  async function refetch(): Promise<void> {
    await Promise.all([
      taskQuery.refetch(),
      itemId
        ? queryClient.invalidateQueries({
            queryKey: itemUpholsteryKeys.byItem(itemId),
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({
        queryKey: taskFlowRecordKeys.byTask(taskId),
      }),
    ]);
  }

  return {
    taskId,
    taskDetail: taskQuery.data ?? null,
    title: taskQuery.data ? getTaskTitle(taskQuery.data.task) : "Task",
    isPending: taskQuery.isPending,
    isError: taskQuery.isError,
    refetch,
    updateTask,
    deleteTask,
    resolveTask,
    updateItem,
    createItemUpholstery,
    setUpholsteryQuantity,
    updateItemUpholstery,
    ...flow,
  };
}

export type TaskDetailController = ReturnType<typeof useTaskDetailController>;
