import { useEffect, useState } from "react";

type VisualViewportState = {
  keyboardHeight: number;
  isKeyboardOpen: boolean;
  viewportHeight: number;
  offsetTop: number;
};

const KEYBOARD_OPEN_THRESHOLD = 100;

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

    function update(): void {
      animationFrameId = null;

      const keyboardHeight = Math.max(
        0,
        window.innerHeight - (vv.height + vv.offsetTop),
      );

      setState({
        keyboardHeight,
        isKeyboardOpen: keyboardHeight > KEYBOARD_OPEN_THRESHOLD,
        viewportHeight: vv.height,
        offsetTop: vv.offsetTop,
      });
    }

    function scheduleUpdate(): void {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(update);
    }

    update();

    vv.addEventListener("resize", scheduleUpdate);
    vv.addEventListener("scroll", scheduleUpdate);

    return () => {
      vv.removeEventListener("resize", scheduleUpdate);
      vv.removeEventListener("scroll", scheduleUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return state;
}
