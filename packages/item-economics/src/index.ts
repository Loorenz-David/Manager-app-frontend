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

export type { ItemEconomicsSurfaceOpeners } from "./surface-ids";

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
