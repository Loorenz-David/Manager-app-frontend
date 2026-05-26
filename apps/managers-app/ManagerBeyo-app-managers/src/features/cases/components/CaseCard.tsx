import { memo } from "react";
import { ChevronRight } from "lucide-react";

import type { CaseId } from "@/types/common";

import type { CaseListCardViewModel } from "../types";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return getDateKey(left) === getDateKey(right);
}

function formatCompactDateTime(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatCreatedAt(isoString: string): string {
  const createdAt = new Date(isoString);
  const now = new Date();

  if (isSameLocalDay(createdAt, now)) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(createdAt);
  }

  const elapsedMs = now.getTime() - createdAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / 86_400_000);

  if (elapsedDays > 0 && elapsedDays < 7) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "always" }).format(
      -elapsedDays,
      "day",
    );
  }

  return formatCompactDateTime(createdAt);
}

function getItemLabel(card: CaseListCardViewModel): string | null {
  if (card.task?.item?.article_number) {
    return `#${card.task.item.article_number}`;
  }

  if (card.task?.item?.sku) {
    return card.task.item.sku;
  }

  return null;
}

type CaseCardProps = {
  card: CaseListCardViewModel;
  unreadCount: number;
  onOpen: (caseClientId: CaseId) => void;
};

export const CaseCard = memo(function CaseCard({
  card,
  unreadCount,
  onOpen,
}: CaseCardProps): React.JSX.Element {
  const itemLabel = getItemLabel(card);
  const profilePicture = card.created_by.profile_picture;

  return (
    <button
      className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-card/90"
      data-testid={`case-card-${card.client_id}`}
      type="button"
      onClick={() => onOpen(card.client_id)}
    >
      <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold leading-none text-foreground">
        {profilePicture ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            // src={profilePicture}
            src="https://media.licdn.com/dms/image/v2/D4D03AQEJg5oCmelT8g/profile-displayphoto-crop_800_800/B4DZ3TEkuHG8AI-/0/1777362688388?e=1781136000&v=beta&t=9Y9c0Pv_36Ufm7DHqxik1Pqpj3vzRy5cCqnf9xli7rA"
          />
        ) : (
          <span>{getInitials(card.created_by.username)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {card.type_label ?? "Case"}
          </span>
          {unreadCount > 0 ? (
            <span
              className="inline-flex min-w-5 items-center justify-center rounded-full bg-green-600 p-1 text-[11px] font-semibold leading-none text-[color:var(--color-card)]"
              data-testid={`case-card-unread-${card.client_id}`}
            >
              {unreadCount}
            </span>
          ) : null}
        </div>

        <div className="mt-1 min-w-0 text-sm text-muted-foreground">
          <span className="truncate">{card.created_by.username}</span>
          {itemLabel ? <span>{` • ${itemLabel}`}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-2 text-xs text-muted-foreground">
        <span>{formatCreatedAt(card.created_at)}</span>
        <ChevronRight aria-hidden="true" className="size-4 stroke-[2.5]" />
      </div>
    </button>
  );
});
