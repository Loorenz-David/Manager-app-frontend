import { useInfiniteQuery } from '@tanstack/react-query';

import { toImageAnnotationViewModel, type ImageViewModel } from '@/features/images/types';

import { listTasks } from './list-tasks';
import { taskKeys } from './task-keys';
import { useItemsStore } from '../store/items.store';
import { useTaskListImagesStore } from '../store/task-list-images.store';
import { useTasksStore } from '../store/tasks.store';
import type { ListTasksFullParams, TaskListItemRaw } from '../types';

const PAGE_LIMIT = 25;

function toImageViewModelFromListItem(
  raw: TaskListItemRaw['item_images'][number],
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
    entityType: 'item',
    entityClientId: itemClientId,
    imageUrl: record.image_url,
    localObjectUrl: null,
    displayOrder: index,
    widthPx: record.width_px ?? null,
    heightPx: record.height_px ?? null,
    fileSizeBytes: record.file_size_bytes ?? null,
    createdAt: isFirst ? (record.created_at ?? null) : null,
    uploadState: 'completed',
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation:
      isFirst && record.image_annotation ? toImageAnnotationViewModel(record.image_annotation) : null,
    annotations:
      isFirst && Array.isArray(record.image_annotations)
        ? record.image_annotations.map(toImageAnnotationViewModel)
        : [],
    isFullyLoaded: isFirst,
  };
}

function normalizePageIntoStores(items: TaskListItemRaw[]): void {
  const { setMany: setTasks, setTaskItemRelation } = useTasksStore.getState();
  const { setMany: setItems } = useItemsStore.getState();
  const { setForItem } = useTaskListImagesStore.getState();

  setTasks(items.map((item) => item.task));

  const primaryItems: NonNullable<TaskListItemRaw['primary_item']>[] = [];

  for (const item of items) {
    const primaryItem = item.primary_item;
    if (primaryItem == null) {
      continue;
    }

    primaryItems.push(primaryItem);
    setTaskItemRelation(item.task.client_id, primaryItem.client_id);
    setForItem(
      primaryItem.client_id,
      item.item_images.map((image, index) =>
        toImageViewModelFromListItem(image, primaryItem.client_id, index),
      ),
    );
  }

  setItems(primaryItems);
}

export function useListTasksQuery(params: Omit<ListTasksFullParams, 'limit' | 'offset'>) {
  const query = useInfiniteQuery({
    queryKey: taskKeys.list({ ...params, limit: PAGE_LIMIT }),
    queryFn: async ({ pageParam }) => {
      const result = await listTasks({
        ...params,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      });
      normalizePageIntoStores(result.items);
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.items.length : undefined,
  });

  return {
    query,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
}
