import { useQuery } from "@tanstack/react-query";
import { getPauseReason } from "./get-pause-reason";
import { pauseReasonKeys } from "./pause-reason-keys";
import type { PauseReasonId } from "@beyo/lib";

export function usePauseReasonQuery(id: PauseReasonId) {
  return useQuery({
    queryKey: pauseReasonKeys.detail(id),
    queryFn: () => getPauseReason(id),
  });
}
