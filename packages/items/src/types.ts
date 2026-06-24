import { z } from "zod";

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
});
export type ItemLookupResult = z.infer<typeof ItemLookupResultSchema>;

export type LookupItemsParams =
  | { article_number: string; sku?: never }
  | { sku: string; article_number?: never };
