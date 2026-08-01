import {
  skipToken,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { fetchCurrentShift } from "./fetch-current-shift";
import { WORKER_SHIFT_SELF_SCOPE, workerShiftKeys } from "./worker-shift-keys";

/**
 * Self-scope read for a **worker-role** session: calls
 * `GET /worker-shifts/current` with no `user_id`. A manager-role token signed
 * into the worker app gets a 403 here by design (handoff §12.1) — callers must
 * role-gate rather than treat that as an auth failure, so this hook takes an
 * `enabled` flag instead of firing unconditionally.
 */
export function useMyCurrentShiftQuery(enabled = true) {
  return useQuery({
    queryKey: workerShiftKeys.current({ user_id: WORKER_SHIFT_SELF_SCOPE }),
    queryFn: enabled ? () => fetchCurrentShift() : skipToken,
  });
}

export function useCurrentShiftQuery(user_id?: string) {
  return useQuery({
    queryKey: user_id
      ? workerShiftKeys.current({ user_id })
      : workerShiftKeys.current({ user_id: "" }),
    queryFn: user_id ? () => fetchCurrentShift(user_id) : skipToken,
  });
}

export function fetchFreshCurrentShift(
  queryClient: QueryClient,
  user_id: string,
) {
  return queryClient.fetchQuery({
    queryKey: workerShiftKeys.current({ user_id }),
    queryFn: () => fetchCurrentShift(user_id),
    staleTime: 0,
  });
}
