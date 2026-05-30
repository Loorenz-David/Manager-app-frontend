import type { CaseConversationId, CaseId } from "@beyo/lib";
import type { ListCasesParams, ListMessagesParams } from "../types";

export const caseKeys = {
  all: ["cases"] as const,
  lists: () => [...caseKeys.all, "list"] as const,
  list: (params: ListCasesParams = {}) =>
    [...caseKeys.lists(), params] as const,
  details: () => [...caseKeys.all, "detail"] as const,
  detail: (id: CaseId) => [...caseKeys.details(), id] as const,
  conversationDetailPagesRoot: () =>
    [...caseKeys.all, "conversation-detail-pages"] as const,
  conversationDetailPagesForCase: (caseId: CaseId) =>
    [...caseKeys.conversationDetailPagesRoot(), caseId] as const,
  conversationDetailPages: (
    caseId: CaseId,
    params: { messages_limit: number },
  ) => [...caseKeys.conversationDetailPagesForCase(caseId), params] as const,
  linksRoot: () => [...caseKeys.all, "links"] as const,
  links: (caseId: CaseId) => [...caseKeys.linksRoot(), caseId] as const,
  unreadCountsRoot: () => [...caseKeys.all, "unread-counts"] as const,
  globalUnreadCount: () => [...caseKeys.all, "global-unread-count"] as const,
  unreadCounts: (caseClientIds?: string[]) =>
    [...caseKeys.unreadCountsRoot(), caseClientIds] as const,
  participantsList: (caseId: CaseId) =>
    [...caseKeys.all, "participants", caseId] as const,
  conversationMessages: (
    conversationId: CaseConversationId,
    params: Partial<ListMessagesParams> = {},
  ) =>
    [...caseKeys.all, "conversation-messages", conversationId, params] as const,
};
