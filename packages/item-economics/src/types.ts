import { z } from "zod";

/**
 * Item economics domain primitives shared by the configuration half
 * (cost groups, basis versions, cost model versions) and the operational
 * half (valuations, evaluations, projections, budget status).
 *
 * Source of truth:
 *   docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_configuration_20260815.md
 *   docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md
 */

export const ITEM_ECONOMICS_BASE_PATH = "/api/v1/item-economics";

/** Every readiness fact in this domain is per major category. */
/**
 * Re-exported from `@beyo/lib`, which owns the canonical definition — four
 * packages need to agree on this domain and none may depend on the others.
 * Kept exported here so existing consumers of `@beyo/item-economics` do not
 * have to move.
 */
export {
  MajorCategorySchema,
  MAJOR_CATEGORIES,
  isMajorCategory,
} from "@beyo/lib";
export type { MajorCategory } from "@beyo/lib";

/**
 * The twelve-value status vocabulary, used identically by the valuation
 * preview, the budget status and the configuration status.
 *
 * It is a branch, not a flat list:
 *   - branch A (a committed evaluation exists): `ok` | `infeasible`
 *   - branch B (no committed evaluation): the first matching reason wins,
 *     in the precedence order listed below.
 */
export const ItemEconomicsStatusSchema = z.enum([
  // Branch A — a committed evaluation exists.
  "ok",
  "infeasible",
  // Branch B — no committed evaluation, in precedence order.
  "item_missing_major_category",
  "not_configured_no_cost_group",
  "not_configured_ambiguous_cost_group",
  "not_configured_no_basis_version",
  "not_configured_no_cost_model_version",
  "item_unvalued",
  "item_missing_expected_price",
  "item_missing_purchase_cost",
  "currency_mismatch",
  "not_evaluated",
]);
export type ItemEconomicsStatus = z.infer<typeof ItemEconomicsStatusSchema>;

/** Statuses that are resolved in the workspace settings screens. */
export const CONFIGURATION_STATUSES = [
  "not_configured_no_cost_group",
  "not_configured_ambiguous_cost_group",
  "not_configured_no_basis_version",
  "not_configured_no_cost_model_version",
] as const satisfies readonly ItemEconomicsStatus[];

/** Statuses that are resolved on the item itself. */
export const ITEM_DATA_STATUSES = [
  "item_missing_major_category",
  "item_unvalued",
  "item_missing_expected_price",
  "item_missing_purchase_cost",
  "currency_mismatch",
] as const satisfies readonly ItemEconomicsStatus[];

export function isConfigurationStatus(status: ItemEconomicsStatus): boolean {
  return (CONFIGURATION_STATUSES as readonly string[]).includes(status);
}

export function isItemDataStatus(status: ItemEconomicsStatus): boolean {
  return (ITEM_DATA_STATUSES as readonly string[]).includes(status);
}

/**
 * `not_evaluated` is the happy pre-commit state — everything is ready and
 * nobody has committed yet. It is a call to action, never an error.
 */
export function isReadyToCommit(status: ItemEconomicsStatus): boolean {
  return status === "not_evaluated";
}

/**
 * Decimals arrive from the backend as strings ("160.00", "20.000") and must
 * be parsed as decimals, never as floats. Money is integer minor units.
 */
export const DecimalStringSchema = z.string();
export type DecimalStringValue = z.infer<typeof DecimalStringSchema>;

/** Offset pagination sibling object carried by every list response. */
export const ItemEconomicsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});
export type ItemEconomicsPagination = z.infer<
  typeof ItemEconomicsPaginationSchema
>;

export type ItemEconomicsListParams = {
  limit?: number;
  offset?: number;
};

// --- Production time -------------------------------------------------------

export const ProductionTimeShareStateSchema = z.enum([
  "on_track",
  "over_share",
  "excluded",
  "no_budget",
]);
export type ProductionTimeShareStateDto = z.infer<
  typeof ProductionTimeShareStateSchema
>;

// --- Item-aware typicals ----------------------------------------------------
// The `narrow_typical_work_times` release (handoff 2026-08-24) weights a task's
// sections by same-item-category history where enough of it exists, and
// publishes the provenance of every typical it serves. The same vocabulary
// appears on production-time, budget-allocations and price-scenario.
//
// Every field below carries its documented default through `.catch()` rather
// than being required outright. Two reasons, and neither is licence to invent
// data: a backend mid-deploy would otherwise fail the whole row and blank the
// surface, and an unfamiliar future basis value should make the client *less*
// confident, not throw. All of it is provenance we display; nothing branches on
// it in a direction a conservative default gets wrong.

/** The population behind a `typical_worker_seconds` (handoff §2). */
export const TypicalBasisSchema = z
  .enum(["item_narrowed", "section_wide", "insufficient_sample"])
  .catch("insufficient_sample");
export type TypicalBasis = z.infer<typeof TypicalBasisSchema>;

/**
 * The filter actually derived for the task — the one new field that is
 * genuinely nullable, being null when the primary item has no category or
 * there is no primary item. Inactive axes are omitted from the object, so a
 * future axis arrives additively.
 */
export const AppliedTypicalFilterSchema = z
  .object({ item_category_ids: z.array(z.string()).optional() })
  .nullable()
  .catch(null);
export type AppliedTypicalFilter = z.infer<typeof AppliedTypicalFilterSchema>;

const SectionsByBasisSchema = z
  .object({
    item_narrowed: z.number().int().catch(0),
    section_wide: z.number().int().catch(0),
    insufficient_sample: z.number().int().catch(0),
  })
  .catch({ item_narrowed: 0, section_wide: 0, insufficient_sample: 0 });

/** The serializer's documented fallback shape (handoff §2). */
export const DEFAULT_TYPICAL_RESOLUTION = {
  task_typical_basis: "section_wide_uniform",
  reconciliation_method: "uniform_basis_v1",
  comparability_profile: "primary_item_category_v1",
  applied_filter: null,
  participating_section_count: 0,
  sections_by_basis: {
    item_narrowed: 0,
    section_wide: 0,
    insufficient_sample: 0,
  },
} as const;

/**
 * One per task, identical on all three surfaces — the reconciliation
 * provenance. `task_typical_basis` is `"item_narrowed_uniform"` or
 * `"section_wide_uniform"` today; kept as a string because we only display it
 * and a third value must not cost the task its figures.
 */
export const TypicalResolutionSchema = z
  .object({
    task_typical_basis: z.string().catch("section_wide_uniform"),
    reconciliation_method: z.string().catch("uniform_basis_v1"),
    comparability_profile: z.string().catch("primary_item_category_v1"),
    applied_filter: AppliedTypicalFilterSchema,
    participating_section_count: z.number().int().catch(0),
    sections_by_basis: SectionsByBasisSchema,
  })
  .catch({ ...DEFAULT_TYPICAL_RESOLUTION });
export type TypicalResolution = z.infer<typeof TypicalResolutionSchema>;

export const ProductionTimeTypicalSchema = z.object({
  /**
   * A served `0` beside `section_wide` is a statistic, not missing data, and
   * is rendered as such (handoff §4). The unreachable form is `item_narrowed`
   * beside `0` — task economics requires a usable narrowed median above zero.
   */
  typical_worker_seconds: z.number().int().nullable(),
  /**
   * The same population's median at quantity 1, and the only field of the pair
   * that may be fractional. We never multiply it ourselves — see
   * `projected_typical_worker_seconds` (handoff §"Frontend action required" 2).
   */
  typical_unit_worker_seconds: DecimalStringSchema.nullable().catch(null),
  /**
   * `typical_unit_worker_seconds x projection_quantity`, half-even rounded
   * server-side: the quantity-aware expectation for *this* task, and what every
   * "how long should this take" surface displays. Null exactly when
   * `typical_worker_seconds` is null — same basis, same sample gates — so it
   * introduces no empty state of its own. `.catch(null)` only covers a backend
   * mid-deploy, where the reader falls back to the raw median.
   */
  projected_typical_worker_seconds: z.number().int().nullable().catch(null),
  /** Counts the population named by `typical_basis`, not the narrowed one. */
  sample_count: z.number().int(),
  typical_basis: TypicalBasisSchema,
  /** Raw same-item-category evidence, independent of which basis won. */
  narrowed_sample_count: z.number().int().catch(0),
  /** Raw section-wide evidence, independent of which basis won. */
  section_sample_count: z.number().int().catch(0),
  method: z.string(),
  window_days: z.number().int(),
  min_sample_size: z.number().int(),
});
export type ProductionTimeTypical = z.infer<
  typeof ProductionTimeTypicalSchema
>;

export const ProductionTimeSectionSchema = z.object({
  working_section_id: z.string(),
  section_name: z.string().nullable(),
  section_name_snapshot: z.string().nullable(),
  order_list: z.number().int().nullable(),
  state: z.enum([
    "pending",
    "working",
    "paused",
    "ended_shift",
    "blocked",
    "completed",
    "skipped",
    "failed",
    "cancelled",
  ]),
  state_entered_at: z.string().datetime({ offset: true }).nullable(),
  worked_seconds: z.number().int(),
  step_count: z.number().int(),
  allowance_seconds: z.number().int().nullable(),
  /** Live share of the remaining distributable task budget for open steps. */
  pressure_share_seconds: z.number().int().nullable(),
  left_seconds: z.number().int().nullable(),
  share_state: ProductionTimeShareStateSchema,
  typical: ProductionTimeTypicalSchema.nullable(),
});
export type ProductionTimeSectionDto = z.infer<
  typeof ProductionTimeSectionSchema
>;

// The money half of the block is ADMIN/MANAGER only — a worker or seller body
// omits all three keys entirely, so each is `.optional()` on top of `.nullable()`
// (handoff HANDOFF_TO_FRONTEND_production_time_budget_money_20260826 §1). The
// nullable half covers a degraded task, where the keys are present but empty.
// Integer minor units (öre); the response carries no currency field.
export const ProductionTimeBudgetSchema = z.object({
  allowed_worker_minutes: DecimalStringSchema.nullable(),
  actual_worker_seconds: z.number().int().nullable(),
  actual_worker_minutes: DecimalStringSchema.nullable(),
  remaining_worker_minutes: DecimalStringSchema.nullable(),
  percent_consumed: DecimalStringSchema.nullable(),
  /**
   * The labour money pot: sale price minus the item's cost-model terms, capped
   * at 25% of the price. **Negative is the `infeasible` case** — costs already
   * exceed the price before any labour — and must never be clamped.
   */
  production_budget_minor: z.number().int().nullable().optional(),
  /** What the worked time has cost so far, at the evaluation's snapshotted rate. */
  consumed_cost_minor: z.number().int().nullable().optional(),
  /** `production_budget_minor − consumed_cost_minor`. Negative *is* the overflow signal. */
  variance_cost_minor: z.number().int().nullable().optional(),
});
export type ProductionTimeBudget = z.infer<
  typeof ProductionTimeBudgetSchema
>;

export const ProductionTimeFinalSchema = z.object({
  actual_worker_minutes: DecimalStringSchema,
  variance_worker_minutes: DecimalStringSchema,
  percent_consumed: DecimalStringSchema.nullable(),
  task_state_snapshot: z.string(),
  computed_at: z.string().datetime({ offset: true }),
});
export type ProductionTimeFinal = z.infer<typeof ProductionTimeFinalSchema>;

export const TaskProductionTimeSchema = z.object({
  task_id: z.string(),
  status: ItemEconomicsStatusSchema,
  item_binding: z.enum(["bound", "detached", "mismatched"]),
  /**
   * `static_proportional_section_v2` since 2026-08-24. Read as data and pinned
   * nowhere: the split stayed static, only the weights became item-aware, so an
   * unchanged number does not mean the old contract still applies.
   */
  allocation_method: z.string(),
  /** Exact, intentionally unclamped ratio behind the live pressure shares. */
  pressure_ratio: DecimalStringSchema.nullable(),
  pressure_method: z.string(),
  budget: ProductionTimeBudgetSchema,
  final: ProductionTimeFinalSchema.nullable(),
  typical_resolution: TypicalResolutionSchema,
  /**
   * The PRIMARY item's quantity, clamped to at least 1, applied to every
   * projection in this response (handoff 2026-08-29). A detached task or a
   * legacy `quantity <= 0` answers 1, which is also the `.catch()` default: a
   * missing field must degrade to "one unit", never to "no units".
   */
  projection_quantity: z.number().int().catch(1),
  sections: z.array(ProductionTimeSectionSchema),
});
export type TaskProductionTime = z.infer<typeof TaskProductionTimeSchema>;

// --- Budget allocations (worker step cards) ---------------------------------
// One batched call per feed page; the cards' single economics source
// (HANDOFF_TO_FRONTEND_worker_step_card_budget_allocations_20260822).
// Unknown keys are stripped by default, which is the required tolerance for
// the additive item-aware-typicals fields (§6 of the handoff).

export const BudgetAllocationStepSchema = z.object({
  step_id: z.string(),
  working_section_id: z.string(),
  // Nullable to match ProductionTimeSectionSchema, which describes the same
  // backend column: the handoff's example shows a string, but a section whose
  // snapshot was never written answers null, and a stricter schema here would
  // fail the whole batch over a field the cards do not even read.
  section_name_snapshot: z.string().nullable(),
  /** Item-aware since 2026-08-24 — same field, same nullability, better number. */
  typical_worker_seconds: z.number().int().nullable(),
  /** Per-unit median for the step's section, on the task's selected basis. */
  typical_unit_worker_seconds: DecimalStringSchema.nullable().catch(null),
  /**
   * The server-computed projection for that section under this task's quantity
   * — what a step card means by "usually ~40m". Never multiplied client-side.
   */
  projected_typical_worker_seconds: z.number().int().nullable().catch(null),
  /**
   * The provenance of the figure above. The two raw evidence counts that
   * production-time carries are deliberately not repeated on every list row.
   */
  typical_basis: TypicalBasisSchema,
  sample_count: z.number().int().catch(0),
  allowance_seconds: z.number().int().nullable(),
  /** The step's own state; distinct from a section's governing state. */
  state: z.string(),
  /** Live share of the remaining distributable task budget. */
  pressure_share_seconds: z.number().int().nullable(),
  worked_seconds: z.number().int(),
  // Negative means over budget — a state, not an error.
  left_seconds: z.number().int().nullable(),
  share_state: ProductionTimeShareStateSchema,
});
export type BudgetAllocationStep = z.infer<typeof BudgetAllocationStepSchema>;

export const TaskBudgetAllocationSchema = z.object({
  task_id: z.string(),
  status: ItemEconomicsStatusSchema,
  allowed_worker_minutes: DecimalStringSchema.nullable(),
  /**
   * Nullable, despite the handoff's §5 table calling it "never null":
   * `get_task_budget_allocations.py` sets it to None for every task whose
   * status is outside the budget set, and `ProductionTimeBudgetSchema` — the
   * same figure on the sibling surface — already declares it nullable.
   */
  actual_worker_seconds: z.number().int().nullable(),
  remaining_worker_minutes: DecimalStringSchema.nullable(),
  /** See TaskProductionTimeSchema — `…_v2` since 2026-08-24, never pinned. */
  allocation_method: z.string(),
  /** Exact, intentionally unclamped ratio behind the live pressure shares. */
  pressure_ratio: DecimalStringSchema.nullable(),
  pressure_method: z.string(),
  typical_resolution: TypicalResolutionSchema,
  /** Per task, same clamping rule as production-time. */
  projection_quantity: z.number().int().catch(1),
  steps: z.array(BudgetAllocationStepSchema),
});
export type TaskBudgetAllocation = z.infer<typeof TaskBudgetAllocationSchema>;

export const TaskBudgetAllocationsResponseSchema = z.object({
  budget_allocations: z.array(TaskBudgetAllocationSchema),
});
export type TaskBudgetAllocationsResponse = z.infer<
  typeof TaskBudgetAllocationsResponseSchema
>;

// --- Budget signals (manager task cards) ------------------------------------

export const TaskBudgetStateSchema = z.enum([
  "no_budget",
  "over",
  "projected_over",
  "within_budget",
]);
export type TaskBudgetState = z.infer<typeof TaskBudgetStateSchema>;

/** `no_currency` applies only to an unevaluated/no-budget task signal. */
export const TaskBudgetSignalCurrencySchema = z.enum([
  "swedish_krona",
  "danish_krona",
  "euro",
  "no_currency",
]);
export type TaskBudgetSignalCurrency = z.infer<
  typeof TaskBudgetSignalCurrencySchema
>;

export const TaskBudgetSignalSchema = z.object({
  task_id: z.string(),
  budget_state: TaskBudgetStateSchema,
  over_seconds: z.number().int(),
  over_cost_minor: z.number().int(),
  projected_over_seconds: z.number().int(),
  projected_over_cost_minor: z.number().int(),
  currency: TaskBudgetSignalCurrencySchema,
  allowed_seconds: z.number().int(),
  actual_worked_seconds: z.number().int(),
  cost_per_worker_minute_ten_thousandths: z.number().int(),
});
export type TaskBudgetSignal = z.infer<typeof TaskBudgetSignalSchema>;

export const TaskBudgetSignalsResponseSchema = z.object({
  budget_signals: z.array(TaskBudgetSignalSchema),
});
export type TaskBudgetSignalsResponse = z.infer<
  typeof TaskBudgetSignalsResponseSchema
>;

// --- Price scenario (expected sold price editor) ----------------------------
//
// Source of truth: docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md
// §2 (payload) and §5 (null semantics), extended additively by
// docs/handoff/from_backend/HANDOFF_TO_FRONTEND_production_budget_cap_20260820.md
// (calculation_version 2, `model.budget_cap_percent_milli`). Every field the
// handoff lists as nullable is `.nullable()` and never `.optional()` — the
// backend always sends the key, so an `.optional()` here would hide a dropped
// field instead of failing loudly (intention §4A M13).

/**
 * The three currencies the item economics domain prices in. It exists here
 * because M11's display mapping must be exhaustive by construction: adding a
 * member has to break the typecheck, never fall back to SEK.
 */
export const ValuationCurrencySchema = z.enum([
  "swedish_krona",
  "danish_krona",
  "euro",
]);
export type ValuationCurrency = z.infer<typeof ValuationCurrencySchema>;

// The typecheck-visible `INLINE_PRICING_CURRENCY satisfies ValuationCurrency`
// guard lives in `lib/valuation-currency.ts` (review r1 N3): keeping it here
// forced a types → lib value import at the package's most-imported module.

/** Whether the task still points at the item its economics were computed for. */
export const ItemBindingSchema = z.enum(["bound", "detached", "mismatched"]);
export type ItemBinding = z.infer<typeof ItemBindingSchema>;

/**
 * The arithmetic contract (M2) is version-bound: a payload computed by another
 * version of the formula must fail parse rather than be projected with rules it
 * was not produced by.
 */
export const PRICE_SCENARIO_CALCULATION_VERSION = 2;

/** `null` on `item_binding: "detached"` — there is no item row to describe. */
export const PriceScenarioItemSchema = z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  label: z.string().nullable(),
  quantity: z.number().int(),
});
export type PriceScenarioItem = z.infer<typeof PriceScenarioItemSchema>;

/** `null` only when the user row behind the valuation cannot be loaded. */
export const PriceScenarioAuthorSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
});
export type PriceScenarioAuthor = z.infer<typeof PriceScenarioAuthorSchema>;

/** The committed valuation row; `null` when nobody has priced the item. */
export const PriceScenarioSavedSchema = z.object({
  valuation_id: z.string(),
  expected_sale_price_minor: z.number().int().nullable(),
  purchase_cost_minor: z.number().int().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by: PriceScenarioAuthorSchema.nullable(),
});
export type PriceScenarioSaved = z.infer<typeof PriceScenarioSavedSchema>;

/**
 * The cost model constants the local projection runs on. The two scaled fields
 * are integers, not the house decimal string, precisely so the arithmetic stays
 * exact (handoff §2). `budget_cap_percent_milli` (§v2 handoff) is non-nullable —
 * it is always present whenever `model` is present, never absent inside it.
 */
export const PriceScenarioModelSchema = z.object({
  cost_model_version_id: z.string(),
  basis_version_id: z.string(),
  residual_percent_milli: z.number().int(),
  constant_deduction_minor: z.number().int(),
  cost_per_worker_minute_ten_thousandths: z.number().int(),
  budget_cap_percent_milli: z.number().int(),
  is_purely_proportional: z.boolean(),
});
export type PriceScenarioModel = z.infer<typeof PriceScenarioModelSchema>;

/** Always present, even under a non-`bound` binding (handoff §5.1, §5.5). */
export const PriceScenarioTypicalSchema = z.object({
  /**
   * Since 2026-08-29 this is the **quantity-projected** task typical: each
   * participating section's per-unit typical (business fallback applied in
   * per-unit space) scaled by the current item's quantity, per-section half-even
   * rounded, then summed. Break-even, the suggestion and the slider domain are
   * all derived from it, so the screen prices the whole order — which is what
   * `allowanceSeconds(draft, model)` beside it has always measured.
   */
  total_seconds: z.number().int(),
  /** The same total at quantity 1. Display only; never our multiplicand. */
  total_unit_seconds: z.number().int().catch(0),
  /** The clamped quantity behind `total_seconds`; always >= 1. */
  quantity_applied: z.number().int().catch(1),
  /**
   * True when no section participates, or when the section-wide fallback fired
   * for at least one participating section. Reconciling to
   * `section_wide_uniform` alone does not set it. Narrowing can legitimately
   * move this value — usable same-category history replacing an unusable
   * section-wide zero flips it to false, which is the feature working.
   */
  is_estimated: z.boolean(),
  /** Participating sections whose *selected* typical is null or <= 0. */
  sections_without_sample: z.number().int(),
  sections_total: z.number().int(),
  typical_resolution: TypicalResolutionSchema,
  method: z.string(),
  window_days: z.number().int(),
  min_sample_size: z.number().int(),
});
export type PriceScenarioTypical = z.infer<typeof PriceScenarioTypicalSchema>;

/** The chip and the marker read from here, never from a local allowance (§5.3). */
export const PriceScenarioAnchorsSchema = z.object({
  is_fundable: z.boolean(),
  break_even_price_minor: z.number().int().nullable(),
  suggested_price_minor: z.number().int().nullable(),
  infeasible_at_or_below_minor: z.number().int(),
});
export type PriceScenarioAnchors = z.infer<typeof PriceScenarioAnchorsSchema>;

/** The slider band; derived server-side, `null` when there is no usable one. */
export const PriceScenarioDomainSchema = z.object({
  rule: z.string(),
  min_minor: z.number().int(),
  max_minor: z.number().int(),
  step_minor: z.number().int(),
});
export type PriceScenarioDomain = z.infer<typeof PriceScenarioDomainSchema>;

export const PriceScenarioSchema = z.object({
  task_id: z.string(),
  status: ItemEconomicsStatusSchema.nullable(),
  item_binding: ItemBindingSchema,
  can_commit: z.boolean(),
  currency: ValuationCurrencySchema.nullable(),
  calculation_version: z.literal(PRICE_SCENARIO_CALCULATION_VERSION),
  config_fingerprint: z.string().nullable(),
  item: PriceScenarioItemSchema.nullable(),
  saved: PriceScenarioSavedSchema.nullable(),
  model: PriceScenarioModelSchema.nullable(),
  typical: PriceScenarioTypicalSchema,
  anchors: PriceScenarioAnchorsSchema.nullable(),
  domain: PriceScenarioDomainSchema.nullable(),
});
export type PriceScenario = z.infer<typeof PriceScenarioSchema>;
