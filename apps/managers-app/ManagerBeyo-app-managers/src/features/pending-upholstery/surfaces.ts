import { lazyWithPreload } from "@beyo/ui";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const PENDING_UPHOLSTERY_SLIDE_ID = "pending-upholstery-slide";
export const PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID =
  "pending-upholstery-task-actions-sheet";

export type PendingTaskActionsSheetProps = {
  taskId: string;
};

function loadPendingUpholsterySlidePage() {
  return import("./pages/PendingUpholsterySlidePage").then((module) => ({
    default: module.PendingUpholsterySlidePage,
  }));
}

function loadPendingTaskActionsSheetPage() {
  return import("./pages/PendingTaskActionsSheetPage").then((module) => ({
    default: module.PendingTaskActionsSheetPage,
  }));
}

const pendingUpholsterySlide = lazyWithPreload(
  loadPendingUpholsterySlidePage,
);
const pendingTaskActionsSheet = lazyWithPreload(
  loadPendingTaskActionsSheetPage,
);

export const pendingUpholsterySurfaces: SurfaceRegistrations = {
  [PENDING_UPHOLSTERY_SLIDE_ID]: {
    surface: "slide",
    component: pendingUpholsterySlide.Component,
  },
  [PENDING_UPHOLSTERY_TASK_ACTIONS_SHEET_ID]: {
    surface: "sheet",
    component: pendingTaskActionsSheet.Component,
  },
};
