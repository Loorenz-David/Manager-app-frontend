import { z } from "zod";

import type {
  UpholsteryId,
  UpholsteryInventoryId,
  WorkspaceId,
} from "@/types/common";

import {
  deriveInventoryCondition,
  type InventoryConditionPresentation,
} from "./lib/condition";
import { formatMeters, isPositive, subtractMeters } from "./lib/decimal";

export const INVENTORY_CONDITIONS = [
  "available",
  "low_stock",
  "out_of_stock",
] as const;

export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number];

export type InventoryQuickFilter = "favorite" | "in_stock" | "out_of_stock";

export const INVENTORY_QUICK_FILTER_OPTIONS: Array<{
  value: InventoryQuickFilter;
  label: string;
}> = [
  { value: "favorite", label: "Favorites" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export const INVENTORY_FILTER_INDEXES: Record<InventoryQuickFilter, number> = {
  favorite: 0,
  in_stock: 1,
  out_of_stock: 2,
};

export const InventoryConditionSchema = z.enum(INVENTORY_CONDITIONS);

const nullableDecimal = z.string().nullable();
const nullableDate = z.string().nullable();

export const UpholsteryInventoryPartialSchema = z.object({
  client_id: z.string().transform((value) => value as UpholsteryInventoryId),
  workspace_id: z.string().transform((value) => value as WorkspaceId),
  upholstery_id: z.string().transform((value) => value as UpholsteryId),
  upholstery_name: z.string().nullable(),
  upholstery_code: z.string().nullable(),
  image_url: z.string().nullable(),
  page_link: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  favorite: z.boolean(),
  inventory_condition: InventoryConditionSchema,
  current_stored_amount_meters: nullableDecimal,
  current_amount_ordered_meters: nullableDecimal,
  current_amount_in_need_meters: nullableDecimal,
  updated_at: nullableDate,
});

export const UpholsteryInventoryDetailSchema = z.object({
  client_id: z.string().transform((value) => value as UpholsteryInventoryId),
  workspace_id: z.string().transform((value) => value as WorkspaceId),
  upholstery_id: z.string().transform((value) => value as UpholsteryId),
  upholstery_name: z.string().nullable(),
  upholstery_code: z.string().nullable(),
  image_url: z.string().nullable(),
  page_link: z.string().nullable().optional(),
  supplier_name: z.string().nullable().optional(),
  favorite: z.boolean(),
  inventory_condition: InventoryConditionSchema,
  current_stored_amount_meters: nullableDecimal,
  current_amount_in_use_meters: nullableDecimal,
  current_amount_in_need_meters: nullableDecimal,
  current_amount_ordered_meters: nullableDecimal,
  total_upholstery_used_meters: nullableDecimal,
  total_upholstery_used_inventory_meters: nullableDecimal,
  total_upholstery_used_surplus_meters: nullableDecimal,
  total_upholstery_surplus_meters: nullableDecimal,
  low_stock_threshold_meters: nullableDecimal,
  minimum_to_have: z.number().int().nullable(),
  maximum_to_have: z.number().int().nullable(),
  projected_inventory_value_minor: z.number().int().nullable(),
  currency: z
    .enum(["swedish_krona", "danish_krona", "euro"])
    .nullable(),
  planning_position: z.string().nullable(),
  latest_projection_history_id: z.string().nullable(),
  created_at: z.string(),
  created_by_id: z.string().nullable(),
  updated_at: nullableDate,
  updated_by_id: z.string().nullable(),
  is_deleted: z.boolean(),
});

export type UpholsteryInventoryPartial = z.infer<
  typeof UpholsteryInventoryPartialSchema
>;
export type UpholsteryInventoryDetail = z.infer<
  typeof UpholsteryInventoryDetailSchema
>;

export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  in_stock?: boolean;
  favorite?: boolean;
  upholstery_category_ids?: string;
};

export type InventoryListCardViewModel = {
  inventoryId: UpholsteryInventoryId;
  name: string;
  code: string;
  supplierName: string | null;
  pageLink: string | null;
  imageUrl: string | null;
  currentStoredAmountMeters: string | null;
  availableDisplay: string;
  availableIsPositive: boolean;
  availableIsNegative: boolean;
  storedDisplay: string;
  orderedDisplay: string | null;
  condition: InventoryConditionPresentation;
};

export type InventoryDetailViewModel = {
  inventoryId: UpholsteryInventoryId;
  name: string;
  code: string;
  imageUrl: string | null;
  pageLink: string | null;
  availableDisplay: string;
  availableIsPositive: boolean;
  availableIsNegative: boolean;
  storedDisplay: string;
  orderedDisplay: string;
  inNeedDisplay: string;
  inUseDisplay: string;
  totalUsedDisplay: string;
  condition: InventoryConditionPresentation;
  raw: UpholsteryInventoryDetail | null;
};

export const CreateInventoryFormSchema = z.object({
  upholstery_category_id: z.string().nullable(),
  name: z.string().min(1, "Name is required"),
  code: z.string(),
  image_url: z.string().nullable(),
  current_stored_amount_meters: z
    .string()
    .nullable()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        const parsed = Number.parseFloat(value.replace(",", "."));
        return !Number.isNaN(parsed) && parsed >= 0;
      },
      { message: "Stored amount must be 0 or greater" },
    ),
  low_stock_threshold_meters: z
    .string()
    .nullable()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        const parsed = Number.parseFloat(value.replace(",", "."));
        return !Number.isNaN(parsed) && parsed > 0;
      },
      { message: "Low stock threshold must be greater than 0" },
    ),
  favorite: z.boolean(),
});

export type CreateInventoryFormValues = z.infer<
  typeof CreateInventoryFormSchema
>;

export type CreateInventoryPayload = {
  client_id?: string | null;
  upholstery_category_id: string | null;
  name: string;
  code: string | null;
  image_url: string | null;
  current_stored_amount_meters: string | null;
  low_stock_threshold_meters: string | null;
  favorite: boolean;
};

export type EditInventoryPrefill = {
  upholstery_category_id: string | null;
  name: string;
  code: string;
  image_url: string | null;
  low_stock_threshold_meters: string | null;
  favorite: boolean;
};

function fallbackIdentity(id: UpholsteryInventoryId): string {
  return `Inventory ${String(id).slice(-6)}`;
}

export function toInventoryListCardViewModel(
  item: UpholsteryInventoryPartial,
): InventoryListCardViewModel {
  const available = subtractMeters(
    item.current_stored_amount_meters,
    item.current_amount_in_need_meters,
  );

  return {
    inventoryId: item.client_id,
    name: item.upholstery_name ?? fallbackIdentity(item.client_id),
    code: item.upholstery_code ?? "No code",
    supplierName: item.supplier_name ?? null,
    pageLink: item.page_link ?? null,
    imageUrl: item.image_url,
    currentStoredAmountMeters: item.current_stored_amount_meters,
    availableDisplay: available.display,
    availableIsPositive: available.isPositive,
    availableIsNegative: available.isNegative,
    storedDisplay: formatMeters(item.current_stored_amount_meters) ?? "0 m",
    orderedDisplay: isPositive(item.current_amount_ordered_meters)
      ? (formatMeters(item.current_amount_ordered_meters) ?? null)
      : null,
    condition: deriveInventoryCondition({
      inventory_condition: item.inventory_condition,
      hasActiveOrder: isPositive(item.current_amount_ordered_meters),
    }),
  };
}

export function toInventoryDetailViewModel(
  item: UpholsteryInventoryDetail,
): InventoryDetailViewModel {
  const available = subtractMeters(
    item.current_stored_amount_meters,
    item.current_amount_in_need_meters,
  );

  return {
    inventoryId: item.client_id,
    name: item.upholstery_name ?? fallbackIdentity(item.client_id),
    code: item.upholstery_code ?? "No code",
    imageUrl: item.image_url,
    pageLink: item.page_link ?? null,
    availableDisplay: available.display,
    availableIsPositive: available.isPositive,
    availableIsNegative: available.isNegative,
    storedDisplay: formatMeters(item.current_stored_amount_meters) ?? "0 m",
    orderedDisplay: formatMeters(item.current_amount_ordered_meters) ?? "0 m",
    inNeedDisplay: formatMeters(item.current_amount_in_need_meters) ?? "0 m",
    inUseDisplay: formatMeters(item.current_amount_in_use_meters) ?? "0 m",
    totalUsedDisplay: formatMeters(item.total_upholstery_used_meters) ?? "0 m",
    condition: deriveInventoryCondition({
      inventory_condition: item.inventory_condition,
      hasActiveOrder: isPositive(item.current_amount_ordered_meters),
    }),
    raw: item,
  };
}
