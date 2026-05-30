import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
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

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);
const caseFilterSheet = lazyWithPreload(loadCaseFilterSheetPage);

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: "slide",
    path: (props) =>
      buildCaseConversationRoute(
        (props as CaseConversationSurfaceProps).caseClientId,
      ),
    component: caseConversationSlide.Component,
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
