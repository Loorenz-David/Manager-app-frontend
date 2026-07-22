import { AnnouncementStatusPill } from "./AnnouncementStatusPill";
import { MiniPhoneCover } from "./MiniPhoneCover";
import type { AnnouncementCardData } from "./types";

type AnnouncementCardProps = {
  announcement: AnnouncementCardData;
  onOpen: (id: string) => void;
};

export function AnnouncementCard({
  announcement,
  onOpen,
}: AnnouncementCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onOpen(announcement.id)}
      data-testid={`presentation-announcement-card-${announcement.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-[#e7e7e7] bg-white text-left transition-shadow duration-150 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
    >
      <div className="relative flex h-[184px] items-center justify-center bg-[#ececec]">
        <MiniPhoneCover
          mediaKinds={announcement.mediaKinds}
          coverImageUrl={announcement.coverImageUrl}
        />
        <AnnouncementStatusPill
          status={announcement.displayStatus}
          className="absolute right-3 top-3"
        />
      </div>
      <div className="px-[15px] py-[14px]">
        <div className="flex items-center gap-1.5">
          <span
            data-testid={`presentation-announcement-card-title-${announcement.id}`}
            className="truncate text-[14.5px] font-bold leading-5 text-[#303030]"
          >
            {announcement.title}
          </span>
          {announcement.versionLabel && (
            <span className="shrink-0 rounded-[4px] bg-[#f0f0f0] px-1 py-px font-mono text-[9.5px] font-semibold text-[#767676]">
              {announcement.versionLabel}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs leading-4 text-[#9a9a9a]">
          {announcement.metaLine}
        </p>
      </div>
    </button>
  );
}
