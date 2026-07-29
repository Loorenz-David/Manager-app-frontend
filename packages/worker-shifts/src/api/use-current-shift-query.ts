import {
  skipToken,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import { fetchCurrentShift } from "./fetch-current-shift";
import { workerShiftKeys } from "./worker-shift-keys";

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
