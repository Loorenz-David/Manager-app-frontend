import { useState } from "react";

import { AnnouncementCard } from "../components/dashboard/AnnouncementCard";
import { AnnouncementCardGrid } from "../components/dashboard/AnnouncementCardGrid";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardErrorState } from "../components/dashboard/DashboardErrorState";
import { DashboardFilterRow } from "../components/dashboard/DashboardFilterRow";
import { DashboardSkeletonGrid } from "../components/dashboard/DashboardSkeletonGrid";
import { DashboardTopBar } from "../components/dashboard/DashboardTopBar";
import { NewAnnouncementCard } from "../components/dashboard/NewAnnouncementCard";
import type {
  AnnouncementCardData,
  DashboardFilterKey,
} from "../components/dashboard/types";

const MOCK_CARDS: AnnouncementCardData[] = [
  {
    id: "aup_mock_q3",
    title: "Q3 Product Update",
    displayStatus: "published",
    metaLine: "3 slides · edited 2 days ago",
    mediaKinds: ["image", "video", "image"],
  },
  {
    id: "aup_mock_summer",
    title: "Summer office hours",
    displayStatus: "draft",
    metaLine: "2 slides · edited yesterday",
    mediaKinds: ["image", "image"],
  },
  {
    id: "aup_mock_security",
    title: "New security policy",
    displayStatus: "scheduled",
    metaLine: "3 slides · sends Jul 25",
    mediaKinds: ["image", "image", "video"],
  },
  {
    id: "aup_mock_hires",
    title: "Welcome, new hires",
    displayStatus: "published",
    metaLine: "1 slide · edited Jul 10",
    mediaKinds: ["image"],
    versionLabel: "v2",
  },
  {
    id: "aup_mock_retired",
    title: "Old workflow reminder",
    displayStatus: "archived",
    metaLine: "2 slides · archived Jul 02",
    mediaKinds: ["image"],
  },
  {
    id: "aup_mock_long",
    title: "A very long announcement title that should truncate gracefully in the card body",
    displayStatus: "draft",
    metaLine: "6 slides · edited 3 hours ago · a long meta line that also truncates",
    mediaKinds: ["video"],
  },
];

function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <p className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a] first:mt-0">
      {children}
    </p>
  );
}

/**
 * DEV-ONLY showcase of the Phase 3 dashboard component kit with mock data.
 * Mounted by the studio app behind an import.meta.env.DEV route; never linked in production UI.
 */
export function DashboardKitPreview(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<DashboardFilterKey>("all");
  const noop = () => undefined;

  return (
    <div
      data-testid="presentation-dashboard-kit-preview-scroll"
      className="h-screen overflow-y-auto bg-[#ededed] pb-16"
    >
      <div className="mx-auto max-w-[1180px]">
        <div className="overflow-hidden rounded-b-2xl bg-[#f4f4f4] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.28)]">
          <DashboardTopBar
            workspaceName="ManagerBeyo"
            searchValue={search}
            onSearchChange={setSearch}
            userInitials="MK"
          />
          <div className="space-y-[18px] p-5">
            <DashboardFilterRow
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onNewAnnouncement={noop}
            />
            <AnnouncementCardGrid>
              <NewAnnouncementCard onClick={noop} />
              {MOCK_CARDS.map((card) => (
                <AnnouncementCard key={card.id} announcement={card} onOpen={noop} />
              ))}
            </AnnouncementCardGrid>
          </div>
        </div>

        <div className="px-5">
          <SectionLabel>Loading state</SectionLabel>
          <DashboardSkeletonGrid count={3} />

          <SectionLabel>Empty state</SectionLabel>
          <DashboardEmptyState
            title="No announcements yet"
            description="Create your first announcement and it will show up here for the whole workspace."
          />

          <SectionLabel>Empty state — filtered</SectionLabel>
          <DashboardEmptyState title="No drafts" description="Nothing in progress right now." />

          <SectionLabel>Error state</SectionLabel>
          <DashboardErrorState onRetry={noop} />
        </div>
      </div>
    </div>
  );
}
