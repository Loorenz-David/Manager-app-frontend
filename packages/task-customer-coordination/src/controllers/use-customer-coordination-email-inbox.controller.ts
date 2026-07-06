import { useEffect, useMemo, useState } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import type {
  EmailInboxThreadVM,
  EmailMessageDetailsSheetSurfaceProps,
  EmailMessageVM,
  EmailSwipeAction,
  EmailThreadHeaderAction,
} from "@beyo/emails";
import { notify } from "@beyo/lib";

import { useCompleteCoordination } from "../actions/use-complete-coordination";
import { useFailCoordination } from "../actions/use-fail-coordination";
import { customerCoordinationEmailKeys } from "../api/customer-coordination-email-keys";
import { getEmailUnreadCount } from "../api/get-email-unread-count";
import { useCoordinationInboxThreadsQuery } from "../api/use-coordination-inbox-threads-query";
import { useMarkThreadRead } from "../api/use-mark-thread-read";
import { useThreadMessagesQuery } from "../api/use-thread-messages-query";
import type { CustomerCoordinationEmailInboxSurfaceOpeners } from "../surface-ids";
import type {
  CustomerCoordinationState,
  ThreadMessagesResult,
} from "../types";
import { DEFAULT_COORDINATION_INBOX_FILTER } from "../types";

type UseCustomerCoordinationEmailInboxControllerParams = {
  surfaceOpeners?: CustomerCoordinationEmailInboxSurfaceOpeners;
};

function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    if (value) {
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setDelayed(true);
        }
      }, delayMs);
    } else {
      setDelayed(false);
    }

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [value, delayMs]);

  return delayed;
}

export type CustomerCoordinationEmailInboxController = {
  activeIndex: 0 | 1;
  searchValue: string;
  activeFilterCount: number;
  pendingThreadId: string | null;
  threads: EmailInboxThreadVM[];
  selectedThread: EmailInboxThreadVM | null;
  selectedSubject: string;
  messages: EmailMessageVM[];
  isInboxLoading: boolean;
  isInboxSyncing: boolean;
  inboxError: Error | null;
  isMessagesLoading: boolean;
  isMessagesSyncing: boolean;
  messagesError: Error | null;
  inboxSwipeActions: {
    left: EmailSwipeAction;
    right: EmailSwipeAction;
  };
  threadHeaderActions: EmailThreadHeaderAction[];
  closeSurface?: () => void;
  setSearchValue: (value: string) => void;
  openThread: (thread: EmailInboxThreadVM) => void;
  goBack: () => void;
  refreshInbox: () => Promise<void>;
  refreshThread: () => Promise<void>;
  openImage: (thread: EmailInboxThreadVM) => void;
  openMessageDetails: (message: EmailMessageVM) => void;
  openFilterSheet: () => void;
  openReply: () => void;
};

export function useCustomerCoordinationEmailInboxController({
  surfaceOpeners,
}: UseCustomerCoordinationEmailInboxControllerParams): CustomerCoordinationEmailInboxController {
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [coordinationStates, setCoordinationStates] = useState<
    CustomerCoordinationState[]
  >(DEFAULT_COORDINATION_INBOX_FILTER.coordinationStates);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  // Threads removed from the list optimistically (swipe complete/fail) while the
  // mutation is in flight, so the UI reacts instantly instead of waiting for the
  // server response + refetch. Pruned once refetched data confirms the removal;
  // re-added on error to roll the card back into place.
  const [removedThreadIds, setRemovedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(searchValue.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const inboxParams = useMemo(
    () => ({
      coordination_states: coordinationStates.join(","),
      ...(debouncedQ ? { q: debouncedQ } : {}),
      limit: 50,
      offset: 0,
    }),
    [coordinationStates, debouncedQ],
  );

  const inboxQuery = useCoordinationInboxThreadsQuery(inboxParams);
  const markThreadRead = useMarkThreadRead();
  const failCoordination = useFailCoordination();
  const completeCoordination = useCompleteCoordination();
  const isInboxLoading = useDelayedTrue(inboxQuery.isLoading, 200);
  // Background refetches (search re-query, post-swipe invalidation) resolve fast
  // enough that a raw isFetching flag would flash the "Syncing…" row for a frame
  // and read as an error flicker. Delay it so it only surfaces on genuinely slow
  // syncs, matching how isInboxLoading gates the skeleton.
  const isInboxSyncing = useDelayedTrue(
    inboxQuery.isFetching && !inboxQuery.isPending,
    400,
  );

  const selectedThread =
    (inboxQuery.data?.items ?? []).find(
      (thread) => thread.threadId === selectedThreadId,
    ) ?? null;

  // Seed the thread view with the recent messages we already have from the
  // inbox list (oldest-first) so it renders instantly instead of a full
  // skeleton; the real fetch then fills in the full conversation.
  const seedMessages = selectedThread?.lastMessages ?? null;
  const messagesPlaceholder = useMemo<ThreadMessagesResult | undefined>(
    () =>
      seedMessages && seedMessages.length > 0
        ? { messages: seedMessages, has_more: false }
        : undefined,
    [seedMessages],
  );

  const messagesQuery = useThreadMessagesQuery(
    selectedThreadId,
    { limit: 200, offset: 0 },
    { enabled: activeIndex === 1, placeholderData: messagesPlaceholder },
  );

  const threads = useMemo(() => {
    return (inboxQuery.data?.items ?? []).filter(
      (thread) => !removedThreadIds.has(thread.threadId),
    );
  }, [inboxQuery.data?.items, removedThreadIds]);

  const activeFilterCount = useMemo(() => {
    const def = DEFAULT_COORDINATION_INBOX_FILTER.coordinationStates;
    const isDefault =
      coordinationStates.length === def.length &&
      coordinationStates.every((state) => def.includes(state));
    return isDefault ? 0 : coordinationStates.length;
  }, [coordinationStates]);

  // Once refetched data no longer contains an optimistically removed thread, the
  // server has confirmed the removal, so drop it from the set to keep it minimal.
  useEffect(() => {
    const items = inboxQuery.data?.items;
    if (!items) {
      return;
    }

    setRemovedThreadIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const presentIds = new Set(items.map((thread) => thread.threadId));
      let changed = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (!presentIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [inboxQuery.data?.items]);

  async function refreshInbox(): Promise<void> {
    try {
      await Promise.all([
        inboxQuery.refetch(),
        queryClient.fetchQuery({
          queryKey: customerCoordinationEmailKeys.unreadCount(),
          queryFn: getEmailUnreadCount,
        }),
      ]);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Inbox refresh failed.",
      );
      throw error;
    }
  }

  async function refreshThread(): Promise<void> {
    if (!selectedThreadId) {
      return;
    }

    try {
      await Promise.all([
        messagesQuery.refetch(),
        queryClient.fetchQuery({
          queryKey: customerCoordinationEmailKeys.unreadCount(),
          queryFn: getEmailUnreadCount,
        }),
      ]);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Thread refresh failed.",
      );
      throw error;
    }
  }

  function openThread(thread: EmailInboxThreadVM): void {
    setSelectedThreadId(thread.threadId);
    setActiveIndex(1);

    if (thread.isUnread) {
      void markThreadRead.markThreadRead({ threadId: thread.threadId }).catch((error) => {
        notify.error(
          error instanceof Error ? error.message : "Could not mark the thread as read.",
        );
      });
    }
  }

  function goBack(): void {
    setActiveIndex(0);
    setSelectedThreadId(null);
  }

  function openReply(): void {
    if (!selectedThread) {
      return;
    }

    if (!selectedThread.majorEntityClientId) {
      notify.error("Task id missing for this coordination thread.");
      return;
    }

    surfaceOpeners?.openReplySurface?.({
      taskId: selectedThread.majorEntityClientId,
      threadId: selectedThread.threadId,
      surfaceOpeners: {
        onReplySent: goBack,
      },
    });
  }

  function removeThreadOptimistically(threadId: string): void {
    setRemovedThreadIds((prev) => {
      if (prev.has(threadId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(threadId);
      return next;
    });
  }

  function restoreThreadOptimistically(threadId: string): void {
    setRemovedThreadIds((prev) => {
      if (!prev.has(threadId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  }

  async function completeThread(thread: EmailInboxThreadVM): Promise<void> {
    if (!thread.majorEntityClientId) {
      notify.error("Task id missing for this coordination thread.");
      return;
    }

    if (pendingThreadId === thread.threadId) {
      return;
    }

    // Optimistically drop the card and leave the thread view so the interaction
    // reads as instantaneous; the mutation reconciles the list on settle.
    setPendingThreadId(thread.threadId);
    removeThreadOptimistically(thread.threadId);
    if (selectedThreadId === thread.threadId) {
      goBack();
    }

    try {
      await completeCoordination.completeCoordination({
        taskId: thread.majorEntityClientId,
        coordinationId: thread.entityClientId,
      });
    } catch (error) {
      restoreThreadOptimistically(thread.threadId);
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not complete this coordination.",
      );
      throw error;
    } finally {
      setPendingThreadId((current) =>
        current === thread.threadId ? null : current,
      );
    }
  }

  async function failThread(thread: EmailInboxThreadVM): Promise<void> {
    if (!thread.majorEntityClientId) {
      notify.error("Task id missing for this coordination thread.");
      return;
    }

    if (pendingThreadId === thread.threadId) {
      return;
    }

    // Optimistically drop the card and leave the thread view so the interaction
    // reads as instantaneous; the mutation reconciles the list on settle.
    setPendingThreadId(thread.threadId);
    removeThreadOptimistically(thread.threadId);
    if (selectedThreadId === thread.threadId) {
      goBack();
    }

    try {
      await failCoordination.failCoordination({
        taskId: thread.majorEntityClientId,
        coordinationIds: thread.entityClientId ? [thread.entityClientId] : undefined,
      });
    } catch (error) {
      restoreThreadOptimistically(thread.threadId);
      notify.error(
        error instanceof Error
          ? error.message
          : "Could not mark this coordination as failed.",
      );
      throw error;
    } finally {
      setPendingThreadId((current) =>
        current === thread.threadId ? null : current,
      );
    }
  }

  function openImage(thread: EmailInboxThreadVM): void {
    surfaceOpeners?.openImageViewer?.(
      thread.majorEntityClientId ?? thread.threadId,
      thread.itemClientId,
      thread.imageClientIds,
    );
  }

  function openMessageDetails(message: EmailMessageVM): void {
    const props: EmailMessageDetailsSheetSurfaceProps = {
      fromName: message.fromName,
      fromAddress: message.fromAddress,
      toAddresses: message.toAddresses,
      ccAddresses: message.ccAddresses,
      bccAddresses: message.bccAddresses,
      sentOrReceivedAtIso: message.sentOrReceivedAtIso,
    };

    surfaceOpeners?.openMessageDetails?.(props);
  }

  function openFilterSheet(): void {
    surfaceOpeners?.openFilterSheet?.({
      currentFilters: { coordinationStates },
      onApply: (filters) => setCoordinationStates(filters.coordinationStates),
    });
  }

  const inboxSwipeActions: CustomerCoordinationEmailInboxController["inboxSwipeActions"] =
    {
      left: {
        label: "Completed",
        icon: Check,
        tone: "success",
        onCommit: completeThread,
      },
      right: {
        label: "Failed",
        icon: X,
        tone: "destructive",
        onCommit: failThread,
      },
    };

  const threadHeaderActions: EmailThreadHeaderAction[] = selectedThread
    ? [
        {
          label: "Complete",
          icon: Check,
          tone: "success",
          onPress: () => completeThread(selectedThread),
        },
        {
          label: "Fail",
          icon: TriangleAlert,
          tone: "destructive",
          onPress: () => failThread(selectedThread),
        },
      ]
    : [];

  return {
    activeIndex,
    searchValue,
    activeFilterCount,
    pendingThreadId,
    threads,
    selectedThread,
    selectedSubject: selectedThread?.subject ?? "Conversation",
    messages: messagesQuery.data?.messages ?? [],
    isInboxLoading,
    isInboxSyncing,
    inboxError: inboxQuery.error ?? null,
    isMessagesLoading: messagesQuery.isPending,
    isMessagesSyncing: messagesQuery.isFetching && !messagesQuery.isPending,
    messagesError: messagesQuery.error ?? null,
    inboxSwipeActions,
    threadHeaderActions,
    closeSurface: surfaceOpeners?.closeSurface,
    setSearchValue,
    openThread,
    goBack,
    refreshInbox,
    refreshThread,
    openImage,
    openMessageDetails,
    openFilterSheet,
    openReply,
  };
}
