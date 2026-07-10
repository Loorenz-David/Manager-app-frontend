# PLAN_shopify_frontend_shop_action_sheet_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_shop_action_sheet_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T07:00:00Z`
- Last updated at (UTC): `2026-07-08T17:48:04Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 5 of 7.
- Phase 4 plan (implemented, reviewed, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_detail_view_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_shop_detail_view_20260710.md`. Reviewed 2026-07-10 by reading every listed source file directly, then independently re-running `npm run typecheck` (full monorepo, zero errors) and `npx vitest run --environment jsdom packages/shopify/src` (19 files, 37 tests, all pass) — verdict: **approved**, no critical issues. See "Phase 4 review findings" below.
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

**Phase 4 is implemented and reviewed. Every symbol/prop this plan names below has been verified directly against the merged `packages/shopify` source — no assumption in the original draft turned out to be wrong.** This plan is ready for Codex.

## Goal and intent

- Goal: Make the Phase 4 detail header's three-dot menu functional — open a bottom-sheet action surface offering reauthorize, sync webhooks, and disconnect for the selected shop, each wired to its already-implemented Phase 1 mutation hook.
- Business/user intent: Give admin (all three actions) and manager (reauthorize only) a working way to fix an unhealthy Shopify connection without leaving the app, completing the direct shop-management flow the intention document describes end-to-end.
- Non-goals: webhook subscriptions list/sheet, webhook history timeline, workspace-wide sync, scope-status endpoint, any backend/`.env` change, any redesign of the create/list/detail layouts already built.

## Scope

- In scope: a new package-owned bottom-sheet surface (`ShopifyShopActionsSheetPage` + content), its surface ID/props/opener-injection plumbing in `surface-ids.ts`, wiring the Phase 4 header's three-dot button through the slide page down to the detail container, the managers-app surface registration this new sheet requires, and focused tests.
- Out of scope: everything the master plan assigns to Phase 6 (webhook subscriptions/history) and Phase 7; any backend or `.env` change; any change to Phases 1–4's already-built list/create/detail containers beyond the minimal prop-threading described below.
- Assumptions: Phase 4's `ShopifyIntegrationDetailContainer`/`ShopifyIntegrationDetailHeader` prop shapes match its approved plan exactly — **confirmed** by direct source review (see "Phase 4 review findings and confirmed facts" below).

## Phase 4 review findings and confirmed facts

**All items below were verified 2026-07-10 by reading the real, merged `packages/shopify` source directly** — not just the plan/summary.

**One notable environment finding, unrelated to Phase 4's code**: at the start of this review, `node_modules/` and `package-lock.json` were both entirely missing from the working directory (confirmed via `ls`/`git status`). This happened sometime after the Phase 3 review (which successfully ran `npm install`/`npm run typecheck`/Vitest in this same directory) and is not something Phase 4's implementation caused — Codex's own Phase 4 summary reports commands that require a working install, meaning the environment was intact when Codex ran them. `npm install` was re-run to restore it (458 top-level `node_modules` entries, `tsc` binary present, `@beyo/shopify` workspace symlink intact) before any verification below was performed. Worth the user's attention as an unusual, unexplained environment change, but not a blocker for this or any Shopify phase.

- **`ShopifyIntegrationDetailContainer`** — confirmed at `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`, props exactly `{ selectedShopIntegrationId: string | null; onBack: () => void }` — identical to the deleted placeholder's shape, **no `onOpenActions` prop exists yet**. This is exactly what this phase needs to add (Implementation plan step 6, unchanged from the draft).
- **`ShopifyIntegrationDetailHeader`** — confirmed at `packages/shopify/src/components/ShopifyIntegrationDetailHeader.tsx`, props exactly `{ shop: ShopifyShopIntegration; onBack: () => void; onOpenActions?: () => void }`. The three-dot button (`EllipsisVertical` icon, `aria-label="Shopify detail actions"`) is unconditionally rendered and disabled via `disabled={!onOpenActions}` — exactly the assumed shape. This phase's job is precisely to *supply* a real `onOpenActions` function; the header itself needs zero changes.
- **`selectedShopIntegrationId` flow** — confirmed passed as a direct prop from `ShopifyIntegrationsSlidePage` (`controller.selectedShopIntegrationId`) straight into `ShopifyIntegrationDetailContainer`; the shared controller (`use-shopify-integrations-page.controller.ts`) is byte-for-byte unchanged since Phase 2. This confirms Design decision #1/#2 held exactly: this phase threads `onOpenActions` through the **slide page**, not the controller.
- **Status/formatter helpers** — confirmed `packages/shopify/src/lib/shopify-status.ts` now exports (alongside Phase 2's unchanged `shopifyIntegrationStatusVariant`/`shopifyIntegrationStatusLabel`/`hasShopifyHealthWarning`): `shopifyScopesStatusVariant`, `shopifyScopesStatusLabel`, `shopifyWebhookSubscriptionStatusVariant`, `shopifyWebhookSubscriptionStatusLabel`. `packages/shopify/src/lib/shopify-formatters.ts` exports `formatShopifyDetailDate` and `formatShopifyDetailValue`. This phase does not need any of these directly (it only needs the shop's raw `status`/`scopes_status`/`webhooks_status` fields for its own visibility booleans).
- **Package exports (`packages/shopify/src/index.ts`)** — confirmed `ShopifyIntegrationDetailContainer` is exported, along with all six new Phase 4 components, the two formatter functions, and the four new status-helper functions. No naming collision with this phase's planned new exports (`SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID`, `ShopifyShopActionsSheetSurfaceProps`, `loadShopifyShopActionsSheetPage`).
- **`ShopifyIntegrationDetailPlaceholder` deletion** — confirmed deleted; no residual import anywhere in `index.ts` or `ShopifyIntegrationsSlidePage.tsx`.
- **Tests/results** — independently re-ran (not just trusted the summary): `npm run typecheck` from the repo root passes with zero errors across all three apps plus every extra `tsc -p packages/<name>/tsconfig.json` entry (including `shopify`); `npx vitest run --environment jsdom packages/shopify/src` passes **19 files, 37 tests**, matching the summary exactly. Spot-read `ShopifyIntegrationDetailContainer.test.tsx` in full — it includes an explicit scope-drift guard assertion (`expect(screen.queryByText(/webhook history/i)).not.toBeInTheDocument()` and asserts the three-dot menu button `.toBeDisabled()`), confirming Phase 4 deliberately tested for the absence of Phase 5+ functionality.
- **Implemented Phase 4 summary path**: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_shop_detail_view_20260710.md` — confirmed exists, read in full.
- **Archived Phase 4 plan path**: `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_detail_view_20260710.md` — confirmed archived.
- **Deviations from the approved Phase 4 plan**: none found. Every component, the exact scroll-hide CSS-variable reuse (`--scroll-hide-progress`, not `TaskDetailBottomActions`'s `--scroll-hide-progress-footer`), the no-button scopes warning, the calm "No current errors." state, and the 5-item-capped webhook preview list all match the approved plan's Design decisions precisely.
- **Scope confirmation**: `git status`/`git diff --stat` confirm only `packages/shopify/**` and doc files changed in Phase 4 — no `apps/`, backend, or `.env` files touched.

**Verdict: approved, no critical issues, no corrections needed to this plan's core architecture.** Only the already-anticipated "add `onOpenActions` to the container" step remains to execute — nothing in this plan's Implementation plan required revision as a result of this review.

## Verified Phase 1 facts this plan reuses unchanged (already confirmed in earlier phase reviews this session, not re-flagged as pending)

- `useCreateShopifyReauthorizeUrl()`, `useSyncShopifyWebhooksForShop()`, `useDisconnectShopifyShop()` (`packages/shopify/src/actions/*.ts`) each wrap a plain `useMutation` whose `mutationFn` takes a **bare `string` `shopIntegrationId`** — `mutateAsync(shopIntegrationId)`, not an object. Confirmed by direct source read during the Phase 1 review.
- **Reauthorize's hook invalidates nothing** (`use-create-shopify-reauthorize-url.ts` has no `onSettled` — correct, since the user immediately leaves for Shopify's OAuth screen). This phase does not need to change it.
- **Sync-webhooks' hook already invalidates** `shopifyKeys.shopDetail(shopIntegrationId)` and `shopifyKeys.webhookHistoryRoot(shopIntegrationId)` in its own `onSettled` (confirmed source read). It does **not** invalidate `shopifyKeys.shops()` (the list) — a deliberate, narrow scope from Phase 1, since Phase 1 had no UI to know the list cares about `webhooks_status`. This phase adds the list refresh at the **calling layer** (the action sheet's own success handling), not by modifying Phase 1's hook — see "Design decisions" below.
- **Disconnect's hook already invalidates** `shopifyKeys.shops()` and `shopifyKeys.webhookHistoryRoot(shopIntegrationId)` in its own `onSettled`. Because `shopifyKeys.shopDetail(id)` is a **descendant** of the `shopifyKeys.shops()` key prefix (`shopDetail(id) = [...shopDetails(), id] = [...shops(), "detail", id]`), TanStack Query's prefix-matching invalidation means invalidating `shopifyKeys.shops()` **already also invalidates every cached shop detail query**, including the selected shop's. **Conclusion: disconnect's existing invalidation is already fully sufficient — this phase does not need to touch `use-disconnect-shopify-shop.ts` at all**, and does not need to separately invalidate `shopifyKeys.shopDetail(id)`.
- `ConfirmActionButton` (`packages/ui/src/components/primitives/confirm-action-button/ConfirmActionButton.tsx`): `{ label, confirmLabel, confirmDurationMs?, onConfirm, disabled?, icon?, align?, ... }` — first tap arms a fill/timer animation, second tap within `confirmDurationMs` calls `onConfirm()`. No external state needed from the caller beyond `onConfirm`/`disabled`.
- `useShopifyIntegrationPermissions()` returns `{ canViewShopifyIntegrations, canCreateShopifyInstallUrl, canCreateShopifyReauthorizeUrl, canDisconnectShopifyIntegration, canSyncShopifyWebhooksForShop, canViewShopifyWebhookHistory }` — this phase consumes `canCreateShopifyReauthorizeUrl`, `canSyncShopifyWebhooksForShop`, `canDisconnectShopifyIntegration` directly; never calls `useRole()` itself.

## Design decisions (with rationale)

1. **The action sheet is a real, package-owned, app-registered surface — not inline content inside the slide page.** The dominant precedent in this codebase (`TASK_ACTIONS_SHEET_SURFACE_ID` opened from `TaskDetailHeader`'s three-dot menu via a controller-assembled `surfaceOpeners` map, `CASE_TASK_INFO_SHEET_SURFACE_ID`/`CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID` registered in `caseSurfaces` and opened the same way) is that action/detail sheets stacked on top of an already-open slide are separate registered `"sheet"` surfaces, not conditionally-rendered JSX inside the slide's own component tree. This also matches the master plan's own package structure sketch (`ShopifyIntegrationActionsSheetPage.tsx` was always the planned file name).
2. **The package never calls `openSurface` itself (`35_shared_packages.md` §13).** `packages/shopify` cannot import `useSurface`/`openSurface` to open its own action sheet. Instead: `surface-ids.ts`'s `ShopifyIntegrationsSurfaceOpeners` (currently just `{ closeSurface?: () => void }`) gains a new optional key, `openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void`. `ShopifyIntegrationsSlidePage` already receives `surfaceOpeners` via `useSurfaceProps()` (from Phase 2) — it threads `surfaceOpeners?.openShopActions` down to `ShopifyIntegrationDetailContainer` as a new `onOpenActions?: () => void` prop (wrapping the call with the currently-selected shop id), which the container forwards unchanged to `ShopifyIntegrationDetailHeader`'s existing `onOpenActions` prop (per Phase 4's own design). **The app (managers-app's Settings controller, which already assembles `surfaceOpeners` when it calls `surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, { surfaceOpeners: {...} })`) is the only place that actually calls `surface.open(SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID, props)`** — exactly the same pattern `HomeView.tsx` already uses for `TASK_POST_HANDLING_SLIDE_SURFACE_ID`'s nested `openTaskActions`.
3. **Only `shopIntegrationId` crosses the surface boundary — the sheet self-queries.** Matching every existing `XxxSurfaceProps` convention in this codebase (`TaskActionsSurfaceProps = { taskId, itemId? }`, not the whole task object) and Phase 4's own "self-contained query" precedent for the detail container, `ShopifyShopActionsSheetSurfaceProps = { shopIntegrationId: string }`. `ShopifyShopActionsSheetPage` calls `useGetShopifyShopQuery(shopIntegrationId)` itself to read the current `status`/`scopes_status`/`webhooks_status` for its visibility rules — never trusts stale data passed across the surface boundary.
4. **Reauthorize visibility uses `scopes_status` alone, not `status` as well — because the handoff defines them as the same condition.** The backend handoff states `scopes_status` is `"outdated"` precisely when `status` is `"scopes_outdated"`/`"needs_reauth"`, and explicitly instructs the frontend to prefer `scopes_status` for this decision. Checking `status` in addition would be redundant, not additive. **Visibility: `scopesStatus === "outdated"`** — shown for admin and manager (both have `canCreateShopifyReauthorizeUrl`), never as an always-on secondary action in v1 (per the intention document's own "prefer showing it only when there is a reason" guidance) — avoids a dead-feeling button with no explanation, the same reasoning Phase 4 already applied to its scopes-section warning.
5. **Sync-webhooks visibility: shown for admin whenever the shop is in an "active-ish" state, with a visual health cue when unhealthy — not hidden entirely when healthy.** Unlike reauthorize (a corrective action with no reason to exist when healthy), sync-webhooks is explicitly described by the handoff as *also* usable "as an admin maintenance action when the shop is active," so hiding it whenever `webhooks_status === "synced"` would remove a legitimate admin tool. **Visibility: admin only, and `shop.status` is not one of `"pending_install" | "disabled" | "uninstalled"`** (nothing to sync for a shop that was never connected or is already torn down) — shown regardless of `webhooks_status`, but the row shows a small warning badge/description when `webhooksStatus !== "synced"` to surface urgency without hiding the maintenance case.
6. **Disconnect visibility: admin only, hidden (not just disabled) for `status` already `"disabled"` or `"uninstalled"`.** Nothing to disconnect if it's already disconnected; hiding avoids a confusing no-op destructive button on an already-terminal shop.
7. **After a successful disconnect, close the sheet and let the already-open detail pane refetch — no forced cross-surface navigation back to list.** The intention document explicitly allows either "return to the list pane" or "update the detail state to show status disabled." Forcing the detail pane back to the list would require new cross-surface plumbing (the action sheet has no direct handle on the slide page's controller, only on its own `closeSurface`). Since disconnect's existing Phase 1 invalidation already covers both the list and the detail query, simply closing the sheet reveals the detail pane again, which refetches and renders the now-`"disabled"` status via the same `ShopifyIntegrationDetailContainer`/`StatePill` Phase 4 already built — no new navigation code needed, and the shop card is correctly *not* removed from the list (soft-disable, matching the handoff).
8. **List refresh after sync-webhooks happens at the calling layer, not inside Phase 1's hook.** Rather than editing `use-sync-shopify-webhooks-for-shop.ts` (which Phase 1 built and tested with a narrower, correct-for-its-scope invalidation contract), the action sheet's own success handling additionally calls `queryClient.invalidateQueries({ queryKey: shopifyKeys.shops() })` after a successful sync. This keeps Phase 1's hook's contract stable for any future caller while still refreshing the list cards' `webhooks_status` warning icon (Phase 2's `ShopifyIntegrationCard` reads `hasShopifyHealthWarning`).
9. **Notifications**: reauthorize shows no toast (immediate redirect makes one pointless — matches Phase 2's `submitShopDomain` precedent of no success toast before a redirect). Sync-webhooks shows `notify.success("Webhook sync started.")`. Disconnect shows `notify.success("Shopify integration disconnected.")`. All three show `notify.error(...)` on failure, matching the `notify.error` pattern already used in Phase 2's controller (`use-shopify-integrations-page.controller.ts`) and the reference `use-customer-coordination-email-inbox.controller.ts` pattern — no duplicate notification risk since none of Phase 1's three mutation hooks notify internally (confirmed above).

## Acceptance criteria

1. Tapping the (now-enabled) three-dot menu in the detail header opens a bottom sheet listing the three actions, each gated by `useShopifyIntegrationPermissions()` booleans per the visibility rules in Design decisions #4–#6 — never a raw `useRole()` call anywhere in this phase's new files.
2. Reauthorize calls `useCreateShopifyReauthorizeUrl().mutateAsync(shopIntegrationId)` and redirects via `window.location.assign(result.install_url)` on success; shows `notify.error` on failure; never asks for `shop_domain`; never exposes `redirect_after_success`.
3. Sync webhooks calls `useSyncShopifyWebhooksForShop().mutateAsync(shopIntegrationId)`, shows `notify.success("Webhook sync started.")` on success, and — in addition to that hook's own existing detail/history invalidation — invalidates `shopifyKeys.shops()` at the calling layer.
4. Disconnect uses `ConfirmActionButton` (two-tap confirm), calls `useDisconnectShopifyShop().mutateAsync(shopIntegrationId)`, shows `notify.success("Shopify integration disconnected.")` on success, and closes the action sheet — no forced navigation back to list.
5. Manager sees only the reauthorize action; admin sees all three (subject to the status-based visibility rules); worker/seller never reach this UI (already excluded upstream by the Settings entry and list-pane gating).
6. No new API route is wrapped, no workspace-wide sync action exists, no scope-status query/hook exists anywhere in this phase's diff.
7. The package never calls `openSurface`/`useSurface` directly — only `surface-ids.ts`'s `ShopifyIntegrationsSurfaceOpeners` gains the new optional `openShopActions` key, and only managers-app code calls `surface.open(SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID, ...)`.
8. This plan's Phase 4 facts have been fully verified against real, merged Phase 4 code (satisfied — see "Phase 4 review findings and confirmed facts").

## Contracts and skills

### Contracts loaded

- `05_server_state.md` — the new sheet's self-contained `useGetShopifyShopQuery` usage and the additional `shopifyKeys.shops()` invalidation at the calling layer.
- `07_components.md` — presentational structure of `ShopifyShopActionsSheetContent` (action rows receiving plain props/callbacks).
- `08_hooks.md` — mutation-hook consumption pattern (no new hook is created; existing Phase 1 hooks are consumed as-is).
- `10_pages.md` — `ShopifyShopActionsSheetPage`'s composition (reads `useSurfaceProps`, hides host sheet header if that's the established sheet convention, renders the content component).
- `13_errors.md` — `notify.error` on each mutation's failure path.
- `15_feature_structure.md` — new files land in existing `pages/`/`components/` folders; no new top-level folder.
- `16_feature_workflow.md` — confirms this phase's ordering (extend `surface-ids.ts` → new page/component → wire existing containers → app surface registration) is the correct next slice after Phase 4.
- `17_testing.md` — Vitest/Testing Library conventions for the new colocated tests.
- `19_permissions_local.md` — re-confirms permission-boolean consumption (not raw role checks) for action visibility.
- `20_notifications.md` — `notify.success`/`notify.error` conventions for the three mutation outcomes.
- `28_surfaces.md` + `28_surfaces_local.md` — `"sheet"` surface type registration, matching `CASE_TASK_INFO_SHEET_SURFACE_ID`'s precedent.
- `30_dynamic_loading.md` + `30_dynamic_loading_local.md` — `loadShopifyShopActionsSheetPage()` loader-function requirement for the new surface page.
- `35_shared_packages.md` — §13's `surfaceOpeners` injection pattern (Design decision #2) and §14's loader-function requirement; the authoritative rule this whole phase's architecture is built on.

### Local extensions loaded

- `28_surfaces_local.md`, `30_dynamic_loading_local.md`, `19_permissions_local.md` — as above.

### Explicitly excluded (with reason)

- `09_forms.md`, `06_client_state.md`, `23_providers.md`, `24_dto.md` — no form, no new client-state store, no provider, no new view-model layer; the sheet reads raw `ShopifyShopIntegration` fields directly (matching every prior phase's precedent).
- `27_responsive.md`, `32_loading_skeletons.md`, `36_scroll_visibility.md`, `37_keyboard_aware_inputs.md` — the action sheet is a short, non-scrolling list of 1–3 rows; no skeleton, no scroll-hide footer, no keyboard-adjacent input exists here.
- `14_styling.md` — no new `@source` entry needed (no new package dependency; `@beyo/shopify`'s `@source` line already exists in managers-app from Phase 3).
- `31_animations.md` — `ConfirmActionButton`'s own internal fill animation is already built and needs no new animation contract; the sheet's own open/close transition is the existing surface system's, not something this phase implements.
- `11_routing.md`, `01_architecture(_local).md`, `12_auth(_local).md` — no route, no app-shell change, no auth/session logic touched.

### File read intent — pattern vs. relational

Already-performed relational reads this draft relies on (reproduced concretely above, not to be re-read broadly): `packages/tasks/src/surface-ids.ts` (surface ID + `SurfaceOpeners`/`SurfaceProps` naming conventions, including `TaskActionsSurfaceProps`'s minimal-id-only shape), `packages/ui/src/components/primitives/confirm-action-button/ConfirmActionButton.tsx` (exact prop contract, reproduced above), `apps/managers-app/ManagerBeyo-app-managers/src/features/home/components/HomeView.tsx` (the exact pattern of an app controller assembling a nested `surfaceOpeners` map when opening a parent surface — this phase's managers-app change follows this same shape for the Settings controller's `openShopifyIntegrations()`), `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts` and `src/features/cases/surfaces.ts` (sheet-surface registration pattern), Phase 1's actual action-hook source (`use-create-shopify-reauthorize-url.ts`, `use-sync-shopify-webhooks-for-shop.ts`, `use-disconnect-shopify-shop.ts`) and `shopify-keys.ts` (confirmed invalidation behavior and key-prefix nesting, reproduced above). Phase 4's files are listed as **pending** relational reads — see the dependency checklist; they must be re-read against real merged code before approval, not assumed from this draft.

## Implementation plan

*(All Phase 4 symbol names below are unverified per "Phase 4 implementation dependencies to verify before approval" — reconcile against Phase 4's real merged code before executing.)*

1. **`packages/shopify/src/surface-ids.ts`** — extend:
   ```ts
   export const SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID = "shopify-shop-actions-sheet";

   export type ShopifyShopActionsSheetSurfaceProps = {
     shopIntegrationId: string;
   };

   export type ShopifyIntegrationsSurfaceOpeners = {
     closeSurface?: () => void;
     openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void;
   };
   ```
   (Adds one key to the existing type — Phase 2's `ShopifyIntegrationsSlideSurfaceProps` and everything consuming `ShopifyIntegrationsSurfaceOpeners` needs no other change, since all keys are optional.)

2. **`packages/shopify/src/components/ShopifyShopActionsSheetContent.tsx`** (new) — presentational:
   ```tsx
   type ShopifyShopActionsSheetContentProps = {
     shop: ShopifyShopIntegration;
     permissions: ReturnType<typeof useShopifyIntegrationPermissions>;
     onReauthorize: () => Promise<void>;
     isReauthorizing: boolean;
     onSyncWebhooks: () => Promise<void>;
     isSyncingWebhooks: boolean;
     onDisconnect: () => Promise<void>;
     isDisconnecting: boolean;
   };
   ```
   - Reauthorize row: rendered when `permissions.canCreateShopifyReauthorizeUrl && shop.scopes_status === "outdated"`. Plain button (not `ConfirmActionButton` — non-destructive), `disabled={isReauthorizing}`, calls `onReauthorize`.
   - Sync webhooks row: rendered when `permissions.canSyncShopifyWebhooksForShop && !["pending_install", "disabled", "uninstalled"].includes(shop.status)`. Plain button, `disabled={isSyncingWebhooks}`, calls `onSyncWebhooks`; shows a small warning note when `shop.webhooks_status !== "synced"`.
   - Disconnect row: rendered when `permissions.canDisconnectShopifyIntegration && !["disabled", "uninstalled"].includes(shop.status)`. `ConfirmActionButton` with `label="Disconnect"`, `confirmLabel="Tap again to disconnect"`, `onConfirm={onDisconnect}`, `disabled={isDisconnecting}`.
   - If none of the three rows would render (e.g. a manager viewing a shop with healthy scopes), show a calm "No actions are available for this shop right now." message rather than an empty sheet.

3. **`packages/shopify/src/pages/ShopifyShopActionsSheetPage.tsx`** (new):
   ```tsx
   export function ShopifyShopActionsSheetPage(): React.JSX.Element {
     const { shopIntegrationId } = useSurfaceProps<ShopifyShopActionsSheetSurfaceProps>();
     const query = useGetShopifyShopQuery(shopIntegrationId);
     const queryClient = useQueryClient();
     const reauthorize = useCreateShopifyReauthorizeUrl();
     const syncWebhooks = useSyncShopifyWebhooksForShop();
     const disconnect = useDisconnectShopifyShop();
     const permissions = useShopifyIntegrationPermissions();
     const header = useSurfaceHeader(); // if sheets hide their host header per existing sheet convention — verify against an existing sheet page during implementation

     async function handleReauthorize(): Promise<void> {
       try {
         const result = await reauthorize.mutateAsync(shopIntegrationId);
         window.location.assign(result.install_url);
       } catch (error) {
         notify.error(error instanceof Error ? error.message : "Could not start reauthorization.");
       }
     }

     async function handleSyncWebhooks(): Promise<void> {
       try {
         await syncWebhooks.mutateAsync(shopIntegrationId);
         void queryClient.invalidateQueries({ queryKey: shopifyKeys.shops() });
         notify.success("Webhook sync started.");
       } catch (error) {
         notify.error(error instanceof Error ? error.message : "Could not start webhook sync.");
       }
     }

     async function handleDisconnect(): Promise<void> {
       try {
         await disconnect.mutateAsync(shopIntegrationId);
         notify.success("Shopify integration disconnected.");
         header?.requestClose(); // or the sheet's own close mechanism — verify against existing sheet-page convention
       } catch (error) {
         notify.error(error instanceof Error ? error.message : "Could not disconnect this shop.");
       }
     }

     // loading / error / missing states omitted here for brevity — mirror the detail container's own conventions

     return (
       <ShopifyShopActionsSheetContent
         shop={query.data.shop_integration}
         permissions={permissions}
         onReauthorize={handleReauthorize}
         isReauthorizing={reauthorize.isPending}
         onSyncWebhooks={handleSyncWebhooks}
         isSyncingWebhooks={syncWebhooks.isPending}
         onDisconnect={handleDisconnect}
         isDisconnecting={disconnect.isPending}
       />
     );
   }
   ```
   Exact host-sheet-header-hiding mechanism (`useSurfaceHeader()?.requestClose()` vs. some other sheet-specific close API) must be verified against an existing sheet page (e.g. `CASE_TASK_INFO_SHEET_SURFACE_ID`'s page component) during implementation, not assumed from this draft — sheets may not hide their header the same way slides do.

4. **`packages/shopify/src/index.ts`** — add:
   ```ts
   export function loadShopifyShopActionsSheetPage() {
     return import("./pages/ShopifyShopActionsSheetPage").then((module) => ({
       default: module.ShopifyShopActionsSheetPage,
     }));
   }
   ```
   Plus static exports for `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` and `ShopifyShopActionsSheetSurfaceProps`.

5. **`packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`** — thread the new opener down:
   ```tsx
   detailPane={
     <ShopifyIntegrationDetailContainer
       selectedShopIntegrationId={controller.selectedShopIntegrationId}
       onBack={controller.goBackToList}
       onOpenActions={
         controller.selectedShopIntegrationId
           ? () =>
               props.surfaceOpeners?.openShopActions?.({
                 shopIntegrationId: controller.selectedShopIntegrationId!,
               })
           : undefined
       }
     />
   }
   ```

6. **`packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`** — accept and forward one new optional prop, `onOpenActions?: () => void`, straight through to `ShopifyIntegrationDetailHeader`'s existing `onOpenActions` prop (confirmed exact name via direct source read — see "Phase 4 review findings and confirmed facts").

7. **Managers-app**: `src/features/shopify-integrations/surfaces.ts` — register the new sheet alongside the existing slide:
   ```ts
   const shopifyShopActionsSheet = lazyWithPreload(loadShopifyShopActionsSheetPage);

   export const shopifyIntegrationsSurfaces: SurfaceRegistrations = {
     [SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID]: { surface: "slide", component: shopifyIntegrationsSlide.Component },
     [SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID]: { surface: "sheet", component: shopifyShopActionsSheet.Component },
   };
   ```
   `src/app/surface-registry.ts` needs no change (already spreads `shopifyIntegrationsSurfaces`). `src/features/settings/controllers/use-settings-view.controller.ts`'s `openShopifyIntegrations()` gains the new nested opener, matching `HomeView.tsx`'s exact pattern for a parent surface's `surfaceOpeners`:
   ```ts
   function openShopifyIntegrations(): void {
     surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, {
       surfaceOpeners: {
         closeSurface: () => surface.close(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID),
         openShopActions: (props) => surface.open(SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID, props),
       },
     });
   }
   ```
   No route, no new Settings UI row, no `.env` change.

8. **Tests** (colocated Vitest + Testing Library):
   - `ShopifyShopActionsSheetContent.test.tsx` — admin sees all three rows (given an unhealthy shop); manager sees only reauthorize; healthy/active shop hides reauthorize for both roles; already-`disabled` shop hides disconnect and sync for admin; empty-state message when no rows apply.
   - `ShopifyShopActionsSheetPage.test.tsx` (or split per handler) — reauthorize success redirects via `window.location.assign`; sync-webhooks success calls `notify.success` and invalidates `shopifyKeys.shops()` (in addition to whatever Phase 1's hook itself invalidates); disconnect success calls `notify.success` and closes the sheet; each failure path calls `notify.error` and does not redirect/close.
   - A quick assertion that no test or source file in this phase references a workspace-wide-sync or scope-status hook/route.

## Risks and mitigations

- Risk: sheets in this codebase hide their host header differently than slides (e.g. a dedicated close button in the corner instead of `useSurfaceHeader()?.requestClose()`), making step 3's disconnect-close logic wrong as drafted.
  Mitigation: explicitly flagged inline in step 3 as something to verify against an existing sheet page (e.g. `CASE_TASK_INFO_SHEET_SURFACE_ID`'s component) during implementation, not assumed.
- Risk: the "active-ish" status list for sync-webhooks visibility (`!["pending_install","disabled","uninstalled"].includes(status)`) inadvertently also shows the action for `status === "error"`, which may or may not make sense to re-sync from.
  Mitigation: leave `"error"` eligible for sync in this phase (an admin may reasonably want to retry syncing a shop in an error state) — call this out explicitly during implementation review rather than silently deciding either way without a record.

## Validation plan

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
```

- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyShopActionsSheetContent.test.tsx packages/shopify/src/pages/ShopifyShopActionsSheetPage.test.tsx`: all pass.
- Re-run the full existing Shopify Vitest suite to confirm the `onOpenActions` prop-threading introduced no regression: `npx vitest run --environment jsdom packages/shopify/src`.
- No Playwright run required yet (full runtime validation is Phase 7's job); a manual smoke check (open Settings → Shopify → a shop → the now-enabled three-dot menu) is recommended, noting managers-app's local Vitest environment issue (rolldown native binding, from the Phase 3 review) is a separate, still-open item unrelated to this phase's own validation (which relies on package-level Vitest + root typecheck, both of which work).

## Phase 5 approval policy

Satisfied: Phase 4 was implemented, reviewed (reading the real merged code directly, re-running `npm run typecheck` and the full Shopify Vitest suite independently), and archived — verdict approved, no critical issues. Every Phase 4 fact this plan depends on was confirmed against the real code, with zero discrepancies requiring a correction to the Implementation plan section above. No Phase 6 (webhook subscriptions/history) scope is present. The only managers-app changes are surface registration (`shopify-integrations/surfaces.ts`) and the Settings controller's opener wiring — no route, no new Settings UI, no `.env` change.

## Review log

- `2026-07-10` Claude: Phase 5 draft plan prepared while Phase 4 is pending implementation. All Phase 4 symbol names provisional, listed in a dedicated verification checklist. Architecture decision made now (not deferred): the action sheet is a package-owned, app-registered `"sheet"` surface following the existing `TASK_ACTIONS_SHEET_SURFACE_ID`/`CASE_TASK_INFO_SHEET_SURFACE_ID` precedent, opened via a `surfaceOpeners.openShopActions` injection per `35_shared_packages.md` §13 — the package never calls `openSurface` itself. Confirmed from direct Phase 1 source re-reading that disconnect's existing invalidation already covers shop detail via `shopifyKeys.shops()`'s key-prefix nesting, and that sync-webhooks' existing invalidation deliberately excludes the list (addressed at the calling layer, not by editing Phase 1's hook). Plan intentionally left `under_construction`.
- `2026-07-10` Claude: Reviewed the completed, archived Phase 4 implementation directly against source (all six new components, the container/header prop shapes, the status/formatter helpers, `index.ts`'s export list) — also discovered and resolved an unrelated environment issue (`node_modules`/`package-lock.json` both missing; restored via `npm install`) before independently re-running `npm run typecheck` (zero errors) and the full Shopify Vitest suite (19 files, 37 tests, all pass). Every assumption this plan made about Phase 4's exports/prop names/behavior was confirmed correct — no Implementation plan code required correction, only the dependency checklist was replaced with confirmed facts. Promoted status to `approved`.
- `2026-07-08` Codex: Implemented Phase 5 only. Added the package-owned `ShopifyShopActionsSheetPage` and `ShopifyShopActionsSheetContent`, introduced `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID`/`ShopifyShopActionsSheetSurfaceProps`/`loadShopifyShopActionsSheetPage`, threaded `openShopActions` from managers-app Settings into `ShopifyIntegrationsSlidePage` and the detail header, and registered the new sheet surface in managers-app. Validated with `npm run typecheck`, `npx vitest run --environment jsdom packages/shopify/src` (`21` files, `48` tests, all pass), and `npx vitest run src/features/settings/controllers/use-settings-view.controller.test.tsx` from `apps/managers-app/ManagerBeyo-app-managers` (`2` tests, pass). No backend files, `.env` files, or Phase 6+ scope were modified.

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `Codex`
