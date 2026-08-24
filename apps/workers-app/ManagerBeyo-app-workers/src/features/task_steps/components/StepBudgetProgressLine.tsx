import { useEffect, useRef } from "react";
import { useTickingElapsed } from "@beyo/lib";
import type { TaskStepId } from "@beyo/lib";
import {
  budgetToneFor,
  STEP_BUDGET_TONE_FILL,
  type StepBudget,
} from "../domain/step-budget";

const TRACK_CLASS = "relative h-1.5 w-full overflow-hidden bg-muted";

/**
 * The fill is a full-width block scaled from its left edge rather than a
 * width, so the growth runs on the compositor and interpolates below a whole
 * pixel — a two-hour budget advances about a pixel a minute, which a width
 * animation would render as a stair.
 *
 * The inset highlight gives the bar a little depth at this thickness; it
 * survives the horizontal scale because it has no horizontal offset or blur.
 */
const FILL_CLASS =
  "absolute inset-y-0 left-0 w-full origin-left shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]";

const COLOR_TRANSITION = "background-color 600ms ease";

function fractionOf(workedSeconds: number, allowanceSeconds: number): number {
  if (allowanceSeconds <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, workedSeconds / allowanceSeconds));
}

type StaticBarProps = {
  stepId: TaskStepId;
  workedSeconds: number;
  allowanceSeconds: number;
};

/**
 * A step that is not running holds its served position. Deliberately without a
 * transition: a served value can go down as well as up, and a drop must land
 * in one step rather than easing (live-clock handoff §5).
 */
function StaticBar({
  stepId,
  workedSeconds,
  allowanceSeconds,
}: StaticBarProps): React.JSX.Element {
  const tone = budgetToneFor(workedSeconds, allowanceSeconds);

  return (
    <div
      className={TRACK_CLASS}
      data-testid={`step-budget-line-${stepId}`}
      data-tone={tone}
    >
      <div
        className={FILL_CLASS}
        style={{
          backgroundColor: STEP_BUDGET_TONE_FILL[tone],
          transform: `scaleX(${fractionOf(workedSeconds, allowanceSeconds)})`,
        }}
      />
    </div>
  );
}

type GrowingBarProps = {
  stepId: TaskStepId;
  budget: StepBudget;
  allowanceSeconds: number;
};

/**
 * A running step's bar. The geometry is written to the node directly, once per
 * served payload, as a single transition that runs all the way to a full bar
 * over exactly the time the step has left. The browser then advances it every
 * frame on its own — nothing per-second restarts it, which is what makes the
 * growth read as continuous rather than as a tick.
 *
 * Only the colour comes from React, so a re-render can change the tone without
 * touching the transform mid-flight.
 */
function GrowingBar({
  stepId,
  budget,
  allowanceSeconds,
}: GrowingBarProps): React.JSX.Element {
  const fillRef = useRef<HTMLDivElement>(null);
  const elapsedMs = useTickingElapsed(budget.receivedAtMs);
  const workedSeconds = budget.step.worked_seconds + Math.floor(elapsedMs / 1000);
  const tone = budgetToneFor(workedSeconds, allowanceSeconds);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    // Re-derived here rather than taken from the render above: this runs once
    // per payload, and the render's value ticks on.
    const elapsedSinceReceiptSeconds = Math.max(
      0,
      (Date.now() - budget.receivedAtMs) / 1000,
    );
    const servedWorkedSeconds =
      budget.step.worked_seconds + elapsedSinceReceiptSeconds;
    const secondsToFull = Math.max(
      0,
      (budget.step.left_seconds ?? allowanceSeconds - budget.step.worked_seconds) -
        elapsedSinceReceiptSeconds,
    );

    // Snap to where the server says the step actually is. A payload that
    // disowns time lands here as a drop, and it must not be eased (§5).
    fill.style.transition = "none";
    fill.style.transform = `scaleX(${fractionOf(servedWorkedSeconds, allowanceSeconds)})`;

    if (secondsToFull <= 0) {
      return;
    }

    // A frame later, so the snap is committed before the growth is attached.
    const frame = requestAnimationFrame(() => {
      fill.style.transition = `transform ${secondsToFull}s linear, ${COLOR_TRANSITION}`;
      fill.style.transform = "scaleX(1)";
    });

    return () => cancelAnimationFrame(frame);
  }, [allowanceSeconds, budget]);

  return (
    <div
      className={TRACK_CLASS}
      data-testid={`step-budget-line-${stepId}`}
      data-tone={tone}
    >
      <div
        ref={fillRef}
        className={FILL_CLASS}
        style={{ backgroundColor: STEP_BUDGET_TONE_FILL[tone] }}
      />
    </div>
  );
}

type StepBudgetProgressLineProps = {
  stepId: TaskStepId;
  budget: StepBudget | null;
  isWorking: boolean;
};

/**
 * The fill line between the card body and the action button. Rendered only
 * when the step has an allocated budget — `no_budget` and `excluded` rows have
 * nothing to fill against.
 */
export function StepBudgetProgressLine({
  stepId,
  budget,
  isWorking,
}: StepBudgetProgressLineProps): React.JSX.Element | null {
  const allowanceSeconds = budget?.step.allowance_seconds ?? null;
  if (budget === null || allowanceSeconds === null) {
    return null;
  }

  if (isWorking) {
    return (
      <GrowingBar
        allowanceSeconds={allowanceSeconds}
        budget={budget}
        stepId={stepId}
      />
    );
  }

  return (
    <StaticBar
      allowanceSeconds={allowanceSeconds}
      stepId={stepId}
      workedSeconds={budget.step.worked_seconds}
    />
  );
}
