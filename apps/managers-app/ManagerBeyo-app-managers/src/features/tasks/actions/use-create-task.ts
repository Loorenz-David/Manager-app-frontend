import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";

import type { ImageViewModel } from "@beyo/images";
import { upholsteryInventoryKeys, upholsteryKeys } from "@/features/upholstery/api/upholstery-keys";
import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryOrderingKeys } from "@/features/upholstery-ordering/api/upholstery-ordering-keys";

import { createTask } from "../api/create-task";
import type { ListTasksResult, TaskListItemRaw } from "@beyo/tasks";
import { taskKeys } from "../api/task-keys";
import { useItemsStore } from "../store/items.store";
import { useTaskListImagesStore } from "../store/task-list-images.store";
import { useTasksStore } from "../store/tasks.store";

type TaskListInfiniteData = InfiniteData<ListTasksResult, number>;

type CreateTaskContext = {
  listQueriesSnapshot: [QueryKey, TaskListInfiniteData | undefined][];
  taskClientId: string;
  itemClientId: string | null;
};

function buildOptimisticListItem(
  payload: Record<string, unknown>,
): TaskListItemRaw {
  const itemPayload = payload.item as Record<string, unknown> | undefined;
  const now = new Date().toISOString();

  return {
    task: {
      client_id: payload.client_id as string,
      task_scalar_id: 0,
      task_type:
        (payload.task_type as TaskListItemRaw["task"]["task_type"]) ?? "return",
      priority:
        (payload.priority as TaskListItemRaw["task"]["priority"]) ?? "normal",
      state: "pending",
      title: null,
      summary: null,
      return_source:
        (payload.return_source as TaskListItemRaw["task"]["return_source"]) ??
        null,
      item_location:
        (payload.item_location as TaskListItemRaw["task"]["item_location"]) ??
        null,
      return_method:
        (payload.return_method as TaskListItemRaw["task"]["return_method"]) ??
        null,
      fulfillment_method:
        (payload.fulfillment_method as TaskListItemRaw["task"]["fulfillment_method"]) ??
        null,
      additional_details:
        (payload.additional_details as Record<string, unknown> | null) ?? null,
      ready_by_at: (payload.ready_by_at as string | null) ?? null,
      scheduled_start_at: (payload.scheduled_start_at as string | null) ?? null,
      scheduled_end_at: (payload.scheduled_end_at as string | null) ?? null,
      customer_id: null,
      primary_phone_number:
        (payload.primary_phone_number as string | null) ?? null,
      secondary_phone_number: null,
      primary_email: (payload.primary_email as string | null) ?? null,
      secondary_email: null,
      address:
        (payload.customer_address as Record<string, unknown> | null) ?? null,
      created_at: now,
      updated_at: null,
      closed_at: null,
      is_deleted: false,
      deleted_at: null,
    },
    primary_item: itemPayload
      ? {
          client_id: itemPayload.client_id as string,
          article_number: (itemPayload.article_number as string | null) ?? null,
          sku: (itemPayload.sku as string | null) ?? null,
          state: "pending",
          item_category_id:
            (itemPayload.item_category_id as string | null) ?? null,
          quantity: (itemPayload.quantity as number | null) ?? 1,
          designer: (itemPayload.designer as string | null) ?? null,
          height_in_cm: null,
          width_in_cm: null,
          depth_in_cm: null,
          item_value_minor: null,
          item_cost_minor: null,
          item_currency: (itemPayload.item_currency as string | null) ?? null,
          item_position: (itemPayload.item_position as string | null) ?? null,
          external_id: null,
          external_url: null,
          external_source: null,
          external_order_id: null,
          item_category_snapshot: null,
          item_major_category_snapshot: null,
        }
      : null,
    item_images: [],
  };
}

function prependOptimisticTask(
  current: TaskListInfiniteData | undefined,
  optimisticItem: TaskListItemRaw,
): TaskListInfiniteData | undefined {
  if (!current || current.pages.length === 0) {
    return current;
  }

  const [firstPage, ...restPages] = current.pages;
  const withoutExisting = firstPage.items.filter(
    (item) => item.task.client_id !== optimisticItem.task.client_id,
  );

  return {
    ...current,
    pages: [
      { ...firstPage, items: [optimisticItem, ...withoutExisting] },
      ...restPages,
    ],
  };
}

function patchCreatedTask(
  current: TaskListInfiniteData | undefined,
  taskClientId: string,
  taskScalarId: number,
): TaskListInfiniteData | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.task.client_id === taskClientId
          ? {
              ...item,
              task: { ...item.task, task_scalar_id: taskScalarId },
            }
          : item,
      ),
    })),
  };
}

function getOptimisticItemImages(
  itemClientId: string | null,
): ImageViewModel[] {
  if (!itemClientId) {
    return [];
  }

  const images =
    useTaskListImagesStore.getState().imagesByItemId[itemClientId] ?? [];

  return images
    .filter((image) => !image.isDeleted)
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onMutate: async (payload): Promise<CreateTaskContext> => {
      const taskClientId = payload.client_id as string;
      const itemClientId =
        ((payload.item as Record<string, unknown> | undefined)?.client_id as
          | string
          | undefined) ?? null;

      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      const listQueriesSnapshot =
        queryClient.getQueriesData<TaskListInfiniteData>({
          queryKey: taskKeys.lists(),
        });

      const optimisticItem = buildOptimisticListItem(payload);

      queryClient.setQueriesData<TaskListInfiniteData>(
        { queryKey: taskKeys.lists() },
        (old) => prependOptimisticTask(old, optimisticItem),
      );

      const { setOne: setTask, setTaskItemRelation } = useTasksStore.getState();
      const { setOne: setItem } = useItemsStore.getState();
      const { setForItem } = useTaskListImagesStore.getState();

      setTask(optimisticItem.task);

      if (optimisticItem.primary_item) {
        setItem(optimisticItem.primary_item);
        setTaskItemRelation(
          taskClientId,
          optimisticItem.primary_item.client_id,
        );
        setForItem(
          optimisticItem.primary_item.client_id,
          getOptimisticItemImages(itemClientId),
        );
      }

      return { listQueriesSnapshot, taskClientId, itemClientId };
    },
    onSuccess: (data) => {
      useTasksStore
        .getState()
        .patch(data.client_id, { task_scalar_id: data.task_scalar_id });

      queryClient.setQueriesData<TaskListInfiniteData>(
        { queryKey: taskKeys.lists() },
        (old) => patchCreatedTask(old, data.client_id, data.task_scalar_id),
      );
    },
    onError: (_error, _payload, context) => {
      if (!context) {
        return;
      }

      for (const [key, data] of context.listQueriesSnapshot) {
        queryClient.setQueryData(key, data);
      }

      const tasksStore = useTasksStore.getState();
      tasksStore.remove(context.taskClientId);
      tasksStore.removeRelation(context.taskClientId);

      if (context.itemClientId) {
        useItemsStore.getState().remove(context.itemClientId);
        useTaskListImagesStore.getState().removeForItem(context.itemClientId);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: upholsteryKeys.pickerLists(),
      });
      void queryClient.invalidateQueries({
        queryKey: pendingSeatUpholsteryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: upholsteryOrderingKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: upholsteryInventoryKeys.lists(),
      });
    },
  });
}
