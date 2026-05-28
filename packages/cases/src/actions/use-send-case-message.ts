import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import type { ApiRequestError } from "@beyo/api-client";
import { selectUser, useAuthStore } from "@beyo/auth";
import type { CaseId } from "@beyo/lib";

import { caseKeys } from "../api/case-keys";
import { sendMessage } from "../api/send-message";
import type {
  CaseConversationMessageRaw,
  CaseDetailRaw,
  SendMessageInput,
} from "../types";

function insertMessageIntoPages(
  data: InfiniteData<CaseDetailRaw> | undefined,
  message: CaseConversationMessageRaw,
): InfiniteData<CaseDetailRaw> | undefined {
  if (!data || data.pages.length === 0) {
    return data;
  }

  const alreadyPresent = data.pages.some((page) =>
    page.case_conversation_messages.some(
      (m) => m.client_id === message.client_id,
    ),
  );

  if (alreadyPresent) {
    return data;
  }

  const [firstPage, ...restPages] = data.pages;

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        case_conversation_messages: [
          ...firstPage.case_conversation_messages,
          message,
        ],
      },
      ...restPages,
    ],
  };
}

export function useSendCaseMessage(caseClientId: CaseId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(input),
    onSuccess: (createdMessage) => {
      // The send-message API response may not include `created_by`.
      // Enrich it from the auth store so `isOwnMessage` resolves correctly
      // before the next full refetch populates the field from the server.
      let messageToInsert = createdMessage;
      if (!createdMessage.created_by) {
        const currentUser = selectUser(useAuthStore.getState());
        if (currentUser) {
          messageToInsert = {
            ...createdMessage,
            created_by: {
              client_id: currentUser.id,
              username: currentUser.username,
              profile_picture: null,
            },
          };
        }
      }

      queryClient.setQueriesData<InfiniteData<CaseDetailRaw>>(
        { queryKey: caseKeys.conversationDetailPagesForCase(caseClientId) },
        (data) => insertMessageIntoPages(data, messageToInsert),
      );
      void queryClient.invalidateQueries({
        queryKey: caseKeys.conversationDetailPagesForCase(caseClientId),
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.detail(caseClientId),
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: caseKeys.lists(),
        refetchType: "none",
      });
    },
  });

  return {
    sendCaseMessage: mutation.mutate,
    sendCaseMessageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as ApiRequestError | null,
    reset: mutation.reset,
  };
}
