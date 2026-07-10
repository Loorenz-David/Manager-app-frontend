import { z } from "zod";
export const SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY = "beyo.shopifyProductSync.lastSelectedShopIntegrationIds";
const Schema = z.object({ shopIntegrationIds: z.array(z.string()), updatedAt: z.number().int() });
export function readLastSelectedShopIntegrationIds(): string[] | null { if (typeof window === "undefined") return null; const raw = window.localStorage.getItem(SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY); if (!raw) return null; try { const parsed = Schema.safeParse(JSON.parse(raw)); return parsed.success ? parsed.data.shopIntegrationIds : null; } catch { return null; } }
export function writeLastSelectedShopIntegrationIds(shopIntegrationIds: string[]): void { if (typeof window === "undefined") return; window.localStorage.setItem(SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY, JSON.stringify({ shopIntegrationIds, updatedAt: Date.now() })); }
