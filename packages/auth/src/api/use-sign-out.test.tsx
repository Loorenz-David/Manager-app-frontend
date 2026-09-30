import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiClient,
  ApiRequestError,
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
import { SIGN_OUT_FAILED_MESSAGE, useSignOutMutation } from "./use-sign-out";

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
  vi.clearAllMocks();
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
});

describe("useSignOutMutation non-floor scopes", () => {
  it("does not pretend success when the logout is unavailable (503)", async () => {
    const outage = new ApiRequestError(503, "unavailable", "Auth unavailable.", {
      serverCode: "auth_unavailable",
    });
    vi.spyOn(apiClient, "post").mockRejectedValue(outage);
    const onSignedOut = vi.fn();
    const { queryClient, Wrapper } = createQueryHarness();
    queryClient.setQueryData(["private-manager-data"], "kept");
    setAccessToken("manager-token", AppScope.Manager);
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(() => useSignOutMutation({ onSignedOut }), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBe(outage);
    });

    // Still signed in, locally and (the backend kept the cookie) remotely.
    expect(getAccessToken()).toBe("manager-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(resetNotificationToastTracking).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["private-manager-data"])).toBe("kept");
    expect(onSignedOut).not.toHaveBeenCalled();
    // The caller can show the failure.
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(outage);
    expect(SIGN_OUT_FAILED_MESSAGE).toBe("Couldn't sign out — try again");
  });

  it("does not run a caller's success navigation when the logout fails", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("offline"));
    const navigate = vi.fn();
    const { Wrapper } = createQueryHarness();
    setAccessToken("manager-token", AppScope.Manager);

    const { result } = renderHook(() => useSignOutMutation(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate(undefined, { onSuccess: navigate });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("signs out, clears the cache and calls onSignedOut on success", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValue({
      ok: true,
      data: {},
      warnings: [],
    });
    const onSignedOut = vi.fn();
    const { queryClient, Wrapper } = createQueryHarness();
    queryClient.setQueryData(["private-manager-data"], "sensitive");
    setAccessToken("manager-token", AppScope.Manager);
    useAuthStore.setState({ isAuthenticated: true });

    const { result } = renderHook(() => useSignOutMutation({ onSignedOut }), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(resetNotificationToastTracking).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(["private-manager-data"])).toBeUndefined();
    expect(onSignedOut).toHaveBeenCalledOnce();
    expect(result.current.isError).toBe(false);
  });
});
