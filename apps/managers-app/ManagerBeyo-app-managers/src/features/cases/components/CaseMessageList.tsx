import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

import { cn } from '@/lib/utils';

import { useCaseConversationMessagesContext } from '../providers/CaseConversationProvider';
import { CaseMessageRow } from './CaseMessageRow';

const PREPEND_STABLE_BASE_INDEX = 10_000;
const FOOTER_BOTTOM_OFFSET_STYLE = {
  height: 'var(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem))',
} as CSSProperties;

type CaseMessageListProps = {
  topSpacingClassName: string;
};

export function CaseMessageList({
  topSpacingClassName,
}: CaseMessageListProps): React.JSX.Element {
  const controller = useCaseConversationMessagesContext();
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [firstItemIndex, setFirstItemIndex] = useState(PREPEND_STABLE_BASE_INDEX);
  const [scrollerElement, setScrollerElement] = useState<HTMLElement | null>(null);
  const previousItemCountRef = useRef(controller.items.length);
  const previousPageCountRef = useRef(controller.pageCount);
  const hasPerformedInitialBottomScrollRef = useRef(false);

  useEffect(() => {
    const previousPageCount = previousPageCountRef.current;
    const previousItemCount = previousItemCountRef.current;

    if (controller.pageCount > previousPageCount && previousPageCount > 0) {
      const prependedItemCount = controller.items.length - previousItemCount;

      if (prependedItemCount > 0) {
        // Virtuoso preserves the viewport anchor for prepended data by shifting
        // firstItemIndex down by exactly the number of newly inserted render items.
        setFirstItemIndex((value) => value - prependedItemCount);
      }
    }

    previousItemCountRef.current = controller.items.length;
    previousPageCountRef.current = controller.pageCount;
  }, [controller.items.length, controller.pageCount]);

  useEffect(() => {
    if (!scrollerElement) {
      return;
    }

    const handleScroll = () => {
      const maxScrollTop = Math.max(0, scrollerElement.scrollHeight - scrollerElement.clientHeight);
      controller.handleListScroll(maxScrollTop - scrollerElement.scrollTop);
    };

    handleScroll();
    scrollerElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollerElement.removeEventListener('scroll', handleScroll);
    };
  }, [controller, scrollerElement]);

  useEffect(() => {
    if (controller.items.length === 0 || hasPerformedInitialBottomScrollRef.current) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index: controller.items.length - 1,
      align: 'end',
      behavior: 'auto',
    });
    hasPerformedInitialBottomScrollRef.current = true;
  }, [controller.items.length]);

  useEffect(() => {
    if (controller.scrollToBottomRequestVersion === 0 || controller.items.length === 0) {
      return;
    }

    virtuosoRef.current?.scrollToIndex({
      index: controller.items.length - 1,
      align: 'end',
      behavior: 'auto',
    });
  }, [controller.items.length, controller.scrollToBottomRequestVersion]);

  if (controller.isError && controller.items.length === 0) {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', topSpacingClassName)} data-testid="case-message-list">
        <div
          className="flex flex-1 items-center justify-center px-6 pb-[var(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem))]"
        >
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Messages could not be loaded.</p>
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
    <div className={cn('min-h-0 flex-1', topSpacingClassName)} data-testid="case-message-list">
      <Virtuoso
        ref={virtuosoRef}
        alignToBottom
        className="h-full"
        computeItemKey={(_index, item) => item.key}
        data={controller.items}
        data-testid="case-conversation-scroll-container"
        defaultItemHeight={88}
        firstItemIndex={firstItemIndex}
        followOutput={(isAtBottom) => (isAtBottom ? 'auto' : false)}
        increaseViewportBy={{ top: 240, bottom: 320 }}
        initialTopMostItemIndex={
          controller.items.length > 0
            ? {
                index: controller.items.length - 1,
                align: 'end',
              }
            : 0
        }
        itemContent={(_index, item) => <CaseMessageRow item={item} />}
        scrollerRef={(element) => {
          setScrollerElement(element instanceof HTMLElement ? element : null);
        }}
        startReached={() => {
          controller.loadOlder();
        }}
        totalCount={controller.items.length}
        components={{
          EmptyPlaceholder: () => (
            <div
              className="flex min-h-full items-end px-4 pb-[var(--case-conversation-bottom-offset,calc(var(--safe-bottom,0px)+6rem))] pt-8"
            >
              <div className="w-full rounded-[2rem] border border-dashed border-border bg-card/70 px-6 py-8 text-center shadow-sm">
                <p className="text-sm font-semibold text-foreground">No messages yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The conversation thread is ready for the upcoming composer flow.
                </p>
              </div>
            </div>
          ),
          Footer: () => <div style={FOOTER_BOTTOM_OFFSET_STYLE} />,
          Header: () =>
            controller.isLoadingOlder ? (
              <div className="flex justify-center px-4 py-3">
                <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                  Loading older messages...
                </span>
              </div>
            ) : (
              <div className="h-3" />
            ),
        }}
      />
    </div>
  );
}
