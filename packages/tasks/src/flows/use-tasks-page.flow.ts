import { useEffect, useMemo, useRef, useState } from "react";

import {
  toImageAnnotationViewModel,
  type ImageViewModel,
} from "@beyo/images";

import { useListTasksQuery } from "../api/use-list-tasks-query";
import { useTasksPageStore } from "../store/tasks-page.store";
import type { TaskCardViewModel, TaskListItemRaw } from "../types";
import { toTaskViewModel } from "../types";

export type TasksPageFlow = {
  cards: TaskCardViewModel[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
  taskIdToItemId: Record<string, string>;
  imagesByItemId: Record<string, ImageViewModel[]>;
};

function toImageViewModelFromListItem(
  raw: TaskListItemRaw["item_images"][number],
  itemClientId: string,
  index: number,
): ImageViewModel {
  const isFirst = index === 0;
  const record = raw as {
    client_id: string;
    image_url: string;
    width_px?: number | null;
    height_px?: number | null;
    file_size_bytes?: number | null;
    created_at?: string;
    image_annotation?: Parameters<typeof toImageAnnotationViewModel>[0] | null;
    image_annotations?: Parameters<typeof toImageAnnotationViewModel>[0][];
  };

  return {
    clientId: record.client_id,
    linkClientId: null,
    entityType: "item",
    entityClientId: itemClientId,
    imageUrl: record.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: record.width_px ?? null,
    heightPx: record.height_px ?? null,
    fileSizeBytes: record.file_size_bytes ?? null,
    createdAt: isFirst ? (record.created_at ?? null) : null,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation:
      isFirst && record.image_annotation
        ? toImageAnnotationViewModel(record.image_annotation)
        : null,
    annotations:
      isFirst && Array.isArray(record.image_annotations)
        ? record.image_annotations.map(toImageAnnotationViewModel)
        : [],
    isFullyLoaded: isFirst,
  };
}

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

  const { cards, taskIdToItemId, imagesByItemId } = useMemo(() => {
    const cards: TaskCardViewModel[] = [];
    const taskIdToItemId: Record<string, string> = {};
    const imagesByItemId: Record<string, ImageViewModel[]> = {};

    for (const page of query.data?.pages ?? []) {
      for (const listItem of page.items) {
        const { task, primary_item: primaryItem, item_images: itemImages } =
          listItem;
        const itemClientId = primaryItem?.client_id ?? null;

        if (itemClientId) {
          taskIdToItemId[task.client_id] = itemClientId;
          imagesByItemId[itemClientId] = itemImages.map((image, imageIndex) =>
            toImageViewModelFromListItem(image, itemClientId, imageIndex),
          );
        }

        const images = itemClientId ? (imagesByItemId[itemClientId] ?? []) : [];

        cards.push({
          taskId: task.client_id,
          task: toTaskViewModel(task),
          item: primaryItem,
          firstImage: images[0] ?? null,
          imageCount: images.length,
        });
      }
    }

    return { cards, taskIdToItemId, imagesByItemId };
  }, [query.data]);

  return {
    cards,
    isLoading: useDelayedTrue(query.isLoading, 200),
    isFetchingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    refetch,
    taskIdToItemId,
    imagesByItemId,
  };
}
