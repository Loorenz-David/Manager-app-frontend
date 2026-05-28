import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

import { buildCaseConversationRoute } from "@/lib/routes";

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

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseMessageActionsSheet = lazyWithPreload(
  loadCaseMessageActionsSheetPage,
);

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
};
