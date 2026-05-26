import { useMemo, useRef, useState } from 'react';

import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { RETURN_SOURCE_LABEL, TASK_TYPE_LABEL } from '@/features/tasks/lib/task-detail';
import { useSurface } from '@/hooks/use-surface';
import { selectUser, useAuthStore } from '@/store/auth.store';
import type { CaseId, UserId } from '@/types/common';

import { useUpdateCaseState } from '../actions/use-update-case-state';
import { useCaseLinksQuery } from '../api/use-case-links';
import { useGetCaseQuery } from '../api/use-get-case';
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from '../surfaces';
import type { CaseDetailBase, CaseDetailRaw, CaseLink } from '../types';

type CaseState = CaseDetailBase['state'];

type StateTransition = {
  label: string;
  nextState: CaseState;
};

const CONTEXT_BANNER_COLLAPSE_THRESHOLD = 24;
const SCROLL_DIRECTION_THRESHOLD = 6;

export type CaseConversationController = {
  caseDetail: CaseDetailRaw | undefined;
  taskDetail: ReturnType<typeof useGetTaskQuery>['data'];
  currentUserId: UserId | null;
  taskClientId: string | null;
  primaryLabel: string;
  subtitle: string;
  canOpenInfo: boolean;
  stateActionLabel: string | null;
  nextState: CaseState | null;
  isContextBannerCollapsed: boolean;
  isPendingCase: boolean;
  isPendingTask: boolean;
  isAdvancingState: boolean;
  isError: boolean;
  setBodyScrollTop: (scrollTop: number) => void;
  resetScrollChrome: () => void;
  closeConversation: () => void;
  openInfo: () => void;
  advanceState: () => Promise<void>;
  refetch: () => Promise<void>;
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

export function useCaseConversationController(caseClientId: CaseId): CaseConversationController {
  const surface = useSurface();
  const currentUserId = useAuthStore(selectUser)?.id ?? null;
  const [isContextBannerCollapsed, setIsContextBannerCollapsed] = useState(false);
  const lastBodyScrollTopRef = useRef(0);

  const caseQuery = useGetCaseQuery(caseClientId, { messages_limit: 10 });
  const linksQuery = useCaseLinksQuery(caseClientId);
  const taskLink = useMemo(() => resolveTaskLink(linksQuery.data), [linksQuery.data]);
  const taskClientId = taskLink?.entity_client_id ?? null;
  const taskQuery = useGetTaskQuery(taskClientId);

  const stateMutation = useUpdateCaseState(caseClientId);

  const transition = getStateTransition(caseQuery.data?.case.state);
  const closeConversation = () => surface.close(CASE_CONVERSATION_SURFACE_ID);

  const primaryLabel =
    taskQuery.data?.item?.article_number ??
    taskQuery.data?.item?.sku ??
    caseQuery.data?.case.type_label ??
    'Case';

  const subtitleSegments = [
    taskQuery.data?.task.task_type ? TASK_TYPE_LABEL[taskQuery.data.task.task_type] : null,
    taskQuery.data?.task.return_source
      ? RETURN_SOURCE_LABEL[taskQuery.data.task.return_source]
      : null,
  ].filter((value): value is string => Boolean(value));

  const subtitle = subtitleSegments.join(' • ') || 'Case conversation';

  const setBodyScrollTop = (scrollTop: number) => {
    const nextScrollTop = Math.max(0, scrollTop);
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
    lastBodyScrollTopRef.current = 0;
    setIsContextBannerCollapsed(false);
  };

  return {
    caseDetail: caseQuery.data,
    taskDetail: taskQuery.data,
    currentUserId,
    taskClientId,
    primaryLabel,
    subtitle,
    canOpenInfo: Boolean(taskClientId),
    stateActionLabel: transition?.label ?? null,
    nextState: transition?.nextState ?? null,
    isContextBannerCollapsed,
    isPendingCase: caseQuery.isPending,
    isPendingTask: linksQuery.isPending || (Boolean(taskClientId) && taskQuery.isPending),
    isAdvancingState: stateMutation.isPending,
    isError:
      caseQuery.isError ||
      linksQuery.isError ||
      (Boolean(taskClientId) && taskQuery.isError),
    setBodyScrollTop,
    resetScrollChrome,
    closeConversation,
    openInfo: () => {
      if (!taskClientId) {
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
    refetch: async () => {
      await Promise.allSettled([
        caseQuery.refetch(),
        linksQuery.refetch(),
        taskClientId ? taskQuery.refetch() : Promise.resolve(null),
      ]);
    },
  };
}
