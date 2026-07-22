import type { PauseReasonId } from "@beyo/lib";
import type { ListPauseReasonsParams } from "../types";

export const pauseReasonKeys = {
  all: ["pause-reasons"] as const,
  lists: () => [...pauseReasonKeys.all, "list"] as const,
  list: (params: ListPauseReasonsParams = {}) =>
    [...pauseReasonKeys.lists(), params] as const,
  details: () => [...pauseReasonKeys.all, "detail"] as const,
  detail: (id: PauseReasonId) => [...pauseReasonKeys.details(), id] as const,
};
