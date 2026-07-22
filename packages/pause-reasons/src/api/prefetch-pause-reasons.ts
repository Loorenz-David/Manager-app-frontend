import type { QueryClient } from "@tanstack/react-query";
import { listPauseReasons } from "./list-pause-reasons";
import { pauseReasonKeys } from "./pause-reason-keys";
import { PAUSE_REASONS_STALE_TIME } from "./use-pause-reasons-query";

export async function prefetchPauseReasonsData(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: pauseReasonKeys.list({}),
    queryFn: () => listPauseReasons({}),
    staleTime: PAUSE_REASONS_STALE_TIME,
  });
}
