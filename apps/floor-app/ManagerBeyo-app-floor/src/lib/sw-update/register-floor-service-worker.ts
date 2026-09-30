import { reloadAutomatically } from "@beyo/system-control";
import { useSurfaceStore } from "@beyo/ui";

import {
  SAFE_RELOAD_POLL_MS,
  SW_UPDATE_CHECK_INTERVAL_MS,
  createSwReloadController,
  isSafeToReload,
  trackTrustedInput,
} from "@/lib/sw-update/safe-reload";

/**
 * Registers the floor service worker and moves an always-open kiosk onto new
 * releases:
 *
 * 1. `sw.ts` calls `skipWaiting()` + `clientsClaim()`, so a new worker takes
 *    over the open page as soon as it is installed.
 * 2. Every {@link SW_UPDATE_CHECK_INTERVAL_MS} the page asks for a new worker
 *    (`registration.update()` fetches the static `sw.js`, never the API).
 * 3. The takeover fires `controllerchange`; the page then reloads onto the new
 *    bundle the first time the kiosk is idle on a resting screen
 *    (`isSafeToReload`), once. The reload is marked automatic
 *    (`reloadAutomatically` -> `markAutomaticReload`), so if the system sleeps
 *    the reloaded page shows the DORMANT screen instead of waking it.
 *
 * Production builds only: the dev server has no floor worker (and the MSW mock
 * worker would otherwise trigger `controllerchange`).
 */
export function registerFloorServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const container = navigator.serviceWorker;
  const input = trackTrustedInput(window);
  const reloadController = createSwReloadController({
    hadControllerAtStart: container.controller !== null,
    isSafe: () =>
      isSafeToReload({
        now: Date.now(),
        lastTrustedInputAt: input.lastInputAt(),
        pathname: window.location.pathname,
        openSurfaceCount: useSurfaceStore.getState().stack.length,
      }),
    reload: () => reloadAutomatically(),
  });

  container.addEventListener("controllerchange", reloadController.onControllerChange);
  window.setInterval(reloadController.tick, SAFE_RELOAD_POLL_MS);

  const register = (): void => {
    const base = import.meta.env.BASE_URL;
    container
      .register(`${base}sw.js`, { scope: base })
      .then((registration) => {
        window.setInterval(() => {
          registration.update().catch(() => {
            // Offline or the server is unreachable: try again next interval.
          });
        }, SW_UPDATE_CHECK_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        console.error("[floor] service worker registration failed", error);
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
