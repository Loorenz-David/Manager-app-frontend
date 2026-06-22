import { z } from "zod";

import { ClientIdSchema } from "@beyo/lib";
import type { BoxPickerOption } from "@/components/primitives/box-picker/box-picker.types";
import type { UpholsteryId, UpholsteryInventoryId } from "@/types/common";
import { UpholsteryCategoryInlineSchema } from "@/features/upholstery-category/types";

export const UPHOLSTERY_CURRENCY = [
  "swedish_krona",
  "danish_krona",
  "euro",
] as const;
export const UPHOLSTERY_INVENTORY_CONDITION = [
  "available",
  "low_stock",
  "out_of_stock",
] as const;

export const UpholsterySchema = z.object({
  id: z.string().transform((v) => v as UpholsteryId),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().nullable(),
});
export type Upholstery = z.infer<typeof UpholsterySchema>;

export const UpholsteryInventorySchema = z.object({
  id: z.string().transform((v) => v as UpholsteryInventoryId),
  upholstery_id: z.string().transform((v) => v as UpholsteryId),
  minimum_to_have: z.number().int().nullable(),
  maximum_to_have: z.number().int().nullable(),
  projected_inventory_value_minor: z.number().int().nullable(),
  currency: z.enum(UPHOLSTERY_CURRENCY).nullable(),
  planning_position: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION),
  current_stored_amount_meters: z.string().nullable(),
  current_amount_in_use_meters: z.string().nullable(),
  current_amount_in_need_meters: z.string().nullable(),
  current_amount_ordered_meters: z.string().nullable(),
  total_upholstery_used_meters: z.string().nullable(),
  total_upholstery_used_inventory_meters: z.string().nullable(),
  total_upholstery_used_surplus_meters: z.string().nullable(),
  total_upholstery_surplus_meters: z.string().nullable(),
  low_stock_threshold_meters: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type UpholsteryInventory = z.infer<typeof UpholsteryInventorySchema>;

export const CreateUpholsteryInventoryInputSchema = z.object({
  client_id: ClientIdSchema,
  upholstery_id: z.string().min(1),
  minimum_to_have: z.number().int().nonnegative().optional(),
  maximum_to_have: z.number().int().nonnegative().optional(),
  planning_position: z.string().optional(),
  currency: z.enum(UPHOLSTERY_CURRENCY).optional(),
  low_stock_threshold_meters: z.string().optional(),
});
export type CreateUpholsteryInventoryInput = z.infer<
  typeof CreateUpholsteryInventoryInputSchema
>;

export const UpdateUpholsteryInventoryInputSchema = z.object({
  id: z.string().transform((v) => v as UpholsteryInventoryId),
  minimum_to_have: z.number().int().nonnegative().nullable().optional(),
  maximum_to_have: z.number().int().nonnegative().nullable().optional(),
  planning_position: z.string().nullable().optional(),
  currency: z.enum(UPHOLSTERY_CURRENCY).nullable().optional(),
  low_stock_threshold_meters: z.string().nullable().optional(),
  projected_inventory_value_minor: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),
});
export type UpdateUpholsteryInventoryInput = z.infer<
  typeof UpdateUpholsteryInventoryInputSchema
>;

export const AddOrderedInventoryInputSchema = z.object({
  id: z.string().transform((v) => v as UpholsteryInventoryId),
  amount_meters: z.string().min(1, "Amount is required."),
});
export type AddOrderedInventoryInput = z.infer<
  typeof AddOrderedInventoryInputSchema
>;

export type ListUpholsteriesParams = {
  limit?: number;
  offset?: number;
};

export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  inventory_condition?: string;
};

export const UpholsteryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  list_order: z.number().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
  upholstery_category: UpholsteryCategoryInlineSchema.nullable(),
});
export type UpholsteryPickerOption = z.infer<
  typeof UpholsteryPickerOptionSchema
>;

export type ListUpholsteryPickerParams = {
  q?: string;
  limit?: number;
  offset?: number;
  in_stock?: boolean;
  favorite?: boolean;
};

export type UpholsteryQuickFilter = "in_stock" | "out_of_stock" | "favorite";

export const UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS: Array<
  BoxPickerOption<UpholsteryQuickFilter>
> = [
  { value: "favorite", label: "Favorites" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export type UpholsteryInventoryViewModel = UpholsteryInventory & {
  stored_meters_display: string | null;
  in_use_meters_display: string | null;
  in_need_meters_display: string | null;
  ordered_meters_display: string | null;
  is_low_stock: boolean;
  condition_label: string;
};

export type UpholsteryPickerRecord = UpholsteryPickerOption;

const metersFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMeters(value: string | null): string | null {
  if (!value) return null;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? null : `${metersFormatter.format(num)} m`;
}

export function toUpholsteryInventoryViewModel(
  inv: UpholsteryInventory,
): UpholsteryInventoryViewModel {
  const stored = inv.current_stored_amount_meters;
  const threshold = inv.low_stock_threshold_meters;
  const isLowStock =
    stored !== null && threshold !== null
      ? Number.parseFloat(stored) <= Number.parseFloat(threshold)
      : false;

  return {
    ...inv,
    stored_meters_display: formatMeters(inv.current_stored_amount_meters),
    in_use_meters_display: formatMeters(inv.current_amount_in_use_meters),
    in_need_meters_display: formatMeters(inv.current_amount_in_need_meters),
    ordered_meters_display: formatMeters(inv.current_amount_ordered_meters),
    is_low_stock: isLowStock,
    condition_label: inv.inventory_condition,
  };
}
