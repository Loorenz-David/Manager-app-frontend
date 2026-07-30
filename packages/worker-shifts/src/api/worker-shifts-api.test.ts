import { act, renderHook, waitFor } from "@testing-library/react";
import { focusManager, QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  MOCK_CLOCKED_IN_USER_ID,
  MOCK_UNKNOWN_USER_ID,
} from "../mocks";
import { createQueryTestWrapper } from "../test/query-wrapper";
import { workerShiftTestServer } from "../test/server";
import { fetchCurrentShift } from "./fetch-current-shift";
import { fetchFloorRoster } from "./fetch-floor-roster";
import {
  fetchFreshCurrentShift,
  useCurrentShiftQuery,
} from "./use-current-shift-query";
import { useFloorRosterQuery } from './use-floor-roster-query';
import { workerShiftKeys } from "./worker-shift-keys";

describe("worker-shift API and query behavior", () => {
  it("builds params-last scoped query keys", () => {
    expect(
      workerShiftKeys.floorRosterList({
        role: "worker",
        compact: true,
        limit: 200,
      }),
    ).toEqual([
      "worker-shifts",
      "floor-roster",
      "list",
      { role: "worker", compact: true, limit: 200 },
    ]);
    expect(
      workerShiftKeys.current({ user_id: MOCK_CLOCKED_IN_USER_ID }),
    ).toEqual([
      "worker-shifts",
      "current",
      "list",
      { user_id: MOCK_CLOCKED_IN_USER_ID },
    ]);
  });

  it("keeps current-shift querying disabled until user_id is present", () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(() => useCurrentShiftQuery(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches the current shift and exposes 404 for an unknown target", async () => {
    await expect(fetchCurrentShift(MOCK_CLOCKED_IN_USER_ID)).resolves.toMatchObject(
      { user_id: MOCK_CLOCKED_IN_USER_ID, clocked_in: true },
    );
    await expect(fetchCurrentShift(MOCK_UNKNOWN_USER_ID)).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
  });

  it("imperatively fetches fresh server state instead of a seeded cache value", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(
      workerShiftKeys.current({ user_id: MOCK_CLOCKED_IN_USER_ID }),
      {
        user_id: MOCK_CLOCKED_IN_USER_ID,
        clocked_in: false,
        shift_started_at: null,
        state: null,
        state_entered_at: null,
        pause_reason: null,
        declared_state: null,
      },
    );

    await expect(
      fetchFreshCurrentShift(queryClient, MOCK_CLOCKED_IN_USER_ID),
    ).resolves.toMatchObject({ clocked_in: true });
  });

  it("warns once when the floor roster reaches exactly 200 rows", async () => {
    const users = Array.from({ length: 200 }, (_, index) => ({
      client_id: `usr_${index}`,
      username: `Worker ${index}`,
      profile_picture: `https://example.com/${index}.jpg`,
      role: { name: "Worker" },
      clock_in_code: null,
      email: `worker${index}@shop.com`,
    }));
    workerShiftTestServer.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json({ ok: true, warnings: [], data: { users } }),
      ),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(fetchFloorRoster()).resolves.toHaveLength(200);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("parses the null profile-picture roster fixture through the API", async () => {
    await expect(fetchFloorRoster()).resolves.toContainEqual(
      expect.objectContaining({
        client_id: "usr_floor_002",
        profile_picture: null,
      }),
    );
  });

  it("runs the enabled current query through TanStack Query", async () => {
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(
      () => useCurrentShiftQuery(MOCK_CLOCKED_IN_USER_ID),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.clocked_in).toBe(true);
  });

  it('refetches the fresh roster when the kiosk regains focus', async () => {
    let requests = 0;
    workerShiftTestServer.use(
      http.get('*/api/v1/users', () => {
        requests += 1;
        return HttpResponse.json({
          ok: true,
          warnings: [],
          data: {
            users: [
              {
                client_id: 'usr_focus',
                username: 'Focus Worker',
                profile_picture: null,
                role: { name: 'Assembly' },
                clock_in_code: '4821',
                email: 'focus@shop.com',
              },
            ],
          },
        });
      }),
    );
    const { Wrapper } = createQueryTestWrapper();
    const { result } = renderHook(() => useFloorRosterQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests).toBe(1);

    act(() => focusManager.setFocused(false));
    act(() => focusManager.setFocused(true));

    await waitFor(() => expect(requests).toBe(2));
    focusManager.setFocused(undefined);
  });
});
