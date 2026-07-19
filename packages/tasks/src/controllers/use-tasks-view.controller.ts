import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
} from "@beyo/images";
import { useSurfaceStore } from "@beyo/ui";

import {
  useTasksPageFlow,
  type TasksPageFlow,
} from "../flows/use-tasks-page.flow";
import { useTasksPageStore } from "../store/tasks-page.store";
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  type TaskActionsSurfaceProps,
  type TaskDetailSurfaceProps,
  type TaskFilterSheetSurfaceProps,
} from "../surface-ids";
import type { TaskState, TaskTypeFilter } from "../types";

export type TasksViewController = TasksPageFlow & {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  itemPosition: string;
  groupByUpholstery: boolean;
  activeFilterCount: number;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  setItemPosition: (value: string) => void;
  setGroupByUpholstery: (value: boolean) => void;
  openTaskDetail: (taskId: string) => void;
  openTaskActions: (taskId: string, itemId: string | null) => void;
  openFilterSheet: () => void;
  openSortSheet: () => void;
  openImageViewer: (taskId: string) => void;
};

export function useTasksViewController(): TasksViewController {
  const flow = useTasksPageFlow();
  const {
    taskType,
    taskStates,
    q,
    itemPosition,
    groupByUpholstery,
    setTaskType,
    setTaskStates,
    setQ,
    setItemPosition,
    setGroupByUpholstery,
  } = useTasksPageStore();
  // Grouping is a view mode, not a filter — it does not reduce results, so it is
  // deliberately excluded from the "filters active" badge count.
  const activeFilterCount =
    taskStates.length + (taskType !== "all" ? 1 : 0) + (itemPosition ? 1 : 0);

  function openTaskDetail(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openTaskActions(taskId: string, itemId: string | null): void {
    useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
      taskId,
      itemId,
    } satisfies TaskActionsSurfaceProps);
  }

  function openFilterSheet(): void {
    useSurfaceStore.getState().open(TASK_FILTER_SHEET_SURFACE_ID, {
      selectedItemPosition: itemPosition,
      groupByUpholstery,
      onApply: (nextItemPosition: string, nextGroupByUpholstery: boolean) => {
        setItemPosition(nextItemPosition);
        setGroupByUpholstery(nextGroupByUpholstery);
      },
    } satisfies TaskFilterSheetSurfaceProps);
  }

  function openSortSheet(): void {}

  function openImageViewer(taskId: string): void {
    const itemId = flow.taskIdToItemId[taskId];
    if (!itemId) {
      return;
    }

    const images = flow.imagesByItemId[itemId] ?? [];
    const firstImage = images[0];
    if (!firstImage) {
      return;
    }

    useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, {
      images,
      initialImageClientId: firstImage.clientId,
      entityType: "item" as ImageLinkEntityType,
      entityClientId: itemId,
      mode: "preview-only",
      enableOnDemandImageLoad: true,
    });
  }

  return {
    ...flow,
    taskType,
    taskStates,
    q,
    itemPosition,
    groupByUpholstery,
    activeFilterCount,
    setTaskType,
    setTaskStates,
    setQ,
    setItemPosition,
    setGroupByUpholstery,
    openTaskDetail,
    openTaskActions,
    openFilterSheet,
    openSortSheet,
    openImageViewer,
  };
}
