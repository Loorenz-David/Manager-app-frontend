import { useQuery, type QueryClient } from "@tanstack/react-query";
import type { StockNeedBucket } from "../stock-report.types";
import { fetchStockReportAssignments, fetchStockReportItems } from "./stock-report-api";
import { stockReportKeys } from "./stock-report-keys";

export const STOCK_REPORT_STALE_TIME = 60_000;

export function useStockReportListQuery(bucket: StockNeedBucket) {
  return useQuery({ queryKey: stockReportKeys.list(bucket), queryFn: () => fetchStockReportItems(bucket), staleTime: STOCK_REPORT_STALE_TIME });
}

export function useStockReportAssignmentsQuery(stockNeedId: string) {
  return useQuery({ queryKey: stockReportKeys.assignmentList(stockNeedId), queryFn: () => fetchStockReportAssignments(stockNeedId), enabled: Boolean(stockNeedId), staleTime: STOCK_REPORT_STALE_TIME, retry: (count, error) => !(error instanceof Error && "status" in error && (error as { status: number }).status === 404) && count < 1 });
}

export function prefetchStockReportAssignmentsData(queryClient: QueryClient, stockNeedId: string): Promise<void> {
  return queryClient.prefetchQuery({ queryKey: stockReportKeys.assignmentList(stockNeedId), queryFn: () => fetchStockReportAssignments(stockNeedId), staleTime: STOCK_REPORT_STALE_TIME });
}
