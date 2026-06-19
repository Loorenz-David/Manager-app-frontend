import type { SocketEventHandlers } from "@beyo/realtime";
import type { CaseId } from "@beyo/lib";
import { caseKeys } from "./api/case-keys";

function invalidateConversationMessages(
  queryClient: Parameters<
    NonNullable<SocketEventHandlers["conversation:message-created"]>
  >[1]["queryClient"],
): void {
  queryClient.invalidateQueries({
    queryKey: caseKeys.conversationDetailPagesRoot(),
    refetchType: "active",
  });
}

export const caseSocketEvents: SocketEventHandlers = {
  "case:created": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: caseKeys.lists(),
      refetchType: "active",
    });
  },

  "case:updated": ({ client_id }, { queryClient }) => {
    const caseId = client_id as CaseId;

    queryClient.invalidateQueries({
      queryKey: caseKeys.detail(caseId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.lists(),
      refetchType: "active",
    });
  },

  "case:state-changed": ({ client_id }, { queryClient }) => {
    const caseId = client_id as CaseId;

    queryClient.invalidateQueries({
      queryKey: caseKeys.detail(caseId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.lists(),
      refetchType: "active",
    });
  },

  "case:participant-added": ({ client_id }, { queryClient }) => {
    const caseId = client_id as CaseId;

    queryClient.invalidateQueries({
      queryKey: caseKeys.participantsList(caseId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.detail(caseId),
      refetchType: "active",
    });
  },

  "case:participant-removed": ({ client_id }, { queryClient }) => {
    const caseId = client_id as CaseId;

    queryClient.invalidateQueries({
      queryKey: caseKeys.participantsList(caseId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.detail(caseId),
      refetchType: "active",
    });
  },

  "case:conversation-created": ({ client_id }, { queryClient }) => {
    const caseId = client_id as CaseId;

    queryClient.invalidateQueries({
      queryKey: caseKeys.detail(caseId),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.conversationDetailPagesForCase(caseId),
      refetchType: "active",
    });
  },

  "case:unread-updated": (_payload, { queryClient }) => {
    queryClient.invalidateQueries({
      queryKey: caseKeys.unreadCountsRoot(),
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: caseKeys.globalUnreadCount(),
      refetchType: "active",
    });
  },

  "conversation:message-created": (_payload, { queryClient }) => {
    invalidateConversationMessages(queryClient);
  },

  "conversation:message-edited": (_payload, { queryClient }) => {
    invalidateConversationMessages(queryClient);
  },

  "conversation:message-deleted": (_payload, { queryClient }) => {
    invalidateConversationMessages(queryClient);
  },
};
