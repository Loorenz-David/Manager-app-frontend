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
import { UPHOLSTERY_PICKER_SLIDE_ID } from "@beyo/upholstery";

import { usePendingSeatCountsQuery } from "../api/use-pending-seat-counts-query";
import { usePendingSeatTaskPagesQueries } from "../api/use-pending-seat-tasks-query";
import { toPendingSeatCardViewModel } from "../lib/pending-seat-dto";
import {
  PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID,
  type PendingTaskActionsSheetProps,
} from "../surfaces";
import type {
  PendingSeatCardViewModel,
  PendingSeatTaskRow,
} from "../types";

// Both panes stay mounted (SlideStack renders the destination pane as a drag
// ghost), and every fetched row becomes a fully mounted card — so page size
// directly sets how much DOM a swipe has to build. At 50 the ghost mount cost
// ~145 ms and visibly blocked the drag; 10 keeps a page under one viewport,
// with "Load more" for the rest.
const PAGE_LIMIT = 10;
export const PENDING_UPHOLSTERY_FILTERS = [
  "missing_selection",
  "missing_quantity",
] as const;
export type PendingUpholsteryFilter =
  (typeof PENDING_UPHOLSTERY_FILTERS)[number];

type PageOffsetsByFilter = Record<PendingUpholsteryFilter, number[]>;

function getInitialPageOffsets(): PageOffsetsByFilter {
  return {
    missing_selection: [0],
    missing_quantity: [0],
  };
}

function appendDeduped(
  current: PendingSeatTaskRow[],
  next: PendingSeatTaskRow[],
): PendingSeatTaskRow[] {
  const seen = new Set(current.map((row) => row.task.client_id));
  const appended = next.filter((row) => !seen.has(row.task.client_id));
  return [...current, ...appended];
}

function mergeQueryItems(
  queries: ReturnType<typeof usePendingSeatTaskPagesQueries>,
): PendingSeatTaskRow[] {
  return queries.reduce(
    (items, query) =>
      query.data ? appendDeduped(items, query.data.items) : items,
    [] as PendingSeatTaskRow[],
  );
}

export function usePendingUpholsteryController() {
  const [activeFilter, setActiveFilter] =
    useState<PendingUpholsteryFilter>("missing_selection");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [pageOffsetsByFilter, setPageOffsetsByFilter] =
    useState<PageOffsetsByFilter>(getInitialPageOffsets);
  const surface = useSurface();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQ(searchInput);
      setPageOffsetsByFilter(getInitialPageOffsets());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const selectionParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      q: debouncedQ.trim() || undefined,
      missing_selection: true,
      missing_quantity: false,
    }),
    [debouncedQ],
  );
  const quantityParams = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      q: debouncedQ.trim() || undefined,
      missing_selection: false,
      missing_quantity: true,
    }),
    [debouncedQ],
  );

  // Both pane queries stay resolved: SlideStack mounts the destination pane as
  // a drag ghost before navigation commits, so that pane needs real content.
  const selectionQueries = usePendingSeatTaskPagesQueries(
    selectionParams,
    pageOffsetsByFilter.missing_selection,
  );
  const quantityQueries = usePendingSeatTaskPagesQueries(
    quantityParams,
    pageOffsetsByFilter.missing_quantity,
  );
  const countsQuery = usePendingSeatCountsQuery();
  const itemsByFilter = {
    missing_selection: mergeQueryItems(selectionQueries),
    missing_quantity: mergeQueryItems(quantityQueries),
  };

  const cardsByFilter: Record<
    PendingUpholsteryFilter,
    PendingSeatCardViewModel[]
  > = {
    missing_selection: itemsByFilter.missing_selection.map((row) =>
      toPendingSeatCardViewModel(row),
    ),
    missing_quantity: itemsByFilter.missing_quantity.map((row) =>
      toPendingSeatCardViewModel(row),
    ),
  };
  const queriesByFilter = {
    missing_selection: selectionQueries,
    missing_quantity: quantityQueries,
  } as const;
  const activeQueries = queriesByFilter[activeFilter];
  const missingSelection = activeFilter === "missing_selection";
  const missingQuantity = activeFilter === "missing_quantity";

  function setFilters(value: PendingUpholsteryFilter): void {
    setActiveFilter(value);
  }

  function goToAdjacentFilter(offset: 1 | -1): void {
    const nextFilter =
      PENDING_UPHOLSTERY_FILTERS[
        PENDING_UPHOLSTERY_FILTERS.indexOf(activeFilter) + offset
      ];
    if (nextFilter) {
      setActiveFilter(nextFilter);
    }
  }

  async function refetch(): Promise<void> {
    setPageOffsetsByFilter((current) => ({
      ...current,
      [activeFilter]: [0],
    }));
    await Promise.all([
      activeQueries[0]?.refetch(),
      countsQuery.refetch(),
    ]);
  }

  function loadMoreFor(filter: PendingUpholsteryFilter): void {
    const query = queriesByFilter[filter].at(-1);
    if (!query?.data?.hasMore || query.isFetching) return;
    const nextOffset = query.data.offset + query.data.limit;
    setPageOffsetsByFilter((current) => ({
      ...current,
      [filter]: [...current[filter], nextOffset],
    }));
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
    activeFilter,
    filters: PENDING_UPHOLSTERY_FILTERS,
    missingSelection,
    missingQuantity,
    setFilters,
    goToPreviousFilter: () => goToAdjacentFilter(-1),
    goToNextFilter: () => goToAdjacentFilter(1),
    searchInput,
    setSearchInput,
    isInitialLoadingByFilter: {
      missing_selection:
        selectionQueries[0]?.isPending === true &&
        itemsByFilter.missing_selection.length === 0,
      missing_quantity:
        quantityQueries[0]?.isPending === true &&
        itemsByFilter.missing_quantity.length === 0,
    },
    isBackgroundLoadingByFilter: {
      missing_selection:
        selectionQueries.some((query) => query.isFetching) &&
        itemsByFilter.missing_selection.length > 0,
      missing_quantity:
        quantityQueries.some((query) => query.isFetching) &&
        itemsByFilter.missing_quantity.length > 0,
    },
    isErrorByFilter: {
      missing_selection:
        selectionQueries[0]?.isError === true &&
        itemsByFilter.missing_selection.length === 0,
      missing_quantity:
        quantityQueries[0]?.isError === true &&
        itemsByFilter.missing_quantity.length === 0,
    },
    isFetchingMoreByFilter: {
      missing_selection:
        selectionQueries.at(-1)?.isFetching === true &&
        (pageOffsetsByFilter.missing_selection.at(-1) ?? 0) > 0,
      missing_quantity:
        quantityQueries.at(-1)?.isFetching === true &&
        (pageOffsetsByFilter.missing_quantity.at(-1) ?? 0) > 0,
    },
    isPaginationErrorByFilter: {
      missing_selection:
        selectionQueries.at(-1)?.isError === true &&
        (pageOffsetsByFilter.missing_selection.at(-1) ?? 0) > 0,
      missing_quantity:
        quantityQueries.at(-1)?.isError === true &&
        (pageOffsetsByFilter.missing_quantity.at(-1) ?? 0) > 0,
    },
    hasMoreByFilter: {
      missing_selection:
        selectionQueries.at(-1)?.data?.hasMore ?? false,
      missing_quantity: quantityQueries.at(-1)?.data?.hasMore ?? false,
    },
    retryByFilter: {
      missing_selection: () => selectionQueries.at(-1)?.refetch(),
      missing_quantity: () => quantityQueries.at(-1)?.refetch(),
    },
    loadMoreByFilter: {
      missing_selection: () => loadMoreFor("missing_selection"),
      missing_quantity: () => loadMoreFor("missing_quantity"),
    },
    isBackgroundLoading:
      activeQueries.some((query) => query.isFetching) &&
      cardsByFilter[activeFilter].length > 0,
    cardsByFilter,
    counts: countsQuery.data ?? null,
    countsError: countsQuery.isError,
    refetch,
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
