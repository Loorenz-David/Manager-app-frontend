import type { PauseReasonId } from "@beyo/lib";
import type { ListPauseReasonsParams } from "../types";

export const pauseReasonKeys = {
  all: ["pause-reasons"] as const,
  lists: () => [...pauseReasonKeys.all, "list"] as const,
  list: (params: ListPauseReasonsParams = {}) => {
    const normalized = {
      ...params,
      ...(params.user_ids
        ? { user_ids: [...new Set(params.user_ids)].sort() }
        : {}),
      ...(params.working_section_ids
        ? {
            working_section_ids: [
              ...new Set(params.working_section_ids),
            ].sort(),
          }
        : {}),
    };
    return [...pauseReasonKeys.lists(), normalized] as const;
  },
  details: () => [...pauseReasonKeys.all, "detail"] as const,
  detail: (id: PauseReasonId) => [...pauseReasonKeys.details(), id] as const,
};
