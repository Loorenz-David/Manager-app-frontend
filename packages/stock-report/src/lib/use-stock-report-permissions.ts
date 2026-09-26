import { useRole, WorkspaceSpecialization } from "@beyo/auth";
import type { MajorCategory } from "@beyo/lib";
import type { StockNeedBucket } from "../stock-report.types";

export type StockReportPermissions = {
  role: string | null;
  workspaceSpecialization: WorkspaceSpecialization | null;
  canPrioritise: boolean;
  canAssign: boolean;
  /** `PATCH …/missing-quantity` admits admin, manager and worker (§5.7). */
  canMarkMissing: boolean;
  /** Opening a version (§5.8) is admin and manager only. */
  canManageVersions: boolean;
  seesUnset: boolean;
  buckets: readonly StockNeedBucket[];
  isWorker: boolean;
  /**
   * The major category the board opens on. Workers work one kind of item, so
   * wood workers start on Wood and every other worker on Seat; the filter sheet
   * can still change it. Managers and sellers start with no filter (owner,
   * 2026-09-22).
   */
  defaultMajorCategory: MajorCategory | null;
};

export function useStockReportPermissions(): StockReportPermissions {
  const { role, workspaceSpecialization } = useRole();
  const isWorker = role === "worker";
  const isWoodWorker =
    isWorker && workspaceSpecialization === WorkspaceSpecialization.WoodWorker;
  const canPrioritise =
    role === "admin" || role === "manager" || role === "seller";
  const canAssign = role === "admin" || role === "manager" || isWoodWorker;
  const canManageVersions = role === "admin" || role === "manager";
  return {
    role,
    workspaceSpecialization,
    canPrioritise,
    canAssign,
    canMarkMissing: canManageVersions || isWorker,
    canManageVersions,
    seesUnset: !isWorker,
    buckets: isWorker
      ? ["high", "medium", "low"]
      : ["unset", "high", "medium", "low"],
    isWorker,
    defaultMajorCategory: isWorker ? (isWoodWorker ? "wood" : "seat") : null,
  };
}
