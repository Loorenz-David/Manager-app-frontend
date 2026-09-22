import type { StockNeedBucket, StockReportListFilter } from "../stock-report.types";

/** The key segment for "no major-category filter" — never a real category. */
export const STOCK_REPORT_FILTER_ALL = "all";

export const stockReportKeys = {
  all: ["stock-report"] as const,
  lists: () => [...stockReportKeys.all, "items", "list"] as const,
  /** Prefix of every list of one bucket, whatever its filter — for partial matching. */
  bucketLists: (bucket: StockNeedBucket) => [...stockReportKeys.lists(), bucket] as const,
  list: (bucket: StockNeedBucket, filter: StockReportListFilter) =>
    [...stockReportKeys.bucketLists(bucket), filter.majorCategory ?? STOCK_REPORT_FILTER_ALL] as const,
  /** The bucket a list key was built for — never read it positionally from the end. */
  bucketOfListKey: (key: readonly unknown[]) => key[stockReportKeys.lists().length] as StockNeedBucket | undefined,
  /** The major-category segment of a list key: a category or `STOCK_REPORT_FILTER_ALL`. */
  filterOfListKey: (key: readonly unknown[]) => key[stockReportKeys.lists().length + 1] as string | undefined,
  assignments: () => [...stockReportKeys.all, "assignments"] as const,
  assignmentList: (stockNeedId: string) => [...stockReportKeys.assignments(), stockNeedId] as const,
};
