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
      return;
    }

    const vv = visualViewport;

    function update(): void {
      animationFrameId = null;

      const keyboardHeight = Math.max(
        0,
        window.innerHeight - (vv.height + vv.offsetTop),
      );
      const nextIsKeyboardOpen = keyboardHeight > KEYBOARD_OPEN_THRESHOLD;

      root.style.setProperty("--keyboard-inset", `${keyboardHeight}px`);

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
