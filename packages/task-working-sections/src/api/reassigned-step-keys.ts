import type { ListReassignedStepsParams } from "../types";

export const reassignedStepKeys = {
  all: ["reassigned-steps"] as const,
  lists: () => [...reassignedStepKeys.all, "list"] as const,
  list: (params: ListReassignedStepsParams) =>
    [
      ...reassignedStepKeys.lists(),
      {
        q: params.q,
        limit: params.limit,
        offset: params.offset,
        unacknowledged_only: params.unacknowledged_only,
      },
    ] as const,
  // The badge endpoint takes no parameters at all (handoff §4) — one cache entry.
  count: () => [...reassignedStepKeys.all, "count"] as const,
};
