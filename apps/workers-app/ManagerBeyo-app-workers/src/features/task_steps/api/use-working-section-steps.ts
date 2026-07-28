import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchWorkingSectionSteps,
  WORKING_SECTION_STEPS_PAGE_SIZE,
} from "./fetch-working-section-steps";
import { taskStepKeys } from "./task-step-keys";
import type {
  ListWorkingSectionStepsParams,
  TaskStepsPagination,
} from "../types";

export function useWorkingSectionStepsQuery(
  params: ListWorkingSectionStepsParams,
) {
  return useQuery({
    queryKey: taskStepKeys.sectionList(params),
    queryFn: () => fetchWorkingSectionSteps(params),
    enabled: Boolean(params.working_section_id),
    placeholderData: keepPreviousData,
  });
}

type PaginationState = {
  key: string;
  offsets: number[];
};

export function usePaginatedWorkingSectionStepsQuery(
  params: ListWorkingSectionStepsParams,
) {
  const pageParams = useMemo(
    () => ({
      ...params,
      limit: WORKING_SECTION_STEPS_PAGE_SIZE,
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
        queryKey: taskStepKeys.sectionList(requestParams),
        queryFn: () => fetchWorkingSectionSteps(requestParams),
        enabled: Boolean(requestParams.working_section_id),
        placeholderData: index === 0 ? keepPreviousData : undefined,
      };
    }),
  });

  const loadedPages = useMemo(
    () =>
      pageQueries
        .map((pageQuery) => pageQuery.data)
        .filter((page): page is TaskStepsPagination => page !== undefined),
    [pageQueries],
  );
  const lastPage = loadedPages.at(-1);
  const isFetchingMore = pageQueries
    .slice(1)
    .some((pageQuery) => pageQuery.isFetching);

  const data = useMemo<TaskStepsPagination | undefined>(() => {
    const firstPage = loadedPages[0];
    if (!firstPage || !lastPage) {
      return undefined;
    }

    return {
      ...firstPage,
      items: loadedPages.flatMap((page) => page.items),
      has_more: lastPage.has_more,
    };
  }, [lastPage, loadedPages]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!lastPage?.has_more || isFetchingMore) {
      return;
    }

    const nextOffset = lastPage.offset + lastPage.limit;
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

      return {
        key: paginationKey,
        offsets: [...currentOffsets, nextOffset],
      };
    });
  }, [
    isFetchingMore,
    lastPage,
    offsets,
    pageQueries,
    paginationKey,
  ]);

  const refetch = useCallback(async (): Promise<void> => {
    setPagination({ key: paginationKey, offsets: [0] });
    await pageQueries[0]?.refetch();
  }, [pageQueries, paginationKey]);

  return {
    data,
    isPending: pageQueries[0]?.isPending ?? true,
    isError: pageQueries[0]?.isError ?? false,
    hasMore: lastPage?.has_more ?? false,
    isFetchingMore,
    loadMore,
    refetch,
  };
}
