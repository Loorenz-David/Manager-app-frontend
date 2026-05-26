export { CasesView } from './components/CasesView';
export { CasesViewProvider } from './providers/CasesViewProvider';
export {
  CaseConversationProvider,
  useCaseConversationContext,
  useCaseConversationMessagesContext,
} from './providers/CaseConversationProvider';
export { useCaseConversationMessagesQuery } from './api/use-case-conversation-messages';
export {
  caseSurfaces,
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from './surfaces';
export type {
  CaseConversationSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
} from './surfaces';
export { useGetCaseQuery } from './api/use-get-case';
export { useCaseLinksQuery } from './api/use-case-links';
export { useCaseParticipantsQuery } from './api/use-case-participants';
export { useDeleteCaseMessage } from './actions/use-delete-case-message';
export { useEditCaseMessage } from './actions/use-edit-case-message';
export { useUpdateCaseState } from './actions/use-update-case-state';
export { useMarkCaseRead } from './actions/use-mark-case-read';
export { useSendCaseMessage } from './actions/use-send-case-message';
export {
  fromBackendMessageContent,
  toBackendMessageContent,
  toBackendPlainText,
} from './lib/message-content-adapter';
export type {
  CaseConversationMessagesController,
  CaseMessageRenderItem,
} from './controllers/use-case-conversation-messages.controller';
export type {
  CaseInlinePart,
  CaseInlinePartMarks,
  CaseLabelInlinePart,
  CaseLinkInlinePart,
  CaseMentionInlinePart,
  CaseMentionReference,
  CaseMessageContent,
  CaseTextInlinePart,
} from './message-content';
export type {
  AddParticipantsInput,
  CaseConversationMessageRaw,
  CaseDetailBase,
  CaseDetailRaw,
  CaseListCardRaw,
  CaseListCardViewModel,
  CaseLink,
  CaseParticipant,
  CaseTaskSnapshot,
  CaseUserSnapshot,
  CreateCaseInput,
  EditMessageInput,
  LinkEntityInput,
  ListCasesParams,
  ListMessagesParams,
  MarkReadInput,
  MentionResolution,
  MessageContentBlock,
  SendMessageInput,
  UpdateCaseStateInput,
} from './types';
export {
  CASE_LINK_ENTITY_TYPE,
  CASE_LINK_ROLE,
  CASE_STATE,
  MESSAGE_CONTENT_BLOCK_TYPE,
  toCaseListCardViewModel,
} from './types';
