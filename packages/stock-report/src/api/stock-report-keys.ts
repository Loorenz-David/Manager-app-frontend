import type { StockReportBoardBucket, StockReportListFilter } from "../stock-report.types";

/** The key segment for "no major-category filter" — never a real category. */
export const STOCK_REPORT_FILTER_ALL = "all";

/** The mode segment of a list key: the priority board or the missing list. */
export const STOCK_REPORT_LIST_MODE = { board: "board", missing: "missing" } as const;

export const stockReportKeys = {
  all: ["stock-report"] as const,
  lists: () => [...stockReportKeys.all, "items", "list"] as const,
  /** Prefix of every list of one bucket, whatever its filter — for partial matching. */
  bucketLists: (bucket: StockReportBoardBucket) => [...stockReportKeys.lists(), bucket] as const,
  list: (bucket: StockReportBoardBucket, filter: StockReportListFilter) =>
    [
      ...stockReportKeys.bucketLists(bucket),
      filter.majorCategory ?? STOCK_REPORT_FILTER_ALL,
      filter.missingOnly ? STOCK_REPORT_LIST_MODE.missing : STOCK_REPORT_LIST_MODE.board,
    ] as const,
  /** The bucket a list key was built for — never read it positionally from the end. */
  bucketOfListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length] as StockReportBoardBucket | undefined,
  /** The major-category segment of a list key: a category or `STOCK_REPORT_FILTER_ALL`. */
  filterOfListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length + 1] as string | undefined,
  /** Whether a list key belongs to the missing-stock mode (`missing_only=true`). */
  isMissingListKey: (key: readonly unknown[]) =>
    key[stockReportKeys.lists().length + 2] === STOCK_REPORT_LIST_MODE.missing,
  /**
   * One row on its own, for the detail page. There is no single-row endpoint:
   * the entry is seeded from a list when the page opens and kept true by the
   * mutations and socket handlers, so the page stays reactive after its row
   * leaves every list (a fully-missing row leaves the board's default read; a
   * cleared one leaves the missing list).
   */
  items: () => [...stockReportKeys.all, "items", "detail"] as const,
  item: (stockNeedId: string) => [...stockReportKeys.items(), stockNeedId] as const,
  assignments: () => [...stockReportKeys.all, "assignments"] as const,
  assignmentList: (stockNeedId: string) => [...stockReportKeys.assignments(), stockNeedId] as const,
  versions: () => [...stockReportKeys.all, "versions"] as const,
  /**
   * The paginated history (§5.9), newest first. `progressPriority` is the wire
   * form of the progress filter (`high,medium,low` / `all`); omitted, the key
   * is the prefix every invalidation targets.
   */
  versionList: (progressPriority?: string) =>
    progressPriority === undefined
      ? ([...stockReportKeys.versions(), "list"] as const)
      : ([...stockReportKeys.versions(), "list", progressPriority] as const),
  /** The active version with its live progress (§5.12); `null` before the first one. */
  activeVersion: (progressPriority?: string) =>
    progressPriority === undefined
      ? ([...stockReportKeys.versions(), "active"] as const)
      : ([...stockReportKeys.versions(), "active", progressPriority] as const),
  missingSummary: () => [...stockReportKeys.all, "missing-summary"] as const,
};
