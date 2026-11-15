import { useMemo } from "react";

import { useSurface } from "@/hooks/use-surface";
import {
  TASK_DETAIL_SURFACE_ID,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";
import type { UpholsteryInventoryId } from "@/types/common";

import { useUpholsteryInventoryHistoryInfiniteQuery } from "../api/use-upholstery-inventory-history-infinite-query";
import {
  describeHistoryRecord,
  flattenHistoryPages,
  getHistoryDriftBanner,
  type HistoryRecordDescription,
} from "../lib/inventory-history";

export type InventoryHistoryEntryViewModel = HistoryRecordDescription & {
  children: HistoryRecordDescription[];
};

export function useInventoryHistoryTimelineController(
  inventoryId: UpholsteryInventoryId,
) {
  const query = useUpholsteryInventoryHistoryInfiniteQuery({ inventoryId });
  const surface = useSurface();
  const pages = query.data?.pages;

  const entries = useMemo<InventoryHistoryEntryViewModel[]>(
    () =>
      flattenHistoryPages(pages ?? []).map((record) => ({
        ...describeHistoryRecord(record),
        children: record.children.map(describeHistoryRecord),
      })),
    [pages],
  );

  // The server sends integrity on the first (cursor-less) page only.
  const driftBanner = useMemo(
    () => getHistoryDriftBanner(pages?.[0]?.integrity ?? null),
    [pages],
  );

  function openTask(taskId: string): void {
    surface.open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function loadMore(): void {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }

  return {
    entries,
    driftBanner,
    isPending: query.isPending,
    isError: query.isError,
    hasMore: Boolean(query.hasNextPage),
    isLoadingMore: query.isFetchingNextPage,
    loadMore,
    openTask,
  };
}

export type InventoryHistoryTimelineController = ReturnType<
  typeof useInventoryHistoryTimelineController
>;
