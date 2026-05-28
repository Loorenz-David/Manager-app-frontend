import { useSyncExternalStore } from "react";

type Listener = () => void;

let tickInterval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<Listener>();
let lastTickMs = Date.now();

function subscribe(callback: Listener): () => void {
  listeners.add(callback);

  if (listeners.size === 1) {
    lastTickMs = Date.now();
    tickInterval = setInterval(() => {
      lastTickMs = Date.now();
      for (const fn of listeners) {
        fn();
      }
    }, 1000);
  }

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0 && tickInterval !== null) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };
}

function getSnapshot(): number {
  return lastTickMs;
}

export function useTickingElapsed(startedAtMs: number): number {
  const now = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return Math.max(0, now - startedAtMs);
}
