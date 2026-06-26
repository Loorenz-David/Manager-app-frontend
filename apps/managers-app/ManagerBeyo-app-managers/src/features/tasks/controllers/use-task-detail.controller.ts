import { useQueryClient } from "@tanstack/react-query";
import { ITEM_POSITION_SHEET_SURFACE_ID } from "@beyo/items";
import {
  getTaskTitle,
  itemUpholsteryKeys,
  taskFlowRecordKeys,
} from "@beyo/tasks";

import { useCreateItemUpholstery } from "@/features/items/actions/use-create-item-upholstery";
import { useSetUpholsteryQuantity } from "@/features/items/actions/use-set-upholstery-quantity";
import { useUpdateItemUpholstery } from "@/features/items/actions/use-update-item-upholstery";
import { useUpdateItem } from "@/features/items/actions/use-update-item";
import { useUpdateItemPosition } from "@/features/items/actions/use-update-item-position";
import { useDeleteTask } from "@/features/tasks/actions/use-delete-task";
import { useResolveTask } from "@/features/tasks/actions/use-resolve-task";
import { useUpdateTask } from "@/features/tasks/actions/use-update-task";
import { useSurface } from "@/hooks/use-surface";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import { useGetTaskQuery } from "@beyo/tasks";
import { useTaskDetailFlow } from "../flows/use-task-detail.flow";

export function useTaskDetailController(taskId: string) {
  const queryClient = useQueryClient();
  const taskQuery = useGetTaskQuery(taskId);
  const surface = useSurface();

  const itemId = taskQuery.data?.item?.client_id ?? null;
  const flow = useTaskDetailFlow(taskId, itemId);

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const resolveTask = useResolveTask();
  const updateItem = useUpdateItem(taskId);
  const updateItemPosition = useUpdateItemPosition(taskId);
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

  function openPositionSheet() {
    if (!itemId) {
      return;
    }

    function savePosition(position: string | null) {
      updateItemPosition.mutate(
        {
          id: itemId as never,
          item_position: position,
        },
        {
          onError: () => {
            useSurfaceStore.getState().open(ITEM_POSITION_SHEET_SURFACE_ID, {
              itemId,
              initialPosition: position,
              onSave: savePosition,
            });
          },
        },
      );
    }

    surface.open(ITEM_POSITION_SHEET_SURFACE_ID, {
      itemId,
      initialPosition: taskQuery.data?.item?.item_position ?? null,
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
    setUpholsteryQuantity,
    updateItemUpholstery,
    ...flow,
    openPositionSheet,
  };
}

export type TaskDetailController = ReturnType<typeof useTaskDetailController>;
