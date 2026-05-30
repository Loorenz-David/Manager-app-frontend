export { CasesRouteEntry } from "./route-entry";
export { CasesView } from "./components/CasesView";
export { CaseConversationRouteEntry } from "./components/CaseConversationRouteEntry";
export { CaseConversationRouteHydrator } from "./components/CaseConversationRouteHydrator";
export { CaseCreationRouteEntry } from "./components/CaseCreationRouteEntry";
export { CaseCreationFormContent } from "./components/CaseCreationFormContent";
export { CaseInitialMessageComposer } from "./components/CaseInitialMessageComposer";
export { CaseFilterSheetRouteEntry } from "./components/CaseFilterSheetRouteEntry";
export { ParticipantPickerRouteEntry } from "./components/ParticipantPickerRouteEntry";
export { CaseTypePickerRouteEntry } from "./components/CaseTypePickerRouteEntry";

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
  CaseCreationFormProvider,
  useCaseCreationFormContext,
} from "./providers/CaseCreationFormProvider";

export {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  CaseConversationSurfaceOpeners,
  CaseCreationSurfaceOpeners,
  CaseConversationSurfaceProps,
  CaseCreationSlideSurfaceProps,
  CaseTypePickerSheetSurfaceProps,
  ParticipantPickerSlideSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
  CaseFilterSheetSurfaceProps,
  CasesViewSurfaceOpeners,
} from "./surface-ids";

export {
  CASE_STATE,
  CASE_LINK_ENTITY_TYPE,
  CASE_LINK_ROLE,
  MESSAGE_CONTENT_BLOCK_TYPE,
  DEFAULT_CASES_FILTER,
  getCaseTypeImageUrl,
  getCaseTypeName,
  toCaseListCardViewModel,
} from "./types";
export type {
  CaseTypeId,
  CaseType,
  CaseTypeSelectedDisplay,
  ListCaseTypesParams,
  UserCompact,
  ListUsersParams,
  ParticipantSelectedDisplay,
  ParticipantSelectionResult,
  CaseCreationFormValues,
  CaseListCardViewModel,
  CasesFilterState,
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
export { useListCaseTypesQuery } from "./api/use-list-case-types";
export { useListUsersQuery } from "./api/use-list-users-query";
export { useGlobalCaseUnreadCountQuery } from "./api/use-global-case-unread-count";
export { useUnreadCountsQuery } from "./api/use-unread-counts";
export { prefetchCasesData, prefetchCasesListData } from "./api/prefetch-cases";

export { useDeleteCaseMessage } from "./actions/use-delete-case-message";
export { useEditCaseMessage } from "./actions/use-edit-case-message";
export { useMarkCaseRead } from "./actions/use-mark-case-read";
export { useCreateCase } from "./actions/use-create-case";
export { useSendCaseMessage } from "./actions/use-send-case-message";
export { useUpdateCaseState } from "./actions/use-update-case-state";
export type { CreateCaseAction } from "./actions/use-create-case";

export type { CaseConversationController } from "./controllers/use-case-conversation.controller";
export type {
  CasesViewController,
  CasesViewControllerParams,
} from "./controllers/use-cases-view.controller";
export type {
  CaseConversationMessagesController,
  CaseMessageRenderItem,
} from "./controllers/use-case-conversation-messages.controller";
