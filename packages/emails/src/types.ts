import type { LucideIcon } from "lucide-react";

export type EmailTemplate = {
  client_id: string;
  name: string;
  subject: string;
  text_body: string;
};

export type EmailMessageDirection = "inbound" | "outbound";

export type EmailInboxThreadVM = {
  threadId: string;
  entityClientId: string | null;
  majorEntityClientId: string | null;
  isUnread: boolean;
  title: string;
  messageCount: number | null;
  subject: string | null;
  preview: string;
  timeIso: string | null;
  imageUrl: string | null;
  quantity: number | null;
  lastMessageDirection: EmailMessageDirection | null;
  lastMessageSendError: string | null;
  /** The most recent messages already known from the inbox list (oldest-first),
   *  used to seed the thread view instantly. Length is backend-driven (currently
   *  up to 2) and may grow. */
  lastMessages: EmailMessageVM[];
  imageClientIds: Array<{ client_id: string; image_url: string }>;
  itemClientId: string | null;
};

export type EmailMessageVM = {
  messageId: string;
  direction: EmailMessageDirection;
  fromName: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string | null;
  textBody: string | null;
  /** Email body with quoted history and signatures stripped by the backend.
   *  Preferred for display; falls back to `textBody` when absent. */
  textBodyClean: string | null;
  bodyPreview: string | null;
  htmlBody: string | null;
  sentOrReceivedAtIso: string;
  sendAttemptedAtIso: string | null;
  sendError: string | null;
};

export type EmailSwipeAction = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "destructive";
  onCommit: (thread: EmailInboxThreadVM) => Promise<void> | void;
};

export type EmailThreadHeaderAction = {
  label: string;
  icon: LucideIcon;
  tone: "success" | "destructive" | "neutral";
  onPress: () => Promise<void> | void;
  disabled?: boolean;
};

export type EmailInboxFetchParams = { limit?: number; offset?: number };
export type EmailInboxFetchResult<TThread = EmailInboxThreadVM> = {
  threads: TThread[];
  hasMore: boolean;
  limit: number;
  offset: number;
};
export type EmailThreadMessagesFetchParams = { limit?: number; offset?: number };
export type EmailThreadMessagesFetchResult<TMessage = EmailMessageVM> = {
  messages: TMessage[];
  hasMore: boolean;
};

export type EmailInboxAdapter<
  TThread = EmailInboxThreadVM,
  TMessage = EmailMessageVM,
> = {
  fetchInboxThreads: (
    params: EmailInboxFetchParams,
  ) => Promise<EmailInboxFetchResult<TThread>>;
  fetchThreadMessages: (
    threadId: string,
    params?: EmailThreadMessagesFetchParams,
  ) => Promise<EmailThreadMessagesFetchResult<TMessage>>;
  markThreadRead?: (threadId: string, thread: TThread) => Promise<void> | void;
  refreshInbox?: (visibleThreads: TThread[]) => Promise<void> | void;
  refreshThread?: (threadId: string) => Promise<void> | void;
};
