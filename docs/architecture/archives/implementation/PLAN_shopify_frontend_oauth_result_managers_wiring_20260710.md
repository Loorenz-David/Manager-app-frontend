# PLAN_shopify_frontend_oauth_result_managers_wiring_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_oauth_result_managers_wiring_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T05:00:00Z`
- Last updated at (UTC): `2026-07-08T15:28:37Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 3 of 7.
- Phase 1 plan (implemented, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_package_foundation_api_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_package_foundation_api_20260710.md`.
- Phase 2 plan (implemented, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_slide_list_create_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_slide_list_create_20260710.md`. Reviewed 2026-07-10 by reading the merged source directly and re-running `tsc`/Vitest — verdict: approved, no critical issues (two cosmetic non-blockers noted below, neither affects this phase).
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

## Phase 2 review carried into this plan

Reviewed directly against merged `packages/shopify/src/**` (not just the plan/summary): re-ran `npx tsc -p packages/shopify/tsconfig.json --noEmit` (zero errors) and the full Vitest suite (8 files, 17 tests, all pass). Confirmed via `git status`/`git diff --stat` that only `packages/shopify/**`, the root `package.json` typecheck line, and doc files changed — no `apps/` files, no OAuth result page, no detail/action/webhook UI, no backend/`.env` changes. The spacing rule (no default horizontal `px-*` on `ShopifyIntegrationsSlidePage`, `ShopifyIntegrationsCarousel`, or the three pane wrapper divs) is not just met but actively enforced by two automated test assertions (`.not.toMatch(/\bpx-\d+/)`).

Non-blocking cosmetic notes (neither affects this phase, recorded for Phase 7 polish):
- `ShopifyIntegrationsSlidePage`'s root `div` uses `className="h-full"` only (no `bg-background`) — every pane already sets its own `bg-background`, so this has no visible effect today.
- The three carousel pane wrapper `div`s (`flex h-full w-1/3 flex-col`) omit `min-w-0`; with fixed `w-1/3` on a flex row this is very unlikely to matter, but a pane with a non-wrapping wide element could theoretically overflow its third. Worth a `min-w-0` addition whenever Phase 4/6 add richer pane content.

Verified Phase 2 exports this plan depends on (read directly from `packages/shopify/src/index.ts` and `surface-ids.ts`):
- `loadShopifyIntegrationsSlidePage()` — loader function, already present, matching `35_shared_packages.md` §14 exactly.
- `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` — the string constant `"shopify-integrations-slide"`, exported statically from `surface-ids.ts`.
- `ShopifyIntegrationsSurfaceOpeners` — `{ closeSurface?: () => void }`, and `ShopifyIntegrationsSlideSurfaceProps` — `{ surfaceOpeners?: ShopifyIntegrationsSurfaceOpeners }`.
- `useShopifyIntegrationPermissions` — returns `{ canViewShopifyIntegrations, canCreateShopifyInstallUrl, canCreateShopifyReauthorizeUrl, canDisconnectShopifyIntegration, canSyncShopifyWebhooksForShop, canViewShopifyWebhookHistory }` (all confirmed booleans, Phase 1's admin/manager/worker/seller matrix).
- `shopifyKeys` — confirmed real shape includes `shopifyKeys.shops()` (used by this phase's OAuth result page invalidation), plus richer entries not needed here.
- `ShopifyOAuthResultParams` type — already defined in `types.ts`/exported from `index.ts` (`{ success: boolean; shop_domain: string | null; error_code: ShopifyOAuthErrorCode | null }`), ready for this phase to use for its own local parsed-state annotation.
- `ShopifyOAuthErrorCodeSchema` (Zod enum, exported from `index.ts`) — its `.options` array can validate an unknown `error_code` query value defensively without hardcoding the 9-value list a second time.

## Goal and intent

- Goal: Build the Shopify OAuth result landing page inside `packages/shopify`, and wire the already-implemented `ShopifyIntegrationsSlidePage` into `managers-app` — route, surface registration, and a Settings → Integrations → Shopify entry point.
- Business/user intent: Make the Phase 1–2 work reachable by a real admin/manager user for the first time: they can open Settings, tap Shopify, connect a shop, get redirected through Shopify's OAuth consent, and land on a friendly result page in the same app.
- Non-goals: real detail view, action sheet, reauthorize/disconnect/sync UI, webhook subscriptions/history UI, workspace-wide sync, scope-status endpoint, any backend or `.env` change (the backend operator's `SHOPIFY_OAUTH_REDIRECT_URL` value is documented here as a deployment prerequisite, not edited by this plan).

## Scope

- In scope:
  - `packages/shopify/src/pages/ShopifyOAuthResultPage.tsx` + `loadShopifyOAuthResultPage()` export.
  - `apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts` — new `shopifyOAuthResult` route constant.
  - `apps/managers-app/ManagerBeyo-app-managers/src/pages/settings/ShopifyOAuthResultPage.tsx` — thin app-level wrapper supplying the app-specific "back to Settings" navigation.
  - `apps/managers-app/ManagerBeyo-app-managers/src/app/router.tsx` — new route entry.
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/shopify-integrations/surfaces.ts` — new surface registration file for `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID`.
  - `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts` — spread in the new surfaces.
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/{controllers,types,components}` — add a permission-gated "Integrations → Shopify" entry that opens the slide surface.
  - `apps/managers-app/ManagerBeyo-app-managers/package.json` — add `"@beyo/shopify": "*"`.
  - `npm install` from `frontend/` root (registers the new app dependency; the workspace symlink for `@beyo/shopify` itself already exists — see Phase 1/2 review notes).
  - Focused tests for the new package page and, where a local convention already exists to extend, app-level tests.
- Out of scope: everything the master plan assigns to Phases 4–7; any backend route/handler change; any `.env` file edit (production or local); deploying or changing the live `SHOPIFY_OAUTH_REDIRECT_URL` value (documented here as a prerequisite only).
- Assumptions:
  - `managers-app` (`apps/managers-app/ManagerBeyo-app-managers`) is the sole consuming app for this phase, per the approved master plan.
  - The backend operator will set `SHOPIFY_OAUTH_REDIRECT_URL` to match the route this plan wires up, in each environment, independently of this plan's execution.

## Clarifications required

Both clarifications the master plan flagged as Phase-3-scoped blockers were resolved by explicit user decision before this plan was written (see master plan "Resolved clarifications" #2–#3). Restated here for this plan's self-containedness:

- [x] **Frontend route for `SHOPIFY_OAUTH_REDIRECT_URL`**: `/settings/integrations/shopify/oauth-result`. Production: `https://managers.beyoworkaroundtheclock.com/settings/integrations/shopify/oauth-result`. Local: `http://localhost:5173/settings/integrations/shopify/oauth-result`. **Deployment prerequisite, not implemented by this plan**: the backend operator must set the corresponding `SHOPIFY_OAUTH_REDIRECT_URL` env var in each environment to these exact values for the end-to-end flow to work; this plan does not edit any `.env` file.
- [x] **Settings placement**: Managers app → Settings → Integrations → Shopify, opening `ShopifyIntegrationsSlidePage`. Exact in-page layout (new "Integrations" section in the existing flat `SettingsView.tsx`) confirmed against the real file below — no ambiguity remained after inspection.

No further clarifications block this plan — every app-wiring pattern below (routing, surface registration, settings composition, permission gating, dependency declaration) was resolved by direct inspection of the real `managers-app` source, not assumed.

## Managers-app conventions this plan is grounded in (read for "what exists," not "how to write")

- **Routing** (`src/lib/routes.ts`, `src/app/router.tsx`): routes are flat string constants in a `ROUTES` object; not every route is a "tab" — `ROUTES.caseConversation = '/cases/:caseId'` and `ROUTES.signIn` are plain non-tab entries. Non-tab routes are registered directly in `router.tsx` as a child of the `AppShell`/`ProtectedRoute` tree using `lazyRoute(() => import(...).then(...))` — **not** the `tabRoute()` wrapper (that one is reserved for the 6 primary/more tabs via `primary-tab-preload.ts`). `lazyRoute()`'s type signature only supports zero-prop route components (`ComponentType<Record<string, never>>`), confirmed in `src/lib/lazy-route.tsx`.
- **Surfaces** (`src/app/surface-registry.ts`, `src/features/cases/surfaces.ts`): each feature owns a `surfaces.ts` exporting a `SurfaceRegistrations` object (`lazyWithPreload(loadXxxPage)` from `@beyo/ui`, mapped by surface ID to `{ surface: "slide" | "sheet", component }`), spread into the single app-wide `surfaceRegistry`. Package-owned surface IDs (e.g. `CASE_CONVERSATION_SURFACE_ID` from `@beyo/cases`) are imported directly — the app never invents its own ID for a package's surface.
- **Opening surfaces from app code** (`src/hooks/use-surface.ts`, used in `src/features/home/components/HomeView.tsx`): app components/controllers call the **app-local** `useSurface()` hook (`@/hooks/use-surface`, backed by `@/providers/SurfaceProvider` which itself re-exports `@beyo/ui`'s underlying context/store) — `surface.open(SURFACE_ID, props)` / `surface.close(SURFACE_ID)`. This is a different import path from `@beyo/hooks`'s `useSurfaceHeader`/`useSurfaceProps` (which `ShopifyIntegrationsSlidePage` uses internally, from inside the package) — both read/write the same underlying `@beyo/ui` context, so they interoperate correctly; this is exactly the same pattern already proven by `@beyo/cases`, `@beyo/tasks`, etc. being mounted into this same registry.
- **Role-based UI decisions at the app-shell level** (`HomeView.tsx`): calling `useRole()`/`hasRole()` (or, for Shopify specifically, the already-built `useShopifyIntegrationPermissions()`) directly inside a top-level feature component to decide what to render is the established pattern — no `RoleGuard` component is used anywhere in this app today.
- **Settings feature** (`src/features/settings/{route-entry.tsx,providers/SettingsViewProvider.tsx,controllers/use-settings-view.controller.ts,components/SettingsView.tsx,types.ts}`): thin route-entry → provider (wraps a controller hook in context) → presentational view (reads via `useSettingsViewContext()`). `SettingsView.tsx` today is one flat `<div className="flex flex-col gap-4 p-6">` with stacked sections, each an uppercase muted `<h2>` label followed by `rounded-xl border border-border bg-card px-4 py-3` row(s) — no sub-routing, no tabs. This phase adds one more such section.
- **Managers-app dependencies**: `@beyo/hooks`, `@beyo/ui`, `@tanstack/react-query`, `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react` are all already present in `apps/managers-app/ManagerBeyo-app-managers/package.json` — only `"@beyo/shopify": "*"` needs adding.
- **Persistence**: confirmed via `src/app/providers.tsx` that the app's `QueryClient` is a plain in-memory instance (`new QueryClient({...})`, module scope, no `persistQueryClient`/localStorage sync). Because Shopify's OAuth redirect is a full top-level browser navigation (not an SPA transition), the app reboots with a **brand-new, empty** `QueryClient` when the user lands on the OAuth result page — so this phase's "invalidate the shop list query on success" call has no observable effect on a cold boot today (there is nothing cached yet to invalidate). It is still implemented exactly as specified, both because it is cheap/correct and because it becomes meaningful the moment this app adopts persisted query caching (`26_persistence.md`'s territory) — this plan does not add persistence, only documents why the invalidation call is currently a defensive no-op rather than a load-bearing behavior.

## Acceptance criteria

1. `packages/shopify/src/pages/ShopifyOAuthResultPage.tsx` parses `success`/`shop_domain`/`error_code` from `window.location.search`, renders a friendly success or failure state, never expects/reads a token/code/HMAC/secret value, and invalidates `shopifyKeys.shops()` on success.
2. The OAuth result page is app-agnostic: it takes an optional `onBackToSettings?: () => void` prop and does not hardcode `/settings` or any other app-specific path itself.
3. `managers-app` reaches this page at exactly `/settings/integrations/shopify/oauth-result`.
4. `managers-app` registers `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` as a `"slide"` surface pointing at `loadShopifyIntegrationsSlidePage`, via the same `lazyWithPreload` + `SurfaceRegistrations` pattern every other feature uses — no new surface pattern invented.
5. Settings shows a "Shopify" entry under a new "Integrations" section, visible only when `useShopifyIntegrationPermissions().canViewShopifyIntegrations` is `true`, that calls the app-local `useSurface().open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, { surfaceOpeners: { closeSurface: ... } })`.
6. No app-specific route, surface ID, or navigation logic is added inside `packages/shopify` — all of it lives in `apps/managers-app/ManagerBeyo-app-managers`.
7. Nothing from Phases 4–7 is implemented (no detail query rendering, no action sheet, no webhook UI, no backend/`.env` change).
8. `npm run typecheck` and the focused Vitest suite (existing Shopify suite + this phase's additions) pass; `npm install` from `frontend/` completes cleanly and `node_modules/@beyo/shopify` remains (already is) a valid workspace symlink.

## Contracts and skills

### Contracts loaded

- `01_architecture.md` — overall app structure this wiring must fit into.
- `01_architecture_local.md` — `route-entry.tsx` pattern for primary routes; confirms this phase's non-tab route follows the `caseConversation` precedent instead.
- `04_api_client.md` — not directly touched (no new API calls), loaded only to confirm the OAuth result page's query invalidation doesn't need any new error-parsing logic.
- `05_server_state.md` — `useQueryClient().invalidateQueries({ queryKey: shopifyKeys.shops() })` usage on the OAuth result page.
- `07_components.md` — presentational structure of the new OAuth result page content and the new Settings "Integrations" section.
- `10_pages.md` — page composition/loading-state conventions for both the package's OAuth result page and the app's thin wrapper page.
- `11_routing.md` — non-tab route registration (`lazyRoute`, `ROUTES` constant, router child entry) — the exact pattern already used for `caseConversation`.
- `13_errors.md` — friendly failure-state copy/error-code-specific messaging on the OAuth result page.
- `14_styling.md` — confirms no new `@source` directive is needed (managers-app doesn't statically import any new Tailwind-class-bearing package beyond `@beyo/shopify`, which needs one — see note below).
- `15_feature_structure.md` — new `src/features/shopify-integrations/` folder shape (surfaces.ts only, no controller/component needed at this scope).
- `16_feature_workflow.md` — confirms this phase's slice (Pages → Dynamic loading/Routes → Public API) is the correct next step after Phase 2's Controllers/Components.
- `17_testing.md` — Vitest conventions for the new package-level `ShopifyOAuthResultPage.test.tsx`.
- `19_permissions_local.md` — re-confirms `useShopifyIntegrationPermissions()` (not raw `useRole()`) is the correct gate for the new Settings entry, consistent with the package's already-built permission boundary.
- `28_surfaces.md` + `28_surfaces_local.md` — surface registration (`SurfaceRegistrations`, `"slide"` type) and confirms `slide` is valid for this surface.
- `30_dynamic_loading.md` + `30_dynamic_loading_local.md` — `lazyWithPreload` usage in the new `surfaces.ts`, and confirms the loader-function requirement (already satisfied by Phase 2's `loadShopifyIntegrationsSlidePage`) is what makes this registration correctly code-split.
- `35_shared_packages.md` — package/app dependency declaration (`"@beyo/shopify": "*"` in `apps/managers-app/.../package.json`), the `@source` directive requirement for any `@beyo/*` package containing Tailwind class names (`@beyo/shopify` does — its components use `className` extensively), and the loader-function / `openSurface`-only-in-app-controller rules this plan must not violate.

### Local extensions loaded

- `01_architecture_local.md`, `19_permissions_local.md`, `28_surfaces_local.md`, `30_dynamic_loading_local.md` — as above.

### Explicitly excluded (with reason)

- `06_client_state.md`, `08_hooks.md`, `09_forms.md`, `23_providers.md`, `24_dto.md` — no new client-state store, action hook, form, provider, or DTO layer is introduced; the settings controller only gains two trivial fields/functions on an existing controller.
- `27_responsive.md`, `31_animations.md`, `32_loading_skeletons.md`, `33_vaul_drawer.md`, `36_scroll_visibility.md`, `37_keyboard_aware_inputs.md` — no new scrollable surface, animation, skeleton, or bottom sheet is introduced; the OAuth result page is a single static-content page and the Settings entry is a plain button row, both already covered by existing app-level `PageSkeleton`/`RouteErrorBoundary` conventions.
- `18_performance.md`, `20_notifications.md` — no performance-sensitive rendering and no `notify.*` call is needed on the OAuth result page (the page itself renders a persistent success/failure state, it does not need a transient toast).
- `12_auth(_local).md` — the OAuth result page and Settings entry only consume `useShopifyIntegrationPermissions()`'s already-documented booleans; nothing here touches sign-in/session logic directly.

### File read intent — pattern vs. relational

The "Managers-app conventions this plan is grounded in" section above is the exhaustive relational-read record for this phase — every file it names (`routes.ts`, `router.tsx`, `lazy-route.tsx`, `surface-registry.ts`, `cases/surfaces.ts`, `use-surface.ts`, `HomeView.tsx`, `SettingsView.tsx`, `use-settings-view.controller.ts`, `SettingsViewProvider.tsx`, `providers.tsx`, `package.json`) was read for "what exists" (exact API shapes, exact conventions), not copied for general style. No implementer should re-read these files broadly; the patterns are reproduced concretely in "Implementation plan" below. `packages/shopify/src/index.ts` and `surface-ids.ts` were similarly read to confirm exact exports (see "Phase 2 review carried into this plan").

## Implementation plan

1. **`packages/shopify/src/pages/ShopifyOAuthResultPage.tsx`** (package, app-agnostic):
   ```tsx
   import { useEffect, useMemo } from "react";
   import { CircleCheck, CircleX } from "lucide-react";
   import { useQueryClient } from "@tanstack/react-query";
   import { ContentCard } from "@beyo/ui";

   import { shopifyKeys } from "../api/shopify-keys";
   import { ShopifyOAuthErrorCodeSchema } from "../types";
   import type { ShopifyOAuthErrorCode, ShopifyOAuthResultParams } from "../types";

   const ERROR_MESSAGES: Record<ShopifyOAuthErrorCode, string> = {
     invalid_signature: "The connection request could not be verified. Please try again.",
     invalid_state: "This connection attempt has expired or is invalid. Please try again.",
     state_shop_mismatch: "This connection request did not match the expected shop. Please try again.",
     state_already_consumed: "This connection link was already used. Please start a new connection.",
     state_expired: "This connection link expired. Please start a new connection.",
     access_denied: "Shopify access was denied. You can try connecting again if this was unexpected.",
     missing_code: "Shopify did not return the expected authorization code. Please try again.",
     token_exchange_failed: "We could not complete the connection with Shopify. Please try again.",
     oauth_callback_failed: "Something went wrong finishing the Shopify connection. Please try again.",
   };

   function parseOAuthResultParams(search: string): ShopifyOAuthResultParams {
     const params = new URLSearchParams(search);
     const success = params.get("success") === "true";
     const shop_domain = params.get("shop_domain");
     const rawErrorCode = params.get("error_code");
     const error_code = ShopifyOAuthErrorCodeSchema.options.includes(
       rawErrorCode as ShopifyOAuthErrorCode,
     )
       ? (rawErrorCode as ShopifyOAuthErrorCode)
       : null;

     return { success, shop_domain, error_code };
   }

   type ShopifyOAuthResultPageProps = {
     onBackToSettings?: () => void;
   };

   export function ShopifyOAuthResultPage({
     onBackToSettings,
   }: ShopifyOAuthResultPageProps): React.JSX.Element {
     const queryClient = useQueryClient();
     const result = useMemo(
       () => parseOAuthResultParams(window.location.search),
       [],
     );

     useEffect(() => {
       if (result.success) {
         void queryClient.invalidateQueries({ queryKey: shopifyKeys.shops() });
       }
     }, [result.success, queryClient]);

     return (
       <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 text-center">
         <ContentCard>
           <div className="flex flex-col items-center gap-3 px-2 py-4">
             {result.success ? (
               <CircleCheck aria-hidden="true" className="size-10 text-[#1e7a46]" />
             ) : (
               <CircleX aria-hidden="true" className="size-10 text-[#b9382a]" />
             )}
             <p className="text-sm font-semibold text-foreground">
               {result.success
                 ? "Shopify shop connected successfully."
                 : "We could not connect this Shopify shop. Please try again."}
             </p>
             {!result.success && result.error_code ? (
               <p className="text-sm text-muted-foreground">
                 {ERROR_MESSAGES[result.error_code]}
               </p>
             ) : null}
             {result.shop_domain ? (
               <p className="text-xs text-muted-foreground">{result.shop_domain}</p>
             ) : null}
           </div>
         </ContentCard>
         {onBackToSettings ? (
           <button
             className="w-full max-w-xs rounded-2xl bg-primary px-5 py-3.5 text-md font-semibold text-card shadow-sm"
             type="button"
             onClick={onBackToSettings}
           >
             View Shopify integrations
           </button>
         ) : null}
       </div>
     );
   }
   ```
   Never reads/expects `access_token`, `code`, `hmac`, or any secret query param — only the three documented safe params.

2. **`packages/shopify/src/index.ts`** — add:
   ```ts
   export function loadShopifyOAuthResultPage() {
     return import("./pages/ShopifyOAuthResultPage").then((module) => ({
       default: module.ShopifyOAuthResultPage,
     }));
   }
   ```
   (Named-export prop type `ShopifyOAuthResultPageProps` may also be exported if a later phase needs it; not required for this phase since the app wrapper only needs the loader.)

3. **`packages/shopify/src/pages/ShopifyOAuthResultPage.test.tsx`** — colocated Vitest + Testing Library:
   - Renders with `success=true&shop_domain=my-shop.myshopify.com` in a mocked `window.location.search` → shows the success copy and the shop domain, and calls `queryClient.invalidateQueries` with `shopifyKeys.shops()`.
   - Renders with `success=false&error_code=state_expired` → shows the failure copy plus the `state_expired`-specific message, does **not** call `invalidateQueries`.
   - Renders with `success=false` and no/unknown `error_code` → shows only the generic failure fallback copy, no crash on an unrecognized `error_code` value.
   - `onBackToSettings` click calls the injected callback; omitting the prop renders no button (doesn't crash).

4. **`apps/managers-app/ManagerBeyo-app-managers/src/lib/routes.ts`** — add one entry (not part of `TAB_ORDER`/`PRIMARY_TABS`/`MORE_TABS`, exactly like `caseConversation`/`signIn`):
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
     shopifyOAuthResult: '/settings/integrations/shopify/oauth-result',
   } as const;
   ```

5. **`apps/managers-app/ManagerBeyo-app-managers/src/pages/settings/ShopifyOAuthResultPage.tsx`** (new, app-level thin wrapper — mirrors `SettingsPage.tsx`'s own lazy+Suspense composition, but injects the app-specific back-navigation callback that the package cannot hardcode itself):
   ```tsx
   import { lazy, Suspense } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { loadShopifyOAuthResultPage } from '@beyo/shopify';
   import { PageSkeleton } from '@/components/ui/PageSkeleton';
   import { ROUTES } from '@/lib/routes';

   const ShopifyOAuthResultContent = lazy(loadShopifyOAuthResultPage);

   export function ShopifyOAuthResultPage(): React.JSX.Element {
     const navigate = useNavigate();

     return (
       <Suspense fallback={<PageSkeleton />}>
         <ShopifyOAuthResultContent
           onBackToSettings={() => navigate(ROUTES.settings)}
         />
       </Suspense>
     );
   }
   ```
   This is the only place `ROUTES.settings` is referenced for this flow — the package itself never sees an app-specific path string.

6. **`apps/managers-app/ManagerBeyo-app-managers/src/app/router.tsx`** — add one child route under the existing `AppShell`/`ProtectedRoute` tree, using `lazyRoute()` exactly like `caseConversation`:
   ```tsx
   {
     path: ROUTES.shopifyOAuthResult,
     element: lazyRoute(() =>
       import("@/pages/settings/ShopifyOAuthResultPage").then((module) => ({
         default: module.ShopifyOAuthResultPage,
       })),
     ),
   },
   ```

7. **`apps/managers-app/ManagerBeyo-app-managers/src/features/shopify-integrations/surfaces.ts`** (new feature folder, single file — this phase does not need a controller/component here since the surface component itself is `@beyo/shopify`'s own page):
   ```ts
   import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
   import {
     loadShopifyIntegrationsSlidePage,
     SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID,
   } from "@beyo/shopify";

   const shopifyIntegrationsSlide = lazyWithPreload(
     loadShopifyIntegrationsSlidePage,
   );

   export const preloadShopifyIntegrationsSlideSurface =
     shopifyIntegrationsSlide.preload;

   export const shopifyIntegrationsSurfaces: SurfaceRegistrations = {
     [SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID]: {
       surface: "slide",
       component: shopifyIntegrationsSlide.Component,
     },
   };
   ```
   No `path:` entry is set (unlike `CASE_CONVERSATION_SURFACE_ID`'s deep-linkable path) — the Shopify slide is opened only from Settings, not deep-linked to a URL, matching how most sheet/slide surfaces in this registry work.

8. **`apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`** — add the import and spread:
   ```ts
   import { shopifyIntegrationsSurfaces } from "@/features/shopify-integrations/surfaces";
   // ...
   export const surfaceRegistry: SurfaceRegistrations = {
     ...testSurfaces,
     ...caseSurfaces,
     // existing entries unchanged
     ...shopifyIntegrationsSurfaces,
   };
   ```

9. **`apps/managers-app/ManagerBeyo-app-managers/src/features/settings/types.ts`** — extend `SettingsState` (exact current shape not reproduced here since it's a straightforward additive change; add):
   ```ts
   canViewShopifyIntegrations: boolean;
   openShopifyIntegrations: () => void;
   ```

10. **`apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.ts`** — add:
    ```ts
    import { useShopifyIntegrationPermissions, SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID } from "@beyo/shopify";
    import { useSurface } from "@/hooks/use-surface";
    // ...inside useSettingsViewController():
    const { canViewShopifyIntegrations } = useShopifyIntegrationPermissions();
    const surface = useSurface();

    function openShopifyIntegrations(): void {
      surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, {
        surfaceOpeners: {
          closeSurface: () => surface.close(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID),
        },
      });
    }
    // ...add to the returned object:
    canViewShopifyIntegrations,
    openShopifyIntegrations,
    ```

11. **`apps/managers-app/ManagerBeyo-app-managers/src/features/settings/components/SettingsView.tsx`** — add one new section, following the existing "Notifications" section's exact structural pattern, gated by the new boolean:
    ```tsx
    const { /* existing destructures */, canViewShopifyIntegrations, openShopifyIntegrations } = useSettingsViewContext();
    // ...
    {canViewShopifyIntegrations ? (
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Integrations
        </h2>
        <button
          type="button"
          className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left"
          data-testid="settings-shopify-integrations-button"
          onClick={openShopifyIntegrations}
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">Shopify</span>
            <span className="text-xs text-muted-foreground">
              Connect and manage Shopify shop integrations.
            </span>
          </div>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    ) : null}
    ```
    Add `ChevronRight` to the existing `lucide-react` import at the top of the file.

12. **`apps/managers-app/ManagerBeyo-app-managers/package.json`** — add `"@beyo/shopify": "*"` to `dependencies` (alphabetical position near the other `@beyo/*` entries; exact position matches the file's existing loose ordering — no need to fully re-alphabetize the list).

13. **`apps/managers-app/ManagerBeyo-app-managers/src/index.css`** — add the `@source` directive for `@beyo/shopify`, per `35_shared_packages.md` §6 step 4 (every `@beyo/*` package whose `.tsx` files contain `className` strings needs one; `@beyo/shopify` qualifies):
    ```css
    @source "../../../../packages/shopify/src";
    ```
    (Exact relative path to confirm against the file's existing `@source` lines for other packages — use the same depth as the existing `@beyo/ui`/`@beyo/auth` lines.)

14. **Run `npm install` from `frontend/`** — registers `@beyo/shopify` as a dependency edge for `managerbeyo-app-managers` in `package-lock.json`. The workspace symlink itself (`node_modules/@beyo/shopify`) already exists from Phase 1/2's earlier `npm install`, so this step is about the dependency *declaration*, not creating a missing symlink.

## Risks and mitigations

- Risk: the query-invalidation-on-success call reads as "critical behavior" in code review when it is currently inert (no persisted cache to invalidate).
  Mitigation: documented explicitly above and inline-commentable in the implementation — this is intentional, forward-compatible, correct-but-currently-inert code, not a bug.
- Risk: `ShopifyOAuthErrorCodeSchema.options` might not exist if the Zod version in use doesn't expose `.options` on `z.enum(...)` the same way.
  Mitigation: confirmed Zod v4 (per `packages/shopify/package.json`'s `"zod": ">=4.0.0"` peer and `types.ts`'s `z.enum([...])` usage) exposes `.options` as a readonly array of the literal values — if this proves incorrect at implementation time, fall back to an inline array literal of the 9 known codes instead of failing silently.
- Risk: forgetting the `@source` directive for `@beyo/shopify` in `index.css` causes every Shopify component to render unstyled with no error (per `35_shared_packages.md`'s documented failure mode).
  Mitigation: step 13 explicitly calls this out; the validation plan's manual smoke check (open Settings → Shopify) will visually catch it if missed.

## Validation plan

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
npm run typecheck
```

- `npx tsc -p packages/shopify/tsconfig.json --noEmit`: zero errors (still directly runnable in isolation).
- `npx vitest run --environment jsdom packages/shopify/src/pages/ShopifyOAuthResultPage.test.tsx`: passes (all 4 cases from step 3).
- `npm run typecheck` (root): zero errors — this is the first point where `managers-app`'s own `tsc -b --force` actually type-checks `@beyo/shopify`'s usage from app code (routes, surfaces, settings controller/view), in addition to the already-passing direct `packages/shopify/tsconfig.json` entry.
- No new app-level unit test file is required by existing convention (`src/features/settings/` and `src/features/home/` currently have zero `.test.*` files — there is no local pattern to extend), so this phase does not invent one speculatively; app-level behavior (Settings entry visibility, surface opening, OAuth redirect landing) is the right shape for Phase 7's Playwright pass, not a new ad-hoc Vitest convention here.
- Manual smoke check (not automated in this phase): `npm run dev` in `managers-app`, sign in as admin/manager, open Settings, confirm the "Shopify" row appears styled correctly (catches a missed `@source` directive immediately) and opens the slide surface; sign in as worker/seller and confirm the row is absent.

## Review log

- `2026-07-10` Claude: Phase 2 reviewed directly against merged source (not just plan/summary) — approved, no critical issues, two cosmetic non-blockers noted for Phase 7. Phase 3 plan drafted from direct inspection of `managers-app`'s real routing/surface/settings/dependency conventions (`routes.ts`, `router.tsx`, `lazy-route.tsx`, `surface-registry.ts`, `cases/surfaces.ts`, `use-surface.ts`, `HomeView.tsx`, `settings/*`, `providers.tsx`, `package.json`) — every app-wiring pattern resolved without ambiguity; no blockers remained, plan approved directly.

## Lifecycle / review log

- `2026-07-08T15:28:37Z` Codex: Implemented Phase 3 only. Added the package OAuth result page and loader export, wired managers-app route/surface/settings entry/dependency/Tailwind source, ran `npm install`, ran root `npm run typecheck` successfully, and ran the required package tests successfully (`packages/shopify/src/pages/ShopifyOAuthResultPage.test.tsx`, `packages/shopify/src/index.test.ts`). Attempted an additional managers-app controller Vitest file, but local managers-app Vitest startup failed on a missing optional `rolldown` native binding before test collection; recorded in the implementation summary as a validation blocker for optional app-level testing only. No backend files edited, no `.env` files edited, no Phase 4+ scope implemented.

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `Codex`
