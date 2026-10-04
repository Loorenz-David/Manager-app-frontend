import type { SystemRequestFailure, SystemRequestOutcome } from "./client";
import type { SystemPhase } from "./contract";

/**
 * The gate's state machine, as a pure reducer: `transition(context, event)`
 * returns the next context and the effects the runtime must perform
 * (`controller.ts`). No timers, no I/O, no DOM here.
 *
 *   BOOT         first status check of a page load in flight
 *   READY        the application runs; react-query is online
 *   SLEEPING     the control plane says SLEEPING and the gate is waking it
 *                (or, on a hidden boot, waits to be visible to wake it)
 *   STARTING     the control plane says STARTING (a wake is under way)
 *   FAILED       the control plane says FAILED, or could not be read
 *                (network, timeout, 404/5xx, HTML, malformed body); polled
 *   DORMANT      the system sleeps and nobody asked for it: no automatic wake;
 *                only a trusted touch/key wakes it
 *   UNAVAILABLE  the control plane says READY but the API fails: reconnecting
 */
export type SystemState =
  | "BOOT"
  | "READY"
  | "SLEEPING"
  | "STARTING"
  | "FAILED"
  | "DORMANT"
  | "UNAVAILABLE";

/** Why the gate is FAILED. */
export type SystemFailure = SystemRequestFailure | "system_failed";

type WakeStatus =
  /** No wake sent in this episode. */
  | "none"
  | "in_flight"
  /** The control plane answered the wake with a valid body. */
  | "acknowledged"
  /** The wake got no valid answer (network, 5xx, malformed). */
  | "unacknowledged";

export type MachineContext = {
  state: SystemState;
  phase: SystemPhase | null;
  estimatedRemainingSeconds: number | null;
  retryAfterSeconds: number | null;
  messageCode: string | null;
  failure: SystemFailure | null;
  /** Set on the first READY; the children stay mounted from then on. */
  hasBeenReady: boolean;
  visible: boolean;
  /**
   * An episode (READY -> ... -> READY) may wake the system only when someone
   * asked for it: a visible page load (boot), a user-classified request that
   * failed as unavailable, or a trusted touch/key on the DORMANT overlay.
   */
  wakeIntent: boolean;
  wake: WakeStatus;
  /** A user-classified `system:unavailable` arrived since the last result. */
  userDemand: boolean;
  /** `system:available` arrived while a READY-state check was in flight. */
  recovered: boolean;
  /** A status request is in flight (at most one). */
  checking: boolean;
  /**
   * The check in flight was started by a slow request, not by a failure: an
   * answer of READY (or no answer) means "merely slow" and changes nothing.
   */
  peek: boolean;
  /** UNAVAILABLE: react-query is released for one reconnect wave. */
  probing: boolean;
  /** Consecutive failed checks, for the exponential backoff. */
  attempt: number;
};

export type MachineEvent =
  | { type: "start"; visible: boolean; automaticReload: boolean }
  /** The runtime restarted after a stop (e.g. a StrictMode remount). */
  | { type: "resume"; visible: boolean }
  | { type: "status-result"; outcome: SystemRequestOutcome }
  | { type: "wake-result"; outcome: SystemRequestOutcome }
  | { type: "timer"; kind: TimerKind }
  | { type: "visibility"; visible: boolean }
  /** A trusted pointerdown/keydown/touchstart on a visible page. */
  | { type: "trusted-input" }
  | { type: "unavailable"; background: boolean }
  /** A request has been pending for a while (api-client's slow-request hint). */
  | { type: "slow-request"; background: boolean }
  | { type: "available" }
  /** The FAILED screen's "Try again": re-polls the status, never wakes. */
  | { type: "retry" };

export type TimerKind = "poll" | "settle";

export type MachineEffect =
  | { type: "check-status" }
  | { type: "wake" }
  /** Replaces the single pending timer. */
  | { type: "set-timer"; kind: TimerKind; delayMs: number }
  | { type: "clear-timer" };

export type TransitionResult = {
  context: MachineContext;
  effects: MachineEffect[];
};

/** Poll delay while waking/starting when the server gives no hint. */
export const PROGRESS_POLL_MS = 3_000;
/** First delay of the exponential backoff (FAILED, UNAVAILABLE). */
export const BACKOFF_BASE_MS = 3_000;
/** Cap of every automatic poll except the slow ones below. */
export const BACKOFF_CAP_MS = 15_000;
/**
 * DORMANT, and a hidden boot waiting to be visible: a slow GET-only poll that
 * only notices someone else woke the system. GET /system/status never wakes.
 */
export const SLOW_POLL_MS = 60_000;
/**
 * UNAVAILABLE: after the control plane says READY, react-query is let online
 * for one wave of its paused/stale requests. No new unavailable failure
 * within this window clears the overlay.
 */
export const PROBE_SETTLE_MS = 5_000;

export function initialContext(visible = true): MachineContext {
  return {
    state: "BOOT",
    phase: null,
    estimatedRemainingSeconds: null,
    retryAfterSeconds: null,
    messageCode: null,
    failure: null,
    hasBeenReady: false,
    visible,
    wakeIntent: false,
    wake: "none",
    userDemand: false,
    recovered: false,
    checking: false,
    peek: false,
    probing: false,
    attempt: 0,
  };
}

/** Whether react-query may be online in this context. */
export function isGateOnline(context: MachineContext): boolean {
  return (
    context.state === "READY" ||
    (context.state === "UNAVAILABLE" && context.probing)
  );
}

export function backoffDelayMs(attempt: number): number {
  return Math.min(
    BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1),
    BACKOFF_CAP_MS,
  );
}

function hintDelayMs(retryAfterSeconds: number | null): number | null {
  if (retryAfterSeconds === null) return null;
  return Math.min(Math.max(retryAfterSeconds * 1000, 1_000), BACKOFF_CAP_MS);
}

function progressDelayMs(context: MachineContext): number {
  return hintDelayMs(context.retryAfterSeconds) ?? PROGRESS_POLL_MS;
}

function pollAfter(delayMs: number): MachineEffect {
  return { type: "set-timer", kind: "poll", delayMs };
}

function requestCheck(
  context: MachineContext,
  effects: MachineEffect[],
): MachineContext {
  if (context.checking) return context;
  effects.push({ type: "clear-timer" }, { type: "check-status" });
  return { ...context, checking: true };
}

function becomeReady(
  context: MachineContext,
  effects: MachineEffect[],
): MachineContext {
  effects.push({ type: "clear-timer" });
  return {
    ...context,
    state: "READY",
    hasBeenReady: true,
    phase: null,
    estimatedRemainingSeconds: null,
    retryAfterSeconds: null,
    messageCode: null,
    failure: null,
    wakeIntent: false,
    wake: "none",
    userDemand: false,
    recovered: false,
    probing: false,
    attempt: 0,
  };
}

function sendWake(
  context: MachineContext,
  effects: MachineEffect[],
  state: "SLEEPING" | "STARTING",
): MachineContext {
  effects.push({ type: "clear-timer" }, { type: "wake" });
  return { ...context, state, wake: "in_flight", wakeIntent: true };
}

function applyFailure(
  context: MachineContext,
  failure: SystemFailure,
  effects: MachineEffect[],
): MachineContext {
  if (context.state === "DORMANT") {
    // Quiet: a failed slow poll changes nothing a sleeping kiosk shows.
    effects.push(pollAfter(SLOW_POLL_MS));
    return context;
  }
  const attempt = context.attempt + 1;
  const delay = Math.max(
    backoffDelayMs(attempt),
    failure === "system_failed" ? (hintDelayMs(context.retryAfterSeconds) ?? 0) : 0,
  );
  effects.push(pollAfter(delay));
  return { ...context, state: "FAILED", failure, attempt, probing: false };
}

/**
 * The control plane says SLEEPING. Wakes only with an intent, only on a
 * visible page, and never twice for an acknowledged wake.
 */
function applySleeping(
  context: MachineContext,
  effects: MachineEffect[],
): MachineContext {
  if (context.wake === "in_flight" || context.wake === "acknowledged") {
    // The wake is under way; the control plane may lag behind it.
    effects.push(pollAfter(progressDelayMs(context)));
    return {
      ...context,
      state: context.state === "STARTING" ? "STARTING" : "SLEEPING",
    };
  }
  if (context.state === "DORMANT") {
    effects.push(pollAfter(SLOW_POLL_MS));
    return context;
  }
  const intent =
    context.wakeIntent || (context.hasBeenReady && context.userDemand);
  if (!intent) {
    effects.push(pollAfter(SLOW_POLL_MS));
    return { ...context, state: "DORMANT", probing: false, attempt: 0 };
  }
  if (!context.visible) {
    // Hidden boot: wake as soon as the page becomes visible.
    effects.push(pollAfter(SLOW_POLL_MS));
    return { ...context, state: "SLEEPING", wakeIntent: true };
  }
  // Boot shows "waking"; a running application shows the starting overlay.
  return sendWake(context, effects, context.hasBeenReady ? "STARTING" : "SLEEPING");
}

function applyOutcome(
  context: MachineContext,
  outcome: SystemRequestOutcome,
  effects: MachineEffect[],
): MachineContext {
  if (!outcome.ok) return applyFailure(context, outcome.failure, effects);

  const status = outcome.status;
  let next: MachineContext = {
    ...context,
    phase: status.phase,
    estimatedRemainingSeconds: status.estimatedRemainingSeconds,
    retryAfterSeconds: status.retryAfterSeconds,
    messageCode: status.messageCode,
  };

  switch (status.state) {
    case "READY": {
      if (next.state === "READY") {
        if (next.recovered) return { ...next, recovered: false };
        // The API failed while the control plane says READY: reconnecting.
        effects.push(pollAfter(backoffDelayMs(1)));
        return {
          ...next,
          state: "UNAVAILABLE",
          attempt: 1,
          probing: false,
          userDemand: false,
        };
      }
      if (next.state === "UNAVAILABLE") {
        // Let react-query send one wave; success or silence clears the overlay.
        effects.push({ type: "set-timer", kind: "settle", delayMs: PROBE_SETTLE_MS });
        return { ...next, probing: true };
      }
      return becomeReady(next, effects);
    }
    case "SLEEPING":
      next = applySleeping(next, effects);
      return { ...next, userDemand: false };
    case "STARTING":
      effects.push(pollAfter(progressDelayMs(next)));
      return { ...next, state: "STARTING", failure: null, attempt: 0 };
    case "FAILED":
      return applyFailure(next, "system_failed", effects);
  }
}

export function transition(
  context: MachineContext,
  event: MachineEvent,
): TransitionResult {
  const effects: MachineEffect[] = [];
  let next = context;

  switch (event.type) {
    case "start": {
      next = {
        ...initialContext(event.visible),
        // A page the application reloaded by itself (service-worker update)
        // never wakes the system on its own.
        wakeIntent: !event.automaticReload,
      };
      next = requestCheck(next, effects);
      break;
    }
    case "resume": {
      next = {
        ...context,
        visible: event.visible,
        checking: false,
        peek: false,
        probing: false,
        // A wake aborted by the stop may or may not have arrived.
        wake: context.wake === "in_flight" ? "unacknowledged" : context.wake,
      };
      if (next.state !== "READY") next = requestCheck(next, effects);
      break;
    }
    case "status-result": {
      const settled = { ...context, checking: false, peek: false };
      if (context.peek && context.state === "READY") {
        // A slow request asked. No answer, or READY: the application is only
        // slow, which is not an outage. Anything else is handled as usual.
        if (!event.outcome.ok) {
          next = { ...settled, userDemand: false };
          break;
        }
        if (event.outcome.status.state === "READY") {
          next = { ...settled, userDemand: false, recovered: false };
          break;
        }
      }
      next = applyOutcome(settled, event.outcome, effects);
      break;
    }
    case "wake-result": {
      next = {
        ...context,
        wake: event.outcome.ok ? "acknowledged" : "unacknowledged",
      };
      next = applyOutcome(next, event.outcome, effects);
      break;
    }
    case "timer": {
      if (event.kind === "settle") {
        if (context.state === "UNAVAILABLE" && context.probing) {
          next = becomeReady(context, effects);
        }
        break;
      }
      next = requestCheck(context, effects);
      break;
    }
    case "visibility": {
      next = { ...context, visible: event.visible };
      if (
        event.visible &&
        next.state === "SLEEPING" &&
        next.wakeIntent &&
        (next.wake === "none" || next.wake === "unacknowledged")
      ) {
        next = sendWake(next, effects, next.hasBeenReady ? "STARTING" : "SLEEPING");
      }
      break;
    }
    case "trusted-input": {
      if (context.state === "DORMANT" && context.visible) {
        next = sendWake(context, effects, "STARTING");
      }
      break;
    }
    case "unavailable": {
      const userDemand = context.userDemand || !event.background;
      switch (context.state) {
        case "READY":
          // A real failure outranks a slow-request peek that may be in flight.
          next = requestCheck(
            { ...context, userDemand, recovered: false, peek: false },
            effects,
          );
          break;
        case "UNAVAILABLE":
          next = { ...context, userDemand };
          if (context.probing) {
            // The wave failed: close react-query again and back off.
            const attempt = context.attempt + 1;
            effects.push(pollAfter(backoffDelayMs(attempt)));
            next = { ...next, probing: false, attempt };
          }
          break;
        case "SLEEPING":
        case "STARTING":
        case "FAILED":
          next = { ...context, userDemand };
          break;
        // BOOT has its own intent; DORMANT wakes only on a trusted input.
        case "BOOT":
        case "DORMANT":
          break;
      }
      break;
    }
    case "slow-request": {
      // Only a running application asks: every other state already knows.
      if (context.state !== "READY") break;
      const userDemand = context.userDemand || !event.background;
      next = context.checking
        ? { ...context, userDemand }
        : requestCheck({ ...context, userDemand, peek: true }, effects);
      break;
    }
    case "available": {
      if (context.state === "UNAVAILABLE") {
        next = becomeReady(context, effects);
      } else if (context.state === "READY" && context.checking) {
        next = { ...context, recovered: true };
      }
      break;
    }
    case "retry": {
      if (context.state === "FAILED") next = requestCheck(context, effects);
      break;
    }
  }

  return { context: next, effects };
}
