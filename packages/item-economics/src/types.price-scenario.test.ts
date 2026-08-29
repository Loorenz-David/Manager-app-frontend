import { describe, expect, it } from "vitest";

import { PriceScenarioSchema } from "./types";

/**
 * The plan's reference payload (Notes §Reference payload), which is handoff §2
 * with concrete ids. Every DTO criterion below is a mutation of this one object.
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
    // Quantity-projected since 2026-08-29; this reference item is quantity 6,
    // so the whole-order total is six times the per-unit one.
    total_seconds: 12300,
    total_unit_seconds: 2050,
    quantity_applied: 6,
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
};

function payload(overrides: Record<string, unknown> = {}): Record<
  string,
  unknown
> {
  return { ...REFERENCE_PAYLOAD, ...overrides };
}

describe("PriceScenarioSchema (M13)", () => {
  it("criterion 45: parses the reference payload", () => {
    const parsed = PriceScenarioSchema.parse(REFERENCE_PAYLOAD);

    expect(parsed.saved?.expected_sale_price_minor).toBe(855000);
    expect(parsed.model?.residual_percent_milli).toBe(22000);
    expect(parsed.currency).toBe("swedish_krona");
  });

  it("criterion 46a: parses the handoff §5.5 `detached` column", () => {
    const parsed = PriceScenarioSchema.parse(
      payload({
        item_binding: "detached",
        can_commit: false,
        item: null,
        saved: null,
        currency: null,
        model: null,
        anchors: null,
        domain: null,
        config_fingerprint: null,
      }),
    );

    expect(parsed.item).toBeNull();
    expect(parsed.typical.total_seconds).toBe(12300);
  });

  it("criterion 46b: parses the handoff §5.5 `mismatched` column", () => {
    const parsed = PriceScenarioSchema.parse(
      payload({
        item_binding: "mismatched",
        status: "ok",
        can_commit: true,
        saved: null,
        currency: null,
        model: null,
        anchors: null,
        domain: null,
        config_fingerprint: null,
      }),
    );

    expect(parsed.item_binding).toBe("mismatched");
    expect(parsed.item).not.toBeNull();
  });

  it("criterion 47: parses an unpriced item — no saved row, full model", () => {
    const parsed = PriceScenarioSchema.parse(
      payload({ saved: null, currency: null, status: "item_unvalued" }),
    );

    expect(parsed.saved).toBeNull();
    expect(parsed.model?.cost_per_worker_minute_ten_thousandths).toBe(13000000);
  });

  it("criterion 48: rejects a payload computed by another calculation version", () => {
    expect(() =>
      PriceScenarioSchema.parse(payload({ calculation_version: 1 })),
    ).toThrow();
  });

  it("criterion 49: rejects a nullable key that is missing rather than null", () => {
    const { currency: _currency, ...withoutCurrency } = REFERENCE_PAYLOAD;

    expect(() => PriceScenarioSchema.parse(withoutCurrency)).toThrow();
  });

  it("reads the whole-order total and its per-unit companion", () => {
    // `total_seconds` changed meaning rather than moving: break-even, the
    // suggestion and the slider domain are now all whole-order figures, which
    // is what the allowance beside them has always been.
    const parsed = PriceScenarioSchema.parse(REFERENCE_PAYLOAD);

    expect(parsed.typical.total_seconds).toBe(12300);
    expect(parsed.typical.total_unit_seconds).toBe(2050);
    expect(parsed.typical.quantity_applied).toBe(6);
  });

  it("defaults a missing quantity_applied to one unit, never zero", () => {
    const {
      total_unit_seconds: _unit,
      quantity_applied: _quantity,
      ...typicalWithoutProjection
    } = REFERENCE_PAYLOAD.typical;
    const parsed = PriceScenarioSchema.parse(
      payload({ typical: typicalWithoutProjection }),
    );

    // The screen keeps its figures against a backend mid-deploy: total_seconds
    // is still served, and it simply means what it used to.
    expect(parsed.typical.total_seconds).toBe(12300);
    expect(parsed.typical.quantity_applied).toBe(1);
  });

  it("criterion 50: rejects a scaled integer sent as a decimal string", () => {
    expect(() =>
      PriceScenarioSchema.parse(
        payload({
          model: { ...REFERENCE_PAYLOAD.model, residual_percent_milli: "22000" },
        }),
      ),
    ).toThrow();
  });
});
