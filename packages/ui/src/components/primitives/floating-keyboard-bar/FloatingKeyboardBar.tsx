import {
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@beyo/lib";
import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";

type FloatingKeyboardBarProps = {
  renderControls: (args: {
    inputRef: RefObject<HTMLInputElement | null>;
    preventFocusSteal: typeof preventFocusSteal;
  }) => ReactNode;
  className?: string;
};

export function preventFocusSteal(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  );
}

export function FloatingKeyboardBar({
  renderControls,
  className,
}: FloatingKeyboardBarProps): React.JSX.Element | null {
  const { isKeyboardOpen } = useKeyboardInset();
  const floatingInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const noopInputRef = useRef<HTMLInputElement | null>(null);
  const wasKeyboardOpenRef = useRef(false);
  const hadEditableFocusOnOpenRef = useRef(false);

  if (isKeyboardOpen && !wasKeyboardOpenRef.current) {
    hadEditableFocusOnOpenRef.current = isEditableElement(
      document.activeElement,
    );
  }

  useLayoutEffect(() => {
    const didOpen = isKeyboardOpen && !wasKeyboardOpenRef.current;
    wasKeyboardOpenRef.current = isKeyboardOpen;

    if (!didOpen || !hadEditableFocusOnOpenRef.current) {
      return;
    }

    floatingInputRef.current?.focus();
  }, [isKeyboardOpen]);

  const inlineControls = renderControls({
    inputRef: isKeyboardOpen ? noopInputRef : inlineInputRef,
    preventFocusSteal,
  });

  const floatingControls = renderControls({
    inputRef: floatingInputRef,
    preventFocusSteal,
  });

  if (!isKeyboardOpen) {
    return <>{inlineControls}</>;
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
