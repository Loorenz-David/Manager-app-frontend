# PLAN_permission_role_layer_and_home_interfaces_20260623

## Metadata

- Plan ID: `PLAN_permission_role_layer_and_home_interfaces_20260623`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-23T00:00:00Z`
- Last updated at (UTC): `2026-06-23T07:46:11Z`
- Related issue/ticket: —
- Intention plan: —
- Builds on: `PLAN_auth_token_claims_store_expansion_20260623` (already implemented — `auth.store.ts` exposes `AuthRole`, `WorkspaceRoleName`, `AuthAppScope` and `role`/`workspaceRoleName`/`appScope` fields + selectors)

## Goal and intent

- Goal: Build a shared permission/identity layer **inside `@beyo/auth`** (roles are auth identity; the store already lives there), grounded in role + workspace-role enums, and consume it in the workers app to render **different home interfaces per workspace role** — starting with `wood_worker` while preserving the current interface for the standard (`null`) workspace role.
- Business/user intent: The app must shape UI/interactions by who the user is (`role`, `workspace_role_name`) now, and by what the user can do (`backend_permissions`) later. `backend_permissions` is currently an empty scaffold, so the **identity (role) layer is the active layer today**; the **capability (permission) layer is built but dormant** until the backend populates it.
- Non-goals:
  - No backend changes.
  - No real `backend_permissions` consumption (it is empty `[]` today — capability layer ships dormant).
  - No wood_worker home UI beyond an empty titled page (owner builds that interaction later).
  - No managers-app integration in this plan (workers app is the first/validation consumer per `35_shared_packages.md §9`).

## Scope

- In scope:
  - **A.** New local contract `architecture/19_permissions_local.md` documenting the role layer, its home in `@beyo/auth`, the enum convention, and the per-workspace-role interface registry pattern.
  - **B.** Promote role/workspace-role/app-scope to **`as const` enum objects** in `@beyo/auth` (single source of truth), deriving the existing union types from them. Re-export from the package barrel.
  - **C.** Add the permission/identity layer **to the existing `@beyo/auth` package** — `useRole`, `usePermissions`, `usePermission`, `RoleGuard`, `Guard`, `RequirePermission`, shared types, barrel exports. No new package.
  - **D.** Workers-app `src/app/permission-registry.ts` — minimal scaffold for the (dormant) capability layer.
  - **E.** Workers-app home feature refactor into a scalable per-workspace-role interface registry: router + variants (`StandardWorkerHomeView`, `WoodWorkerHomeView`).
  - **F.** Sync `architecture/12_auth_local.md` `AuthUser` block (now stale after the store expansion).
- Out of scope:
  - Managers app consumption (Step 5 of the migration cycle — deferred).
  - Populating the capability registry with real keys (dormant until backend).
- Assumptions:
  - **Package decision (resolved):** the role+capability hooks live **inside the existing `@beyo/auth` package** — not a new package. Roles are auth identity, the store already lives there, and co-locating eliminates any cross-package cycle. The role **enums** also live in `@beyo/auth` (`roles.ts`); the store types its `role`/`workspaceRoleName`/`appScope` fields against them. `@beyo/auth` already declares `react` and `react-router-dom` peers, so `RequirePermission` needs no new peer dep.
  - **"Enums" = `as const` objects, never TS `enum`.** The `@beyo/auth` tsconfig sets `erasableSyntaxOnly: true` (per `35_shared_packages.md §5`), which forbids TypeScript `enum`. Use `as const` objects + derived union types. Enum object naming (resolved): `WorkspaceRole` / `AuthRole` / `AppScope` (PascalCase, enum-like), co-existing with same-named union types.
  - The new auth modules are **logic-only (no Tailwind class names)**, so the workers app needs **no new `@source` directive** (it already registers `packages/auth/src`).
  - The current home `route-entry.tsx` body (working-sections state machine + `AnimatePresence`) is the `null`-workspace-role variant and moves verbatim into `StandardWorkerHomeView`.

## Clarifications required

- [x] **Package vs. extend `@beyo/auth`** — RESOLVED 2026-06-23: extend the existing `@beyo/auth` package (no new package).
- [x] **Enum object naming** — RESOLVED 2026-06-23: `WorkspaceRole` / `AuthRole` / `AppScope` (PascalCase enum-like `as const` objects).

## Acceptance criteria

1. `@beyo/auth` exports `WorkspaceRole`, `AuthRole`, `AppScope` as `as const` objects; the existing `AuthRole`/`WorkspaceRoleName`/`AuthAppScope` union types are derived from them; `auth.store.ts` types its fields against the derived types. No behavior change to the store API.
2. `@beyo/auth` exports `useRole`, `usePermissions`, `usePermission`, `RoleGuard`, `Guard`, `RequirePermission` from its barrel; it type-checks with `erasableSyntaxOnly` (no TS `enum` anywhere).
3. The workers app consumes `useRole` from `@beyo/auth` (already a dependency) — no new package or `npm install` step required.
4. Home feature: a user with `workspaceRoleName === null` sees the **unchanged** working-sections → steps flow (`data-testid="home-page"` preserved); a user with `workspaceRoleName === 'wood_worker'` sees an empty page titled `wood_worker` (`data-testid="home-page-wood-worker"`).
5. Adding a future workspace-role interface requires exactly: (a) one enum value in `@beyo/auth`, (b) one variant component, (c) one line in `home-interface-registry.tsx`. No router or route-entry changes.
6. `route-entry.tsx` is composition-only (no hooks/state of its own), complying with `01_architecture_local.md`.
7. `npm run typecheck` and `npm run build` pass for the workers app.

## Contracts and skills

### Domain schemas consulted

- `packages/auth/src/store/auth.store.ts`: established field names — `role: AuthRole`, `workspaceRoleName: WorkspaceRoleName`, `appScope: AuthAppScope`, `backend_permissions: string[]`; selectors `selectUserRole`, `selectWorkspaceRoleName`. No data-domain `types.ts` applies (this is auth/infra, not an entity domain).

### Contracts loaded (per `task_system/frontend_contract_goal_mapping_guide.md`)

Core (always):
- `architecture/01_architecture.md` + `architecture/01_architecture_local.md`: `route-entry.tsx` rules (composition-only) for the home refactor.
- `architecture/02_types.md`: enum-as-`as const` + derived union type convention.
- `architecture/06_client_state.md`: zustand store / selector usage by the hooks.
- `architecture/15_feature_structure.md`: home feature folder layout.

Auth + permissions bundle (trigger: "permission", "role", "guard"):
- `architecture/12_auth.md` + `architecture/12_auth_local.md`: auth store shape (the local file is updated in task F).
- `architecture/19_permissions.md` + **NEW** `architecture/19_permissions_local.md`: capability layer baseline + role-layer/package/registry delta (authored in task A).

Shared package (trigger: editing a package):
- `architecture/35_shared_packages.md`: relative-imports-only rule, peer-dep rules, `erasableSyntaxOnly` constraint, `@source` rule (workers app already registers `packages/auth/src`). No new package created — only `@beyo/auth` is extended.

Component / routing:
- `architecture/07_components.md`: variant components reading identity via hook (app-shell-level decision).
- `architecture/11_routing.md`: home route/lazy entry unchanged; verify.

### File read intent — pattern vs. relational

Permitted (relational):
- `packages/auth/src/store/auth.store.ts`, `packages/auth/src/index.ts` — exact exported names/types.
- `apps/.../features/home/route-entry.tsx` — existing home body to relocate.
- `apps/.../features/settings/route-entry.tsx` — existing composition-only route-entry reference.
- An existing minimal package (`packages/auth/package.json`, `tsconfig.json`) — package.json/tsconfig shape to mirror.

### Skill selection

- Primary: direct file edits (package scaffolding + feature refactor). No specialized skill required.

## Implementation plan

Execute in order. Tasks B→C→D→E are the code path; A and F are the contract docs.

---

### Task A — Author `architecture/19_permissions_local.md`

Create the local companion. It must open with `> Extends: 19_permissions.md` and document:

1. **Two layers, not one.** Capability layer (`usePermissions`/`can` against `backend_permissions`) is the canonical contract's model and remains the long-term goal. Identity layer (`useRole`) is added here because `backend_permissions`/`ui` are scaffolded (always empty) today, so identity (`role`, `workspace_role_name`) is the only working signal.
2. **Location override.** Canonical `19_permissions.md` places hooks in `src/hooks/` and a registry in `src/app/`. In this monorepo, the reusable hooks/guards live in the shared **`@beyo/auth`** package (co-located with the auth store they read); only the capability **registry** (`src/app/permission-registry.ts`) stays app-level (it assembles app-specific keys).
3. **Enum source + convention.** Role/workspace-role/app-scope enums live in **`@beyo/auth`** (`roles.ts`) as `as const` objects named `WorkspaceRole`/`AuthRole`/`AppScope` (NOT TS `enum` — `erasableSyntaxOnly`). Union types are derived from them. This is the single source of truth for all role checks across apps.
4. **`useRole()` API** — returns `{ role, workspaceRoleName, hasRole(r), isWorkspaceRole(r) }`. Permitted use: app-shell-level decisions (which interface/nav/landing to render) — consistent with the canonical "App-shell role usage" section. Forbidden use: gating a feature *operation* on a role string (that remains the capability layer's job once populated).
5. **Render-instead-of / hide-instead patterns.** Two mechanisms:
   - **Interface registry** (preferred for whole-screen divergence): a `Record<WorkspaceRole | 'default', ComponentType>` resolved by a router component (see Task E).
   - **`<RoleGuard>`** (for inline divergence): `<RoleGuard workspaceRole="wood_worker" fallback={...}>`.
6. **Migration note.** When `backend_permissions` ships, role-driven booleans in controllers are swapped/combined with `can('feature:action')` without touching components.

---

### Task B — Promote enums in `@beyo/auth`

**New file `packages/auth/src/roles.ts`:**

```ts
// `as const` objects (NOT TS `enum` — package tsconfig sets erasableSyntaxOnly).
export const AuthRole = {
  Admin: 'admin',
  Manager: 'manager',
  Worker: 'worker',
  Seller: 'seller',
} as const;
export type AuthRole = (typeof AuthRole)[keyof typeof AuthRole];

export const AppScope = {
  Admin: 'admin',
  Manager: 'manager',
  Worker: 'worker',
  Seller: 'seller',
} as const;
export type AuthAppScope = (typeof AppScope)[keyof typeof AppScope];

// Non-null workspace-role values. `null` = standard system role (no sub-specialisation).
export const WorkspaceRole = {
  WoodWorker: 'wood_worker',
} as const;
export type WorkspaceRoleValue = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];
export type WorkspaceRoleName = WorkspaceRoleValue | null;
```

**Edit `packages/auth/src/store/auth.store.ts`:** remove the three inline union type declarations (lines 4–6) and import the derived types instead:

```ts
import type { AuthRole, AuthAppScope, WorkspaceRoleName } from '../roles';
```

Keep `AuthUser` and all selectors exactly as they are (they already reference these type names). Re-export the types from the store file is no longer needed if the barrel re-exports from `roles.ts` — but to avoid breaking existing `export type { AuthRole, ... } from './store/auth.store'` in the barrel, keep `export type { AuthRole, AuthAppScope, WorkspaceRoleName }` flowing. Simplest: have the barrel export types from `./roles` and values too.

**Edit `packages/auth/src/index.ts`:** add value + type exports for the enums:

```ts
export { AuthRole, AppScope, WorkspaceRole } from './roles';
export type { AuthAppScope, WorkspaceRoleName, WorkspaceRoleValue } from './roles';
```

Resolve the existing `export type { AuthAppScope, AuthRole, ... } from './store/auth.store'` line so each type is exported exactly once (move type exports to come from `./roles`, keep `AuthUser` from the store).

> Note: also confirm `use-sign-in.ts` and `AuthProvider.tsx` still type-check — they assign string values from the JWT/login response into these fields; since the union types are unchanged in shape, no edits expected.

---

### Task C — Add the permission/identity layer to `@beyo/auth`

All files use **relative imports only** (per `35_shared_packages.md §5`). New files slot into the existing `packages/auth/src/hooks/` and `packages/auth/src/components/` folders.

**`packages/auth/src/permission-types.ts`:**

```ts
// Shape every app feature permission file must satisfy (capability layer).
export type FeaturePermissionMap = Record<string, string>;
export type PermissionContext = { permissions: readonly string[] };
```

**`packages/auth/src/hooks/use-role.ts`** (identity layer — the active layer):

```ts
import { useCallback } from 'react';
import { useAuthStore, selectUserRole, selectWorkspaceRoleName } from '../store/auth.store';
import type { AuthRole, WorkspaceRoleValue } from '../roles';

export function useRole() {
  const role = useAuthStore(selectUserRole);                     // AuthRole | null
  const workspaceRoleName = useAuthStore(selectWorkspaceRoleName); // WorkspaceRoleName

  const hasRole = useCallback((r: AuthRole) => role === r, [role]);
  const isWorkspaceRole = useCallback(
    (r: WorkspaceRoleValue) => workspaceRoleName === r,
    [workspaceRoleName],
  );

  return { role, workspaceRoleName, hasRole, isWorkspaceRole };
}
```

**`packages/auth/src/hooks/use-permissions.ts`** (capability layer — dormant; generic over the app's key type):

```ts
import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/auth.store';

// Generic: the app supplies its own PermissionKey union at the call site.
export function usePermissions<TKey extends string = string>() {
  const permissions = useAuthStore((s) => s.user?.backend_permissions ?? []);
  const permissionSet = useMemo(() => new Set<string>(permissions), [permissions]);
  const can = useCallback((key: TKey): boolean => permissionSet.has(key), [permissionSet]);
  return { can };
}
```

**`packages/auth/src/hooks/use-permission.ts`:**

```ts
import { usePermissions } from './use-permissions';
export function usePermission<TKey extends string = string>(key: TKey): boolean {
  return usePermissions<TKey>().can(key);
}
```

**`packages/auth/src/components/RoleGuard.tsx`** (declarative identity render — logic only, no Tailwind):

```tsx
import type { ReactNode } from 'react';
import type { AuthRole, WorkspaceRoleValue } from '../roles';
import { useRole } from '../hooks/use-role';

type RoleGuardProps = {
  role?: AuthRole;
  workspaceRole?: WorkspaceRoleValue;
  fallback?: ReactNode;
  children: ReactNode;
};

export function RoleGuard({ role, workspaceRole, fallback = null, children }: RoleGuardProps) {
  const { hasRole, isWorkspaceRole } = useRole();
  const allowed =
    (role === undefined || hasRole(role)) &&
    (workspaceRole === undefined || isWorkspaceRole(workspaceRole));
  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

**`packages/auth/src/components/Guard.tsx`** (capability render — canonical `19` pattern, generic key):

```tsx
import type { ReactNode } from 'react';
import { usePermission } from '../hooks/use-permission';

type GuardProps = { permission: string; fallback?: ReactNode; children: ReactNode };
export function Guard({ permission, fallback = null, children }: GuardProps) {
  return usePermission(permission) ? <>{children}</> : <>{fallback}</>;
}
```

**`packages/auth/src/components/RequirePermission.tsx`** (route guard, canonical `19` pattern):

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '../hooks/use-permission';

type Props = { permission: string; redirectTo?: string };
export function RequirePermission({ permission, redirectTo = '/' }: Props) {
  return usePermission(permission) ? <Outlet /> : <Navigate to={redirectTo} replace />;
}
```

**Extend `packages/auth/src/index.ts`** (barrel — append; named exports only):

```ts
export { useRole } from './hooks/use-role';
export { usePermissions } from './hooks/use-permissions';
export { usePermission } from './hooks/use-permission';
export { RoleGuard } from './components/RoleGuard';
export { Guard } from './components/Guard';
export { RequirePermission } from './components/RequirePermission';
export type { FeaturePermissionMap, PermissionContext } from './permission-types';
```

**No workspace wiring needed** — `@beyo/auth` is already a workers-app dependency with `react` + `react-router-dom` peers, and the app already registers `@source "../../../../packages/auth/src"`. The new modules are logic-only (no Tailwind), so no `@source` change.

---

### Task D — Workers-app capability registry scaffold

**`apps/workers-app/ManagerBeyo-app-workers/src/app/permission-registry.ts`:**

```ts
// Capability layer registry — DORMANT until the backend populates backend_permissions.
// Each feature will add its own `features/<f>/permissions.ts` and register it here.
import type { FeaturePermissionMap } from '@beyo/auth';

export const permissionRegistry = {} as const satisfies Record<string, FeaturePermissionMap>;

type PermissionRegistry = typeof permissionRegistry;
export type PermissionKey = PermissionRegistry extends Record<string, never>
  ? never
  : {
      [F in keyof PermissionRegistry]: PermissionRegistry[F][keyof PermissionRegistry[F]];
    }[keyof PermissionRegistry];
```

> This exists so the structure/altitude is in place; it is intentionally empty now. Document in a top-of-file comment that the role layer (`useRole`) is the active mechanism today.

---

### Task E — Home feature: per-workspace-role interface registry

Target structure:

```
features/home/
  route-entry.tsx                          ← composition only
  home-interface-registry.tsx              ← workspace role → variant component
  components/
    HomeInterfaceRouter.tsx                ← useRole() → registry lookup → render
    variants/
      StandardWorkerHomeView.tsx           ← current body (null workspace role)
      WoodWorkerHomeView.tsx               ← empty page titled "wood_worker"
```

**E1. `components/variants/StandardWorkerHomeView.tsx`** — move the *entire current* `HomeRouteEntry` body here verbatim (the `WorkingSectionsHomeProvider`, `useState` section/direction machine, `AnimatePresence`, both `m.div` branches). Keep `data-testid="home-page"`. Rename the exported function to `StandardWorkerHomeView`. Its imports (`../../working_sections`, `../../task_steps`, `@beyo/lib`) adjust for the new depth.

**E2. `components/variants/WoodWorkerHomeView.tsx`:**

```tsx
export function WoodWorkerHomeView(): React.JSX.Element {
  return (
    <div
      className="flex h-full items-center justify-center bg-background"
      data-testid="home-page-wood-worker"
    >
      <h1 className="text-xl font-semibold text-foreground">wood_worker</h1>
    </div>
  );
}
```

**E3. `home-interface-registry.tsx`:**

```tsx
import type { ComponentType } from 'react';
import { WorkspaceRole, type WorkspaceRoleValue } from '@beyo/auth';
import { StandardWorkerHomeView } from './components/variants/StandardWorkerHomeView';
import { WoodWorkerHomeView } from './components/variants/WoodWorkerHomeView';

type HomeInterfaceKey = WorkspaceRoleValue | 'default';

// `default` = null workspace role (standard worker). Add one line per new interface.
export const homeInterfaceRegistry: Record<HomeInterfaceKey, ComponentType> = {
  default: StandardWorkerHomeView,
  [WorkspaceRole.WoodWorker]: WoodWorkerHomeView,
};
```

**E4. `components/HomeInterfaceRouter.tsx`:**

```tsx
import { useRole } from '@beyo/auth';
import { homeInterfaceRegistry } from '../home-interface-registry';

export function HomeInterfaceRouter(): React.JSX.Element {
  const { workspaceRoleName } = useRole();
  const Interface =
    homeInterfaceRegistry[workspaceRoleName ?? 'default'] ?? homeInterfaceRegistry.default;
  return <Interface />;
}
```

**E5. `route-entry.tsx`** — reduce to composition-only (complies with `01_architecture_local.md`; the current file violates it by holding `useState`):

```tsx
import { HomeInterfaceRouter } from './components/HomeInterfaceRouter';

export function HomeRouteEntry(): React.JSX.Element {
  return <HomeInterfaceRouter />;
}
```

> `HomePage.tsx` and `primary-tab-preload.ts` are unchanged — they still lazy-import `@/features/home/route-entry`. Provider composition now lives inside each variant (wood_worker needs no `WorkingSectionsHomeProvider`), which is correct: providers are per-interface, not global.

---

### Task F — Sync `architecture/12_auth_local.md`

The `AuthUser type override` block (lines 11–27) is stale after the store expansion. Update it to the current shape (`role: AuthRole`, `workspaceRoleId`, `workspaceRoleName`, `appScope`, `timeZone`, `backend_permissions`, `ui`, `jti`, `exp`) and add a one-line pointer that role/workspace-role enums are the source of truth in `@beyo/auth` (`roles.ts`) — see `19_permissions_local.md`. Documentation only; no code.

---

## Risks and mitigations

- Risk: Codex reaches for a TypeScript `enum`, which fails under `erasableSyntaxOnly`.
  Mitigation: Plan mandates `as const` objects + derived unions in Tasks A/B/C, and the constraint is in Assumptions and Acceptance Criteria #2.
- Risk: Duplicate type exports in `@beyo/auth/index.ts` (types exported from both `./roles` and `./store/auth.store`).
  Mitigation: Task B explicitly resolves each type to a single export source.
- Risk: New hooks consumed inside feature components could be read as a permissions-contract violation ("never read role in a component for a feature decision").
  Mitigation: `19_permissions_local.md` (Task A) scopes `useRole` to app-shell-level interface selection (which whole screen to render), which the canonical "App-shell role usage" section explicitly permits — distinct from gating an operation on a role.
- Risk: Home variant relocation breaks existing Playwright/tests keyed on `data-testid="home-page"`.
  Mitigation: `StandardWorkerHomeView` preserves `data-testid="home-page"`; new variant uses a distinct `home-page-wood-worker`.

## Validation plan

- `npm run typecheck` (workers app + `@beyo/auth`): zero errors (verifies enum-as-const, no `enum`, no duplicate barrel exports). No `npm install` needed — no new package.
- `npm run build` (workers app): succeeds.
- Manual: sign in as a `null`-workspace-role worker → home shows working-sections flow (`home-page`). Sign in as a `wood_worker` → home shows empty page titled `wood_worker` (`home-page-wood-worker`).
- `npx playwright test --grep home --project=mobile` and `--project=desktop`: existing home flow still passes (standard variant unchanged).

## Review log

- `2026-06-23` owner: directed a permission layer, workspace roles as enums, home as the first scalable consumer (null → current flow, wood_worker → empty titled page).
- `2026-06-23` owner: confirmed `backend_permissions`/`ui` scaffolded (store but do not gate on values); `app_scope` vs `role_name` stored independently (carried from store-expansion plan).
- `2026-06-23` owner: RESOLVED clarifications — extend the existing `@beyo/auth` package (no new `@beyo/permissions` package); enum naming `WorkspaceRole`/`AuthRole`/`AppScope`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
