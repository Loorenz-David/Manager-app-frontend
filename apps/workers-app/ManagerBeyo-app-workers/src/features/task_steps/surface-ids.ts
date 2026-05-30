import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";

export const TASK_STEP_ACTIONS_SHEET_SURFACE_ID = "task-step-actions-sheet";
export const TASK_CASES_SLIDE_SURFACE_ID = "task-cases-slide";
export const TASK_STEP_DETAIL_SURFACE_ID = "task-step-detail-slide";

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
