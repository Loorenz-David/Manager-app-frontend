import type { IncomingMessage, ServerResponse } from "node:http";

import { loadEnv, type Plugin, type ResolvedConfig } from "vite";

// Relative imports in this folder carry the `.ts` extension: Vite's config
// loader leaves workspace packages external, so Node itself loads this file
// (with its built-in type stripping), and Node's ESM resolution needs the
// full file name.

import {
  createSystemSimulator,
  parseSimulationMode,
  parseWakeSeconds,
  type SimulationMode,
  type SystemSimulator,
} from "./simulator.ts";

export {
  createSystemSimulator,
  parseSimulationMode,
  parseWakeSeconds,
  DEFAULT_WAKE_SECONDS,
  SIMULATION_MODES,
} from "./simulator.ts";
export type {
  SimulatedResponse,
  SimulationMode,
  SystemSimulator,
  SystemSimulatorOptions,
} from "./simulator.ts";

export type SystemControlDevServerOptions = {
  /** Overrides SYSTEM_SIMULATE. */
  simulate?: SimulationMode;
  /** Overrides SYSTEM_SIMULATE_WAKE_SECONDS. */
  wakeSeconds?: number;
};

type NextFunction = (error?: unknown) => void;

/**
 * Connect middleware answering the simulator's paths and passing everything
 * else on.
 */
export function createSystemControlMiddleware(simulator: SystemSimulator) {
  return (request: IncomingMessage, response: ServerResponse, next: NextFunction): void => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const answer = simulator.handle(request.method ?? "GET", pathname);
    if (!answer) {
      next();
      return;
    }
    response.statusCode = answer.status;
    for (const [name, value] of Object.entries(answer.headers)) {
      response.setHeader(name, value);
    }
    response.end(request.method?.toUpperCase() === "HEAD" ? undefined : answer.body);
  };
}

/**
 * Serves the system-control contract in `vite dev` and `vite preview` (never
 * in `vite build`: `apply: "serve"`, and it is config-time code, not part of
 * any bundle). READY by default.
 *
 * Environment (process env or the app's `.env*` files):
 *   SYSTEM_SIMULATE=sleep|failed|html   opt-in simulation (default: ready)
 *   SYSTEM_SIMULATE_WAKE_SECONDS=8      duration of the simulated start
 *
 * Dev endpoints: POST /__system/sleep (sleep now, e.g. to try DORMANT by hand),
 * POST /__system/reset, GET /__system/stats -> { wakeCalls, statusCalls, state,
 * mode } (tests assert "no wake" with it).
 */
export function systemControlDevServer(
  options: SystemControlDevServerOptions = {},
): Plugin {
  let simulator: SystemSimulator | null = null;
  let mode: SimulationMode = "ready";
  let wakeSeconds = 0;

  function middleware() {
    return (request: IncomingMessage, response: ServerResponse, next: NextFunction): void => {
      if (!simulator) {
        next();
        return;
      }
      createSystemControlMiddleware(simulator)(request, response, next);
    };
  }

  return {
    name: "beyo-system-control-dev-server",
    apply: "serve",
    configResolved(config: ResolvedConfig) {
      const envDir = typeof config.envDir === "string" ? config.envDir : config.root;
      const fileEnv = loadEnv(config.mode, envDir, "SYSTEM_");
      mode =
        options.simulate ??
        parseSimulationMode(process.env.SYSTEM_SIMULATE ?? fileEnv.SYSTEM_SIMULATE);
      wakeSeconds =
        options.wakeSeconds ??
        parseWakeSeconds(
          process.env.SYSTEM_SIMULATE_WAKE_SECONDS ?? fileEnv.SYSTEM_SIMULATE_WAKE_SECONDS,
        );
      simulator = createSystemSimulator({ mode, wakeSeconds });
      if (mode !== "ready") {
        config.logger.info(
          `[system-control] simulating /system: ${mode}` +
            (mode === "sleep" ? ` (wake takes ${wakeSeconds}s)` : ""),
        );
      }
    },
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}
