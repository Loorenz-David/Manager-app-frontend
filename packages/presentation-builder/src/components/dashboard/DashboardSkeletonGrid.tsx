import { AnnouncementCardGrid } from "./AnnouncementCardGrid";

function AnnouncementCardSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[#e7e7e7] bg-white">
      <div className="flex h-[184px] items-center justify-center bg-[#ececec]">
        <div className="h-[156px] w-[88px] rounded-[13px] bg-[#dcdcdc]" />
      </div>
      <div className="space-y-2 px-[15px] py-[14px]">
        <div className="h-4 w-2/3 rounded bg-[#ececec]" />
        <div className="h-3 w-1/2 rounded bg-[#f0f0f0]" />
      </div>
    </div>
  );
}

export function DashboardSkeletonGrid({
  count = 6,
}: {
  count?: number;
}): React.JSX.Element {
  return (
    <div data-testid="presentation-dashboard-skeleton-grid">
      <AnnouncementCardGrid>
        {Array.from({ length: count }, (_, index) => (
          <AnnouncementCardSkeleton key={index} />
        ))}
      </AnnouncementCardGrid>
    </div>
  );
}
