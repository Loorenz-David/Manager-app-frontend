import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";
import { buildCaseConversationRoute } from "@/lib/routes";

function loadCaseConversationSlidePage() {
  return import("@/pages/cases/CaseConversationSlidePage").then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

function loadCaseTaskInfoSheetPage() {
  return import("@/pages/cases/CaseTaskInfoSheetPage").then((module) => ({
    default: module.CaseTaskInfoSheetPage,
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

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);
const caseFilterSheet = lazyWithPreload(loadCaseFilterSheetPage);
const caseCreationSlide = lazyWithPreload(loadCaseCreationSlidePage);
const caseTypePickerSheet = lazyWithPreload(loadCaseTypePickerSheetPage);
const participantPickerSlide = lazyWithPreload(loadParticipantPickerSlidePage);

export const preloadCaseConversationSlideSurface =
  caseConversationSlide.preload;

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: "slide",
    path: (props) =>
      buildCaseConversationRoute(
        (props as CaseConversationSurfaceProps).caseClientId,
      ),
    component: caseConversationSlide.Component,
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
  [CASE_TASK_INFO_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTaskInfoSheet.Component,
  },
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseMessageActionsSheet.Component,
  },
  [CASE_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseFilterSheet.Component,
  },
};
