import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type KeyboardInsetValue = {
  isKeyboardOpen: boolean;
};

const DEFAULT_KEYBOARD_INSET_VALUE: KeyboardInsetValue = {
  isKeyboardOpen: false,
};

const KEYBOARD_OPEN_THRESHOLD = 100;

// WebKit can restore a backgrounded page with the visual viewport still
// shrunk by *another app's* keyboard and correct it a few frames later without
// firing a `visualViewport` resize. Re-measure a few times after any
// "we are back" signal so the last reading is the settled one.
const RESUME_REMEASURE_DELAYS_MS = [0, 100, 500];

const KeyboardInsetContext = createContext<KeyboardInsetValue>(
  DEFAULT_KEYBOARD_INSET_VALUE,
);

/**
 * The software keyboard can only be open for *this* page when an editable
 * element has focus. Gating on it makes a stale viewport reading (see above)
 * harmless: no focused field → no keyboard inset, whatever WebKit reports.
 */
export function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.isContentEditable) {
    return true;
  }
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  if (element instanceof HTMLSelectElement) {
    return !element.disabled;
  }
  if (element instanceof HTMLInputElement) {
    return !element.disabled && !element.readOnly && element.type !== "hidden";
  }
  return false;
}

type KeyboardInsetProviderProps = {
  children: ReactNode;
};

export function KeyboardInsetProvider({
  children,
}: KeyboardInsetProviderProps): React.JSX.Element {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isKeyboardOpenRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const visualViewport = window.visualViewport;
    let animationFrameId: number | null = null;
    let resumeTimeoutIds: number[] = [];

    function publish(keyboardInset: number, viewportOffsetTop: number): void {
      root.style.setProperty("--keyboard-inset", `${keyboardInset}px`);
      root.style.setProperty(
        "--viewport-offset-top",
        `${viewportOffsetTop}px`,
      );
    }

    function commitOpen(nextIsKeyboardOpen: boolean): void {
      if (isKeyboardOpenRef.current !== nextIsKeyboardOpen) {
        isKeyboardOpenRef.current = nextIsKeyboardOpen;
        setIsKeyboardOpen(nextIsKeyboardOpen);
      }
    }

    if (!visualViewport) {
      publish(0, 0);
      return;
    }

    const vv = visualViewport;
    function update(): void {
      animationFrameId = null;

      // Hidden pages get no inset: never resume showing the old value, even
      // for one frame, while the re-measure burst below settles.
      if (document.visibilityState === "hidden") {
        publish(0, 0);
        commitOpen(false);
        return;
      }

      const editing = isEditableElement(document.activeElement);

      // `html, body` are `overflow: hidden` in this app, so when iOS needs to
      // reveal a focused field it cannot scroll the document — it offsets the
      // *visual* viewport instead. `position: fixed` stays glued to the layout
      // viewport, so anything pinned to the keyboard has to subtract that
      // offset or it lands `offsetTop` px too high.
      const viewportOffsetTop = editing ? Math.max(0, vv.offsetTop) : 0;
      const keyboardHeight = editing
        ? Math.max(0, window.innerHeight - vv.height)
        : 0;
      // Open/closed is decided by the real keyboard height: a large viewport
      // offset must not read as "the keyboard closed".
      const nextIsKeyboardOpen = keyboardHeight > KEYBOARD_OPEN_THRESHOLD;

      // Distance from the bottom of the *layout* viewport to the top of the
      // keyboard — what a `position: fixed; bottom:` anchor needs.
      publish(Math.max(0, keyboardHeight - viewportOffsetTop), viewportOffsetTop);
      commitOpen(nextIsKeyboardOpen);
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

      publish(0, 0);
    };
  }, []);

  return (
    <KeyboardInsetContext.Provider value={{ isKeyboardOpen }}>
      {children}
    </KeyboardInsetContext.Provider>
  );
}

export function useKeyboardInset(): KeyboardInsetValue {
  return useContext(KeyboardInsetContext);
}
