import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@beyo/lib";

import { useStagedFormContext } from "./StagedFormContext";

type StagedFormNavigationProps = {
  advanceLabel?: string;
  submitLabel?: string;
  backLabel?: string;
  closeLabel?: string;
  onClose?: () => void;
  className?: string;
};

export function StagedFormNavigation({
  advanceLabel = "Next",
  submitLabel = "Submit",
  backLabel = "Back",
  closeLabel = "Close",
  onClose,
  className,
}: StagedFormNavigationProps): React.JSX.Element {
  const { isAdvancing, isFirstStep, isLastStep, onAdvance, onBack } =
    useStagedFormContext();
  const nextLabel = isLastStep ? submitLabel : advanceLabel;

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 gap-3 border-t border-border/50 bg-background px-6 pt-3 pb-4",
        className,
      )}
      data-testid="staged-form-navigation"
    >
      {isFirstStep && onClose ? (
        <button
          className="inline-flex w-full items-center justify-center gap-1 rounded-xl shadow-sm bg-card px-5 py-3.5 text-md font-semibold text-foreground transition"
          data-testid="staged-form-close-button"
          type="button"
          onClick={onClose}
        >
          {closeLabel}
        </button>
      ) : (
        <button
          className={cn(
            "inline-flex w-full items-center justify-center gap-1 rounded-xl shadow-sm bg-card px-5 py-3.5 text-md font-semibold text-foreground transition",
            isFirstStep && "pointer-events-none opacity-0",
          )}
          data-testid="staged-form-back-button"
          disabled={isFirstStep}
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
          {backLabel}
        </button>
      )}

      <button
        className="inline-flex w-full items-center justify-center gap-1 rounded-xl shadow-sm bg-primary px-6 py-3.5 text-md font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="staged-form-advance-button"
        disabled={isAdvancing}
        type="button"
        onClick={onAdvance}
      >
        {isAdvancing ? "Checking…" : nextLabel}
        {!isAdvancing ? (
          <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
        ) : null}
      </button>
    </div>
  );
}
