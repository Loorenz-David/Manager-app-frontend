import { QueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { describe, expect, it, vi } from "vitest";
import {
  WORKER_SHIFT_SELF_SCOPE,
  workerShiftKeys,
} from "./api/worker-shift-keys";
import { workerShiftSocketEvents } from "./socket-events";
import type { CurrentShift } from "./types";

const SELF_KEY = workerShiftKeys.current({ user_id: WORKER_SHIFT_SELF_SCOPE });

const PAUSED_PAYLOAD = {
  user_id: "usr_01J3N6K2P6Z0X3Y9V7Q8W5R4T1",
  clocked_in: true,
  shift_started_at: "2026-08-01T07:02:11.482Z",
  state: "in_pause",
  state_entered_at: "2026-08-01T11:15:00.000Z",
  pause_reason: { id: "par_lunch", name: "Lunch", image_url: null },
  declared_state: {
    id: "dst_01",
    pause_reason: { id: "par_lunch", name: "Lunch", image_url: null },
    description: "doctor appointment",
    entered_at: "2026-08-01T11:15:00.000Z",
  },
} as const;

function emit(payload: unknown, queryClient: QueryClient): void {
  const handler = workerShiftSocketEvents["worker-shift:state-changed"];
  handler?.(payload as never, { queryClient, notify });
}

describe("worker shift socket events", () => {
  it("writes the payload into the self-scope cache without refetching", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    emit(PAUSED_PAYLOAD, queryClient);

    expect(queryClient.getQueryData<CurrentShift>(SELF_KEY)).toMatchObject({
      state: "in_pause",
      // The live timer anchors to this, so it must be the server's timestamp.
      state_entered_at: "2026-08-01T11:15:00.000Z",
      pause_reason: { name: "Lunch" },
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("lands a clock-out as clocked_in: false over a working state", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(SELF_KEY, {
      ...PAUSED_PAYLOAD,
      state: "working",
      pause_reason: null,
      declared_state: null,
    });

    emit(
      {
        user_id: PAUSED_PAYLOAD.user_id,
        clocked_in: false,
        shift_started_at: null,
        state: null,
        state_entered_at: null,
        pause_reason: null,
        declared_state: null,
      },
      queryClient,
    );

    expect(queryClient.getQueryData<CurrentShift>(SELF_KEY)).toMatchObject({
      clocked_in: false,
      state: null,
    });
  });

  it("falls back to invalidation when the payload does not match the contract", () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    emit({ user_id: PAUSED_PAYLOAD.user_id, state: "in_pause" }, queryClient);

    expect(queryClient.getQueryData(SELF_KEY)).toBeUndefined();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: SELF_KEY,
      refetchType: "active",
    });
  });

  it("refreshes an existing user-scoped entry but never creates one", () => {
    const queryClient = new QueryClient();
    const userKey = workerShiftKeys.current({ user_id: PAUSED_PAYLOAD.user_id });

    emit(PAUSED_PAYLOAD, queryClient);
    expect(queryClient.getQueryData(userKey)).toBeUndefined();

    queryClient.setQueryData(userKey, {
      ...PAUSED_PAYLOAD,
      state: "working",
      pause_reason: null,
      declared_state: null,
    });
    emit(PAUSED_PAYLOAD, queryClient);

    expect(queryClient.getQueryData<CurrentShift>(userKey)).toMatchObject({
      state: "in_pause",
    });
  });
});
