import { z } from "zod";
import type { BoxPickerOptionType } from "@beyo/ui";

export const UPHOLSTERY_INVENTORY_CONDITION = [
  "available",
  "low_stock",
  "out_of_stock",
] as const;

export const UpholsteryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  list_order: z.number().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
});
export type UpholsteryPickerOption = z.infer<typeof UpholsteryPickerOptionSchema>;

export type ListUpholsteryPickerParams = {
  q?: string;
  limit?: number;
  offset?: number;
  in_stock?: boolean;
  favorite?: boolean;
};

export type UpholsteryQuickFilter = "in_stock" | "out_of_stock" | "favorite";

export const UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS: Array<
  BoxPickerOptionType<UpholsteryQuickFilter>
> = [
  { value: "favorite", label: "Favorites" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export type UpholsteryPickerRecord = UpholsteryPickerOption;

export const ItemUpholsteryFieldsSchema = z.object({
  upholstery_client_id: z.string().nullable().optional(),
  upholstery_amount_meters: z
    .number({ message: "Enter a number." })
    .positive({ message: "Enter a positive amount." })
    .nullable()
    .optional(),
});
export type ItemUpholsteryFields = z.infer<typeof ItemUpholsteryFieldsSchema>;

const metersFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMeters(value: string | null): string | null {
  if (!value) return null;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? null : `${metersFormatter.format(num)} m`;
}
