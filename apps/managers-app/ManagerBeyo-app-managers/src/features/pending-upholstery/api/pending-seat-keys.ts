import type { ListPendingSeatTasksParams } from "../types";

export const pendingSeatUpholsteryKeys = {
  all: ["pending-seat-upholstery"] as const,
  lists: () => [...pendingSeatUpholsteryKeys.all, "list"] as const,
  list: (params: ListPendingSeatTasksParams) =>
    [...pendingSeatUpholsteryKeys.lists(), params] as const,
  counts: () => [...pendingSeatUpholsteryKeys.all, "counts"] as const,
};
