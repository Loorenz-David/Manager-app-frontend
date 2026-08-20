export {
  ITEM_ECONOMICS_BASE_PATH,
  MAJOR_CATEGORIES,
  MajorCategorySchema,
  ItemEconomicsStatusSchema,
  CONFIGURATION_STATUSES,
  ITEM_DATA_STATUSES,
  isConfigurationStatus,
  isItemDataStatus,
  isReadyToCommit,
  DecimalStringSchema,
  ItemEconomicsPaginationSchema,
  ProductionTimeShareStateSchema,
  ProductionTimeTypicalSchema,
  ProductionTimeSectionSchema,
  ProductionTimeBudgetSchema,
  ProductionTimeFinalSchema,
  TaskProductionTimeSchema,
} from "./types";
export type {
  MajorCategory,
  ItemEconomicsStatus,
  DecimalStringValue,
  ItemEconomicsPagination,
  ItemEconomicsListParams,
  ProductionTimeShareStateDto,
  ProductionTimeTypical,
  ProductionTimeSectionDto,
  ProductionTimeBudget,
  ProductionTimeFinal,
  TaskProductionTime,
} from "./types";

export { itemEconomicsKeys } from "./api/item-economics-keys";
export { itemEconomicsSocketEvents } from "./socket-events";

export { parseErrorIdentity } from "./lib/error-identity";

// --- Production time widget -------------------------------------------------
// Public DTO, pure view-model, presentation, and self-fetching root exports.

export {
  PRODUCTION_TIME_COLLAPSED_ROW_COUNT,
  buildRowDetail,
  buildSegments,
  formatPassCount,
  formatWorkSeconds,
  humanizeSectionState,
  selectVisibleRows,
  stateToTone,
} from "./lib/production-time-view-model";
export type {
  ProductionTimeCardViewModel,
  ProductionTimeHeadlineViewModel,
  ProductionTimeNoBudgetViewModel,
  ProductionTimeRowDetailViewModel,
  ProductionTimeRowViewModel,
  ProductionTimeSegmentViewModel,
  ProductionTimeShareState,
  ProductionTimeTone,
  ProductionTimeViewModel,
} from "./lib/production-time-view-model";

export {
  ProductionTimeCard,
  ProductionTimeCardSkeleton,
  ProductionTimeFrame,
  PRODUCTION_TIME_TONE_FILL,
  PRODUCTION_TIME_TONE_VARIANT,
} from "./components/production-time";
export type { ProductionTimeCardProps } from "./components/production-time";
export { ProductionTimeSection } from "./components/production-time/ProductionTimeSection";
export type { ProductionTimeSectionProps } from "./components/production-time/ProductionTimeSection";

export {
  ITEM_VALUATION_SLIDE_SURFACE_ID,
  preloadItemValuationSlideSurface,
} from "./surface-ids";
export type {
  ItemEconomicsSurfaceOpeners,
  ItemValuationSlideSurfaceProps,
} from "./surface-ids";

// --- Item pricing fields (task creation, operational handoff §9) -------------
// Track A's surface. The logic track composes ItemPricingFieldsSchema into the
// host form schemas and calls resolveTotalMinor / toMajorUnitString at submit.

export {
  INLINE_PRICING_CURRENCY,
  formatMinorPrice,
  formatPieces,
  formatPrice,
  resolvePricingQuantity,
  resolveTotalMinor,
  toMajorUnitString,
  toMinorUnits,
} from "./lib/item-pricing";

export {
  EMPTY_ITEM_PRICING_FIELDS,
  ITEM_PRICING_FIELD_NAMES,
  ItemPricingFieldsSchema,
} from "./pricing-fields";
export type { ItemPricingFields } from "./pricing-fields";

export {
  ItemPricingFieldGroup,
  ItemPurchasePriceDisplay,
  ItemExpectedSalePriceField,
  ItemPricingTotalRow,
} from "./components/item-pricing";
export type { ItemPricingFieldGroupProps } from "./components/item-pricing";

// --- Expected sold price editor (price scenario) ----------------------------
// Phase 1 exports the pure core only: the DTO, the BigInt arithmetic, the draft
// machine, coverage, screen state and the formatters. The page loader and the
// components arrive with the phase-2 wiring.

export {
  ItemBindingSchema,
  PRICE_SCENARIO_CALCULATION_VERSION,
  PriceScenarioSchema,
  ValuationCurrencySchema,
} from "./types";
export type {
  PriceScenario,
  PriceScenarioAnchors,
  PriceScenarioDomain,
  PriceScenarioItem,
  PriceScenarioModel,
  PriceScenarioSaved,
  PriceScenarioTypical,
  ValuationCurrency,
} from "./types";

export {
  allowanceSeconds,
  allowedCentimin,
  budgetMinor,
  formatAllowanceDuration,
  formatAllowedWorkerMinutes,
  roundHalfEven,
} from "./lib/price-scenario-math";

export {
  clampSnap,
  priceDraftReducer,
  priceToSliderFraction,
  resolveProvenanceVariant,
  sliderFractionToPrice,
} from "./lib/price-draft";
export type {
  PriceDraftEvent,
  PriceDraftProvenanceVariant,
  PriceDraftState,
} from "./lib/price-draft";

export { resolveCoverage } from "./lib/price-coverage";

export { resolveScreenState } from "./lib/item-valuation-screen-state";
export type {
  ItemValuationScreenState,
  ScenarioQueryStatus,
} from "./lib/item-valuation-screen-state";

export { currencyDisplayCode, formatPerPiece } from "./lib/valuation-currency";

/**
 * The page is reachable only through this loader (contract 35 §14): a static
 * re-export would drag it into the main chunk the moment anything imports a
 * surface id from this package, and every `lazyWithPreload` around it would
 * become decoration.
 */
export function loadItemValuationSlidePage() {
  return import("./pages/ItemValuationSlidePage").then((m) => ({
    default: m.ItemValuationSlidePage,
  }));
}
