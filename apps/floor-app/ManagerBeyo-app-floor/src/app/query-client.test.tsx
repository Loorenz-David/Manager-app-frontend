import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  useQuery,
} from "@tanstack/react-query";
import { useClockIn } from "@beyo/worker-shifts";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { createQueryClient } from "@/app/query-client";

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

let fetchSpy: MockInstance<typeof fetch>;

beforeEach(() => {
  // What the system gate does while the system is not READY.
  onlineManager.setOnline(false);
  // The backend is unavailable.
  fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(null, { status: 503 }));
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("floor QueryClient while the system is not READY", () => {
  it("a clock-in is sent at once and rejects as unavailable instead of pausing", async () => {
    const client = createQueryClient();
    const { result } = renderHook(useClockIn, { wrapper: wrapperFor(client) });

    let caught: unknown;
    await act(async () => {
      caught = await result.current
        .clockInAsync({ user_id: "usr_floor" })
        .catch((error: unknown) => error);
    });

    expect(caught).toMatchObject({ code: "unavailable" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [mutation] = client.getMutationCache().getAll();
    expect(mutation.state).toMatchObject({ status: "error", isPaused: false });
  });

  it("(control) with react-query's default network mode the same clock-in would pause and replay later", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
    const { result } = renderHook(useClockIn, { wrapper: wrapperFor(client) });

    act(() => {
      result.current.clockIn({ user_id: "usr_floor" });
    });

    await waitFor(() =>
      expect(client.getMutationCache().getAll()[0]?.state.isPaused).toBe(true),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    client.clear();
  });

  it("queries keep the online mode: paused while offline, fetched once online", async () => {
    const client = createQueryClient();
    const queryFn = vi.fn(async () => "value");
    const { result } = renderHook(
      () => useQuery({ queryKey: ["probe"], queryFn }),
      { wrapper: wrapperFor(client) },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe("paused"));
    expect(queryFn).not.toHaveBeenCalled();

    act(() => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(result.current.data).toBe("value"));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
