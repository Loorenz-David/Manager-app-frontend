export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID =
  "task-working-sections-slide";
export const TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID =
  "task-working-sections-discard-changes";
export const TASK_READY_BY_AT_SHEET_SURFACE_ID = "task-ready-by-at-sheet";
export const TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID =
  "task-scheduled-delivery-sheet";

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

export type TaskReadyByAtSheetSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDeliverySheetSurfaceProps = {
  taskId: string;
  mode?: "edit" | "view";
};

export type TaskWorkingSectionsSurfaceOpeners = {
  closeSlide?: () => void;
  closeDiscardSheet?: () => void;
  openDiscardChangesSheet?: (
    props: TaskWorkingSectionsDiscardChangesSurfaceProps,
  ) => void;
  reopenSlideAfterError?: (props: TaskWorkingSectionsSurfaceProps) => void;
  preloadWorkerPickerSurface?: () => Promise<unknown>;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};
