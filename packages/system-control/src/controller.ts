import {
  SYSTEM_AVAILABLE_EVENT,
  SYSTEM_UNAVAILABLE_EVENT,
  type SystemUnavailableDetail,
} from "@beyo/api-client";

import {
  fetchSystemStatus,
  requestSystemWake,
  type SystemClientOptions,
  type SystemRequestOutcome,
} from "./client";
import type { SystemPhase } from "./contract";
import {
  initialContext,
  isGateOnline,
  transition,
  type MachineContext,
  type MachineEffect,
  type MachineEvent,
  type SystemFailure,
  type SystemState,
  type TimerKind,
} from "./machine";
import { consumeAutomaticReloadMarker } from "./reload-marker";

/** What the gate exposes to React (`useSystemState`) and to other packages. */
export type SystemSnapshot = {
  state: SystemState;
  phase: SystemPhase | null;
  estimatedRemainingSeconds: number | null;
  retryAfterSeconds: number | null;
  messageCode: string | null;
  failure: SystemFailure | null;
  /** The application has been READY once in this page load. */
  hasBeenReady: boolean;
  /** Whether react-query may be online (READY, or a reconnect wave). */
  online: boolean;
};

export type SystemController = {
  /** Starts (or, after `stop`, resumes) the gate. Idempotent while running. */
  start(): void;
  /** Aborts requests, clears timers, removes listeners. */
  stop(): void;
  getSnapshot(): SystemSnapshot;
  subscribe(listener: (snapshot: SystemSnapshot) => void): () => void;
  /** The FAILED screen's "Try again": re-polls the status now. Never wakes. */
  retry(): void;
  /**
   * The window input listener. Only a trusted (`isTrusted`) event on a visible
   * page counts. Exported for tests, which cannot create trusted events in
   * jsdom and pass an `{ isTrusted: true }` stand-in, like api-client's
   * `recordInputEvent`.
   */
  handleInputEvent(event: Pick<Event, "isTrusted">): void;
};

export type SystemControllerOptions = Pick<
  SystemClientOptions,
  "fetch" | "origin" | "timeoutMs"
> & {
  /**
   * Whether this page load is an automatic reload. Defaults to consuming the
   * `markAutomaticReload()` marker.
   */
  automaticReload?: boolean;
};

const INPUT_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

function isVisible(): boolean {
  return document.visibilityState === "visible";
}

function toSnapshot(context: MachineContext): SystemSnapshot {
  return {
    state: context.state,
    phase: context.phase,
    estimatedRemainingSeconds: context.estimatedRemainingSeconds,
    retryAfterSeconds: context.retryAfterSeconds,
    messageCode: context.messageCode,
    failure: context.failure,
    hasBeenReady: context.hasBeenReady,
    online: isGateOnline(context),
  };
}

function sameSnapshot(a: SystemSnapshot, b: SystemSnapshot): boolean {
  return (
    a.state === b.state &&
    a.phase === b.phase &&
    a.estimatedRemainingSeconds === b.estimatedRemainingSeconds &&
    a.retryAfterSeconds === b.retryAfterSeconds &&
    a.messageCode === b.messageCode &&
    a.failure === b.failure &&
    a.hasBeenReady === b.hasBeenReady &&
    a.online === b.online
  );
}

/**
 * Runs the pure state machine (`machine.ts`) against the browser: performs its
 * effects (status/wake requests, one timer) and feeds it the events that
 * matter (request results, visibility, trusted input, the api-client's
 * `system:unavailable` / `system:available`).
 *
 * Nothing here decides to wake: every wake is an effect of `transition`.
 */
export function createSystemController(
  options: SystemControllerOptions = {},
): SystemController {
  let context = initialContext(
    typeof document === "undefined" ? true : isVisible(),
  );
  let snapshot = toSnapshot(context);
  const listeners = new Set<(snapshot: SystemSnapshot) => void>();

  let started = false;
  let running = false;
  let generation = 0;
  let abort: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let detach: (() => void) | null = null;

  const clientOptions = (): SystemClientOptions => ({
    fetch: options.fetch,
    origin: options.origin,
    timeoutMs: options.timeoutMs,
    signal: abort?.signal,
  });

  function publish(): void {
    const next = toSnapshot(context);
    if (sameSnapshot(next, snapshot)) return;
    snapshot = next;
    for (const listener of listeners) listener(snapshot);
  }

  function dispatch(event: MachineEvent): void {
    if (!running) return;
    const result = transition(context, event);
    context = result.context;
    for (const effect of result.effects) perform(effect);
    publish();
  }

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function setTimer(kind: TimerKind, delayMs: number): void {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      dispatch({ type: "timer", kind });
    }, delayMs);
  }

  function request(
    send: (options: SystemClientOptions) => Promise<SystemRequestOutcome>,
    toEvent: (outcome: SystemRequestOutcome) => MachineEvent,
  ): void {
    const own = generation;
    send(clientOptions()).then(
      (outcome) => {
        if (own === generation) dispatch(toEvent(outcome));
      },
      () => {
        // Aborted by stop(): the next start() resumes with a fresh check.
      },
    );
  }

  function perform(effect: MachineEffect): void {
    switch (effect.type) {
      case "check-status":
        request(fetchSystemStatus, (outcome) => ({ type: "status-result", outcome }));
        return;
      case "wake":
        request(requestSystemWake, (outcome) => ({ type: "wake-result", outcome }));
        return;
      case "set-timer":
        setTimer(effect.kind, effect.delayMs);
        return;
      case "clear-timer":
        clearTimer();
        return;
    }
  }

  function handleInputEvent(event: Pick<Event, "isTrusted">): void {
    if (!event.isTrusted || !isVisible()) return;
    dispatch({ type: "trusted-input" });
  }

  function attach(): () => void {
    const onVisibility = (): void =>
      dispatch({ type: "visibility", visible: isVisible() });
    const onInput = (event: Event): void => handleInputEvent(event);
    const onUnavailable = (event: Event): void => {
      const detail = (event as CustomEvent<SystemUnavailableDetail | undefined>)
        .detail;
      // A detail without the flag is treated as background: when in doubt,
      // never wake.
      dispatch({ type: "unavailable", background: detail?.background !== false });
    };
    const onAvailable = (): void => dispatch({ type: "available" });
    const inputOptions: AddEventListenerOptions = { capture: true, passive: true };

    document.addEventListener("visibilitychange", onVisibility);
    for (const type of INPUT_EVENTS) {
      window.addEventListener(type, onInput, inputOptions);
    }
    window.addEventListener(SYSTEM_UNAVAILABLE_EVENT, onUnavailable);
    window.addEventListener(SYSTEM_AVAILABLE_EVENT, onAvailable);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of INPUT_EVENTS) {
        window.removeEventListener(type, onInput, inputOptions);
      }
      window.removeEventListener(SYSTEM_UNAVAILABLE_EVENT, onUnavailable);
      window.removeEventListener(SYSTEM_AVAILABLE_EVENT, onAvailable);
    };
  }

  return {
    start() {
      if (running) return;
      running = true;
      abort = new AbortController();
      detach = attach();
      if (!started) {
        started = true;
        dispatch({
          type: "start",
          visible: isVisible(),
          automaticReload:
            options.automaticReload ?? consumeAutomaticReloadMarker(),
        });
      } else {
        dispatch({ type: "resume", visible: isVisible() });
      }
    },
    stop() {
      if (!running) return;
      running = false;
      generation += 1;
      clearTimer();
      abort?.abort();
      abort = null;
      detach?.();
      detach = null;
    },
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    retry: () => dispatch({ type: "retry" }),
    handleInputEvent,
  };
}
