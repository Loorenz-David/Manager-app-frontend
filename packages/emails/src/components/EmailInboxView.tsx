import { ContentCard, PullToRefresh, useScrollHide } from "@beyo/ui";
import { Loader2 } from "lucide-react";

import { EmailInboxFooter } from "./EmailInboxFooter";
import { EmailInboxHeader } from "./EmailInboxHeader";
import { EmailInboxThreadCard } from "./EmailInboxThreadCard";
import type { EmailInboxThreadVM, EmailSwipeAction } from "../types";

type EmailInboxViewProps = {
  threads: EmailInboxThreadVM[];
  isLoading: boolean;
  isSyncing?: boolean;
  syncingLabel?: string;
  error: Error | null;
  searchValue: string;
  showFilterButton?: boolean;
  activeFilterCount?: number;
  pendingThreadId?: string | null;
  onClose?: () => void;
  onSearchChange: (value: string) => void;
  onFilterPress?: () => void;
  onRefreshInbox: () => Promise<void> | void;
  onOpenThread: (thread: EmailInboxThreadVM) => void;
  onOpenImage: (thread: EmailInboxThreadVM) => void;
  leftSwipeAction?: EmailSwipeAction;
  rightSwipeAction?: EmailSwipeAction;
};

export function EmailInboxView({
  threads,
  isLoading,
  isSyncing = false,
  syncingLabel = "Syncing…",
  error,
  searchValue,
  showFilterButton,
  activeFilterCount,
  pendingThreadId,
  onClose,
  onSearchChange,
  onFilterPress,
  onRefreshInbox,
  onOpenThread,
  onOpenImage,
  leftSwipeAction,
  rightSwipeAction,
}: EmailInboxViewProps): React.JSX.Element {
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div ref={hideProgressContainerRef} className="relative flex-1 min-h-0">
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{
          transform:
            "translateY(calc(-1 * var(--header-height, 72px) * var(--scroll-hide-progress, 0)))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <EmailInboxHeader
          activeFilterCount={activeFilterCount}
          isLoading={isLoading}
          searchValue={searchValue}
          showFilterButton={showFilterButton}
          onFilterPress={onFilterPress}
          onSearchChange={onSearchChange}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={84}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={onRefreshInbox}
      >
        <div className="pt-24">
          <div className="flex flex-col gap-3 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2">
            {isSyncing ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                <span>{syncingLabel}</span>
              </div>
            ) : null}

            {isLoading && threads.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                />
              ))
            ) : null}

            {error ? (
              <div className="mx-4">
                <ContentCard>
                  <div className="flex flex-col gap-3 px-4 py-6">
                    <p className="text-sm text-muted-foreground">
                      Inbox threads could not be loaded.
                    </p>
                    <button
                      className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                      type="button"
                      onClick={() => {
                        void onRefreshInbox();
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </ContentCard>
              </div>
            ) : null}

            {!isLoading && !error && threads.length === 0 ? (
              <div className="mx-4">
                <ContentCard>
                  <p className="px-4 py-6 text-sm text-muted-foreground">
                    No coordinating email threads matched this search.
                  </p>
                </ContentCard>
              </div>
            ) : null}

            {!error
              ? threads.map((thread) => (
                  <EmailInboxThreadCard
                    key={thread.threadId}
                    leftSwipeAction={leftSwipeAction}
                    rightSwipeAction={rightSwipeAction}
                    swipeDisabled={pendingThreadId === thread.threadId}
                    thread={thread}
                    onOpenImage={onOpenImage}
                    onOpenThread={onOpenThread}
                  />
                ))
              : null}
          </div>
        </div>
      </PullToRefresh>

      {onClose ? <EmailInboxFooter onClose={onClose} /> : null}
    </div>
  );
}
