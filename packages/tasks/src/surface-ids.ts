type CalendarRangeOpenerProps = {
  currentFrom: string | null;
  currentTo: string | null;
  initialTarget?: "from" | "to";
  onFromSelect: (isoString: string | null) => void;
  onToSelect: (isoString: string | null) => void;
  fromLabel?: string;
  toLabel?: string;
};

export const TASK_READY_BY_AT_SHEET_SURFACE_ID = "task-ready-by-at-sheet";
export const TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID =
  "task-fulfillment-method-sheet";
export const TASK_ASSORTMENT_SHEET_SURFACE_ID = "task-assortment-sheet";
export const TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID =
  "task-scheduled-delivery-sheet";
export const TASK_POST_HANDLING_SLIDE_SURFACE_ID = "task-post-handling-slide";
export const TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID =
  "task-post-handling-filter-sheet";
export const TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID =
  "task-post-handling-pending-warning-sheet";
export const TASK_DETAIL_SURFACE_ID = "task-detail-slide";
export const TASK_ACTIONS_SHEET_SURFACE_ID = "task-actions-sheet";
export const TASK_FILTER_SHEET_SURFACE_ID = "task-filter-sheet";
export const ITEM_QUANTITY_SHEET_SURFACE_ID = "item-quantity-sheet";
export const ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID =
  "item-upholstery-amount-sheet";
export const PIN_NOTIFICATIONS_SLIDE_SURFACE_ID =
  "task-pin-notifications-slide";
export const PIN_TASK_STEP_STATES_SHEET_SURFACE_ID =
  "task-pin-step-states-sheet";
export const TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID =
  "task-flow-record-detail-sheet";
export const TASK_EDIT_SLIDE_SURFACE_ID = "task-edit-slide";
export const TASK_TYPE_SHEET_SURFACE_ID = "task-type-sheet";

export type TaskReadyByAtSheetSurfaceProps = {
  taskId: string;
};

export type TaskFulfillmentMethodSheetSurfaceProps = {
  taskId: string;
};

export type TaskAssortmentSheetSurfaceProps = {
  taskId: string;
};

export type TaskScheduledDeliverySheetSurfaceProps = {
  taskId: string;
  mode?: "edit" | "view";
};

export type TaskPostHandlingPendingWarningSheetSurfaceProps = {
  taskId: string;
  onOpenCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void;
};

export type TaskFilterSheetSurfaceProps = {
  selectedItemPosition: string;
  onApply: (itemPosition: string) => void;
};

export type TaskDetailSurfaceProps = {
  taskId: string;
};

export type TaskActionsSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};

export type ItemQuantitySurfaceProps = {
  taskId: string;
  itemId: string;
  prefill?: {
    quantity: number;
  };
};

export type ItemUpholsteryAmountSurfaceProps = {
  taskId: string;
  itemUpholsteryId: string;
  showQuantityChangedWarning?: boolean;
  prefill?: {
    amountMeters: number | null;
  };
};

export type PinNotificationsSlideSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};

export type PinTaskStepStatesSheetSurfaceProps = {
  stepId: string;
  label: string;
  imageUrl?: string | null;
  currentState: string;
  selectedStates: string[];
  onApply: (states: string[]) => void;
};

export type TaskFlowRecordDetailSurfaceProps = {
  taskId: string;
  flowRecordId: string;
};

export type TaskEditSurfaceProps = {
  taskId: string;
};

export type TaskTypeSheetSurfaceProps = {
  taskId: string;
};

export type TaskPostHandlingFilterSheetSurfaceProps = {
  isCompletedFilterActive: boolean;
  onApply: (completed: boolean) => void;
};

export type TaskPostHandlingSurfaceOpeners = {
  closeSurface?: () => void;
  openTaskDetail?: (taskId: string) => void;
  openTaskActions?: (taskId: string, itemId: string | null) => void;
  openImageViewer?: (
    taskId: string,
    itemClientId: string | null,
    images: Array<{ client_id: string; image_url: string }>,
  ) => void;
  openPendingWarning?: (
    props: TaskPostHandlingPendingWarningSheetSurfaceProps,
  ) => void;
  openCalendarRangePicker?: (props: CalendarRangeOpenerProps) => void;
  preloadPendingWarningSheet?: () => Promise<void>;
};

export type TaskPostHandlingSlideSurfaceProps = {
  surfaceOpeners?: TaskPostHandlingSurfaceOpeners;
  defaultTab?: "pending" | "filled";
};
