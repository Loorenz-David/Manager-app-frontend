import { cn } from "@beyo/lib";

import type { AnnouncementDisplayStatus } from "./types";

const STATUS_LABEL: Record<AnnouncementDisplayStatus, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const STATUS_CLASS: Record<AnnouncementDisplayStatus, string> = {
  published: "bg-[rgba(63,120,168,0.15)] text-[#2c5372]",
  draft: "bg-[#eeeeee] text-[#767676]",
  scheduled: "bg-[#f6ecd6] text-[#a9791b]",
  archived: "bg-[#ececec] text-[#9a9a9a]",
};

type AnnouncementStatusPillProps = {
  status: AnnouncementDisplayStatus;
  className?: string;
};

export function AnnouncementStatusPill({
  status,
  className,
}: AnnouncementStatusPillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[20px] px-2.5 py-[3px] text-[10.5px] font-bold leading-[15px]",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
