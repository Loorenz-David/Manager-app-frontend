import { useEffect, useMemo, useState } from "react";

import { selectUser, useAuthStore } from "@beyo/auth";
import { useSurface } from "@beyo/hooks";
import type { CaseId, UserId } from "@beyo/lib";

import { useListCasesQuery } from "../api/use-list-cases";
import { useUnreadCountsQuery } from "../api/use-unread-counts";
import { ENABLE_TYPING_STUB } from "../lib/typing-indicator-flags";
import { CASE_CONVERSATION_SURFACE_ID } from "../surface-ids";
import type {
  CaseConversationSurfaceOpeners,
  CasesViewSurfaceOpeners,
} from "../surface-ids";
import {
  CASE_LINK_ENTITY_TYPE,
  DEFAULT_CASES_FILTER,
  toCaseListCardViewModel,
  type CaseListCardViewModel,
  type CasesFilterState,
} from "../types";

function getLocalDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function isCreatedToday(isoString: string): boolean {
  return getLocalDateKey(new Date(isoString)) === getLocalDateKey(new Date());
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
  resolvedGroup: CasesGroup;
  showActiveGroup: boolean;
  showResolvingGroup: boolean;
  showResolvedGroup: boolean;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  openCase: (caseClientId: CaseId) => void;
  openFilters: () => void;
  activeFilterCount: number;
  unreadCounts: Record<string, number>;
  typingByCaseId: Record<string, string>;
  refetch: () => Promise<void>;
};

export type CasesViewControllerParams = {
  entityClientId?: string;
  entityType?: (typeof CASE_LINK_ENTITY_TYPE)[number];
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  viewSurfaceOpeners?: CasesViewSurfaceOpeners;
};

export function useCasesViewController(
  params: CasesViewControllerParams = {},
): CasesViewController {
  const surface = useSurface();
  const currentUserId = (useAuthStore(selectUser)?.id ?? null) as UserId | null;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeFilters, setActiveFilters] =
    useState<CasesFilterState>(DEFAULT_CASES_FILTER);
  const effectiveCaseStates =
    activeFilters.caseStates.length > 0
      ? activeFilters.caseStates
      : DEFAULT_CASES_FILTER.caseStates;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const listQuery = useListCasesQuery({
    case_state: effectiveCaseStates.join(","),
    q: debouncedQ || undefined,
    includes_participants:
      activeFilters.onlyForMe && currentUserId ? currentUserId : undefined,
    ...(params.entityClientId
      ? { entity_client_id: params.entityClientId }
      : {}),
    ...(params.entityType ? { entity_type: params.entityType } : {}),
  });

  const selectedCaseStates = useMemo(
    () => new Set(effectiveCaseStates),
    [effectiveCaseStates],
  );

  const viewModels = useMemo(
    () =>
      (listQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [listQuery.data],
  );

  const caseClientIds = useMemo(
    () => viewModels.map((item) => item.client_id),
    [viewModels],
  );
  const unreadCountsQuery = useUnreadCountsQuery(caseClientIds);

  const groupedCases = useMemo(() => {
    const newCases: CaseListCardViewModel[] = [];
    const activeCases: CaseListCardViewModel[] = [];
    const resolvingCases: CaseListCardViewModel[] = [];
    const resolvedCases: CaseListCardViewModel[] = [];

    for (const card of viewModels) {
      if (card.state === "resolved") {
        resolvedCases.push(card);
        continue;
      }

      if (card.state === "resolving") {
        resolvingCases.push(card);
        continue;
      }

      if (card.state === "open" && isCreatedToday(card.created_at)) {
        newCases.push(card);
        continue;
      }

      if (card.state === "open") {
        activeCases.push(card);
      }
    }

    return { newCases, activeCases, resolvingCases, resolvedCases };
  }, [viewModels]);

  const activeFilterCount = useMemo(() => {
    const defaultSet = new Set(DEFAULT_CASES_FILTER.caseStates);
    const currentSet = new Set(activeFilters.caseStates);
    const statesChanged =
      currentSet.size !== defaultSet.size ||
      [...defaultSet].some((state) => !currentSet.has(state));
    const onlyForMeChanged =
      activeFilters.onlyForMe !== DEFAULT_CASES_FILTER.onlyForMe;

    return (statesChanged ? 1 : 0) + (onlyForMeChanged ? 1 : 0);
  }, [activeFilters]);

  function openCase(caseClientId: CaseId): void {
    surface.open(CASE_CONVERSATION_SURFACE_ID, {
      caseClientId,
      surfaceOpeners: params.surfaceOpeners,
    });
  }

  function openFilters(): void {
    params.viewSurfaceOpeners?.openCaseFilters?.({
      currentFilters: activeFilters,
      onApply: setActiveFilters,
    });
  }

  async function refetch(): Promise<void> {
    await Promise.all([listQuery.refetch(), unreadCountsQuery.refetch()]);
  }

  const typingByCaseId = useMemo<Record<string, string>>(() => {
    if (!ENABLE_TYPING_STUB) {
      return {};
    }

    // Temporary local stub until realtime presence/typing signals are connected.
    const firstOpenCase = viewModels.find((card) => card.state === "open");

    if (!firstOpenCase) {
      return {};
    }

    return {
      [firstOpenCase.client_id]: "Writing",
    };
  }, [viewModels]);

  return {
    newGroup: {
      label: "New",
      count: groupedCases.newCases.length,
      cases: groupedCases.newCases,
    },
    activeGroup: {
      label: "Active",
      count: groupedCases.activeCases.length,
      cases: groupedCases.activeCases,
    },
    resolvingGroup: {
      label: "Resolving",
      count: groupedCases.resolvingCases.length,
      cases: groupedCases.resolvingCases,
    },
    resolvedGroup: {
      label: "Resolved",
      count: groupedCases.resolvedCases.length,
      cases: groupedCases.resolvedCases,
    },
    showActiveGroup: selectedCaseStates.has("open"),
    showResolvingGroup: selectedCaseStates.has("resolving"),
    showResolvedGroup: selectedCaseStates.has("resolved"),
    isLoading: listQuery.isPending,
    searchQuery,
    setSearchQuery,
    openCase,
    openFilters,
    activeFilterCount,
    unreadCounts: unreadCountsQuery.data ?? {},
    typingByCaseId,
    refetch,
  };
}
