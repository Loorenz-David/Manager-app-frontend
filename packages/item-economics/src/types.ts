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
export const MajorCategorySchema = z.enum(["wood", "seat"]);
export type MajorCategory = z.infer<typeof MajorCategorySchema>;

export const MAJOR_CATEGORIES = MajorCategorySchema.options;

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
