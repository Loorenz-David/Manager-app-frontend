import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  role: "manager",
  workspaceSpecialization: null as string | null,
}));

vi.mock("@beyo/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@beyo/auth")>()),
  useRole: () => auth,
}));

import { useStockReportPermissions } from "./use-stock-report-permissions";

describe("stock report role capabilities", () => {
  beforeEach(() => {
    auth.role = "manager";
    auth.workspaceSpecialization = null;
  });

  it("gives admin and manager the manager board capabilities", () => {
    for (const role of ["admin", "manager"]) {
      auth.role = role;
      const { result } = renderHook(useStockReportPermissions);
      expect(result.current).toMatchObject({
        canPrioritise: true,
        canAssign: true,
        seesUnset: true,
        buckets: ["unset", "high", "medium", "low"],
      });
    }
  });

  it("allows sellers to prioritise but never to add an item", () => {
    auth.role = "seller";
    const { result } = renderHook(useStockReportPermissions);

    expect(result.current).toMatchObject({ canPrioritise: true, canAssign: false, seesUnset: true });
  });

  it("allows only wood workers to add an item and never exposes Unset", () => {
    auth.role = "worker";
    auth.workspaceSpecialization = "upholstery_worker";
    const { result, rerender } = renderHook(useStockReportPermissions);
    expect(result.current).toMatchObject({ canPrioritise: false, canAssign: false, seesUnset: false });
    expect(result.current.buckets).toEqual(["high", "medium", "low"]);

    auth.workspaceSpecialization = "wood_worker";
    rerender();
    expect(result.current.canAssign).toBe(true);
  });

  it("opens wood workers on Wood, every other worker on Seat, and everyone else unfiltered", () => {
    auth.role = "worker";
    auth.workspaceSpecialization = "wood_worker";
    const { result, rerender } = renderHook(useStockReportPermissions);
    expect(result.current.defaultMajorCategory).toBe("wood");

    for (const specialization of ["upholstery_worker", "quality_control", null]) {
      auth.workspaceSpecialization = specialization;
      rerender();
      expect(result.current.defaultMajorCategory).toBe("seat");
    }

    for (const role of ["admin", "manager", "seller"]) {
      auth.role = role;
      auth.workspaceSpecialization = null;
      rerender();
      expect(result.current.defaultMajorCategory).toBeNull();
    }
  });
});
