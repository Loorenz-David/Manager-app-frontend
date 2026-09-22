import { useRole } from "@beyo/auth";
import type { WorkspaceSpecialization } from "@beyo/auth";
import type { StockNeedBucket } from "../stock-report.types";

export type StockReportPermissions = {
  role: string | null;
  workspaceSpecialization: WorkspaceSpecialization | null;
  canPrioritise: boolean;
  canAssign: boolean;
  seesUnset: boolean;
  buckets: readonly StockNeedBucket[];
  isWorker: boolean;
};

export function useStockReportPermissions(): StockReportPermissions {
  const { role, workspaceSpecialization } = useRole();
  const isWorker = role === "worker";
  const canPrioritise =
    role === "admin" || role === "manager" || role === "seller";
  const canAssign =
    role === "admin" ||
    role === "manager" ||
    (isWorker && workspaceSpecialization === "wood_worker");
  return {
    role,
    workspaceSpecialization,
    canPrioritise,
    canAssign,
    seesUnset: !isWorker,
    buckets: isWorker
      ? ["high", "medium", "low"]
      : ["unset", "high", "medium", "low"],
    isWorker,
  };
}
