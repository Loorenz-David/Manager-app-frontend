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

export const ProductionTimeTypicalSchema = z.object({
  typical_worker_seconds: z.number().int().nullable(),
  sample_count: z.number().int(),
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
  left_seconds: z.number().int().nullable(),
  share_state: ProductionTimeShareStateSchema,
  typical: ProductionTimeTypicalSchema.nullable(),
});
export type ProductionTimeSectionDto = z.infer<
  typeof ProductionTimeSectionSchema
>;

export const ProductionTimeBudgetSchema = z.object({
  allowed_worker_minutes: DecimalStringSchema.nullable(),
  actual_worker_seconds: z.number().int().nullable(),
  actual_worker_minutes: DecimalStringSchema.nullable(),
  remaining_worker_minutes: DecimalStringSchema.nullable(),
  percent_consumed: DecimalStringSchema.nullable(),
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
  allocation_method: z.string(),
  budget: ProductionTimeBudgetSchema,
  final: ProductionTimeFinalSchema.nullable(),
  sections: z.array(ProductionTimeSectionSchema),
});
export type TaskProductionTime = z.infer<typeof TaskProductionTimeSchema>;

// --- Price scenario (expected sold price editor) ----------------------------
//
// Source of truth: docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md
// §2 (payload) and §5 (null semantics). Every field the handoff lists as
// nullable is `.nullable()` and never `.optional()` — the backend always sends
// the key, so an `.optional()` here would hide a dropped field instead of
// failing loudly (intention §4A M13).

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
export const PRICE_SCENARIO_CALCULATION_VERSION = 1;

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
 * exact (handoff §2).
 */
export const PriceScenarioModelSchema = z.object({
  cost_model_version_id: z.string(),
  basis_version_id: z.string(),
  residual_percent_milli: z.number().int(),
  constant_deduction_minor: z.number().int(),
  cost_per_worker_minute_ten_thousandths: z.number().int(),
  is_purely_proportional: z.boolean(),
});
export type PriceScenarioModel = z.infer<typeof PriceScenarioModelSchema>;

/** Always present, even under a non-`bound` binding (handoff §5.1, §5.5). */
export const PriceScenarioTypicalSchema = z.object({
  total_seconds: z.number().int(),
  is_estimated: z.boolean(),
  sections_without_sample: z.number().int(),
  sections_total: z.number().int(),
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
