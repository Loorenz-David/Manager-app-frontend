import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_WAKE_SECONDS,
  createSystemControlMiddleware,
  createSystemSimulator,
  parseSimulationMode,
  parseWakeSeconds,
  systemControlDevServer,
} from "./index";

function bodyOf(answer: ReturnType<ReturnType<typeof createSystemSimulator>["handle"]>) {
  return answer ? JSON.parse(answer.body) : null;
}

describe("createSystemSimulator", () => {
  it("defaults to READY with the contract's headers", () => {
    const simulator = createSystemSimulator();
    const answer = simulator.handle("GET", "/system/status");
    expect(answer?.status).toBe(200);
    expect(answer?.headers).toMatchObject({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    expect(bodyOf(answer)).toEqual({ version: 1, state: "READY" });

    const wake = simulator.handle("POST", "/system/wake");
    expect(wake?.status).toBe(202);
    expect(bodyOf(wake)).toEqual({ version: 1, state: "READY" });
  });

  it("sleep: SLEEPING until a wake, then the four phases over wakeSeconds, then READY", () => {
    let now = 0;
    const simulator = createSystemSimulator({ mode: "sleep", wakeSeconds: 8, now: () => now });

    expect(bodyOf(simulator.handle("GET", "/system/status")).state).toBe("SLEEPING");
    now = 60_000;
    expect(bodyOf(simulator.handle("GET", "/system/status")).state).toBe("SLEEPING");

    expect(bodyOf(simulator.handle("POST", "/system/wake"))).toMatchObject({
      state: "STARTING",
      phase: "DATABASE",
      estimated_remaining_seconds: 8,
    });
    const phases: string[] = [];
    for (const offset of [1_000, 2_500, 4_500, 6_500, 7_900]) {
      now = 60_000 + offset;
      phases.push(bodyOf(simulator.handle("GET", "/system/status")).phase);
    }
    expect(phases).toEqual(["DATABASE", "SERVER", "APPLICATION", "HEALTH_CHECK", "HEALTH_CHECK"]);

    now = 68_000;
    expect(bodyOf(simulator.handle("GET", "/system/status"))).toEqual({ version: 1, state: "READY" });
  });

  it("a second wake while starting does not restart the clock (idempotent)", () => {
    let now = 0;
    const simulator = createSystemSimulator({ mode: "sleep", wakeSeconds: 8, now: () => now });
    simulator.handle("POST", "/system/wake");
    now = 6_000;
    simulator.handle("POST", "/system/wake");
    now = 8_000;
    expect(bodyOf(simulator.handle("GET", "/system/status")).state).toBe("READY");
  });

  it("counts wake and status calls; /__system/sleep and /__system/reset", () => {
    let now = 0;
    const simulator = createSystemSimulator({ mode: "ready", wakeSeconds: 1, now: () => now });
    simulator.handle("GET", "/system/status");
    simulator.handle("GET", "/system/status");
    expect(bodyOf(simulator.handle("GET", "/__system/stats"))).toEqual({
      wakeCalls: 0,
      statusCalls: 2,
      state: "READY",
      mode: "ready",
    });

    expect(simulator.handle("POST", "/__system/sleep")?.status).toBe(200);
    expect(bodyOf(simulator.handle("GET", "/system/status")).state).toBe("SLEEPING");
    simulator.handle("POST", "/system/wake");
    now = 1_000;
    expect(simulator.stats()).toMatchObject({ wakeCalls: 1, state: "READY" });

    simulator.handle("POST", "/__system/reset");
    expect(simulator.stats()).toEqual({ wakeCalls: 0, statusCalls: 0, state: "READY", mode: "ready" });
  });

  it("failed: FAILED with a retry hint, also after a wake", () => {
    const simulator = createSystemSimulator({ mode: "failed" });
    expect(bodyOf(simulator.handle("GET", "/system/status"))).toMatchObject({
      version: 1,
      state: "FAILED",
      retry_after_seconds: 5,
    });
    expect(bodyOf(simulator.handle("POST", "/system/wake")).state).toBe("FAILED");
  });

  it("html: answers /system/* with an index.html-like page", () => {
    const simulator = createSystemSimulator({ mode: "html" });
    const answer = simulator.handle("GET", "/system/status");
    expect(answer?.status).toBe(200);
    expect(answer?.headers["Content-Type"]).toContain("text/html");
    expect(answer?.body).toContain("<!doctype html>");
    expect(simulator.handle("POST", "/system/wake")?.headers["Content-Type"]).toContain("text/html");
    expect(simulator.stats().wakeCalls).toBe(1);
  });

  it("405 for the wrong method, 404 for unknown /system paths, null for everything else", () => {
    const simulator = createSystemSimulator();
    expect(simulator.handle("POST", "/system/status")?.status).toBe(405);
    expect(simulator.handle("GET", "/system/wake")?.status).toBe(405);
    expect(simulator.handle("GET", "/__system/sleep")?.status).toBe(405);
    expect(simulator.handle("GET", "/system/other")?.status).toBe(404);
    expect(simulator.handle("GET", "/__system/other")?.status).toBe(404);
    expect(simulator.handle("GET", "/api/v1/things")).toBeNull();
    expect(simulator.handle("GET", "/")).toBeNull();
    expect(simulator.handle("GET", "/systemic")).toBeNull();
  });
});

describe("env parsing", () => {
  it("SYSTEM_SIMULATE", () => {
    expect(parseSimulationMode(undefined)).toBe("ready");
    expect(parseSimulationMode("sleep")).toBe("sleep");
    expect(parseSimulationMode(" FAILED ")).toBe("failed");
    expect(parseSimulationMode("html")).toBe("html");
    expect(parseSimulationMode("nonsense")).toBe("ready");
  });

  it("SYSTEM_SIMULATE_WAKE_SECONDS", () => {
    expect(parseWakeSeconds(undefined)).toBe(DEFAULT_WAKE_SECONDS);
    expect(parseWakeSeconds("")).toBe(DEFAULT_WAKE_SECONDS);
    expect(parseWakeSeconds("0")).toBe(DEFAULT_WAKE_SECONDS);
    expect(parseWakeSeconds("-3")).toBe(DEFAULT_WAKE_SECONDS);
    expect(parseWakeSeconds("abc")).toBe(DEFAULT_WAKE_SECONDS);
    expect(parseWakeSeconds("2.5")).toBe(2.5);
  });
});

type FakeResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string | undefined;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
};

function fakeResponse(): FakeResponse {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

describe("createSystemControlMiddleware", () => {
  it("answers owned paths (query strings ignored) and passes the rest on", () => {
    const middleware = createSystemControlMiddleware(createSystemSimulator({ mode: "sleep" }));
    const response = fakeResponse();
    const next = vi.fn();

    middleware({ method: "GET", url: "/system/status?x=1" } as never, response as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(JSON.parse(response.body!)).toMatchObject({ state: "SLEEPING" });

    middleware({ method: "GET", url: "/src/main.tsx" } as never, fakeResponse() as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("sends no body for HEAD", () => {
    const middleware = createSystemControlMiddleware(createSystemSimulator());
    const response = fakeResponse();
    middleware({ method: "HEAD", url: "/system/status" } as never, response as never, vi.fn());
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeUndefined();
  });
});

describe("systemControlDevServer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function resolve(plugin: ReturnType<typeof systemControlDevServer>) {
    const info = vi.fn();
    const hook = plugin.configResolved as (config: unknown) => void;
    hook({ mode: "development", root: "/nonexistent-root", envDir: "/nonexistent-root", logger: { info } });
    const uses: Array<(req: unknown, res: unknown, next: () => void) => void> = [];
    const server = { middlewares: { use: (fn: (typeof uses)[number]) => uses.push(fn) } };
    (plugin.configureServer as (server: unknown) => void)(server);
    (plugin.configurePreviewServer as (server: unknown) => void)(server);
    return { uses, info };
  }

  it("is a serve-only plugin (dev and preview), never part of a build", () => {
    const plugin = systemControlDevServer();
    expect(plugin.apply).toBe("serve");
    const { uses } = resolve(plugin);
    expect(uses).toHaveLength(2);
  });

  it("reads SYSTEM_SIMULATE and SYSTEM_SIMULATE_WAKE_SECONDS from the environment", () => {
    vi.stubEnv("SYSTEM_SIMULATE", "sleep");
    vi.stubEnv("SYSTEM_SIMULATE_WAKE_SECONDS", "3");
    const { uses, info } = resolve(systemControlDevServer());
    expect(info).toHaveBeenCalledWith(expect.stringContaining("sleep (wake takes 3s)"));

    const response = fakeResponse();
    uses[0]({ method: "GET", url: "/system/status" }, response, vi.fn());
    expect(JSON.parse(response.body!).state).toBe("SLEEPING");
  });

  it("defaults to READY; options override the environment", () => {
    vi.stubEnv("SYSTEM_SIMULATE", "sleep");
    const { uses } = resolve(systemControlDevServer({ simulate: "ready" }));
    const response = fakeResponse();
    uses[1]({ method: "GET", url: "/system/status" }, response, vi.fn());
    expect(JSON.parse(response.body!).state).toBe("READY");
  });
});
