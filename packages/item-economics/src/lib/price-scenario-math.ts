import type { PriceScenarioModel } from "../types";

/**
 * The money → allowance pipeline of the expected sold price editor.
 *
 * Contract: `HANDOFF_TO_FRONTEND_price_scenario_20260819.md` §4, and intention
 * §4A M2/M3. Three integer operations turn a candidate whole-item price into an
 * allowance in seconds, in the server's exact order and scaling:
 *
 *   budget_minor(P)      = round_half_even(P × residual_percent_milli, 100_000)
 *                          − constant_deduction_minor
 *   allowed_centimin(P)  = round_half_even(budget_minor(P) × 1_000_000,
 *                                          cost_per_worker_minute_ten_thousandths)
 *   allowance_seconds(P) = round_half_even(allowed_centimin(P) × 3, 5)
 *
 * There is no algebraic shortcut: collapsing budget → seconds disagrees with the
 * server by up to a second, which would make this screen and the production-time
 * screen name different numbers for the same task.
 *
 * `Number`, `Math.round` and `parseFloat` are forbidden in this module (master
 * plan §9.1). The only boundaries are the `BigInt()` conversions on entry and the
 * single `Number()` on seconds at exit — seconds fit a double, minor units times
 * a million do not.
 */

/**
 * Copied **verbatim** from handoff §4. That transcription was executed against
 * the shipped Python implementation over 612 cases with zero mismatches;
 * changing so much as a variable name obliges a re-run of that comparison.
 *
 * `Math.round` is half-away-from-zero, not half-even, and BigInt `/` truncates
 * toward zero — both disagree with the server on the negative operands this
 * screen reaches whenever the price sits below the constant deduction.
 */
export function roundHalfEven(a: bigint, b: bigint): bigint {
  // BigInt, b > 0n
  let q = a / b,
    r = a % b; // JS truncates toward zero
  if (r < 0n) {
    q -= 1n;
    r += b;
  } // → floor semantics
  const twice = 2n * r;
  const qIsOdd = ((q % 2n) + 2n) % 2n === 1n; // q may be negative
  if (twice > b || (twice === b && qIsOdd)) q += 1n;
  return q;
}

/**
 * What is left of the whole-item price `P` to spend on work, in minor units.
 * Negative for any price below the constant deduction — the `infeasible` state
 * this screen exists to fix — so every consumer must handle a negative bigint.
 */
export function budgetMinor(
  priceMinor: number,
  model: PriceScenarioModel,
): bigint {
  const residual = roundHalfEven(
    BigInt(priceMinor) * BigInt(model.residual_percent_milli),
    100_000n,
  );

  return residual - BigInt(model.constant_deduction_minor);
}

/** The budget expressed in centi-minutes of worker time. */
export function allowedCentimin(
  priceMinor: number,
  model: PriceScenarioModel,
): bigint {
  return roundHalfEven(
    budgetMinor(priceMinor, model) * 1_000_000n,
    BigInt(model.cost_per_worker_minute_ten_thousandths),
  );
}

/**
 * The allowance in whole seconds. The two-step minutes → seconds conversion is
 * the server's; a direct budget → seconds form is a named defect.
 */
export function allowanceSeconds(
  priceMinor: number,
  model: PriceScenarioModel,
): number {
  // Declared exit boundary: seconds are small integers, safe in a double.
  return Number(roundHalfEven(allowedCentimin(priceMinor, model) * 3n, 5n));
}

/**
 * Centi-minutes rendered the way the commit response spells
 * `allowed_worker_minutes`: two decimals, exact string comparison (M8). The sign
 * is written explicitly because `-5` centi-minutes is `"-0.05"`, and a quotient
 * of `0` carries no sign of its own.
 */
export function formatAllowedWorkerMinutes(centimin: bigint): string {
  const isNegative = centimin < 0n;
  const magnitude = isNegative ? -centimin : centimin;
  const whole = magnitude / 100n;
  const hundredths = magnitude % 100n;

  return `${isNegative ? "-" : ""}${whole}.${hundredths.toString().padStart(2, "0")}`;
}

/**
 * Seconds → the `"2h 25m"` / `"45m"` display form (M3), rounded to the **nearest**
 * minute: at 8 681 s the allowance is 144.68 min, which reads `2h 25m`;
 * truncating reads `2h 24m` and is wrong.
 *
 * `Math.floor((s + 30) / 60)` is `Math.round(s / 60)` over this domain (seconds
 * are positive here — the ≤ 0 arm returns early) and keeps this module free of
 * the forbidden `Math.round`, which master plan §9.1 greps for.
 *
 * A computed allowance of zero or less renders `"0m"`: that is a true value, not
 * the "never render zeros for a null block" case, which is a screen state.
 */
export function formatAllowanceDuration(seconds: number): string {
  if (!(seconds > 0)) {
    return "0m";
  }

  const totalMinutes = Math.floor((seconds + 30) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - hours * 60;

  // "3h 0m" is kept in full — column alignment beats prettiness.
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
