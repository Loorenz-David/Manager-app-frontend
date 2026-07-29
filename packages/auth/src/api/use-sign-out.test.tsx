import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  FLOOR_ACCESS_TOKEN_STORAGE_KEY,
  getAccessToken,
  setAccessToken,
} from "@beyo/api-client";
import {
  resetNotificationToastTracking,
  unregisterCurrentDevicePush,
} from "@beyo/notifications";
import { AppScope } from "../roles";
import { useAuthStore } from "../store/auth.store";
import { useSignOutMutation } from "./use-sign-out";

vi.mock("@beyo/notifications", () => ({
  resetNotificationToastTracking: vi.fn(),
  unregisterCurrentDevicePush: vi.fn(),
}));

function createQueryHarness() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return { queryClient, Wrapper };
}

beforeEach(() => {
  window.localStorage.clear();
  setAccessToken(null, AppScope.Floor);
  useAuthStore.getState().clearAuth();
  vi.mocked(unregisterCurrentDevicePush).mockResolvedValue(undefined);
});

describe("useSignOutMutation floor scope", () => {
  it("clears the persisted floor token when the logout API fails", async () => {
    const logoutFailure = new Error("logout failed");
    const post = vi.spyOn(apiClient, "post").mockRejectedValue(logoutFailure);
    const onSignedOut = vi.fn();
    const { queryClient, Wrapper } = createQueryHarness();
    queryClient.setQueryData(["private-floor-data"], "sensitive");
    setAccessToken("floor-token", AppScope.Floor);
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(
      () =>
        useSignOutMutation({
          appScope: AppScope.Floor,
          onSignedOut,
        }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBe(logoutFailure);
    });

    expect(post).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.anything(),
      {},
    );
    expect(window.localStorage.getItem(FLOOR_ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(queryClient.getQueryData(["private-floor-data"])).toBeUndefined();
    expect(resetNotificationToastTracking).toHaveBeenCalledOnce();
    expect(onSignedOut).toHaveBeenCalledOnce();
  });

  it("keeps the existing non-floor failure behavior", async () => {
    const logoutFailure = new Error("logout failed");
    vi.spyOn(apiClient, "post").mockRejectedValue(logoutFailure);
    const { queryClient, Wrapper } = createQueryHarness();
    setAccessToken("manager-token", AppScope.Manager);
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(() => useSignOutMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBe(logoutFailure);
    });

    expect(getAccessToken()).toBe("manager-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetNotificationToastTracking).not.toHaveBeenCalled();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
