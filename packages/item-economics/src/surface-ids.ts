import type { TaskId } from "@beyo/lib";

import type { TypicalStrategyViewModel } from "./lib/typical-strategy";

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

export type ItemEconomicsSurfaceOpeners = {
  /**
   * Opens the typical-strategy disclosure. Optional like every opener: a host
   * that has not registered the sheet gets a stated pill rather than a dead
   * tap target, and nothing here throws.
   */
  openTypicalStrategy?: (props: TypicalStrategySheetSurfaceProps) => void;
};

/** The disclosure behind the typical-strategy pill, on both surfaces. */
export const TYPICAL_STRATEGY_SHEET_SURFACE_ID = "typical-strategy-sheet";

/**
 * The built view model, not a task id: the sheet must describe the same
 * snapshot the reader tapped, and a second fetch could describe a later one.
 */
export type TypicalStrategySheetSurfaceProps = {
  strategy: TypicalStrategyViewModel;
};

export function preloadTypicalStrategySheetSurface(): Promise<unknown> {
  return import("./pages/TypicalStrategySheetPage");
}

/** The expected sold price editor, opened from the task-actions menu. */
export const ITEM_VALUATION_SLIDE_SURFACE_ID = "item-valuation-slide";

/**
 * `taskId` is all the page needs: the scenario payload carries the item's
 * client id, article number, label and quantity (intention §3.1).
 */
export type ItemValuationSlideSurfaceProps = {
  taskId: TaskId;
  /** Optional: without it the strategy pill states rather than opens. */
  surfaceOpeners?: ItemEconomicsSurfaceOpeners;
};

export function preloadItemValuationSlideSurface(): Promise<unknown> {
  return import("./pages/ItemValuationSlidePage");
}
