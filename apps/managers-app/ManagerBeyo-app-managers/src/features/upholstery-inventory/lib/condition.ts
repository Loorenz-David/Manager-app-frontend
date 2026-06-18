import type { StatePillVariant } from "@/components/primitives";

import type { InventoryCondition } from "../types";

export type InventoryConditionPresentation = {
  key: InventoryCondition | "ordered";
  label: string;
  variant: StatePillVariant;
};

const CONDITION_PRESENTATION: Record<
  InventoryCondition,
  InventoryConditionPresentation
> = {
  available: {
    key: "available",
    label: "Available",
    variant: "success",
  },
  low_stock: {
    key: "low_stock",
    label: "Low stock",
    variant: "warning",
  },
  out_of_stock: {
    key: "out_of_stock",
    label: "Out of stock",
    variant: "danger",
  },
};

const ORDERED_PRESENTATION: InventoryConditionPresentation = {
  key: "ordered",
  label: "Ordered",
  variant: "active",
};

export function deriveInventoryCondition({
  inventory_condition,
  hasActiveOrder,
}: {
  inventory_condition: InventoryCondition;
  hasActiveOrder: boolean;
}): InventoryConditionPresentation {
  if (hasActiveOrder) {
    return ORDERED_PRESENTATION;
  }

  return CONDITION_PRESENTATION[inventory_condition];
}
