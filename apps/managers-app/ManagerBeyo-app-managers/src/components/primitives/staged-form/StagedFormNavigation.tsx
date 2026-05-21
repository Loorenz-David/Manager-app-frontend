import { cn } from "@/lib/utils";

import { useStagedFormContext } from "./StagedFormContext";

type StagedFormNavigationProps = {
  advanceLabel?: string;
  submitLabel?: string;
  backLabel?: string;
  className?: string;
};

export function StagedFormNavigation({
  advanceLabel = "Next",
  submitLabel = "Submit",
  backLabel = "Back",
  className,
}: StagedFormNavigationProps): React.JSX.Element {
  const { isAdvancing, isFirstStep, isLastStep, onAdvance, onBack } =
    useStagedFormContext();
  const nextLabel = isLastStep ? submitLabel : advanceLabel;

  return (
    <div
      className={cn(
        "relative flex items-center justify-between border-t border-border/50 bg-background px-6 pt-3 pb-4",
        className,
      )}
      data-testid="staged-form-navigation"
    >
      <button
        className={cn(
          "rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition",
          isFirstStep && "pointer-events-none opacity-0",
        )}
        data-testid="staged-form-back-button"
        disabled={isFirstStep}
        type="button"
        onClick={onBack}
      >
        {backLabel}
      </button>

      <button
        className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="staged-form-advance-button"
        disabled={isAdvancing}
        type="button"
        onClick={onAdvance}
      >
        {isAdvancing ? "Checking…" : nextLabel}
      </button>
    </div>
  );
}
