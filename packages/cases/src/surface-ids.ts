import type { ReactNode } from "react";
import type { CaseId } from "@beyo/lib";
import type {
  CasesFilterState,
  CaseTypeSelectedDisplay,
  ParticipantSelectionResult,
} from "./types";

export const CASE_CONVERSATION_SURFACE_ID = "case-conversation-slide";
export const CASE_CREATION_SLIDE_SURFACE_ID = "case-creation-slide";
export const CASE_TYPE_PICKER_SHEET_SURFACE_ID = "case-type-picker-sheet";
export const PARTICIPANT_PICKER_SLIDE_SURFACE_ID = "participant-picker-slide";
export const CASE_TASK_INFO_SHEET_SURFACE_ID = "case-task-info-sheet";
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID =
  "case-message-actions-sheet";
export const CASE_FILTER_SHEET_SURFACE_ID = "case-filter-sheet";

export type CaseConversationSurfaceOpeners = {
  renderLinkedTaskCard?: (taskId: string) => ReactNode;
};

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};

export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  currentCaseTypeId?: string | null;
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};

export type ParticipantPickerSlideSurfaceProps = {
  currentParticipants: string[];
  currentSelectedAll: boolean;
  currentSkipParticipants: string[];
  onSave: (result: ParticipantSelectionResult) => void;
};

export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
  openParticipantPicker?: (props: ParticipantPickerSlideSurfaceProps) => void;
};

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  entityClientId?: string;
  title?: string;
  surfaceOpeners: CaseCreationSurfaceOpeners;
};

export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
  renderTaskCard?: (taskId: string) => ReactNode;
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

export type CaseFilterSheetSurfaceProps = {
  currentFilters: CasesFilterState;
  onApply: (filters: CasesFilterState) => void;
};

export type CasesViewSurfaceOpeners = {
  openCaseFilters?: (props: CaseFilterSheetSurfaceProps) => void;
};
