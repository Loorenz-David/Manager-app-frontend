import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import type { ApiRequestError } from "@/lib/api-client";
import { ROUTES } from "@/lib/routes";
import { useGetTaskQuery } from "@/features/tasks/api/use-get-task-query";
import {
  RETURN_SOURCE_LABEL,
  TASK_TYPE_LABEL,
} from "@/features/tasks/lib/task-detail";
import { useSurface } from "@/hooks/use-surface";
import { selectUser, useAuthStore } from "@/store/auth.store";
import type { CaseId, UserId } from "@/types/common";

import { useDeleteCaseMessage } from "../actions/use-delete-case-message";
import { useEditCaseMessage } from "../actions/use-edit-case-message";
import { useMarkCaseRead } from "../actions/use-mark-case-read";
import { useSendCaseMessage } from "../actions/use-send-case-message";
import { useCaseParticipantsQuery } from "../api/use-case-participants";
import { useUpdateCaseState } from "../actions/use-update-case-state";
import { caseKeys } from "../api/case-keys";
import { useCaseLinksQuery } from "../api/use-case-links";
import { useGetCaseQuery } from "../api/use-get-case";
import {
  CASE_MESSAGE_EDIT_REQUEST_EVENT,
  type CaseMessageEditRequestDetail,
} from "../lib/case-message-edit-events";
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from "../surfaces";
import { ENABLE_TYPING_STUB } from "../lib/typing-indicator-flags";
import { getCaseTypeName } from "../types";
import type {
  CaseConversationMessageRaw,
  CaseDetailBase,
  CaseDetailRaw,
  CaseLink,
  CaseListCardRaw,
  CaseParticipant,
} from "../types";

type CaseState = CaseDetailBase["state"];

type StateTransition = {
  label: string;
  nextState: CaseState;
};

const CONTEXT_BANNER_COLLAPSE_THRESHOLD = 56;
const CONTEXT_BANNER_EXPAND_THRESHOLD = 8;
const SCROLL_DIRECTION_THRESHOLD = 6;

type ConversationScrollMetrics = {
  distanceFromBottom: number;
  scrollTop: number;
  isLayoutCompensation?: boolean;
};

export type CaseConversationController = {
  caseDetail: CaseDetailRaw | undefined;
  currentParticipant: CaseParticipant | null;
  taskDetail: ReturnType<typeof useGetTaskQuery>["data"];
  currentUserId: UserId | null;
  lastReadMessageSeq: number | null;
  taskClientId: string | null;
  primaryLabel: string;
  subtitle: string;
  canOpenInfo: boolean;
  stateActionLabel: string | null;
  nextState: CaseState | null;
  isContextBannerCollapsed: boolean;
  typingIndicatorText: string | null;
  draftText: string;
  editingMessageId: CaseConversationMessageRaw["client_id"] | null;
  editingDraftText: string;
  isSending: boolean;
  isSubmittingEdit: boolean;
  isPendingCase: boolean;
  isPendingTask: boolean;
  isAdvancingState: boolean;
  isError: boolean;
  sendError: ApiRequestError | Error | null;
  editError: ApiRequestError | Error | null;
  setBodyScrollTop: (metrics: ConversationScrollMetrics) => void;
  setDraftText: (value: string) => void;
  setEditingDraftText: (value: string) => void;
  resetScrollChrome: () => void;
  closeConversation: () => void;
  openInfo: () => void;
  openMessageActions: (message: CaseConversationMessageRaw) => void;
  startEditing: (message: CaseConversationMessageRaw) => void;
  cancelEditing: () => void;
  advanceState: () => Promise<void>;
  requestMarkRead: (upToMessageSeq: number) => Promise<void>;
  refetch: () => Promise<void>;
  sendDraft: () => Promise<void>;
  submitEdit: () => Promise<void>;
};

type UseCaseConversationControllerOptions = {
  scrollToBottom?: () => void;
};

function resolveTaskLink(links: CaseLink[] | undefined): CaseLink | null {
  if (!links) {
    return null;
  }

  const taskLinks = links.filter((link) => link.entity_type === "task");

  return (
    taskLinks.find((link) => link.role === "subject") ?? taskLinks[0] ?? null
  );
}

function getStateTransition(
  state: CaseState | null | undefined,
): StateTransition | null {
  if (state === "open") {
    return {
      label: "Process",
      nextState: "resolving",
    };
  }

  if (state === "resolving") {
    return {
      label: "Resolve",
      nextState: "resolved",
    };
  }

  return null;
}

function getTaskTypeLabel(taskType: string | null | undefined): string | null {
  if (!taskType || !(taskType in TASK_TYPE_LABEL)) {
    return null;
  }

  return TASK_TYPE_LABEL[taskType as keyof typeof TASK_TYPE_LABEL];
}

function getReturnSourceLabel(
  returnSource: string | null | undefined,
): string | null {
  if (!returnSource || !(returnSource in RETURN_SOURCE_LABEL)) {
    return null;
  }

  return RETURN_SOURCE_LABEL[returnSource as keyof typeof RETURN_SOURCE_LABEL];
}

function getMessageDisplayText(message: CaseConversationMessageRaw): string {
  if (message.plain_text.trim().length > 0) {
    return message.plain_text;
  }

  return (
    message.content
      ?.map((block) => block.text || block.label_value || block.link || "")
      .join("")
      .trim() ?? ""
  );
}

function resolveCachedCaseSnapshot(
  caseLists: Array<[readonly unknown[], CaseListCardRaw[] | undefined]>,
  caseClientId: CaseId,
): CaseListCardRaw | null {
  for (const [, cases] of caseLists) {
    const snapshot = cases?.find((item) => item.client_id === caseClientId);

    if (snapshot) {
      return snapshot;
    }
  }

  return null;
}

export function useCaseConversationController(
  caseClientId: CaseId,
  options: UseCaseConversationControllerOptions = {},
): CaseConversationController {
  const queryClient = useQueryClient();
  const surface = useSurface();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserId = useAuthStore(selectUser)?.id ?? null;
  const [isContextBannerCollapsed, setIsContextBannerCollapsed] =
    useState(false);
  const [draftText, setDraftTextState] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<
    CaseConversationMessageRaw["client_id"] | null
  >(null);
  const [editingDraftText, setEditingDraftTextState] = useState("");
  const [editingOriginalText, setEditingOriginalText] = useState("");
  const [editingMessageSeq, setEditingMessageSeq] = useState<number | null>(
    null,
  );
  const [localSendError, setLocalSendError] = useState<Error | null>(null);
  const [localEditError, setLocalEditError] = useState<Error | null>(null);
  const hasObservedInitialScrollRef = useRef(false);
  const lastListScrollTopRef = useRef(0);
  const accumulatedScrollIntentRef = useRef(0);
  const lastRequestedReadSeqRef = useRef(0);
  const lastAcknowledgedReadSeqRef = useRef(0);

  const caseQuery = useGetCaseQuery(caseClientId, { messages_limit: 10 });
  const cachedCaseSnapshot = useMemo(
    () =>
      resolveCachedCaseSnapshot(
        queryClient.getQueriesData<CaseListCardRaw[]>({
          queryKey: caseKeys.lists(),
        }),
        caseClientId,
      ),
    [caseClientId, queryClient],
  );
  const participantsQuery = useCaseParticipantsQuery(caseClientId);
  const linksQuery = useCaseLinksQuery(caseClientId);
  const taskLink = useMemo(
    () => resolveTaskLink(linksQuery.data),
    [linksQuery.data],
  );
  const taskClientId =
    taskLink?.entity_client_id ?? cachedCaseSnapshot?.task?.client_id ?? null;
  const taskQuery = useGetTaskQuery(taskClientId);
  const conversationClientId =
    caseQuery.data?.case.conversation_client_id ?? null;

  const markCaseReadMutation = useMarkCaseRead();
  const sendCaseMessageMutation = useSendCaseMessage(caseClientId);
  const editCaseMessageMutation = useEditCaseMessage({
    caseClientId,
    conversationClientId,
  });
  const deleteCaseMessageMutation = useDeleteCaseMessage({
    caseClientId,
    conversationClientId,
  });
  const stateMutation = useUpdateCaseState(caseClientId);
  const currentParticipant =
    participantsQuery.data?.find(
      (participant) => participant.user_id === currentUserId,
    ) ?? null;
  const lastReadMessageSeq = currentParticipant?.last_read_message_seq ?? null;

  if ((lastReadMessageSeq ?? 0) > lastAcknowledgedReadSeqRef.current) {
    lastAcknowledgedReadSeqRef.current = lastReadMessageSeq ?? 0;
  }

  const transition = getStateTransition(caseQuery.data?.case.state);
  const typingIndicatorText =
    ENABLE_TYPING_STUB && caseQuery.data?.case
      ? "Writing..."
      : null;
  const closeConversation = () => {
    surface.close(CASE_CONVERSATION_SURFACE_ID);

    const state = location.state as
      | {
          background?: {
            pathname: string;
            search: string;
          };
        }
      | undefined;

    if (state?.background) {
      navigate(`${state.background.pathname}${state.background.search}`, {
        replace: true,
        state: {
          skipTabAnimation: true,
        },
      });
      return;
    }

    if (location.pathname.startsWith(`${ROUTES.cases}/`)) {
      navigate(ROUTES.cases, {
        replace: true,
        state: {
          skipTabAnimation: true,
        },
      });
      return;
    }
  };

  const caseDetailTypeName = getCaseTypeName(
    caseQuery.data?.case.case_type,
    caseQuery.data?.case.type_label ?? "",
  );
  const cachedCaseTypeName = getCaseTypeName(
    cachedCaseSnapshot?.case_type,
    cachedCaseSnapshot?.type_label ?? "",
  );

  const primaryLabel =
    taskQuery.data?.item?.article_number ??
    taskQuery.data?.item?.sku ??
    cachedCaseSnapshot?.task?.item?.article_number ??
    cachedCaseSnapshot?.task?.item?.sku ??
    (caseDetailTypeName || undefined) ??
    (cachedCaseTypeName || undefined) ??
    "Case";

  const subtitleSegments = [
    taskQuery.data?.task.task_type
      ? getTaskTypeLabel(taskQuery.data.task.task_type)
      : getTaskTypeLabel(cachedCaseSnapshot?.task?.task_type),
    taskQuery.data?.task.return_source
      ? getReturnSourceLabel(taskQuery.data.task.return_source)
      : getReturnSourceLabel(cachedCaseSnapshot?.task?.return_source),
  ].filter((value): value is string => Boolean(value));

  const subtitle = subtitleSegments.join(" • ") || "Case conversation";
  const isTaskContextAvailable = Boolean(taskClientId) && !taskQuery.isError;
  const isTaskContextPending =
    Boolean(taskClientId) &&
    !taskQuery.data &&
    (linksQuery.isPending || taskQuery.isPending);
  const isHardConversationError = caseQuery.isError;

  const setBodyScrollTop = ({
    distanceFromBottom,
    scrollTop,
    isLayoutCompensation,
  }: ConversationScrollMetrics) => {
    const nextDistanceFromBottom = Math.max(0, distanceFromBottom);
    const nextScrollTop = Math.max(0, scrollTop);

    if (!hasObservedInitialScrollRef.current) {
      hasObservedInitialScrollRef.current = true;
      lastListScrollTopRef.current = nextScrollTop;
      accumulatedScrollIntentRef.current = 0;
      setIsContextBannerCollapsed(false);
      return;
    }

    const delta = nextScrollTop - lastListScrollTopRef.current;
    lastListScrollTopRef.current = nextScrollTop;

    if (isLayoutCompensation) {
      return;
    }

    if (delta === 0) {
      return;
    }

    if (
      accumulatedScrollIntentRef.current !== 0 &&
      Math.sign(delta) !== Math.sign(accumulatedScrollIntentRef.current)
    ) {
      accumulatedScrollIntentRef.current = 0;
    }

    accumulatedScrollIntentRef.current += delta;

    if (
      Math.abs(accumulatedScrollIntentRef.current) < SCROLL_DIRECTION_THRESHOLD
    ) {
      return;
    }

    const directionalDelta = accumulatedScrollIntentRef.current;
    accumulatedScrollIntentRef.current = 0;

    setIsContextBannerCollapsed((previous) => {
      if (
        !previous &&
        directionalDelta < 0 &&
        nextDistanceFromBottom >= CONTEXT_BANNER_COLLAPSE_THRESHOLD
      ) {
        return true;
      }

      if (
        previous &&
        directionalDelta > 0 &&
        nextDistanceFromBottom <= CONTEXT_BANNER_EXPAND_THRESHOLD
      ) {
        return false;
      }

      return previous;
    });
  };

  const resetScrollChrome = () => {
    hasObservedInitialScrollRef.current = false;
    lastListScrollTopRef.current = 0;
    accumulatedScrollIntentRef.current = 0;
    setIsContextBannerCollapsed(false);
  };

  const requestMarkRead = async (upToMessageSeq: number) => {
    if (!currentParticipant || upToMessageSeq <= 0) {
      return;
    }

    const readSequenceFloor = Math.max(
      lastRequestedReadSeqRef.current,
      lastAcknowledgedReadSeqRef.current,
      lastReadMessageSeq ?? 0,
    );

    if (upToMessageSeq <= readSequenceFloor) {
      return;
    }

    lastRequestedReadSeqRef.current = upToMessageSeq;

    try {
      const acknowledgedReadSeq = await markCaseReadMutation.markCaseReadAsync({
        caseClientId,
        caseParticipantClientId: currentParticipant.client_id,
        upToMessageSeq,
      });

      lastAcknowledgedReadSeqRef.current = Math.max(
        lastAcknowledgedReadSeqRef.current,
        acknowledgedReadSeq,
      );
    } catch {
      lastRequestedReadSeqRef.current = lastAcknowledgedReadSeqRef.current;
    }
  };

  const setDraftText = (value: string) => {
    setDraftTextState(value);

    if (localSendError) {
      setLocalSendError(null);
    }

    if (sendCaseMessageMutation.error) {
      sendCaseMessageMutation.reset();
    }
  };

  const setEditingDraftText = (value: string) => {
    setEditingDraftTextState(value);

    if (localEditError) {
      setLocalEditError(null);
    }

    if (editCaseMessageMutation.error) {
      editCaseMessageMutation.reset();
    }
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingDraftTextState("");
    setEditingOriginalText("");
    setEditingMessageSeq(null);
    setLocalEditError(null);
    editCaseMessageMutation.reset();
  };

  const startEditing = (message: CaseConversationMessageRaw) => {
    if (
      message.has_been_deleted ||
      message.created_by?.client_id !== currentUserId
    ) {
      return;
    }

    const messageText = getMessageDisplayText(message);

    setEditingMessageId(message.client_id);
    setEditingDraftTextState(messageText);
    setEditingOriginalText(messageText);
    setEditingMessageSeq(message.message_seq);
    setLocalEditError(null);
    editCaseMessageMutation.reset();
    surface.close(CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID);
  };

  const openMessageActions = (message: CaseConversationMessageRaw) => {
    const isOwnMessage = message.created_by?.client_id === currentUserId;
    const canEdit = isOwnMessage && !message.has_been_deleted;
    const canDelete = isOwnMessage && !message.has_been_deleted;

    if (!canEdit && !canDelete) {
      return;
    }

    surface.open(CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID, {
      caseClientId,
      messageClientId: message.client_id,
      messageSeq: message.message_seq,
      messageText: getMessageDisplayText(message),
      canEdit,
      canDelete,
      onRequestDelete: async () => {
        await deleteCaseMessageMutation.deleteCaseMessageAsync(
          message.client_id,
        );
        if (editingMessageId === message.client_id) {
          cancelEditing();
        }
        surface.close(CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID);
      },
    });
  };

  useEffect(() => {
    const handleEditRequest = (event: Event) => {
      const detail = (event as CustomEvent<CaseMessageEditRequestDetail>)
        .detail;

      if (!detail?.messageClientId) {
        return;
      }

      setEditingMessageId(
        detail.messageClientId as CaseConversationMessageRaw["client_id"],
      );
      setEditingDraftTextState(detail.messageText);
      setEditingOriginalText(detail.messageText);
      setEditingMessageSeq(detail.messageSeq);
      setLocalEditError(null);
    };

    window.addEventListener(CASE_MESSAGE_EDIT_REQUEST_EVENT, handleEditRequest);

    return () => {
      window.removeEventListener(
        CASE_MESSAGE_EDIT_REQUEST_EVENT,
        handleEditRequest,
      );
    };
  }, [caseClientId]);

  const sendDraft = async () => {
    const trimmedDraftText = draftText.trim();

    if (trimmedDraftText.length === 0) {
      return;
    }

    if (!conversationClientId) {
      setLocalSendError(new Error("Conversation is not available yet."));
      sendCaseMessageMutation.reset();
      return;
    }

    if (localSendError) {
      setLocalSendError(null);
    }

    sendCaseMessageMutation.reset();

    try {
      const createdMessage = await sendCaseMessageMutation.sendCaseMessageAsync(
        {
          conversation_client_id: conversationClientId,
          content: [
            {
              type: "text",
              text: trimmedDraftText,
              mention: null,
              label_value: null,
              link: null,
            },
          ],
          plain_text: trimmedDraftText,
        },
      );

      setDraftTextState("");
      options.scrollToBottom?.();
      await requestMarkRead(createdMessage.message_seq);
    } catch (error) {
      setLocalSendError(
        error instanceof Error
          ? error
          : new Error("Message could not be sent."),
      );
    }
  };

  const sendError = localSendError ?? sendCaseMessageMutation.error;
  const editError = localEditError ?? editCaseMessageMutation.error;
  const submitEdit = async () => {
    if (!editingMessageId) {
      return;
    }

    const trimmedEditingDraftText = editingDraftText.trim();

    if (trimmedEditingDraftText.length === 0) {
      return;
    }

    if (trimmedEditingDraftText === editingOriginalText.trim()) {
      cancelEditing();
      return;
    }

    if (localEditError) {
      setLocalEditError(null);
    }

    editCaseMessageMutation.reset();

    try {
      const editedMessage = await editCaseMessageMutation.editCaseMessageAsync({
        messageClientId: editingMessageId,
        text: trimmedEditingDraftText,
      });

      cancelEditing();

      if (editingMessageSeq !== null) {
        await requestMarkRead(editingMessageSeq);
      } else {
        await requestMarkRead(editedMessage.message_seq);
      }
    } catch (error) {
      setLocalEditError(
        error instanceof Error
          ? error
          : new Error("Message could not be updated."),
      );
    }
  };
  const refetch = async () => {
    await Promise.allSettled([
      caseQuery.refetch(),
      participantsQuery.refetch(),
      linksQuery.refetch(),
      taskClientId ? taskQuery.refetch() : Promise.resolve(null),
    ]);
  };

  return {
    caseDetail: caseQuery.data,
    currentParticipant,
    taskDetail: taskQuery.data,
    currentUserId,
    lastReadMessageSeq,
    taskClientId,
    primaryLabel,
    subtitle,
    canOpenInfo: isTaskContextAvailable,
    stateActionLabel: transition?.label ?? null,
    nextState: transition?.nextState ?? null,
    isContextBannerCollapsed,
    typingIndicatorText,
    draftText,
    editingMessageId,
    editingDraftText,
    isSending: sendCaseMessageMutation.isPending,
    isSubmittingEdit: editCaseMessageMutation.isPending,
    isPendingCase: caseQuery.isPending,
    isPendingTask: isTaskContextPending,
    isAdvancingState: stateMutation.isPending,
    isError: isHardConversationError,
    sendError,
    editError,
    setBodyScrollTop,
    setDraftText,
    setEditingDraftText,
    resetScrollChrome,
    closeConversation,
    openMessageActions,
    startEditing,
    cancelEditing,
    openInfo: () => {
      if (!taskClientId || !isTaskContextAvailable) {
        return;
      }

      surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, {
        caseClientId,
        taskId: taskClientId,
      });
    },
    advanceState: async () => {
      if (!transition) {
        return;
      }

      await stateMutation.updateCaseStateAsync({
        new_state: transition.nextState,
      });
      closeConversation();
    },
    requestMarkRead,
    refetch,
    sendDraft,
    submitEdit,
  };
}
