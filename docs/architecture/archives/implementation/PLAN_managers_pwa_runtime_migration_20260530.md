# PLAN_managers_pwa_runtime_migration_20260530

## Metadata

- Plan ID: `PLAN_managers_pwa_runtime_migration_20260530`
- Status: `archived`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T20:00:00Z`
- Last updated at (UTC): `2026-05-30T15:58:28Z`
- Related issue/ticket: PWA package extraction — phase 3 of 3
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shared_pwa_core_package_abstraction_20260530.md`

## Goal and intent

- Goal: Replace the managers app's local `PwaProvider` with the shared `@beyo/pwa` package runtime, keeping the managers app's own surface registrations and sheet pages intact.
- Business/user intent: Eliminates divergence between apps and ensures both apps benefit from any future fixes to the shared runtime. The managers app was the source of truth for the PWA logic — this completes the extraction loop.
- Non-goals: Changing the managers app's vite config, manifest, icons, or sheet page UI copy. Deleting the managers app's PWA surface registrations or sheet pages (those stay — they are app-owned).

## Prerequisites

Both prerequisites must be complete before starting this plan:

1. `PLAN_managers_pwa_update_reliability_hotfix_20260530` — applied to the managers app's `PwaProvider.tsx` (fixes already in place in the local file and captured in the package).
2. `PLAN_workers_first_pwa_runtime_adoption_20260530` — workers app has validated the `@beyo/pwa` package runtime in production.

## Scope

- In scope:
  - Managers app `package.json` — add `@beyo/pwa: "*"` to dependencies
  - Managers app `RootRoute.tsx` — replace local `PwaProvider` import with `@beyo/pwa`, add `surfaceOpeners`
  - Managers app `src/features/pwa/surfaces.ts` — remove `PwaUpdateSurfaceProps` / `PwaInstallSurfaceProps` type definitions (now imported from `@beyo/pwa`), keep surface IDs and `pwaSurfaces` registrations
  - Managers app `src/features/pwa/pages/PwaUpdateSheetPage.tsx` — update `handleUpdate` to close the surface before calling `await onUpdate()` (responsibility shift)
  - Managers app `src/features/pwa/pages/PwaInstallSheetPage.tsx` — update `handleInstall` to close the surface after `await onInstall()` resolves (responsibility shift)
  - Managers app `src/features/pwa/providers/PwaProvider.tsx` — **delete**
  - Managers app `src/features/pwa/index.ts` — remove `PwaProvider` export
  - Run `npm install` from `frontend/`
- Out of scope: `packages/pwa/` changes. Workers app changes. Managers app vite config, manifest, icons.
- Assumptions: After applying the pre-migration fix plans, the managers `PwaProvider.tsx` already uses `onNeedReload` and `onRegisteredSW`. The package's `PwaProvider` is an exact extraction of that fixed state.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: §9 Step 5 (migrate managers app), §13 (surface openers ownership table).

## Implementation plan

### Step 1 — Add `@beyo/pwa` to managers `package.json`

In `apps/managers-app/ManagerBeyo-app-managers/package.json`, add to `dependencies`:

```json
"@beyo/pwa": "*"
```

### Step 2 — Run `npm install`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

### Step 3 — Update `src/features/pwa/surfaces.ts`

Remove the local `PwaUpdateSurfaceProps` and `PwaInstallSurfaceProps` type definitions — they are now canonical in `@beyo/pwa`. Re-export them from the package so the sheet pages do not need to change their import path:

```ts
import { lazy } from 'react';
import type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps } from '@beyo/pwa';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps };

export const PWA_UPDATE_SURFACE_ID = 'pwa-update';
export const PWA_INSTALL_SURFACE_ID = 'pwa-install';

function loadPwaUpdateSheetPage() {
  return import('@/features/pwa/pages/PwaUpdateSheetPage').then((module) => ({
    default: module.PwaUpdateSheetPage,
  }));
}

function loadPwaInstallSheetPage() {
  return import('@/features/pwa/pages/PwaInstallSheetPage').then((module) => ({
    default: module.PwaInstallSheetPage,
  }));
}

export const pwaSurfaces: SurfaceRegistrations = {
  [PWA_UPDATE_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadPwaUpdateSheetPage),
  },
  [PWA_INSTALL_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadPwaInstallSheetPage),
  },
};
```

The surface IDs, lazy registrations, and `pwaSurfaces` export are unchanged. Only the type definitions move to re-exports from `@beyo/pwa`.

### Step 4 — Update `PwaUpdateSheetPage.tsx`

The `onUpdate` callback from `@beyo/pwa` no longer closes the surface — that is now the sheet page's responsibility. Update `handleUpdate` to close the surface before calling `onUpdate()`:

**Before:**
```tsx
async function handleUpdate(): Promise<void> {
  if (!onUpdate || isUpdating) {
    return;
  }
  try {
    setIsUpdating(true);
    await onUpdate(); // onUpdate used to close the surface internally
  } finally {
    setIsUpdating(false);
  }
}
```

**After:**
```tsx
async function handleUpdate(): Promise<void> {
  if (!onUpdate || isUpdating) return;
  setIsUpdating(true);
  useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
  await onUpdate();
}
```

The `try/finally` is removed: `setIsUpdating(false)` would never execute because `onUpdate()` navigates the page away (`window.location.href = '/'`).

No changes to the JSX, header setup, or the "Later" button handler.

### Step 5 — Update `PwaInstallSheetPage.tsx`

The `onInstall` callback from `@beyo/pwa` no longer closes the surface. Update `handleInstall` to close the surface after `await onInstall()` resolves:

**Before:**
```tsx
async function handleInstall(): Promise<void> {
  if (!onInstall || isInstalling) {
    return;
  }
  try {
    setIsInstalling(true);
    await onInstall(); // onInstall used to close the surface internally
  } finally {
    setIsInstalling(false);
  }
}
```

**After:**
```tsx
async function handleInstall(): Promise<void> {
  if (!onInstall || isInstalling) return;
  setIsInstalling(true);
  await onInstall();
  setIsInstalling(false);
  useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
}
```

`onInstall` triggers the native browser install prompt and waits for user choice. After it resolves, the sheet closes. The `appinstalled` path is handled by the package calling `surfaceOpeners.closeInstallPrompt` — no duplication.

No changes to the JSX or the "Not now" button handler.

### Step 6 — Update `src/features/pwa/index.ts`

Remove the `PwaProvider` export — it is no longer local:

```ts
export { pwaSurfaces } from './surfaces';
```

### Step 7 — Delete `src/features/pwa/providers/PwaProvider.tsx`

This file is fully replaced by `@beyo/pwa`'s `PwaProvider`. Delete it.

Also delete `src/features/pwa/providers/` directory if it becomes empty.

### Step 8 — Update `RootRoute.tsx`

Replace the local `PwaProvider` import with the package import and add `surfaceOpeners`:

```tsx
import { Outlet } from 'react-router-dom';
import { PwaProvider } from '@beyo/pwa';
import type { PwaSurfaceOpeners } from '@beyo/pwa';
import { AuthProvider } from '@beyo/auth';
import { ROUTES } from '@/lib/routes';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { SurfaceProvider } from '@/providers/SurfaceProvider';
import { PWA_INSTALL_SURFACE_ID, PWA_UPDATE_SURFACE_ID } from '@/features/pwa/surfaces';

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) => useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) => useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () => useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
        <AuthProvider signInRoute={ROUTES.signIn}>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
```

`pwaSurfaceOpeners` is a module-level constant. The callbacks read `useSurfaceStore.getState()` at call time — the store is initialized by `SurfaceProvider` which is the parent in the tree.

### Step 9 — Typecheck

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck --workspace=apps/managers-app/ManagerBeyo-app-managers
```

Zero TypeScript errors required.

### Step 10 — Verify no remaining `@/features/pwa/providers/PwaProvider` references

```bash
grep -r "features/pwa/providers\|from.*features/pwa.*PwaProvider" \
  apps/managers-app/ManagerBeyo-app-managers/src/
```

Must return no matches.

## Ownership after migration

| File | Owner after migration |
|---|---|
| `packages/pwa/src/providers/PwaProvider.tsx` | Package — runtime orchestration, SW lifecycle |
| `apps/managers-app/.../features/pwa/surfaces.ts` | Managers app — surface IDs, lazy registrations |
| `apps/managers-app/.../features/pwa/pages/PwaUpdateSheetPage.tsx` | Managers app — update prompt UI |
| `apps/managers-app/.../features/pwa/pages/PwaInstallSheetPage.tsx` | Managers app — install prompt UI |
| `apps/managers-app/vite.config.ts` (PWA section) | Managers app — build config, manifest, icons |

## Acceptance criteria

1. Managers app builds and typechecks without errors.
2. `src/features/pwa/providers/PwaProvider.tsx` no longer exists in the managers app.
3. `PwaProvider` in `RootRoute.tsx` is imported from `@beyo/pwa`.
4. Update and install behaviour is functionally identical to pre-migration: update sheet appears when a new SW is waiting, "Update now" produces a clean layout after navigation, install sheet appears on supported browsers.
5. Both apps (managers and workers) pass typecheck.

## Validation plan

- `npm run typecheck` (managers app): zero errors
- `npm run build` (managers app): builds without errors
- Manual regression: install the managers PWA, deploy an update, verify update sheet and post-update layout are correct (same as validated in the hotfix plans).

## Risks and mitigations

- Risk: The managers app's `PwaUpdateSheetPage` currently relies on `onUpdate` closing the surface. Forgetting Step 4 would leave the surface open after navigation, then showing stale state on next app open.
  Mitigation: Step 4 is explicit and changes the `handleUpdate` signature. Typecheck won't catch this — validate manually.
- Risk: `useSurfaceStore.getState().open/close` method names differ from what was assumed.
  Mitigation: Check the actual method names in `@beyo/ui`'s `SurfaceProvider` before writing Step 8.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `github-copilot`
