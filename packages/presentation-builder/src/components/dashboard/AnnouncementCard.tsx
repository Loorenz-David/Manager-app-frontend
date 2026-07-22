import { Archive, MoreVertical } from "lucide-react";
import { useState } from "react";

import { AnnouncementStatusPill } from "./AnnouncementStatusPill";
import { MiniPhoneCover } from "./MiniPhoneCover";
import type { AnnouncementCardData } from "./types";

type AnnouncementCardProps = {
  announcement: AnnouncementCardData;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  archiveDisabled?: boolean;
  onCoverError?: () => void;
};

export function AnnouncementCard({
  announcement,
  onOpen,
  onArchive,
  archiveDisabled,
  onCoverError,
}: AnnouncementCardProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const card = (
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
          onCoverError={onCoverError}
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
  if (!onArchive) return card;
  return (
    <div className="relative">
      {card}
      <button
        type="button"
        aria-label={`Actions for ${announcement.title}`}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
        data-testid={`presentation-announcement-card-menu-${announcement.id}`}
        className="absolute left-3 top-3 z-10 flex size-7 items-center justify-center rounded-lg bg-white/90 text-[#767676] shadow-sm hover:bg-white hover:text-[#303030] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]"
      >
        <MoreVertical aria-hidden className="size-4" strokeWidth={2} />
      </button>
      {menuOpen && (
        <div className="absolute left-3 top-11 z-20 min-w-[120px] rounded-lg border border-[#e7e7e7] bg-white p-1 shadow-lg">
          <button
            type="button"
            disabled={archiveDisabled}
            onClick={() => {
              setMenuOpen(false);
              onArchive(announcement.id);
            }}
            data-testid={`presentation-announcement-card-archive-${announcement.id}`}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-semibold text-[#303030] hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive aria-hidden className="size-3.5" strokeWidth={2} />
            Archive
          </button>
        </div>
      )}
    </div>
  );
}
