import type { TaskId } from "@beyo/lib";

/**
 * Surface IDs and the injected opener map for the item economics package.
 *
 * Packages never call `openSurface` — apps register the surfaces and inject
 * concrete implementations through `surfaceOpeners`. See
 * architecture/35_shared_packages.md §13.
 *
 * Add one constant per surface and one optional key per opener as the
 * components land.
 */

export type ItemEconomicsSurfaceOpeners = Record<string, never>;

/** The expected sold price editor, opened from the task-actions menu. */
export const ITEM_VALUATION_SLIDE_SURFACE_ID = "item-valuation-slide";

/**
 * `taskId` is all the page needs: the scenario payload carries the item's
 * client id, article number, label and quantity (intention §3.1).
 */
export type ItemValuationSlideSurfaceProps = {
  taskId: TaskId;
};

export function preloadItemValuationSlideSurface(): Promise<unknown> {
  return import("./pages/ItemValuationSlidePage");
}
