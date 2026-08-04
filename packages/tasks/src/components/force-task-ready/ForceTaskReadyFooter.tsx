import { ArrowLeft } from "lucide-react";

import { cn } from "@beyo/lib";

import { useForceTaskReadyContext } from "../../providers/ForceTaskReadyProvider";

type ForceTaskReadyFooterProps = {
  className?: string;
  isConfirmDisabled: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function ForceTaskReadyFooter({
  className,
  isConfirmDisabled,
  onBack,
  onConfirm,
}: ForceTaskReadyFooterProps): React.JSX.Element {
  const { isSubmitting } = useForceTaskReadyContext();

  return (
    <div
      className={cn("bg-background", className)}
      data-testid="force-task-ready-footer"
    >
      <div className="grid grid-cols-2 gap-3 pt-3">
        <button
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-semibold text-primary shadow-sm transition"
          data-testid="force-task-ready-back-button"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
          Back
        </button>

        <button
          className={cn(
            "rounded-2xl px-5 py-3.5 text-md font-semibold shadow-sm transition disabled:cursor-not-allowed",
            isConfirmDisabled
              ? "bg-muted text-muted-foreground opacity-50"
              : "bg-(--color-primary) text-card",
          )}
          data-testid="force-task-ready-confirm-button"
          disabled={isConfirmDisabled}
          type="button"
          onClick={onConfirm}
        >
          {isSubmitting ? "Forcing..." : "Force ready"}
        </button>
      </div>

      <div aria-hidden="true" className="h-(--safe-bottom,0px)" />
    </div>
  );
}
