import { useEffect, type CSSProperties } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { useSurfaceHeader } from "@/hooks/use-surface-header";

import {
  useCaseConversationContext,
  useCaseConversationMessagesContext,
} from "../providers/CaseConversationProvider";
import { CaseConversationContextBanner } from "./CaseConversationContextBanner";
import { CaseConversationHeader } from "./CaseConversationHeader";
import { CaseMessageList } from "./CaseMessageList";
import { CaseBasicComposer } from "./composer/CaseBasicComposer";

const CONVERSATION_LAYOUT_STYLE = {
  "--case-conversation-bottom-offset": "calc(var(--safe-bottom,0px) + 9.75rem)",
} as CSSProperties;

const SCROLL_TO_BOTTOM_CTA_THRESHOLD_PX = 120;

function ConversationLoadingShell(): React.JSX.Element {
  return (
    <div className="flex min-h-full flex-col bg-background pt-24">
      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="ml-auto h-16 w-40 animate-pulse rounded-3xl bg-card" />
        <div className="h-20 w-56 animate-pulse rounded-3xl bg-card" />
        <div className="ml-auto h-14 w-32 animate-pulse rounded-3xl bg-card" />
        <div className="mt-auto rounded-[2rem] border border-dashed border-border bg-card/60 px-5 py-6 text-center">
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
  const showScrollToBottomCta =
    messagesController.items.length > 0 &&
    messagesController.distanceFromBottom > SCROLL_TO_BOTTOM_CTA_THRESHOLD_PX;

  useEffect(() => {
    header?.setTitle("");
    header?.setActions(null);
    header?.setHeaderHidden(true);

    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  if (controller.isPendingCase && !controller.caseDetail) {
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
      className="relative flex h-full min-h-full flex-col overflow-hidden bg-background"
      data-testid="case-conversation-slide"
      style={CONVERSATION_LAYOUT_STYLE}
    >
      <CaseConversationHeader />
      <CaseConversationContextBanner />
      <CaseMessageList
        isContextBannerCollapsed={controller.isContextBannerCollapsed}
      />
      <AnimatePresence>
        {showScrollToBottomCta ? (
          <m.button
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            className="absolute left-1/2 bottom-[calc(var(--safe-bottom,0)+6.75rem)] z-30 flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors duration-150 hover:bg-muted"
            data-testid="case-scroll-to-bottom-button"
            exit={{ opacity: 0, x: "-50%", y: 10 }}
            initial={{ opacity: 0, x: "-50%", y: 14 }}
            onClick={messagesController.scrollToBottom}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            type="button"
          >
            <ChevronDown aria-hidden="true" className="size-5" />
          </m.button>
        ) : null}
      </AnimatePresence>
      <CaseBasicComposer />
    </div>
  );
}
