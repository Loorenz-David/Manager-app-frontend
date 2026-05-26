import { useEffect, useMemo, useState } from 'react';

import { selectUser, useAuthStore } from '@/store/auth.store';
import type { CaseId } from '@/types/common';

import {
  CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
  useCaseConversationMessagesQuery,
} from '../api/use-case-conversation-messages';
import type { CaseConversationMessageRaw } from '../types';

export type CaseMessageRenderItem =
  | {
      kind: 'date-separator';
      key: string;
      label: string;
    }
  | {
      kind: 'message';
      key: string;
      message: CaseConversationMessageRaw;
      isOwnMessage: boolean;
    };

export type CaseConversationMessagesController = {
  items: CaseMessageRenderItem[];
  hasOlderPages: boolean;
  isLoadingInitial: boolean;
  isLoadingOlder: boolean;
  isError: boolean;
  pageCount: number;
  scrollToBottomRequestVersion: number;
  loadOlder: () => void;
  scrollToBottom: () => void;
  handleListScroll: (scrollTop: number) => void;
  retry: () => Promise<void>;
};

type UseCaseConversationMessagesControllerArgs = {
  caseClientId: CaseId;
  lastReadMessageSeq?: number | null;
  onListScrollTopChange?: (scrollTop: number) => void;
  requestMarkRead?: (upToMessageSeq: number) => Promise<void>;
};

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function flattenMessages(
  pages: readonly {
    case_conversation_messages: CaseConversationMessageRaw[];
  }[],
) {
  const seenKeys = new Set<string>();
  const chronologicalMessages: CaseConversationMessageRaw[] = [];

  for (const page of [...pages].reverse()) {
    for (const message of page.case_conversation_messages) {
      if (seenKeys.has(message.client_id)) {
        continue;
      }

      seenKeys.add(message.client_id);
      chronologicalMessages.push(message);
    }
  }

  return chronologicalMessages;
}

function toRenderItems(
  messages: CaseConversationMessageRaw[],
  currentUserId: string | null,
): CaseMessageRenderItem[] {
  const items: CaseMessageRenderItem[] = [];
  let previousDateKey: string | null = null;

  for (const message of messages) {
    const createdAt = new Date(message.created_at);
    const dateKey = getLocalDateKey(createdAt);

    if (dateKey !== previousDateKey) {
      items.push({
        kind: 'date-separator',
        key: dateKey,
        label: formatDateLabel(createdAt),
      });
      previousDateKey = dateKey;
    }

    items.push({
      kind: 'message',
      key: message.client_id,
      message,
      isOwnMessage: message.created_by?.client_id === currentUserId,
    });
  }

  return items;
}

const LATEST_MESSAGE_VISIBLE_DISTANCE_THRESHOLD = 160;

export function useCaseConversationMessagesController({
  caseClientId,
  lastReadMessageSeq,
  onListScrollTopChange,
  requestMarkRead,
}: UseCaseConversationMessagesControllerArgs): CaseConversationMessagesController {
  const currentUserId = useAuthStore(selectUser)?.id ?? null;
  const [scrollToBottomRequestVersion, setScrollToBottomRequestVersion] = useState(0);
  const [distanceFromBottom, setDistanceFromBottom] = useState<number | null>(null);
  const query = useCaseConversationMessagesQuery(caseClientId, {
    messagesLimit: CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
  });

  const messages = useMemo(
    () => flattenMessages(query.data?.pages ?? []),
    [query.data?.pages],
  );

  const items = useMemo(() => toRenderItems(messages, currentUserId), [messages, currentUserId]);
  const latestMessageItem = useMemo(() => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];

      if (item?.kind === 'message') {
        return {
          messageSeq: item.message.message_seq,
        };
      }
    }

    return null;
  }, [items]);
  const isLatestMessageVisible =
    latestMessageItem !== null &&
    distanceFromBottom !== null &&
    distanceFromBottom <= LATEST_MESSAGE_VISIBLE_DISTANCE_THRESHOLD;

  useEffect(() => {
    if (!requestMarkRead || !isLatestMessageVisible || latestMessageItem === null) {
      return;
    }

    void requestMarkRead(latestMessageItem.messageSeq);
  }, [isLatestMessageVisible, lastReadMessageSeq, latestMessageItem, requestMarkRead]);

  return {
    items,
    hasOlderPages: Boolean(query.hasNextPage),
    isLoadingInitial: query.isPending && !query.data,
    isLoadingOlder: query.isFetchingNextPage,
    isError: query.isError,
    pageCount: query.data?.pages.length ?? 0,
    scrollToBottomRequestVersion,
    loadOlder: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    scrollToBottom: () => {
      setScrollToBottomRequestVersion((value) => value + 1);
    },
    handleListScroll: (scrollTop: number) => {
      setDistanceFromBottom(scrollTop);
      onListScrollTopChange?.(scrollTop);
    },
    retry: async () => {
      await query.refetch();
    },
  };
}
