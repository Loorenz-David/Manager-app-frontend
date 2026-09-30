import { ROUTES } from "@/lib/routes";

/** No trusted pointer, key or touch input for this long counts as idle. */
export const SAFE_RELOAD_INPUT_IDLE_MS = 60_000;

/** How often a pending reload re-evaluates whether the moment is safe. */
export const SAFE_RELOAD_POLL_MS = 5_000;

/** A kiosk never navigates, so it asks the server for a new worker itself. */
export const SW_UPDATE_CHECK_INTERVAL_MS = 30 * 60_000;

/**
 * The kiosk's resting screens. Home is the keypad; sign-in is the device
 * sign-in screen shown before a device is paired or after it is revoked.
 */
const RESTING_PATHNAMES: ReadonlySet<string> = new Set([
  ROUTES.home,
  ROUTES.signIn,
]);

export type SafeReloadSnapshot = {
  now: number;
  /** Time of the last trusted pointer/key/touch input; null when none yet. */
  lastTrustedInputAt: number | null;
  pathname: string;
  /**
   * Open rise surfaces (identity confirm, result/summary, device settings).
   * Any open surface means a kiosk flow is in progress.
   */
  openSurfaceCount: number;
};

/**
 * Whether reloading the page now cannot interrupt anyone: the kiosk is on a
 * resting screen, no flow surface is open, and nobody has touched it for
 * `idleMs`. A keypad holding a half-typed code after a minute of silence is
 * abandoned, so reloading it is equivalent to the kiosk's own reset.
 */
export function isSafeToReload(
  snapshot: SafeReloadSnapshot,
  idleMs: number = SAFE_RELOAD_INPUT_IDLE_MS,
): boolean {
  if (!RESTING_PATHNAMES.has(snapshot.pathname)) return false;
  if (snapshot.openSurfaceCount > 0) return false;
  if (
    snapshot.lastTrustedInputAt !== null &&
    snapshot.now - snapshot.lastTrustedInputAt < idleMs
  ) {
    return false;
  }
  return true;
}

export type SwReloadControllerOptions = {
  /** `navigator.serviceWorker.controller !== null` when the page booted. */
  hadControllerAtStart: boolean;
  isSafe: () => boolean;
  reload: () => void;
};

export type SwReloadController = {
  /** Call on every `controllerchange` of `navigator.serviceWorker`. */
  onControllerChange: () => void;
  /** Call periodically; reloads once when a reload is pending and it is safe. */
  tick: () => void;
  isReloadPending: () => boolean;
};

/**
 * Turns `controllerchange` events into at most one page reload.
 *
 * - The first claim of a page that booted without a controller (first
 *   install) is not a release change: the page already runs the newest
 *   bundle, so it does not reload.
 * - Any later change marks a reload pending; it happens on the first tick
 *   that finds the kiosk idle, and never more than once per page load, so a
 *   repeated or spurious `controllerchange` cannot loop.
 */
export function createSwReloadController({
  hadControllerAtStart,
  isSafe,
  reload,
}: SwReloadControllerOptions): SwReloadController {
  let hasController = hadControllerAtStart;
  let pending = false;
  let reloaded = false;

  const tick = (): void => {
    if (!pending || reloaded) return;
    if (!isSafe()) return;
    pending = false;
    reloaded = true;
    reload();
  };

  return {
    onControllerChange: () => {
      if (!hasController) {
        hasController = true;
        return;
      }
      if (reloaded) return;
      pending = true;
      tick();
    },
    tick,
    isReloadPending: () => pending,
  };
}

const TRUSTED_INPUT_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * Records the time of the last *trusted* (user-generated) input on `target`.
 * Synthetic events dispatched by code do not count.
 */
export function trackTrustedInput(
  target: Pick<EventTarget, "addEventListener" | "removeEventListener">,
  now: () => number = Date.now,
): { lastInputAt: () => number | null; stop: () => void } {
  let lastInputAt: number | null = null;
  const listener = (event: Event): void => {
    if (event.isTrusted) lastInputAt = now();
  };
  const options: AddEventListenerOptions = { capture: true, passive: true };

  for (const type of TRUSTED_INPUT_EVENTS) {
    target.addEventListener(type, listener, options);
  }

  return {
    lastInputAt: () => lastInputAt,
    stop: () => {
      for (const type of TRUSTED_INPUT_EVENTS) {
        target.removeEventListener(type, listener, options);
      }
    },
  };
}
