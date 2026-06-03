import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

import { buildCaseConversationRoute } from "@/lib/routes";
import { TASK_CASES_SLIDE_SURFACE_ID } from "@/features/task_steps/surface-ids";

function loadCaseConversationSlidePage() {
  return import("@/pages/cases/CaseConversationSlidePage").then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

function loadCaseMessageActionsSheetPage() {
  return import("@/pages/cases/CaseMessageActionsSheetPage").then((module) => ({
    default: module.CaseMessageActionsSheetPage,
  }));
}

function loadCaseFilterSheetPage() {
  return import("@beyo/cases").then((module) => ({
    default: module.CaseFilterSheetRouteEntry,
  }));
}

function loadCaseCreationSlidePage() {
  return import("@/pages/cases/CaseCreationSlidePage").then((module) => ({
    default: module.CaseCreationSlidePage,
  }));
}

function loadCaseTypePickerSheetPage() {
  return import("@/pages/cases/CaseTypePickerSheetPage").then((module) => ({
    default: module.CaseTypePickerSheetPage,
  }));
}

function loadParticipantPickerSlidePage() {
  return import("@/pages/cases/ParticipantPickerSlidePage").then((module) => ({
    default: module.ParticipantPickerSlidePage,
  }));
}

function loadTaskCasesSlidePage() {
  return import("@/pages/task_steps/TaskCasesSlidePage").then((module) => ({
    default: module.TaskCasesSlidePage,
  }));
}

function loadCaseTaskInfoSheetPage() {
  return import("@/pages/cases/CaseTaskInfoSheetPage").then((module) => ({
    default: module.CaseTaskInfoSheetPage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);
const caseFilterSheet = lazyWithPreload(loadCaseFilterSheetPage);
const caseCreationSlide = lazyWithPreload(loadCaseCreationSlidePage);
const caseTypePickerSheet = lazyWithPreload(loadCaseTypePickerSheetPage);
const participantPickerSlide = lazyWithPreload(loadParticipantPickerSlidePage);
const taskCasesSlide = lazyWithPreload(loadTaskCasesSlidePage);
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);

export const preloadCaseConversationSlideSurface =
  caseConversationSlide.preload;
export const preloadCaseCreationSlideSurface = caseCreationSlide.preload;
export const preloadCaseTypePickerSheetSurface = caseTypePickerSheet.preload;
export const preloadParticipantPickerSlideSurface =
  participantPickerSlide.preload;
export const preloadTaskCasesSlideSurface = taskCasesSlide.preload;

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: "slide",
    path: (props) =>
      buildCaseConversationRoute(
        (props as CaseConversationSurfaceProps).caseClientId,
      ),
    component: caseConversationSlide.Component,
  },
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseMessageActionsSheet.Component,
  },
  [CASE_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseFilterSheet.Component,
  },
  [CASE_TASK_INFO_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTaskInfoSheet.Component,
  },
  [CASE_CREATION_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: caseCreationSlide.Component,
  },
  [CASE_TYPE_PICKER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTypePickerSheet.Component,
  },
  [PARTICIPANT_PICKER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: participantPickerSlide.Component,
  },
  [TASK_CASES_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: taskCasesSlide.Component,
  },
};
