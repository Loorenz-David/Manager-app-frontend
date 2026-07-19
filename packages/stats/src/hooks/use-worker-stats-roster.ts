import { useMemo } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { useWorkerInsightsQuery } from "../api/use-worker-insights-query";
import { useWorkerLastStepsQuery } from "../api/use-worker-last-steps-query";
import { useWorkerTotalsQuery } from "../api/use-worker-totals-query";
import {
  toWorkerIdentityViewModel,
  toWorkerInsightsSectionViewModel,
  toWorkerStepSectionViewModel,
  toWorkerTotalsSectionViewModel,
  type SectionState,
  type WorkerInsightsSectionViewModel,
  type WorkerStatsCardViewModel,
  type WorkerStepSectionViewModel,
  type WorkerTotalsSectionViewModel,
} from "../lib/worker-stats-dto";
import type {
  WorkerInsightsRow,
  WorkerLastStepRow,
  WorkerStatsDateRange,
  WorkerTotalsRow,
} from "../types";

type WorkerPage<T> = { workers: T[] };

function resolveSection<T, V>(
  query: Pick<
    UseQueryResult<WorkerPage<T>>,
    "data" | "isError" | "isPending"
  >,
  row: T | null,
  transform: (value: T) => V,
): SectionState<V> {
  if (row) {
    return { status: "ready", data: transform(row) };
  }
  if (query.isPending && !query.data) {
    return { status: "loading" };
  }
  if (query.isError && !query.data) {
    return { status: "error" };
  }
  return { status: "ready", data: null };
}

export type WorkerStatsRosterResult = {
  workers: WorkerStatsCardViewModel[];
  isPending: boolean;
  isError: boolean;
  refetchAll: () => Promise<unknown[]>;
};

export function useWorkerStatsRoster(
  range: WorkerStatsDateRange,
): WorkerStatsRosterResult {
  const workDate = range.from === range.to ? range.to : undefined;
  const lastStepsQuery = useWorkerLastStepsQuery({
    limit: 50,
    offset: 0,
    workDate,
  });
  const totalsQuery = useWorkerTotalsQuery({
    limit: 50,
    offset: 0,
    dateFrom: range.from,
    dateTo: range.to,
  });
  const insightsQuery = useWorkerInsightsQuery({
    limit: 50,
    offset: 0,
    workDate: range.to,
  });

  const workers = useMemo(() => {
    const sourceRows = lastStepsQuery.data
      ? lastStepsQuery.data.workers.map((row) => ({ user: row.user, id: row.user.client_id }))
      : totalsQuery.data
        ? totalsQuery.data.workers.map((row) => ({ user: row.user, id: row.user.client_id }))
        : insightsQuery.data
          ? insightsQuery.data.workers.map((row) => ({ user: row.user, id: row.user.client_id }))
          : [];
    const lastById = new Map(
      (lastStepsQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );
    const totalsById = new Map(
      (totalsQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );
    const insightsById = new Map(
      (insightsQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );
    const obtainedAtIso = lastStepsQuery.dataUpdatedAt
      ? new Date(lastStepsQuery.dataUpdatedAt).toISOString()
      : new Date().toISOString();

    return sourceRows.map(({ id, user }) => ({
      ...toWorkerIdentityViewModel(user),
      step: resolveSection<WorkerLastStepRow, WorkerStepSectionViewModel>(
        lastStepsQuery,
        lastById.get(id) ?? null,
        (row) => toWorkerStepSectionViewModel(row, obtainedAtIso),
      ),
      totals: resolveSection<WorkerTotalsRow, WorkerTotalsSectionViewModel>(
        totalsQuery,
        totalsById.get(id) ?? null,
        toWorkerTotalsSectionViewModel,
      ),
      insights:
        range.from === range.to
          ? resolveSection<
              WorkerInsightsRow,
              WorkerInsightsSectionViewModel
            >(
              insightsQuery,
              insightsById.get(id) ?? null,
              toWorkerInsightsSectionViewModel,
            )
          : ({ status: "ready", data: null } satisfies SectionState<
              WorkerInsightsSectionViewModel
            >),
    }));
  }, [
    insightsQuery.data,
    lastStepsQuery,
    range.from,
    range.to,
    totalsQuery,
  ]);

  return {
    workers,
    isPending:
      lastStepsQuery.isPending &&
      totalsQuery.isPending &&
      insightsQuery.isPending,
    isError:
      lastStepsQuery.isError &&
      totalsQuery.isError &&
      insightsQuery.isError,
    refetchAll: () =>
      Promise.all([
        lastStepsQuery.refetch(),
        totalsQuery.refetch(),
        insightsQuery.refetch(),
      ]),
  };
}
