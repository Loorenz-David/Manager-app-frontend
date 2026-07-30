import { useQuery } from "@tanstack/react-query";
import { fetchFloorRoster, FLOOR_ROSTER_PARAMS } from "./fetch-floor-roster";
import { workerShiftKeys } from "./worker-shift-keys";

export const FLOOR_ROSTER_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

export function useFloorRosterQuery() {
  return useQuery({
    queryKey: workerShiftKeys.floorRosterList(FLOOR_ROSTER_PARAMS),
    queryFn: fetchFloorRoster,
    refetchInterval: FLOOR_ROSTER_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: 'always',
    staleTime: FLOOR_ROSTER_REFRESH_INTERVAL_MS,
  });
}
