import { z } from 'zod';

import { ClientIdSchema } from '@/lib/client-id';
import type { ItemId } from '@/types/common';

export const ITEM_STATE = ['pending', 'stalled', 'fixing', 'ready'] as const;
export const ITEM_CURRENCY = ['swedish_krona', 'danish_krona', 'euro'] as const;
export type ItemCurrency = (typeof ITEM_CURRENCY)[number];

const CURRENCY_TO_ISO: Record<ItemCurrency, string> = {
  swedish_krona: 'SEK',
  danish_krona: 'DKK',
  euro: 'EUR',
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
  item_currency: z.enum(ITEM_CURRENCY, { message: 'Select a currency.' }).optional(),
  item_position: z.string().max(255).optional(),
  external_id: z.string().max(255).optional(),
  external_url: z.string().url('Enter a valid URL.').optional().or(z.literal('')),
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
  external_url: z.string().url().nullable().optional().or(z.literal('')),
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
  const isoCode = item.item_currency ? CURRENCY_TO_ISO[item.item_currency] : null;

  const formatMinor = (minor: number | null): string | null => {
    if (minor === null || !isoCode) return null;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: isoCode,
    }).format(minor / 100);
  };

  const dims = [item.height_in_cm, item.width_in_cm, item.depth_in_cm];
  const dimensionsFormatted = dims.every((d) => d !== null)
    ? `${dims[0]}×${dims[1]}×${dims[2]} cm`
    : null;
  const displayName =
    [item.designer, item.article_number ?? item.sku].filter(Boolean).join(' – ') || item.id;

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
    state: 'pending',
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
