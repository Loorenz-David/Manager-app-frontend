import type { TaskStepId } from "@beyo/lib";
import {
  budgetToneFor,
  formatDurationHM,
  formatOverBudgetAmount,
  STEP_BUDGET_TONE_TEXT,
  workerFacingAllowanceForBudget,
  workerFacingTypicalSeconds,
  type StepBudget,
} from "./step-budget";

type StepBudgetSecondaryLabelProps = {
  stepId: TaskStepId;
  budget: StepBudget;
  workedSeconds: number;
  leftSeconds: number | null;
};

/**
 * The line under a step's timer: budget position when allocated ("44m left"
 * / "Over by 26m"), or the section's history when there is no budget
 * ("usually ~40m"). The two wordings must stay distinct — a limit and history are
 * different kinds of truth (budget-allocations handoff §4). Shared by every
 * card that renders a budget timer, so a future backend change to these
 * fields only needs to land here once.
 */
export function StepBudgetSecondaryLabel({
  stepId,
  budget,
  workedSeconds,
  leftSeconds,
}: StepBudgetSecondaryLabelProps): React.JSX.Element | null {
  const { allowance_seconds, share_state } = budget.step;
  const workerFacingAllowance = workerFacingAllowanceForBudget(budget);
  const typicalSeconds = workerFacingTypicalSeconds(budget);

  if (allowance_seconds !== null && leftSeconds !== null) {
    if (leftSeconds < 0) {
      return (
        <span
          className="font-mono text-xs font-medium text-[#b9382a]"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          Over by {formatOverBudgetAmount(-leftSeconds)}
        </span>
      );
    }

    const tone = budgetToneFor(workedSeconds, allowance_seconds);
    const targetIsExhausted = workerFacingAllowance === 0;
    // TBD (David, 2026-08-26): when the overall/section budget is already
    // overflown, pressure_share_seconds is served as 0 and the worker-facing
    // target collapses to "0m assigned". David is still deciding with the
    // customer what this state should actually display. Interim decision:
    // mute it — suppress the line entirely rather than show an unresolved
    // "0m". Any agent touching this file should flag this open decision to
    // David before finalizing related work.
    if (targetIsExhausted) {
      return null;
    }
    // Pressure is deliberately the only assignment a worker sees once it is
    // constraining their step. Showing the original number beside it would
    // undermine the operational signal to work to the tightened target.
    const targetLabel =
      workerFacingAllowance === allowance_seconds
        ? `${formatDurationHM(leftSeconds)} left`
        : `${formatDurationHM(workerFacingAllowance ?? 0)} assigned`;
    return (
      <span
        className={`font-mono text-xs font-medium ${STEP_BUDGET_TONE_TEXT[tone]}`}
        data-testid={`step-budget-secondary-${stepId}`}
      >
        {targetLabel}
      </span>
    );
  }

  // A served zero is meaningful: it says this open step has no distributable
  // time left. It remains distinct from null, which means not applicable.
  if (workerFacingAllowance !== null) {
    return (
      <span
        className={`font-mono text-xs font-medium ${workerFacingAllowance === 0 ? "text-[#b9382a]" : "text-muted-foreground"}`}
        data-testid={`step-budget-secondary-${stepId}`}
      >
        {formatDurationHM(workerFacingAllowance)} current target
      </span>
    );
  }

  if (share_state === "no_budget" && typicalSeconds !== null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        data-testid={`step-budget-secondary-${stepId}`}
      >
        usually ~{formatDurationHM(typicalSeconds)}
      </span>
    );
  }

  return null;
}
