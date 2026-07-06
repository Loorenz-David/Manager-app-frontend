import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { EmailComposer } from "@beyo/emails";
import { ContentCard, useScrollHide } from "@beyo/ui";

import { useCustomerCoordinationEmailReplySlideController } from "../controllers/use-customer-coordination-email-reply-slide.controller";
import type { CustomerCoordinationEmailReplySlideSurfaceProps } from "../surface-ids";

function CustomerCoordinationReplyFooter({
  isSending,
  sendDisabled,
  onBack,
  onSend,
}: {
  isSending: boolean;
  sendDisabled: boolean;
  onBack: () => void;
  onSend: () => void;
}): React.JSX.Element {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      style={{
        transform: "translateY(calc(var(--scroll-hide-progress, 0) * 100%))",
        opacity: "calc(1 - var(--scroll-hide-progress, 0))",
        transition:
          "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
      }}
    >
      <div className="bg-background shadow-[0_-1px_0_0_var(--color-border)]">
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
          <button
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
            <span>Back</span>
          </button>
          <button
            className="rounded-2xl bg-primary px-5 py-3.5 text-md font-semibold text-card shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={sendDisabled}
            type="button"
            onClick={onSend}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
        <div aria-hidden="true" className="h-(--safe-bottom,0px) bg-background" />
      </div>
    </div>
  );
}

export function CustomerCoordinationEmailReplySlidePage(): React.JSX.Element {
  const props = useSurfaceProps<CustomerCoordinationEmailReplySlideSurfaceProps>();
  const header = useSurfaceHeader();
  const taskId = props.taskId ?? "";
  const threadId = props.threadId ?? "";
  const controller = useCustomerCoordinationEmailReplySlideController({
    taskId,
    threadId,
    surfaceOpeners: props.surfaceOpeners,
  });
  const { scrollRef, hideProgressContainerRef } = useScrollHide();

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex h-full min-h-0 flex-col bg-background"
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-none"
      >
        <div className="flex flex-col gap-4 px-4 pb-[calc(var(--safe-bottom,0)+7rem)] pt-4">
          <div className="px-1">
            <h1 className="text-lg font-semibold text-foreground">Reply</h1>
            <p className="text-sm text-muted-foreground">
              Compose a reply for this coordination thread.
            </p>
          </div>

          {controller.isInitialLoading ? (
            <ContentCard>
              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
                <div className="h-48 animate-pulse rounded-xl bg-muted" />
              </div>
            </ContentCard>
          ) : (
            <ContentCard>
              <div className="py-4">
                <EmailComposer
                  disabled={controller.isSending}
                  selectedTemplate={controller.selectedTemplate}
                  subject={controller.subject}
                  surfaceOpeners={props.surfaceOpeners}
                  textBody={controller.textBody}
                  onSelectTemplate={controller.applyTemplate}
                  onSubjectChange={controller.setSubject}
                  onTextBodyChange={controller.setTextBody}
                />
              </div>
            </ContentCard>
          )}
        </div>
      </div>

      <CustomerCoordinationReplyFooter
        isSending={controller.isSending}
        sendDisabled={controller.sendDisabled}
        onBack={() => {
          controller.closeSurface?.();
        }}
        onSend={() => {
          void controller.handleSend();
        }}
      />
    </div>
  );
}
