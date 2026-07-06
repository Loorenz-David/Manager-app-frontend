import type { EmailThreadMessagesFetchParams } from "@beyo/emails";

import type { CoordinationInboxThreadsParams } from "../types";

export const customerCoordinationEmailKeys = {
  all: ["customer-coordination-email"] as const,
  inboxThreads: (params: CoordinationInboxThreadsParams = {}) =>
    [...customerCoordinationEmailKeys.all, "inbox-threads", params] as const,
  threadMessages: (
    threadId: string,
    params: EmailThreadMessagesFetchParams = {},
  ) =>
    [...customerCoordinationEmailKeys.all, "thread-messages", threadId, params] as const,
  unreadCount: () =>
    [...customerCoordinationEmailKeys.all, "unread-count"] as const,
};
