import { useEffect, useRef, useSyncExternalStore } from "react";

let nextClaimId = 0;
const activeClaims = new Set<number>();
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return activeClaims.size > 0;
}

function claimPriority(): () => void {
  const claimId = nextClaimId;
  nextClaimId += 1;
  activeClaims.add(claimId);
  emitChange();

  return () => {
    if (!activeClaims.delete(claimId)) {
      return;
    }

    emitChange();
  };
}

export function useKeyboardAccessorySuppressed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useKeyboardAccessoryPriority(active: boolean): void {
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (active && !releaseRef.current) {
      releaseRef.current = claimPriority();
      return;
    }

    if (!active && releaseRef.current) {
      releaseRef.current();
      releaseRef.current = null;
    }
  }, [active]);

  useEffect(
    () => () => {
      releaseRef.current?.();
      releaseRef.current = null;
    },
    [],
  );
}
