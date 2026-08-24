import type { TaskStepId } from "@beyo/lib";
import {
  budgetToneFor,
  formatDurationHM,
  STEP_BUDGET_TONE_TEXT,
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
 * / "of 2h 00m"), or the section's history when there is no budget ("usually
 * ~40m"). The two wordings must stay distinct — a limit and history are
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
  const { allowance_seconds, share_state, typical_worker_seconds } =
    budget.step;

  if (allowance_seconds !== null && leftSeconds !== null) {
    if (leftSeconds < 0) {
      return (
        <span
          className="font-mono text-xs font-medium text-[#b9382a]"
          data-testid={`step-budget-secondary-${stepId}`}
        >
          of {formatDurationHM(allowance_seconds)}
        </span>
      );
    }

    const tone = budgetToneFor(workedSeconds, allowance_seconds);
    return (
      <span
        className={`font-mono text-xs font-medium ${STEP_BUDGET_TONE_TEXT[tone]}`}
        data-testid={`step-budget-secondary-${stepId}`}
      >
        {formatDurationHM(leftSeconds)} left
      </span>
    );
  }

  if (share_state === "no_budget" && typical_worker_seconds !== null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        data-testid={`step-budget-secondary-${stepId}`}
      >
        usually ~{formatDurationHM(typical_worker_seconds)}
      </span>
    );
  }

  return null;
}
