import { useMemo } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { useWorkerInsightsQuery } from "../api/use-worker-insights-query";
import { useWorkerLastStepsQuery } from "../api/use-worker-last-steps-query";
import { useWorkerLinearTimelineQuery } from "../api/use-worker-linear-timeline-query";
import {
  toWorkerIdentityViewModel,
  toWorkerInsightsSectionViewModel,
  toWorkerStepSectionViewModel,
  toWorkerTimelineSectionViewModel,
  type SectionState,
  type WorkerInsightsSectionViewModel,
  type WorkerStatsCardViewModel,
  type WorkerStepSectionViewModel,
  type WorkerTimelineSectionViewModel,
} from "../lib/worker-stats-dto";
import type {
  WorkerInsightsRow,
  WorkerLastStepRow,
  WorkerLinearTimelineRow,
  WorkerStatsDateRange,
  WorkerStatsUser,
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
  const timelineQuery = useWorkerLinearTimelineQuery({
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
    // Union by client_id instead of trusting a single source's worker list:
    // the three roster endpoints are expected to agree on role scope, but a
    // worker missing from one response (pagination race, transient error)
    // shouldn't drop their card if another source still has them.
    const byId = new Map<string, WorkerStatsUser>();
    for (const row of lastStepsQuery.data?.workers ?? []) {
      byId.set(row.user.client_id, row.user);
    }
    for (const row of timelineQuery.data?.workers ?? []) {
      if (!byId.has(row.user.client_id)) {
        byId.set(row.user.client_id, row.user);
      }
    }
    for (const row of insightsQuery.data?.workers ?? []) {
      if (!byId.has(row.user.client_id)) {
        byId.set(row.user.client_id, row.user);
      }
    }
    const sourceRows = Array.from(byId, ([id, user]) => ({ id, user })).sort(
      (a, b) => a.user.username.localeCompare(b.user.username),
    );
    const lastById = new Map(
      (lastStepsQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );
    const timelineById = new Map(
      (timelineQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );
    const insightsById = new Map(
      (insightsQuery.data?.workers ?? []).map((row) => [row.user.client_id, row]),
    );

    return sourceRows.map(({ id, user }) => ({
      ...toWorkerIdentityViewModel(user),
      step: resolveSection<WorkerLastStepRow, WorkerStepSectionViewModel>(
        lastStepsQuery,
        lastById.get(id) ?? null,
        toWorkerStepSectionViewModel,
      ),
      timeline: resolveSection<
        WorkerLinearTimelineRow,
        WorkerTimelineSectionViewModel
      >(
        timelineQuery,
        timelineById.get(id) ?? null,
        toWorkerTimelineSectionViewModel,
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
    timelineQuery,
  ]);

  return {
    workers,
    isPending:
      lastStepsQuery.isPending &&
      timelineQuery.isPending &&
      insightsQuery.isPending,
    isError:
      lastStepsQuery.isError &&
      timelineQuery.isError &&
      insightsQuery.isError,
    refetchAll: () =>
      Promise.all([
        lastStepsQuery.refetch(),
        timelineQuery.refetch(),
        insightsQuery.refetch(),
      ]),
  };
}
