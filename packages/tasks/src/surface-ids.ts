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
