export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID =
  "task-working-sections-slide";
export const TASK_WORKING_SECTIONS_REASSIGN_SLIDE_SURFACE_ID =
  "task-working-sections-reassign-slide";
export const TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID =
  "task-working-sections-discard-changes";
export const QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID = "quick-task-assign-slide";

export type RecoveredPendingAdd = {
  _pendingId: string;
  working_section_id: string;
  worker_id: string | null;
  working_section_name_snapshot: string | null;
  assigned_worker_display_name_snapshot: string | null;
};

export type RecoveredPendingReassignment = {
  step_id: string;
  worker_id: string;
  display_name: string | null;
};

export type TaskWorkingSectionsDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};

export type TaskWorkingSectionsSurfaceOpeners = {
  closeSlide?: () => void;
  closeDiscardSheet?: () => void;
  openDiscardChangesSheet?: (
    props: TaskWorkingSectionsDiscardChangesSurfaceProps,
  ) => void;
  reopenSlideAfterError?: (props: TaskWorkingSectionsSurfaceProps) => void;
  preloadWorkerPickerSurface?: () => Promise<unknown>;
  onSaveComplete?: (taskId: string, appliedAdds: RecoveredPendingAdd[]) => number;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};

export type TaskWorkingSectionsReassignSlideSurfaceProps = {
  taskId: string;
  hideShortcuts?: boolean;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
};

export type QuickTaskAssignSurfaceOpeners = {
  closeSurface?: () => void;
  openTaskDetail?: (taskId: string) => void;
  openTaskActions?: (taskId: string, itemId: string | null) => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
};

export type QuickTaskAssignSurfaceProps = {
  taskType: "pre_order" | "return";
  surfaceOpeners?: QuickTaskAssignSurfaceOpeners;
};
