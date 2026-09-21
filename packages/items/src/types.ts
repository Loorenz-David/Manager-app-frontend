import { z } from "zod";

import { MajorCategorySchema } from "@beyo/lib";

export const ITEM_CURRENCY = ["swedish_krona", "danish_krona", "euro"] as const;
export type ItemCurrency = (typeof ITEM_CURRENCY)[number];

export const ITEM_LOOKUP_EXTERNAL_SOURCE = ["purchase_api"] as const;

export const ItemDetailsFieldsSchema = z.object({
  designer: z.string().max(255).optional(),
  article_number: z.string().max(128).optional(),
  sku: z.string().max(128).optional(),
  quantity: z
    .number({ message: "Enter a number." })
    .int()
    .nonnegative()
    .optional(),
  item_position: z.string().trim().max(128).optional(),
  item_zone: z.string().trim().max(128).optional(),
  item_category_id: z.string().optional(),
  /**
   * Strict on purpose (review N13): an unknown category must fail here rather
   * than pass validation and then be dropped by the pricing card's render
   * condition, which would submit a multiplied purchase price with nothing on
   * screen. The read side stays permissive — see `MajorCategorySchema` in
   * `@beyo/lib`.
   */
  major_category: MajorCategorySchema.optional(),
  /**
   * Whether this item should be tracked for upholstery at all. Absent means the
   * backend never recorded a choice and will default it to `true`; the key must
   * be omitted rather than sent as `null` (the column is non-nullable).
   */
  can_have_upholstery: z.boolean().optional(),
  /**
   * Externally-owned properties snapshot, carried verbatim from the item
   * lookup to the create request. Never rendered and never user-editable: it
   * lives in the form purely because the resolver's parsed output is what
   * reaches `handleSubmit`, so a value not declared here is stripped before
   * the payload is built. The backend derives `properties_signature` from
   * this exact blob — reshaping it here would regroup the item's typical
   * samples in item-economics — so it is passed through untouched.
   */
  properties: z.record(z.string(), z.unknown()).optional(),
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;

const ItemLookupImageObjectSchema = z
  .object({ image_url: z.string() })
  .passthrough();

export const ItemLookupResultSchema = z.object({
  article_number: z.string(),
  sku: z.string().nullable(),
  item_category_id: z.string().nullable(),
  quantity: z.number().int(),
  external_id: z.string().nullable(),
  external_source: z.enum(ITEM_LOOKUP_EXTERNAL_SOURCE).nullable(),
  images: z.array(z.union([z.string(), ItemLookupImageObjectSchema])),
  purchase_price_minor: z.number().nullable().optional(),
  /**
   * The purchase-API lookup serializes this opaque value. It is retained
   * unchanged for task creation and stock-match preview requests.
   */
  properties: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type ItemLookupResult = z.infer<typeof ItemLookupResultSchema>;

export const ItemLocationResultSchema = z.object({
  item_article_number: z.string().nullable(),
  sku: z.string().nullable(),
  item_position: z.string().nullable(),
});
export type ItemLocationResult = z.infer<typeof ItemLocationResultSchema>;

export type LookupItemsParams =
  | { article_number: string; sku?: never }
  | { sku: string; article_number?: never };

export type LookupItemLocationParams = {
  q: string;
};

export type UpdateItemInput = {
  id: string;
  article_number?: string | null;
  sku?: string | null;
  item_category_id?: string | null;
  quantity?: number;
  designer?: string | null;
  height_in_cm?: number | null;
  width_in_cm?: number | null;
  depth_in_cm?: number | null;
  item_position?: string | null;
  item_zone?: string | null;
  external_url?: string | null;
  /** Omit to leave unchanged; never send `null`. */
  can_have_upholstery?: boolean;
};

export type UpdateItemPositionEntryInput = {
  client_id: string;
  item_position: string | null;
  item_zone?: string | null;
};
