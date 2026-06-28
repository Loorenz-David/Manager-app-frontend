import type { MouseEvent } from "react";
import { createPortal } from "react-dom";

import { cn } from "@beyo/lib";

import { useKeyboardInset } from "../../../providers/KeyboardInsetProvider";
import { useKeyboardAccessoryPriority } from "../keyboard-accessory-bar";

type NumericKeyboardBarProps = {
  value: string;
  onChange: (value: string) => void;
  hasFocus: boolean;
  className?: string;
};

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

function preventFocusSteal(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

function triggerKeyHaptic(): void {
  navigator.vibrate?.(30);
}

export function NumericKeyboardBar({
  value,
  onChange,
  hasFocus,
  className,
}: NumericKeyboardBarProps): React.JSX.Element | null {
  const { isKeyboardOpen } = useKeyboardInset();
  const isActive = hasFocus && isKeyboardOpen;

  useKeyboardAccessoryPriority(isActive);

  if (!isActive) {
    return null;
  }

  return createPortal(
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
        <div className="flex gap-1.5">
          {DIGITS.map((digit) => (
            <button
              key={digit}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-between-border bg-card text-lg font-medium shadow-sm transition-colors duration-75 hover:bg-muted/80 active:bg-muted/60"
              data-testid={`numeric-keyboard-bar-digit-${digit}`}
              type="button"
              onMouseDown={preventFocusSteal}
              onClick={() => {
                triggerKeyHaptic();
                onChange(value + digit);
              }}
            >
              {digit}
            </button>
          ))}
          {/* <button
            className="flex h-10 w-12 items-center justify-center rounded-lg bg-muted text-sm font-medium transition-colors hover:bg-muted/80 active:bg-muted/60"
            data-testid="numeric-keyboard-bar-backspace"
            type="button"
            onMouseDown={preventFocusSteal}
            onClick={() => onChange(value.slice(0, -1))}
          >
            ⌫
          </button> */}
        </div>
      </div>
    </div>,
    document.body,
  );
}
