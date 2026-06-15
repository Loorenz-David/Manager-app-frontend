import { useEffect, useMemo, useState } from "react";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
} from "@beyo/images";

import { useSurface } from "@/hooks/use-surface";
import {
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  type ItemUpholsteryAmountSurfaceProps,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";
import { UPHOLSTERY_PICKER_SLIDE_ID } from "@/features/upholstery/surfaces";

import { usePendingSeatCountsQuery } from "../api/use-pending-seat-counts-query";
import { usePendingSeatTasksQuery } from "../api/use-pending-seat-tasks-query";
import { toPendingSeatCardViewModel } from "../lib/pending-seat-dto";
import {
  PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID,
  type PendingTaskActionsSheetProps,
} from "../surfaces";
import type {
  PendingSeatCardViewModel,
  PendingSeatTaskRow,
} from "../types";

const PAGE_LIMIT = 50;
type PendingUpholsteryFilter = "missing_selection" | "missing_quantity";

function appendDeduped(
  current: PendingSeatTaskRow[],
  next: PendingSeatTaskRow[],
): PendingSeatTaskRow[] {
  const seen = new Set(current.map((row) => row.task.client_id));
  const appended = next.filter((row) => !seen.has(row.task.client_id));
  return [...current, ...appended];
}

export function usePendingUpholsteryController() {
  const [missingSelection, setMissingSelection] = useState(true);
  const [missingQuantity, setMissingQuantity] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<
    PendingSeatTaskRow[]
  >([]);
  const surface = useSurface();

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(searchInput), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setOffset(0);
    setAccumulatedItems([]);
  }, [debouncedQ, missingQuantity, missingSelection]);

  const params = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      offset,
      q: debouncedQ.trim() || undefined,
      missing_selection: missingSelection,
      missing_quantity: missingQuantity,
    }),
    [debouncedQ, missingQuantity, missingSelection, offset],
  );

  const listQuery = usePendingSeatTasksQuery(params);
  const countsQuery = usePendingSeatCountsQuery();

  useEffect(() => {
    if (!listQuery.data) return;
    setAccumulatedItems((current) =>
      offset === 0
        ? listQuery.data.items
        : appendDeduped(current, listQuery.data.items),
    );
  }, [listQuery.data, offset]);

  const cards = useMemo<PendingSeatCardViewModel[]>(
    () => accumulatedItems.map((row) => toPendingSeatCardViewModel(row)),
    [accumulatedItems],
  );

  function setFilters(value: PendingUpholsteryFilter): void {
    setMissingSelection(value === "missing_selection");
    setMissingQuantity(value === "missing_quantity");
  }

  async function refetch(): Promise<void> {
    setOffset(0);
    await Promise.all([listQuery.refetch(), countsQuery.refetch()]);
  }

  function loadMore(): void {
    if (!listQuery.data?.hasMore || listQuery.isFetching) return;
    setOffset(listQuery.data.offset + listQuery.data.limit);
  }

  function openTaskDetail(taskId: string): void {
    surface.open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openTaskActions(taskId: string): void {
    surface.open(PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID, {
      taskId,
    } satisfies PendingTaskActionsSheetProps);
  }

  function openImageViewer(card: PendingSeatCardViewModel): void {
    const firstImage = card.images[0];
    if (!firstImage) return;
    surface.open(IMAGE_VIEWER_SURFACE_ID, {
      images: card.images,
      initialImageClientId: firstImage.clientId,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: card.primaryItem?.id ?? null,
      mode: "preview-only",
      enableOnDemandImageLoad: true,
    });
  }

  function openUpholsteryPicker(
    onSelect: (upholsteryClientId: string) => void,
  ): void {
    surface.open(UPHOLSTERY_PICKER_SLIDE_ID, {
      currentClientId: null,
      onSelect,
    });
  }

  function openAmountSheet(taskId: string, itemUpholsteryId: string): void {
    surface.open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
      taskId,
      itemUpholsteryId,
    } satisfies ItemUpholsteryAmountSurfaceProps);
  }

  return {
    missingSelection,
    missingQuantity,
    setFilters,
    searchInput,
    setSearchInput,
    isInitialLoading: listQuery.isPending && accumulatedItems.length === 0,
    isBackgroundLoading: listQuery.isFetching && accumulatedItems.length > 0,
    isError: listQuery.isError && accumulatedItems.length === 0,
    isFetchingMore: listQuery.isFetching && offset > 0,
    isPaginationError: listQuery.isError && offset > 0,
    hasMore: listQuery.data?.hasMore ?? false,
    cards,
    counts: countsQuery.data ?? null,
    countsError: countsQuery.isError,
    retry: listQuery.refetch,
    refetch,
    loadMore,
    openTaskDetail,
    openTaskActions,
    openImageViewer,
    openUpholsteryPicker,
    openAmountSheet,
    close: surface.closeTop,
  };
}

export type PendingUpholsteryController = ReturnType<
  typeof usePendingUpholsteryController
>;
