import { z } from "zod";

export const SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY =
  "beyo.shopifyProductSync.lastSelectedInventoryLocationIds";

const InventorySelectionSchema = z.object({
  locationIds: z.array(z.string()),
  updatedAt: z.number().int(),
});

const InventorySelectionsSchema = z.record(
  z.string(),
  InventorySelectionSchema,
);

type InventorySelections = z.infer<typeof InventorySelectionsSchema>;

function readSelections(): InventorySelections {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(
    SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY,
  );
  if (!raw) return {};

  try {
    const parsed = InventorySelectionsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function readLastSelectedInventoryLocationIds(
  shopIntegrationId: string,
): string[] | null {
  return readSelections()[shopIntegrationId]?.locationIds ?? null;
}

export function writeLastSelectedInventoryLocationIds(
  shopIntegrationId: string,
  locationIds: string[],
): void {
  if (typeof window === "undefined") return;

  const selections = readSelections();
  selections[shopIntegrationId] = {
    locationIds,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(
    SHOPIFY_PRODUCT_SYNC_LAST_INVENTORY_LOCATIONS_STORAGE_KEY,
    JSON.stringify(selections),
  );
}
