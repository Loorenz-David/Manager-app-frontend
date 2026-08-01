import type { ComponentType } from "react";
import type { TaskNoteComposerValue } from "@beyo/task-notes";
import type { ReassignedStepItem } from "./types";

export const TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID =
  "task-working-sections-slide";
export const REASSIGNED_STEPS_SLIDE_SURFACE_ID = "reassigned-steps-slide";
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
  // Called after the item position is persisted, so the app can refresh any
  // app-owned caches keyed by data the package cannot reach.
  onItemPositionSaved?: (itemId: string) => void;
};

export type TaskWorkingSectionsSurfaceProps = {
  taskId: string;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
  recoveredNoteClientId?: string;
  recoveredNoteContent?: TaskNoteComposerValue | null;
  recoveredItemPosition?: string | null;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
};

export type TaskWorkingSectionsReassignSlideSurfaceProps = {
  taskId: string;
  hideShortcuts?: boolean;
  surfaceOpeners?: TaskWorkingSectionsSurfaceOpeners;
  recoveredPendingAdds?: RecoveredPendingAdd[];
  recoveredPendingRemoveIds?: string[];
  recoveredPendingReassignments?: RecoveredPendingReassignment[];
  recoveredNoteClientId?: string;
  recoveredNoteContent?: TaskNoteComposerValue | null;
  recoveredItemPosition?: string | null;
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

/**
 * The reassigned-steps page renders one app-owned component per row. A
 * **component type** is injected rather than a bundle of callbacks so the app's
 * mutation state (transition pending, cache reads) stays reactive inside each
 * row, while every `openSurface` call still happens in app land
 * (`35_shared_packages.md` §13).
 */
export type ReassignedStepsHostAdapter = {
  StepRow: ComponentType<{ step: ReassignedStepItem }>;
};

export type ReassignedStepsSlideSurfaceProps = {
  adapter: ReassignedStepsHostAdapter;
};
