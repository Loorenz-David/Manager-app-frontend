# PLAN_worker_app_auth_home_20260528

## Metadata

- Plan ID: `PLAN_worker_app_auth_home_20260528`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-28T00:00:00Z`
- Last updated at (UTC): `2026-05-28T08:55:02Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Wire `@beyo/*` shared packages into the workers app. Deliver a working login flow and home page with bottom tab navigation. Confirm with a Playwright test.
- Business/user intent: The workers app is a new application sharing the same foundation as the managers app. All shared logic (auth, API client, UI, hooks) must come from the `packages/` monorepo packages, not from local copies.
- Non-goals: Feature pages (tasks, cases, stats, settings) are out of scope — stubs only. PWA functionality is out of scope — stub only.

## Scope

- In scope:
  - Adding all `@beyo/*` dependencies and missing peer deps to workers app `package.json`
  - Configuring Tailwind CSS v4 via `@tailwindcss/vite` in `vite.config.ts`
  - Adding `@` path alias to `vite.config.ts` and `tsconfig.app.json`
  - Cleaning `src/index.css` (import from `@beyo/styles`, remove duplicated tokens, remove managers-specific animations)
  - Creating thin re-export files that bridge package exports to the `@/` import paths the `app/` files already use
  - Creating app-specific wrappers for `AuthProvider`, `GuestRoute`, `ProtectedRoute` that pre-apply workers-app routes
  - Resetting `src/app/surface-registry.ts` to an empty registry (feature surfaces do not exist yet)
  - Creating stub pages for all routes so the router compiles
  - Writing a Playwright test: redirect to sign-in → login → home page with tab bar visible
- Out of scope:
  - Any feature pages beyond stubs (tasks, cases, stats, settings)
  - PWA service worker, install prompt
  - Any modification to `src/app/App.tsx`, `AppShell.tsx`, `RootRoute.tsx`, `SurfaceRouteFrame.tsx`, `TabOutlet.tsx`, `providers.tsx`, `router.tsx` — these must NOT be touched

- Assumptions:
  - `npm install` is always run from `frontend/` root, never from inside the app or package
  - Test credentials are available in `apps/workers-app/ManagerBeyo-app-workers/.env.test` as `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD`
  - The backend is running and accessible at `VITE_API_URL` (set in `.env` or `.env.test`)

## Acceptance criteria

1. `npm run build` from `apps/workers-app/ManagerBeyo-app-workers/` exits with code 0
2. `npm run typecheck` (or `tsc -b --noEmit`) from `apps/workers-app/ManagerBeyo-app-workers/` exits with code 0 — zero TypeScript errors
3. `npm run test:e2e` from `apps/workers-app/ManagerBeyo-app-workers/` — all Playwright tests pass on both `mobile` and `desktop` projects
4. Navigating to `http://localhost:5174/` without being signed in redirects to `/sign-in`
5. Entering valid credentials on `/sign-in` navigates to `/` and renders `data-testid="app-shell"` and `data-testid="bottom-tab-bar"`
6. All 5 tab buttons are visible: `tab-home`, `tab-tasks`, `tab-cases`, `tab-stats`, `tab-settings`

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: authoritative contract for package architecture, peer deps, and no-`@/`-in-packages rule

## Implementation plan

Work through each phase in order. Do not skip phases. Do not modify any file not listed in this plan.

---

### Phase 1 — Update workers app `package.json`

**File:** `apps/workers-app/ManagerBeyo-app-workers/package.json`
**Action:** MODIFY — replace the entire file with the content below.

```json
{
  "name": "managerbeyo-app-workers",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5174",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  },
  "dependencies": {
    "@beyo/api-client": "*",
    "@beyo/auth": "*",
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/styles": "*",
    "@beyo/ui": "*",
    "@hookform/resolvers": "^5.0.0",
    "@tanstack/react-query": "^5.100.14",
    "@use-gesture/react": "^10.3.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^12.40.0",
    "libphonenumber-js": "^1.11.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-day-picker": "^9.7.0",
    "react-dom": "^19.2.6",
    "react-hook-form": "^7.76.1",
    "react-router-dom": "^7.6.0",
    "react-textarea-autosize": "^8.5.9",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "ulid": "^3.0.0",
    "vaul": "^1.1.2",
    "zod": "^4.4.3",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@playwright/test": "^1.60.0",
    "@tailwindcss/vite": "^4.1.0",
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12"
  }
}
```

**Why each addition:**
- `@beyo/*`: the shared packages this app consumes
- `react-router-dom`: was missing — required by `router.tsx`, `RootRoute.tsx`, `app/` files
- `react-day-picker`: peer dep of `@beyo/ui` (DayCalendar imports it; TypeScript resolves transitively)
- `react-textarea-autosize`: peer dep of `@beyo/ui` (TextArea)
- `@hookform/resolvers`: peer dep of `@beyo/auth` (SignInForm uses zodResolver)
- `libphonenumber-js`: peer dep of `@beyo/lib` (phone utilities)
- `ulid`: peer dep of `@beyo/lib` (client-id)
- `@tailwindcss/vite`: required to compile `@import "tailwindcss"` in index.css (Tailwind v4)
- `typecheck` script added: mirrors the managers app, used for CI validation

---

### Phase 2 — Run npm install

From the **`frontend/` root** (not from inside the workers app):

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

After install, verify that symlinks exist:
```bash
ls -la apps/workers-app/ManagerBeyo-app-workers/node_modules/@beyo/
```
All 6 packages (`api-client`, `auth`, `hooks`, `lib`, `styles`, `ui`) must appear as symlinks pointing to `../../../../../../packages/<name>`.

---

### Phase 3 — Update `vite.config.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts`
**Action:** MODIFY — replace entire file.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Rules:**
- `tailwindcss()` must come BEFORE `react()` in the plugins array — this is the required order for Tailwind v4
- `__dirname` is available in `vite.config.ts` because Vite processes config files through its own CJS wrapper even in ESM projects

---

### Phase 4 — Update `tsconfig.app.json`

**File:** `apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json`
**Action:** MODIFY — add `baseUrl` and `paths` inside `compilerOptions`. Do not change any other field.

Replace the existing file with:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

---

### Phase 5 — Update `src/index.css`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/index.css`
**Action:** MODIFY — replace entire file with the content below.

All shared tokens (`@theme`, `:root` safe-area vars, global resets, body defaults) come from `@beyo/styles`. The workers app keeps only what is workers-specific (none at this stage).

```css
@import "tailwindcss";
@import "@beyo/styles/src/index.css";
```

**What was removed and why:**
- Duplicated `@theme {}` block — now comes from `@beyo/styles`
- Duplicated `:root {}` safe-area vars — now comes from `@beyo/styles`
- Duplicated global resets (`*, html, body, #root`) — now comes from `@beyo/styles`
- `.test-colors {}` — was a test artifact, deleted
- `--case-composer-color-accent` — managers-app-specific variable, not used in workers app
- `@keyframes camera-flash` + `.animate-camera-flash` — managers-specific animation
- `@keyframes image-edit-shake` + `.animate-image-edit-shake` — managers-specific animation
- All `case-composer-*` keyframes and classes — managers-specific

---

### Phase 6 — Reset `src/app/surface-registry.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`
**Action:** MODIFY — replace entire file. The feature surfaces (cases, tasks, items, etc.) do not exist yet in the workers app.

```typescript
import type { SurfaceRegistrations } from '@beyo/ui';

export const surfaceRegistry: SurfaceRegistrations = {};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

### Phase 7 — Create `src/lib/env.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/lib/env.ts`
**Action:** CREATE

`main.tsx` does `import './lib/env'` as a side-effect import to validate `VITE_API_URL` at startup. Re-exporting from `@beyo/api-client` triggers that validation when the module is first evaluated.

```typescript
export { env } from '@beyo/api-client';
```

---

### Phase 8 — Create `src/lib/animation.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/lib/animation.ts`
**Action:** CREATE

`TabOutlet.tsx` imports `tabVariants` and `transitions` from `@/lib/animation`.

```typescript
export { durations, easings, transitions, tabVariants } from '@beyo/lib';
```

---

### Phase 9 — Create `src/lib/lazy-route.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/lib/lazy-route.tsx`
**Action:** CREATE

`router.tsx` imports `lazyRoute` from `@/lib/lazy-route`. It is now in `@beyo/ui`.

```typescript
export { lazyRoute } from '@beyo/ui';
```

---

### Phase 10 — Create `src/lib/routes.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts`
**Action:** CREATE

Used by `router.tsx`, `BottomTabBar.tsx`, auth wrappers, sign-in page, and `primary-tab-preload.ts`.

`TAB_ORDER` defines the left-to-right physical position of each tab. The direction of the slide animation is determined by comparing current and target tab indices. Keep this order consistent with the visual left-to-right layout in `BottomTabBar.tsx`.

```typescript
export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
} as const;

export type TabPath =
  | typeof ROUTES.tasks
  | typeof ROUTES.cases
  | typeof ROUTES.home
  | typeof ROUTES.stats
  | typeof ROUTES.settings;

export const TAB_ORDER: TabPath[] = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.settings,
];
```

---

### Phase 11 — Create `src/lib/primary-tab-preload.ts`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/lib/primary-tab-preload.ts`
**Action:** CREATE

`AppShell.tsx` calls `preloadPrimaryTabRoutes()` once on mount (via requestIdleCallback). `BottomTabBar.tsx` calls `preloadPrimaryTabRoute(path)` on pointer-down and focus for each tab.

```typescript
import { type TabPath, ROUTES } from './routes';

const tabPreloaders: Partial<Record<TabPath, () => Promise<unknown>>> = {
  [ROUTES.home]: () => import('@/pages/home/HomePage'),
  [ROUTES.tasks]: () => import('@/pages/tasks/TasksPage'),
  [ROUTES.cases]: () => import('@/pages/cases/CasesPage'),
  [ROUTES.stats]: () => import('@/pages/stats/StatsPage'),
  [ROUTES.settings]: () => import('@/pages/settings/SettingsPage'),
};

export function preloadPrimaryTabRoute(path: TabPath): void {
  void tabPreloaders[path]?.();
}

export function preloadPrimaryTabRoutes(): void {
  for (const preload of Object.values(tabPreloaders)) {
    void preload();
  }
}
```

---

### Phase 12 — Create `src/providers/BreakpointProvider.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/providers/BreakpointProvider.tsx`
**Action:** CREATE

`providers.tsx` imports `BreakpointProvider` from `@/providers/BreakpointProvider`. It is now in `@beyo/hooks`.

```typescript
export { BreakpointProvider, BreakpointContext, useBreakpoint } from '@beyo/hooks';
```

---

### Phase 13 — Create `src/providers/SurfaceProvider.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/providers/SurfaceProvider.tsx`
**Action:** CREATE

`RootRoute.tsx` renders `<SurfaceProvider>` with no props. This wrapper injects the app's `surfaceRegistry` so `RootRoute.tsx` does not need to know about the registry prop.

Also re-exports `SurfaceType` because `SurfaceRouteFrame.tsx` imports that type from this path.

```typescript
import type { ReactNode } from 'react';
import { SurfaceProvider as BaseSurfaceProvider } from '@beyo/ui';
import { surfaceRegistry } from '@/app/surface-registry';

export type { SurfaceType } from '@beyo/ui';

type SurfaceProviderProps = {
  children: ReactNode;
};

export function SurfaceProvider({ children }: SurfaceProviderProps): React.JSX.Element {
  return (
    <BaseSurfaceProvider registry={surfaceRegistry}>
      {children}
    </BaseSurfaceProvider>
  );
}
```

---

### Phase 14 — Create surface component re-exports

`SurfaceRouteFrame.tsx` imports the three surface shell components from `@/components/surfaces/`. These now live in `@beyo/ui`.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/BottomSheetSurface.tsx`
**Action:** CREATE

```typescript
export { BottomSheetSurface } from '@beyo/ui';
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/ModalSurface.tsx`
**Action:** CREATE

```typescript
export { ModalSurface } from '@beyo/ui';
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/SlidePageSurface.tsx`
**Action:** CREATE

```typescript
export { SlidePageSurface } from '@beyo/ui';
```

---

### Phase 15 — Create UI component re-exports

`SignInPage.tsx` imports `RouteErrorBoundary` from `@/components/ui/RouteErrorBoundary`. `HomePage.tsx` imports `PageSkeleton`. These are all in `@beyo/ui`.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/RouteErrorBoundary.tsx`
**Action:** CREATE

```typescript
export { RouteErrorBoundary } from '@beyo/ui';
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/PageSkeleton.tsx`
**Action:** CREATE

```typescript
export { PageSkeleton } from '@beyo/ui';
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/SurfaceSkeleton.tsx`
**Action:** CREATE

```typescript
export { SurfaceSkeleton } from '@beyo/ui';
```

---

### Phase 16 — Create auth feature wrappers

`router.tsx` imports `GuestRoute` and `ProtectedRoute` from `@/features/auth` and uses them with no props (`<GuestRoute />`, `<ProtectedRoute />`). But `@beyo/auth`'s versions require `homePath` and `signInPath` props. The thin wrappers below pre-apply the workers app's routes so `router.tsx` does not need to pass them.

Similarly, `RootRoute.tsx` imports `AuthProvider` from `@/features/auth` and uses it with no props. The wrapper pre-applies `signInRoute`.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/AuthProvider.tsx`
**Action:** CREATE

```typescript
import type { ReactNode } from 'react';
import { AuthProvider as BaseAuthProvider } from '@beyo/auth';
import { ROUTES } from '@/lib/routes';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  return (
    <BaseAuthProvider signInRoute={ROUTES.signIn}>
      {children}
    </BaseAuthProvider>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/GuestRoute.tsx`
**Action:** CREATE

```typescript
import { GuestRoute as BaseGuestRoute } from '@beyo/auth';
import { ROUTES } from '@/lib/routes';

export function GuestRoute(): React.JSX.Element {
  return <BaseGuestRoute homePath={ROUTES.home} />;
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/ProtectedRoute.tsx`
**Action:** CREATE

```typescript
import { ProtectedRoute as BaseProtectedRoute } from '@beyo/auth';
import { ROUTES } from '@/lib/routes';

export function ProtectedRoute(): React.JSX.Element {
  return <BaseProtectedRoute signInPath={ROUTES.signIn} />;
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/index.ts`
**Action:** CREATE

Exports the wrapper components (AuthProvider, GuestRoute, ProtectedRoute) and passes through everything else from `@beyo/auth` that the app might need.

```typescript
export { AuthProvider } from './AuthProvider';
export { GuestRoute } from './GuestRoute';
export { ProtectedRoute } from './ProtectedRoute';
export {
  SignInForm,
  useAuth,
  useSignInMutation,
  useSignOutMutation,
  useAuthStore,
  selectUser,
  selectWorkspaceId,
  selectIsAuthenticated,
  SignInFormSchema,
} from '@beyo/auth';
export type { SignInFormInput } from '@beyo/auth';
```

---

### Phase 17 — Create PwaProvider stub

`RootRoute.tsx` imports `PwaProvider` from `@/features/pwa`. PWA functionality is out of scope for this phase. The stub renders children unchanged.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/PwaProvider.tsx`
**Action:** CREATE

```typescript
import type { ReactNode } from 'react';

type PwaProviderProps = {
  children: ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps): React.JSX.Element {
  return <>{children}</>;
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/index.ts`
**Action:** CREATE

```typescript
export { PwaProvider } from './PwaProvider';
```

---

### Phase 18 — Create `src/components/shell/BottomTabBar.tsx`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx`
**Action:** CREATE

`AppShell.tsx` imports `BottomTabBar` from this path. This is an app-specific component (not shared via packages) because the set of tabs is app-specific. The implementation is a 5-tab bar: Tasks, Cases, Home, Stats, Settings — matching the routes already declared in `router.tsx`.

```typescript
import {
  ChartColumnIncreasing,
  House,
  ListTodo,
  MessageCircle,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { preloadPrimaryTabRoute } from '@/lib/primary-tab-preload';
import { ROUTES, TAB_ORDER, type TabPath } from '@/lib/routes';

type Tab = {
  label: string;
  icon: LucideIcon;
  path: TabPath;
};

const TABS: Tab[] = [
  { path: ROUTES.tasks, label: 'Tasks', icon: ListTodo },
  { path: ROUTES.cases, label: 'Cases', icon: MessageCircle },
  { path: ROUTES.home, label: 'Home', icon: House },
  { path: ROUTES.stats, label: 'Stats', icon: ChartColumnIncreasing },
  { path: ROUTES.settings, label: 'Settings', icon: Settings2 },
];

function useTabNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return function handleTabPress(targetPath: TabPath): void {
    if (location.pathname === targetPath) {
      return;
    }

    const fromIndex = TAB_ORDER.indexOf(location.pathname as TabPath);
    const toIndex = TAB_ORDER.indexOf(targetPath);
    const direction = toIndex > fromIndex ? 1 : -1;

    navigate(targetPath, { state: { direction } });
  };
}

export function BottomTabBar(): React.JSX.Element {
  const location = useLocation();
  const handleTabPress = useTabNav();
  const activeIndex = TABS.findIndex((tab) => tab.path === location.pathname);

  return (
    <nav
      aria-label="Main navigation"
      className="flex-shrink-0 border-t bg-background"
      data-testid="bottom-tab-bar"
    >
      <div className="relative flex h-[60px] items-stretch">
        <div
          aria-hidden="true"
          className="absolute top-0 h-0.5 w-1/5 bg-primary transition-[transform,opacity] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                isActive ? 'text-primary' : 'text-icon',
              ].join(' ')}
              data-testid={`tab-${tab.label.toLowerCase()}`}
              type="button"
              onClick={() => handleTabPress(tab.path)}
              onFocus={() => { preloadPrimaryTabRoute(tab.path); }}
              onPointerDown={() => { preloadPrimaryTabRoute(tab.path); }}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div aria-hidden="true" className="h-[var(--safe-bottom,0px)]" />
    </nav>
  );
}
```

---

### Phase 19 — Create pages

Create all pages referenced by `router.tsx`. All pages except `SignInPage` and `HomePage` are stubs — they render a placeholder and will be replaced in future plans.

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/auth/SignInPage.tsx`
**Action:** CREATE

Uses `appScope: 'worker'` — workers authenticate with a different scope than managers (`'admin'`). This is the key difference from the managers app sign-in page.

```typescript
import { useNavigate } from 'react-router-dom';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { SignInForm } from '@/features/auth';
import { ROUTES } from '@/lib/routes';

export function SignInPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <RouteErrorBoundary>
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="relative w-full max-w-sm">
          <div className="absolute bottom-full left-1/2 mb-[50px] w-full -translate-x-1/2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Worker Beyo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your workspace
            </p>
          </div>

          <div className="w-full rounded-2xl border border-border bg-white p-6 shadow-sm">
            <SignInForm
              appScope="worker"
              onSuccess={() => navigate(ROUTES.home, { replace: true })}
            />
          </div>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx`
**Action:** CREATE

The actual home content. Will be expanded in a future plan.

```typescript
export function HomeRouteEntry(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="home-page">
      <h1 className="text-xl font-semibold text-foreground">Home</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/home/HomePage.tsx`
**Action:** CREATE

```typescript
import { lazy, Suspense } from 'react';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const HomeRouteEntry = lazy(() =>
  import('@/features/home/route-entry').then((module) => ({
    default: module.HomeRouteEntry,
  })),
);

export function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeRouteEntry />
    </Suspense>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/tasks/TasksPage.tsx`
**Action:** CREATE — stub

```typescript
export function TasksPage(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="tasks-page">
      <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx`
**Action:** CREATE — stub

```typescript
export function CasesPage(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="cases-page">
      <h1 className="text-xl font-semibold text-foreground">Cases</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationPage.tsx`
**Action:** CREATE — stub

```typescript
export function CaseConversationPage(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="case-conversation-page">
      <h1 className="text-xl font-semibold text-foreground">Case</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/stats/StatsPage.tsx`
**Action:** CREATE — stub

```typescript
export function StatsPage(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="stats-page">
      <h1 className="text-xl font-semibold text-foreground">Stats</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/settings/SettingsPage.tsx`
**Action:** CREATE — stub

```typescript
export function SettingsPage(): React.JSX.Element {
  return (
    <div className="p-4" data-testid="settings-page">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>
    </div>
  );
}
```

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/NotFoundPage.tsx`
**Action:** CREATE — stub

```typescript
export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center p-4" data-testid="not-found-page">
      <p className="text-muted-foreground">Page not found.</p>
    </div>
  );
}
```

---

### Phase 20 — Typecheck and build validation

Run the following from `apps/workers-app/ManagerBeyo-app-workers/`:

```bash
npm run typecheck
```

Expected: zero TypeScript errors. If any errors appear, fix them before proceeding to Phase 21. Common errors and fixes:

- `Cannot find module '@beyo/...'` → run `npm install` from `frontend/` root
- `Type ... is not assignable` in auth wrappers → check that `GuestRoute`, `ProtectedRoute`, `AuthProvider` props match `@beyo/auth` contract
- `Cannot find module '@/...'` → path alias is not wired in `tsconfig.app.json` (Phase 4)
- `Module '@tailwindcss/vite' not found` in `vite.config.ts` → `@tailwindcss/vite` not installed (Phase 1/2)

Then run:

```bash
npm run build
```

Expected: build exits code 0. If not, fix TypeScript errors first — build will not succeed if typecheck fails.

---

### Phase 21 — Create Playwright test and ensure `.env.test` is configured

First, verify that `apps/workers-app/ManagerBeyo-app-workers/.env.test` exists and contains:

```
PLAYWRIGHT_TEST_EMAIL=<real test account email>
PLAYWRIGHT_TEST_PASSWORD=<real test account password>
VITE_API_URL=<backend URL>
```

If `.env.test` does not exist, create it with the real credentials. Without these, the login tests will be skipped.

**File:** `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/auth.spec.ts`
**Action:** CREATE

```typescript
import { test, expect } from '@playwright/test';

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? '';
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? '';

test.beforeEach(({ skip }) => {
  skip(
    !EMAIL || !PASSWORD,
    'PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD must be set in .env.test to run auth tests',
  );
});

test.describe('Authentication', () => {
  test('unauthenticated visit to / redirects to /sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('sign-in page renders title and form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByText('Worker Beyo')).toBeVisible();
    await expect(page.getByTestId('auth-email-input')).toBeVisible();
    await expect(page.getByTestId('auth-password-input')).toBeVisible();
    await expect(page.getByTestId('auth-sign-in-button')).toBeVisible();
  });

  test('valid credentials sign in and land on home with tab bar', async ({ page }) => {
    await page.goto('/sign-in');

    await page.getByTestId('auth-email-input').fill(EMAIL);
    await page.getByTestId('auth-password-input').fill(PASSWORD);
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('bottom-tab-bar')).toBeVisible();
  });

  test('bottom tab bar shows all five tabs after login', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email-input').fill(EMAIL);
    await page.getByTestId('auth-password-input').fill(PASSWORD);
    await page.getByTestId('auth-sign-in-button').click();
    await expect(page).toHaveURL('/');

    const nav = page.getByTestId('bottom-tab-bar');
    await expect(nav.getByTestId('tab-home')).toBeVisible();
    await expect(nav.getByTestId('tab-tasks')).toBeVisible();
    await expect(nav.getByTestId('tab-cases')).toBeVisible();
    await expect(nav.getByTestId('tab-stats')).toBeVisible();
    await expect(nav.getByTestId('tab-settings')).toBeVisible();
  });

  test('home tab is marked active after login', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email-input').fill(EMAIL);
    await page.getByTestId('auth-password-input').fill(PASSWORD);
    await page.getByTestId('auth-sign-in-button').click();
    await expect(page).toHaveURL('/');

    await expect(page.getByTestId('tab-home')).toHaveAttribute('aria-current', 'page');
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-email-input').fill('wrong@example.com');
    await page.getByTestId('auth-password-input').fill('wrongpassword');
    await page.getByTestId('auth-sign-in-button').click();

    await expect(page.getByTestId('auth-error-root')).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
```

---

### Phase 22 — Run Playwright tests

From `apps/workers-app/ManagerBeyo-app-workers/`:

```bash
npm run test:e2e
```

The dev server starts automatically on port 5174 (configured in `playwright.config.ts`). Tests run on both `mobile` (iPhone 14 Pro) and `desktop` (1440×900) projects.

Expected: all tests pass. If a test fails:
- `unauthenticated visit redirects` failing → check `GuestRoute` wrapper wires `homePath` correctly
- `sign in and land on home` timing out → backend may be unreachable; verify `VITE_API_URL` in `.env.test`
- `bottom-tab-bar not found` → check `AppShell.tsx` renders `BottomTabBar` and check `data-testid` attribute in `BottomTabBar.tsx`
- `tab-home aria-current` failing → check `location.pathname === tab.path` comparison in `BottomTabBar.tsx`

---

## Files touched — complete list

| Action | File |
|--------|------|
| MODIFY | `apps/workers-app/ManagerBeyo-app-workers/package.json` |
| MODIFY | `apps/workers-app/ManagerBeyo-app-workers/vite.config.ts` |
| MODIFY | `apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json` |
| MODIFY | `apps/workers-app/ManagerBeyo-app-workers/src/index.css` |
| MODIFY | `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/lib/env.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/lib/animation.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/lib/lazy-route.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/lib/routes.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/lib/primary-tab-preload.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/providers/BreakpointProvider.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/providers/SurfaceProvider.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/BottomSheetSurface.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/ModalSurface.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/surfaces/SlidePageSurface.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/RouteErrorBoundary.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/PageSkeleton.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/ui/SurfaceSkeleton.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/AuthProvider.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/GuestRoute.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/ProtectedRoute.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/auth/index.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/PwaProvider.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/pwa/index.ts` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/features/home/route-entry.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/auth/SignInPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/home/HomePage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/tasks/TasksPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CasesPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseConversationPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/stats/StatsPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/settings/SettingsPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/src/pages/NotFoundPage.tsx` |
| CREATE | `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/auth.spec.ts` |

**DO NOT TOUCH** (already correct, do not modify):
- `src/app/App.tsx`
- `src/app/AppShell.tsx`
- `src/app/RootRoute.tsx`
- `src/app/SurfaceRouteFrame.tsx`
- `src/app/TabOutlet.tsx`
- `src/app/providers.tsx`
- `src/app/router.tsx`
- `src/main.tsx`
- `playwright.config.ts`
- All `packages/*` files

---

## Risks and mitigations

- Risk: `react-day-picker` or `react-textarea-autosize` version conflict with `@beyo/ui` peerDependencies
  Mitigation: Use the minimum versions declared in `packages/ui/package.json` peerDeps. Check those peerDep ranges if npm reports conflicts.

- Risk: `@tailwindcss/vite` version incompatible with the `vite` version in devDeps
  Mitigation: Both are `^4.x` / `^8.x`. If npm fails, check managers app's `@tailwindcss/vite` version and match it.

- Risk: `__dirname` unavailable in `vite.config.ts` (ESM environment)
  Mitigation: Vite processes its config via CJS, making `__dirname` available. If it is not (rare), switch to `fileURLToPath(new URL('.', import.meta.url))` as the base path.

- Risk: `@import "@beyo/styles/src/index.css"` not resolving in Vite's CSS pipeline
  Mitigation: With `@tailwindcss/vite`, CSS `@import` from `node_modules` symlinks is supported. If it does not resolve, use the explicit path: `@import "../../../../../../packages/styles/src/index.css"` — but the symlink path should work.

## Validation plan

From `apps/workers-app/ManagerBeyo-app-workers/`:

- `npm run typecheck`: zero TypeScript errors
- `npm run build`: exits code 0
- `npm run test:e2e -- --project=mobile`: all auth tests pass on iPhone 14 Pro viewport
- `npm run test:e2e -- --project=desktop`: all auth tests pass on 1440×900 viewport

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David (user review)
