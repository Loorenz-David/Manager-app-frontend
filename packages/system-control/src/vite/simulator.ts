/**
 * The dev/preview stand-in for the system-control contract, as plain handler
 * functions (no Vite, no HTTP server): `handle(method, pathname)` returns the
 * response to send, or null for paths it does not own.
 *
 *   GET  /system/status   the contract (version 1)
 *   POST /system/wake     the contract; SLEEPING -> STARTING
 *   POST /__system/sleep  dev only: put the simulated system to sleep now
 *   POST /__system/reset  dev only: back to the configured mode, counters 0
 *   GET  /__system/stats  dev only: { wakeCalls, statusCalls, state, mode }
 *
 * Modes (SYSTEM_SIMULATE): `ready` (default) always READY until slept;
 * `sleep` SLEEPING until a wake, then STARTING through DATABASE -> SERVER ->
 * APPLICATION -> HEALTH_CHECK over `wakeSeconds`, then READY; `failed`
 * FAILED; `html` answers /system/* with an index.html-like page (the gate must
 * fail closed on it).
 */

export const SIMULATION_MODES = ["ready", "sleep", "failed", "html"] as const;
export type SimulationMode = (typeof SIMULATION_MODES)[number];

export const DEFAULT_WAKE_SECONDS = 8;

const PHASES = ["DATABASE", "SERVER", "APPLICATION", "HEALTH_CHECK"] as const;

type SimulatedState = "READY" | "SLEEPING" | "STARTING" | "FAILED";

export type SimulatedResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export type SystemSimulatorOptions = {
  mode?: SimulationMode;
  wakeSeconds?: number;
  now?: () => number;
};

export type SystemSimulator = {
  handle(method: string, pathname: string): SimulatedResponse | null;
  stats(): { wakeCalls: number; statusCalls: number; state: SimulatedState; mode: SimulationMode };
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(status: number, body: unknown): SimulatedResponse {
  return { status, headers: { ...JSON_HEADERS }, body: JSON.stringify(body) };
}

const HTML_PAGE =
  '<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>ManagerBeyo</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';

function html(): SimulatedResponse {
  return {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    body: HTML_PAGE,
  };
}

/** Parses SYSTEM_SIMULATE; unknown values fall back to `ready`. */
export function parseSimulationMode(value: string | undefined): SimulationMode {
  const normalized = (value ?? "").trim().toLowerCase();
  return (SIMULATION_MODES as readonly string[]).includes(normalized)
    ? (normalized as SimulationMode)
    : "ready";
}

/** Parses SYSTEM_SIMULATE_WAKE_SECONDS; invalid values give the default. */
export function parseWakeSeconds(value: string | undefined): number {
  const parsed = Number(value);
  return value !== undefined && value.trim() !== "" && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_WAKE_SECONDS;
}

function initialState(mode: SimulationMode): SimulatedState {
  switch (mode) {
    case "sleep":
      return "SLEEPING";
    case "failed":
      return "FAILED";
    default:
      return "READY";
  }
}

export function createSystemSimulator(
  options: SystemSimulatorOptions = {},
): SystemSimulator {
  const mode = options.mode ?? "ready";
  const wakeMs = (options.wakeSeconds ?? DEFAULT_WAKE_SECONDS) * 1000;
  const now = options.now ?? Date.now;

  let state: SimulatedState = initialState(mode);
  let startedAt = 0;
  let wakeCalls = 0;
  let statusCalls = 0;

  function advance(): void {
    if (state === "STARTING" && now() - startedAt >= wakeMs) state = "READY";
  }

  function body(): Record<string, unknown> {
    advance();
    switch (state) {
      case "READY":
        return { version: 1, state };
      case "SLEEPING":
        return { version: 1, state, retry_after_seconds: 3 };
      case "FAILED":
        return {
          version: 1,
          state,
          retry_after_seconds: 5,
          message_code: "simulated_failure",
        };
      case "STARTING": {
        const elapsed = Math.max(0, now() - startedAt);
        const index = Math.min(
          PHASES.length - 1,
          Math.floor((elapsed / wakeMs) * PHASES.length),
        );
        return {
          version: 1,
          state,
          phase: PHASES[index],
          retry_after_seconds: 1,
          estimated_remaining_seconds: Math.max(0, Math.ceil((wakeMs - elapsed) / 1000)),
        };
      }
    }
  }

  function stats() {
    advance();
    return { wakeCalls, statusCalls, state, mode };
  }

  function handle(method: string, pathname: string): SimulatedResponse | null {
    const verb = method.toUpperCase();

    if (pathname === "/system/status") {
      if (verb !== "GET" && verb !== "HEAD") {
        return json(405, { error: "method_not_allowed" });
      }
      statusCalls += 1;
      return mode === "html" ? html() : json(200, body());
    }

    if (pathname === "/system/wake") {
      if (verb !== "POST") return json(405, { error: "method_not_allowed" });
      wakeCalls += 1;
      if (mode === "html") return html();
      advance();
      if (state === "SLEEPING") {
        state = "STARTING";
        startedAt = now();
      }
      return json(202, body());
    }

    if (pathname === "/__system/sleep") {
      if (verb !== "POST") return json(405, { error: "method_not_allowed" });
      state = "SLEEPING";
      return json(200, stats());
    }

    if (pathname === "/__system/reset") {
      if (verb !== "POST") return json(405, { error: "method_not_allowed" });
      state = initialState(mode);
      startedAt = 0;
      wakeCalls = 0;
      statusCalls = 0;
      return json(200, stats());
    }

    if (pathname === "/__system/stats") {
      if (verb !== "GET") return json(405, { error: "method_not_allowed" });
      return json(200, stats());
    }

    if (pathname.startsWith("/system/") || pathname.startsWith("/__system/")) {
      return json(404, { error: "not_found" });
    }
    return null;
  }

  return { handle, stats };
}
