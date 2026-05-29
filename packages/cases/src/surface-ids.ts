import type { CaseId } from "@beyo/lib";
import type { CaseTypeSelectedDisplay } from "./types";

export const CASE_CONVERSATION_SURFACE_ID = "case-conversation-slide";
export const CASE_CREATION_SLIDE_SURFACE_ID = "case-creation-slide";
export const CASE_TYPE_PICKER_SHEET_SURFACE_ID = "case-type-picker-sheet";
export const CASE_TASK_INFO_SHEET_SURFACE_ID = "case-task-info-sheet";
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID =
  "case-message-actions-sheet";

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
};

export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  currentCaseTypeId?: string | null;
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};

export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
};

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  surfaceOpeners: CaseCreationSurfaceOpeners;
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
