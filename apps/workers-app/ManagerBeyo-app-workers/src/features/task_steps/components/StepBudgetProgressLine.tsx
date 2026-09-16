import { useEffect, useMemo, useRef } from "react";
import { useTickingElapsed } from "@beyo/lib";
import type { TaskStepId } from "@beyo/lib";
import {
  budgetToneFor,
  projectStepBudget,
  restingStepBudget,
  STEP_BUDGET_TONE_FILL,
  type StepBudget,
  type StepClockContext,
  workerFacingAllowanceForBudget,
} from "../domain/step-budget";
import type { StepState } from "../types";

// Thick enough to read as an energy/health bar rather than a hairline
// separator between the card body and the action button.
const TRACK_CLASS = "relative h-3 w-full overflow-hidden bg-muted";

/**
 * The fill is a full-width block scaled from its left edge rather than a
 * width, so the growth runs on the compositor and interpolates below a whole
 * pixel — a two-hour budget advances about a pixel a minute, which a width
 * animation would render as a stair.
 *
 * The inset highlights bevel the bar for depth at this thickness; they
 * survive the horizontal scale because they have no horizontal offset or blur.
 */
const FILL_CLASS =
  "absolute inset-y-0 left-0 w-full origin-left overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.18)]";

const COLOR_TRANSITION = "background-color 600ms ease";

// A freshly-started step reads as an empty bar without this — a small floor
// makes "just started" visibly distinct from "no budget data yet" at a glance.
const MIN_FILL_FRACTION = 0.1;

function fractionOf(workedSeconds: number, allowanceSeconds: number): number {
  if (allowanceSeconds <= 0) {
    return 1;
  }

  return Math.min(
    1,
    Math.max(MIN_FILL_FRACTION, workedSeconds / allowanceSeconds),
  );
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
  clock: StepClockContext;
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
  clock,
  allowanceSeconds,
}: GrowingBarProps): React.JSX.Element {
  const fillRef = useRef<HTMLDivElement>(null);
  const elapsedMs = useTickingElapsed(budget.receivedAtMs);
  // Held by identity so the geometry effect below re-runs on a real anchor
  // change (the server-confirmed record replacing the optimistic one) and not
  // on every render, which would restart the transition mid-flight.
  const { stepState, stateEnteredAtIso } = clock;
  const clockContext = useMemo(
    () => ({ stepState, stateEnteredAtIso }),
    [stepState, stateEnteredAtIso],
  );
  const { workedSeconds } = projectStepBudget(
    budget,
    clockContext,
    budget.receivedAtMs + elapsedMs,
  );
  const tone = budgetToneFor(workedSeconds, allowanceSeconds);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;

    // Re-derived here rather than taken from the render above: this runs once
    // per payload, and the render's value ticks on.
    const projected = projectStepBudget(budget, clockContext, Date.now());
    const servedWorkedSeconds = projected.workedSeconds;
    const secondsToFull = Math.max(
      0,
      projected.leftSeconds ?? allowanceSeconds - servedWorkedSeconds,
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
  }, [allowanceSeconds, budget, clockContext]);

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
      >
        {/* Diagonal stripes cycling across the fill so a slow-growing bar
            reads as a turning barber-pole cylinder rather than stalled — a
            separate overlay, not a class on the fill itself, so it never
            touches the fill's own position/background. */}
        <div
          aria-hidden="true"
          className="step-budget-bar-barberpole absolute inset-0"
        />
      </div>
    </div>
  );
}

type StepBudgetProgressLineProps = {
  stepId: TaskStepId;
  budget: StepBudget | null;
  state: StepState;
  /** `last_state_record.entered_at` — the anchor of the client's own clock. */
  stateEnteredAtIso: string | null;
};

/**
 * The fill line between the card body and the action button. Rendered only
 * once a step has actually started — a pending step hasn't consumed any of
 * its budget yet, so an empty line is the correct read, not the 10% starting
 * floor `fractionOf` gives every started step. Also gated on the step having
 * an allocated budget — `no_budget` and `excluded` rows have nothing to fill
 * against. Owned here rather than left to each caller, so every card that
 * mounts this component gets the pending exclusion for free.
 */
export function StepBudgetProgressLine({
  stepId,
  budget,
  state,
  stateEnteredAtIso,
}: StepBudgetProgressLineProps): React.JSX.Element | null {
  const allowanceSeconds = budget
    ? workerFacingAllowanceForBudget(budget)
    : null;
  if (state === "pending" || budget === null || allowanceSeconds === null) {
    return null;
  }

  const clock: StepClockContext = { stepState: state, stateEnteredAtIso };

  if (state === "working") {
    return (
      <GrowingBar
        allowanceSeconds={allowanceSeconds}
        budget={budget}
        clock={clock}
        stepId={stepId}
      />
    );
  }

  return (
    <StaticBar
      allowanceSeconds={allowanceSeconds}
      stepId={stepId}
      workedSeconds={restingStepBudget(budget, clock).workedSeconds}
    />
  );
}
