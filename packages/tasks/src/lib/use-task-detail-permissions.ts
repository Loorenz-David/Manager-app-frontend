import { AuthRole, useRole } from "@beyo/auth";

export type TaskDetailPermissions = {
  /** Inline editors on the detail page (dates, quantity, customer, stages, images, upholstery). */
  canEdit: boolean;
  /** The ⋮ menu on the detail header and on the listing cards. */
  showMenu: boolean;
  /** The production-time / budget section. */
  showProductionTime: boolean;
};

/**
 * What a role may do on the shared task detail and listing. An explicit
 * allow-list so the rule fails closed: a worker, a signed-out session or a role
 * this package does not know renders the page read-only, with no ⋮ and no
 * money (owner, 2026-09-22). The three flags are equal today; they are named
 * apart because the later worker menu page flips `showMenu` on its own.
 */
export function useTaskDetailPermissions(): TaskDetailPermissions {
  const { hasRole } = useRole();
  const isPrivileged =
    hasRole(AuthRole.Admin) ||
    hasRole(AuthRole.Manager) ||
    hasRole(AuthRole.Seller);

  return {
    canEdit: isPrivileged,
    showMenu: isPrivileged,
    showProductionTime: isPrivileged,
  };
}
