/**
 * @beyo/system-control — the gate between the applications and a backend that
 * sleeps when nobody uses it.
 *
 * Wiring an app (unit F-4): wrap the application in `<SystemGate>` (inside the
 * QueryClientProvider is not required: the gate drives react-query's global
 * `onlineManager`), add `@source "../../../../packages/system-control/src";`
 * to the app's `src/index.css` so Tailwind sees the gate's classes, and add
 * `systemControlDevServer()` from `@beyo/system-control/vite` to the app's
 * vite.config plugins for `vite dev` / `vite preview`.
 */
export { SystemGate, SystemGateScreen } from "./SystemGate";
export type { SystemGateProps } from "./SystemGate";
export { useSystemState } from "./use-system-state";
export {
  INITIAL_SYSTEM_SNAPSHOT,
  getSystemState,
  retrySystemStatus,
  subscribeSystemState,
} from "./store";
export { createSystemController } from "./controller";
export type {
  SystemController,
  SystemControllerOptions,
  SystemSnapshot,
} from "./controller";
export type { SystemFailure, SystemState } from "./machine";
export {
  AUTOMATIC_RELOAD_MARKER_TTL_MS,
  AUTOMATIC_RELOAD_STORAGE_KEY,
  markAutomaticReload,
  reloadAutomatically,
} from "./reload-marker";
export { installOnlineManagerBridge } from "./online-bridge";
export type { OnlineManagerLike } from "./online-bridge";
export {
  SYSTEM_REQUEST_TIMEOUT_MS,
  fetchSystemStatus,
  requestSystemWake,
} from "./client";
export type { SystemRequestFailure, SystemRequestOutcome } from "./client";
export {
  SYSTEM_CONTRACT_VERSION,
  SYSTEM_PHASES,
  SYSTEM_STATUS_PATH,
  SYSTEM_WAKE_PATH,
  parseSystemStatusBody,
} from "./contract";
export type { SystemPhase, SystemStatus, SystemStatusState } from "./contract";
