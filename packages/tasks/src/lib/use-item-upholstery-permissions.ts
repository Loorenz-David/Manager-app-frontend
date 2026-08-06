import { AuthRole, useRole } from "@beyo/auth";

/**
 * Mirrors the backend route roles one-for-one. Keep the two capabilities in
 * step with these routes — they have already drifted apart once (SELLER was
 * added to `PATCH /items` alone):
 *
 * - `canEditUpholsteryFlag` → `PATCH /api/v1/items/{client_id}`
 *   (`ADMIN`, `MANAGER`, `SELLER`)
 * - `canEditUpholsteryLink` → `PUT` / `PATCH` / `DELETE /api/v1/item-upholsteries`
 *   (`ADMIN`, `MANAGER`)
 *
 * A worker gets neither, so the upholstery section renders read-only for them
 * rather than offering controls whose save would 403.
 */
export function useItemUpholsteryPermissions() {
  const { hasRole } = useRole();
  const isAdmin = hasRole(AuthRole.Admin);
  const isManager = hasRole(AuthRole.Manager);
  const isSeller = hasRole(AuthRole.Seller);

  return {
    canEditUpholsteryFlag: isAdmin || isManager || isSeller,
    canEditUpholsteryLink: isAdmin || isManager,
  };
}
