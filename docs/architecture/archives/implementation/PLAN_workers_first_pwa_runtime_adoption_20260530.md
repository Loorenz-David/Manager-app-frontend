# PLAN_workers_first_pwa_runtime_adoption_20260530

## Metadata

- Plan ID: `PLAN_workers_first_pwa_runtime_adoption_20260530`
- Status: `archived`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T20:00:00Z`
- Last updated at (UTC): `2026-05-30T15:55:47Z`
- Related issue/ticket: PWA package extraction — phase 2 of 3
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shared_pwa_core_package_abstraction_20260530.md`

## Goal and intent

- Goal: Make the workers app a fully functional PWA that consumes `@beyo/pwa` for its runtime lifecycle, replacing the existing placeholder `PwaProvider`. The workers app is the validation gate before the managers app migrates.
- Business/user intent: Workers use the app on-site on mobile devices. Having it installable as a PWA improves reliability and performance on repeated visits.
- Non-goals: Modifying `packages/pwa/`. Changing the managers app. Reusing the managers app's icons or manifest values.

## Prerequisites

`PLAN_shared_pwa_runtime_contract_20260530` must be complete and `packages/pwa/` must typecheck cleanly before starting this plan.

## Scope

- In scope:
  - Workers app `vite.config.ts` — add `VitePWA` plugin
  - Workers app `package.json` — add `@beyo/pwa: "*"` (dependency) and `vite-plugin-pwa: "^1.3.0"` (devDependency)
  - Workers app `src/features/pwa/` — create surfaces, sheet pages, and index
  - Workers app surface registry — register PWA surfaces
  - Workers app `RootRoute.tsx` — replace placeholder `PwaProvider` with `@beyo/pwa`'s `PwaProvider` wired to surface openers
  - Workers app `public/` — add PWA icon assets and `apple-touch-icon.png`
  - Workers app `index.html` — add apple-touch-icon link if not present
  - Run `npm install` from `frontend/`
- Out of scope: `packages/pwa/` changes. Managers app changes.
- Assumptions: The workers app's existing placeholder `PwaProvider` at `src/features/pwa/PwaProvider.tsx` is a passthrough wrapper. It is replaced entirely.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: §6 (consuming apps), §13 (surface openers injection pattern).

## Implementation plan

### Step 1 — Update workers `package.json`

Add to `dependencies`:
```json
"@beyo/pwa": "*"
```

Add to `devDependencies`:
```json
"vite-plugin-pwa": "^1.3.0"
```

### Step 2 — Run `npm install`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify `node_modules/@beyo/pwa` is a workspace symlink to `packages/pwa/`.

### Step 3 — Configure `vite.config.ts` with VitePWA

Add `VitePWA` to the plugins array. All PWA configuration is app-owned (manifest values, icon paths, workbox config). Mirror the managers app's workbox settings (`skipWaiting: false`, `clientsClaim: true`, `cleanupOutdatedCaches: true`, `registerType: "prompt"`). Use Worker Beyo branding:

```ts
import { VitePWA } from 'vite-plugin-pwa';

// Inside defineConfig plugins array:
VitePWA({
  registerType: 'prompt',
  injectRegister: 'auto',
  includeAssets: [
    'favicon.svg',
    'apple-touch-icon.png',
    'pwa-48x48.png',
    'pwa-72x72.png',
    'pwa-96x96.png',
    'pwa-144x144.png',
    'pwa-192x192.png',
    'pwa-512x512.png',
  ],
  manifest: {
    name: 'Worker Beyo',
    short_name: 'WorkerBeyo',
    description: 'Beyo workspace worker',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: 'pwa-48x48.png', sizes: '48x48', type: 'image/png' },
      { src: 'pwa-72x72.png', sizes: '72x72', type: 'image/png' },
      { src: 'pwa-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: 'pwa-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    cleanupOutdatedCaches: true,
    skipWaiting: false,
    clientsClaim: true,
  },
}),
```

### Step 4 — Add PWA icon assets to `public/`

Copy the icon files from the managers app's `public/` directory into the workers app's `public/`:

- `favicon.svg`
- `apple-touch-icon.png`
- `pwa-48x48.png`
- `pwa-72x72.png`
- `pwa-96x96.png`
- `pwa-144x144.png`
- `pwa-192x192.png`
- `pwa-512x512.png`

These are placeholder icons for now — the workers app can replace them with its own branded assets later without any code changes.

### Step 5 — Update `index.html`

Add the apple-touch-icon link in `<head>` if not already present:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### Step 6 — Create `src/features/pwa/surfaces.ts`

Surface IDs, props types (re-exported from `@beyo/pwa`), and surface registrations are app-owned. The workers app declares its own surface IDs:

```ts
import { lazy } from 'react';
import type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps } from '@beyo/pwa';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export { PwaInstallSurfaceProps, PwaUpdateSurfaceProps };

export const PWA_UPDATE_SURFACE_ID = 'pwa-update';
export const PWA_INSTALL_SURFACE_ID = 'pwa-install';

function loadPwaUpdateSheetPage() {
  return import('@/features/pwa/pages/PwaUpdateSheetPage').then((m) => ({
    default: m.PwaUpdateSheetPage,
  }));
}

function loadPwaInstallSheetPage() {
  return import('@/features/pwa/pages/PwaInstallSheetPage').then((m) => ({
    default: m.PwaInstallSheetPage,
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

### Step 7 — Create `src/features/pwa/pages/PwaUpdateSheetPage.tsx`

The workers app's update sheet page. The key behavioral difference from the old managers app pattern: **the sheet calls `close()` before `await onUpdate()`** so the dismiss animation can complete during the 300ms delay that `onUpdate` introduces in the package.

```tsx
import { useEffect, useState } from 'react';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { PWA_UPDATE_SURFACE_ID, type PwaUpdateSurfaceProps } from '../surfaces';

export function PwaUpdateSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { onUpdate } = useSurfaceProps<PwaUpdateSurfaceProps>();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    header?.setTitle('New version available');
    header?.setActions(null);
  }, [header]);

  async function handleUpdate(): Promise<void> {
    if (!onUpdate || isUpdating) return;
    setIsUpdating(true);
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
    await onUpdate();
  }

  function handleLater(): void {
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm leading-6 text-muted-foreground">
        A new deployment is ready. Reload to switch this installed app to the latest version.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="pwa-update-confirm-button"
          disabled={isUpdating}
          type="button"
          onClick={() => { void handleUpdate(); }}
        >
          {isUpdating ? 'Updating...' : 'Update now'}
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
          type="button"
          onClick={handleLater}
        >
          Later
        </button>
      </div>
    </div>
  );
}
```

### Step 8 — Create `src/features/pwa/pages/PwaInstallSheetPage.tsx`

```tsx
import { useEffect, useState } from 'react';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { PWA_INSTALL_SURFACE_ID, type PwaInstallSurfaceProps } from '../surfaces';

export function PwaInstallSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { onInstall } = useSurfaceProps<PwaInstallSurfaceProps>();
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    header?.setTitle('Install app');
    header?.setActions(null);
  }, [header]);

  async function handleInstall(): Promise<void> {
    if (!onInstall || isInstalling) return;
    setIsInstalling(true);
    await onInstall();
    setIsInstalling(false);
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  function handleDismiss(): void {
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <p className="text-sm leading-6 text-muted-foreground">
        Add Worker Beyo to your home screen for a full-screen app experience and faster relaunches.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="pwa-install-confirm-button"
          disabled={isInstalling}
          type="button"
          onClick={() => { void handleInstall(); }}
        >
          {isInstalling ? 'Opening prompt...' : 'Add to home screen'}
        </button>
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
          type="button"
          onClick={handleDismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

### Step 9 — Create `src/features/pwa/index.ts`

```ts
export { pwaSurfaces } from './surfaces';
```

Note: `PwaProvider` is no longer exported from the feature — it is imported directly from `@beyo/pwa` in `RootRoute.tsx`.

### Step 10 — Register PWA surfaces in the workers app surface registry

The workers app has a surface registry file (check `src/app/surface-registry.ts` or wherever surfaces are registered). Add:

```ts
import { pwaSurfaces } from '@/features/pwa';

// merge into the registry:
...pwaSurfaces,
```

### Step 11 — Update `RootRoute.tsx`

Replace the local placeholder `PwaProvider` with `@beyo/pwa`'s `PwaProvider` and wire up the surface openers:

```tsx
import { Outlet } from 'react-router-dom';
import { PwaProvider } from '@beyo/pwa';
import type { PwaSurfaceOpeners } from '@beyo/pwa';
import { AuthProvider } from '@/features/auth';
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
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
```

`pwaSurfaceOpeners` is defined at module level (not inside the component) because the callbacks call `useSurfaceStore.getState()` at invocation time — Zustand's store state is read at call time, not at definition time. No `useMemo` or `useCallback` needed.

Delete the line that imported the old placeholder `PwaProvider` from `@/features/pwa`.

### Step 12 — Delete the placeholder `PwaProvider`

Delete `src/features/pwa/PwaProvider.tsx` (the passthrough wrapper). This file is replaced by the `@beyo/pwa` import.

### Step 13 — Typecheck

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers
```

Zero TypeScript errors required.

## `@source` directive

`@beyo/pwa` has no Tailwind class names — no `@source` needed in the workers app `index.css`.

## Acceptance criteria

1. Workers app builds (`npm run build`) and typechecks without errors.
2. Workers app is installable as a PWA (manifest present, SW registers, install prompt fires on supported browsers).
3. When a new version is deployed, the workers app shows the update sheet and "Update now" navigates cleanly without layout breakage.
4. Old placeholder `PwaProvider.tsx` is deleted.

## Validation plan

- `npm run typecheck` (workers app): zero errors
- `npm run build` (workers app): builds without errors, generates SW manifest
- Manual: Install the workers PWA on a device, deploy an update, verify the update sheet appears and "Update now" produces a clean, usable UI after navigation.

## Risks and mitigations

- Risk: The workers app surface registry file location differs from managers. 
  Mitigation: Check `src/app/` for the existing registry file before adding `pwaSurfaces`.
- Risk: `useSurfaceStore.getState().open/close` method names may differ from the managers app.
  Mitigation: Check the workers app's `SurfaceProvider` (or `@beyo/ui`'s `SurfaceProvider`) for the exact method signatures before using them.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `github-copilot`
