import { ApiRequestError } from "@beyo/api-client";
import type { TaskId } from "@beyo/lib";
import { useQuery } from "@tanstack/react-query";

import { fetchTaskPriceScenario } from "./fetch-task-price-scenario";
import { itemEconomicsKeys } from "./item-economics-keys";

/**
 * The scenario read behind the expected sold price screen.
 *
 * `staleTime: 0` is load-bearing, not a default: the app's global default is a
 * minute, and both halves of M10 depend on this query actually going to the
 * server — a fresh fetch on every surface open (the slide unmounts on close, so
 * mounting is opening) and a real refetch when the window regains focus. The
 * other half of M10, the 60 s gate on the Save press itself, lives in the
 * controller.
 */
export function useTaskPriceScenarioQuery(taskId: TaskId) {
  return useQuery({
    queryKey: itemEconomicsKeys.priceScenario(taskId),
    queryFn: () => fetchTaskPriceScenario(taskId),
    enabled: Boolean(taskId),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    // A 404 (unknown/deleted task) and a 403 (the endpoint admits ADMIN and
    // MANAGER only) are both terminal — retrying cannot recover either.
    retry: (count, error) =>
      !(
        error instanceof ApiRequestError &&
        (error.status === 404 || error.status === 403)
      ) && count < 1,
  });
}
