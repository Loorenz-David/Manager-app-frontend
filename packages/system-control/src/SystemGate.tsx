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
          <Spinner />
          <p className="text-base font-medium">Waking ManagerBeyo…</p>
          <p className="text-sm text-muted-foreground">This can take a moment.</p>
        </Panel>
      );

    case "STARTING": {
      const eta = etaLabel(snapshot.estimatedRemainingSeconds);
      return (
        <Panel testId="system-gate-starting" overlay={overlay} role="status" busy>
          <Spinner />
          <p className="text-base font-medium">Starting ManagerBeyo…</p>
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
          <button
            type="button"
            data-testid="system-gate-retry"
            onClick={onRetry}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Try again
          </button>
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
