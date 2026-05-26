import { useMemo, useState } from 'react';

import { useSurface } from '@/hooks/use-surface';
import type { CaseId } from '@/types/common';

import { useListCasesQuery } from '../api/use-list-cases';
import { useUnreadCountsQuery } from '../api/use-unread-counts';
import { CASE_CONVERSATION_SURFACE_ID } from '../surfaces';
import { toCaseListCardViewModel, type CaseListCardViewModel } from '../types';

function getLocalDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function isCreatedToday(isoString: string): boolean {
  return getLocalDateKey(new Date(isoString)) === getLocalDateKey(new Date());
}

function matchesSearch(card: CaseListCardViewModel, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const candidates = [
    card.type_label,
    card.created_by.username,
    card.task?.item?.article_number,
    card.task?.item?.sku,
  ];

  return candidates.some((value) => value?.toLowerCase().includes(query));
}

export type CasesGroup = {
  label: string;
  count: number;
  cases: CaseListCardViewModel[];
};

export type CasesViewController = {
  newGroup: CasesGroup;
  activeGroup: CasesGroup;
  resolvingGroup: CasesGroup;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  openCase: (caseClientId: CaseId) => void;
  unreadCounts: Record<string, number>;
};

export function useCasesViewController(): CasesViewController {
  const surface = useSurface();
  const [searchQuery, setSearchQuery] = useState('');

  const listQuery = useListCasesQuery({ case_state: 'open,resolving' });

  const viewModels = useMemo(
    () =>
      (listQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [listQuery.data],
  );

  const caseClientIds = useMemo(() => viewModels.map((item) => item.client_id), [viewModels]);
  const unreadCountsQuery = useUnreadCountsQuery(caseClientIds);

  const filteredCases = useMemo(
    () => viewModels.filter((card) => matchesSearch(card, searchQuery)),
    [searchQuery, viewModels],
  );

  const groupedCases = useMemo(() => {
    const newCases: CaseListCardViewModel[] = [];
    const activeCases: CaseListCardViewModel[] = [];
    const resolvingCases: CaseListCardViewModel[] = [];

    for (const card of filteredCases) {
      if (card.state === 'resolving') {
        resolvingCases.push(card);
        continue;
      }

      if (card.state === 'open' && isCreatedToday(card.created_at)) {
        newCases.push(card);
        continue;
      }

      if (card.state === 'open') {
        activeCases.push(card);
      }
    }

    return { newCases, activeCases, resolvingCases };
  }, [filteredCases]);

  function openCase(caseClientId: CaseId): void {
    surface.open(CASE_CONVERSATION_SURFACE_ID, { caseClientId });
  }

  return {
    newGroup: {
      label: 'New',
      count: groupedCases.newCases.length,
      cases: groupedCases.newCases,
    },
    activeGroup: {
      label: 'Active',
      count: groupedCases.activeCases.length,
      cases: groupedCases.activeCases,
    },
    resolvingGroup: {
      label: 'Resolving',
      count: groupedCases.resolvingCases.length,
      cases: groupedCases.resolvingCases,
    },
    isLoading: listQuery.isPending,
    searchQuery,
    setSearchQuery,
    openCase,
    unreadCounts: unreadCountsQuery.data ?? {},
  };
}
