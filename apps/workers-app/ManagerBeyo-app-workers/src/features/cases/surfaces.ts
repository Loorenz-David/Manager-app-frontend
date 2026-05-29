import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

import {
  buildCaseConversationRoute,
  buildCaseCreationRoute,
} from "@/lib/routes";

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

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);
const caseCreationSlide = lazyWithPreload(loadCaseCreationSlidePage);
const caseTypePickerSheet = lazyWithPreload(loadCaseTypePickerSheetPage);

export const preloadCaseCreationSlideSurface = caseCreationSlide.preload;
export const preloadCaseTypePickerSheetSurface = caseTypePickerSheet.preload;

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
  [CASE_CREATION_SLIDE_SURFACE_ID]: {
    surface: "slide",
    path: () => buildCaseCreationRoute(),
    component: caseCreationSlide.Component,
  },
  [CASE_TYPE_PICKER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTypePickerSheet.Component,
  },
};
