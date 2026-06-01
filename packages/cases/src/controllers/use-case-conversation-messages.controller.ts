import { useEffect, useMemo, useRef, useState } from "react";

import { selectUser, useAuthStore } from "@beyo/auth";
import type { CaseId } from "@beyo/lib";

import {
  CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
  useCaseConversationMessagesQuery,
} from "../api/use-case-conversation-messages";
import type { CaseConversationMessageRaw } from "../types";

export type CaseMessageRenderItem =
  | {
      kind: "date-separator";
      key: string;
      label: string;
    }
  | {
      kind: "message";
      key: string;
      message: CaseConversationMessageRaw;
      isOwnMessage: boolean;
      isNew: boolean;
      shouldAnimateIn: boolean;
    };

export type CaseConversationMessagesController = {
  items: CaseMessageRenderItem[];
  hasOlderPages: boolean;
  isLoadingInitial: boolean;
  isLoadingOlder: boolean;
  isError: boolean;
  distanceFromBottom: number;
  pageCount: number;
  scrollToBottomRequestVersion: number;
  loadOlder: () => void;
  scrollToBottom: () => void;
  handleListScroll: (metrics: { distanceFromBottom: number }) => void;
  retry: () => Promise<void>;
};

type UseCaseConversationMessagesControllerArgs = {
  caseClientId: CaseId;
  lastReadMessageSeq?: number | null;
  requestMarkRead?: (upToMessageSeq: number) => Promise<void>;
};

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  initialMaxSeq: number | null,
  enteringMessageIds: ReadonlySet<string>,
): CaseMessageRenderItem[] {
  const items: CaseMessageRenderItem[] = [];
  let previousDateKey: string | null = null;

  for (const message of messages) {
    const createdAt = new Date(message.created_at);
    const dateKey = getLocalDateKey(createdAt);

    if (dateKey !== previousDateKey) {
      items.push({
        kind: "date-separator",
        key: dateKey,
        label: formatDateLabel(createdAt),
      });
      previousDateKey = dateKey;
    }

    items.push({
      kind: "message",
      key: message.client_id,
      message,
      isOwnMessage: message.created_by?.client_id === currentUserId,
      isNew: initialMaxSeq !== null && message.message_seq > initialMaxSeq,
      shouldAnimateIn: enteringMessageIds.has(message.client_id),
    });
  }

  return items;
}

const LATEST_MESSAGE_VISIBLE_DISTANCE_THRESHOLD = 160;
const MESSAGE_ENTER_ANIMATION_DURATION_MS = 320;

export function useCaseConversationMessagesController({
  caseClientId,
  lastReadMessageSeq,
  requestMarkRead,
}: UseCaseConversationMessagesControllerArgs): CaseConversationMessagesController {
  const currentUserId = useAuthStore(selectUser)?.id ?? null;
  const [scrollToBottomRequestVersion, setScrollToBottomRequestVersion] =
    useState(0);
  const [distanceFromBottom, setDistanceFromBottom] = useState<number | null>(
    null,
  );
  const [enterAnimationVersion, setEnterAnimationVersion] = useState(0);
  const query = useCaseConversationMessagesQuery(caseClientId, {
    messagesLimit: CASE_CONVERSATION_MESSAGES_PAGE_SIZE,
  });

  const messages = useMemo(
    () => flattenMessages(query.data?.pages ?? []),
    [query.data?.pages],
  );

  // Captured once when messages first arrive — the baseline for "new" detection.
  // Any message arriving with seq above this was delivered during the current session.
  const initialMaxSeqRef = useRef<number | null>(null);
  const hasCapturedInitialMessageSnapshotRef = useRef(false);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const activeEnteringMessageIdsRef = useRef<Set<string>>(new Set());
  const newlyDetectedMessageIdsRef = useRef<string[] | null>(null);
  const enterAnimationTimeoutsRef = useRef<Map<string, number>>(new Map());
  if (messages.length > 0 && initialMaxSeqRef.current === null) {
    initialMaxSeqRef.current = Math.max(...messages.map((m) => m.message_seq));
  }

  if (hasCapturedInitialMessageSnapshotRef.current) {
    const nextNewIds = messages
      .map((message) => message.client_id)
      .filter(
        (messageClientId) => !seenMessageIdsRef.current.has(messageClientId),
      );

    if (nextNewIds.length > 0) {
      for (const messageClientId of nextNewIds) {
        seenMessageIdsRef.current.add(messageClientId);
        activeEnteringMessageIdsRef.current.add(messageClientId);
      }

      newlyDetectedMessageIdsRef.current = nextNewIds;
    } else {
      newlyDetectedMessageIdsRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      for (const timeoutId of enterAnimationTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      enterAnimationTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (hasCapturedInitialMessageSnapshotRef.current || !query.data) {
      return;
    }

    seenMessageIdsRef.current = new Set(
      messages.map((message) => message.client_id),
    );
    hasCapturedInitialMessageSnapshotRef.current = true;
  }, [messages, query.data]);

  useEffect(() => {
    const nextNewIds = newlyDetectedMessageIdsRef.current;

    if (!hasCapturedInitialMessageSnapshotRef.current || !nextNewIds) {
      return;
    }

    newlyDetectedMessageIdsRef.current = null;

    for (const messageClientId of nextNewIds) {
      const existingTimeoutId =
        enterAnimationTimeoutsRef.current.get(messageClientId);

      if (existingTimeoutId !== undefined) {
        window.clearTimeout(existingTimeoutId);
      }

      const timeoutId = window.setTimeout(() => {
        enterAnimationTimeoutsRef.current.delete(messageClientId);
        if (!activeEnteringMessageIdsRef.current.has(messageClientId)) {
          return;
        }

        activeEnteringMessageIdsRef.current.delete(messageClientId);
        setEnterAnimationVersion((value) => value + 1);
      }, MESSAGE_ENTER_ANIMATION_DURATION_MS);

      enterAnimationTimeoutsRef.current.set(messageClientId, timeoutId);
    }
  }, [messages]);

  const items = useMemo(
    () =>
      toRenderItems(
        messages,
        currentUserId,
        initialMaxSeqRef.current,
        activeEnteringMessageIdsRef.current,
      ),
    [enterAnimationVersion, messages, currentUserId],
  );
  const latestMessageItem = useMemo(() => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];

      if (item?.kind === "message") {
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
    if (
      !requestMarkRead ||
      !isLatestMessageVisible ||
      latestMessageItem === null
    ) {
      return;
    }

    void requestMarkRead(latestMessageItem.messageSeq);
  }, [
    isLatestMessageVisible,
    lastReadMessageSeq,
    latestMessageItem,
    requestMarkRead,
  ]);

  return {
    items,
    hasOlderPages: Boolean(query.hasNextPage),
    isLoadingInitial: query.isPending && !query.data,
    isLoadingOlder: query.isFetchingNextPage,
    isError: query.isError,
    distanceFromBottom: distanceFromBottom ?? 0,
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
    handleListScroll: (metrics) => {
      setDistanceFromBottom(metrics.distanceFromBottom);
    },
    retry: async () => {
      await query.refetch();
    },
  };
}
