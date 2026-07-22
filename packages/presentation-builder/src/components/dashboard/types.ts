export type AnnouncementDisplayStatus =
  | "draft"
  | "published"
  | "scheduled"
  | "archived";

export type AnnouncementMediaKind = "image" | "video";

/** Everything an announcement card renders. Derivation (status, meta line, grouping) is controller-side. */
export type AnnouncementCardData = {
  id: string;
  title: string;
  displayStatus: AnnouncementDisplayStatus;
  /** Preformatted, e.g. "3 slides · edited 2 days ago" or "3 slides · sends Jul 25". */
  metaLine: string;
  /** Media chips shown at the mini-phone's bottom, in slide order. */
  mediaKinds: AnnouncementMediaKind[];
  /** First slide's media poster/thumbnail; stripe placeholder when absent. */
  coverImageUrl?: string | null;
  /** e.g. "v2" when version > 1; hidden when null. */
  versionLabel?: string | null;
};

export const DASHBOARD_FILTERS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "drafts", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "archived", label: "Archived" },
] as const;

export type DashboardFilterKey = (typeof DASHBOARD_FILTERS)[number]["key"];
