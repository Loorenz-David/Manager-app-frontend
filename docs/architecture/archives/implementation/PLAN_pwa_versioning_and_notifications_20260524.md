# PLAN_pwa_versioning_and_notifications_20260524

## Metadata

- Plan ID: `PLAN_pwa_versioning_and_notifications_20260524`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-24T00:00:00Z`
- Last updated at (UTC): `2026-05-24T06:54:24Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Add PWA support with reliable version-stamped service worker updates and first-visit install prompt.
- Business/user intent: Allow the app to be installed as a home-screen PWA and ensure every new deployment reaches installed instances without stalling on old cached code.
- Non-goals: Offline caching strategy, background sync, push notifications, iOS Safari install flow (no `beforeinstallprompt` on iOS).

## Scope

- In scope:
  - `vite-plugin-pwa` installation and Workbox configuration
  - App web manifest (name, icons, display mode, start URL)
  - Service worker with prompt-controlled updates (`registerType: 'prompt'`)
  - "New version available" bottom sheet surface — fires when the browser has downloaded a new SW and it is waiting to activate
  - "Install app" bottom sheet surface — fires on `beforeinstallprompt` in the browser (Chrome/Android); shown once per page session; suppressed if already running in standalone mode
  - Both surfaces wired through the existing `SurfaceProvider` / `useSurfaceStore` system

- Out of scope:
  - Offline caching (network-only is the default; caching strategy is deferred)
  - Background sync
  - Web push notifications
  - Dev-mode SW testing (`devOptions.enabled` left off to avoid interfering with development)

- Assumptions:
  - `vite-plugin-pwa@^0.21.x` is compatible with Vite `^8.0.12`. If the install fails due to a peer conflict, pin to the latest version that satisfies `"vite": ">=5"`.
  - `SurfaceProvider` is already initialized (registry set) when `PwaProvider` mounts, because both mount inside `RootRoute` and `PwaProvider` is a child of `SurfaceProvider`.
  - Real branded PNG icons (192×192 and 512×512) will be provided by the user before the first production release that targets installability. Placeholder 1×1 PNGs are created to unblock the build.

## Clarifications required

_(none — all decisions are documented above)_

## Acceptance criteria

1. `npm run build` produces `dist/sw.js` and `dist/manifest.webmanifest` with no Workbox errors.
2. Chrome DevTools > Application > Manifest shows the correct app name, icons, and `display: standalone`.
3. Deploying a trivial code change and reloading the running app causes the "New version available" sheet to appear; clicking **Update now** reloads the app to the new version.
4. After update, `dist/sw.js` precache contains only assets from the new build (old cache cleaned).
5. Opening the app in Chrome on a desktop or Android browser (not yet installed, not standalone) triggers the "Add to home screen" sheet once per page reload.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/15_feature_structure.md`: new `pwa` feature module structure
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: sheet surface registration pattern; `drawer` excluded (local override: `slide | sheet | modal` only)
- `architecture/06_client_state.md`: no additional Zustand store needed — surface stack state is managed by `useSurfaceStore`

### File read intent — pattern vs. relational

Permitted reads:
- `src/app/RootRoute.tsx`: existing mount point for `SurfaceProvider` + `AuthProvider`
- `src/app/surface-registry.ts`: verify spread pattern before adding `pwaSurfaces`
- `src/providers/SurfaceProvider.tsx`: verify `useSurfaceStore.getState().open(id, props)` API
- `src/features/images/surfaces.ts`: existing sheet registration pattern (shape reference only)

Prohibited:
- Reading other sheet page components to understand structure → the pattern is in `28_surfaces.md`

### Skill selection

- Primary skill: none (infrastructure + UI plumbing, no CRUD skill applies)

## Implementation plan

### Step 1 — Install `vite-plugin-pwa`

Working directory: `apps/managers-app/ManagerBeyo-app-managers/`

```bash
npm install --save-dev vite-plugin-pwa
```

If peer-dep conflict with Vite 8, install the latest version explicitly:

```bash
npm install --save-dev vite-plugin-pwa@latest
```

### Step 2 — Copy real branded icons to `public/`

Source directory: `images/appstore-images/` (relative to the monorepo root)

Copy the following files into `apps/managers-app/ManagerBeyo-app-managers/public/`:

| Source | Destination in `public/` |
|---|---|
| `images/appstore-images/android/launchericon-48x48.png` | `pwa-48x48.png` |
| `images/appstore-images/android/launchericon-72x72.png` | `pwa-72x72.png` |
| `images/appstore-images/android/launchericon-96x96.png` | `pwa-96x96.png` |
| `images/appstore-images/android/launchericon-144x144.png` | `pwa-144x144.png` |
| `images/appstore-images/android/launchericon-192x192.png` | `pwa-192x192.png` |
| `images/appstore-images/android/launchericon-512x512.png` | `pwa-512x512.png` |
| `images/appstore-images/ios/180.png` | `apple-touch-icon.png` |

The `apple-touch-icon.png` (180×180) is used by iOS Safari when the user taps "Add to
Home Screen" manually — it is referenced via a `<link rel="apple-touch-icon">` tag that
`vite-plugin-pwa` injects into `index.html` automatically when listed in `includeAssets`.

Bash commands to run from the monorepo root:

```bash
cp images/appstore-images/android/launchericon-48x48.png   apps/managers-app/ManagerBeyo-app-managers/public/pwa-48x48.png
cp images/appstore-images/android/launchericon-72x72.png   apps/managers-app/ManagerBeyo-app-managers/public/pwa-72x72.png
cp images/appstore-images/android/launchericon-96x96.png   apps/managers-app/ManagerBeyo-app-managers/public/pwa-96x96.png
cp images/appstore-images/android/launchericon-144x144.png apps/managers-app/ManagerBeyo-app-managers/public/pwa-144x144.png
cp images/appstore-images/android/launchericon-192x192.png apps/managers-app/ManagerBeyo-app-managers/public/pwa-192x192.png
cp images/appstore-images/android/launchericon-512x512.png apps/managers-app/ManagerBeyo-app-managers/public/pwa-512x512.png
cp images/appstore-images/ios/180.png                      apps/managers-app/ManagerBeyo-app-managers/public/apple-touch-icon.png
```

### Step 3 — Configure `vite.config.ts` with `VitePWA`

File: `apps/managers-app/ManagerBeyo-app-managers/vite.config.ts`

```ts
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-*.png'],
        manifest: {
          name: 'Manager Beyo',
          short_name: 'ManagerBeyo',
          description: 'Beyo workspace manager',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-48x48.png',   sizes: '48x48',   type: 'image/png' },
            { src: 'pwa-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: 'pwa-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: 'pwa-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['892a-155-4-95-121.ngrok-free.app'],
      proxy: env.API_TARGET_URL
        ? {
            '/api': {
              target: env.API_TARGET_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
```

Key workbox decisions:
- `skipWaiting: false` — new SW stays in `waiting` state; we control when it activates
- `clientsClaim: true` — once the new SW activates (after `SKIP_WAITING`), it immediately claims all clients
- `cleanupOutdatedCaches: true` — removes precache entries from previous builds after update
- `registerType: 'prompt'` — browser does NOT auto-activate the new SW; we detect `waiting` state and show the sheet

### Step 4 — Add `"types": ["vite-plugin-pwa/client"]` to `tsconfig.json`

File: `apps/managers-app/ManagerBeyo-app-managers/tsconfig.json`

Add to the `compilerOptions.types` array (or create it if absent):

```json
{
  "compilerOptions": {
    "types": ["vite-plugin-pwa/client"]
  }
}
```

This makes `virtual:pwa-register/react` resolvable to TypeScript without a `/// <reference>` in every file.

### Step 5 — Create `src/features/pwa/surfaces.ts`

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const PWA_UPDATE_SURFACE_ID = 'pwa-update';
export const PWA_INSTALL_SURFACE_ID = 'pwa-install';

export type PwaUpdateSurfaceProps = {
  onUpdate: () => void;
};

export type PwaInstallSurfaceProps = {
  onInstall: () => void;
};

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

### Step 6 — Create `src/features/pwa/pages/PwaUpdateSheetPage.tsx`

This sheet informs the user that a new version is ready and offers two actions:
**Update now** (activates new SW + reloads) or **Later** (dismisses the sheet; the update
will be picked up on next page reload naturally).

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { PWA_UPDATE_SURFACE_ID, type PwaUpdateSurfaceProps } from '../surfaces';

export function PwaUpdateSheetPage(): React.JSX.Element {
  const { onUpdate } = useSurfaceProps<PwaUpdateSurfaceProps>();

  function handleUpdate(): void {
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
    onUpdate?.();
  }

  function handleClose(): void {
    useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID);
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-2">
      <p className="py-3 text-sm text-muted-foreground">
        A new version of the app is available.
      </p>
      <button
        className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-base font-medium text-primary-foreground"
        data-testid="pwa-update-confirm-button"
        type="button"
        onClick={handleUpdate}
      >
        Update now
      </button>
      <button
        className="mt-2 flex h-12 w-full items-center justify-center text-sm text-muted-foreground"
        type="button"
        onClick={handleClose}
      >
        Later
      </button>
    </div>
  );
}
```

### Step 7 — Create `src/features/pwa/pages/PwaInstallSheetPage.tsx`

This sheet is shown once per session when the browser signals that the app is
installable. The user can accept (triggers the native install prompt) or dismiss
(the sheet is gone for the rest of the session; it will re-appear on the next
page reload if not yet installed).

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { PWA_INSTALL_SURFACE_ID, type PwaInstallSurfaceProps } from '../surfaces';

export function PwaInstallSheetPage(): React.JSX.Element {
  const { onInstall } = useSurfaceProps<PwaInstallSurfaceProps>();

  function handleInstall(): void {
    onInstall?.();
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  function handleClose(): void {
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID);
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-2">
      <p className="py-3 text-sm text-muted-foreground">
        Add Manager Beyo to your home screen for a faster experience.
      </p>
      <button
        className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-base font-medium text-primary-foreground"
        data-testid="pwa-install-confirm-button"
        type="button"
        onClick={handleInstall}
      >
        Add to home screen
      </button>
      <button
        className="mt-2 flex h-12 w-full items-center justify-center text-sm text-muted-foreground"
        type="button"
        onClick={handleClose}
      >
        Not now
      </button>
    </div>
  );
}
```

### Step 8 — Create `src/features/pwa/providers/PwaProvider.tsx`

`PwaProvider` must be mounted **inside** `SurfaceProvider` (so `useSurfaceStore` is
initialized) and **above** any route-level components (so the SW lifecycle hooks run
for all routes).

Update flow:
- `useRegisterSW()` tracks the SW registration lifecycle
- When `needsRefresh` becomes `true`, the browser has downloaded a new SW and it is
  in `waiting` state
- We open the update sheet and pass `onUpdate` which calls `updateServiceWorker(true)`
- `updateServiceWorker(true)` posts `SKIP_WAITING` to the waiting SW, then calls
  `window.location.reload()` — the page reloads under the new SW

Install flow:
- Listen for `beforeinstallprompt` once; call `event.preventDefault()` to suppress the
  native browser banner
- Suppress the sheet if already running in `standalone` mode (app already installed)
- Open the install sheet and pass `onInstall` which calls `deferredPrompt.prompt()`
- The `beforeinstallprompt` event is single-use; after calling `.prompt()` the reference
  is discarded

```tsx
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { PWA_INSTALL_SURFACE_ID, PWA_UPDATE_SURFACE_ID } from '../surfaces';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PwaProviderProps = {
  children: React.ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps): React.JSX.Element {
  const {
    needRefresh: [needsRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needsRefresh) return;
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, {
      onUpdate: () => {
        void updateServiceWorker(true);
      },
    });
  }, [needsRefresh, updateServiceWorker]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) return;

      useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, {
        onInstall: () => {
          void prompt.prompt();
        },
      });
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return <>{children}</>;
}
```

### Step 9 — Create `src/features/pwa/index.ts`

```ts
export { PwaProvider } from './providers/PwaProvider';
export { pwaSurfaces } from './surfaces';
```

### Step 10 — Register `pwaSurfaces` in `src/app/surface-registry.ts`

```ts
import { pwaSurfaces } from '@/features/pwa';
// ... existing imports

export const surfaceRegistry: SurfaceRegistrations = {
  ...pwaSurfaces,        // add first so it cannot accidentally shadow a domain surface
  ...testSurfaces,
  // ... existing spreads
};
```

### Step 11 — Mount `PwaProvider` in `src/app/RootRoute.tsx`

`PwaProvider` is placed inside `SurfaceProvider` (requires surface registry) but outside
`AuthProvider` (the update/install prompts are not auth-gated).

```tsx
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/features/auth';
import { SurfaceProvider } from '@/providers/SurfaceProvider';
import { PwaProvider } from '@/features/pwa';

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <PwaProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
```

## Risks and mitigations

- Risk: `vite-plugin-pwa` peer-dep conflict with Vite 8
  Mitigation: `vite-plugin-pwa@^0.21` supports Vite ≥ 5. If the `npm install` step reports a conflict, pin to the explicit latest release tag. Check `npm info vite-plugin-pwa peerDependencies` first.

- Risk: `virtual:pwa-register/react` not resolved by TypeScript in dev
  Mitigation: Step 4 adds `"types": ["vite-plugin-pwa/client"]` to `tsconfig.json`. If the error persists, also add `/// <reference types="vite-plugin-pwa/client" />` to `vite-env.d.ts`.

- Risk: `beforeinstallprompt` does not fire on iOS Safari
  Mitigation: Expected and accepted. The install sheet is a Chrome/Android enhancement. iOS users install via the Safari share sheet manually; no special handling needed.

- Risk: `beforeinstallprompt` does not fire if the manifest is invalid or icons are missing from `public/`
  Mitigation: Step 2 copies the real branded Android launcher icons and the iOS 180×180 icon into `public/`. All required sizes are present. If an icon file is accidentally missing at build time, Workbox will log a warning during `npm run build` — check the build output.

- Risk: The update sheet opens but "Later" means the update is deferred indefinitely in that session
  Mitigation: Accepted. The SW remains in `waiting` state; on the next page reload (new session), `useRegisterSW` will detect the waiting SW again and re-show the sheet. The user is never stuck on a stale version indefinitely.

- Risk: SW not generated in dev mode (default `devOptions.enabled: false`)
  Mitigation: Expected. The update flow can only be tested with a production build:
  `npm run build && npm run preview`. Service worker behavior must not be tested against the dev server.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run build`: succeeds; `dist/sw.js` and `dist/manifest.webmanifest` present
- Manual — Manifest: open Chrome DevTools > Application > Manifest; verify name `Manager Beyo`, `display: standalone`, icons listed
- Manual — SW registration: Chrome DevTools > Application > Service Workers; verify `sw.js` is active
- Manual — Update flow: `npm run build && npm run preview`; open app; make a trivial code change; rebuild; navigate to the running preview tab; verify update sheet appears; click **Update now**; verify page reloads to the new version
- Manual — Install flow: open the preview URL in Chrome on a device that has not installed the app; verify install sheet appears

## Review log

_(empty)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
