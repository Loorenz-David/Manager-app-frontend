import { vi } from "vitest";

import {
  createSystemSimulator,
  type SimulationMode,
  type SystemSimulator,
} from "../vite/simulator";

export type ControlPlaneCall = {
  method: string;
  url: string;
  init: RequestInit | undefined;
};

/** A reply that overrides the simulator for the next matching requests. */
export type Override =
  | { kind: "network" }
  /** Never answers; only the client's abort (timeout) ends it. */
  | { kind: "hang" }
  | { kind: "raw"; status: number; contentType: string | null; body: string };

/**
 * A `fetch` backed by the dev-server simulator (the same handlers `vite dev`
 * serves), with per-method overrides for broken answers. Time comes from
 * `Date.now`, so vitest's fake timers drive the simulated start.
 */
export function createFakeControlPlane(
  mode: SimulationMode = "ready",
  wakeSeconds = 8,
) {
  const simulator: SystemSimulator = createSystemSimulator({ mode, wakeSeconds });
  const calls: ControlPlaneCall[] = [];
  const overrides: { GET: Override | null; POST: Override | null } = {
    GET: null,
    POST: null,
  };
  let simulatorRef = simulator;

  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push({ method, url, init });
      const override = overrides[method as "GET" | "POST"];
      if (override?.kind === "network") throw new TypeError("Failed to fetch");
      if (override?.kind === "hang") {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          );
        });
      }
      if (override?.kind === "raw") {
        return new Response(override.body, {
          status: override.status,
          headers: override.contentType ? { "Content-Type": override.contentType } : {},
        });
      }
      const answer = simulatorRef.handle(method, new URL(url).pathname);
      if (!answer) return new Response("not found", { status: 404 });
      return new Response(answer.body, { status: answer.status, headers: answer.headers });
    },
  );

  return {
    fetch: fetchImpl as unknown as typeof fetch,
    calls,
    wakeCalls: () => calls.filter((call) => call.method === "POST").length,
    statusCalls: () => calls.filter((call) => call.method === "GET").length,
    override(method: "GET" | "POST", value: Override | null) {
      overrides[method] = value;
    },
    /** POST /__system/sleep on the simulator (not counted as a call). */
    sleep() {
      simulatorRef.handle("POST", "/__system/sleep");
    },
    /** Replaces the simulated system (e.g. switch to another mode). */
    reset(nextMode: SimulationMode, nextWakeSeconds = wakeSeconds) {
      simulatorRef = createSystemSimulator({ mode: nextMode, wakeSeconds: nextWakeSeconds });
    },
    get simulator() {
      return simulatorRef;
    },
  };
}

let visibility: DocumentVisibilityState = "visible";

/** Makes `document.visibilityState` controllable (jsdom has no real tabs). */
export function installVisibility(initial: DocumentVisibilityState = "visible"): void {
  visibility = initial;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => visibility !== "visible",
  });
}

export function setVisibility(next: DocumentVisibilityState): void {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

export function dispatchUnavailable(background: boolean): void {
  window.dispatchEvent(
    new CustomEvent("system:unavailable", {
      detail: { status: 503, path: "/api/v1/things", background },
    }),
  );
}

/** api-client's hint that a request has been pending for a while. */
export function dispatchSlowRequest(background: boolean): void {
  window.dispatchEvent(
    new CustomEvent("system:slow-request", {
      detail: { path: "/api/v1/slow", background },
    }),
  );
}

export function dispatchAvailable(): void {
  window.dispatchEvent(new CustomEvent("system:available"));
}
