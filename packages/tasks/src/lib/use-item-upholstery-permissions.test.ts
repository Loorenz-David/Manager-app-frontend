import { describe, expect, it, vi } from "vitest";

let currentRole = "manager";

vi.mock("@beyo/auth", () => ({
  AuthRole: {
    Admin: "admin",
    Manager: "manager",
    Worker: "worker",
    Seller: "seller",
  },
  useRole: () => ({ hasRole: (role: string) => currentRole === role }),
}));

import { useItemUpholsteryPermissions } from "./use-item-upholstery-permissions";

function permissionsFor(role: string) {
  currentRole = role;
  return useItemUpholsteryPermissions();
}

describe("useItemUpholsteryPermissions", () => {
  it("lets admins and managers edit both the flag and the link", () => {
    for (const role of ["admin", "manager"]) {
      expect(permissionsFor(role)).toEqual({
        canEditUpholsteryFlag: true,
        canEditUpholsteryLink: true,
      });
    }
  });

  it("lets sellers record the flag but not touch the link", () => {
    // `PATCH /items` gained SELLER; the item-upholstery routes did not.
    expect(permissionsFor("seller")).toEqual({
      canEditUpholsteryFlag: true,
      canEditUpholsteryLink: false,
    });
  });

  it("gives workers neither", () => {
    expect(permissionsFor("worker")).toEqual({
      canEditUpholsteryFlag: false,
      canEditUpholsteryLink: false,
    });
  });
});
