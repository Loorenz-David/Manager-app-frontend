/**
 * Human-activity classification of backend requests.
 *
 * Production sleeps when no human is using it. The backend decides that from
 * the `X-Beyo-Activity` header every request carries: `user` counts as human
 * activity, `background` never does. An open tab that nobody touches — above
 * all the always-on floor kiosk — must therefore send only `background`, even
 * for its automatic mutations (polls, read receipts, autosaves that fire long
 * after the last keystroke).
 *
 * A request is `user` when its caller says so, or — without an explicit
 * choice — when a trusted pointer, key or touch input happened in the last
 * 10 seconds while the page was visible. The HTTP method plays no part: a
 * POST nobody asked for is as much `background` as a poll.
 */

export type RequestActivity = "user" | "background";

/** The header the backend reads the classification from. */
export const ACTIVITY_HEADER = "X-Beyo-Activity";

/** How long a trusted input keeps requests classified as `user`. */
export const RECENT_INPUT_WINDOW_MS = 10_000;

const TRACKED_INPUT_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

let lastTrustedInput: number | null = null;
let installed = false;

function isDocumentVisible(): boolean {
  return (
    typeof document !== "undefined" && document.visibilityState === "visible"
  );
}

/**
 * Records one input event. Only a browser-generated (`isTrusted`) event on a
 * visible page counts: scripted `dispatchEvent` calls and input on a hidden
 * page are ignored.
 *
 * Not part of the package's public API — the window listeners call it with the
 * real event. It is exported for tests, which cannot produce trusted events in
 * jsdom and pass an `{ isTrusted: true }` stand-in instead.
 */
export function recordInputEvent(event: Pick<Event, "isTrusted">): void {
  if (!event.isTrusted || !isDocumentVisible()) return;
  lastTrustedInput = Date.now();
}

/**
 * Starts listening for trusted human input on `window`. Idempotent, and a
 * no-op outside a browser (SSR, node tests). The API client calls it lazily on
 * its first request; an app may call it earlier to count input made before.
 */
export function installActivityTracking(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  for (const type of TRACKED_INPUT_EVENTS) {
    window.addEventListener(type, recordInputEvent, {
      capture: true,
      passive: true,
    });
  }
}

/** Epoch milliseconds of the last trusted input on a visible page, or null. */
export function lastTrustedInputAt(): number | null {
  return lastTrustedInput;
}

/**
 * Whether a trusted input happened within the last `windowMs`. A clock that
 * moved backwards past the input answers `false`: when in doubt, background.
 */
export function hasRecentTrustedInput(
  windowMs: number = RECENT_INPUT_WINDOW_MS,
): boolean {
  if (lastTrustedInput === null) return false;
  const elapsed = Date.now() - lastTrustedInput;
  return elapsed >= 0 && elapsed <= windowMs;
}

/**
 * The classification a request is sent with: the caller's explicit choice
 * when given, otherwise `user` iff there was recent trusted input.
 */
export function resolveRequestActivity(
  explicit?: RequestActivity,
): RequestActivity {
  installActivityTracking();
  if (explicit) return explicit;
  return hasRecentTrustedInput() ? "user" : "background";
}

/**
 * The classification of the boot-time session restore: opening or reloading a
 * page the user is looking at is their doing; a page restored in a hidden tab
 * is not.
 */
export function visibleDocumentActivity(): RequestActivity {
  return isDocumentVisible() ? "user" : "background";
}
