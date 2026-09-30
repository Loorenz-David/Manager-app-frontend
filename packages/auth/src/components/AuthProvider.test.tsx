import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  apiClient,
  decodeTokenClaims,
  initSession,
  SYSTEM_UNAVAILABLE_EVENT,
  type SystemUnavailableDetail,
} from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { AuthProvider } from "./AuthProvider";

vi.mock("@beyo/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/api-client")>();
  return {
    ...actual,
    initSession: vi.fn(),
    decodeTokenClaims: vi.fn(() => null),
    apiClient: { get: vi.fn() },
  };
});

vi.mock("@beyo/ui", () => ({
  PageSkeleton: () => <div data-testid="page-skeleton" />,
}));

/**
 * A stand-in for the page's system gate: the provider only reads the state
 * (`getSystemState`) and listens to it (`subscribeSystemState`).
 */
const gate = vi.hoisted(() => {
  type Snapshot = { state: string };
  let snapshot: Snapshot = { state: "READY" };
  const listeners = new Set<(snapshot: Snapshot) => void>();
  return {
    get: () => snapshot,
    set(state: string) {
      snapshot = { state };
      for (const listener of listeners) listener(snapshot);
    },
    reset() {
      snapshot = { state: "READY" };
      listeners.clear();
    },
    subscribe(listener: (snapshot: Snapshot) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount: () => listeners.size,
  };
});

vi.mock("@beyo/system-control", () => ({
  getSystemState: () => gate.get(),
  subscribeSystemState: (listener: (snapshot: { state: string }) => void) =>
    gate.subscribe(listener),
}));

const CLAIMS = {
  user_id: "usr_1",
  username: "Ada",
  workspace_id: "wrk_1",
  workspace_role_id: "wrole_1",
  role_name: "manager",
  workspace_role_name: "manager",
  workspace_specialization: null,
  app_scope: "manager",
  time_zone: "Europe/Stockholm",
  backend_permissions: [],
  ui: { apps: [], pages: [], buttons: [], actions: [], query_filters: [] },
  jti: "jti_1",
  exp: 4_102_444_800,
} as const;

const PROFILE = {
  ok: true,
  data: {
    user: { client_id: "usr_1", email: "ada@example.com", username: "Ada" },
  },
  warnings: [],
};

function unavailableError(): ApiRequestError {
  return new ApiRequestError(0, "unavailable", "The server could not be reached.");
}

function renderProvider() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <AuthProvider appScope="manager" signInRoute="/sign-in">
                <div data-testid="app">app</div>
              </AuthProvider>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The gate notices the outage, then gets over it. */
async function gateRecovers(): Promise<void> {
  await act(async () => {
    gate.set("UNAVAILABLE");
  });
  await act(async () => {
    gate.set("READY");
  });
}

let unavailableEvents: SystemUnavailableDetail[] = [];
function recordUnavailable(event: Event): void {
  unavailableEvents.push((event as CustomEvent<SystemUnavailableDetail>).detail);
}

beforeEach(() => {
  vi.useFakeTimers();
  gate.reset();
  useAuthStore.getState().clearAuth();
  vi.mocked(initSession).mockReset();
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(decodeTokenClaims).mockReset().mockReturnValue(null);
  unavailableEvents = [];
  window.addEventListener(SYSTEM_UNAVAILABLE_EVENT, recordUnavailable);
});

afterEach(() => {
  window.removeEventListener(SYSTEM_UNAVAILABLE_EVENT, recordUnavailable);
  cleanup();
  vi.useRealTimers();
});

describe("AuthProvider session restore", () => {
  it("finishes unauthenticated on 'invalid' (a credential verdict)", async () => {
    vi.mocked(initSession).mockResolvedValue("invalid");

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("app")).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(initSession).toHaveBeenCalledTimes(1);
    expect(unavailableEvents).toEqual([]);
  });

  it("stays loading on 'unavailable' — no redirect, no clearAuth — reports it and retries when the gate is READY again", async () => {
    vi.mocked(initSession)
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("invalid");
    const clearAuth = vi.spyOn(useAuthStore.getState(), "clearAuth");

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("app")).toBeNull();
    expect(screen.queryByTestId("sign-in")).toBeNull();
    expect(clearAuth).not.toHaveBeenCalled();
    // The raw refresh fetch is reported to the gate, classified like the
    // refresh itself (a visible page opening: user).
    expect(unavailableEvents).toEqual([
      { status: 0, path: "/api/v1/auth/refresh", background: false },
    ]);

    // No fixed timer drives the retry any more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(initSession).toHaveBeenCalledTimes(1);

    await gateRecovers();

    expect(initSession).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("app")).toBeTruthy();
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it("classifies only the first attempt by visibility; retries are background", async () => {
    vi.mocked(initSession)
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("invalid");

    renderProvider();
    await act(async () => {});
    await gateRecovers();
    await gateRecovers();

    expect(vi.mocked(initSession).mock.calls).toEqual([
      ["manager", { activity: "user" }],
      ["manager", { activity: "background" }],
      ["manager", { activity: "background" }],
    ]);
    expect(unavailableEvents.map((detail) => detail.background)).toEqual([
      false,
      true,
    ]);
    expect(screen.getByTestId("app")).toBeTruthy();
  });

  it("classifies a boot on a hidden page as background", async () => {
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden");
    vi.mocked(initSession).mockResolvedValueOnce("unavailable");

    renderProvider();
    await act(async () => {});

    expect(vi.mocked(initSession).mock.calls[0]).toEqual([
      "manager",
      { activity: "background" },
    ]);
    expect(unavailableEvents).toEqual([
      { status: 0, path: "/api/v1/auth/refresh", background: true },
    ]);
    visibility.mockRestore();
  });

  it("falls back to a slow background retry when the gate never leaves READY", async () => {
    vi.mocked(initSession)
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("invalid");

    renderProvider();
    await act(async () => {});

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000);
    });
    expect(initSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(vi.mocked(initSession).mock.calls[1]).toEqual([
      "manager",
      { activity: "background" },
    ]);
    expect(screen.getByTestId("app")).toBeTruthy();
  });

  it("never retries while the system sleeps: the fallback timer re-arms", async () => {
    vi.mocked(initSession)
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("invalid");

    renderProvider();
    await act(async () => {});
    await act(async () => {
      gate.set("DORMANT");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(initSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("page-skeleton")).toBeTruthy();

    await act(async () => {
      gate.set("STARTING");
    });
    await act(async () => {
      gate.set("READY");
    });
    expect(initSession).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("app")).toBeTruthy();
  });

  it("stops waiting on unmount", async () => {
    vi.mocked(initSession).mockResolvedValueOnce("unavailable");

    const view = renderProvider();
    await act(async () => {});
    expect(gate.listenerCount()).toBe(1);

    view.unmount();
    expect(gate.listenerCount()).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(initSession).toHaveBeenCalledTimes(1);
  });
});

describe("AuthProvider /users/me", () => {
  it("signs the user in when the session and the profile load", async () => {
    vi.mocked(initSession).mockResolvedValue("ok");
    vi.mocked(decodeTokenClaims).mockReturnValue(CLAIMS as never);
    vi.mocked(apiClient.get).mockResolvedValue(PROFILE);

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("app")).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(vi.mocked(apiClient.get).mock.calls[0]?.[3]).toEqual({
      activity: "user",
    });
  });

  it("stays loading on an unavailable /me — no sign-out — and retries on READY", async () => {
    vi.mocked(initSession).mockResolvedValue("ok");
    vi.mocked(decodeTokenClaims).mockReturnValue(CLAIMS as never);
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(unavailableError())
      .mockResolvedValueOnce(PROFILE);
    const clearAuth = vi.spyOn(useAuthStore.getState(), "clearAuth");

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("page-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("app")).toBeNull();
    expect(screen.queryByTestId("sign-in")).toBeNull();
    expect(clearAuth).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // The api-client reports /me's outage itself; the provider adds nothing.
    expect(unavailableEvents).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    await gateRecovers();

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(vi.mocked(apiClient.get).mock.calls[1]?.[3]).toEqual({
      activity: "background",
    });
    expect(screen.getByTestId("app")).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it("finishes signed out on a 401 /me and follows the session-expired redirect", async () => {
    vi.mocked(initSession).mockResolvedValue("ok");
    vi.mocked(decodeTokenClaims).mockReturnValue(CLAIMS as never);
    vi.mocked(apiClient.get).mockImplementation(async () => {
      // What the api-client does on a 401 it cannot refresh.
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
      throw new ApiRequestError(401, "unauthorized", "Session expired.");
    });
    const clearAuth = vi.spyOn(useAuthStore.getState(), "clearAuth");

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("sign-in")).toBeTruthy();
    expect(clearAuth).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(gate.listenerCount()).toBe(0);
  });

  it("finishes signed out on a non-outage /me failure (no wait)", async () => {
    vi.mocked(initSession).mockResolvedValue("ok");
    vi.mocked(decodeTokenClaims).mockReturnValue(CLAIMS as never);
    vi.mocked(apiClient.get).mockRejectedValue(
      new ApiRequestError(403, "forbidden", "Forbidden."),
    );

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("app")).toBeTruthy();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(gate.listenerCount()).toBe(0);
  });
});
