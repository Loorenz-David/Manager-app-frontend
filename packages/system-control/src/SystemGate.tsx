import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { SystemPhase } from "./contract";
import {
  createSystemController,
  type SystemController,
  type SystemControllerOptions,
  type SystemSnapshot,
} from "./controller";
import type { SystemFailure } from "./machine";
import { installOnlineManagerBridge, type OnlineManagerLike } from "./online-bridge";
import { activateSystemController } from "./store";

export type SystemGateProps = {
  children: ReactNode;
  /** A prepared controller (tests). Default: one created for this gate. */
  controller?: SystemController;
  /** Options of the default controller. */
  controllerOptions?: SystemControllerOptions;
  /**
   * The react-query online manager the gate drives (offline while not READY).
   * Default: `@tanstack/react-query`'s `onlineManager`. `null` leaves
   * react-query alone.
   */
  onlineManager?: OnlineManagerLike | null;
};

/**
 * Renders an init screen instead of `children` until the system is READY for
 * the first time, then keeps `children` mounted for the rest of the page's
 * life (router state and forms survive every later outage) and shows the
 * later states as overlays on top.
 *
 * Mount it once, around the application, inside nothing that needs the
 * backend. Its Tailwind classes live in this package: each app's
 * `src/index.css` needs `@source "../../../../packages/system-control/src";`.
 */
export function SystemGate({
  children,
  controller: provided,
  controllerOptions,
  onlineManager,
}: SystemGateProps): React.JSX.Element {
  const [controller] = useState(
    () => provided ?? createSystemController(controllerOptions),
  );
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    const deactivate = activateSystemController(controller);
    const uninstallBridge =
      onlineManager === null
        ? null
        : installOnlineManagerBridge(
            {
              isOnline: () => controller.getSnapshot().online,
              subscribe: (listener) => controller.subscribe(() => listener()),
            },
            onlineManager,
          );
    controller.start();
    return () => {
      controller.stop();
      uninstallBridge?.();
      deactivate();
    };
  }, [controller, onlineManager]);

  return (
    <>
      {snapshot.hasBeenReady ? children : null}
      <SystemGateScreen snapshot={snapshot} onRetry={controller.retry} />
    </>
  );
}

const PHASE_LABELS: Record<SystemPhase, string> = {
  DATABASE: "Starting the database",
  SERVER: "Starting the server",
  APPLICATION: "Starting the application",
  HEALTH_CHECK: "Checking that everything works",
};

function failureMessage(failure: SystemFailure | null): string {
  switch (failure) {
    case "system_failed":
      return "ManagerBeyo could not start.";
    case "network":
    case "timeout":
      return "ManagerBeyo can't be reached right now.";
    default:
      return "ManagerBeyo is not answering as expected.";
  }
}

function etaLabel(seconds: number | null): string | null {
  if (seconds === null) return null;
  const rounded = Math.ceil(seconds);
  if (rounded <= 1) return "Almost ready";
  return `About ${rounded} seconds left`;
}

/** Where the bar stands when only the step is known (no time estimate). */
const PHASE_PROGRESS: Record<SystemPhase, number> = {
  DATABASE: 0.1,
  SERVER: 0.4,
  APPLICATION: 0.65,
  HEALTH_CHECK: 0.9,
};
const PROGRESS_MIN = 0.04;
/** Never full before READY: the last step is the system's to confirm. */
const PROGRESS_MAX = 0.97;

/**
 * How far the start is, 0..1, or null when nothing is known (an indeterminate
 * bar). `total` is the first estimate of this start: the bar is the share of
 * it that has gone by. Without an estimate the step gives a fixed position.
 */
export function startProgress(
  remainingSeconds: number | null,
  totalSeconds: number | null,
  phase: SystemPhase | null,
): number | null {
  if (remainingSeconds !== null && totalSeconds !== null && totalSeconds > 0) {
    const done = 1 - remainingSeconds / totalSeconds;
    return Math.min(Math.max(done, PROGRESS_MIN), PROGRESS_MAX);
  }
  if (phase) return PHASE_PROGRESS[phase];
  return null;
}

type StartProgressBarProps = {
  remainingSeconds: number | null;
  phase: SystemPhase | null;
};

/**
 * The start as a progress bar. It only moves forward: an estimate that grows
 * (a step took longer than usual) holds the bar where it is instead of
 * pulling it back.
 */
function StartProgressBar({
  remainingSeconds,
  phase,
}: StartProgressBarProps): React.JSX.Element {
  const [total, setTotal] = useState<number | null>(null);
  const [reached, setReached] = useState(0);
  const computed = startProgress(remainingSeconds, total ?? remainingSeconds, phase);

  useEffect(() => {
    if (remainingSeconds !== null) {
      setTotal((current) => current ?? Math.max(remainingSeconds, 1));
    }
  }, [remainingSeconds]);
  useEffect(() => {
    if (computed !== null) setReached((current) => Math.max(current, computed));
  }, [computed]);

  const value = computed === null ? null : Math.max(reached, computed);
  return (
    <div
      role="progressbar"
      aria-label="Starting ManagerBeyo"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      data-testid="system-gate-progress"
      className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-muted"
    >
      {value === null ? (
        <div className="h-full w-1/3 animate-pulse rounded-full bg-foreground motion-reduce:animate-none" />
      ) : (
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-[3000ms] ease-linear motion-reduce:transition-none"
          style={{ width: `${(value * 100).toFixed(1)}%` }}
        />
      )}
    </div>
  );
}

function Spinner(): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-8 animate-spin rounded-full border-2 border-muted border-t-foreground motion-reduce:animate-none"
    />
  );
}

type PanelProps = {
  testId: string;
  /** Before the first READY the screen replaces the app; after, it overlays. */
  overlay: boolean;
  role: "status" | "alert";
  children: ReactNode;
  busy?: boolean;
};

function Panel({ testId, overlay, role, children, busy }: PanelProps): React.JSX.Element {
  return (
    <div
      data-testid={testId}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      aria-busy={busy || undefined}
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-6 text-foreground ${
        overlay ? "bg-background/85 backdrop-blur-sm" : "bg-background"
      }`}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        {children}
      </div>
    </div>
  );
}

/** How long "Try again" shows that it was pressed (a check itself often answers in milliseconds). */
export const RETRY_FEEDBACK_MS = 1_500;

/**
 * "Try again" re-reads the status now instead of waiting for the next automatic
 * retry. A press must be seen: the button says "Checking…" and cannot be
 * pressed again until the feedback time has passed.
 */
function RetryButton({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!checking) return;
    const timer = setTimeout(() => setChecking(false), RETRY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [checking]);

  return (
    <button
      type="button"
      data-testid="system-gate-retry"
      disabled={checking}
      aria-busy={checking || undefined}
      onClick={() => {
        setChecking(true);
        onRetry();
      }}
      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:opacity-60"
    >
      {checking ? "Checking…" : "Try again"}
    </button>
  );
}

type SystemGateScreenProps = {
  snapshot: SystemSnapshot;
  onRetry: () => void;
};

/** The visible part of each non-READY state. */
export function SystemGateScreen({
  snapshot,
  onRetry,
}: SystemGateScreenProps): React.JSX.Element | null {
  const overlay = snapshot.hasBeenReady;

  switch (snapshot.state) {
    case "READY":
      return null;

    case "BOOT":
      return (
        <Panel testId="system-gate-boot" overlay={overlay} role="status" busy>
          <Spinner />
          <p className="text-sm text-muted-foreground">Loading ManagerBeyo…</p>
        </Panel>
      );

    case "SLEEPING":
      return (
        <Panel testId="system-gate-sleeping" overlay={overlay} role="status" busy>
          <p className="text-base font-medium">Waking ManagerBeyo…</p>
          <StartProgressBar remainingSeconds={null} phase={null} />
          <p className="text-sm text-muted-foreground">This can take a moment.</p>
        </Panel>
      );

    case "STARTING": {
      const eta = etaLabel(snapshot.estimatedRemainingSeconds);
      return (
        <Panel testId="system-gate-starting" overlay={overlay} role="status" busy>
          <p className="text-base font-medium">Starting ManagerBeyo…</p>
          <StartProgressBar
            remainingSeconds={snapshot.estimatedRemainingSeconds}
            phase={snapshot.phase}
          />
          {snapshot.phase ? (
            <p className="text-sm text-muted-foreground" data-testid="system-gate-phase">
              {PHASE_LABELS[snapshot.phase]}
            </p>
          ) : null}
          {eta ? (
            <p className="text-sm text-muted-foreground" data-testid="system-gate-eta">
              {eta}
            </p>
          ) : null}
        </Panel>
      );
    }

    case "FAILED":
      return (
        <Panel testId="system-gate-failed" overlay={overlay} role="alert">
          <p className="text-base font-medium">{failureMessage(snapshot.failure)}</p>
          <p className="text-sm text-muted-foreground">Retrying automatically…</p>
          <RetryButton onRetry={onRetry} />
        </Panel>
      );

    case "DORMANT":
      // Not a button: the first trusted touch or key anywhere wakes the system
      // (the controller's window listener), this only says so.
      return (
        <Panel testId="system-gate-dormant" overlay={overlay} role="status">
          <p className="text-base font-medium">ManagerBeyo is asleep</p>
          <p className="text-sm text-muted-foreground">Touch to continue</p>
        </Panel>
      );

    case "UNAVAILABLE":
      // Non-blocking: the application stays usable underneath.
      return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[10000] flex justify-center p-3">
          <div
            data-testid="system-gate-reconnecting"
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm"
          >
            <span
              aria-hidden="true"
              className="inline-block size-3 animate-spin rounded-full border-2 border-muted border-t-foreground motion-reduce:animate-none"
            />
            Reconnecting…
          </div>
        </div>
      );
  }
}
