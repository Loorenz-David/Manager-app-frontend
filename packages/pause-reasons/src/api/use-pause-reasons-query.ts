import { useQuery } from "@tanstack/react-query";
import { listPauseReasons } from "./list-pause-reasons";
import { pauseReasonKeys } from "./pause-reason-keys";
import type { ListPauseReasonsParams } from "../types";

export const PAUSE_REASONS_STALE_TIME = 5 * 60 * 1000;

export function usePauseReasonsQuery(params: ListPauseReasonsParams = {}) {
  return useQuery({
    queryKey: pauseReasonKeys.list(params),
    queryFn: () => listPauseReasons(params),
    staleTime: PAUSE_REASONS_STALE_TIME,
  });
}
