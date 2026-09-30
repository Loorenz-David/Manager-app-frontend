import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initSession } from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { AuthProvider } from "./AuthProvider";

vi.mock("@beyo/api-client", () => ({
  initSession: vi.fn(),
  decodeTokenClaims: vi.fn(() => null),
  apiClient: { get: vi.fn() },
}));

vi.mock("@beyo/ui", () => ({
  PageSkeleton: () => <div data-testid="page-skeleton" />,
}));

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

beforeEach(() => {
  vi.useFakeTimers();
  useAuthStore.getState().clearAuth();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AuthProvider session restore", () => {
  it("finishes unauthenticated on 'invalid' (today's behaviour)", async () => {
    vi.mocked(initSession).mockResolvedValue("invalid");

    renderProvider();
    await act(async () => {});

    expect(screen.getByTestId("app")).toBeTruthy();
    expect(initSession).toHaveBeenCalledTimes(1);
  });

  it("stays loading on 'unavailable' — no redirect, no clearAuth — and retries", async () => {
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
    expect(initSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(initSession).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("app")).toBeTruthy();
  });
});
