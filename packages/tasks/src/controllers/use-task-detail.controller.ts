import { useQueryClient } from "@tanstack/react-query";

import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
import { useSurfaceStore } from "@beyo/ui";

import { useCreateItemUpholstery } from "../actions/use-create-item-upholstery";
import { useDeleteTask } from "../actions/use-delete-task";
import { useResolveTask } from "../actions/use-resolve-task";
import { useUpdateItem } from "../actions/use-update-item";
import { useUpdateItemPosition } from "../actions/use-update-item-position";
import { useUpdateItemUpholstery } from "../actions/use-update-item-upholstery";
import { useUpdateTask } from "../actions/use-update-task";
import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { taskFlowRecordKeys } from "../api/task-flow-record-keys";
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
  const updateItemPosition = useUpdateItemPosition(taskId);
  const createItemUpholstery = useCreateItemUpholstery(taskId, itemId);
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

  function openPositionSheet(field: "zone" | "position" = "position") {
    if (!itemId) {
      return;
    }

    function savePosition(values: {
      item_position: string | null;
      item_zone?: string | null;
    }) {
      updateItemPosition.mutate(
        {
          id: itemId as string,
          item_position: values.item_position,
          item_zone: values.item_zone,
        },
        {
          onError: () => {
            useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
              itemId,
              initialPosition: values.item_position,
              initialZone:
                values.item_zone ?? taskQuery.data?.item?.item_zone ?? null,
              openField: field,
              onSave: savePosition,
            });
          },
        },
      );
    }

    useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
      itemId,
      initialPosition: taskQuery.data?.item?.item_position ?? null,
      initialZone: taskQuery.data?.item?.item_zone ?? null,
      openField: field,
      onSave: savePosition,
    });
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
    updateItemPosition,
    createItemUpholstery,
    updateItemUpholstery,
    ...flow,
    openPositionSheet,
  };
}

export type TaskDetailController = ReturnType<typeof useTaskDetailController>;
