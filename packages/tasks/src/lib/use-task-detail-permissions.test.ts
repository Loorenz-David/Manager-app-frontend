import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ role: null as string | null }));

vi.mock("@beyo/auth", () => ({
  AuthRole: { Admin: "admin", Manager: "manager", Worker: "worker", Seller: "seller" },
  useRole: () => ({ hasRole: (value: string) => value === mocks.role }),
}));

import { useTaskDetailPermissions } from "./use-task-detail-permissions";

describe("useTaskDetailPermissions", () => {
  it.each(["admin", "manager", "seller"])("lets a %s edit, see the menu and the money", (role) => {
    mocks.role = role;
    expect(renderHook(useTaskDetailPermissions).result.current).toEqual({
      canEdit: true,
      showMenu: true,
      showProductionTime: true,
    });
  });

  // Allow-list: anything not named above is read-only, a worker included.
  it.each(["worker", null, "floor"])("renders read-only for role %s", (role) => {
    mocks.role = role;
    expect(renderHook(useTaskDetailPermissions).result.current).toEqual({
      canEdit: false,
      showMenu: false,
      showProductionTime: false,
    });
  });
});
