import { describe, expect, it } from "vitest";

import { PriceScenarioSchema, type PriceScenario } from "../types";
import { resolveScreenState } from "./item-valuation-screen-state";

/**
 * The plan's reference payload (Notes §Reference payload), parsed through the
 * production schema so every state below is resolved from the object type the
 * screen holds. Its `saved.purchase_cost_minor` is null with `status: "ok"` —
 * the shape the round-5 S4 rule deliberately renders as the editor.
 */
const REFERENCE_PAYLOAD = {
  task_id: "tsk_ref0001",
  status: "ok",
  item_binding: "bound",
  can_commit: true,
  currency: "swedish_krona",
  calculation_version: 2,
  config_fingerprint: "cmv_7a1:pcbv_3f9:v1",
  item: {
    client_id: "itm_ref0001",
    article_number: "0000608",
    label: "Dining chairs",
    quantity: 6,
  },
  saved: {
    valuation_id: "ival_ref0001",
    expected_sale_price_minor: 855000,
    purchase_cost_minor: null,
    created_at: "2026-08-14T10:24:00+00:00",
    created_by: {
      client_id: "usr_ref0001",
      username: "Marta Lind",
      profile_picture: null,
    },
  },
  model: {
    cost_model_version_id: "cmv_7a1",
    basis_version_id: "pcbv_3f9",
    residual_percent_milli: 22000,
    constant_deduction_minor: 0,
    cost_per_worker_minute_ten_thousandths: 13000000,
    budget_cap_percent_milli: 25000,
    is_purely_proportional: true,
  },
  typical: {
    total_seconds: 12300,
    is_estimated: false,
    sections_without_sample: 0,
    sections_total: 4,
    method: "median_completed_section_totals",
    window_days: 90,
    min_sample_size: 5,
  },
  anchors: {
    is_fundable: true,
    break_even_price_minor: 1211335,
    suggested_price_minor: 1215000,
    infeasible_at_or_below_minor: 29,
  },
  domain: {
    rule: "break_even_band_v1",
    min_minor: 420000,
    max_minor: 1650000,
    step_minor: 15000,
  },
} as const;

function scenario(overrides: Record<string, unknown> = {}): PriceScenario {
  return PriceScenarioSchema.parse({ ...REFERENCE_PAYLOAD, ...overrides });
}

/** The blocks the handoff §5.5 empties on any non-`bound` binding. */
const UNBOUND_BLOCKS = {
  saved: null,
  currency: null,
  model: null,
  anchors: null,
  domain: null,
  config_fingerprint: null,
} as const;

describe("resolveScreenState — S1…S6 in precedence order", () => {
  it("criterion 32: separates loading from error when there is no payload at all", () => {
    expect(resolveScreenState(null, "pending")).toBe("loading");
    expect(resolveScreenState(null, "error")).toBe("error");
  });

  it("criterion 32a: a failed refetch over a cached payload resolves from the data", () => {
    const cached = scenario({
      ...UNBOUND_BLOCKS,
      item_binding: "mismatched",
      can_commit: false,
    });

    expect(resolveScreenState(cached, "error")).toBe("unbound");
  });

  it("criterion 33: a mismatched binding beats the purchase-required rule", () => {
    // Both predicates hold — binding is mismatched AND saved is null.
    const mismatched = scenario({
      ...UNBOUND_BLOCKS,
      item_binding: "mismatched",
      status: "ok",
      can_commit: true,
    });

    expect(mismatched.saved).toBeNull();
    expect(resolveScreenState(mismatched, "success")).toBe("unbound");
  });

  it("criterion 34: no valuation row beats a missing model", () => {
    const unpriced = scenario({
      saved: null,
      currency: null,
      status: "item_unvalued",
      model: null,
      anchors: null,
      domain: null,
      config_fingerprint: null,
    });

    expect(resolveScreenState(unpriced, "success")).toBe("purchase_required");
  });

  it("criterion 34a: the server's own purchase-cost refusal beats a missing model", () => {
    const refused = scenario({
      status: "item_missing_purchase_cost",
      model: null,
      anchors: null,
      domain: null,
      config_fingerprint: null,
    });

    expect(refused.saved).not.toBeNull();
    expect(resolveScreenState(refused, "success")).toBe("purchase_required");
  });

  it("criterion 34b: a saved row with no purchase cost is the editor, not purchase-required", () => {
    const cardOne = scenario();

    expect(cardOne.saved?.purchase_cost_minor).toBeNull();
    expect(resolveScreenState(cardOne, "success")).toBe("editor");
  });

  it("criterion 35: a null model blocks the editor even under a null status", () => {
    const configFailure = scenario({
      status: null,
      saved: {
        ...REFERENCE_PAYLOAD.saved,
        purchase_cost_minor: 285000,
      },
      model: null,
      anchors: null,
      domain: null,
      config_fingerprint: null,
    });

    expect(resolveScreenState(configFailure, "success")).toBe("blocked");
  });

  it("criterion 36: the reference payload resolves to the editor", () => {
    expect(resolveScreenState(scenario(), "success")).toBe("editor");
  });

  it("criterion 37: a detached binding is unbound without reading `item`", () => {
    const detached = scenario({
      ...UNBOUND_BLOCKS,
      item_binding: "detached",
      item: null,
      can_commit: false,
    });

    expect(resolveScreenState(detached, "success")).toBe("unbound");
  });
});
