import { useLayoutEffect } from "react";

type BodyStyleSnapshot = {
  position: string;
  top: string;
  width: string;
  overflow: string;
  scrollY: number;
};

let activeLockCount = 0;
let bodyStyleSnapshot: BodyStyleSnapshot | null = null;

function lockBody(): void {
  if (activeLockCount === 0) {
    bodyStyleSnapshot = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      scrollY: window.scrollY,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${bodyStyleSnapshot.scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
  }

  activeLockCount += 1;
}

function unlockBody(): void {
  activeLockCount = Math.max(0, activeLockCount - 1);

  if (activeLockCount > 0 || bodyStyleSnapshot === null) {
    return;
  }

  const snapshot = bodyStyleSnapshot;
  bodyStyleSnapshot = null;

  document.body.style.position = snapshot.position;
  document.body.style.top = snapshot.top;
  document.body.style.width = snapshot.width;
  document.body.style.overflow = snapshot.overflow;
  window.scrollTo(0, snapshot.scrollY);
}

export function useBodyScrollLock(locked: boolean): void {
  useLayoutEffect(() => {
    if (!locked) {
      return;
    }

    lockBody();
    return unlockBody;
  }, [locked]);
}
