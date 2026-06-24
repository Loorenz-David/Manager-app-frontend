import {
  itemCategoryPickerSurfaces,
  preloadItemCategoryPickerSurface,
} from "@beyo/item-categories";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  phoneInputSurfaces,
  preloadPhoneCountryPickerSurface,
} from "@beyo/phone-input";
import {
  SCANNER_SLIDE_SURFACE_ID,
  ScannerSlideRouteEntry,
} from "@beyo/scanner";
import { upholsterySurfaces } from "@beyo/upholstery";
import { workingSectionSurfaces } from "@beyo/working-sections";

export const TASK_CREATION_RETURN_SURFACE_ID = "task-creation-return-slide";
export const TASK_CREATION_PRE_ORDER_SURFACE_ID =
  "task-creation-pre-order-slide";
export const TASK_CREATION_INTERNAL_SURFACE_ID =
  "task-creation-internal-slide";
export const TASK_CREATION_WORKER_INTERNAL_SURFACE_ID =
  "task-creation-worker-internal-slide";
export const TASK_CREATION_WORKER_ITEM_ISSUES_SURFACE_ID =
  "task-creation-worker-item-issues-sheet";
export const CALENDAR_SINGLE_PICKER_SURFACE_ID = "calendar-single-picker";
export const CALENDAR_RANGE_PICKER_SURFACE_ID = "calendar-range-picker";

function loadReturnTaskSlidePage() {
  return import("./pages/ReturnTaskSlidePage").then((module) => ({
    default: module.ReturnTaskSlidePage,
  }));
}

function loadPreOrderTaskSlidePage() {
  return import("./pages/PreOrderTaskSlidePage").then((module) => ({
    default: module.PreOrderTaskSlidePage,
  }));
}

function loadInternalTaskSlidePage() {
  return import("./pages/InternalTaskSlidePage").then((module) => ({
    default: module.InternalTaskSlidePage,
  }));
}

function loadWorkerInternalTaskSlidePage() {
  return import("./pages/WorkerInternalTaskSlidePage").then((module) => ({
    default: module.WorkerInternalTaskSlidePage,
  }));
}

function loadWorkerItemIssueSelectionSheetPage() {
  return import("./pages/WorkerItemIssueSelectionSheetPage").then(
    (module) => ({
      default: module.WorkerItemIssueSelectionSheetPage,
    }),
  );
}

function loadCalendarSinglePickerPage() {
  return import("./pages/CalendarSinglePickerPage").then((module) => ({
    default: module.CalendarSinglePickerPage,
  }));
}

function loadCalendarRangePickerPage() {
  return import("./pages/CalendarRangePickerPage").then((module) => ({
    default: module.CalendarRangePickerPage,
  }));
}

function loadScannerSlidePage() {
  return Promise.resolve({ default: ScannerSlideRouteEntry });
}

const returnTaskSlide = lazyWithPreload(loadReturnTaskSlidePage);
const preOrderTaskSlide = lazyWithPreload(loadPreOrderTaskSlidePage);
const internalTaskSlide = lazyWithPreload(loadInternalTaskSlidePage);
const workerInternalTaskSlide = lazyWithPreload(loadWorkerInternalTaskSlidePage);
const workerItemIssueSelectionSheet = lazyWithPreload(
  loadWorkerItemIssueSelectionSheetPage,
);
const calendarSinglePicker = lazyWithPreload(loadCalendarSinglePickerPage);
const calendarRangePicker = lazyWithPreload(loadCalendarRangePickerPage);
const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export { preloadItemCategoryPickerSurface, preloadPhoneCountryPickerSurface };
export const preloadReturnTaskSlideSurface = returnTaskSlide.preload;
export const preloadPreOrderTaskSlideSurface = preOrderTaskSlide.preload;
export const preloadInternalTaskSlideSurface = internalTaskSlide.preload;
export const preloadWorkerInternalTaskSlideSurface =
  workerInternalTaskSlide.preload;
export const preloadWorkerInternalItemIssueSelectionSheetSurface =
  workerItemIssueSelectionSheet.preload;
export const preloadCalendarSinglePickerSurface =
  calendarSinglePicker.preload;
export const preloadCalendarRangePickerSurface = calendarRangePicker.preload;
export const preloadScannerSlideSurface = scannerSlide.preload;

export const taskCreationSurfaces: SurfaceRegistrations = {
  ...phoneInputSurfaces,
  ...itemCategoryPickerSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
  [CALENDAR_SINGLE_PICKER_SURFACE_ID]: {
    surface: "sheet",
    component: calendarSinglePicker.Component,
  },
  [CALENDAR_RANGE_PICKER_SURFACE_ID]: {
    surface: "sheet",
    component: calendarRangePicker.Component,
  },
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
  [TASK_CREATION_WORKER_INTERNAL_SURFACE_ID]: {
    surface: "slide",
    component: workerInternalTaskSlide.Component,
  },
  [TASK_CREATION_WORKER_ITEM_ISSUES_SURFACE_ID]: {
    surface: "sheet",
    component: workerItemIssueSelectionSheet.Component,
  },
};
