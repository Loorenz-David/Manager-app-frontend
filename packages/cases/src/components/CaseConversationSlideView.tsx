import { useEffect, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import { ScrollVisibilityProvider } from "@beyo/ui";
import { useSurfaceHeader } from "@beyo/hooks";

import {
  useCaseConversationContext,
  useCaseConversationMessagesContext,
} from "../providers/CaseConversationProvider";
import { CaseConversationContextBanner } from "./CaseConversationContextBanner";
import { CaseConversationHeader } from "./CaseConversationHeader";
import { CaseMessageList } from "./CaseMessageList";
import { CaseBasicComposer } from "./composer/CaseBasicComposer";
import { CaseRichComposer } from "./composer/CaseRichComposer";

const CONVERSATION_LAYOUT_STYLE = {
  "--case-conversation-bottom-offset": "calc(var(--safe-bottom,0px) + 9.75rem)",
} as CSSProperties;

const SCROLL_TO_BOTTOM_CTA_THRESHOLD_PX = 600;

function ConversationLoadingShell(): React.JSX.Element {
  return (
    <div className="flex min-h-full flex-col bg-background pt-24">
      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="ml-auto h-16 w-40 animate-pulse rounded-3xl bg-card" />
        <div className="h-20 w-56 animate-pulse rounded-3xl bg-card" />
        <div className="ml-auto h-14 w-32 animate-pulse rounded-3xl bg-card" />
        <div className="mt-auto rounded-4xl border border-dashed border-border bg-card/60 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Preparing the conversation shell
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Case details and messages are loading.
          </p>
        </div>
      </div>
    </div>
  );
}

export function CaseConversationSlideView(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useCaseConversationContext();
  const messagesController = useCaseConversationMessagesContext();
  const [isRichComposerToolbarVisible, setIsRichComposerToolbarVisible] =
    useState(false);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const hasMessages = messagesController.items.length > 0;
  const showScrollToBottomCta =
    hasMessages &&
    messagesController.distanceFromBottom > SCROLL_TO_BOTTOM_CTA_THRESHOLD_PX &&
    !isRichComposerToolbarVisible;

  useEffect(() => {
    header?.setTitle("");
    header?.setActions(null);
    header?.setHeaderHidden(true);

    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  // Keep loading shell until BOTH case detail AND the initial message page are ready.
  // Without this guard, useGetCaseQuery can resolve before useCaseConversationMessagesQuery,
  // switching to the full layout with an empty Virtuoso list, then re-rendering when
  // messages arrive — producing the visible double-render flicker.
  const isInitialLoading =
    (controller.isPendingCase && !controller.caseDetail) ||
    messagesController.isLoadingInitial;

  if (isInitialLoading) {
    return (
      <div
        className="relative min-h-full bg-background"
        data-testid="case-conversation-slide"
      >
        <CaseConversationHeader />
        <ConversationLoadingShell />
      </div>
    );
  }

  if (controller.isError || !controller.caseDetail) {
    return (
      <div
        className="relative flex min-h-full flex-col bg-background"
        data-testid="case-conversation-slide"
      >
        <CaseConversationHeader />
        <div className="flex flex-1 items-center justify-center px-6 pt-24 pb-8">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Case conversation could not be loaded.
            </p>
            <button
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
              onClick={() => {
                void controller.refetch();
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
      className="relative flex h-full min-h-full flex-col overflow-hidden bg-background pt-(--safe-top)"
      data-testid="case-conversation-slide"
      style={CONVERSATION_LAYOUT_STYLE}
    >
      <ScrollVisibilityProvider
        inverted
        hysteresis={16}
        scrollElement={scrollElement}
        threshold={56}
      >
        <div className="relative shrink-0">
          <CaseConversationHeader />
          <CaseConversationContextBanner />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <CaseMessageList onScrollerRef={setScrollElement} />
        </div>
      </ScrollVisibilityProvider>
      {messagesController.isLoadingOlder ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+5rem)] z-10 flex justify-center px-4 py-3">
          <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
            Loading older messages...
          </span>
        </div>
      ) : null}
      {hasMessages ? (
        <button
          aria-hidden={!showScrollToBottomCta}
          className={`absolute left-1/2 bottom-[calc(var(--safe-bottom,0)+5.50rem)] z-30 flex size-11 -translate-x-1/2 transform-gpu items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md will-change-[opacity] transition-opacity hover:bg-muted ${
            showScrollToBottomCta
              ? "pointer-events-auto opacity-100 duration-180 ease-out"
              : "pointer-events-none opacity-0 duration-90 ease-linear"
          }`}
          data-testid="case-scroll-to-bottom-button"
          onClick={messagesController.scrollToBottom}
          type="button"
        >
          <ChevronDown aria-hidden="true" className="size-5" />
        </button>
      ) : null}
      {controller.composerMode === "rich" ? (
        <CaseRichComposer
          onToolbarVisibilityChange={setIsRichComposerToolbarVisible}
        />
      ) : (
        <CaseBasicComposer />
      )}
    </div>
  );
}
