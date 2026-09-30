import { onlineManager as defaultOnlineManager } from "@tanstack/react-query";

/** The part of react-query's `onlineManager` the bridge uses. */
export type OnlineManagerLike = {
  setEventListener(
    setup: (setOnline: (online: boolean) => void) => (() => void) | undefined,
  ): void;
  setOnline(online: boolean): void;
  isOnline(): boolean;
};

type GateSource = {
  isOnline(): boolean;
  subscribe(listener: () => void): () => void;
};

/**
 * Makes the gate the authority over react-query's online state.
 *
 * react-query (5.x) has one `onlineManager` whose *event listener* is its only
 * writer: by default it sets online/offline from the window `online`/`offline`
 * events. `setEventListener` replaces that listener (and removes the old
 * one), so installing ours — which listens to the same browser events AND to
 * the gate — leaves no other writer: online = browser online AND gate online.
 * A browser `online` event while the gate is not READY therefore cannot let
 * paused queries hammer a waking backend. react-query keeps our setup across
 * its own subscribe/unsubscribe cycles (it re-runs the stored setup).
 *
 * Like react-query 5, the browser starts as online (it does not trust
 * `navigator.onLine`); only an `offline` event marks it offline.
 *
 * Returns the uninstaller, which restores browser-only behaviour and online.
 */
export function installOnlineManagerBridge(
  gate: GateSource,
  onlineManager: OnlineManagerLike = defaultOnlineManager,
): () => void {
  onlineManager.setEventListener((setOnline) => {
    let browserOnline = true;
    const apply = (): void => setOnline(browserOnline && gate.isOnline());
    const onOnline = (): void => {
      browserOnline = true;
      apply();
    };
    const onOffline = (): void => {
      browserOnline = false;
      apply();
    };
    window.addEventListener("online", onOnline, false);
    window.addEventListener("offline", onOffline, false);
    const unsubscribe = gate.subscribe(apply);
    apply();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsubscribe();
    };
  });

  return () => {
    onlineManager.setEventListener((setOnline) => {
      const onOnline = (): void => setOnline(true);
      const onOffline = (): void => setOnline(false);
      window.addEventListener("online", onOnline, false);
      window.addEventListener("offline", onOffline, false);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    });
    onlineManager.setOnline(true);
  };
}
