import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  TASK_FILTER_SHEET_SURFACE_ID,
  loadTaskDetailSlidePage,
  loadTaskFilterSheetPage,
  loadTaskFlowRecordDetailSheetPage,
} from "@beyo/tasks";

const taskDetailSlide = lazyWithPreload(loadTaskDetailSlidePage);
const taskFilterSheet = lazyWithPreload(loadTaskFilterSheetPage);
const taskFlowRecordDetailSheet = lazyWithPreload(
  loadTaskFlowRecordDetailSheetPage,
);

/**
 * The shared `@beyo/tasks` surfaces a worker can reach: the task detail
 * (rendered read-only for this role by the package), the listing's filter
 * sheet and the flow-record sheet. No item-economics opener wrapper — the
 * production-time section is not rendered for workers.
 *
 * Deliberately NOT registered, as the second fail-closed layer behind the
 * package's read-only rule — an opener that leaks through is a no-op here:
 * `TASK_ACTIONS_SHEET` (⋮), `TASK_READY_BY_AT_SHEET`,
 * `TASK_CUSTOMER_DETAILS_SHEET`, `TASK_ASSORTMENT_SHEET`,
 * `TASK_FULFILLMENT_METHOD_SHEET`, `ITEM_QUANTITY_SHEET`,
 * `ITEM_UPHOLSTERY_AMOUNT_SHEET`, `TASK_EDIT_SLIDE`,
 * `TASK_WORKING_SECTIONS_SLIDE`, `TYPICAL_STRATEGY_SHEET`,
 * `ITEM_VALUATION_SLIDE`. The notes sheet, unread viewer, image viewer,
 * item-position sheet and scheduled-delivery sheet are registered by
 * `task_steps/surfaces.ts` and `@beyo/images` already.
 */
export const taskSurfaces: SurfaceRegistrations = {
  [TASK_DETAIL_SURFACE_ID]: {
    surface: "slide",
    component: taskDetailSlide.Component,
  },
  [TASK_FILTER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskFilterSheet.Component,
  },
  [TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: taskFlowRecordDetailSheet.Component,
  },
};
