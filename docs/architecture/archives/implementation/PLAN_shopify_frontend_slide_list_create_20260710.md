# PLAN_shopify_frontend_slide_list_create_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_slide_list_create_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T03:00:00Z`
- Last updated at (UTC): `2026-07-08T14:39:02Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 2 of 7.
- Phase 1 plan (implemented, reviewed, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_package_foundation_api_20260710.md`. Implemented summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_package_foundation_api_20260710.md`. Every Phase 1 symbol this plan names below has been verified directly against the merged `packages/shopify` source (not just the plan/summary) — see "Phase 1 implementation dependencies to verify before approval," now resolved.
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

**Phase 1 review passed with no critical issues (one non-blocking follow-up noted below). Every assumption this plan made about Phase 1's exports has been checked against the real code and confirmed accurate — no corrections to the Implementation plan section were needed.** This plan is now ready for Codex.

## Goal and intent

- Goal: Build the first visible Shopify UI — the three-pane slide surface (list / detail-placeholder / create) — entirely inside `packages/shopify`, with no consuming-app wiring yet.
- Business/user intent: Let a later phase (Phase 3) drop in a single `openSurface` call and route registration to get a fully working "connect a shop, see your shops, start OAuth" flow, without Phase 3 having to design any UI.
- Non-goals: managers-app wiring (Phase 3), real detail content (Phase 4), action sheet (Phase 5), webhook UI (Phase 6), OAuth result page (Phase 3), workspace-wide sync / scope-status (out of v1 scope per the master plan).

## Scope

- In scope: `ShopifyIntegrationsSlidePage`, `ShopifyIntegrationsCarousel`, `useShopifyIntegrationsPageController`, `ShopifyIntegrationsListContainer`, `ShopifyIntegrationCard`, list loading/error/empty states, `PullToRefresh` wiring, Close & Back list footer, list FAB, `ShopifyIntegrationCreateContainer` (shop_domain form + install-url mutation + browser redirect), a minimal detail-placeholder pane, `surface-ids.ts` (surface ID + `ShopifyIntegrationsSurfaceOpeners` type), package-level tests, and the `@beyo/ui`/`@beyo/hooks`/`@beyo/lib`/`react-hook-form` peer dependencies this UI actually imports.
- Out of scope: everything in the master plan's Phases 3–7 (see that document); any file under `apps/`; any backend/`.env` change; the backend handoff and intention documents (read-only).
- Assumptions:
  - Phase 1's package (`@beyo/shopify`) exists, typechecks, and exports the symbols listed in "Phase 1 implementation dependencies to verify before approval" — **unverified as of this draft.**
  - No app imports `@beyo/shopify` yet after this phase either; validation is therefore package-internal (Vitest + Testing Library), no Playwright (matches master plan's Phase 2 note that Playwright starts being meaningful once there's an app to drive).

## Phase 1 implementation dependencies to verify before approval

**All items below were verified 2026-07-10 by reading the real, merged `packages/shopify` source directly (not just the plan/summary) and by re-running `npx tsc -p packages/shopify/tsconfig.json --noEmit` and the full Phase 1 Vitest suite — both pass, matching the implemented summary's claims exactly.**

- [x] **Actual package folder**: `packages/shopify/` — confirmed.
- [x] **Actual package name**: `@beyo/shopify` in `packages/shopify/package.json` — confirmed.
- [x] **Actual exported types** (from `packages/shopify/src/index.ts`): `ShopifyShopIntegration`, `ShopifyIntegrationStatus`, `ShopifyWebhooksStatus`, `ShopifyScopesStatus`, plus every other type/union listed in the master plan, all confirmed with exact field names/nullability read from `packages/shopify/src/types.ts`. Specifically for this phase's use: `shop.shop_name: string | null`, `shop.shop_domain: string`, `shop.created_at: string`, `shop.status: ShopifyIntegrationStatus`, `shop.scopes_status: ShopifyScopesStatus`, `shop.webhooks_status: ShopifyWebhooksStatus`, `shop.client_id: string` (used as the React list key and as `selectedShopIntegrationId`). No deferred-route fields, no `raw_payload`, present anywhere.
- [x] **Actual exported API functions**: all 7 confirmed present and exported from `src/index.ts`. `createShopifyInstallUrl(shopDomain: string): Promise<CreateShopifyInstallUrlResult>` where the result is exactly `{ install_url, shop_domain, expires_at }` — confirmed in `packages/shopify/src/api/create-shopify-install-url.ts` and covered by a passing test asserting the exact POST body (`{ shop_domain, redirect_after_success: null }`). `listShopifyShops(params?: ListShopifyShopsParams): Promise<ListShopifyShopsResult>` returns `{ shops: ShopifyShopIntegration[], shops_pagination }` — confirmed in `packages/shopify/src/api/list-shopify-shops.ts`.
- [x] **Actual exported query hooks**: `useListShopifyShopsQuery(params: ListShopifyShopsParams = {})` confirmed in `packages/shopify/src/api/use-list-shopify-shops-query.ts` — a plain, unwrapped `useQuery(...)` call, so its return object is a standard TanStack Query v5 `UseQueryResult`: `data`, `isPending` (true until first data/error), `isError`, `error`, `refetch` all present and usable as assumed in this plan's controller (step 4 below). No custom wrapper narrows or renames these fields.
- [x] **Actual exported action hooks**: `useCreateShopifyInstallUrl()` confirmed in `packages/shopify/src/actions/use-create-shopify-install-url.ts` — `useMutation({ mutationFn: createShopifyInstallUrl })`, meaning `mutate`/`mutateAsync` takes the **bare `string` shop domain** exactly as this plan's controller assumes (`createInstallUrl.mutateAsync(shopDomain)` is correct, not `{ shop_domain: shopDomain }`). Standard `isPending`/`error` mutation fields apply.
- [x] **Actual `shopifyKeys` shape**: richer than originally sketched in the Phase 1 plan draft, but this phase does not construct or reference any `shopifyKeys` entry directly — `refreshList()` calls `listQuery.refetch()` only. For the record, the real shape (`packages/shopify/src/api/shopify-keys.ts`) is: `all`, `shops()`, `shopsList(params)`, `shopDetails()`, `shopDetail(id)`, `webhookHistoryRoot(id)`, `webhookHistory(id, params)`, `webhookHistoryInfinite(id)`, `missing()`. Later phases (4–6) that do need explicit invalidation should use this real shape, not the earlier draft's simplified 4-key sketch.
- [x] **Actual `useShopifyIntegrationPermissions` path and return shape**: `import { useShopifyIntegrationPermissions } from "@beyo/shopify"` confirmed via `src/index.ts`'s re-export; return shape confirmed in `packages/shopify/src/lib/use-shopify-integration-permissions.ts` and its passing 4-role test table: `{ canViewShopifyIntegrations, canCreateShopifyInstallUrl, canCreateShopifyReauthorizeUrl, canDisconnectShopifyIntegration, canSyncShopifyWebhooksForShop, canViewShopifyWebhookHistory }` — exact names, exact admin/manager/worker/seller matrix this plan relies on. Internally it uses `useRole()` + `AuthRole.Admin`/`AuthRole.Manager` from `@beyo/auth` (not bare string literals), which is transparent to this phase — nothing here calls `useRole()` directly.
- [x] **Actual API envelope/error parsing helpers**: confirmed — none of the 4 action hooks (`use-create-shopify-install-url.ts`, `use-create-shopify-reauthorize-url.ts`, `use-disconnect-shopify-shop.ts`, `use-sync-shopify-webhooks-for-shop.ts`) call `notify`/`notify.error` internally. This phase's controller-level `notify.error` calls (step 4) do not double-notify.
- [x] **Actual tests/results from Phase 1**: re-ran independently — `npx tsc -p packages/shopify/tsconfig.json --noEmit` passes with zero output; all 7 Vitest files (11 tests: permission matrix ×4 roles, `shopifyKeys` shape ×2, `createShopifyInstallUrl`/`disconnectShopifyShop` request-shape assertions, `useListShopifyShopsQuery`, `useDisconnectShopifyShop` invalidation, package-export smoke test) pass. `ShopifyIntegrationEventType` was kept as the closed 4-value `z.enum` (not loosened to `z.string()`) — irrelevant to this phase (webhook history is Phase 6), noted for that phase's awareness.
- [x] **Implemented Phase 1 summary path**: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_package_foundation_api_20260710.md` — confirmed exists, read in full.
- [x] **Archived Phase 1 plan path**: `docs/architecture/archives/implementation/PLAN_shopify_frontend_package_foundation_api_20260710.md` — confirmed archived (status `archived`, not left under `implementation/`).
- [x] **Deviations from the approved Phase 1 plan**: only one, and it is additive/non-breaking: `shopifyKeys` has more entries than the plan's original sketch (see above). `package.json` peers, `tsconfig.json`, the 7 API functions, the 4 action hooks, and the permission helper all match the approved Phase 1 plan exactly, including the explicit `AuthRole.Admin`/`AuthRole.Manager` correction the Phase 1 plan had flagged as a risk to check.

**One non-blocking follow-up noted (not a Phase 2 blocker, but must happen before Phase 3 needs it):** `node_modules/@beyo/shopify` is not yet a workspace symlink — `npm install` was not re-run from the repo root after the package was created (confirmed via `git status`/`ls -la node_modules/@beyo`). This does not affect Phase 1 or Phase 2, since nothing outside `packages/shopify` imports `@beyo/shopify` yet and this phase's own files only use relative imports within the package. Phase 3's child plan must run `npm install` from `frontend/` once an app's `package.json` declares `"@beyo/shopify": "*"`, per `35_shared_packages.md` §6/§12.

**All checklist items resolved — this plan is approved.**

## Acceptance criteria

1. `ShopifyIntegrationsSlidePage`, its carousel, and every pane shell add no default horizontal `px-*` — only inner containers/cards own spacing.
2. The list pane is the only pane whose header back-arrow and footer button close the host slide surface directly; detail-placeholder and create panes only slide back to list.
3. The list pane renders `useListShopifyShopsQuery`'s data through `ShopifyIntegrationCard`, using `StatePill` for status, with loading/error/empty states matching the reference patterns below.
4. The create pane collects only `shop_domain`, calls `useCreateShopifyInstallUrl`, and on success redirects the browser via `window.location.assign(install_url)` — never collects `shop_name` or exposes `redirect_after_success`.
5. The FAB is visible only on the list pane, opens the create pane, and is hidden/disabled when `useShopifyIntegrationPermissions().canCreateShopifyInstallUrl` is `false`.
6. No component in this phase calls `useRole()` or checks `AuthRole` strings directly — only the Phase 1 permission helper's booleans are consumed.
7. No query/mutation logic lives directly inside `ShopifyIntegrationsSlidePage` — it only composes the carousel and reads surface props/header.
8. Nothing from Phases 3–7 is implemented (no managers-app file touched, no OAuth result page, no real detail query, no action sheet, no webhook UI).
9. This plan's "Phase 1 implementation dependencies to verify before approval" checklist has been fully resolved against real, merged Phase 1 code (confirmed 2026-07-10) — satisfied.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md` — React Query usage inside the controller (`useListShopifyShopsQuery`, `useCreateShopifyInstallUrl`).
- `architecture/06_client_state.md` — confirms plain `useState` in the controller is sufficient; no Zustand store needed for carousel/selection state (matches master plan's package-structure decision to skip `store/`).
- `architecture/07_components.md` — presentational component/props conventions for `ShopifyIntegrationCard`, list states.
- `architecture/08_hooks.md` — controller-as-hook conventions (`useShopifyIntegrationsPageController`).
- `architecture/09_forms.md` — `shop_domain` field validation and submit-error surfacing in the create pane.
- `architecture/10_pages.md` — page composition, loading/error/skeleton state conventions for `ShopifyIntegrationsSlidePage` and the list pane.
- `architecture/13_errors.md` — error-surfacing conventions for the list query and the install-url mutation.
- `architecture/14_styling.md` — `@source` registration note (deferred to whichever app first wires this package in — Phase 3 — but the contract confirms Tailwind class scanning rules that constrain how this phase's classnames must be structured, e.g. no dynamically-constructed class names).
- `architecture/15_feature_structure.md` — where `pages/`, `containers/`, `components/`, `controllers/` live within `packages/shopify/src/`.
- `architecture/16_feature_workflow.md` — confirms this phase is the correct next slice after Phase 1 (Controllers → Components → Forms → Pages), before Dynamic loading/Routes (Phase 3).
- `architecture/17_testing.md` — Vitest/Testing Library conventions for controller and component tests.
- `architecture/19_permissions_local.md` — re-confirms the booleans-not-raw-roles rule for this phase's FAB/create-pane gating.
- `architecture/20_notifications.md` — `notify.error` pattern for install-url mutation failures.
- `architecture/27_responsive.md` — mobile-first list/card/FAB layout.
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md` — `useSurfaceHeader`/`useSurfaceProps`, hidden-host-header pattern, and confirms `slide` is a valid surface type for this page (this phase creates `surface-ids.ts` but does not register the surface in any app — that's Phase 3).
- `architecture/31_animations.md` — carousel transform durations/easings from `@beyo/lib` (`durations.slide`, `easings.slideIn`).
- `architecture/32_loading_skeletons.md` — list loading-skeleton rows.
- `architecture/35_shared_packages.md` — peer-dependency additions to `package.json` (`@beyo/ui`, `@beyo/hooks`), `surface-ids.ts` conventions (§13), reconfirms loader-function requirement for `ShopifyIntegrationsSlidePage` applies once an app imports it (Phase 3), not this phase.
- `architecture/36_scroll_visibility.md` — `useScrollHide` for the list pane's header/footer hide-on-scroll behavior.

### Local extensions loaded

- `28_surfaces_local.md`, `19_permissions_local.md` — as above.

### Explicitly excluded (with reason)

- `11_routing.md`, `30_dynamic_loading(_local).md` — no route or lazy-loaded surface registration happens in this phase; both are Phase 3 concerns.
- `33_vaul_drawer.md` — no bottom sheet exists yet in this phase (action/error/webhook-subscriptions sheets are Phases 5–6).
- `18_performance.md` — the list this phase renders is capped at `limit=50` with no virtualization need; nothing here is performance-sensitive enough to warrant the contract yet.
- `24_dto.md` — no separate view-model transformation layer is introduced in this phase; `ShopifyIntegrationCard` reads `ShopifyShopIntegration` fields directly (`shop_name ?? shop_domain`, etc.) inline, matching the intention doc's simple field-mapping expectations. Revisit if Phase 4's richer detail view needs a dedicated DTO layer.
- `04_api_client(_local).md`, `02_types.md` — already fully addressed by Phase 1; this phase only consumes Phase 1's exported hooks/types, it does not touch the API layer directly.
- `37_keyboard_aware_inputs.md` — the create pane has exactly one short text input with a fixed footer below it; deferred until implementation reveals an actual keyboard-covers-input problem worth solving, rather than assumed upfront.

### File read intent — pattern vs. relational

The following files were read for this draft, each for the single purpose stated, and are reproduced concretely in "Implementation plan" so the eventual implementer does not need to re-read them for structure:
- `packages/tasks/src/pages/TaskDetailSlidePage.tsx` — hidden-header effect, `useScrollHide({ revealAtEdge, edgeOffset })` return shape (`scrollRef`, `isHidden`, `isAtEdge`, `hideProgressContainerRef`), `PullToRefresh` props (`className`, `scrollClassName`, `scrollRef`, `onRefresh`), no page-level `px-*`.
- `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx` — thin page composition, `useSurfaceProps<T>()`, close-surface fallback (`controller.closeSurface?.() ?? header?.requestClose()`).
- `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` — controller returns a plain object of state + functions; `surfaceOpeners` is an optional constructor param; `closeSurface: surfaceOpeners?.closeSurface`; mutation/query errors surfaced via `notify.error` inside `try/catch`, rethrown after notifying.
- `packages/emails/src/components/EmailThreadCarousel.tsx` — exact transform shell (`h-full overflow-hidden` outer, `flex h-full w-[N00%]` inner strip, `translateX`, `transition: transform ${durations.slide}s cubic-bezier(${easings.slideIn.join(",")})` from `@beyo/lib`); this phase adapts it from 2 panes (`w-[200%]`, `-50%`) to 3 panes (`w-[300%]`, `-33.333333%`).
- `packages/emails/src/components/EmailInboxView.tsx` + `EmailInboxFooter.tsx` — list shell structure (scroll-hide header wrapper, `PullToRefresh` body, loading-skeleton rows `h-30 animate-pulse rounded-xl bg-muted`, error `ContentCard` + retry button, empty-state `ContentCard`), footer CSS-var-driven hide/reveal (`transform: translateY(calc(var(--scroll-hide-progress, 0) * 100%))`, `opacity: calc(1 - var(--scroll-hide-progress, 0))`), safe-area bottom spacer.
- `apps/selleres-app/.../TaskCreationFab.tsx` — fixed bottom-right positioning class (`bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4`), `size-14 rounded-full bg-primary text-card shadow-md` button styling. **Not used**: its `framer-motion` multi-action expand/collapse machinery — this phase's FAB is a single static button with no motion library dependency (see Implementation plan step 7 for the explicit simplification decision).
- `packages/task-creation/src/components/InternalFormContent.tsx` — read in full; found to be almost entirely `StagedForm`/`useStagedForm` machinery, which the intention document explicitly says not to use here. The only transferable pattern is the outer shape (`useForm` + `zodResolver` + `FormProvider` + `ContentCard`-wrapped fields) — reproduced in Implementation plan step 6 without any staged-form import.

No implementer should re-read these files for this phase; the extracted patterns above and the concrete code in "Implementation plan" are sufficient. `09_forms.md` is the authority for anything about form structure not already fixed by the (deliberately minimal) reference pattern above.

## Implementation plan

*(Every symbol name from `@beyo/shopify` below has been verified against the real, merged Phase 1 source per "Phase 1 implementation dependencies to verify before approval" — no corrections were needed; the code below is ready to execute as written.)*

1. **`package.json` additions** — add peer dependencies actually imported by this phase's new files: `@beyo/ui` (`ContentCard`, `PullToRefresh`, `useScrollHide`, `StatePill`), `@beyo/hooks` (`useSurfaceHeader`, `useSurfaceProps`), `lucide-react` (`ArrowLeft`, `Plus`), `react-hook-form` + `@hookform/resolvers` (create form). `@beyo/lib` (`durations`, `easings`, `cn`, `notify`) is already a Phase 1 peer. Do **not** add `framer-motion` — this phase's FAB has no motion dependency (see step 7).

2. **`src/surface-ids.ts`**:
   ```ts
   export const SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID = "shopify-integrations-slide";

   export type ShopifyIntegrationsSurfaceOpeners = {
     closeSurface?: () => void;
   };

   export type ShopifyIntegrationsSlideSurfaceProps = {
     surfaceOpeners?: ShopifyIntegrationsSurfaceOpeners;
   };
   ```
   Kept minimal — no picker-opener keys are needed until a later phase's sheet needs one injected from outside (e.g., the action sheet in Phase 5 will likely be opened by the *detail pane*, not injected into this top-level surface, so it may end up with its own surface ID rather than a key on this map; Phase 4/5 decides that, not this phase).

3. **`src/lib/shopify-status.ts`** — status-to-`StatePillVariant` mapping, the one small piece of UI-adjacent logic this phase needs:
   ```ts
   import type { StatePillVariant } from "@beyo/ui";
   import type { ShopifyIntegrationStatus } from "../types";

   export function shopifyIntegrationStatusVariant(
     status: ShopifyIntegrationStatus,
   ): StatePillVariant {
     switch (status) {
       case "active":
         return "success";
       case "pending_install":
         return "neutral";
       case "needs_reauth":
       case "scopes_outdated":
       case "webhooks_outdated":
         return "warning";
       case "disabled":
       case "uninstalled":
         return "neutral";
       case "error":
         return "danger";
     }
   }

   export function shopifyIntegrationStatusLabel(
     status: ShopifyIntegrationStatus,
   ): string {
     // one friendly label per status value, e.g. "needs_reauth" -> "Needs reauthorization"
   }
   ```
   (Exact label copy is an implementation-time decision; keep it short enough for a `StatePill`.)

4. **`src/controllers/use-shopify-integrations-page.controller.ts`**:
   ```ts
   import { useState } from "react";
   import { notify } from "@beyo/lib";

   import { useCreateShopifyInstallUrl } from "../actions/use-create-shopify-install-url";
   import { useListShopifyShopsQuery } from "../api/use-list-shopify-shops-query";
   import { useShopifyIntegrationPermissions } from "../lib/use-shopify-integration-permissions";
   import type { ShopifyIntegrationsSurfaceOpeners } from "../surface-ids";
   import type { ShopifyShopIntegration } from "../types";

   type UseShopifyIntegrationsPageControllerParams = {
     surfaceOpeners?: ShopifyIntegrationsSurfaceOpeners;
   };

   export function useShopifyIntegrationsPageController({
     surfaceOpeners,
   }: UseShopifyIntegrationsPageControllerParams) {
     const [activeIndex, setActiveIndex] = useState<0 | 1 | 2>(0);
     const [selectedShopIntegrationId, setSelectedShopIntegrationId] =
       useState<string | null>(null);

     const permissions = useShopifyIntegrationPermissions();
     const listQuery = useListShopifyShopsQuery({ limit: 50, offset: 0 });
     const createInstallUrl = useCreateShopifyInstallUrl();

     function openShop(shop: ShopifyShopIntegration): void {
       setSelectedShopIntegrationId(shop.client_id);
       setActiveIndex(1);
     }

     function openCreate(): void {
       setActiveIndex(2);
     }

     function goBackToList(): void {
       setActiveIndex(0);
       setSelectedShopIntegrationId(null);
     }

     async function refreshList(): Promise<void> {
       try {
         await listQuery.refetch();
       } catch (error) {
         notify.error(
           error instanceof Error ? error.message : "Could not refresh Shopify shops.",
         );
         throw error;
       }
     }

     async function submitShopDomain(shopDomain: string): Promise<void> {
       try {
         const result = await createInstallUrl.mutateAsync(shopDomain);
         window.location.assign(result.install_url);
       } catch (error) {
         notify.error(
           error instanceof Error
             ? error.message
             : "Could not start the Shopify connection. Please try again.",
         );
         throw error;
       }
     }

     return {
       activeIndex,
       selectedShopIntegrationId,
       shops: listQuery.data?.shops ?? [],
       isListLoading: listQuery.isPending,
       listError: listQuery.error ?? null,
       permissions,
       closeSurface: surfaceOpeners?.closeSurface,
       openShop,
       openCreate,
       goBackToList,
       refreshList,
       submitShopDomain,
       isSubmittingShopDomain: createInstallUrl.isPending,
     };
   }
   ```
   Verify `listQuery.isPending` is the correct "first load, no cached data" flag name once Phase 1's exact `useListShopifyShopsQuery` return shape is confirmed (per the checklist above) — `@tanstack/react-query` v5 distinguishes `isPending` (no data yet at all) from `isLoading` (a stricter alias); use whichever Phase 1's other query hooks (e.g. `packages/tasks`' `useGetTaskQuery`) established as the convention, for consistency (`packages/tasks/src/api/use-get-task-query.ts` does not itself surface a name — reconfirm against a `packages/tasks` list-query hook, e.g. `use-list-tasks-query.ts`, if ambiguity remains at implementation time).

5. **`src/components/ShopifyIntegrationCard.tsx`** — presentational card:
   ```tsx
   type ShopifyIntegrationCardProps = {
     shop: ShopifyShopIntegration;
     onPress: (shop: ShopifyShopIntegration) => void;
   };
   ```
   Renders `shop.shop_name ?? shop.shop_domain` as title, `shop.shop_domain` as subtitle (only shown if a `shop_name` exists — otherwise the domain is already the title, don't repeat it), formatted `created_at`, a `StatePill` using `shopifyIntegrationStatusVariant`/`shopifyIntegrationStatusLabel`, and a small warning glyph (e.g. `TriangleAlert` from `lucide-react`) when `shop.scopes_status === "outdated"` or `shop.webhooks_status !== "synced"`. Whole card is a `<button>` (or a `div role="button"`) calling `onPress(shop)`. Owns its own local `px-4 py-3` (or similar) spacing — no reliance on ancestor padding.

6. **`src/containers/ShopifyIntegrationsListContainer.tsx`** — presentational, receives everything from the controller as props (mirrors `EmailInboxView`'s prop-drilling shape):
   ```tsx
   type ShopifyIntegrationsListContainerProps = {
     shops: ShopifyShopIntegration[];
     isLoading: boolean;
     error: Error | null;
     canCreateInstallUrl: boolean;
     onRefresh: () => Promise<void>;
     onOpenShop: (shop: ShopifyShopIntegration) => void;
     onOpenCreate: () => void;
     onClose: () => void;
   };
   ```
   Structure, adapted from `EmailInboxView`/`EmailInboxFooter`:
   - Header row (not the hidden-host header — this package's own in-pane header): `ArrowLeft` icon button calling `onClose`, title "Shopify Integrations". Owns local `px-4 py-3` (or similar).
   - Body: `useScrollHide()` + `PullToRefresh` (`onRefresh` = `onRefresh` prop) wrapping:
     - loading: 3–5 skeleton rows (`h-20 animate-pulse rounded-xl bg-muted`, `mx-4`) while `isLoading && shops.length === 0`.
     - error: `ContentCard` with "Shopify shops could not be loaded." + "Try again" button calling `onRefresh`.
     - empty (`!isLoading && !error && shops.length === 0`): `ContentCard` with friendly copy ("No Shopify shops connected yet.") + a "Connect a shop" button calling `onOpenCreate` (only rendered/enabled if `canCreateInstallUrl`).
     - populated: `shops.map(shop => <ShopifyIntegrationCard key={shop.client_id} shop={shop} onPress={onOpenShop} />)`.
   - Footer: Close & Back button (per `EmailInboxFooter`'s exact CSS-var-driven show/hide + safe-area spacer pattern), calling `onClose`.
   - FAB: rendered only here (never in detail-placeholder or create panes) — see step 7.
   - No default horizontal `px-*` on the *outer* container shell — the header/body/footer/card elements above own their own local spacing individually, per the master plan's spacing rule.

7. **FAB** — either inline in `ShopifyIntegrationsListContainer` or a small dedicated `src/components/ShopifyConnectFab.tsx`:
   ```tsx
   type ShopifyConnectFabProps = {
     visible: boolean;
     onPress: () => void;
   };

   export function ShopifyConnectFab({ visible, onPress }: ShopifyConnectFabProps): React.JSX.Element | null {
     if (!visible) return null;
     return (
       <button
         type="button"
         aria-label="Connect a Shopify shop"
         className="fixed bottom-[calc(var(--safe-bottom,0px)+5.5rem)] right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md"
         onClick={onPress}
       >
         <Plus aria-hidden="true" className="size-5" />
       </button>
     );
   }
   ```
   **Deliberate simplification vs. `TaskCreationFab.tsx`**: no `framer-motion`, no expand/collapse menu, no scanner prewarm — single static button per the intention doc's explicit instruction that this FAB should be simpler. The bottom offset (`5.5rem` above safe-bottom, vs. `TaskCreationFab`'s `0.75rem`) is deliberately taller to clear the Close & Back footer (which `EmailInboxFooter` shows is roughly `~4.5rem` tall including its button + padding + safe-area spacer) — confirm the exact clearance value against the real rendered footer height during implementation rather than trusting this estimate blindly. `visible` is driven by `activeIndex === 0 && permissions.canCreateShopifyInstallUrl`.

8. **`src/containers/ShopifyIntegrationCreateContainer.tsx`**:
   ```tsx
   const ShopifyCreateFormSchema = z.object({
     shop_domain: z.string().trim().min(1, "Enter a Shopify store domain."),
   });
   type ShopifyCreateFormValues = z.infer<typeof ShopifyCreateFormSchema>;

   type ShopifyIntegrationCreateContainerProps = {
     isSubmitting: boolean;
     onSubmit: (shopDomain: string) => Promise<void>;
     onBack: () => void;
   };
   ```
   Uses `useForm({ resolver: zodResolver(ShopifyCreateFormSchema) })` + a single labeled text input (helper text: "Enter your Shopify store domain, for example my-shop.myshopify.com.") wrapped in `ContentCard`, **no** `shop_name` field, **no** `redirect_after_success` field/exposure anywhere. Footer: left "Back" button (icon + label) calling `onBack`; right "Connect Shopify" button, `disabled`/loading-labeled while `isSubmitting`, calling `form.handleSubmit(values => onSubmit(values.shop_domain))`. On a rejected promise from `onSubmit` (controller already calls `notify.error`), the pane simply stays put — no additional inline error UI beyond react-hook-form's own field-level validation message for the blank-input case.

9. **`src/containers/ShopifyIntegrationDetailPlaceholderContainer.tsx`** (or a plain component in `components/` — implementer's call, no controller needed):
   ```tsx
   type ShopifyIntegrationDetailPlaceholderProps = {
     shopIntegrationId: string | null;
     onBack: () => void;
   };
   ```
   Renders a back button (calls `onBack`, slides to list — never closes the surface) and a centered "Loading shop details…" or "Select a shop to view its details." message depending on whether `shopIntegrationId` is set. **Does not** call `useGetShopifyShopQuery` or render any real field — that is entirely Phase 4's responsibility. This file's only job is to give the carousel a non-empty third pane.

10. **`src/components/ShopifyIntegrationsCarousel.tsx`**:
    ```tsx
    import { cn, durations, easings } from "@beyo/lib";

    type ShopifyIntegrationsCarouselProps = {
      activeIndex: 0 | 1 | 2;
      listPane: React.ReactNode;
      detailPane: React.ReactNode;
      createPane: React.ReactNode;
    };

    export function ShopifyIntegrationsCarousel({
      activeIndex,
      listPane,
      detailPane,
      createPane,
    }: ShopifyIntegrationsCarouselProps): React.JSX.Element {
      return (
        <div className="h-full overflow-hidden">
          <div
            className={cn("flex h-full w-[300%]")}
            style={{
              transform: `translateX(${activeIndex * -33.333333}%)`,
              transition: `transform ${durations.slide}s cubic-bezier(${easings.slideIn.join(",")})`,
            }}
          >
            <div className="flex h-full w-1/3 min-w-0 flex-col">{listPane}</div>
            <div className="flex h-full w-1/3 min-w-0 flex-col">{detailPane}</div>
            <div className="flex h-full w-1/3 min-w-0 flex-col">{createPane}</div>
          </div>
        </div>
      );
    }
    ```
    Directly adapted from `EmailThreadCarousel.tsx`'s 2-pane version — no `px-*` anywhere in this file.

11. **`src/pages/ShopifyIntegrationsSlidePage.tsx`**:
    ```tsx
    import { useEffect } from "react";
    import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

    import { ShopifyIntegrationsCarousel } from "../components/ShopifyIntegrationsCarousel";
    import { ShopifyIntegrationCreateContainer } from "../containers/ShopifyIntegrationCreateContainer";
    import { ShopifyIntegrationDetailPlaceholderContainer } from "../containers/ShopifyIntegrationDetailPlaceholderContainer";
    import { ShopifyIntegrationsListContainer } from "../containers/ShopifyIntegrationsListContainer";
    import { useShopifyIntegrationsPageController } from "../controllers/use-shopify-integrations-page.controller";
    import type { ShopifyIntegrationsSlideSurfaceProps } from "../surface-ids";

    export function ShopifyIntegrationsSlidePage(): React.JSX.Element {
      const header = useSurfaceHeader();
      const props = useSurfaceProps<ShopifyIntegrationsSlideSurfaceProps>();
      const controller = useShopifyIntegrationsPageController({
        surfaceOpeners: props?.surfaceOpeners,
      });

      useEffect(() => {
        header?.setHeaderHidden(true);
        return () => {
          header?.setHeaderHidden(false);
        };
      }, [header]);

      function closeSurface(): void {
        if (controller.closeSurface) {
          controller.closeSurface();
          return;
        }
        header?.requestClose();
      }

      return (
        <div className="h-full bg-background">
          <ShopifyIntegrationsCarousel
            activeIndex={controller.activeIndex}
            listPane={
              <ShopifyIntegrationsListContainer
                shops={controller.shops}
                isLoading={controller.isListLoading}
                error={controller.listError}
                canCreateInstallUrl={controller.permissions.canCreateShopifyInstallUrl}
                onRefresh={controller.refreshList}
                onOpenShop={controller.openShop}
                onOpenCreate={controller.openCreate}
                onClose={closeSurface}
              />
            }
            detailPane={
              <ShopifyIntegrationDetailPlaceholderContainer
                shopIntegrationId={controller.selectedShopIntegrationId}
                onBack={controller.goBackToList}
              />
            }
            createPane={
              <ShopifyIntegrationCreateContainer
                isSubmitting={controller.isSubmittingShopDomain}
                onSubmit={controller.submitShopDomain}
                onBack={controller.goBackToList}
              />
            }
          />
        </div>
      );
    }
    ```
    No `px-*` on the root `div`; no query/mutation calls in this file — everything flows through `controller`.

12. **`src/index.ts` additions** — export `ShopifyIntegrationsSlidePage` **only** via a loader function, not a static re-export, per `35_shared_packages.md` §14 (this page will be registered as a surface once an app consumes it in Phase 3):
    ```ts
    export function loadShopifyIntegrationsSlidePage() {
      return import("./pages/ShopifyIntegrationsSlidePage").then((m) => ({
        default: m.ShopifyIntegrationsSlidePage,
      }));
    }
    ```
    Also export (statically, since these are not page components): `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID`, `ShopifyIntegrationsSurfaceOpeners`, `ShopifyIntegrationsSlideSurfaceProps`, `useShopifyIntegrationsPageController` (only if a later phase needs to reuse it directly — otherwise keep it internal), `ShopifyIntegrationCard` (if Phase 4/6 wants to reuse the card elsewhere).

13. **Tests** (colocated Vitest + Testing Library, mirroring Phase 1's approach):
    - `use-shopify-integrations-page.controller.test.ts` — `openShop` sets `activeIndex` to `1` and `selectedShopIntegrationId`; `openCreate` sets `activeIndex` to `2`; `goBackToList` resets both; `submitShopDomain` on mutation success calls `window.location.assign` with the mocked `install_url` (mock `window.location.assign`); on mutation failure calls `notify.error` and does not navigate.
    - `ShopifyIntegrationsCarousel.test.tsx` — asserts the `translateX` inline style value for each of the 3 `activeIndex` values, and asserts no element in the rendered tree has a `px-` class (a simple `container.querySelectorAll` class-string scan, matching the acceptance-criteria intent even if not exhaustive).
    - `ShopifyIntegrationCreateContainer.test.tsx` — blank submit shows the "Enter a Shopify store domain." validation message and does not call `onSubmit`; valid submit calls `onSubmit` with the trimmed domain.
    - `ShopifyIntegrationsListContainer.test.tsx` — loading/error/empty/populated states render the expected content; `onOpenCreate` hidden/disabled path when `canCreateInstallUrl` is `false`.

## Risks and mitigations

- Risk: the FAB's `5.5rem` bottom offset estimate doesn't actually clear the rendered Close & Back footer, causing overlap on some viewport/safe-area combination.
  Mitigation: step 7 explicitly flags this as an estimate to confirm against the real rendered footer height during implementation, not a fixed final value.
- Risk: `node_modules/@beyo/shopify` is not yet linked (no `npm install` run since the package was created), so if any Phase 2 test or tool unexpectedly tries to resolve `@beyo/shopify` as an external package name (rather than via relative imports within `packages/shopify/src`), it would fail to resolve.
  Mitigation: every file this phase adds lives inside `packages/shopify/src` and uses relative imports to reach Phase 1's exports (e.g. `../api/use-list-shopify-shops-query`), never `from "@beyo/shopify"` — this phase has no dependency on the workspace symlink existing. Confirmed non-issue for this phase; flagged for Phase 3 instead.

## Validation plan

- `tsc -p packages/shopify/tsconfig.json --noEmit`: zero errors.
- `npm run typecheck` (root): zero errors (package still has no app consumer, so this only re-confirms the Phase 1-added direct `tsc` entry still passes with Phase 2's new files included).
- `npx vitest run --environment jsdom packages/shopify/src/controllers/use-shopify-integrations-page.controller.test.ts`: passes.
- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyIntegrationsCarousel.test.tsx`: passes.
- `npx vitest run --environment jsdom packages/shopify/src/containers/ShopifyIntegrationCreateContainer.test.tsx`: passes.
- `npx vitest run --environment jsdom packages/shopify/src/containers/ShopifyIntegrationsListContainer.test.tsx`: passes.
- No Playwright run required — no app consumes this package yet (matches master plan's Phase 2 validation note).

## Review log

- `2026-07-10` Claude: Phase 2 draft plan prepared while Codex implements Phase 1 concurrently. All Phase 1 symbol names provisional, listed in a dedicated verification checklist. Plan intentionally left `under_construction`.
- `2026-07-10` Claude: Reviewed the completed, archived Phase 1 implementation directly against source (`packages/shopify/src/**`, not just the plan/summary) — re-ran `npx tsc -p packages/shopify/tsconfig.json --noEmit` (zero errors) and the full Phase 1 Vitest suite (7 files, 11 tests, all pass). Verdict: approved, one non-blocking follow-up (run `npm install` before Phase 3). Every assumption this plan made about Phase 1 exports/signatures/shapes was confirmed correct — only documentation-level updates were needed (the checklist itself, plus noting `shopifyKeys`'s richer real shape for later phases' benefit); no Implementation plan code required correction. Promoted status to `approved`.
- `2026-07-08` Codex: Implemented the approved Phase 2 scope entirely inside `packages/shopify` with no `apps/` wiring or Phase 3+ features. Added the slide page, 3-pane carousel, controller, list/create/detail-placeholder containers, cards/FAB, status helper, package exports, and focused tests. Validation passed with `npx tsc -p packages/shopify/tsconfig.json --noEmit`, the 5-file Phase 2 Vitest suite (10 tests), and `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `Codex`
