import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@beyo/lib";

/**
 * Inline "quick action" bar for committing a single numeric amount without
 * leaving the list: a label, a stepper around the value, and the primary
 * action. Sits detached under a card (see `TaskListCard`'s `detachedAction`).
 *
 * Pressing the value switches it to a numeric field for manual entry. Editing
 * is *controlled* — the owner raises `onEditingChange` and wraps its whole card
 * in `KeyboardFloatingCard`, which docks it above the on-screen keyboard.
 */
export type AmountQuickActionProps = {
  /**
   * Names the amount for assistive tech ("Amount", "Order", "Received"). The
   * action button already says what the bar does, so it is not drawn.
   */
  label: string;
  value: number | null;
  onValueChange: (next: number | null) => void;
  /** True while the value is being typed. Owned by the card. */
  isEditing: boolean;
  onEditingChange: (next: boolean) => void;
  /** Supplied by `KeyboardFloatingCard` while docked. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Stepper increment. */
  step?: number;
  /** Lower bound the stepper and manual entry clamp to. */
  min?: number;
  /** Upper bound the stepper and manual entry clamp to. */
  max?: number;
  /** Colour family: blue for ordering/amount, green for receiving. */
  tone?: AmountQuickActionTone;
  unitLabel?: string;
  actionLabel: string;
  /** Receives the committed amount, so a just-typed value is never missed. */
  onAction: (amount: number | null) => void;
  isPending?: boolean;
  pendingLabel?: string;
  isActionDisabled?: boolean;
  className?: string;
  testId?: string;
};

export type AmountQuickActionTone = "blue" | "green";

const TONES: Record<
  AmountQuickActionTone,
  {
    container: string;
    stepper: string;
    value: string;
    input: string;
    action: string;
  }
> = {
  blue: {
    container: "border-[#b8d9ff] bg-[#eaf4ff]",
    stepper: "border-[#b8d9ff] text-[#1f5ea8]",
    value: "text-[#1f5ea8]",
    input: "border-[#b8d9ff] text-[#1e3a5f] focus:border-[#1f5ea8]",
    action: "bg-[#1e3a5f]",
  },
  green: {
    container: "border-[#9ed9b5] bg-[#eaf8ef]",
    stepper: "border-[#9ed9b5] text-[#1e7a46]",
    value: "text-[#1e7a46]",
    input: "border-[#9ed9b5] text-[#123a22] focus:border-[#1e7a46]",
    action: "bg-[#123a22]",
  },
};

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parses manual entry, tolerating the comma decimal separator. */
function parseAmount(raw: string, min: number, max?: number): number | null {
  const normalized = raw.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return clamp(roundToTwoDecimals(parsed), min, max);
}

function clamp(value: number, min: number, max?: number): number {
  return Math.min(Math.max(value, min), max ?? Number.POSITIVE_INFINITY);
}

export function AmountQuickAction({
  label,
  value,
  onValueChange,
  isEditing,
  onEditingChange,
  inputRef,
  step = 0.25,
  min = 0,
  max,
  tone = "blue",
  unitLabel = "m",
  actionLabel,
  onAction,
  isPending = false,
  pendingLabel = "Saving...",
  isActionDisabled = false,
  className,
  testId,
}: AmountQuickActionProps): React.JSX.Element {
  // Seeded on mount: entering edit mode re-mounts this bar inside the docked
  // card, so the draft always starts from the value shown at that moment.
  const [draft, setDraft] = useState(() =>
    value === null ? "" : String(value),
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /** Commits the typed draft and returns the value that was committed. */
  function commitDraft(): number | null {
    const committed = parseAmount(draftRef.current, min, max);
    onValueChange(committed);
    onEditingChange(false);
    return committed;
  }

  function stepBy(delta: number): void {
    const base = isEditing ? parseAmount(draft, min, max) : value;
    const next =
      base === null
        ? delta > 0
          ? clamp(roundToTwoDecimals(min + delta), min, max)
          : null
        : clamp(roundToTwoDecimals(base + delta), min, max);

    // Stepping while typing keeps the field open so both inputs stay usable.
    if (isEditing) {
      setDraft(next === null ? "" : String(next));
    }

    onValueChange(next);
  }

  const palette = TONES[tone];
  const stepperButtonClassName = cn(
    "flex size-10 shrink-0 items-center justify-center rounded-full border bg-card disabled:opacity-40",
    palette.stepper,
  );
  const stepperBase = isEditing ? parseAmount(draft, min, max) : value;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-sm",
        palette.container,
        className,
      )}
      data-testid={testId}
    >
      <button
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={stepperButtonClassName}
        disabled={isPending || stepperBase === null || stepperBase <= min}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepBy(-step)}
      >
        <Minus aria-hidden="true" className="size-4.5" />
      </button>

      <span className={cn("flex shrink-0 items-baseline gap-1", palette.value)}>
        {isEditing ? (
          <AmountInput
            ref={inputRef}
            inputClassName={palette.input}
            label={label}
            testId={testId}
            value={draft}
            onCommit={commitDraft}
            onDraftChange={setDraft}
          />
        ) : (
          <button
            aria-label={`Edit ${label.toLowerCase()}`}
            className="min-w-9 text-center text-base font-semibold"
            data-testid={testId ? `${testId}-value` : undefined}
            disabled={isPending}
            type="button"
            onClick={() => {
              setDraft(value === null ? "" : String(value));
              onEditingChange(true);
            }}
          >
            {value !== null ? value : "——"}
          </button>
        )}
        <span className="text-sm font-medium">{unitLabel}</span>
      </span>

      <button
        aria-label={`Increase ${label.toLowerCase()}`}
        className={stepperButtonClassName}
        disabled={
          isPending || (max !== undefined && (stepperBase ?? min) >= max)
        }
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => stepBy(step)}
      >
        <Plus aria-hidden="true" className="size-4.5" />
      </button>

      <button
        aria-label={actionLabel}
        className={cn(
          "ml-auto shrink-0 rounded-xl px-5 py-2.5 text-base font-semibold text-white disabled:opacity-50",
          palette.action,
        )}
        data-testid={testId ? `${testId}-submit` : undefined}
        disabled={
          isPending || (!isEditing && value === null) || isActionDisabled
        }
        type="button"
        // Keep the field focused through the press so the draft is committed
        // by this handler rather than lost to a blur.
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          onAction(isEditing ? commitDraft() : value);
        }}
      >
        {isPending ? pendingLabel : actionLabel}
      </button>
    </div>
  );
}

type AmountInputProps = {
  ref?: RefObject<HTMLInputElement | null>;
  inputClassName: string;
  label: string;
  testId?: string;
  value: string;
  onDraftChange: (next: string) => void;
  onCommit: () => void;
};

function AmountInput({
  ref,
  inputClassName,
  label,
  testId,
  value,
  onDraftChange,
  onCommit,
}: AmountInputProps): React.JSX.Element {
  const localRef = useRef<HTMLInputElement | null>(null);

  // Focus on mount so the tap that started editing raises the keyboard: mobile
  // browsers only honour a programmatic focus inside the gesture's own task,
  // and this runs in the click's synchronous commit.
  useLayoutEffect(() => {
    localRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <input
      ref={(node) => {
        localRef.current = node;
        if (ref) {
          ref.current = node;
        }
      }}
      aria-label={`${label} amount`}
      className={cn(
        "w-16 rounded-lg border bg-card px-2 py-1 text-center text-base font-semibold outline-none",
        inputClassName,
      )}
      data-testid={testId ? `${testId}-input` : undefined}
      enterKeyHint="done"
      inputMode="decimal"
      type="text"
      data-amount-quick-input="true"
      value={value}
      onBlur={() => {
        // While docked the card is rendered twice (placeholder + docked copy)
        // and focus hops between their two fields. Only focus leaving every
        // amount field counts as the end of editing.
        queueMicrotask(() => {
          const active = document.activeElement as HTMLElement | null;
          if (active?.dataset.amountQuickInput === "true") {
            return;
          }
          onCommit();
        });
      }}
      onChange={(event) => onDraftChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
        }
      }}
    />
  );
}
