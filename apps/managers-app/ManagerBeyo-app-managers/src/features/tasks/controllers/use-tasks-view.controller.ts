import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
} from "@beyo/images";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import {
  useTasksPageFlow,
  type TasksPageFlow,
} from "../flows/use-tasks-page.flow";
import { useTaskListImagesStore } from "../store/task-list-images.store";
import { useTasksPageStore } from "../store/tasks-page.store";
import { useTasksStore } from "../store/tasks.store";
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  preloadPinNotificationsSlideSurface,
  type TaskActionsSurfaceProps,
  type TaskDetailSurfaceProps,
} from "../surfaces";
import type { TaskState, TaskTypeFilter } from "../types";

export type TasksViewController = TasksPageFlow & {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  activeFilterCount: number;
  setTaskType: (value: TaskTypeFilter) => void;
  setTaskStates: (value: TaskState[]) => void;
  setQ: (value: string) => void;
  openTaskDetail: (taskId: string) => void;
  openTaskActions: (taskId: string, itemId: string | null) => void;
  openFilterSheet: () => void;
  openSortSheet: () => void;
  openImageViewer: (taskId: string) => void;
};

export function useTasksViewController(): TasksViewController {
  const flow = useTasksPageFlow();
  const { taskType, taskStates, q, setTaskType, setTaskStates, setQ } =
    useTasksPageStore();
  const imagesByItemId = useTaskListImagesStore(
    (state) => state.imagesByItemId,
  );
  const taskIdToItemId = useTasksStore((state) => state.taskIdToItemId);
  const activeFilterCount = taskStates.length + (taskType !== "all" ? 1 : 0);

  function openTaskDetail(taskId: string): void {
    useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, {
      taskId,
    } satisfies TaskDetailSurfaceProps);
  }

  function openTaskActions(taskId: string, itemId: string | null): void {
    preloadPinNotificationsSlideSurface();
    useSurfaceStore.getState().open(TASK_ACTIONS_SHEET_SURFACE_ID, {
      taskId,
      itemId,
    } satisfies TaskActionsSurfaceProps);
  }

  function openFilterSheet(): void {
    useSurfaceStore.getState().open(TASK_FILTER_SHEET_SURFACE_ID, {});
  }

  function openSortSheet(): void {}

  function openImageViewer(taskId: string): void {
    const itemId = taskIdToItemId[taskId];
    if (!itemId) {
      return;
    }

    const images = imagesByItemId[itemId] ?? [];
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
    activeFilterCount,
    setTaskType,
    setTaskStates,
    setQ,
    openTaskDetail,
    openTaskActions,
    openFilterSheet,
    openSortSheet,
    openImageViewer,
  };
}
