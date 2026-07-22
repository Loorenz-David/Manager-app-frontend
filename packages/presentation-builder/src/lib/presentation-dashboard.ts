import type {
  AnnouncementCardData,
  AnnouncementDisplayStatus,
} from "../components/dashboard/types";
import type { PresentationListItem } from "../types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function derivePresentationDisplayStatus(
  item: Pick<PresentationListItem, "status" | "starts_at">,
  now: Date,
): AnnouncementDisplayStatus {
  if (item.status === "draft") return "draft";
  if (item.status === "archived") return "archived";

  const startsAt = item.starts_at === null ? null : new Date(item.starts_at);
  return startsAt !== null && startsAt.getTime() > now.getTime()
    ? "scheduled"
    : "published";
}

export function groupLatestVersions(
  items: readonly PresentationListItem[],
): PresentationListItem[] {
  const latestByLogicalId = new Map<string, PresentationListItem>();

  for (const item of items) {
    const current = latestByLogicalId.get(item.logical_client_id);
    if (current === undefined || item.version > current.version) {
      latestByLogicalId.set(item.logical_client_id, item);
    }
  }

  return [...latestByLogicalId.values()];
}

function formatMonthDay(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatEditedAt(value: string, now: Date): string {
  const elapsedMs = Math.max(0, now.getTime() - new Date(value).getTime());

  if (elapsedMs < MINUTE_MS) return "just now";
  if (elapsedMs < HOUR_MS) {
    const minutes = Math.floor(elapsedMs / MINUTE_MS);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsedMs < DAY_MS) {
    const hours = Math.floor(elapsedMs / HOUR_MS);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (elapsedMs < 2 * DAY_MS) return "yesterday";
  if (elapsedMs < 7 * DAY_MS) return `${Math.floor(elapsedMs / DAY_MS)} days ago`;
  return formatMonthDay(value);
}

export function formatPresentationMetaLine(
  item: PresentationListItem,
  displayStatus: AnnouncementDisplayStatus,
  now: Date,
): string {
  const slideLabel = `${item.slide_count} ${item.slide_count === 1 ? "slide" : "slides"}`;

  if (displayStatus === "scheduled" && item.starts_at !== null) {
    return `${slideLabel} · sends ${formatMonthDay(item.starts_at)}`;
  }

  const editedAt =
    item.updated_at ?? item.published_at ?? item.archived_at ?? item.created_at;
  return `${slideLabel} · edited ${formatEditedAt(editedAt, now)}`;
}

export function toAnnouncementCardData(
  item: PresentationListItem,
  now: Date,
): AnnouncementCardData {
  const displayStatus = derivePresentationDisplayStatus(item, now);

  return {
    id: item.client_id,
    title: item.title,
    displayStatus,
    metaLine: formatPresentationMetaLine(item, displayStatus, now),
    mediaKinds: [...item.media_kinds],
    coverImageUrl: item.cover_url,
    versionLabel: item.version > 1 ? `v${item.version}` : null,
  };
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts.at(-1)![0]!}`.toUpperCase();
}
