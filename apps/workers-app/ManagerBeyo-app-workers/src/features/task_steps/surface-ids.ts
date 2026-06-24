import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import type { IncompleteDependencyViewModel } from "./types";
import type { MajorCategory, StepState } from "./types";

export const TASK_STEP_ACTIONS_SHEET_SURFACE_ID = "task-step-actions-sheet";
export const TASK_CASES_SLIDE_SURFACE_ID = "task-cases-slide";
export const TASK_STEP_DETAIL_SURFACE_ID = "task-step-detail-slide";
export const COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID =
  "task-step-complete-confirmation-slide";
export const PAUSE_REASON_SHEET_SURFACE_ID = "task-step-pause-reason-sheet";
export const STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID =
  "task-step-dependency-warning-sheet";
export const UPHOLSTERY_WARNING_SHEET_SURFACE_ID =
  "task-step-upholstery-warning-sheet";
export const UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID =
  "task-step-upholstery-selection-missing-sheet";
export const STEP_STATE_FILTER_SHEET_SURFACE_ID =
  "task-step-state-filter-sheet";
export const PIN_NOTIFICATIONS_SLIDE_SURFACE_ID =
  "task-step-pin-notifications-slide";
export const PIN_TASK_STEP_STATES_SHEET_SURFACE_ID =
  "task-step-pin-states-sheet";
export const BATCH_DETAIL_SLIDE_SURFACE_ID = "batch-detail-slide";
export const COMPLETE_BATCH_TASK_STEPS_CONFIRMATION_SLIDE_SURFACE_ID =
  "batch-complete-confirmation-slide";

export type TaskStepActionsSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  itemId?: string | null;
};

export type TaskCasesSlideSurfaceProps = {
  taskId: TaskId;
};

export type TaskStepDetailSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};

export type CompleteTaskStepConfirmationSlideSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  totalWorkingSeconds: number;
  totalPauseSeconds: number;
  lastStateRecordEnteredAt: string | null;
  onConfirm: (markInaccurate: boolean) => void;
};

export type PauseReasonSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};

export type StepDependencyWarningSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  incompleteDependencies: IncompleteDependencyViewModel[];
  onConfirm?: () => void;
};

export type UpholsteryWarningSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  itemId: string;
};

export type UpholsterySelectionMissingSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  itemId: string;
};

export type StepStateFilterSheetSurfaceProps = {
  selectedStates: StepState[];
  selectedMajorCategories: MajorCategory[];
  onApply: (
    states: StepState[],
    majorCategories: MajorCategory[],
  ) => void;
};

export type PinNotificationsSlideSurfaceProps = {
  taskId: TaskId;
  itemId?: string | null;
  originStepId?: TaskStepId;
};

// batchStepIds is the stable identity list — BatchDetailSlidePage derives live
// step data from useUserLastActiveStepQuery() using these IDs, never a stale snapshot.
export type BatchDetailSlideSurfaceProps = {
  workingSectionId: WorkingSectionId;
  workingSectionNameSnapshot: string;
  batchStepIds: TaskStepId[];
};

export type CompleteBatchTaskStepsConfirmationSlideSurfaceProps = {
  workingSectionId: WorkingSectionId;
  workingSteps: Array<{
    taskId: TaskId;
    stepId: TaskStepId;
    totalWorkingSeconds: number;
    totalPauseSeconds: number;
    lastStateRecordEnteredAt: string | null;
  }>;
  onConfirm: (markInaccurate: boolean) => void;
  isPending: boolean;
};

export type PinTaskStepStatesSheetSurfaceProps = {
  stepId: string;
  label: string;
  imageUrl?: string | null;
  currentState: StepState;
  selectedStates: StepState[];
  onApply: (states: StepState[]) => void;
};
