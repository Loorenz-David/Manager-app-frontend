import type { ListTasksFullParams } from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: ListTasksFullParams = {}) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  postHandling: () => [...taskKeys.all, "post-handling"] as const,
  postHandlingCounts: (postHandlingStates?: string) =>
    [...taskKeys.postHandling(), "counts", postHandlingStates ?? "all"] as const,
};
