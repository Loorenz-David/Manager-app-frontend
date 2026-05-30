import { lazyWithPreload } from "@beyo/ui";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const TASK_CREATION_RETURN_SURFACE_ID = "task-creation-return-slide";
export const TASK_CREATION_PRE_ORDER_SURFACE_ID =
  "task-creation-pre-order-slide";
export const TASK_CREATION_INTERNAL_SURFACE_ID = "task-creation-internal-slide";

function loadReturnTaskSlidePage() {
  return import("@/pages/task-creation/ReturnTaskSlidePage").then((module) => ({
    default: module.ReturnTaskSlidePage,
  }));
}

function loadPreOrderTaskSlidePage() {
  return import("@/pages/task-creation/PreOrderTaskSlidePage").then(
    (module) => ({
      default: module.PreOrderTaskSlidePage,
    }),
  );
}

function loadInternalTaskSlidePage() {
  return import("@/pages/task-creation/InternalTaskSlidePage").then(
    (module) => ({
      default: module.InternalTaskSlidePage,
    }),
  );
}

const returnTaskSlide = lazyWithPreload(loadReturnTaskSlidePage);
const preOrderTaskSlide = lazyWithPreload(loadPreOrderTaskSlidePage);
const internalTaskSlide = lazyWithPreload(loadInternalTaskSlidePage);

export const preloadReturnTaskSlideSurface = returnTaskSlide.preload;
export const preloadPreOrderTaskSlideSurface = preOrderTaskSlide.preload;
export const preloadInternalTaskSlideSurface = internalTaskSlide.preload;

export const taskCreationSurfaces: SurfaceRegistrations = {
  [TASK_CREATION_RETURN_SURFACE_ID]: {
    surface: "slide",
    component: returnTaskSlide.Component,
  },
  [TASK_CREATION_PRE_ORDER_SURFACE_ID]: {
    surface: "slide",
    component: preOrderTaskSlide.Component,
  },
  [TASK_CREATION_INTERNAL_SURFACE_ID]: {
    surface: "slide",
    component: internalTaskSlide.Component,
  },
};
