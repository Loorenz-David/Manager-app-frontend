import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskStepId } from "@beyo/lib";
import { usePushSubscription } from "@beyo/notifications";

import { useMarkAcknowledgmentsSeen } from "@/features/task_steps/actions/use-mark-acknowledgments-seen";
import { NotificationDeepLinkMount } from "./NotificationDeepLinkMount";

// X-Beyo-Activity: requests these automatic paths send must be marked
// background, whatever the method, so an idle open tab never keeps production
// awake. Only the network edge (`apiClient.post`) is replaced.

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@beyo/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@beyo/api-client")>();
  return { ...actual, apiClient: { ...actual.apiClient, post: mocks.post } };
});

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function postsTo(path: string): unknown[][] {
  return mocks.post.mock.calls.filter((call) => call[0] === path);
}

beforeEach(() => {
  mocks.post.mockReset();
  mocks.post.mockImplementation(async (path: string) => {
    if (path === "/api/v1/notifications/push-subscription") {
      return { ok: true, data: { subscription: { client_id: "psub_1" } } };
    }
    if (path === "/api/v1/task-step-acknowledgments/seen") {
      return { ok: true, data: { seen_step_ids: [] } };
    }
    return { ok: true, data: null };
  });
});

describe("automatic requests are marked background", () => {
  describe("push subscription reconcile on mount", () => {
    const originalServiceWorker = Object.getOwnPropertyDescriptor(
      navigator,
      "serviceWorker",
    );

    beforeEach(() => {
      const subscription = {
        endpoint: "https://push.test/endpoint",
        getKey: () => new Uint8Array([1, 2, 3]).buffer,
      };
      const registration = {
        active: { state: "activated" },
        pushManager: { getSubscription: async () => subscription },
      };
      vi.stubGlobal("Notification", { permission: "granted" });
      vi.stubGlobal("PushManager", function PushManager() {});
      vi.stubGlobal("matchMedia", () => ({ matches: false }));
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          ready: Promise.resolve(registration),
          getRegistration: async () => registration,
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      if (originalServiceWorker) {
        Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
      } else {
        delete (navigator as { serviceWorker?: unknown }).serviceWorker;
      }
    });

    it("re-registers an existing subscription as background", async () => {
      const { result } = renderHook(() => usePushSubscription());

      await waitFor(() => expect(result.current.status).toBe("registered"));

      const calls = postsTo("/api/v1/notifications/push-subscription");
      expect(calls).toHaveLength(1);
      expect(calls[0]?.[3]).toEqual({ activity: "background" });
    });
  });

  it("the notification deep link marks the notification read as background", async () => {
    render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/?notif_type=upholstery&notif_cid=not_01JABCDEFGHJKMNPQRSTVWXYZ0"] },
        createElement(NotificationDeepLinkMount),
      ),
      { wrapper },
    );

    await waitFor(() =>
      expect(postsTo("/api/v1/notifications/mark-read")).toHaveLength(1),
    );
    const [call] = postsTo("/api/v1/notifications/mark-read");
    expect(call?.[2]).toEqual({
      notification_client_ids: ["not_01JABCDEFGHJKMNPQRSTVWXYZ0"],
      mark_all_read: false,
    });
    expect(call?.[3]).toEqual({ activity: "background" });
  });

  it("the passive reassignment read receipt is background", async () => {
    const { result } = renderHook(() => useMarkAcknowledgmentsSeen(), {
      wrapper,
    });

    act(() => {
      result.current.markSeen({ step_ids: ["tsp_1" as TaskStepId] });
    });

    await waitFor(() =>
      expect(postsTo("/api/v1/task-step-acknowledgments/seen")).toHaveLength(1),
    );
    const [call] = postsTo("/api/v1/task-step-acknowledgments/seen");
    expect(call?.[2]).toEqual({ step_ids: ["tsp_1"] });
    expect(call?.[3]).toEqual({ activity: "background" });
  });
});
