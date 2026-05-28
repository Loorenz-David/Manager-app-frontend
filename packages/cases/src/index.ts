export { CasesRouteEntry } from "./route-entry";
export { CaseConversationRouteEntry } from "./components/CaseConversationRouteEntry";
export { CaseConversationRouteHydrator } from "./components/CaseConversationRouteHydrator";

export {
  CasesViewProvider,
  useCasesViewContext,
} from "./providers/CasesViewProvider";
export {
  CaseConversationProvider,
  useCaseConversationContext,
  useCaseConversationMessagesContext,
} from "./providers/CaseConversationProvider";

export {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  CaseConversationSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
} from "./surface-ids";

export {
  CASE_STATE,
  CASE_LINK_ENTITY_TYPE,
  CASE_LINK_ROLE,
  MESSAGE_CONTENT_BLOCK_TYPE,
  getCaseTypeImageUrl,
  getCaseTypeName,
  toCaseListCardViewModel,
} from "./types";
export type {
  CaseListCardViewModel,
  CaseDetailRaw,
  CaseDetailBase,
  CaseConversationMessageRaw,
  CaseLink,
  CaseParticipant,
  SendMessageInput,
  CaseListCardRaw,
  CaseUserSnapshot,
  CaseTaskSnapshot,
} from "./types";

export type { CaseMessageContent, CaseInlinePart } from "./message-content";

export {
  fromBackendMessageContent,
  toBackendMessageContent,
  toBackendPlainText,
} from "./lib/message-content-adapter";
export {
  dispatchCaseMessageEditRequest,
  CASE_MESSAGE_EDIT_REQUEST_EVENT,
} from "./lib/case-message-edit-events";

export {
  useCaseConversationMessagesQuery,
  CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
} from "./api/use-case-conversation-messages";
export { useGetCaseQuery } from "./api/use-get-case";
export { useCaseLinksQuery } from "./api/use-case-links";
export { useCaseParticipantsQuery } from "./api/use-case-participants";
export { useListCasesQuery } from "./api/use-list-cases";

export { useDeleteCaseMessage } from "./actions/use-delete-case-message";
export { useEditCaseMessage } from "./actions/use-edit-case-message";
export { useMarkCaseRead } from "./actions/use-mark-case-read";
export { useSendCaseMessage } from "./actions/use-send-case-message";
export { useUpdateCaseState } from "./actions/use-update-case-state";

export type { CaseConversationController } from "./controllers/use-case-conversation.controller";
export type { CasesViewController } from "./controllers/use-cases-view.controller";
export type {
  CaseConversationMessagesController,
  CaseMessageRenderItem,
} from "./controllers/use-case-conversation-messages.controller";
