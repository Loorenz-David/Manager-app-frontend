import type { ListTasksWithCoordinationParams } from "../types";

export const customerCoordinationKeys = {
  all: ["customer-coordination"] as const,
  counts: (customerCoordinationStates?: string) =>
    [
      ...customerCoordinationKeys.all,
      "counts",
      customerCoordinationStates ?? "all",
    ] as const,
  tasks: () => [...customerCoordinationKeys.all, "tasks"] as const,
  taskList: (params: ListTasksWithCoordinationParams = {}) =>
    [...customerCoordinationKeys.tasks(), params] as const,
};
