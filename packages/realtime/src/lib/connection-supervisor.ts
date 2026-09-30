import type { RefreshOutcome } from "@beyo/api-client";
import type { SystemSnapshot, SystemState } from "@beyo/system-control";
import type { AppSocket } from "./socket-types";

/**
 * Decides when the socket is connected. Two inputs:
 *
 * 1. The system gate (`@beyo/system-control`). The socket runs only while the
 *    system is READY; SLEEPING, STARTING, FAILED, DORMANT and UNAVAILABLE
 *    disconnect it, and the return to READY connects it again. BOOT is
 *    treated as READY: it is the state without a mounted gate (tests, an app
 *    without gate) — and a gate's own first check is short. The socket never
 *    asks the control plane for anything, so a reconnect never wakes the
 *    system: the gate decides.
 *
 * 2. Server rejections. socket.io-client 4.8 destroys the socket on a
 *    CONNECT_ERROR packet (`socket.active` is false afterwards) and never
 *    retries it. Transport failures, on the other hand, keep the socket
 *    active and the manager reconnects on its own (backoff, no limit).
 *    - `auth_unavailable` (`err.data.code`: the backend could not check the
 *      token): no refresh — retry after `retry_after_seconds` (with backoff),
 *      or at once when the gate returns to READY.
 *    - any other rejection (the backend refused the token: python-socketio
 *      sends "Connection rejected by server"): refresh the access token, as a
 *      background request.
 *      'ok'          connect again (the auth callback reads the new token);
 *                    a second rejection in a row waits a backoff first.
 *      'invalid'     the session is over: `onSessionExpired`.
 *      'unavailable' the session could not be checked: like auth_unavailable.
 */
export type ConnectionSupervisorDeps = {
  getSystemState: () => Pick<SystemSnapshot, "state">;
  subscribeSystemState: (
    listener: (snapshot: Pick<SystemSnapshot, "state">) => void,
  ) => () => void;
  refresh: () => Promise<RefreshOutcome>;
  onSessionExpired: () => void;
  /** The socket is down and a reconnect is planned (gate or rejection). */
  onWaiting: () => void;
  onRejected?: (reason: string) => void;
};

/** First delay of the retry after an unavailable auth check. */
export const UNAVAILABLE_RETRY_BASE_MS = 5_000;
/** Longest delay between two automatic connection attempts. */
export const RETRY_MAX_MS = 30_000;
/** First delay before the reconnect after a repeated token rejection. */
export const REJECTION_RETRY_BASE_MS = 1_000;

const AUTH_UNAVAILABLE_CODE = "auth_unavailable";

export function gateAllowsConnection(state: SystemState): boolean {
  return state === "READY" || state === "BOOT";
}

function backoff(base: number, attempt: number): number {
  return Math.min(base * 2 ** Math.max(0, attempt - 1), RETRY_MAX_MS);
}

type ConnectErrorData = { code?: unknown; retry_after_seconds?: unknown };

function readErrorData(err: Error): ConnectErrorData {
  const data = (err as Error & { data?: unknown }).data;
  return typeof data === "object" && data !== null ? (data as ConnectErrorData) : {};
}

/**
 * Starts supervising `socket` (created with `autoConnect: false`): connects it
 * now when the gate allows. Returns the function that stops supervising (it
 * does not disconnect the socket).
 */
export function superviseConnection(
  socket: AppSocket,
  deps: ConnectionSupervisorDeps,
): () => void {
  let stopped = false;
  let refreshing = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  // Consecutive rejections / unavailable checks since the last connect.
  let rejections = 0;
  let unavailable = 0;
  let lastState: SystemState = deps.getSystemState().state;

  function clearRetry(): void {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function tryConnect(): void {
    if (stopped || refreshing) return;
    if (!gateAllowsConnection(deps.getSystemState().state)) return;
    clearRetry();
    if (socket.active) return;
    socket.connect();
  }

  function retryLater(delayMs: number): void {
    clearRetry();
    deps.onWaiting();
    if (delayMs <= 0) {
      tryConnect();
      return;
    }
    retryTimer = setTimeout(() => {
      retryTimer = null;
      tryConnect();
    }, delayMs);
  }

  function retryAfterUnavailable(retryAfterSeconds: number | null): void {
    unavailable += 1;
    const server = retryAfterSeconds !== null ? retryAfterSeconds * 1_000 : 0;
    retryLater(Math.max(server, backoff(UNAVAILABLE_RETRY_BASE_MS, unavailable)));
  }

  async function recoverFromRejection(): Promise<void> {
    refreshing = true;
    let outcome: RefreshOutcome;
    try {
      outcome = await deps.refresh();
    } catch {
      outcome = "unavailable";
    } finally {
      refreshing = false;
    }
    if (stopped) return;
    if (outcome === "invalid") {
      deps.onSessionExpired();
      return;
    }
    if (outcome === "unavailable") {
      retryAfterUnavailable(null);
      return;
    }
    // A fresh token: connect at once, unless the new token was just refused
    // as well (then back off rather than loop refresh -> reject -> refresh).
    retryLater(rejections <= 1 ? 0 : backoff(REJECTION_RETRY_BASE_MS, rejections - 1));
  }

  const onConnect = () => {
    rejections = 0;
    unavailable = 0;
    clearRetry();
  };

  const onConnectError = (err: Error) => {
    // Still active: a transport failure; the manager reconnects by itself.
    if (stopped || socket.active) return;
    const data = readErrorData(err);
    deps.onRejected?.(err.message);
    if (data.code === AUTH_UNAVAILABLE_CODE || err.message === AUTH_UNAVAILABLE_CODE) {
      const retryAfter =
        typeof data.retry_after_seconds === "number" ? data.retry_after_seconds : null;
      retryAfterUnavailable(retryAfter);
      return;
    }
    rejections += 1;
    deps.onWaiting();
    if (refreshing) return;
    void recoverFromRejection();
  };

  const unsubscribe = deps.subscribeSystemState((snapshot) => {
    const state = snapshot.state;
    if (state === lastState) return;
    const wasAllowed = gateAllowsConnection(lastState);
    lastState = state;
    if (stopped) return;

    if (!gateAllowsConnection(state)) {
      clearRetry();
      if (socket.active || socket.connected) socket.disconnect();
      deps.onWaiting();
      return;
    }
    // Back to READY: connect now (also cuts short a pending retry).
    if (!wasAllowed) tryConnect();
  });

  socket.on("connect", onConnect);
  socket.on("connect_error", onConnectError);

  if (gateAllowsConnection(lastState)) {
    socket.connect();
  } else {
    deps.onWaiting();
  }

  return () => {
    stopped = true;
    clearRetry();
    unsubscribe();
    socket.off("connect", onConnect);
    socket.off("connect_error", onConnectError);
  };
}
