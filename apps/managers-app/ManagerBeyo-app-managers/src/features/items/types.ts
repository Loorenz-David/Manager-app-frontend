import { z } from "zod";

import { ClientIdSchema } from "@beyo/lib";
import type { ItemId, UpholsteryRequirementId } from "@/types/common";

export const ITEM_STATE = ["pending", "stalled", "fixing", "ready"] as const;
export const ITEM_CURRENCY = ["swedish_krona", "danish_krona", "euro"] as const;
export type ItemCurrency = (typeof ITEM_CURRENCY)[number];

const CURRENCY_TO_ISO: Record<ItemCurrency, string> = {
  swedish_krona: "SEK",
  danish_krona: "DKK",
  euro: "EUR",
};

export const ItemSchema = z.object({
  id: z.string().transform((v) => v as ItemId),
  state: z.enum(ITEM_STATE),
  article_number: z.string().nullable(),
  sku: z.string().nullable(),
  item_category_id: z.string().nullable(),
  quantity: z.number().int(),
  designer: z.string().nullable(),
  height_in_cm: z.number().int().nullable(),
  width_in_cm: z.number().int().nullable(),
  depth_in_cm: z.number().int().nullable(),
  item_value_minor: z.number().int().nullable(),
  item_cost_minor: z.number().int().nullable(),
  item_currency: z.enum(ITEM_CURRENCY).nullable(),
  item_position: z.string().nullable(),
  external_id: z.string().nullable(),
  external_url: z.string().nullable(),
  external_source: z.string().nullable(),
  external_order_id: z.string().nullable(),
  item_category_snapshot: z.string().nullable(),
  item_major_category_snapshot: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().nullable(),
});

export type Item = z.infer<typeof ItemSchema>;

export const CreateItemInputSchema = z.object({
  client_id: ClientIdSchema,
  article_number: z.string().max(128).optional(),
  sku: z.string().max(128).optional(),
  item_category_id: z.string().min(1).optional(),
  quantity: z.number().int().nonnegative().optional(),
  designer: z.string().max(255).optional(),
  height_in_cm: z.number().int().positive().optional(),
  width_in_cm: z.number().int().positive().optional(),
  depth_in_cm: z.number().int().positive().optional(),
  item_value_minor: z.number().int().nonnegative().optional(),
  item_cost_minor: z.number().int().nonnegative().optional(),
  item_currency: z
    .enum(ITEM_CURRENCY, { message: "Select a currency." })
    .optional(),
  item_position: z.string().max(255).optional(),
  external_id: z.string().max(255).optional(),
  external_url: z
    .string()
    .url("Enter a valid URL.")
    .optional()
    .or(z.literal("")),
  external_source: z.string().max(128).optional(),
  external_order_id: z.string().max(255).optional(),
});
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

export const UpdateItemInputSchema = z.object({
  id: z.string().transform((v) => v as ItemId),
  article_number: z.string().max(128).nullable().optional(),
  sku: z.string().max(128).nullable().optional(),
  item_category_id: z.string().min(1).nullable().optional(),
  quantity: z.number().int().nonnegative().optional(),
  designer: z.string().max(255).nullable().optional(),
  height_in_cm: z.number().int().positive().nullable().optional(),
  width_in_cm: z.number().int().positive().nullable().optional(),
  depth_in_cm: z.number().int().positive().nullable().optional(),
  item_value_minor: z.number().int().nonnegative().nullable().optional(),
  item_cost_minor: z.number().int().nonnegative().nullable().optional(),
  item_currency: z.enum(ITEM_CURRENCY).optional(),
  item_position: z.string().max(255).nullable().optional(),
  external_url: z.string().url().nullable().optional().or(z.literal("")),
});
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>;

export type ListItemsParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type ItemViewModel = Item & {
  display_name: string;
  dimensions_formatted: string | null;
  value_formatted: string | null;
  cost_formatted: string | null;
  currency_iso: string | null;
  state_label: string;
};

export function toItemViewModel(item: Item): ItemViewModel {
  const isoCode = item.item_currency
    ? CURRENCY_TO_ISO[item.item_currency]
    : null;

  const formatMinor = (minor: number | null): string | null => {
    if (minor === null || !isoCode) return null;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: isoCode,
    }).format(minor / 100);
  };

  const dims = [item.height_in_cm, item.width_in_cm, item.depth_in_cm];
  const dimensionsFormatted = dims.every((d) => d !== null)
    ? `${dims[0]}×${dims[1]}×${dims[2]} cm`
    : null;
  const displayName =
    [item.designer, item.article_number ?? item.sku]
      .filter(Boolean)
      .join(" – ") || item.id;

  return {
    ...item,
    display_name: displayName,
    dimensions_formatted: dimensionsFormatted,
    value_formatted: formatMinor(item.item_value_minor),
    cost_formatted: formatMinor(item.item_cost_minor),
    currency_iso: isoCode,
    state_label: item.state,
  };
}

export function toOptimisticItem(input: CreateItemInput): Item {
  return ItemSchema.parse({
    id: input.client_id,
    state: "pending",
    article_number: input.article_number ?? null,
    sku: input.sku ?? null,
    item_category_id: input.item_category_id ?? null,
    quantity: input.quantity ?? 1,
    designer: input.designer ?? null,
    height_in_cm: input.height_in_cm ?? null,
    width_in_cm: input.width_in_cm ?? null,
    depth_in_cm: input.depth_in_cm ?? null,
    item_value_minor: input.item_value_minor ?? null,
    item_cost_minor: input.item_cost_minor ?? null,
    item_currency: input.item_currency,
    item_position: input.item_position ?? null,
    external_id: input.external_id ?? null,
    external_url: input.external_url ?? null,
    external_source: input.external_source ?? null,
    external_order_id: input.external_order_id ?? null,
    item_category_snapshot: null,
    item_major_category_snapshot: null,
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  });
}

// ─── Item issue ───────────────────────────────────────────────────────────────

export const ITEM_ISSUE_STATE = [
  "pending",
  "fixing",
  "blocked",
  "deferred",
  "skipped",
  "resolved",
] as const;
export type ItemIssueState = (typeof ITEM_ISSUE_STATE)[number];

export const ItemIssueSchema = z.object({
  client_id: z.string(),
  item_id: z.string().transform((v) => v as ItemId),
  issue_type_id: z.string(),
  issue_severity_id: z.string().nullable(),
  state: z.enum(ITEM_ISSUE_STATE),
  base_time_seconds: z.number().int().nullable(),
  time_multiplier: z.number().nullable(),
  issue_name_snapshot: z.string().nullable(),
  severity_name_snapshot: z.string().nullable(),
  created_by_id: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }).nullable(),
  started_at: z.string().datetime({ offset: true }).nullable(),
  resolved_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});

export type ItemIssue = z.infer<typeof ItemIssueSchema>;

// ─── Item upholstery ──────────────────────────────────────────────────────────

export const ITEM_UPHOLSTERY_SOURCE = ["internal", "customer"] as const;
export type ItemUpholsterySource = (typeof ITEM_UPHOLSTERY_SOURCE)[number];

export const ItemUpholsterySchema = z.object({
  client_id: z.string(),
  item_id: z.string().transform((v) => v as ItemId),
  upholstery_id: z.string(),
  name: z.string().nullable(),
  code: z.string().nullable(),
  amount_meters: z.number().nullable(),
  source: z.enum(ITEM_UPHOLSTERY_SOURCE),
  time_to_fix_in_seconds: z.number().int().nullable(),
  active_requirement_id: z.string().nullable(),
});

export type ItemUpholstery = z.infer<typeof ItemUpholsterySchema>;

export const ITEM_UPHOLSTERY_REQUIREMENT_SOURCE = [
  "inventory",
  "customer_order",
] as const;
export const ITEM_UPHOLSTERY_REQUIREMENT_STATE = [
  "missing_quantity",
  "available",
  "needs_ordering",
  "ordered",
  "in_use",
  "completed",
  "failed",
] as const;
export type ItemUpholsteryRequirementSource =
  (typeof ITEM_UPHOLSTERY_REQUIREMENT_SOURCE)[number];
export type ItemUpholsteryRequirementState =
  (typeof ITEM_UPHOLSTERY_REQUIREMENT_STATE)[number];

export const ItemUpholsteryRequirementSchema = z.object({
  client_id: z.string().transform((value) => value as UpholsteryRequirementId),
  item_upholstery_id: z.string(),
  upholstery_inventory_id: z.string().nullable(),
  amount_meters: z.number().nullable(),
  value_minor: z.number().int().nullable(),
  currency: z.enum(ITEM_CURRENCY).nullable(),
  source: z.enum(ITEM_UPHOLSTERY_REQUIREMENT_SOURCE),
  state: z.enum(ITEM_UPHOLSTERY_REQUIREMENT_STATE),
});

export type ItemUpholsteryRequirement = z.infer<
  typeof ItemUpholsteryRequirementSchema
>;

// ─── Field composition schema (for form composition in other features) ────────

export const ItemDetailsFieldsSchema = z.object({
  designer: z.string().max(255).optional(),
  article_number: z.string().max(128).optional(),
  sku: z.string().max(128).optional(),
  quantity: z
    .number({ message: "Enter a number." })
    .int()
    .nonnegative()
    .optional(),
  item_position: z.preprocess(
    (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined ||
        Number.isNaN(value)
      ) {
        return undefined;
      }
      return value;
    },
    z.number({ message: "Enter a number." }).int().nonnegative().optional(),
  ),
  item_currency: z
    .enum(ITEM_CURRENCY, { message: "Select a currency." })
    .optional(),
  item_category_id: z.string().optional(),
  major_category: z.string().optional(),
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;

export const ItemIssuesFieldSchema = z.object({
  issue_id: z.string().min(1),
  // Severity selection is currently disabled in task creation, so allow empty.
  issue_severity_id: z.string().optional().or(z.literal("")),
});

export const ItemIssuesFieldsSchema = z.object({
  item_issues: z.array(ItemIssuesFieldSchema).default([]),
});

export type ItemIssueFieldEntry = z.infer<typeof ItemIssuesFieldSchema>;
export type ItemIssuesFields = z.infer<typeof ItemIssuesFieldsSchema>;

export const ItemUpholsteryFieldsSchema = z.object({
  upholstery_client_id: z.string().nullable().optional(),
  upholstery_amount_meters: z
    .number({ message: "Enter a number." })
    .positive({ message: "Enter a positive amount." })
    .nullable()
    .optional(),
});

export type ItemUpholsteryFields = z.infer<typeof ItemUpholsteryFieldsSchema>;

export const ItemCategoryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  major_category: z.string(),
  image_url: z.string().nullable(),
});
export type ItemCategoryPickerOption = z.infer<
  typeof ItemCategoryPickerOptionSchema
>;

export type ListItemCategoriesPickerParams = {
  q?: string;
  limit?: number;
  offset?: number;
};

export const IssueCategoryConfigSchema = z.object({
  client_id: z.string(),
  item_category_id: z.string(),
  issue_type_id: z.string(),
  base_time_seconds: z.number().int(),
  issue_type_name: z.string(),
});
export type IssueCategoryConfig = z.infer<typeof IssueCategoryConfigSchema>;

export type ListIssueCategoryConfigsParams = {
  item_category_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export const ITEM_LOOKUP_EXTERNAL_SOURCE = ["purchase_api"] as const;

export const ItemLookupResultSchema = z.object({
  article_number: z.string(),
  sku: z.string().nullable(),
  item_category_id: z.string().nullable(),
  quantity: z.number().int(),
  external_id: z.string().nullable(),
  external_source: z.enum(ITEM_LOOKUP_EXTERNAL_SOURCE).nullable(),
  images: z.array(z.string()),
});
export type ItemLookupResult = z.infer<typeof ItemLookupResultSchema>;

export type LookupItemsParams =
  | { article_number: string; sku?: never }
  | { sku: string; article_number?: never };
