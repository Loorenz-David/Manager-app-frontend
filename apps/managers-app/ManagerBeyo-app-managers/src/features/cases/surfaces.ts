import type { CaseId } from '@/types/common';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import { lazyWithPreload } from '@/utils/lazy-with-preload';
import { buildCaseConversationRoute } from '@/lib/routes';

export const CASE_CONVERSATION_SURFACE_ID = 'case-conversation-slide';
export const CASE_TASK_INFO_SHEET_SURFACE_ID = 'case-task-info-sheet';
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID = 'case-message-actions-sheet';

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
};

export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
};

export type CaseMessageActionsSheetSurfaceProps = {
  caseClientId: string;
  messageClientId: string;
  messageSeq: number;
  messageText: string;
  canEdit: boolean;
  canDelete: boolean;
  onRequestDelete?: () => Promise<void>;
};

function loadCaseConversationSlidePage() {
  return import('@/pages/cases/CaseConversationSlidePage').then((module) => ({
    default: module.CaseConversationSlidePage,
  }));
}

function loadCaseTaskInfoSheetPage() {
  return import('@/pages/cases/CaseTaskInfoSheetPage').then((module) => ({
    default: module.CaseTaskInfoSheetPage,
  }));
}

function loadCaseMessageActionsSheetPage() {
  return import('@/pages/cases/CaseMessageActionsSheetPage').then((module) => ({
    default: module.CaseMessageActionsSheetPage,
  }));
}

const caseConversationSlide = lazyWithPreload(loadCaseConversationSlidePage);
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);
const caseMessageActionsSheet = lazyWithPreload(loadCaseMessageActionsSheetPage);

export const caseSurfaces: SurfaceRegistrations = {
  [CASE_CONVERSATION_SURFACE_ID]: {
    surface: 'slide',
    path: (props) => buildCaseConversationRoute((props as CaseConversationSurfaceProps).caseClientId),
    component: caseConversationSlide.Component,
  },
  [CASE_TASK_INFO_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: caseTaskInfoSheet.Component,
  },
  [CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID]: {
    surface: 'sheet',
    component: caseMessageActionsSheet.Component,
  },
};
