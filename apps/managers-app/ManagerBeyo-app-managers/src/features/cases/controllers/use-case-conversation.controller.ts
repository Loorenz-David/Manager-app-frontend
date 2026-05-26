import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import type { ApiRequestError } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { RETURN_SOURCE_LABEL, TASK_TYPE_LABEL } from '@/features/tasks/lib/task-detail';
import { useSurface } from '@/hooks/use-surface';
import { selectUser, useAuthStore } from '@/store/auth.store';
import type { CaseId, UserId } from '@/types/common';

import { useMarkCaseRead } from '../actions/use-mark-case-read';
import { useSendCaseMessage } from '../actions/use-send-case-message';
import { useCaseParticipantsQuery } from '../api/use-case-participants';
import { useUpdateCaseState } from '../actions/use-update-case-state';
import { caseKeys } from '../api/case-keys';
import { useCaseLinksQuery } from '../api/use-case-links';
import { useGetCaseQuery } from '../api/use-get-case';
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from '../surfaces';
import type {
  CaseDetailBase,
  CaseDetailRaw,
  CaseLink,
  CaseListCardRaw,
  CaseParticipant,
} from '../types';

type CaseState = CaseDetailBase['state'];

type StateTransition = {
  label: string;
  nextState: CaseState;
};

const CONTEXT_BANNER_COLLAPSE_THRESHOLD = 24;
const SCROLL_DIRECTION_THRESHOLD = 6;

export type CaseConversationController = {
  caseDetail: CaseDetailRaw | undefined;
  currentParticipant: CaseParticipant | null;
  taskDetail: ReturnType<typeof useGetTaskQuery>['data'];
  currentUserId: UserId | null;
  lastReadMessageSeq: number | null;
  taskClientId: string | null;
  primaryLabel: string;
  subtitle: string;
  canOpenInfo: boolean;
  stateActionLabel: string | null;
  nextState: CaseState | null;
  isContextBannerCollapsed: boolean;
  draftText: string;
  isSending: boolean;
  isPendingCase: boolean;
  isPendingTask: boolean;
  isAdvancingState: boolean;
  isError: boolean;
  sendError: ApiRequestError | Error | null;
  setBodyScrollTop: (scrollTop: number) => void;
  setDraftText: (value: string) => void;
  resetScrollChrome: () => void;
  closeConversation: () => void;
  openInfo: () => void;
  advanceState: () => Promise<void>;
  requestMarkRead: (upToMessageSeq: number) => Promise<void>;
  refetch: () => Promise<void>;
  sendDraft: () => Promise<void>;
};

type UseCaseConversationControllerOptions = {
  scrollToBottom?: () => void;
};

function resolveTaskLink(links: CaseLink[] | undefined): CaseLink | null {
  if (!links) {
    return null;
  }

  const taskLinks = links.filter((link) => link.entity_type === 'task');

  return taskLinks.find((link) => link.role === 'subject') ?? taskLinks[0] ?? null;
}

function getStateTransition(state: CaseState | null | undefined): StateTransition | null {
  if (state === 'open') {
    return {
      label: 'Process',
      nextState: 'resolving',
    };
  }

  if (state === 'resolving') {
    return {
      label: 'Resolve',
      nextState: 'resolved',
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

function getReturnSourceLabel(returnSource: string | null | undefined): string | null {
  if (!returnSource || !(returnSource in RETURN_SOURCE_LABEL)) {
    return null;
  }

  return RETURN_SOURCE_LABEL[returnSource as keyof typeof RETURN_SOURCE_LABEL];
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
  const [isContextBannerCollapsed, setIsContextBannerCollapsed] = useState(false);
  const [draftText, setDraftTextState] = useState('');
  const [localSendError, setLocalSendError] = useState<Error | null>(null);
  const hasObservedInitialScrollRef = useRef(false);
  const lastBodyScrollTopRef = useRef(0);
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
  const taskLink = useMemo(() => resolveTaskLink(linksQuery.data), [linksQuery.data]);
  const taskClientId = taskLink?.entity_client_id ?? cachedCaseSnapshot?.task?.client_id ?? null;
  const taskQuery = useGetTaskQuery(taskClientId);

  const markCaseReadMutation = useMarkCaseRead();
  const sendCaseMessageMutation = useSendCaseMessage(caseClientId);
  const stateMutation = useUpdateCaseState(caseClientId);
  const currentParticipant =
    participantsQuery.data?.find((participant) => participant.user_id === currentUserId) ?? null;
  const lastReadMessageSeq = currentParticipant?.last_read_message_seq ?? null;
  const conversationClientId = caseQuery.data?.case.conversation_client_id ?? null;

  if ((lastReadMessageSeq ?? 0) > lastAcknowledgedReadSeqRef.current) {
    lastAcknowledgedReadSeqRef.current = lastReadMessageSeq ?? 0;
  }

  const transition = getStateTransition(caseQuery.data?.case.state);
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
      navigate(-1);
      return;
    }

    if (location.pathname.startsWith(`${ROUTES.cases}/`)) {
      navigate(ROUTES.cases, { replace: true });
      return;
    }
  };

  const primaryLabel =
    taskQuery.data?.item?.article_number ??
    taskQuery.data?.item?.sku ??
    cachedCaseSnapshot?.task?.item?.article_number ??
    cachedCaseSnapshot?.task?.item?.sku ??
    caseQuery.data?.case.type_label ??
    cachedCaseSnapshot?.type_label ??
    'Case';

  const subtitleSegments = [
    taskQuery.data?.task.task_type
      ? getTaskTypeLabel(taskQuery.data.task.task_type)
      : getTaskTypeLabel(cachedCaseSnapshot?.task?.task_type),
    taskQuery.data?.task.return_source
      ? getReturnSourceLabel(taskQuery.data.task.return_source)
      : getReturnSourceLabel(cachedCaseSnapshot?.task?.return_source),
  ].filter((value): value is string => Boolean(value));

  const subtitle = subtitleSegments.join(' • ') || 'Case conversation';
  const isTaskContextAvailable = Boolean(taskClientId) && !taskQuery.isError;
  const isTaskContextPending =
    Boolean(taskClientId) && !taskQuery.data && (linksQuery.isPending || taskQuery.isPending);
  const isHardConversationError = caseQuery.isError;

  const setBodyScrollTop = (scrollTop: number) => {
    const nextScrollTop = Math.max(0, scrollTop);

    if (!hasObservedInitialScrollRef.current) {
      hasObservedInitialScrollRef.current = true;
      lastBodyScrollTopRef.current = nextScrollTop;
      setIsContextBannerCollapsed(false);
      return;
    }

    const delta = nextScrollTop - lastBodyScrollTopRef.current;
    lastBodyScrollTopRef.current = nextScrollTop;

    if (nextScrollTop <= CONTEXT_BANNER_COLLAPSE_THRESHOLD) {
      setIsContextBannerCollapsed(false);
      return;
    }

    if (Math.abs(delta) < SCROLL_DIRECTION_THRESHOLD) {
      return;
    }

    setIsContextBannerCollapsed(delta > 0);
  };

  const resetScrollChrome = () => {
    hasObservedInitialScrollRef.current = false;
    lastBodyScrollTopRef.current = 0;
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

  const sendDraft = async () => {
    const trimmedDraftText = draftText.trim();

    if (trimmedDraftText.length === 0) {
      return;
    }

    if (!conversationClientId) {
      setLocalSendError(new Error('Conversation is not available yet.'));
      sendCaseMessageMutation.reset();
      return;
    }

    if (localSendError) {
      setLocalSendError(null);
    }

    sendCaseMessageMutation.reset();

    try {
      const createdMessage = await sendCaseMessageMutation.sendCaseMessageAsync({
        conversation_client_id: conversationClientId,
        content: [
          {
            type: 'text',
            text: trimmedDraftText,
            mention: null,
            label_value: null,
            link: null,
          },
        ],
        plain_text: trimmedDraftText,
      });

      setDraftTextState('');
      options.scrollToBottom?.();
      await requestMarkRead(createdMessage.message_seq);
    } catch (error) {
      setLocalSendError(
        error instanceof Error ? error : new Error('Message could not be sent.'),
      );
    }
  };

  const sendError = localSendError ?? sendCaseMessageMutation.error;
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
    draftText,
    isSending: sendCaseMessageMutation.isPending,
    isPendingCase: caseQuery.isPending,
    isPendingTask: isTaskContextPending,
    isAdvancingState: stateMutation.isPending,
    isError: isHardConversationError,
    sendError,
    setBodyScrollTop,
    setDraftText,
    resetScrollChrome,
    closeConversation,
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

      await stateMutation.updateCaseStateAsync({ new_state: transition.nextState });
      closeConversation();
    },
    requestMarkRead,
    refetch,
    sendDraft,
  };
}
