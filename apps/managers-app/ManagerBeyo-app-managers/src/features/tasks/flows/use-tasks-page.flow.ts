import { useEffect, useMemo, useRef, useState } from "react";

import type { Item } from "@/features/items/types";
import { toTaskViewModel } from "@/features/tasks/types";
import type { CustomerId, TaskId } from "@/types/common";

import { useListTasksQuery } from "../api/use-list-tasks-query";
import { useItemsStore } from "../store/items.store";
import { useTaskListImagesStore } from "../store/task-list-images.store";
import { useTasksPageStore } from "../store/tasks-page.store";
import { useTasksStore } from "../store/tasks.store";
import type {
  TaskCardViewModel,
  TaskFulfillmentMethod,
  TaskItemLocation,
  TaskPriority,
  TaskReturnMethod,
  TaskReturnSource,
  TaskState,
  TaskType,
} from "../types";

export type TasksPageFlow = {
  cards: TaskCardViewModel[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
};

function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (value) {
      timerRef.current = setTimeout(() => setDelayed(true), delayMs);
    } else {
      setDelayed(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return delayed;
}

export function useTasksPageFlow(): TasksPageFlow {
  const { taskType, taskStates, q } = useTasksPageStore();
  const [debouncedQ, setDebouncedQ] = useState(q);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const params = useMemo(
    () => ({
      ...(taskType !== "all" ? { task_types: taskType } : {}),
      ...(taskStates.length > 0 ? { task_states: taskStates.join(",") } : {}),
      ...(debouncedQ ? { q: debouncedQ } : {}),
    }),
    [debouncedQ, taskStates, taskType],
  );

  const { query, loadMore } = useListTasksQuery(params);

  async function refetch(): Promise<void> {
    await query.refetch();
  }

  const tasksById = useTasksStore((state) => state.tasksById);
  const taskIdToItemId = useTasksStore((state) => state.taskIdToItemId);
  const itemsById = useItemsStore((state) => state.itemsById);
  const imagesByItemId = useTaskListImagesStore(
    (state) => state.imagesByItemId,
  );

  const orderedTaskIds = useMemo(
    () =>
      query.data?.pages.flatMap((page) =>
        page.items.map((item) => item.task.client_id),
      ) ?? [],
    [query.data],
  );

  const cards = useMemo<TaskCardViewModel[]>(() => {
    return orderedTaskIds.flatMap((taskId) => {
      const taskRecord = tasksById[taskId];
      if (!taskRecord) {
        return [];
      }

      const itemId = taskIdToItemId[taskId] ?? null;
      const itemRecord = itemId ? (itemsById[itemId] ?? null) : null;
      const images = itemId ? (imagesByItemId[itemId] ?? []) : [];

      return [
        {
          taskId,
          task: toTaskViewModel({
            id: taskRecord.client_id as TaskId,
            task_scalar_id: taskRecord.task_scalar_id,
            task_type: taskRecord.task_type as TaskType,
            priority: taskRecord.priority as TaskPriority,
            state: taskRecord.state as TaskState,
            return_source: taskRecord.return_source as TaskReturnSource | null,
            item_location: taskRecord.item_location as TaskItemLocation | null,
            return_method: taskRecord.return_method as TaskReturnMethod | null,
            fulfillment_method:
              taskRecord.fulfillment_method as TaskFulfillmentMethod | null,
            title: taskRecord.title,
            summary: taskRecord.summary,
            additional_details: taskRecord.additional_details,
            ready_by_at: taskRecord.ready_by_at,
            scheduled_start_at: taskRecord.scheduled_start_at,
            scheduled_end_at: taskRecord.scheduled_end_at,
            customer_id: taskRecord.customer_id as CustomerId | null,
            primary_phone_number: taskRecord.primary_phone_number,
            secondary_phone_number: taskRecord.secondary_phone_number,
            primary_email: taskRecord.primary_email,
            secondary_email: taskRecord.secondary_email,
            address: taskRecord.address as null,
            created_at: taskRecord.created_at,
            created_by_id: null,
            updated_at: taskRecord.updated_at,
            updated_by_id: null,
            closed_at: taskRecord.closed_at,
            recorded_time_marked_wrong: false,
            taken_from_average: false,
          }),
          item: (itemRecord as Item | null) ?? null,
          firstImage: images[0] ?? null,
          imageCount: images.length,
        },
      ];
    });
  }, [imagesByItemId, itemsById, orderedTaskIds, taskIdToItemId, tasksById]);

  const isLoading = useDelayedTrue(query.isLoading, 200);

  return {
    cards,
    isLoading,
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    refetch,
  };
}
