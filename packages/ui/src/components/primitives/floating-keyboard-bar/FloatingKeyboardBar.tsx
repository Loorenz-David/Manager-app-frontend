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
import {
  KEYBOARD_TRAY_ANCHOR,
  KEYBOARD_TRAY_SURFACE,
} from "../shared/keyboard-tray";
import { useBodyScrollLock } from "./use-body-scroll-lock";
import { useScrollAncestorLock } from "./use-scroll-ancestor-lock";

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
  /**
   * `bar` variant only: stretch the docked surface from the top of the screen
   * to the keyboard instead of hugging its content, so nothing behind shows
   * through. The controls stay bottom-aligned, just above the keys.
   */
  fullHeight?: boolean;
  /**
   * `bar` variant only: nothing scrolls while the bar is docked. Freezes the
   * scroll container the field sits in (for gestures on the content behind) and
   * refuses pans on the tray itself (for gestures on the tray, which is
   * portaled to `body` and would otherwise pan the document). The `panel`
   * variant always locks (see `useBodyScrollLock`); the bar leaves it to the
   * consumer because a bar over a long form is often meant to be scrolled past.
   */
  lockScroll?: boolean;
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

function readRootPixels(variableName: string): number {
  const value = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(variableName),
  );

  return Number.isFinite(value) ? value : 0;
}

export function FloatingKeyboardBar({
  renderControls,
  className,
  variant = "bar",
  fullHeight = false,
  lockScroll = false,
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
      // Where the panel's own top edge lands, in the same (layout viewport)
      // coordinates `getBoundingClientRect` reports — see the portal below.
      const targetTop = Math.max(
        readRootPixels("--viewport-offset-top"),
        readRootPixels("--safe-top"),
      );
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

  // Docked means the keyboard is up for this bar's own field — the same
  // condition the render below uses to take the anchor.
  const isBarDocked = !isPanelVariant && isKeyboardOpen && isOwnFieldFocused;

  // The inline copy stays in the document while the bar is docked, so it is
  // the anchor for finding the scroll container to freeze. Its ref moves to
  // `noopInputRef` once the keyboard is open (see `inlineControls` below).
  useScrollAncestorLock(
    () => noopInputRef.current ?? inlineInputRef.current,
    lockScroll && isBarDocked,
  );

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

  if (isPanelVariant) {
    if (!isKeyboardOpen && !isPanelMounted) {
      return <div ref={inlineWrapperRef}>{inlineControls}</div>;
    }

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
              // Top follows the visual viewport, bottom follows the keyboard:
              // when iOS offsets the viewport (it cannot scroll this document)
              // `top-0` is that offset above the visible area, which puts the
              // whole panel — search field first — off screen.
              <div className="fixed inset-x-0 top-[var(--viewport-offset-top,0px)] bottom-[var(--keyboard-inset)] z-[9999]">
                <m.div
                  className={cn(
                    // Only the part of the notch the panel actually reaches:
                    // once the viewport is offset, the panel already starts
                    // below the safe area and padding it again wastes a strip
                    // of the little height the keyboard leaves.
                    "flex h-full flex-col bg-card pt-[max(0px,calc(var(--safe-top)_-_var(--viewport-offset-top,0px)))]",
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

  // The keyboard is shared by every field on the page, so an open keyboard is
  // not on its own an invitation to dock: only the bar whose own field holds
  // focus may take the anchor, or a page with several fields would hide this
  // one's controls and cover the field the user is actually editing.
  if (!isBarDocked) {
    return <>{inlineControls}</>;
  }

  return (
    <>
      <div className="invisible">{inlineControls}</div>
      {createPortal(
        <div
          className={cn(
            KEYBOARD_TRAY_ANCHOR,
            fullHeight &&
              "pointer-events-auto top-0 flex flex-col justify-center overflow-y-auto bg-card pt-(--safe-top)",
          )}
          data-testid="floating-keyboard-bar-surface"
          onClick={(event) => {
            // Tapping the empty area above the controls finishes the edit:
            // blurring the field lets the owner commit through its own handler.
            if (!fullHeight || event.target !== event.currentTarget) {
              return;
            }

            floatingInputRef.current?.blur();
          }}
        >
          <div
            className={cn(
              KEYBOARD_TRAY_SURFACE,
              "pt-3",
              // Stretched to the top there is nothing behind to divide from,
              // and the padding turns symmetric so the controls land on the
              // true centre of the space the keyboard leaves.
              fullHeight && "border-t-0 py-3 shadow-none",
              // The tray is portaled to `body`, so a drag on it pans whatever
              // the document can scroll — which the open keyboard is exactly
              // what makes scrollable on iOS. Locking the field's own container
              // cannot reach that gesture; refusing the pan can.
              lockScroll && !fullHeight && "touch-none",
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
