import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@beyo/lib";
import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";
import { preventFocusSteal } from "../floating-keyboard-bar";
import { useKeyboardAccessorySuppressed } from "./keyboardAccessoryPriority";

type EligibleKeyboardField = HTMLInputElement | HTMLTextAreaElement;

type KeyboardAccessoryBarProps = {
  children: ReactNode;
  clearLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
  className?: string;
};

type ActiveFieldState = {
  field: EligibleKeyboardField | null;
  hasNextField: boolean;
  actionLabel: string;
};

const ELIGIBLE_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isVisibleElement(element: HTMLElement): boolean {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function isEligibleKeyboardField(
  element: Element | null,
): element is EligibleKeyboardField {
  if (
    !(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    )
  ) {
    return false;
  }

  if (element.disabled || element.readOnly || !isVisibleElement(element)) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  return ELIGIBLE_INPUT_TYPES.has(element.type);
}

function getEligibleFields(container: HTMLElement): EligibleKeyboardField[] {
  return Array.from(container.querySelectorAll("input, textarea")).filter(
    isEligibleKeyboardField,
  );
}

function setNativeFieldValue(
  field: EligibleKeyboardField,
  value: string,
): void {
  const prototype =
    field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  valueSetter?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function scrollFieldIntoView(field: EligibleKeyboardField): void {
  window.requestAnimationFrame(() => {
    field.scrollIntoView({ block: "center" });
  });
}

export function KeyboardAccessoryBar({
  children,
  clearLabel = "Clear input",
  nextLabel = "Next field",
  doneLabel = "Done",
  className,
}: KeyboardAccessoryBarProps): React.JSX.Element {
  const { isKeyboardOpen } = useKeyboardInset();
  const isSuppressed = useKeyboardAccessorySuppressed();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeState, setActiveState] = useState<ActiveFieldState>({
    field: null,
    hasNextField: false,
    actionLabel: doneLabel,
  });

  const refreshActiveField = useCallback(() => {
    const container = containerRef.current;
    const element = document.activeElement;
    const field =
      container?.contains(element) && isEligibleKeyboardField(element)
        ? element
        : null;

    if (!container || !field) {
      setActiveState({
        field: null,
        hasNextField: false,
        actionLabel: doneLabel,
      });
      return;
    }

    const fields = getEligibleFields(container);
    const activeIndex = fields.indexOf(field);
    const hasNextField = activeIndex >= 0 && activeIndex < fields.length - 1;

    setActiveState({
      field,
      hasNextField,
      actionLabel: hasNextField ? nextLabel : doneLabel,
    });

    if (field) {
      scrollFieldIntoView(field);
    }
  }, [doneLabel, nextLabel]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    function handleFocusOut(): void {
      window.setTimeout(refreshActiveField, 0);
    }

    container.addEventListener("focusin", refreshActiveField);
    container.addEventListener("focusout", handleFocusOut);
    refreshActiveField();

    return () => {
      container.removeEventListener("focusin", refreshActiveField);
      container.removeEventListener("focusout", handleFocusOut);
    };
  }, [refreshActiveField]);

  const activeField = activeState.field;
  const shouldShowBar = Boolean(
    isKeyboardOpen && activeField && activeField.isConnected && !isSuppressed,
  );

  const handleClear = useCallback(() => {
    if (!activeField) {
      return;
    }

    setNativeFieldValue(activeField, "");
    activeField.focus();
  }, [activeField]);

  const handleAdvance = useCallback(() => {
    if (!activeField || !containerRef.current) {
      return;
    }

    const currentFields = getEligibleFields(containerRef.current);
    const currentIndex = currentFields.indexOf(activeField);
    const nextField = currentFields[currentIndex + 1];

    if (nextField) {
      nextField.focus();
      const hasNextField = currentIndex + 1 < currentFields.length - 1;
      setActiveState({
        field: nextField,
        hasNextField,
        actionLabel: hasNextField ? nextLabel : doneLabel,
      });
      scrollFieldIntoView(nextField);
      return;
    }

    activeField.blur();
    setActiveState({
      field: null,
      hasNextField: false,
      actionLabel: doneLabel,
    });
  }, [activeField, doneLabel, nextLabel]);

  return (
    <>
      <div ref={containerRef}>{children}</div>
      {shouldShowBar
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed inset-x-0 z-[9999]",
                "bottom-[var(--keyboard-inset)]",
              )}
            >
              <div
                className={cn(
                  "pointer-events-auto border-t border-border bg-card px-4 pb-[calc(var(--safe-bottom)_+_0.5rem)] pt-2 shadow-xl",
                  className,
                )}
                aria-label="Keyboard field navigation"
                role="toolbar"
              >
                <div className="flex min-h-10 items-center justify-between gap-3">
                  <button
                    type="button"
                    className="w-full flex-1 rounded-lg border border-[var(--color-between-border)] bg-card px-3 py-3.5 text-sm font-medium text-primary shadow-sm"
                    data-testid="keyboard-accessory-clear"
                    onClick={handleClear}
                    onMouseDown={preventFocusSteal}
                  >
                    {clearLabel}
                  </button>
                  <button
                    type="button"
                    className="w-full flex-1 rounded-lg bg-primary px-3 py-3.5 text-sm font-semibold text-[var(--color-card)] shadow-sm"
                    data-testid="keyboard-accessory-next"
                    onClick={handleAdvance}
                    onMouseDown={preventFocusSteal}
                  >
                    {activeState.actionLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
