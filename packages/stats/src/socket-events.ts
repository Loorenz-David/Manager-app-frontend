import { debouncedInvalidation, type SocketEventHandlers } from "@beyo/realtime";
import { workerStatsKeys } from "./api/worker-stats-keys";

// A busy floor emits a few of these per worker per hour, but a batch clock-out
// or the overnight safeguard can land a burst within one tick — coalesce so the
// roster refetches once, not once per worker.
const ROSTER_INVALIDATION_DEBOUNCE_MS = 400;

/**
 * `worker-shift:roster-changed` is a workspace broadcast carrying only
 * `user_id`/`clocked_in`/`state` — a signal to refetch, never the whole truth
 * (pause reason and declared-state description are withheld from the workspace
 * room by design). So this invalidates the role-gated `/worker-stats/` reads
 * rather than patching anything into the cache.
 *
 * Every invalidation is `refetchType: "active"`: with the stats slides closed,
 * nothing refetches and the event costs one map lookup.
 *
 * Debugging note: because the invalidations fire on a timer, the realtime log
 * records this event with an empty `invalidated` list — the work happens after
 * the dispatch entry is written.
 */
export const workerStatsSocketEvents: SocketEventHandlers = {
  "worker-shift:roster-changed": ({ user_id }, { queryClient }) => {
    // Roster page — the three sources WorkerStatsCard unions.
    debouncedInvalidation(
      queryClient,
      workerStatsKeys.lastInteractedLists(),
      ROSTER_INVALIDATION_DEBOUNCE_MS,
    );
    debouncedInvalidation(
      queryClient,
      workerStatsKeys.linearTimelineLists(),
      ROSTER_INVALIDATION_DEBOUNCE_MS,
    );
    debouncedInvalidation(
      queryClient,
      workerStatsKeys.insightsLists(),
      ROSTER_INVALIDATION_DEBOUNCE_MS,
    );

    // Timeline calendar — one cache entry per (user, window). Invalidate the
    // changed worker's prefix only, so another worker's prefetched windows (and
    // the neighbour windows this worker's pager already warmed) are untouched.
    debouncedInvalidation(
      queryClient,
      [...workerStatsKeys.linearTimelineBreakdowns(), user_id],
      ROSTER_INVALIDATION_DEBOUNCE_MS,
    );
  },
};
