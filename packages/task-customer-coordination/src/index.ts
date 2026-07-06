export {
  EmailMessageRawSchema,
  CUSTOMER_COORDINATION_STATE,
  CoordinationInboxThreadRawSchema,
  DEFAULT_COORDINATION_INBOX_FILTER,
  CustomerCoordinationCountsSchema,
  CustomerCoordinationRecordSchema,
  SendCoordinationReplyResponseDataSchema,
  SendEmailBatchResponseDataSchema,
  TaskListItemWithCoordinationRawSchema,
} from "./types";
export type {
  CoordinationInboxThreadRaw,
  CoordinationInboxFilterState,
  CoordinationInboxThreadsParams,
  CoordinationInboxThreadsResult,
  CustomerCoordinationCounts,
  CustomerCoordinationRecord,
  CustomerCoordinationState,
  EmailMessageRaw,
  ListTasksWithCoordinationParams,
  ListTasksWithCoordinationResult,
  SendCoordinationReplyInput,
  SendCoordinationReplyResponseData,
  SendEmailBatchInput,
  SendEmailBatchResponseData,
  TaskListItemWithCoordinationRaw,
  ThreadMessagesResult,
} from "./types";
export {
  CUSTOMER_COORDINATION_EMAIL_INBOX_FILTER_SHEET_SURFACE_ID,
  CUSTOMER_COORDINATION_EMAIL_INBOX_SLIDE_SURFACE_ID,
  CUSTOMER_COORDINATION_EMAIL_REPLY_SLIDE_SURFACE_ID,
  CUSTOMER_COORDINATION_EMAIL_SLIDE_SURFACE_ID,
} from "./surface-ids";
export type {
  CustomerCoordinationEmailInboxSurfaceOpeners,
  CustomerCoordinationEmailInboxSurfaceProps,
  CustomerCoordinationInboxFilterSheetSurfaceProps,
  CustomerCoordinationEmailReplySlideSurfaceOpeners,
  CustomerCoordinationEmailReplySlideSurfaceProps,
  CustomerCoordinationEmailSlideSurfaceOpeners,
  CustomerCoordinationEmailSlideSurfaceProps,
} from "./surface-ids";
export { customerCoordinationKeys } from "./api/customer-coordination-keys";
export { customerCoordinationEmailKeys } from "./api/customer-coordination-email-keys";
export {
  getCustomerCoordinationCounts,
  type GetCustomerCoordinationCountsParams,
} from "./api/get-customer-coordination-counts";
export { getCoordinationInboxThreads } from "./api/get-coordination-inbox-threads";
export { useCoordinationInboxThreadsQuery } from "./api/use-coordination-inbox-threads-query";
export { useCustomerCoordinationCountsQuery } from "./api/use-customer-coordination-counts-query";
export { getThreadMessages } from "./api/get-thread-messages";
export { useThreadMessagesQuery } from "./api/use-thread-messages-query";
export { getEmailUnreadCount } from "./api/get-email-unread-count";
export { useEmailUnreadCountQuery } from "./api/use-email-unread-count-query";
export { postThreadRead } from "./api/post-thread-read";
export { useMarkThreadRead } from "./api/use-mark-thread-read";
export { postCoordinationReply } from "./api/post-coordination-reply";
export { postFailCoordination } from "./api/post-fail-coordination";
export { postCompleteCoordination } from "./api/post-complete-coordination";
export { getTasksWithCoordination } from "./api/get-tasks-with-coordination";
export { useTasksWithCoordinationQuery } from "./api/use-tasks-with-coordination-query";
export { postEmailBatch } from "./api/post-email-batch";
export { useFailCoordination } from "./actions/use-fail-coordination";
export { useCompleteCoordination } from "./actions/use-complete-coordination";
export { useSendCoordinationReply } from "./actions/use-send-coordination-reply";
export { useSendEmailBatch } from "./actions/use-send-email-batch";
export {
  useCustomerCoordinationEmailInboxController,
  type CustomerCoordinationEmailInboxController,
} from "./controllers/use-customer-coordination-email-inbox.controller";
export {
  useCustomerCoordinationEmailReplySlideController,
  type CustomerCoordinationEmailReplySlideController,
} from "./controllers/use-customer-coordination-email-reply-slide.controller";
export {
  useCustomerCoordinationEmailSlideController,
  type CustomerCoordinationEmailSlideController,
} from "./controllers/use-customer-coordination-email-slide.controller";
export { CustomerCoordinationEmailInboxPage } from "./pages/CustomerCoordinationEmailInboxPage";
export { CustomerCoordinationInboxFilterSheetPage } from "./pages/CustomerCoordinationInboxFilterSheetPage";
export { CustomerCoordinationEmailReplySlidePage } from "./pages/CustomerCoordinationEmailReplySlidePage";
export { CustomerCoordinationEmailSlidePage } from "./pages/CustomerCoordinationEmailSlidePage";
export {
  customerCoordinationEmailSocketEvents,
  customerCoordinationSocketEvents,
} from "./socket-events";

export function loadCustomerCoordinationEmailSlidePage() {
  return import("./pages/CustomerCoordinationEmailSlidePage").then((m) => ({
    default: m.CustomerCoordinationEmailSlidePage,
  }));
}

export function loadCustomerCoordinationEmailInboxPage() {
  return import("./pages/CustomerCoordinationEmailInboxPage").then((m) => ({
    default: m.CustomerCoordinationEmailInboxPage,
  }));
}

export function loadCustomerCoordinationInboxFilterSheetPage() {
  return import("./pages/CustomerCoordinationInboxFilterSheetPage").then(
    (m) => ({
      default: m.CustomerCoordinationInboxFilterSheetPage,
    }),
  );
}

export function loadCustomerCoordinationEmailReplySlidePage() {
  return import("./pages/CustomerCoordinationEmailReplySlidePage").then((m) => ({
    default: m.CustomerCoordinationEmailReplySlidePage,
  }));
}
