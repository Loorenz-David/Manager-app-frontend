import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  TASK_STEP_ACTIONS_SHEET_SURFACE_ID,
  TASK_STEP_DETAIL_SURFACE_ID,
} from "./surface-ids";

function loadTaskStepActionsSheetPage() {
  return import("@/pages/task_steps/TaskStepActionsSheetPage").then(
    (module) => ({
      default: module.TaskStepActionsSheetPage,
    }),
  );
}

function loadTaskDetailSlidePage() {
  return import("@/pages/task_steps/TaskDetailSlidePage").then((module) => ({
    default: module.TaskDetailSlidePage,
  }));
}

const taskStepActionsSheet = lazyWithPreload(loadTaskStepActionsSheetPage);
const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);

export const taskStepSurfaces: SurfaceRegistrations = {
  [TASK_STEP_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskStepActionsSheet.Component,
  },
  [TASK_STEP_DETAIL_SURFACE_ID]: {
    surface: "slide",
    component: taskDetailSlide.Component,
  },
};
