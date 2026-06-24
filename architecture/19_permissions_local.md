> Extends: 19_permissions.md

# 19 — Permissions — ManagerBeyo Local Extension

## Two Layers

The canonical capability layer remains the long-term authorization UX model:
`usePermissions()` and `can()` check effective backend permission keys from
`backend_permissions`.

The local identity layer exists because `backend_permissions` and `ui` are
currently scaffold fields that are always empty. Today the only working signal
for broad interface selection is identity: `role` and `workspaceRoleName`.

## Location Override

The canonical contract places permission hooks in app-level `src/hooks/` and the
registry in `src/app/`. In this monorepo, reusable hooks and guards live in the
shared `@beyo/auth` package because they read the auth store that already lives
there.

Only the capability registry stays app-level:
`apps/<app>/src/app/permission-registry.ts`. It assembles app-specific feature
permission keys.

## Enum Source

Role, workspace-role, and app-scope enum objects live in `@beyo/auth` in
`roles.ts`.

They are `as const` objects named `WorkspaceRole`, `AuthRole`, and `AppScope`.
They must not be TypeScript `enum` declarations because package tsconfig uses
`erasableSyntaxOnly`.

Union types are derived from these objects. This is the single source of truth
for role checks across apps.

## `useRole()`

`useRole()` returns:

```ts
{
  role,
  workspaceRoleName,
  hasRole(role),
  isWorkspaceRole(workspaceRole),
}
```

Permitted use: app-shell-level decisions such as choosing which interface, nav,
or landing route to render.

Forbidden use: gating a feature operation on a role string. Feature operations
remain capability-layer decisions once `backend_permissions` is populated.

## Render Patterns

For whole-screen divergence, prefer an interface registry:

```ts
Record<WorkspaceRoleValue | "default", ComponentType>
```

A router component resolves `workspaceRoleName ?? "default"` and renders the
registered interface.

For inline divergence, use `RoleGuard`:

```tsx
<RoleGuard workspaceRole={WorkspaceRole.WoodWorker} fallback={fallback}>
  <WoodWorkerOnlyContent />
</RoleGuard>
```

## Migration Note

When `backend_permissions` ships with real values, role-driven booleans in
controllers should be swapped or combined with `can("feature:action")` without
changing presentational components.
