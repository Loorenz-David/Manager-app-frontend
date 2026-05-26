import { useEffect } from 'react';

import { cn } from '@/lib/utils';
import { useSurfaceHeader } from '@/hooks/use-surface-header';

import { useCaseConversationContext } from '../providers/CaseConversationProvider';
import { CaseConversationContextBanner } from './CaseConversationContextBanner';
import { CaseConversationHeader } from './CaseConversationHeader';

function ConversationLoadingShell(): React.JSX.Element {
  return (
    <div className="flex min-h-full flex-col bg-background pt-24">
      <div className="flex flex-1 flex-col gap-4 px-4 py-6">
        <div className="ml-auto h-16 w-40 animate-pulse rounded-3xl bg-card" />
        <div className="h-20 w-56 animate-pulse rounded-3xl bg-card" />
        <div className="ml-auto h-14 w-32 animate-pulse rounded-3xl bg-card" />
        <div className="mt-auto rounded-[2rem] border border-dashed border-border bg-card/60 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Preparing the conversation shell</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Task context, links, and state controls are loading.
          </p>
        </div>
      </div>
    </div>
  );
}

function ConversationPlaceholder(): React.JSX.Element {
  return (
    <div className="flex min-h-[calc(100dvh+8rem)] flex-col gap-4 px-4 pb-8 pt-6">
      <div className="ml-auto w-[78%] rounded-[1.75rem] bg-primary/14 px-4 py-3 text-sm text-foreground">
        Message bubbles and composer wiring arrive in the next plan.
      </div>
      <div className="w-[72%] rounded-[1.75rem] bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        This placeholder stays intentionally scrollable so the conversation chrome can be
        validated now.
      </div>
      <div className="ml-auto w-[64%] rounded-[1.75rem] bg-primary/10 px-4 py-3 text-sm text-foreground">
        The banner should collapse once reading starts.
      </div>
      <div className="w-[68%] rounded-[1.75rem] bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        PLAN_18 can replace this body with virtualization without reworking the scroll API.
      </div>
      <div className="mt-auto rounded-[2rem] border border-dashed border-border bg-card/70 px-6 py-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-foreground">Message timeline arrives next</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The shell, context banner, and state transition flow are now wired to live case data.
        </p>
      </div>
    </div>
  );
}

export function CaseConversationSlideView(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useCaseConversationContext();

  useEffect(() => {
    header?.setTitle('');
    header?.setActions(null);
    header?.setHeaderHidden(true);

    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  if (controller.isPendingCase && !controller.caseDetail) {
    return (
      <div className="relative min-h-full bg-background" data-testid="case-conversation-slide">
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
            <p className="text-sm text-muted-foreground">Case conversation could not be loaded.</p>
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
    >
      <CaseConversationHeader />
      <CaseConversationContextBanner />
      <div
        className={cn(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-background transition-[padding-top] duration-200 ease-out',
          controller.isContextBannerCollapsed ? 'pt-20' : 'pt-36',
        )}
        data-testid="case-conversation-scroll-container"
        onScroll={(event) => {
          controller.setBodyScrollTop(event.currentTarget.scrollTop);
        }}
      >
        <ConversationPlaceholder />
      </div>
    </div>
  );
}
