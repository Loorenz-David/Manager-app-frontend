# PLAN_shared_pwa_runtime_contract_20260530

## Metadata

- Plan ID: `PLAN_shared_pwa_runtime_contract_20260530`
- Status: `archived`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T20:00:00Z`
- Last updated at (UTC): `2026-05-30T15:50:58Z`
- Related issue/ticket: PWA package extraction — phase 1 of 3
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_shared_pwa_core_package_abstraction_20260530.md`

## Goal and intent

- Goal: Create `packages/pwa/` — a source package that exposes the reusable PWA runtime lifecycle (SW registration, update detection, install prompt capture, standalone detection) with no app-specific routing, branding, or surface-system assumptions.
- Business/user intent: Multiple apps need reliable PWA update and install behaviour. Extracting the proven managers-app logic prevents divergence and duplication.
- Non-goals: Consuming the package in any app. Modifying vite configs, manifest files, or icon assets. Including sheet page UI components (those stay app-owned).

## Scope

- In scope: `packages/pwa/` package creation only — `package.json`, `tsconfig.json`, `src/types.ts`, `src/providers/PwaProvider.tsx`, `src/index.ts`. Run `npm install` from `frontend/` root.
- Out of scope: Managers app changes, workers app changes, surface registrations, sheet UI components.
- Assumptions:
  - Pre-migration gate fixes (`PLAN_managers_pwa_update_reliability_hotfix_20260530` and `PLAN_managers_pwa_update_detection_latency_20260530`) have already been applied to the managers app's `PwaProvider.tsx`. This plan extracts the already-fixed implementation.
  - `vite-plugin-pwa ≥ 0.13.2` is installed by consuming apps. The `reloadPage` param on `updateServiceWorker` is ignored by the library; `onNeedReload` is the correct override point.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package structure, `package.json` template, `tsconfig.json` template, peer-dependency rules, source-only philosophy, `@source` directives, surface-openers injection pattern (§13).

## Implementation plan

### Step 1 — Create `packages/pwa/package.json`

```json
{
  "name": "@beyo/pwa",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "react": ">=19.0.0",
    "vite-plugin-pwa": ">=0.13.2"
  }
}
```

### Step 2 — Create `packages/pwa/tsconfig.json`

Follow the exact template from `architecture/35_shared_packages.md` §5:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node", "vite/client"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src"]
}
```

### Step 3 — Create `packages/pwa/src/types.ts`

Three exported types used by both the package's `PwaProvider` and the consuming app's sheet pages and `RootRoute`:

```ts
export type PwaUpdateSurfaceProps = {
  onUpdate: () => Promise<void>;
};

export type PwaInstallSurfaceProps = {
  onInstall: () => Promise<void>;
};

export type PwaSurfaceOpeners = {
  openUpdatePrompt?: (props: PwaUpdateSurfaceProps) => void;
  openInstallPrompt?: (props: PwaInstallSurfaceProps) => void;
  closeInstallPrompt?: () => void;
};
```

**`openUpdatePrompt`**: Called when a new service worker is waiting. The app opens its update sheet surface passing the `PwaUpdateSurfaceProps` object.

**`openInstallPrompt`**: Called when `beforeinstallprompt` fires and the app is not already in standalone mode. The app opens its install sheet surface.

**`closeInstallPrompt`**: Called when the `appinstalled` event fires (user installed via browser controls, not through our sheet). The app closes the install sheet if it is open.

**Responsibility split — surface closing:**

The package's `onUpdate` callback does NOT close the update surface. The app's update sheet page is responsible for calling `useSurfaceStore.getState().close(PWA_UPDATE_SURFACE_ID)` before awaiting `onUpdate()`. This separation keeps surface lifecycle in the app layer where it belongs.

The package's `onInstall` callback also does NOT close the install surface. The app's install sheet page closes the surface after `await onInstall()` resolves.

### Step 4 — Create `packages/pwa/src/providers/PwaProvider.tsx`

This is the runtime orchestrator. It is a direct extraction of the fixed `PwaProvider.tsx` from the managers app, with:

1. `useSurfaceStore` calls replaced by `surfaceOpeners` callbacks (§13 pattern)
2. `@/` alias imports replaced by relative imports
3. Both pre-migration fixes already incorporated:
   - `onNeedReload: () => { window.location.href = '/'; }` — replaces `window.location.reload()` to avoid iOS PWA viewport reset
   - `onRegisteredSW` + `visibilitychange` + 30-min interval for proactive update detection

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { PwaInstallSurfaceProps, PwaSurfaceOpeners, PwaUpdateSurfaceProps } from '../types';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaProviderProps = {
  surfaceOpeners: PwaSurfaceOpeners;
  children: ReactNode;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function PwaProvider({ surfaceOpeners, children }: PwaProviderProps): React.JSX.Element {
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const hasShownInstallPromptRef = useRef(false);
  const hasShownUpdatePromptRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const surfaceOpenersRef = useRef(surfaceOpeners);
  surfaceOpenersRef.current = surfaceOpeners;

  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onNeedReload() {
      // iOS PWA: location.reload() breaks viewport/safe-area; href navigation reinitializes cleanly
      window.location.href = '/';
    },
    onRegisteredSW(_swScriptUrl, registration) {
      registrationRef.current = registration ?? null;
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        console.error('[PWA] Service worker registration failed.', error);
      }
    },
  });

  useEffect(() => {
    function checkForUpdate(): void {
      void registrationRef.current?.update();
    }
    function handleVisibilityChange(): void {
      if (document.visibilityState === 'visible') checkForUpdate();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = setInterval(checkForUpdate, 30 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!needRefresh) {
      hasShownUpdatePromptRef.current = false;
      return;
    }
    if (hasShownUpdatePromptRef.current) return;
    hasShownUpdatePromptRef.current = true;

    const props: PwaUpdateSurfaceProps = {
      onUpdate: async () => {
        setNeedRefresh(false);
        // App sheet has already triggered close animation before calling onUpdate
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await updateServiceWorker(true);
      },
    };
    surfaceOpenersRef.current.openUpdatePrompt?.(props);
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event): void {
      if (isStandalone() || hasShownInstallPromptRef.current) return;
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      installPromptRef.current = promptEvent;
      hasShownInstallPromptRef.current = true;

      const props: PwaInstallSurfaceProps = {
        onInstall: async () => {
          const pendingPrompt = installPromptRef.current;
          if (!pendingPrompt) return;
          await pendingPrompt.prompt();
          await pendingPrompt.userChoice;
          installPromptRef.current = null;
        },
      };
      surfaceOpenersRef.current.openInstallPrompt?.(props);
    }

    function handleAppInstalled(): void {
      installPromptRef.current = null;
      surfaceOpenersRef.current.closeInstallPrompt?.();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return <>{children}</>;
}
```

**Key design decisions:**

- `surfaceOpenersRef` (latest-ref pattern): the ref is updated synchronously on every render so event handlers always read the latest `surfaceOpeners` without needing it as an effect dependency. This prevents re-mounting install/update event listeners if the parent passes a non-memoized object.
- `onUpdate` does NOT call `closeUpdatePrompt` — the app's sheet page owns that responsibility (see §13 ownership table in `architecture/35_shared_packages.md`).
- `onInstall` does NOT close the install surface — the app's install sheet page calls close after `await onInstall()` resolves.

### Step 5 — Create `packages/pwa/src/index.ts`

```ts
export { PwaProvider } from './providers/PwaProvider';
export type { PwaInstallSurfaceProps, PwaSurfaceOpeners, PwaUpdateSurfaceProps } from './types';
```

### Step 6 — Run `npm install` from `frontend/`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify `node_modules/@beyo/pwa` is a symlink to `packages/pwa/`.

### Step 7 — Typecheck the package

```bash
cd packages/pwa && npx tsc --noEmit
```

Zero TypeScript errors required before proceeding to `PLAN_workers_first_pwa_runtime_adoption_20260530`.

## `@source` directive

`@beyo/pwa` contains no `className` props or Tailwind class names. No `@source` directive is needed in any consuming app's `index.css`.

## Acceptance criteria

1. `packages/pwa/` exists with the four files described above.
2. `node_modules/@beyo/pwa` is a workspace symlink.
3. `npx tsc --noEmit` inside `packages/pwa/` exits zero.
4. No app has been modified — this plan touches only `packages/pwa/`.

## Validation plan

- `npx tsc --noEmit` in `packages/pwa/`: zero TypeScript errors

## Risks and mitigations

- Risk: `virtual:pwa-register/react` types are not resolvable at the package level without `vite-plugin-pwa` installed.
  Mitigation: `vite-plugin-pwa` is listed as a `peerDependency`. TypeScript resolves `virtual:pwa-register/react` through the module declaration in `node_modules/vite-plugin-pwa/react.d.ts`, which is present because the managers app already has it installed at the workspace root.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `github-copilot`
