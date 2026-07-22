import { AnnouncementCard } from "../components/dashboard/AnnouncementCard";
import { AnnouncementCardGrid } from "../components/dashboard/AnnouncementCardGrid";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardErrorState } from "../components/dashboard/DashboardErrorState";
import { DashboardFilterRow } from "../components/dashboard/DashboardFilterRow";
import { DashboardSkeletonGrid } from "../components/dashboard/DashboardSkeletonGrid";
import { DashboardTopBar } from "../components/dashboard/DashboardTopBar";
import { NewAnnouncementCard } from "../components/dashboard/NewAnnouncementCard";
import {
  PresentationDashboardProvider,
  usePresentationDashboardContext,
} from "../providers/PresentationDashboardProvider";

export type DashboardViewProps = {
  navigateToEditor: (id: string) => void;
  workspaceName: string;
  userName: string;
  userAvatarUrl?: string | null;
};

function DashboardViewContent(): React.JSX.Element {
  const dashboard = usePresentationDashboardContext();

  let content: React.JSX.Element;
  if (dashboard.isPending) {
    content = <DashboardSkeletonGrid />;
  } else if (dashboard.isError) {
    content = (
      <DashboardErrorState message={dashboard.errorMessage} onRetry={dashboard.retry} />
    );
  } else if (dashboard.cards.length === 0) {
    content = (
      <DashboardEmptyState
        title={dashboard.emptyTitle}
        description={dashboard.emptyDescription}
      />
    );
  } else {
    content = (
      <AnnouncementCardGrid>
        <NewAnnouncementCard
          onClick={dashboard.createAndOpen}
          disabled={dashboard.newAnnouncementDisabled}
        />
        {dashboard.cards.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            onOpen={dashboard.navigateToEditor}
            onArchive={announcement.displayStatus === "archived" ? undefined : dashboard.archive}
            archiveDisabled={dashboard.archiveDisabled}
          />
        ))}
      </AnnouncementCardGrid>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#ededed] pb-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="overflow-hidden rounded-b-2xl bg-[#f4f4f4] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.28)]">
          <DashboardTopBar
            workspaceName={dashboard.workspaceName}
            searchValue={dashboard.searchValue}
            onSearchChange={dashboard.setSearchValue}
            userInitials={dashboard.userInitials}
            userAvatarUrl={dashboard.userAvatarUrl}
          />
          <div className="space-y-[18px] p-5">
            <DashboardFilterRow
              activeFilter={dashboard.activeFilter}
              onFilterChange={dashboard.setActiveFilter}
              onNewAnnouncement={dashboard.createAndOpen}
              newAnnouncementDisabled={dashboard.newAnnouncementDisabled}
            />
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardView({
  navigateToEditor,
  workspaceName,
  userName,
  userAvatarUrl,
}: DashboardViewProps): React.JSX.Element {
  return (
    <PresentationDashboardProvider
      navigateToEditor={navigateToEditor}
      workspaceName={workspaceName}
      userName={userName}
      userAvatarUrl={userAvatarUrl}
    >
      <DashboardViewContent />
    </PresentationDashboardProvider>
  );
}
