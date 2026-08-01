import { QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workerStatsKeys } from "./api/worker-stats-keys";
import { workerStatsSocketEvents } from "./socket-events";

function emit(userId: string, queryClient: QueryClient): void {
  const handler = workerStatsSocketEvents["worker-shift:roster-changed"];
  handler?.(
    {
      user_id: userId,
      clocked_in: true,
      state: "in_pause",
      state_entered_at: "2026-08-01T11:15:00.000Z",
    },
    { queryClient, notify },
  );
}

describe("worker stats socket events", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses a burst into one invalidation per roster source", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    for (const userId of ["usr_a", "usr_a", "usr_a", "usr_a", "usr_a"]) {
      emit(userId, queryClient);
    }
    // Debounced: nothing has fired yet.
    expect(invalidateQueries).not.toHaveBeenCalled();

    // Advance past the debounce only — `runAllTimers` would also fire React
    // Query's 5-minute gc timers and drop the observer-less entries under test.
    vi.advanceTimersByTime(500);

    const keys = invalidateQueries.mock.calls.map(([options]) =>
      JSON.stringify(options?.queryKey),
    );
    expect(keys).toEqual([
      JSON.stringify(workerStatsKeys.lastInteractedLists()),
      JSON.stringify(workerStatsKeys.linearTimelineLists()),
      JSON.stringify(workerStatsKeys.insightsLists()),
      JSON.stringify([
        ...workerStatsKeys.linearTimelineBreakdowns(),
        "usr_a",
      ]),
    ]);
    for (const [options] of invalidateQueries.mock.calls) {
      expect(options?.refetchType).toBe("active");
    }
  });

  it("scopes the timeline breakdown invalidation to the changed worker", () => {
    const queryClient = new QueryClient();
    const params = { dateFrom: "2026-08-01", dateTo: "2026-08-05" };
    const changedKey = workerStatsKeys.linearTimelineBreakdown("usr_a", params);
    const otherKey = workerStatsKeys.linearTimelineBreakdown("usr_b", params);
    queryClient.setQueryData(changedKey, { segments: [] });
    queryClient.setQueryData(otherKey, { segments: [] });

    emit("usr_a", queryClient);
    // Advance past the debounce only — `runAllTimers` would also fire React
    // Query's 5-minute gc timers and drop the observer-less entries under test.
    vi.advanceTimersByTime(500);

    expect(queryClient.getQueryState(changedKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });
});
