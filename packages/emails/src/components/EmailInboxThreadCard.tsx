import { Send, TriangleAlert } from "lucide-react";

import { cn, formatInboxDate } from "@beyo/lib";
import { ImagePlaceholder, SwipeableRow } from "@beyo/ui";

import type { EmailInboxThreadVM, EmailSwipeAction } from "../types";

type EmailInboxThreadCardProps = {
  thread: EmailInboxThreadVM;
  onOpenThread: (thread: EmailInboxThreadVM) => void;
  onOpenImage: (thread: EmailInboxThreadVM) => void;
  leftSwipeAction?: EmailSwipeAction;
  rightSwipeAction?: EmailSwipeAction;
  swipeDisabled?: boolean;
};

function getSwipeClassName(tone: EmailSwipeAction["tone"]): string {
  return tone === "success"
    ? "bg-[var(--color-success)]"
    : "bg-[var(--color-destructive)]";
}

function ThreadStatusIcon({
  thread,
}: {
  thread: EmailInboxThreadVM;
}): React.JSX.Element | null {
  if (thread.lastMessageDirection !== "outbound") {
    return null;
  }

  if (thread.lastMessageSendError) {
    return (
      <TriangleAlert
        aria-hidden="true"
        className="size-3.5 shrink-0 text-[var(--color-warning)]"
      />
    );
  }

  return (
    <Send
      aria-hidden="true"
      className="size-3.5 shrink-0 text-[var(--color-success)]"
    />
  );
}

export function EmailInboxThreadCard({
  thread,
  onOpenThread,
  onOpenImage,
  leftSwipeAction,
  rightSwipeAction,
  swipeDisabled = false,
}: EmailInboxThreadCardProps): React.JSX.Element {
  return (
    <SwipeableRow
      disabled={swipeDisabled}
      leftToRightAction={
        leftSwipeAction
          ? {
              className: getSwipeClassName(leftSwipeAction.tone),
              icon: leftSwipeAction.icon,
              label: leftSwipeAction.label,
            }
          : undefined
      }
      rightToLeftAction={
        rightSwipeAction
          ? {
              className: getSwipeClassName(rightSwipeAction.tone),
              icon: rightSwipeAction.icon,
              label: rightSwipeAction.label,
            }
          : undefined
      }
      onSwipeLeftToRight={() => leftSwipeAction?.onCommit(thread)}
      onSwipeRightToLeft={() => rightSwipeAction?.onCommit(thread)}
    >
      <div className="mx-4 flex overflow-hidden rounded-xl bg-card shadow-sm border border-between-border">
        <button
          aria-label={thread.imageUrl ? "Open item image" : undefined}
          className={cn(
            "relative aspect-square w-28 shrink-0 overflow-hidden bg-muted",
            thread.imageUrl
              ? "cursor-pointer"
              : "pointer-events-none cursor-default",
          )}
          disabled={!thread.imageUrl}
          type="button"
          onClick={() => {
            onOpenImage(thread);
          }}
        >
          {thread.imageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={thread.imageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
          )}

          {thread.quantity != null ? (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
              #{thread.quantity}
            </span>
          ) : null}
        </button>

        <button
          className={cn(
            "flex min-w-0 flex-1 flex-col px-3 py-2.5 text-left",
            thread.isUnread ? "opacity-100" : "opacity-80",
          )}
          type="button"
          onClick={() => {
            onOpenThread(thread);
          }}
        >
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {thread.title}
            </span>

            {thread.messageCount != null ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {thread.messageCount}
              </span>
            ) : null}

            <div className="flex shrink-0 items-center gap-1">
              <ThreadStatusIcon thread={thread} />
              <span className="text-xs text-muted-foreground">
                {formatInboxDate(thread.timeIso)}
              </span>
              {thread.isUnread ? (
                <span className="size-2 rounded-full bg-sky-500" />
              ) : null}
            </div>
          </div>

          <p className="mt-1 truncate text-sm text-foreground">
            {thread.subject || "No subject"}
          </p>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {thread.preview || "No preview available"}
          </p>
        </button>
      </div>
    </SwipeableRow>
  );
}
