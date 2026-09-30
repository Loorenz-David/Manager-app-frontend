/**
 * Self-initiated reloads must not wake the system.
 *
 * A page load normally counts as "someone opened the application", so the
 * gate wakes a sleeping system on boot. A reload the application performs by
 * itself (the floor kiosk moving onto a new service-worker release at an idle
 * moment) is not a person: before such a reload, call `markAutomaticReload()`.
 * The next boot consumes the marker and, if the system sleeps, shows the
 * DORMANT screen (touch to continue) instead of waking it.
 *
 * Every future automatic reload must go through this helper (or
 * `reloadAutomatically()`).
 */
export const AUTOMATIC_RELOAD_STORAGE_KEY = "beyo:system:auto-reload";

/** A marker older than this is stale (a manual reload much later). */
export const AUTOMATIC_RELOAD_MARKER_TTL_MS = 60_000;

function sessionStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Records that the next page load is an automatic reload. */
export function markAutomaticReload(now: number = Date.now()): void {
  try {
    sessionStore()?.setItem(AUTOMATIC_RELOAD_STORAGE_KEY, String(now));
  } catch {
    // Storage unavailable: the reload will count as a visible page load.
  }
}

/** Marks the reload as automatic, then reloads the page. */
export function reloadAutomatically(
  reload: () => void = () => window.location.reload(),
): void {
  markAutomaticReload();
  reload();
}

let consumed: boolean | null = null;

/**
 * Reads and removes the marker. Page-load scoped: the first call decides, later
 * calls return the same answer (a StrictMode double mount must not turn an
 * automatic reload into a wake on its second mount).
 */
export function consumeAutomaticReloadMarker(now: number = Date.now()): boolean {
  if (consumed !== null) return consumed;
  let raw: string | null;
  try {
    const store = sessionStore();
    raw = store?.getItem(AUTOMATIC_RELOAD_STORAGE_KEY) ?? null;
    store?.removeItem(AUTOMATIC_RELOAD_STORAGE_KEY);
  } catch {
    raw = null;
  }
  const markedAt = raw === null ? Number.NaN : Number(raw);
  const age = now - markedAt;
  consumed =
    Number.isFinite(markedAt) &&
    age >= 0 &&
    age <= AUTOMATIC_RELOAD_MARKER_TTL_MS;
  return consumed;
}

/** Test seam: forget the page-load answer. */
export function resetAutomaticReloadMarkerForTests(): void {
  consumed = null;
}
