import { useEffect, useMemo, useRef, useState } from "react";

import { selectUser, useAuthStore } from "@beyo/auth";
import { useSurface } from "@beyo/hooks";
import type { CaseId, UserId } from "@beyo/lib";

import { buildCasesScope, useCasesStore } from "../store/cases.store";

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
  type CaseFilterPill,
  type CaseListCardViewModel,
  type CasesFilterState,
} from "../types";

const FILTER_ORDER: CaseFilterPill[] = ["unread", "active", "in-progress"];
const FILTER_INDEX = new Map<CaseFilterPill, number>(
  FILTER_ORDER.map((filter, index) => [filter, index]),
);

export type CasesViewController = {
  activeFilter: CaseFilterPill;
  direction: 1 | -1;
  cases: CaseListCardViewModel[];
  showPills: boolean;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onFilterChange: (filter: CaseFilterPill) => void;
  openCase: (caseClientId: CaseId) => void;
  openFilters: () => void;
  openCaseCreation: () => void;
  createFabBottomOffsetClassName?: string;
  activeFilterCount: number;
  pillCounts: { unread: number; active: number; inProgress: number };
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
  const [direction, setDirection] = useState<1 | -1>(1);

  const scope = buildCasesScope(params.entityType, params.entityClientId);
  const activeFilter =
    useCasesStore((s) => s.activePillByScope[scope]) ?? "unread";
  const setActivePill = useCasesStore((s) => s.setActivePill);

  const previousFilterIndexRef = useRef(FILTER_INDEX.get(activeFilter) ?? 0);
  const [activeFilters, setActiveFilters] =
    useState<CasesFilterState>(DEFAULT_CASES_FILTER);
  const isResolvedFilterActive =
    activeFilters.caseStates.length === 1 &&
    activeFilters.caseStates[0] === "resolved";
  const participantFilter =
    activeFilters.onlyForMe && currentUserId ? currentUserId : undefined;
  const scopedEntityParams = {
    ...(params.entityClientId
      ? { entity_client_id: params.entityClientId }
      : {}),
    ...(params.entityType ? { entity_type: params.entityType } : {}),
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeCasesQuery = useListCasesQuery({
    case_state: "open",
    q: debouncedQ || undefined,
    includes_participants: participantFilter,
    ...scopedEntityParams,
  });

  const inProgressCasesQuery = useListCasesQuery({
    case_state: "resolving",
    q: debouncedQ || undefined,
    includes_participants: participantFilter,
    ...scopedEntityParams,
  });

  const resolvedCasesQuery = useListCasesQuery({
    case_state: "resolved",
    q: debouncedQ || undefined,
    includes_participants: participantFilter,
    ...scopedEntityParams,
  });

  const activeCases = useMemo(
    () =>
      (activeCasesQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [activeCasesQuery.data],
  );

  const inProgressCases = useMemo(
    () =>
      (inProgressCasesQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [inProgressCasesQuery.data],
  );

  const resolvedCases = useMemo(
    () =>
      (resolvedCasesQuery.data ?? [])
        .map(toCaseListCardViewModel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [resolvedCasesQuery.data],
  );

  const unreadCountSourceCases = useMemo(
    () => [...activeCases, ...inProgressCases],
    [activeCases, inProgressCases],
  );

  const caseClientIds = useMemo(
    () => unreadCountSourceCases.map((item) => item.client_id),
    [unreadCountSourceCases],
  );
  const unreadCountsQuery = useUnreadCountsQuery(caseClientIds);

  const unreadCases = useMemo(
    () =>
      [...activeCases, ...inProgressCases].filter(
        (card) => (unreadCountsQuery.data?.[card.client_id] ?? 0) > 0,
      ),
    [activeCases, inProgressCases, unreadCountsQuery.data],
  );

  const cases = useMemo(() => {
    if (isResolvedFilterActive) {
      return resolvedCases;
    }

    if (activeFilter === "active") {
      return activeCases;
    }

    if (activeFilter === "in-progress") {
      return inProgressCases;
    }

    return unreadCases;
  }, [
    activeCases,
    activeFilter,
    inProgressCases,
    isResolvedFilterActive,
    resolvedCases,
    unreadCases,
  ]);

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

  function onFilterChange(filter: CaseFilterPill): void {
    const nextIndex = FILTER_INDEX.get(filter) ?? 0;
    const previousIndex = previousFilterIndexRef.current;

    if (nextIndex !== previousIndex) {
      setDirection(nextIndex > previousIndex ? 1 : -1);
      previousFilterIndexRef.current = nextIndex;
    }

    setActivePill(scope, filter);
  }

  function openFilters(): void {
    params.viewSurfaceOpeners?.openCaseFilters?.({
      currentFilters: activeFilters,
      onApply: setActiveFilters,
    });
  }

  function openCaseCreation(): void {
    params.viewSurfaceOpeners?.openCaseCreation?.();
  }

  async function refetch(): Promise<void> {
    await Promise.all([
      activeCasesQuery.refetch(),
      inProgressCasesQuery.refetch(),
      resolvedCasesQuery.refetch(),
      unreadCountsQuery.refetch(),
    ]);
  }

  const typingByCaseId = useMemo<Record<string, string>>(() => {
    if (!ENABLE_TYPING_STUB) {
      return {};
    }

    // Temporary local stub until realtime presence/typing signals are connected.
    const firstOpenCase = activeCases.find((card) => card.state === "open");

    if (!firstOpenCase) {
      return {};
    }

    return {
      [firstOpenCase.client_id]: "Writing",
    };
  }, [activeCases]);

  const isLoading =
    activeFilter === "active"
      ? activeCasesQuery.isPending
      : activeFilter === "in-progress"
        ? inProgressCasesQuery.isPending
        : activeCasesQuery.isPending ||
          inProgressCasesQuery.isPending ||
          (caseClientIds.length > 0 && unreadCountsQuery.isPending);

  return {
    activeFilter,
    direction,
    cases,
    showPills: !isResolvedFilterActive,
    isLoading: isResolvedFilterActive ? resolvedCasesQuery.isPending : isLoading,
    searchQuery,
    setSearchQuery,
    onFilterChange,
    openCase,
    openFilters,
    openCaseCreation,
    createFabBottomOffsetClassName:
      params.viewSurfaceOpeners?.createFabBottomOffsetClassName,
    activeFilterCount,
    pillCounts: {
      unread: unreadCases.length,
      active: activeCases.length,
      inProgress: inProgressCases.length,
    },
    unreadCounts: unreadCountsQuery.data ?? {},
    typingByCaseId,
    refetch,
  };
}
