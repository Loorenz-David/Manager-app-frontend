import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import {
  REASSIGNED_STEPS_PAGE_SIZE,
  fetchReassignedSteps,
} from "./fetch-reassigned-steps";
import { reassignedStepKeys } from "./reassigned-step-keys";
import type {
  ListReassignedStepsParams,
  ReassignedStepItem,
  ReassignedStepsResponse,
  WorkingSectionCompact,
} from "../types";

type PaginationState = {
  key: string;
  offsets: number[];
};

export type PaginatedReassignedStepsQuery = {
  items: ReassignedStepItem[];
  /** Merged `working_sections` map across every fetched page (handoff §7). */
  workingSections: Record<string, WorkingSectionCompact>;
  isPending: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
};

/**
 * Offsets-array pagination, mirroring the working-section steps list: each page
 * is its own cache entry, pages are flattened, and "Show more" appends one more
 * offset. A parameter change (e.g. a new `q`) resets back to a single page.
 */
export function usePaginatedReassignedStepsQuery(
  params: ListReassignedStepsParams = {},
): PaginatedReassignedStepsQuery {
  const pageParams = useMemo<ListReassignedStepsParams>(
    () => ({
      ...params,
      limit: params.limit ?? REASSIGNED_STEPS_PAGE_SIZE,
      offset: 0,
    }),
    [params],
  );
  const paginationKey = JSON.stringify(pageParams);
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    key: paginationKey,
    offsets: [0],
  }));
  const offsets = useMemo(
    () => (pagination.key === paginationKey ? pagination.offsets : [0]),
    [pagination, paginationKey],
  );

  const pageQueries = useQueries({
    queries: offsets.map((offset, index) => {
      const requestParams = { ...pageParams, offset };

      return {
        queryKey: reassignedStepKeys.list(requestParams),
        queryFn: () => fetchReassignedSteps(requestParams),
        // Keep the previous result visible while a new search is in flight so
        // the list does not blank out on every keystroke.
        placeholderData: index === 0 ? keepPreviousData : undefined,
      };
    }),
  });

  const loadedPages = useMemo(
    () =>
      pageQueries
        .map((pageQuery) => pageQuery.data)
        .filter((page): page is ReassignedStepsResponse => page !== undefined),
    [pageQueries],
  );
  const lastPage = loadedPages.at(-1);
  const isFetchingMore = pageQueries
    .slice(1)
    .some((pageQuery) => pageQuery.isFetching);

  // De-duped by client_id: a page boundary can repeat a row if a reassignment
  // lands between two requests, and a duplicate would break the grouping keys.
  const items = useMemo<ReassignedStepItem[]>(() => {
    const seen = new Set<string>();
    const merged: ReassignedStepItem[] = [];

    for (const page of loadedPages) {
      for (const item of page.steps_pagination.items) {
        if (seen.has(item.client_id)) {
          continue;
        }
        seen.add(item.client_id);
        merged.push(item);
      }
    }

    return merged;
  }, [loadedPages]);

  const workingSections = useMemo<Record<string, WorkingSectionCompact>>(() => {
    const merged: Record<string, WorkingSectionCompact> = {};
    for (const page of loadedPages) {
      Object.assign(merged, page.working_sections);
    }
    return merged;
  }, [loadedPages]);

  const loadMore = useCallback(async (): Promise<void> => {
    const pagination = lastPage?.steps_pagination;
    if (!pagination?.has_more || isFetchingMore) {
      return;
    }

    // Step by the limit the *server* echoed, not the one we asked for — it may
    // legitimately return a smaller page than requested.
    const nextOffset = pagination.offset + pagination.limit;
    const existingPageIndex = offsets.indexOf(nextOffset);

    if (existingPageIndex >= 0) {
      await pageQueries[existingPageIndex]?.refetch();
      return;
    }

    setPagination((current) => {
      const currentOffsets =
        current.key === paginationKey ? current.offsets : [0];

      if (currentOffsets.includes(nextOffset)) {
        return current;
      }

      return { key: paginationKey, offsets: [...currentOffsets, nextOffset] };
    });
  }, [isFetchingMore, lastPage, offsets, pageQueries, paginationKey]);

  const refetch = useCallback(async (): Promise<void> => {
    setPagination({ key: paginationKey, offsets: [0] });
    await pageQueries[0]?.refetch();
  }, [pageQueries, paginationKey]);

  return {
    items,
    workingSections,
    isPending: pageQueries[0]?.isPending ?? true,
    isError: pageQueries[0]?.isError ?? false,
    hasMore: lastPage?.steps_pagination.has_more ?? false,
    isFetchingMore,
    loadMore,
    refetch,
  };
}
