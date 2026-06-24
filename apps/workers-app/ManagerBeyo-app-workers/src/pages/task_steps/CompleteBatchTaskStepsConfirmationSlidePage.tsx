import { useState } from "react";
import { Check } from "lucide-react";
import { useSurfaceProps } from "@beyo/hooks";
import { cn } from "@beyo/lib";
import { TickingTimer } from "@beyo/ui";
import { formatSecondsHHMMSS } from "@/features/task_steps/domain/formatSecondsHHMMSS";
import { type CompleteBatchTaskStepsConfirmationSlideSurfaceProps } from "@/features/task_steps/surface-ids";

type TimeAccuracy = "accurate" | "inaccurate";

function StatBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-light-border bg-card p-4 shadow-sm">
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold">{children}</span>
    </div>
  );
}

export function CompleteBatchTaskStepsConfirmationSlidePage(): React.JSX.Element {
  const props = useSurfaceProps<CompleteBatchTaskStepsConfirmationSlideSurfaceProps>();
  const workingSteps = props.workingSteps ?? [];
  const onConfirm = props.onConfirm;
  const isPending = props.isPending ?? false;

  const [selection, setSelection] = useState<TimeAccuracy | null>(null);

  // Aggregate totals across all working steps
  const totalWorkingSeconds = workingSteps.reduce(
    (sum, s) => sum + s.totalWorkingSeconds,
    0,
  );
  const totalPauseSeconds = workingSteps.reduce(
    (sum, s) => sum + s.totalPauseSeconds,
    0,
  );

  // Most recently entered working record — used for live ticking timer
  const mostRecentEnteredAt = workingSteps.reduce<string | null>((latest, s) => {
    if (!s.lastStateRecordEnteredAt) return latest;
    if (!latest) return s.lastStateRecordEnteredAt;
    return s.lastStateRecordEnteredAt > latest ? s.lastStateRecordEnteredAt : latest;
  }, null);

  function handleConfirm() {
    if (!selection || !onConfirm) return;
    onConfirm(selection === "inaccurate");
    // Note: slide closing is handled by onConfirm's onSuccess callback in BatchDetailSlidePage.
    // Do NOT call close() here — that would close before the mutation resolves.
  }

  return (
    <div
      className="flex min-h-full flex-col bg-background pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-4"
      data-testid="complete-batch-confirmation-slide"
    >
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
        <p
          className="text-center text-sm text-muted-foreground"
          data-testid="complete-batch-step-count"
        >
          Completing {workingSteps.length} task
          {workingSteps.length !== 1 ? "s" : ""}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Time worked">
            {mostRecentEnteredAt ? (
              <TickingTimer
                className="font-mono text-2xl font-semibold"
                data-testid="batch-confirmation-working-timer"
                offsetSeconds={totalWorkingSeconds}
                startedAtIso={mostRecentEnteredAt}
              />
            ) : (
              formatSecondsHHMMSS(totalWorkingSeconds)
            )}
          </StatBox>

          <StatBox label="Total paused">
            <span data-testid="batch-confirmation-pause-time">
              {formatSecondsHHMMSS(totalPauseSeconds)}
            </span>
          </StatBox>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">
            Is the recorded time accurate?
          </p>

          {[
            {
              value: "accurate" as const,
              label: "Accurate time",
              description: "The recorded time reflects my actual work time.",
              testId: "batch-accuracy-option-accurate",
            },
            {
              value: "inaccurate" as const,
              label: "Inaccurate time",
              description: "The timer does not match my actual work time.",
              testId: "batch-accuracy-option-inaccurate",
            },
          ].map(({ value, label, description, testId }) => {
            const isSelected = selection === value;

            return (
              <button
                key={value}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                )}
                data-testid={testId}
                type="button"
                onClick={() => setSelection(value)}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40 bg-background",
                  )}
                >
                  {isSelected ? (
                    <Check
                      aria-hidden="true"
                      className="size-3 stroke-[3] text-white"
                    />
                  ) : null}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 px-4">
        <button
          className="w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-card transition-opacity disabled:opacity-40"
          data-testid="batch-complete-confirm-button"
          disabled={selection === null || isPending}
          type="button"
          onClick={handleConfirm}
        >
          {isPending ? "Completing…" : "Complete Tasks"}
        </button>
      </div>
    </div>
  );
}
