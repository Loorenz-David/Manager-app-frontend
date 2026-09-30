import type { SystemController, SystemSnapshot } from "./controller";

/**
 * The page-wide system state, for React (`useSystemState`) and for non-React
 * consumers (e.g. the realtime socket: disconnect while not READY, connect on
 * READY). The mounted `<SystemGate>` publishes its controller here.
 *
 * Without a mounted gate the state is BOOT.
 */
export const INITIAL_SYSTEM_SNAPSHOT: SystemSnapshot = Object.freeze({
  state: "BOOT",
  phase: null,
  estimatedRemainingSeconds: null,
  retryAfterSeconds: null,
  messageCode: null,
  failure: null,
  hasBeenReady: false,
  online: false,
});

let current: SystemSnapshot = INITIAL_SYSTEM_SNAPSHOT;
let active: SystemController | null = null;
const listeners = new Set<(snapshot: SystemSnapshot) => void>();

function publish(snapshot: SystemSnapshot): void {
  if (snapshot === current) return;
  current = snapshot;
  for (const listener of listeners) listener(snapshot);
}

/** The current system state (a stable object until the state changes). */
export function getSystemState(): SystemSnapshot {
  return current;
}

/** Calls `listener` on every change. Returns the unsubscribe function. */
export function subscribeSystemState(
  listener: (snapshot: SystemSnapshot) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-polls the status now when the gate is FAILED. Never wakes. */
export function retrySystemStatus(): void {
  active?.retry();
}

/**
 * Makes `controller` the page's gate. Returns the function that detaches it
 * (the state then returns to BOOT).
 */
export function activateSystemController(controller: SystemController): () => void {
  active = controller;
  const unsubscribe = controller.subscribe(publish);
  publish(controller.getSnapshot());
  return () => {
    unsubscribe();
    if (active === controller) {
      active = null;
      publish(INITIAL_SYSTEM_SNAPSHOT);
    }
  };
}

/** Test seam: the controller of the mounted gate. */
export function getActiveSystemController(): SystemController | null {
  return active;
}
