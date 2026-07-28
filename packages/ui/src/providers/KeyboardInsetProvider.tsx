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

const KeyboardInsetContext = createContext<KeyboardInsetValue>(
  DEFAULT_KEYBOARD_INSET_VALUE,
);

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

    if (!visualViewport) {
      root.style.setProperty("--keyboard-inset", "0px");
      root.style.setProperty("--viewport-offset-top", "0px");
      return;
    }

    const vv = visualViewport;
    function update(): void {
      animationFrameId = null;

      // `html, body` are `overflow: hidden` in this app, so when iOS needs to
      // reveal a focused field it cannot scroll the document — it offsets the
      // *visual* viewport instead. `position: fixed` stays glued to the layout
      // viewport, so anything pinned to the keyboard has to subtract that
      // offset or it lands `offsetTop` px too high.
      const viewportOffsetTop = Math.max(0, vv.offsetTop);
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
      // Open/closed is decided by the real keyboard height: a large viewport
      // offset must not read as "the keyboard closed".
      const nextIsKeyboardOpen = keyboardHeight > KEYBOARD_OPEN_THRESHOLD;

      // Distance from the bottom of the *layout* viewport to the top of the
      // keyboard — what a `position: fixed; bottom:` anchor needs.
      root.style.setProperty(
        "--keyboard-inset",
        `${Math.max(0, keyboardHeight - viewportOffsetTop)}px`,
      );
      root.style.setProperty(
        "--viewport-offset-top",
        `${viewportOffsetTop}px`,
      );

      if (isKeyboardOpenRef.current !== nextIsKeyboardOpen) {
        isKeyboardOpenRef.current = nextIsKeyboardOpen;
        setIsKeyboardOpen(nextIsKeyboardOpen);
      }
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

      root.style.setProperty("--keyboard-inset", "0px");
      root.style.setProperty("--viewport-offset-top", "0px");
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
