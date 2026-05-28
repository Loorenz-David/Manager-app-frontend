import type { CaseId } from "@beyo/lib";

export const CASE_CONVERSATION_SURFACE_ID = "case-conversation-slide";
export const CASE_TASK_INFO_SHEET_SURFACE_ID = "case-task-info-sheet";
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID =
  "case-message-actions-sheet";

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
