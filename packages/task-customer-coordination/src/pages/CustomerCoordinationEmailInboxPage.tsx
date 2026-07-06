import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  EmailInboxView,
  EmailThreadCarousel,
  EmailThreadView,
} from "@beyo/emails";

import { useCustomerCoordinationEmailInboxController } from "../controllers/use-customer-coordination-email-inbox.controller";
import type { CustomerCoordinationEmailInboxSurfaceProps } from "../surface-ids";

export function CustomerCoordinationEmailInboxPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<CustomerCoordinationEmailInboxSurfaceProps>();
  const controller = useCustomerCoordinationEmailInboxController({
    surfaceOpeners: props.surfaceOpeners,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
    return () => {
      header?.setHeaderHidden(false);
    };
  }, [header]);

  function closeSurface(): void {
    if (controller.closeSurface) {
      controller.closeSurface();
      return;
    }

    header?.requestClose();
  }

  return (
    <div className="h-full ">
      <EmailThreadCarousel
        activeIndex={controller.activeIndex}
        inboxPane={
          <EmailInboxView
            activeFilterCount={controller.activeFilterCount}
            error={controller.inboxError}
            isLoading={controller.isInboxLoading}
            isSyncing={controller.isInboxSyncing}
            leftSwipeAction={controller.inboxSwipeActions.left}
            pendingThreadId={controller.pendingThreadId}
            rightSwipeAction={controller.inboxSwipeActions.right}
            searchValue={controller.searchValue}
            showFilterButton
            threads={controller.threads}
            onClose={closeSurface}
            onFilterPress={controller.openFilterSheet}
            onOpenImage={controller.openImage}
            onOpenThread={controller.openThread}
            onRefreshInbox={controller.refreshInbox}
            onSearchChange={controller.setSearchValue}
          />
        }
        threadPane={
          <EmailThreadView
            error={controller.messagesError}
            footerReplyDisabled={controller.isMessagesLoading}
            headerActions={controller.threadHeaderActions}
            isLoading={controller.isMessagesLoading}
            isSyncing={controller.isMessagesSyncing}
            messages={controller.messages}
            subject={controller.selectedSubject}
            onBack={controller.goBack}
            onReply={controller.openReply}
            onOpenMessageDetails={controller.openMessageDetails}
            onRefreshThread={controller.refreshThread}
          />
        }
      />
    </div>
  );
}
