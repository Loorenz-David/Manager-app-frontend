import {
  animate,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cn, transitions } from "@beyo/lib";
import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";
import { useBodyScrollLock } from "./use-body-scroll-lock";

export type FloatingKeyboardBarProps = {
  variant?: "bar" | "panel";
  renderControls: (args: {
    inputRef: RefObject<HTMLInputElement | null>;
    preventFocusSteal: typeof preventFocusSteal;
    isFloating: boolean;
    panelProgress: MotionValue<number> | null;
    isInlineHidden: boolean;
    isPanelOpening: boolean;
  }) => ReactNode;
  className?: string;
};

export function preventFocusSteal(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

export function FloatingKeyboardBar({
  renderControls,
  className,
  variant = "bar",
}: FloatingKeyboardBarProps): React.JSX.Element | null {
  const { isKeyboardOpen } = useKeyboardInset();
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const noopInputRef = useRef<HTMLInputElement | null>(null);
  const inlineWrapperRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const [travelDistance, setTravelDistance] = useState(0);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isOwnFieldFocused, setIsOwnFieldFocused] = useState(false);
  const isPanelMountedRef = useRef(false);
  const animationGenerationRef = useRef(0);
  const reducedMotion = useReducedMotion();
  const panelY = useTransform(
    progress,
    [0, 1],
    reducedMotion ? [0, 0] : [travelDistance, 0],
  );
  const panelOpacity = useTransform(progress, [0, 1], [0, 1]);
  const panelClipPath = useTransform(progress, (value) =>
    reducedMotion
      ? "inset(0px 0px 0px 0px)"
      : `inset(${(1 - value) * travelDistance}px 0px 0px 0px)`,
  );

  const isPanelVariant = variant === "panel";

  useEffect(() => {
    function isOwnInput(target: EventTarget | null): boolean {
      return (
        target === inlineInputRef.current ||
        target === floatingInputRef.current ||
        target === noopInputRef.current
      );
    }

    function handleFocusIn(event: FocusEvent): void {
      if (isOwnInput(event.target)) {
        // eslint-disable-next-line no-console
        console.log("[kb-debug] focusin on own input", event.target);
        setIsOwnFieldFocused(true);
      }
    }

    function handleFocusOut(event: FocusEvent): void {
      if (!isOwnInput(event.target)) {
        return;
      }

      queueMicrotask(() => {
        // eslint-disable-next-line no-console
        console.log(
          "[kb-debug] focusout microtask, activeElement is own input?",
          isOwnInput(document.activeElement),
          document.activeElement,
        );
        if (!isOwnInput(document.activeElement)) {
          setIsOwnFieldFocused(false);
        }
      });
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    if (isOwnInput(document.activeElement)) {
      setIsOwnFieldFocused(true);
    }

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  useLayoutEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[kb-debug] handoff#1", { isKeyboardOpen, isOwnFieldFocused });
    if (!isKeyboardOpen || !isOwnFieldFocused) {
      return;
    }

    floatingInputRef.current?.focus();
  }, [isKeyboardOpen, isOwnFieldFocused]);

  useLayoutEffect(() => {
    if (!isPanelVariant) {
      isPanelMountedRef.current = false;
      setIsPanelMounted(false);
      return;
    }

    const generation = animationGenerationRef.current + 1;
    animationGenerationRef.current = generation;
    // eslint-disable-next-line no-console
    console.log("[kb-debug] panel-effect", {
      generation,
      isKeyboardOpen,
      isOwnFieldFocused,
      wasMounted: isPanelMountedRef.current,
    });

    if (isKeyboardOpen && isOwnFieldFocused) {
      const inlineRect = inlineWrapperRef.current?.getBoundingClientRect();
      const safeTop = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--safe-top",
        ),
      );
      const targetTop = Number.isFinite(safeTop) ? safeTop : 0;

      setTravelDistance(
        Math.max(0, (inlineRect?.top ?? targetTop) - targetTop),
      );
      isPanelMountedRef.current = true;
      setIsPanelMounted(true);
      // eslint-disable-next-line no-console
      console.log("[kb-debug] panel-effect -> OPENING", { generation });
      void animate(progress, 1, transitions.surface);
      return;
    }

    if (!isPanelMountedRef.current) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log("[kb-debug] panel-effect -> CLOSING", { generation });
    void animate(progress, 0, {
      ...transitions.base,
      onComplete: () => {
        // eslint-disable-next-line no-console
        console.log("[kb-debug] close animation onComplete", {
          generation,
          currentGeneration: animationGenerationRef.current,
          isKeyboardOpen,
          isOwnFieldFocused,
        });
        if (
          animationGenerationRef.current !== generation ||
          (isKeyboardOpen && isOwnFieldFocused)
        ) {
          return;
        }

        isPanelMountedRef.current = false;
        setIsPanelMounted(false);
      },
    });
  }, [isKeyboardOpen, isOwnFieldFocused, isPanelVariant, progress]);

  useLayoutEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[kb-debug] handoff#2", { isOwnFieldFocused, isPanelMounted });
    if (!isPanelMounted || !isOwnFieldFocused) {
      return;
    }

    floatingInputRef.current?.focus();
  }, [isOwnFieldFocused, isPanelMounted]);

  useLayoutEffect(() => {
    if (isPanelMounted) {
      return;
    }

    const activeElement = document.activeElement;
    const nextIsOwnFieldFocused =
      activeElement === inlineInputRef.current ||
      activeElement === floatingInputRef.current ||
      activeElement === noopInputRef.current;
    // eslint-disable-next-line no-console
    console.log("[kb-debug] recheck-on-unmount", {
      nextIsOwnFieldFocused,
      activeElement,
    });
    setIsOwnFieldFocused(nextIsOwnFieldFocused);
  }, [isPanelMounted]);

  useBodyScrollLock(isPanelVariant && isPanelMounted);

  const isInlineHidden = isPanelVariant && isPanelMounted;
  const isPanelOpening = isPanelVariant && isKeyboardOpen && !isPanelMounted;

  const inlineControls = renderControls({
    inputRef:
      isKeyboardOpen || (isPanelVariant && isPanelMounted)
        ? noopInputRef
        : inlineInputRef,
    preventFocusSteal,
    isFloating: false,
    panelProgress: null,
    isInlineHidden,
    isPanelOpening,
  });

  const floatingControls = renderControls({
    inputRef: floatingInputRef,
    preventFocusSteal,
    isFloating: true,
    panelProgress: isPanelVariant ? progress : null,
    isInlineHidden: false,
    isPanelOpening: false,
  });

  if (!isKeyboardOpen && !isPanelMounted) {
    if (isPanelVariant) {
      return <div ref={inlineWrapperRef}>{inlineControls}</div>;
    }

    return <>{inlineControls}</>;
  }

  if (isPanelVariant) {
    return (
      <>
        <div
          ref={inlineWrapperRef}
          className={isPanelMounted ? "invisible" : undefined}
          aria-hidden={isPanelMounted || undefined}
        >
          {inlineControls}
        </div>
        {isPanelMounted
          ? createPortal(
              <div className="fixed inset-x-0 top-0 bottom-[var(--keyboard-inset)] z-[9999]">
                <m.div
                  className={cn(
                    "pointer-events-auto flex h-full flex-col bg-card pt-[var(--safe-top)]",
                    className,
                  )}
                  style={{ opacity: panelOpacity, y: panelY }}
                >
                  <m.div
                    className="flex h-full min-h-0 flex-col overflow-hidden bg-card"
                    style={{ clipPath: panelClipPath }}
                  >
                    {floatingControls}
                  </m.div>
                </m.div>
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <>
      <div className="invisible">{inlineControls}</div>
      {createPortal(
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 z-[9999]",
            "bottom-[var(--keyboard-inset)]",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto border-t border-border bg-card px-4 pb-[calc(var(--safe-bottom)_+_0.5rem)] pt-3 shadow-xl",
              className,
            )}
          >
            {floatingControls}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
