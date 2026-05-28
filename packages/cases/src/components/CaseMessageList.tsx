import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

import { cn } from "@beyo/lib";

import { useCaseConversationMessagesContext } from "../providers/CaseConversationProvider";
import { CaseMessageRow } from "./CaseMessageRow";

const PREPEND_STABLE_BASE_INDEX = 10_000;
const OLDER_MESSAGES_PREFETCH_TOP_PX = 96;
const FOOTER_BOTTOM_OFFSET_STYLE = {
  height:
    "var(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem))",
} as CSSProperties;

// Defined outside the component so the function reference is stable across renders.
// Virtuoso treats a new component function reference as a different component type
// and will unmount/remount it, causing a brief height-0 flash that shifts scroll.
function VirtuosoFooter() {
  return <div style={FOOTER_BOTTOM_OFFSET_STYLE} />;
}

function VirtuosoEmptyPlaceholder() {
  return (
    <div className="flex min-h-full items-end px-4 pb-(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem)) pt-8">
      <div className="w-full rounded-4xl border border-dashed border-border bg-card/70 px-6 py-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-foreground">No messages yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The conversation thread is ready for the upcoming composer flow.
        </p>
      </div>
    </div>
  );
}

// Stable components object — defined outside the component so the reference never
// changes across renders. Virtuoso treats a new reference as a different component
// type and unmounts/remounts the slot, producing a height-0 flash that misfires
// followOutput and jumps the scroll to the bottom.
const VIRTUOSO_COMPONENTS = {
  Footer: VirtuosoFooter,
  EmptyPlaceholder: VirtuosoEmptyPlaceholder,
};

type CaseMessageListProps = {
  onScrollerRef: (element: HTMLElement | null) => void;
};

export function CaseMessageList({
  onScrollerRef,
}: CaseMessageListProps): React.JSX.Element {
  const controller = useCaseConversationMessagesContext();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [scrollerElement, setScrollerElement] = useState<HTMLElement | null>(
    null,
  );
  const [isScrollVisibilityReady, setIsScrollVisibilityReady] = useState(false);
  const hasPerformedInitialBottomScrollRef = useRef(false);

  // Captured once when items first arrive — stable initial scroll target.
  const initialTopMostItemIndexRef = useRef<
    { index: number; align: "end" } | 0
  >(0);
  if (controller.items.length > 0 && initialTopMostItemIndexRef.current === 0) {
    initialTopMostItemIndexRef.current = {
      index: controller.items.length - 1,
      align: "end",
    };
  }

  // Tracks prepended item count synchronously during render so firstItemIndex
  // and data are always in sync in the same commit.
  const prependTrackerRef = useRef({
    prevPageCount: 0,
    prevItemCount: 0,
    prependedCount: 0,
  });
  const tracker = prependTrackerRef.current;
  if (controller.pageCount !== tracker.prevPageCount) {
    if (
      controller.pageCount > tracker.prevPageCount &&
      tracker.prevPageCount > 0
    ) {
      const delta = controller.items.length - tracker.prevItemCount;
      if (delta > 0) tracker.prependedCount += delta;
    }
    tracker.prevPageCount = controller.pageCount;
  }
  tracker.prevItemCount = controller.items.length;
  const firstItemIndex = PREPEND_STABLE_BASE_INDEX - tracker.prependedCount;

  useEffect(() => {
    if (!scrollerElement) {
      return;
    }

    scrollerElement.style.overflowAnchor = "none";

    const handleScroll = () => {
      const maxScrollTop = Math.max(
        0,
        scrollerElement.scrollHeight - scrollerElement.clientHeight,
      );
      controller.handleListScroll({
        distanceFromBottom: maxScrollTop - scrollerElement.scrollTop,
      });

      // Trigger older-page fetch slightly before absolute top to reduce
      // visible anchor compensation jumps during prepend.
      if (scrollerElement.scrollTop <= OLDER_MESSAGES_PREFETCH_TOP_PX) {
        controller.loadOlder();
      }
    };

    handleScroll();
    scrollerElement.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollerElement.removeEventListener("scroll", handleScroll);
      scrollerElement.style.overflowAnchor = "";
    };
  }, [controller, scrollerElement]);

  useEffect(() => {
    if (controller.pageCount > 0 && controller.items.length === 0) {
      setIsScrollVisibilityReady(true);
    }
  }, [controller.items.length, controller.pageCount]);

  useEffect(() => {
    if (
      controller.items.length === 0 ||
      hasPerformedInitialBottomScrollRef.current
    ) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index: controller.items.length - 1,
      align: "end",
      behavior: "auto",
    });
    hasPerformedInitialBottomScrollRef.current = true;
    setIsScrollVisibilityReady(true);
  }, [controller.items.length]);

  useEffect(() => {
    if (
      controller.scrollToBottomRequestVersion === 0 ||
      controller.items.length === 0
    ) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index: controller.items.length - 1,
      align: "end",
      behavior: "auto",
    });
  }, [controller.items.length, controller.scrollToBottomRequestVersion]);

  useEffect(() => {
    if (!isScrollVisibilityReady) {
      onScrollerRef(null);
      return;
    }

    onScrollerRef(scrollerElement);

    return () => {
      onScrollerRef(null);
    };
  }, [isScrollVisibilityReady, onScrollerRef, scrollerElement]);

  if (controller.isError && controller.items.length === 0) {
    return (
      <div
        className={cn("flex min-h-0 flex-1 flex-col bg-background")}
        data-testid="case-message-list"
      >
        <div className="flex flex-1 items-center justify-center px-6 pb-(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem))">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Messages could not be loaded.
            </p>
            <button
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
              onClick={() => {
                void controller.retry();
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 bg-background transition-opacity duration-100",
        isScrollVisibilityReady ? "opacity-100" : "opacity-0",
      )}
      data-testid="case-message-list"
    >
      <Virtuoso
        ref={virtuosoRef}
        alignToBottom
        className="h-full"
        components={VIRTUOSO_COMPONENTS}
        computeItemKey={(_index, item) => item.key}
        data={controller.items}
        data-testid="case-conversation-scroll-container"
        defaultItemHeight={420}
        firstItemIndex={firstItemIndex}
        followOutput={(isAtBottom) => (isAtBottom ? "auto" : false)}
        increaseViewportBy={{ top: 600, bottom: 320 }}
        initialTopMostItemIndex={initialTopMostItemIndexRef.current}
        itemContent={(_index, item) => <CaseMessageRow item={item} />}
        scrollerRef={(element) => {
          const nextElement = element instanceof HTMLElement ? element : null;
          setScrollerElement(nextElement);
        }}
        startReached={() => {
          controller.loadOlder();
        }}
      />
    </div>
  );
}
