import { isEditableElement } from '@beyo/ui';
import { useEffect, useState } from "react";

type VisualViewportState = {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  viewportHeight: number;
  offsetTop: number;
};

const KEYBOARD_OPEN_THRESHOLD = 100;

// See KeyboardInsetProvider: WebKit may resume a page with a stale,
// keyboard-shrunk visual viewport and fix it later without a resize event.
const RESUME_REMEASURE_DELAYS_MS = [0, 100, 500];

function getInitialState(): VisualViewportState {
  if (typeof window === "undefined") {
    return {
      keyboardHeight: 0,
      isKeyboardOpen: false,
      viewportHeight: 0,
      offsetTop: 0,
    };
  }

  return {
    keyboardHeight: 0,
    isKeyboardOpen: false,
    viewportHeight: window.innerHeight,
    offsetTop: 0,
  };
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(getInitialState);

  useEffect(() => {
    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      setState({
        keyboardHeight: 0,
        isKeyboardOpen: false,
        viewportHeight: window.innerHeight,
        offsetTop: 0,
      });
      return;
    }

    const vv = visualViewport;
    let animationFrameId: number | null = null;
    let resumeTimeoutIds: number[] = [];

    function update(): void {
      animationFrameId = null;

      // A keyboard can only be open for this page while an editable element
      // has focus; anything else is a stale viewport reading.
      const editing =
        document.visibilityState !== "hidden" &&
        isEditableElement(document.activeElement);
      const keyboardHeight = editing
        ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
        : 0;

      setState({
        keyboardHeight,
        isKeyboardOpen: keyboardHeight > KEYBOARD_OPEN_THRESHOLD,
        viewportHeight: vv.height,
        offsetTop: editing ? vv.offsetTop : 0,
      });
    }

    function scheduleUpdate(): void {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(update);
    }

    function scheduleResumeBurst(): void {
      for (const id of resumeTimeoutIds) {
        window.clearTimeout(id);
      }
      resumeTimeoutIds = RESUME_REMEASURE_DELAYS_MS.map((delay) =>
        window.setTimeout(scheduleUpdate, delay),
      );
    }

    update();

    vv.addEventListener("resize", scheduleUpdate);
    vv.addEventListener("scroll", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("focusin", scheduleUpdate);
    document.addEventListener("focusout", scheduleUpdate);
    window.addEventListener("focus", scheduleResumeBurst);
    window.addEventListener("pageshow", scheduleResumeBurst);
    document.addEventListener("visibilitychange", scheduleResumeBurst);

    return () => {
      vv.removeEventListener("resize", scheduleUpdate);
      vv.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("focusin", scheduleUpdate);
      document.removeEventListener("focusout", scheduleUpdate);
      window.removeEventListener("focus", scheduleResumeBurst);
      window.removeEventListener("pageshow", scheduleResumeBurst);
      document.removeEventListener("visibilitychange", scheduleResumeBurst);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      for (const id of resumeTimeoutIds) {
        window.clearTimeout(id);
      }
    };
  }, []);

  return state;
}
