import type { ItemId, TaskId } from "@beyo/lib";
import type { ItemEconomicsListParams, MajorCategory } from "../types";

/**
 * React Query key factory for the item economics domain.
 * Configuration keys live under "configuration", operational reads under
 * the entity they belong to ("task" / "item").
 */
export const itemEconomicsKeys = {
  all: ["item-economics"] as const,

  // Configuration
  configuration: () => [...itemEconomicsKeys.all, "configuration"] as const,
  configurationStatus: () =>
    [...itemEconomicsKeys.configuration(), "status"] as const,
  costGroups: () => [...itemEconomicsKeys.configuration(), "cost-groups"] as const,
  costGroupList: (majorCategory?: MajorCategory) =>
    [...itemEconomicsKeys.costGroups(), "list", majorCategory ?? null] as const,
  basisVersions: (costGroupId: string, params: ItemEconomicsListParams = {}) =>
    [
      ...itemEconomicsKeys.costGroups(),
      costGroupId,
      "basis-versions",
      params,
    ] as const,
  costModelVersions: (params: ItemEconomicsListParams = {}) =>
    [
      ...itemEconomicsKeys.configuration(),
      "cost-model-versions",
      params,
    ] as const,

  // Operational — task scoped
  tasks: () => [...itemEconomicsKeys.all, "task"] as const,
  task: (taskId: TaskId) => [...itemEconomicsKeys.tasks(), taskId] as const,
  taskBudgetStatus: (taskId: TaskId) =>
    [...itemEconomicsKeys.task(taskId), "budget-status"] as const,
  taskProductionTime: (taskId: TaskId) =>
    [...itemEconomicsKeys.task(taskId), "production-time"] as const,
  taskEvaluations: (taskId: TaskId, params: ItemEconomicsListParams = {}) =>
    [...itemEconomicsKeys.task(taskId), "evaluations", params] as const,

  /**
   * Batched across tasks, so it hangs directly off `tasks()` rather than a
   * single `task(taskId)`. Being under the `tasks()` branch is deliberate:
   * the `task:step-state-changed` socket handler invalidates that branch, so
   * start/pause transitions refresh the step cards' worked/left figures
   * immediately.
   */
  taskBudgetAllocations: (taskIds: readonly TaskId[]) =>
    [...itemEconomicsKeys.tasks(), "budget-allocations", taskIds] as const,

  /**
   * Deliberately its own branch directly under `all`, **not** under `tasks()`
   * (intention §4A M9): the existing `task:step-state-changed` handler
   * invalidates the whole `tasks()` branch immediately, and this aggregate is
   * expensive enough that its refetch must stay on the debounced handler.
   */
  priceScenario: (taskId: TaskId) =>
    [...itemEconomicsKeys.all, "price-scenario", taskId] as const,

  // Operational — item scoped
  items: () => [...itemEconomicsKeys.all, "item"] as const,
  item: (itemId: ItemId) => [...itemEconomicsKeys.items(), itemId] as const,
  itemEconomics: (itemId: ItemId) =>
    [...itemEconomicsKeys.item(itemId), "economics"] as const,
  itemValuations: (itemId: ItemId, params: ItemEconomicsListParams = {}) =>
    [...itemEconomicsKeys.item(itemId), "valuations", params] as const,
};
