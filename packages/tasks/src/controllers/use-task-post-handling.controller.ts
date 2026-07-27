import { useEffect, useMemo, useState } from "react";

import { notify } from "@beyo/lib";
import { useSurfaceStore } from "@beyo/ui";

import { useCompletePostHandling } from "../actions/use-complete-post-handling";
import { useListPostHandlingTasksQuery } from "../api/use-list-post-handling-tasks-query";
import {
  type TaskListItemRaw,
  type TaskPostHandling,
} from "../types";
import {
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  type TaskPostHandlingFilterSheetSurfaceProps,
  type TaskPostHandlingSurfaceOpeners,
} from "../surface-ids";

type UseTaskPostHandlingControllerInput = {
  surfaceOpeners?: TaskPostHandlingSurfaceOpeners;
  initialTab?: "pending" | "filled";
};

export const POST_HANDLING_TABS = ["pending", "filled"] as const;
export type PostHandlingTab = (typeof POST_HANDLING_TABS)[number];

function toViewerImages(
  images: TaskListItemRaw["item_images"],
): Array<{ client_id: string; image_url: string }> {
  return images.flatMap((image) => {
    const clientId =
      typeof image.client_id === "string" ? image.client_id : null;
    const imageUrl =
      typeof image.image_url === "string" ? image.image_url : null;

    return clientId && imageUrl
      ? [{ client_id: clientId, image_url: imageUrl }]
      : [];
  });
}

export function resolveActiveInstance(
  postHandling: TaskListItemRaw["task"]["post_handling"] | TaskPostHandling[] | null,
): TaskPostHandling | null {
  return (
    postHandling?.find((instance) => instance.state !== "completed") ?? null
  );
}

export function useTaskPostHandlingController({
  surfaceOpeners,
  initialTab,
}: UseTaskPostHandlingControllerInput) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeTab, setActiveTab] = useState<PostHandlingTab>(
    initialTab ?? "pending",
  );
  const [completedFilterActive, setCompletedFilterActive] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const completeMutation = useCompletePostHandling();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [q]);

  const isSearchActive = debouncedQ.trim().length > 0;
  const isPillsDisabled = isSearchActive || completedFilterActive;
  const mode = completedFilterActive
    ? "completed"
    : isSearchActive
      ? "search"
      : "carousel";

  const { query: pendingQueryRaw, loadMore: pendingLoadMore } =
    useListPostHandlingTasksQuery({ post_handling_states: "pending" });
  const { query: filledQueryRaw, loadMore: filledLoadMore } =
    useListPostHandlingTasksQuery({ post_handling_states: "filled" });

  const searchParams = useMemo(
    () => ({
      post_handling_states: "pending,filled",
      q: debouncedQ,
    }),
    [debouncedQ],
  );
  const { query: searchQueryRaw, loadMore: searchLoadMore } =
    useListPostHandlingTasksQuery(searchParams, {
      enabled: mode === "search",
    });

  const completedParams = useMemo(
    () => ({
      post_handling_states: "completed",
      ...(debouncedQ ? { q: debouncedQ } : {}),
    }),
    [debouncedQ],
  );
  const { query: completedQueryRaw, loadMore: completedLoadMore } =
    useListPostHandlingTasksQuery(completedParams, {
      enabled: mode === "completed",
    });

  const pendingTasks = useMemo(
    () => pendingQueryRaw.data?.pages.flatMap((page) => page.items) ?? [],
    [pendingQueryRaw.data],
  );
  const filledTasks = useMemo(
    () => filledQueryRaw.data?.pages.flatMap((page) => page.items) ?? [],
    [filledQueryRaw.data],
  );
  const singleTasks = useMemo(() => {
    if (mode === "search") {
      return searchQueryRaw.data?.pages.flatMap((page) => page.items) ?? [];
    }

    if (mode === "completed") {
      return completedQueryRaw.data?.pages.flatMap((page) => page.items) ?? [];
    }

    return [];
  }, [completedQueryRaw.data, mode, searchQueryRaw.data]);

  function setTab(tab: PostHandlingTab): void {
    setActiveTab(tab);
  }

  function goToAdjacentTab(offset: 1 | -1): void {
    const nextTab =
      POST_HANDLING_TABS[POST_HANDLING_TABS.indexOf(activeTab) + offset];
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }

  function openFilterSheet(): void {
    useSurfaceStore.getState().open(TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID, {
      isCompletedFilterActive: completedFilterActive,
      onApply: setCompletedFilterActive,
    } satisfies TaskPostHandlingFilterSheetSurfaceProps);
  }

  async function handleComplete(
    taskId: string,
    instance: TaskPostHandling | null,
    force: boolean,
  ): Promise<void> {
    if (!instance) {
      return;
    }

    try {
      setCompletingTaskId(taskId);
      await completeMutation.completePostHandling({
        taskId,
        post_handling_id: instance.client_id,
        force,
      });
      const remainingActionable = [...pendingTasks, ...filledTasks].filter(
        (task) =>
          task.task.client_id !== taskId &&
          resolveActiveInstance(task.task.post_handling) !== null,
      ).length;

      if (remainingActionable === 0) {
        surfaceOpeners?.closeSurface?.();
      }
    } catch (error) {
      notify.error(
        "Couldn't complete post-handling",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setCompletingTaskId((current) => (current === taskId ? null : current));
    }
  }

  function openTaskDetail(taskId: string): void {
    surfaceOpeners?.openTaskDetail?.(taskId);
  }

  function openTaskActions(taskId: string, itemId: string | null): void {
    surfaceOpeners?.openTaskActions?.(taskId, itemId);
  }

  function openImageViewer(task: TaskListItemRaw): void {
    const images = toViewerImages(task.item_images);

    if (!images.length) {
      return;
    }

    surfaceOpeners?.openImageViewer?.(
      task.task.client_id,
      task.primary_item?.client_id ?? null,
      images,
    );
  }

  function openPendingWarning(task: TaskListItemRaw): void {
    surfaceOpeners?.openPendingWarning?.({
      taskId: task.task.client_id,
      onOpenCalendarRangePicker: surfaceOpeners?.openCalendarRangePicker,
    });
  }

  async function refetch(): Promise<void> {
    if (mode === "search") {
      await searchQueryRaw.refetch();
      return;
    }

    if (mode === "completed") {
      await completedQueryRaw.refetch();
      return;
    }

    await Promise.all([pendingQueryRaw.refetch(), filledQueryRaw.refetch()]);
  }

  const isBackgroundLoading =
    mode === "search"
      ? searchQueryRaw.isFetching && singleTasks.length > 0
      : mode === "completed"
        ? completedQueryRaw.isFetching && singleTasks.length > 0
        : (pendingQueryRaw.isFetching && pendingTasks.length > 0) ||
          (filledQueryRaw.isFetching && filledTasks.length > 0);

  return {
    activeTab,
    tabs: POST_HANDLING_TABS,
    setTab,
    goToPreviousTab: () => goToAdjacentTab(-1),
    goToNextTab: () => goToAdjacentTab(1),
    completedFilterActive,
    openFilterSheet,
    completedFilterCount: completedFilterActive ? 1 : 0,
    q,
    setQ,
    isSearchActive,
    isPillsDisabled,
    mode,
    pendingPane: {
      tasks: pendingTasks,
      hasMore: pendingQueryRaw.hasNextPage ?? false,
      loadMore: pendingLoadMore,
      isInitialLoading: pendingQueryRaw.isLoading && pendingTasks.length === 0,
      isFetchingMore: pendingQueryRaw.isFetchingNextPage,
      isError: pendingQueryRaw.isError,
    },
    filledPane: {
      tasks: filledTasks,
      hasMore: filledQueryRaw.hasNextPage ?? false,
      loadMore: filledLoadMore,
      isInitialLoading: filledQueryRaw.isLoading && filledTasks.length === 0,
      isFetchingMore: filledQueryRaw.isFetchingNextPage,
      isError: filledQueryRaw.isError,
    },
    singlePane: {
      tasks: singleTasks,
      hasMore:
        (mode === "search"
          ? searchQueryRaw.hasNextPage
          : completedQueryRaw.hasNextPage) ?? false,
      loadMore: mode === "search" ? searchLoadMore : completedLoadMore,
      isInitialLoading:
        mode === "search"
          ? searchQueryRaw.isLoading && singleTasks.length === 0
          : completedQueryRaw.isLoading && singleTasks.length === 0,
      isFetchingMore:
        mode === "search"
          ? searchQueryRaw.isFetchingNextPage
          : completedQueryRaw.isFetchingNextPage,
      isError:
        mode === "search" ? searchQueryRaw.isError : completedQueryRaw.isError,
    },
    isBackgroundLoading,
    refetch,
    completingTaskId,
    closeSurface: surfaceOpeners?.closeSurface,
    openTaskDetail,
    openTaskActions,
    openImageViewer,
    openPendingWarning,
    handleComplete,
    resolveActiveInstance,
  };
}
