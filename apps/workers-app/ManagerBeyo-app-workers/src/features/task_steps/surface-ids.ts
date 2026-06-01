import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import type { StepState } from "./types";

export const TASK_STEP_ACTIONS_SHEET_SURFACE_ID = "task-step-actions-sheet";
export const TASK_CASES_SLIDE_SURFACE_ID = "task-cases-slide";
export const TASK_STEP_DETAIL_SURFACE_ID = "task-step-detail-slide";
export const PAUSE_REASON_SHEET_SURFACE_ID = "task-step-pause-reason-sheet";
export const STEP_STATE_FILTER_SHEET_SURFACE_ID =
  "task-step-state-filter-sheet";

export type TaskStepActionsSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
};

export type TaskCasesSlideSurfaceProps = {
  taskId: TaskId;
};

export type TaskStepDetailSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};

export type PauseReasonSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
};

export type StepStateFilterSheetSurfaceProps = {
  selectedStates: StepState[];
  onApply: (states: StepState[]) => void;
};
