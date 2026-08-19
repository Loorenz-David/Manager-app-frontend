import type { PriceScenario } from "../types";

/**
 * The six mutually exclusive states of the expected sold price screen, resolved
 * in one place (intention §3.2, as amended round 5).
 *
 * The precedence encodes the handoff's rule — binding before status, `model`
 * null before both (§5.2, §5.5) — plus the owner's purchase-first rule, which
 * applies exactly where the **server itself** refuses to save without a purchase
 * price, never wider. An item whose cost model never reads the purchase cost
 * renders the editor with `saved.purchase_cost_minor: null`.
 */
export type ItemValuationScreenState =
  | "loading"
  | "error"
  | "unbound"
  | "purchase_required"
  | "blocked"
  | "editor";

/**
 * The query's status, package-local on purpose: phase 1 is I/O-free and takes no
 * react-query type. The three members match what the phase-2 query reports.
 */
export type ScenarioQueryStatus = "pending" | "error" | "success";

export function resolveScreenState(
  scenario: PriceScenario | null,
  status: ScenarioQueryStatus,
): ItemValuationScreenState {
  // S1 / S2 — with no payload at all there is nothing to resolve from. A
  // background refetch failure **over** a cached scenario keeps the state that
  // payload resolves to; committing on stale data is prevented by M10's
  // fresh-fetch gate, not by blanking the screen.
  if (scenario === null) {
    return status === "error" ? "error" : "loading";
  }

  // S3 — the task lost or swapped its primary item. Checked before status,
  // because `mismatched` reports `ok` with every block null.
  if (scenario.item_binding !== "bound") {
    return "unbound";
  }

  // S4 — the server refuses to save: no valuation row exists at all, or the
  // cost model demands a purchase cost this item lacks.
  if (
    scenario.saved === null ||
    scenario.status === "item_missing_purchase_cost"
  ) {
    return "purchase_required";
  }

  // S5 — `model` is the block switch, never `status`.
  if (scenario.model === null) {
    return "blocked";
  }

  return "editor";
}
