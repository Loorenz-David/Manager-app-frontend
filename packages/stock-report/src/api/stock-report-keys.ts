import type { StockNeedBucket } from "../stock-report.types";

export const stockReportKeys = {
  all: ["stock-report"] as const,
  lists: () => [...stockReportKeys.all, "items", "list"] as const,
  list: (bucket: StockNeedBucket) => [...stockReportKeys.lists(), bucket] as const,
  assignments: () => [...stockReportKeys.all, "assignments"] as const,
  assignmentList: (stockNeedId: string) => [...stockReportKeys.assignments(), stockNeedId] as const,
};
