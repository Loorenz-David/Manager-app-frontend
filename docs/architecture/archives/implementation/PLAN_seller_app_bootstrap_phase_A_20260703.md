# PLAN_seller_app_bootstrap_phase_A_20260703

## Metadata

- Plan ID: `PLAN_seller_app_bootstrap_phase_A_20260703`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T19:25:12Z`
- Overview plan: `docs/architecture/under_construction/implementation/PLAN_seller_app_bootstrap_overview_20260703.md`

## Goal and intent

- Goal: Replace the Vite starter boilerplate in the seller app with the foundation layer shared by all Beyo apps — build config, lib utilities, surface/breakpoint providers, surface hooks, and UI primitives.
- Business/user intent: After Phase A the seller app can be `npm run typecheck`-verified and `npm run dev`-started. It renders a static placeholder. All infrastructure files needed by Phases B and C are in place.
- Non-goals: No routing, no auth, no shell, no pages — those land in Phases B and C.

## Scope

- In scope: `package.json`, `vite.config.ts`, `tsconfig.app.json`, `src/main.tsx`, `src/index.css`, stale-file deletions, `src/app/App.tsx` (placeholder), `src/lib/*`, `src/providers/SurfaceProvider + BreakpointProvider`, `src/hooks/use-surface* + use-preload-surface`, `src/components/ui/PageSkeleton + RouteErrorBoundary`.
- Out of scope: Router, auth, shell components, features, pages (Phases B + C).
- Assumptions: The seller app already has `node_modules` seeded (it has `package-lock.json`). After editing `package.json` run `npm install` inside the seller app directory before typechecking.

## File manifest

All paths are relative to `apps/selleres-app/ManagerBeyo-app-sellers/`.

### Existing files to edit

| Path | Change summary |
|---|---|
| `package.json` | Replace with seller dependency set (see §Implementation plan step 1) |
| `vite.config.ts` | Full config: tailwind, svgr, PWA (name "Seller Beyo"), path alias `@/*`, proxy |
| `tsconfig.app.json` | Add `ignoreDeprecations`, `baseUrl`, `paths`, `vite-plugin-pwa/client` to `types` |
| `src/main.tsx` | Replace with vaul-drawer-wrapper pattern; import `App` from `./app/App` |
| `src/index.css` | Replace with `@import tailwindcss`, `@import @beyo/styles`, `@source` for each package |
| `src/App.tsx` | Delete content — file is superseded by `src/app/App.tsx`; leave the file DELETED (Codex must delete it) |

### New files to create

| Path |
|---|
| `src/app/App.tsx` |
| `src/lib/routes.ts` |
| `src/lib/animation.ts` |
| `src/lib/lazy-route.tsx` |
| `src/lib/utils.ts` |
| `src/lib/env.ts` |
| `src/lib/api-client.ts` |
| `src/providers/SurfaceProvider.tsx` |
| `src/providers/BreakpointProvider.tsx` |
| `src/hooks/use-surface.ts` |
| `src/hooks/use-surface-props.ts` |
| `src/hooks/use-surface-header.ts` |
| `src/hooks/use-preload-surface.ts` |
| `src/components/ui/PageSkeleton.tsx` |
| `src/components/ui/RouteErrorBoundary.tsx` |

### Files to delete

| Path | Reason |
|---|---|
| `src/App.css` | Replaced by `@beyo/styles` via `index.css` |
| `src/assets/hero.png` | Vite starter asset, not used |
| `src/assets/react.svg` | Vite starter asset, not used |
| `src/assets/vite.svg` | Vite starter asset, not used |

## Clarifications required

None — Phase A is fully specified.

## Acceptance criteria

1. `npm run typecheck` (run from `apps/selleres-app/ManagerBeyo-app-sellers/`) exits with zero errors after `npm install`.
2. `npm run dev` starts the dev server without compile errors and renders a page with text "Seller Beyo".
3. No import of deleted files (`App.css`, `hero.png`, `react.svg`, `vite.svg`) remains anywhere in `src/`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo package boundary — consume `@beyo/*` packages; never copy code from them.
- `architecture/15_feature_structure.md`: `src/lib/`, `src/providers/`, `src/hooks/`, `src/components/ui/` layer rules.
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` pattern used in `SurfaceProvider`.
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface types `slide | sheet | modal`; `SurfaceProvider` wraps `BaseSurfaceProvider` from `@beyo/ui`.

### File read intent

Before reading any file outside this plan's scope, apply the pattern-vs-relational test from `task_system/frontend_contract_goal_mapping_guide.md`.

Permitted reads:
- `apps/managers-app/ManagerBeyo-app-managers/src/*` files listed in the overview's **Manager app reference paths** table — for copying verbatim.
- `packages/*/package.json` — to verify package names if needed.

## Implementation plan

### Step 1 — `package.json`

Replace the entire file content:

```json
{
  "name": "managerbeyo-app-sellers",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:verify": "tsc -b --force && vite build",
    "typecheck": "tsc -b --force",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@beyo/api-client": "*",
    "@beyo/auth": "*",
    "@beyo/cases": "*",
    "@beyo/hooks": "*",
    "@beyo/images": "*",
    "@beyo/items": "*",
    "@beyo/lib": "*",
    "@beyo/notifications": "*",
    "@beyo/pwa": "*",
    "@beyo/realtime": "*",
    "@beyo/scanner": "*",
    "@beyo/styles": "*",
    "@beyo/task-creation": "*",
    "@beyo/task-notes": "*",
    "@beyo/task-working-sections": "*",
    "@beyo/tasks": "*",
    "@beyo/ui": "*",
    "@tanstack/react-query": "^5.100.11",
    "clsx": "^2.1.1",
    "framer-motion": "^12.39.0",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.1",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3",
    "zustand": "^5.0.13"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.3.0",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "tailwindcss": "^4.3.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12",
    "vite-plugin-pwa": "^1.3.0",
    "vite-plugin-svgr": "^5.2.0"
  }
}
```

After writing this file, run `npm install` from the seller app directory.

---

### Step 2 — `vite.config.ts`

Replace the entire file:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [
      svgr(),
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: "auto",
        includeAssets: [
          "favicon.svg",
          "apple-touch-icon.png",
          "pwa-48x48.png",
          "pwa-72x72.png",
          "pwa-96x96.png",
          "pwa-144x144.png",
          "pwa-192x192.png",
          "pwa-512x512.png",
        ],
        manifest: {
          name: "Seller Beyo",
          short_name: "SellerBeyo",
          description: "Beyo seller workspace",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "pwa-48x48.png", sizes: "48x48", type: "image/png" },
            { src: "pwa-72x72.png", sizes: "72x72", type: "image/png" },
            { src: "pwa-96x96.png", sizes: "96x96", type: "image/png" },
            { src: "pwa-144x144.png", sizes: "144x144", type: "image/png" },
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["7aa9-155-4-95-121.ngrok-free.app"],
      proxy: env.API_TARGET_URL
        ? {
            "/api": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
            },
            "/socket.io": {
              target: env.API_TARGET_URL,
              changeOrigin: true,
              ws: true,
            },
          }
        : undefined,
    },
  };
});
```

---

### Step 3 — `tsconfig.app.json`

Replace the entire file:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client", "vite-plugin-pwa/client"],
    "skipLibCheck": true,
    "ignoreDeprecations": "6.0",
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

### Step 4 — `src/index.css`

Replace the entire file:

```css
@import "tailwindcss";
@import "@beyo/styles";
@source "../../../../packages/ui/src";
@source "../../../../packages/tasks/src";
@source "../../../../packages/auth/src";
@source "../../../../packages/cases/src";
@source "../../../../packages/images/src";
@source "../../../../packages/notifications/src";
@source "../../../../packages/task-creation/src";
@source "../../../../packages/task-notes/src";
@source "../../../../packages/task-working-sections/src";
@source "../../../../packages/scanner/src";
@source "../../../../packages/items/src";
@source "../../../../packages/pwa/src";
```

---

### Step 5 — Delete stale files

Delete the following files:
- `src/App.css`
- `src/App.tsx` (the root-level Vite starter file — superseded by `src/app/App.tsx`)
- `src/assets/hero.png`
- `src/assets/react.svg`
- `src/assets/vite.svg`

---

### Step 6 — `src/main.tsx`

Replace the entire file:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './lib/env';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="h-full bg-background" vaul-drawer-wrapper="">
      <App />
    </div>
  </StrictMode>,
);
```

---

### Step 7 — `src/app/App.tsx` (Phase A placeholder)

Create the file. Phase B will replace this with the full `RouterProvider` + `AppProviders` wiring.

```tsx
export function App(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Seller Beyo
    </div>
  );
}
```

---

### Step 8 — `src/lib/routes.ts`

Create the file:

```ts
export const ROUTES = {
  signIn: '/sign-in',
  home: '/',
  tasks: '/tasks',
  cases: '/cases',
  caseConversation: '/cases/:caseId',
  stats: '/stats',
  settings: '/settings',
  upholsteryInventory: '/upholstery-inventory',
} as const;

export function buildCaseConversationRoute(caseId: string): string {
  return `${ROUTES.cases}/${caseId}`;
}

export const TAB_ORDER = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
  ROUTES.stats,
  ROUTES.upholsteryInventory,
  ROUTES.settings,
] as const;

export type TabPath = (typeof TAB_ORDER)[number];

export const PRIMARY_TABS = [
  ROUTES.tasks,
  ROUTES.cases,
  ROUTES.home,
] as const satisfies TabPath[];

export const MORE_TABS = [
  ROUTES.stats,
  ROUTES.upholsteryInventory,
  ROUTES.settings,
] as const satisfies TabPath[];

export type MoreTabPath = (typeof MORE_TABS)[number];

export const DEFAULT_MORE_TAB: MoreTabPath = ROUTES.stats;
```

---

### Steps 9–14 — Verbatim copies from manager

For each file below, read the manager source (listed in the overview's reference paths table) and write it verbatim to the seller path. No changes are needed.

| # | Create at (seller) | Copy from (manager) |
|---|---|---|
| 9 | `src/lib/animation.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/animation.ts` |
| 10 | `src/lib/lazy-route.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/lazy-route.tsx` |
| 11 | `src/lib/utils.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/utils.ts` |
| 12 | `src/lib/env.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/env.ts` |
| 13 | `src/lib/api-client.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts` |
| 14 | `src/providers/SurfaceProvider.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/providers/SurfaceProvider.tsx` |
| 15 | `src/providers/BreakpointProvider.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/providers/BreakpointProvider.tsx` |
| 16 | `src/hooks/use-surface.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface.ts` |
| 17 | `src/hooks/use-surface-props.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface-props.ts` |
| 18 | `src/hooks/use-surface-header.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface-header.ts` |
| 19 | `src/hooks/use-preload-surface.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-preload-surface.ts` |
| 20 | `src/components/ui/PageSkeleton.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/ui/PageSkeleton.tsx` |
| 21 | `src/components/ui/RouteErrorBoundary.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/ui/RouteErrorBoundary.tsx` |

---

### Step 22 — `src/app/surface-registry.ts` (Phase A stub)

`src/providers/SurfaceProvider.tsx` (step 14) imports `surfaceRegistry` from `@/app/surface-registry`. That file is fully built in Phase B. Create a compile-only stub here so typecheck passes:

```ts
import type { SurfaceRegistrations } from "@beyo/ui";

export const surfaceRegistry: SurfaceRegistrations = {};

export type SurfaceId = keyof typeof surfaceRegistry;
```

Phase B will overwrite this with the real registry.

---

### Final step — npm install

After all file operations, run:

```
cd apps/selleres-app/ManagerBeyo-app-sellers && npm install
```

## Risks and mitigations

- Risk: `vite-plugin-pwa` requires `sw.ts` to exist at `src/sw.ts` for `injectManifest` strategy during `vite build`.
  Mitigation: Phase A only validates with `typecheck`, not `build`. A minimal `sw.ts` will be added in Phase B alongside the PWA surfaces. `npm run dev` skips the service worker by default.

- Risk: `src/providers/SurfaceProvider.tsx` (verbatim copy) imports `@/app/surface-registry` which is fully built only in Phase B.
  Mitigation: Step 22 creates a typed empty stub (`surfaceRegistry: SurfaceRegistrations = {}`). Phase B overwrites it. Typecheck passes in both phases.

## Validation plan

- After `npm install`: `npm run typecheck` — zero TypeScript errors.
- `npm run dev`: dev server starts; browser shows "Seller Beyo" centered on a white background with the correct `bg-background` class applied (verifies Tailwind + `@beyo/styles` loaded).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
