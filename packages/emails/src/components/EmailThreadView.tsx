import { Loader2 } from "lucide-react";

import { ContentCard, PullToRefresh, useScrollHide } from "@beyo/ui";

import { EmailMessageCard } from "./EmailMessageCard";
import { EmailThreadFooter } from "./EmailThreadFooter";
import { EmailThreadHeader } from "./EmailThreadHeader";
import type { EmailMessageVM, EmailThreadHeaderAction } from "../types";

type EmailThreadViewProps = {
  subject: string;
  messages: EmailMessageVM[];
  isLoading: boolean;
  isSyncing?: boolean;
  syncingLabel?: string;
  error: Error | null;
  onBack: () => void;
  onReply: () => void;
  onRefreshThread: () => Promise<void> | void;
  onOpenMessageDetails: (message: EmailMessageVM) => void;
  headerActions: EmailThreadHeaderAction[];
  footerReplyDisabled?: boolean;
};

export function EmailThreadView({
  subject,
  messages,
  isLoading,
  isSyncing = false,
  syncingLabel = "Syncing…",
  error,
  onBack,
  onReply,
  onRefreshThread,
  onOpenMessageDetails,
  headerActions,
  footerReplyDisabled = false,
}: EmailThreadViewProps): React.JSX.Element {
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div ref={hideProgressContainerRef} className="relative flex h-full flex-col">
      <EmailThreadHeader
        actions={headerActions}
        isHidden={isHidden}
        subject={subject}
        onBack={onBack}
      />

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={76}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={onRefreshThread}
      >
        <div className="flex min-h-full flex-col pt-22">
          <div className="flex flex-1 flex-col gap-3 pb-[calc(var(--safe-bottom,0)+7rem)] pt-2">
            {isSyncing && messages.length > 0 ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                <span>{syncingLabel}</span>
              </div>
            ) : null}

            {isLoading && messages.length === 0 ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="mx-4 h-32 animate-pulse rounded-xl bg-muted"
                />
              ))
            ) : null}

            {error ? (
              <div className="mx-4">
                <ContentCard>
                  <div className="flex flex-col gap-3 px-4 py-6">
                    <p className="text-sm text-muted-foreground">
                      Thread messages could not be loaded.
                    </p>
                    <button
                      className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                      type="button"
                      onClick={() => {
                        void onRefreshThread();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </ContentCard>
              </div>
            ) : null}

            {!isLoading && !error && messages.length === 0 ? (
              <div className="mx-4">
                <ContentCard>
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No messages were available for this thread yet.
                  </p>
                </ContentCard>
              </div>
            ) : null}

            {!error
              ? messages.map((message) => (
                  <EmailMessageCard
                    key={message.messageId}
                    message={message}
                    onOpenMessageDetails={onOpenMessageDetails}
                  />
                ))
              : null}
          </div>
        </div>
      </PullToRefresh>

      <EmailThreadFooter
        replyDisabled={footerReplyDisabled}
        onBack={onBack}
        onReply={onReply}
      />
    </div>
  );
}
