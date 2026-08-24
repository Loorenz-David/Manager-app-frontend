import { PriceScenarioSchema, type PriceScenario } from "../types";

/**
 * The phase-1 plan's **Reference payload**, verbatim, and the one place any test
 * or mock in this package gets a scenario from (phase-2 plan Notes, projection
 * P5). The component fixtures are deliberately not reused: they hand-format an
 * absolute timestamp the controller renders as a relative one (review r2 N10),
 * so seeding from them would prove the components agree with themselves.
 *
 * Parsed through `PriceScenarioSchema` on the way out, so a payload that has
 * drifted from the DTO fails here rather than in whatever test consumed it.
 */
export const PRICE_SCENARIO_REFERENCE_JSON = {
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

export function referenceScenario(): PriceScenario {
  return PriceScenarioSchema.parse(
    structuredClone(PRICE_SCENARIO_REFERENCE_JSON),
  );
}
