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

type FocusOwner = {
  relinquish: () => void;
};

// The keyboard inset is shared by the whole page, so only one floating field
// may own it at a time. Keeping that ownership synchronous prevents an older
// field's queued focusout/closing animation from reclaiming focus from the
// field the user just opened.
let activeFocusOwner: FocusOwner | null = null;

function claimFocus(owner: FocusOwner): void {
  if (activeFocusOwner === owner) {
    return;
  }

  activeFocusOwner?.relinquish();
  activeFocusOwner = owner;
}

function releaseFocus(owner: FocusOwner): void {
  if (activeFocusOwner === owner) {
    activeFocusOwner = null;
  }
}

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
  const travelDistance = useMotionValue(0);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isOwnFieldFocused, setIsOwnFieldFocused] = useState(false);
  const isPanelMountedRef = useRef(false);
  const animationGenerationRef = useRef(0);
  const focusOwnerRef = useRef<FocusOwner | null>(null);
  const reducedMotion = useReducedMotion();
  const panelY = useTransform(
    [progress, travelDistance],
    ([progressValue, distance]: number[]) =>
      reducedMotion ? 0 : (1 - progressValue) * distance,
  );
  const panelOpacity = useTransform(progress, [0, 1], [0, 1]);
  const panelClipPath = useTransform(
    [progress, travelDistance],
    ([progressValue, distance]: number[]) =>
      reducedMotion
        ? "inset(0px 0px 0px 0px)"
        : `inset(${(1 - progressValue) * distance}px 0px 0px 0px)`,
  );

  const isPanelVariant = variant === "panel";

  useEffect(() => {
    const focusOwner: FocusOwner = {
      relinquish: () => setIsOwnFieldFocused(false),
    };
    focusOwnerRef.current = focusOwner;

    function isOwnInput(target: EventTarget | null): boolean {
      return (
        target === inlineInputRef.current ||
        target === floatingInputRef.current ||
        target === noopInputRef.current
      );
    }

    function handleFocusIn(event: FocusEvent): void {
      if (isOwnInput(event.target)) {
        claimFocus(focusOwner);
        setIsOwnFieldFocused(true);
      }
    }

    function handleFocusOut(event: FocusEvent): void {
      if (!isOwnInput(event.target)) {
        return;
      }

      queueMicrotask(() => {
        const remainsOwn = isOwnInput(document.activeElement);
        if (!remainsOwn) {
          releaseFocus(focusOwner);
          setIsOwnFieldFocused(false);
        }
      });
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    if (isOwnInput(document.activeElement)) {
      claimFocus(focusOwner);
      setIsOwnFieldFocused(true);
    }

    return () => {
      releaseFocus(focusOwner);
      focusOwnerRef.current = null;
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isKeyboardOpen || !isOwnFieldFocused) {
      return;
    }

    floatingInputRef.current?.focus({ preventScroll: true });
  }, [isKeyboardOpen, isOwnFieldFocused]);

  useLayoutEffect(() => {
    if (!isPanelVariant) {
      isPanelMountedRef.current = false;
      setIsPanelMounted(false);
      return;
    }

    const generation = animationGenerationRef.current + 1;
    animationGenerationRef.current = generation;

    if (isKeyboardOpen && isOwnFieldFocused) {
      const inlineRect = inlineWrapperRef.current?.getBoundingClientRect();
      const safeTop = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--safe-top",
        ),
      );
      const targetTop = Number.isFinite(safeTop) ? safeTop : 0;
      const nextTravelDistance = Math.max(
        0,
        (inlineRect?.top ?? targetTop) - targetTop,
      );

      travelDistance.set(nextTravelDistance);
      isPanelMountedRef.current = true;
      setIsPanelMounted(true);
      const openingAnimation = animate(progress, 1, transitions.surface);
      return () => openingAnimation.stop();
    }

    if (!isPanelMountedRef.current) {
      return;
    }

    if (
      !isKeyboardOpen &&
      floatingInputRef.current &&
      document.activeElement === floatingInputRef.current
    ) {
      // Release the native input before the closing animation starts. Leaving
      // the floating input focused while the keyboard is disappearing can
      // make mobile browsers reopen it when the portal is removed.
      floatingInputRef.current.blur();
    }

    const closingAnimation = animate(progress, 0, {
      ...transitions.base,
      onComplete: () => {
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
    return () => closingAnimation.stop();
  }, [isKeyboardOpen, isOwnFieldFocused, isPanelVariant, progress]);

  useLayoutEffect(() => {
    if (!isPanelMounted || !isOwnFieldFocused) {
      return;
    }

    floatingInputRef.current?.focus({ preventScroll: true });
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

    const focusOwner = focusOwnerRef.current;
    if (!nextIsOwnFieldFocused && focusOwner) {
      releaseFocus(focusOwner);
    }
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
                    "flex h-full flex-col bg-card pt-[var(--safe-top)]",
                    isKeyboardOpen && isOwnFieldFocused
                      ? "pointer-events-auto"
                      : "pointer-events-none",
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
