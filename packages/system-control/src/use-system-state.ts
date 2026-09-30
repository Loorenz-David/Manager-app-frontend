import { useSyncExternalStore } from "react";

import type { SystemSnapshot } from "./controller";
import { getSystemState, subscribeSystemState } from "./store";

/**
 * The page's system state: `{ state, phase, estimatedRemainingSeconds,
 * retryAfterSeconds, messageCode, failure, hasBeenReady, online }`.
 * BOOT until a `<SystemGate>` is mounted.
 */
export function useSystemState(): SystemSnapshot {
  return useSyncExternalStore(subscribeSystemState, getSystemState, getSystemState);
}
