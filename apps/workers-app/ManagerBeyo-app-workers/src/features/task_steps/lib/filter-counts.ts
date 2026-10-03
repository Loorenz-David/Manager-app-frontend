import type { ReadinessStatus, StepState, TaskType } from "../types";
import {
  DEFAULT_READINESS_STATUS_FILTERS,
  DEFAULT_STATE_FILTERS,
} from "./filter-defaults";

export type WorkingSectionStepFilterCountsInput = {
  states: StepState[];
  readinessStatuses: ReadinessStatus[];
  taskTypes: TaskType[];
  categoryIds: string[];
  itemPosition: string;
  groupByUpholstery: boolean;
};

function isSameSelection<T extends string>(current: T[], defaults: T[]): boolean {
  return current.length === defaults.length &&
    defaults.every((value) => current.includes(value));
}

export function countWorkingSectionStepFilters(input: WorkingSectionStepFilterCountsInput) {
  const state =
    (isSameSelection(input.states, DEFAULT_STATE_FILTERS) ? 0 : input.states.length) +
    (isSameSelection(input.readinessStatuses, DEFAULT_READINESS_STATUS_FILTERS)
      ? 0
      : input.readinessStatuses.length);
  const task = input.taskTypes.length + input.categoryIds.length;
  const other = Number(Boolean(input.itemPosition.trim())) + Number(input.groupByUpholstery);
  return { state, task, other, total: state + task + other };
}
