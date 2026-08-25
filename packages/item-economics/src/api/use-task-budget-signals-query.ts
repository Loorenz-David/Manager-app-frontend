import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { TaskId } from "@beyo/lib";

import { fetchTaskBudgetSignals } from "./fetch-task-budget-signals";
import { itemEconomicsKeys } from "./item-economics-keys";
import type { TaskBudgetSignal } from "../types";

export type TaskBudgetSignalsSnapshot = {
  signals: TaskBudgetSignal[];
  receivedAtMs: number;
};

export function useTaskBudgetSignalsQuery(taskIds: TaskId[]) {
  const normalizedIds = useMemo(
    () => Array.from(new Set(taskIds)).sort(),
    [taskIds],
  );

  return useQuery({
    queryKey: itemEconomicsKeys.taskBudgetSignals(normalizedIds),
    queryFn: async (): Promise<TaskBudgetSignalsSnapshot> => ({
      signals: await fetchTaskBudgetSignals(normalizedIds),
      receivedAtMs: Date.now(),
    }),
    enabled: normalizedIds.length > 0,
    refetchInterval: 45_000,
    placeholderData: keepPreviousData,
  });
}

export function buildTaskBudgetSignalMap(
  signals: TaskBudgetSignal[] | undefined,
): Map<TaskId, TaskBudgetSignal> {
  const map = new Map<TaskId, TaskBudgetSignal>();
  for (const signal of signals ?? []) map.set(signal.task_id as TaskId, signal);
  return map;
}
