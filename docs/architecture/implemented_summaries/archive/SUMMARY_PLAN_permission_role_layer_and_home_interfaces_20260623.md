# SUMMARY_PLAN_permission_role_layer_and_home_interfaces_20260623

## Metadata

- Summary ID: `SUMMARY_PLAN_permission_role_layer_and_home_interfaces_20260623`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T07:46:11Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_permission_role_layer_and_home_interfaces_20260623.md`
- Related debug plan (optional): `—`

## What was implemented

- Added role, app-scope, and workspace-role `as const` objects to `@beyo/auth` and derived the existing auth union types from them.
- Added the shared identity/capability layer in `@beyo/auth`: `useRole`, permission hooks, render guards, route guard, and shared permission types.
- Added the workers app dormant capability registry and refactored home into a workspace-role interface registry.
- Preserved the standard worker home flow for `workspaceRoleName === null` and added an empty titled `wood_worker` home interface.
- Updated local architecture docs for the auth user shape and local permissions-role layering.

## Files changed

- `packages/auth/src/roles.ts`: added `AuthRole`, `AppScope`, and `WorkspaceRole` constants plus derived types.
- `packages/auth/src/store/auth.store.ts`: moved role-related field types to the shared role source.
- `packages/auth/src/hooks/use-role.ts`: added identity-layer role helpers.
- `packages/auth/src/hooks/use-permissions.ts`: added dormant capability-layer permission checks against `backend_permissions`.
- `packages/auth/src/hooks/use-permission.ts`: added single permission check helper.
- `packages/auth/src/components/RoleGuard.tsx`: added inline identity render guard.
- `packages/auth/src/components/Guard.tsx`: added inline capability render guard.
- `packages/auth/src/components/RequirePermission.tsx`: added route-level capability guard.
- `packages/auth/src/permission-types.ts`: added shared permission registry types.
- `packages/auth/src/index.ts`: exported the new role constants, hooks, guards, and permission types.
- `packages/auth/src/api/use-sign-in.ts`: updated role type imports to the new source.
- `apps/workers-app/ManagerBeyo-app-workers/src/app/permission-registry.ts`: added the dormant app-level permission registry scaffold.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx`: reduced the lazy route entry to composition only.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/HomeInterfaceRouter.tsx`: added role-based home interface resolution.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/home-interface-registry.tsx`: registered default and `wood_worker` home variants.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/StandardWorkerHomeView.tsx`: moved the existing standard worker home state machine unchanged.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/WoodWorkerHomeView.tsx`: added the empty titled `wood_worker` home page.
- `architecture/19_permissions_local.md`: documented the local role/capability split and package placement.
- `architecture/12_auth_local.md`: synced the `AuthUser` override with the expanded store shape.

## Contract adherence

- `architecture/01_architecture_local.md`: `route-entry.tsx` is now composition-only.
- `architecture/02_types.md`: role-like enums are `as const` objects with derived union types, not TypeScript `enum`.
- `architecture/19_permissions.md`: feature operations remain capability-based; role usage is limited to broad interface selection.
- `architecture/35_shared_packages.md`: shared package code uses relative imports and raw TypeScript package exports.

## Validation evidence

- `npm run typecheck`: pass
- `npm run build`: not available at root (`Missing script: "build"`)
- `npm run build --workspace managerbeyo-app-workers`: pass
- `npm run test`: not run
- `npx playwright test --project=mobile`: not run
- `npx playwright test --project=desktop`: not run

## Known gaps or deferred items

- `backend_permissions` remains an empty backend scaffold, so the capability layer is intentionally dormant.
- No browser/manual sign-in validation was run for a live `wood_worker` account in this environment.
- Managers-app consumption remains deferred by the source plan.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_permission_role_layer_and_home_interfaces_20260623_0746.md`
