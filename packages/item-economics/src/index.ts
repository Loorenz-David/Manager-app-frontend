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
  DEFAULT_TYPICAL_RESOLUTION,
  TypicalBasisSchema,
  AppliedTypicalFilterSchema,
  TypicalResolutionSchema,
  ProductionTimeTypicalSchema,
  ProductionTimeSectionSchema,
  ProductionTimeBudgetSchema,
  ProductionTimeFinalSchema,
  TaskProductionTimeSchema,
  BudgetAllocationStepSchema,
  TaskBudgetAllocationSchema,
  TaskBudgetAllocationsResponseSchema,
  TaskBudgetStateSchema,
  TaskBudgetSignalCurrencySchema,
  TaskBudgetSignalSchema,
  TaskBudgetSignalsResponseSchema,
} from "./types";
export type {
  MajorCategory,
  ItemEconomicsStatus,
  DecimalStringValue,
  ItemEconomicsPagination,
  ItemEconomicsListParams,
  ProductionTimeShareStateDto,
  TypicalBasis,
  AppliedTypicalFilter,
  TypicalResolution,
  ProductionTimeTypical,
  ProductionTimeSectionDto,
  ProductionTimeBudget,
  ProductionTimeFinal,
  TaskProductionTime,
  BudgetAllocationStep,
  TaskBudgetAllocation,
  TaskBudgetAllocationsResponse,
  TaskBudgetState,
  TaskBudgetSignalCurrency,
  TaskBudgetSignal,
  TaskBudgetSignalsResponse,
} from "./types";

export { itemEconomicsKeys } from "./api/item-economics-keys";
export {
  BUDGET_ALLOCATIONS_MAX_TASK_IDS,
  fetchTaskBudgetAllocations,
} from "./api/fetch-task-budget-allocations";
export {
  buildStepBudgetMap,
  buildTaskBudgetAllocationMap,
  useTaskBudgetAllocationsQuery,
} from "./api/use-task-budget-allocations-query";
export type { TaskBudgetAllocationsSnapshot } from "./api/use-task-budget-allocations-query";
export {
  BUDGET_SIGNALS_MAX_TASK_IDS,
  fetchTaskBudgetSignals,
  parseTaskBudgetSignals,
} from "./api/fetch-task-budget-signals";
export {
  buildTaskBudgetSignalMap,
  useTaskBudgetSignalsQuery,
} from "./api/use-task-budget-signals-query";
export type { TaskBudgetSignalsSnapshot } from "./api/use-task-budget-signals-query";
export { itemEconomicsSocketEvents } from "./socket-events";

export { parseErrorIdentity } from "./lib/error-identity";

// --- Production time widget -------------------------------------------------
// Public DTO, pure view-model, presentation, and self-fetching root exports.

export {
  PRODUCTION_TIME_OUTLOOK_MIN_OVERRUN_SECONDS,
  PRODUCTION_TIME_VIEWPORT_ROW_COUNT,
  buildHeadlineCost,
  buildInfeasibleNotice,
  buildOutlook,
  buildOutlookLabel,
  buildRowDetail,
  buildRowUnitReading,
  buildSegments,
  formatPassCount,
  formatProductionCostMinor,
  formatUnitWorkSeconds,
  formatWorkSeconds,
  humanizeSectionState,
  selectAnchorRowIndex,
  stateToTone,
} from "./lib/production-time-view-model";
export type {
  ProductionTimeCardUnitViewModel,
  ProductionTimeCardViewModel,
  ProductionTimeHeadlineCostViewModel,
  ProductionTimeHeadlineUnitViewModel,
  ProductionTimeHeadlineViewModel,
  ProductionTimeInfeasibleNoticeViewModel,
  ProductionTimeNoBudgetUnitViewModel,
  ProductionTimeNoBudgetViewModel,
  ProductionTimeOutlookInput,
  ProductionTimeOutlookViewModel,
  ProductionTimeRowDetailViewModel,
  ProductionTimeRowUnitInput,
  ProductionTimeRowUnitViewModel,
  ProductionTimeRowViewModel,
  ProductionTimeSecondsFormatter,
  ProductionTimeSegmentViewModel,
  ProductionTimeShareState,
  ProductionTimeTone,
  ProductionTimeUnit,
  ProductionTimeViewModel,
} from "./lib/production-time-view-model";

export {
  ProductionTimeCard,
  ProductionTimeCardSkeleton,
  ProductionTimeFrame,
  ProductionTimeInfeasibleNotice,
  PRODUCTION_TIME_TONE_FILL,
  PRODUCTION_TIME_TONE_VARIANT,
} from "./components/production-time";
export type {
  ProductionTimeCardProps,
  ProductionTimeInfeasibleNoticeProps,
} from "./components/production-time";
export {
  TypicalStrategyPill,
  TypicalStrategySheetContent,
} from "./components/typical-strategy";
export type {
  TypicalStrategyPillProps,
  TypicalStrategySheetContentProps,
} from "./components/typical-strategy";
export {
  buildStrategyCriteria,
  buildTypicalStrategy,
  humanizeFacetName,
} from "./lib/typical-strategy";
export type {
  TypicalStrategyCriterionRow,
  TypicalStrategyCriterionStatus,
  TypicalStrategyDetailRow,
  TypicalStrategyInput,
  TypicalStrategyTone,
  TypicalStrategyViewModel,
} from "./lib/typical-strategy";
export { ProductionTimeSection } from "./components/production-time/ProductionTimeSection";
export type { ProductionTimeSectionProps } from "./components/production-time/ProductionTimeSection";

// --- Task budget overrun (task-card footer) ---------------------------------

export {
  buildTaskBudgetSignalDisplay,
  type TaskBudgetSignalDisplayViewModel,
} from "./lib/task-budget-overrun";
export { TaskBudgetOverrunBand } from "./components/task-budget-overrun";
export type { TaskBudgetOverrunBandProps } from "./components/task-budget-overrun";
export { TaskBudgetSignalFooter } from "./components/task-budget-overrun";
export type { TaskBudgetSignalFooterProps } from "./components/task-budget-overrun";

export {
  ITEM_VALUATION_SLIDE_SURFACE_ID,
  TYPICAL_STRATEGY_SHEET_SURFACE_ID,
  preloadItemValuationSlideSurface,
  preloadTypicalStrategySheetSurface,
} from "./surface-ids";
export type {
  ItemEconomicsSurfaceOpeners,
  ItemValuationSlideSurfaceProps,
  TypicalStrategySheetSurfaceProps,
} from "./surface-ids";

// --- Item pricing fields (task creation, operational handoff §9) -------------
// Track A's surface. The logic track composes ItemPricingFieldsSchema into the
// host form schemas and calls resolveTotalMinor / toMajorUnitString at submit.

export {
  INLINE_PRICING_CURRENCY,
  formatMinorPrice,
  formatPieces,
  formatPrice,
  fromMinorUnits,
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

export function loadTypicalStrategySheetPage() {
  return import("./pages/TypicalStrategySheetPage").then((m) => ({
    default: m.TypicalStrategySheetPage,
  }));
}
