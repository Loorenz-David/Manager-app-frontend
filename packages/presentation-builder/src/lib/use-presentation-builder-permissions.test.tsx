import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePresentationBuilderPermissions } from "./use-presentation-builder-permissions";

let currentRole = "worker";

vi.mock("@beyo/auth", () => ({
  AuthRole: { Admin: "admin", Manager: "manager", Worker: "worker", Seller: "seller" },
  useRole: () => ({ hasRole: (role: string) => currentRole === role }),
}));

describe("usePresentationBuilderPermissions", () => {
  beforeEach(() => {
    currentRole = "worker";
  });

  it.each([
    ["admin", true],
    ["manager", true],
    ["worker", false],
    ["seller", false],
  ])("maps the %s role to canManagePresentations=%s", (role, expected) => {
    currentRole = role;
    const { result } = renderHook(() => usePresentationBuilderPermissions());
    expect(result.current.canManagePresentations).toBe(expected);
  });
});
