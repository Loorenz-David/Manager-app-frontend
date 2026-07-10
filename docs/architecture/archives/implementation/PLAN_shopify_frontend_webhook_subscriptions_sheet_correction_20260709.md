# PLAN_shopify_frontend_webhook_subscriptions_sheet_correction_20260709

## Metadata

- Plan ID: `PLAN_shopify_frontend_webhook_subscriptions_sheet_correction_20260709`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-09T12:00:00Z`
- Last updated at (UTC): `2026-07-09T08:40:53Z`
- Related issue/ticket: none provided
- Type: **Correction plan** — a targeted UI correction to already-implemented, archived work (Phase 4's `ShopifyWebhookSubscriptionSummaryPreview` and Phase 6's decision to keep it inline). Not part of the original 7-phase master sequence's numbering; the master plan (`PLAN_shopify_frontend_master_20260710.md`) is complete and is not reopened or re-numbered by this plan.
- Master plan (context only, not modified): `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md`.
- Prior plans this corrects: `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_detail_view_20260710.md` (Phase 4 — built the current inline preview), `docs/architecture/archives/implementation/PLAN_shopify_frontend_webhook_subscriptions_history_20260710.md` (Phase 6 — explicitly decided to keep it inline; that decision is reversed here at the user's explicit request).
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

## Reversal of an earlier documented decision (stated plainly, not silently overwritten)

Phase 6's plan contained a "Subscriptions UI decision" section that explicitly chose to keep `ShopifyWebhookSubscriptionSummaryPreview` as an inline capped list (topic/status/installed_at/last_error_code, first 5, "+N more") rather than promoting it to a sheet, reasoning that the existing inline list already satisfied v1 and that adding a sheet would be an unwarranted layout redesign. **The user has now explicitly asked for the opposite**, and this plan implements that correctly. This is a legitimate, explicit correction — the earlier reasoning wasn't wrong given what was known then (no user request for a sheet existed yet), but the user's current, explicit instruction supersedes it. Recorded here for the project's history, not to relitigate.

## Goal and intent

- Goal: Turn `ShopifyWebhookSubscriptionSummaryPreview` into a pure trigger (2×3 totals grid only), and add a new package-owned bottom-sheet surface that shows the full webhook subscription list when that trigger is tapped.
- Business/user intent: A cleaner detail pane (the per-subscription list currently crowds the page below the totals) with the detail available on demand, matching the intention document's original vision of a "webhook subscription preview trigger" that "opens a bottom-sheet page that lists webhook subscriptions."
- Non-goals: any change to webhook history (Phase 6, untouched), any action-sheet change (Phase 5, untouched), any backend change, any new query (the sheet reuses the exact same already-fetched detail data shape).

## Scope

- In scope: simplifying `ShopifyWebhookSubscriptionSummaryPreview.tsx` to grid-only + tap trigger; a new `ShopifyWebhookSubscriptionsSheetPage.tsx` + `ShopifyWebhookSubscriptionsSheetContent.tsx`; `surface-ids.ts` extension (new surface ID, props type, `ShopifyIntegrationsSurfaceOpeners` key); threading the new opener through `ShopifyIntegrationsSlidePage.tsx` → `ShopifyIntegrationDetailContainer.tsx` → the trigger (mirroring Phase 5's `onOpenActions` wiring exactly); managers-app surface registration + Settings-controller opener wiring; focused tests.
- Out of scope: webhook history UI, action sheet UI, any backend/`.env` change, any new API route or query hook (the sheet self-queries via the already-existing `useGetShopifyShopQuery`).
- Assumptions: none requiring verification — every file this plan touches is already implemented, stable, and was re-read directly during this plan's drafting (not assumed from an earlier summary).

## Current state (verified by direct re-read during this plan's drafting)

- `packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.tsx` currently renders, inside one `ContentCard`: a "Webhook subscriptions" heading, a `grid-cols-2` grid of 6 `SummaryCount` items (total/active/failed/pending/disabled/removed — this **is** the "2 by 3 grid" the user described, and needs no change), and — the part being removed — a capped list (`PREVIEW_LIMIT = 5`) of individual subscription rows (`topic`, `StatePill` via `shopifyWebhookSubscriptionStatusVariant`/`Label`, formatted `installed_at`, `last_error_code` when present) with a "+N more" note.
- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx` renders `<ShopifyWebhookSubscriptionSummaryPreview subscriptions={webhook_subscriptions} summary={webhook_subscription_summary} />` as the 4th child in its populated-content wrapper, immediately before `ShopifyWebhookHistorySection` (5th/last child) — this ordering is unaffected by this plan.
- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx` already computes and threads one analogous opener (`onOpenActions`, sourced from `props.surfaceOpeners?.openShopActions`) into `ShopifyIntegrationDetailContainer` — this plan adds a second, structurally identical one (`onOpenSubscriptions`, sourced from `props.surfaceOpeners?.openWebhookSubscriptions`).
- `packages/shopify/src/surface-ids.ts` currently exports `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID`, `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID`, `ShopifyShopActionsSheetSurfaceProps`, and `ShopifyIntegrationsSurfaceOpeners = { closeSurface?, openShopActions? }` — this plan adds one more surface ID, one more props type, and one more optional key to that same openers type.
- `packages/shopify/src/pages/ShopifyShopActionsSheetPage.tsx` is the exact template this plan's new sheet page mirrors: self-contained (`useSurfaceProps` → `shopIntegrationId` → `useGetShopifyShopQuery(shopIntegrationId)`), with missing/loading/error-retry states, rendering a presentational `*Content` component once data resolves.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/shopify-integrations/surfaces.ts` currently registers two surfaces (`SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` as `"slide"`, `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` as `"sheet"`) via `lazyWithPreload`; this plan adds a third, identically structured entry.
- `apps/managers-app/.../src/features/settings/controllers/use-settings-view.controller.ts`'s `openShopifyIntegrations()` already assembles a nested `surfaceOpeners` object (`closeSurface`, `openShopActions`) when calling `surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, {...})` — this plan adds one more key to that same object.

## Design decisions (grounded in `35_shared_packages.md`, per the explicit instruction to use it)

1. **The package never calls `openSurface`/`useSurface` directly (§13).** `ShopifyWebhookSubscriptionSummaryPreview` cannot open its own sheet. It receives an optional `onOpenSubscriptions?: () => void` prop and calls that — exactly the same shape as `ShopifyIntegrationDetailHeader`'s existing `onOpenActions?: () => void` prop, which already proved this pattern correctly in Phase 5.
2. **`surface-ids.ts` gains one new grouped-opener key, not a new standalone prop (§13's explicit anti-pattern warning: "Separate prop per opener does not scale").** `ShopifyIntegrationsSurfaceOpeners` becomes:
   ```ts
   export type ShopifyIntegrationsSurfaceOpeners = {
     closeSurface?: () => void;
     openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void;
     openWebhookSubscriptions?: (props: ShopifyWebhookSubscriptionsSheetSurfaceProps) => void;
   };
   ```
   All keys remain optional — nothing that already consumes this type needs to change.
3. **Only `shopIntegrationId` crosses the surface boundary (§13's established convention across every existing `XxxSurfaceProps` in this codebase, and matching `ShopifyShopActionsSheetSurfaceProps`'s exact precedent).** `ShopifyWebhookSubscriptionsSheetSurfaceProps = { shopIntegrationId: string }` — the sheet re-fetches via `useGetShopifyShopQuery`, never trusts stale summary/subscription data passed across the boundary. This also matches the intention document's own original instruction that this component "should own its own query flow using the selected shop_integration_id."
4. **The new sheet page is exposed via a loader function, never a static re-export (§14).**
   ```ts
   export function loadShopifyWebhookSubscriptionsSheetPage() {
     return import("./pages/ShopifyWebhookSubscriptionsSheetPage").then((module) => ({
       default: module.ShopifyWebhookSubscriptionsSheetPage,
     }));
   }
   ```
   exactly mirroring `loadShopifyShopActionsSheetPage`'s existing pattern.
5. **Managers-app is the only place that calls `surface.open(...)` for this new sheet (§13's ownership table).** The Settings controller's `openShopifyIntegrations()` gains one more nested opener, assembled the same way `openShopActions` already is.
6. **The per-subscription row markup moves, it isn't duplicated.** The exact JSX currently inside `ShopifyWebhookSubscriptionSummaryPreview` for one subscription row (topic, status pill, installed date, error) is relocated verbatim into the new `ShopifyWebhookSubscriptionsSheetContent`, with the 5-item cap and "+N more" note removed (a dedicated sheet has no reason to truncate — the backend returns the full, already-fetched `webhook_subscriptions` array with no separate pagination for this list).
7. **The simplified trigger stays visually consistent with the existing Settings-row/detail-header "tappable card" idiom** — a `<button>` wrapping the `ContentCard`, with a `ChevronRight` affordance signaling tappability, `disabled={!onOpenSubscriptions}` matching the same disabled-not-hidden convention already used for the three-dot menu button in `ShopifyIntegrationDetailHeader`.

## Acceptance criteria

1. `ShopifyWebhookSubscriptionSummaryPreview` renders only the "Webhook subscriptions" heading, the unchanged 2-column/3-row `SummaryCount` grid, and a `ChevronRight` affordance — no per-subscription row, no "+N more" note, anywhere in this component.
2. Tapping the trigger calls the injected `onOpenSubscriptions` callback; the trigger is `disabled` (not hidden) when that callback is absent.
3. `ShopifyWebhookSubscriptionsSheetPage` self-queries `useGetShopifyShopQuery(shopIntegrationId)` from `useSurfaceProps`, and renders missing/loading/error-retry/populated states, matching `ShopifyShopActionsSheetPage`'s established shape.
4. `ShopifyWebhookSubscriptionsSheetContent` renders the summary grid again (for context) plus the full, uncapped list of subscriptions (topic, status pill, installed_at, last_error_code) — the exact fields the old inline list showed, just without the cap.
5. The package never imports `useSurface`/`openSurface` anywhere in this plan's new/changed files; only `surface-ids.ts`'s `ShopifyIntegrationsSurfaceOpeners` gains the new `openWebhookSubscriptions` key, and only managers-app code calls `surface.open(SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID, ...)`.
6. `packages/shopify/src/index.ts` exports the new surface ID, props type, content component, and `loadShopifyWebhookSubscriptionsSheetPage` loader — no static re-export of the page component itself.
7. `npm run typecheck` passes with zero errors; the full package Vitest sweep (`npx vitest run --environment jsdom packages/shopify/src`) passes with zero failures.

## Contracts and skills

### Contracts loaded

- `35_shared_packages.md` — the authoritative contract for this entire plan, per the explicit instruction to use it. §13 (surfaceOpeners injection pattern, package/app boundary) and §14 (loader-function requirement for surface pages) are the two sections this plan's architecture is built directly on; §8 (directory structure) and §11 (naming/export conventions) confirm the new files' naming and export shape.
- `28_surfaces.md` + `28_surfaces_local.md` — confirms `"sheet"` is the correct surface type (matching the existing action-sheet registration), not `"slide"` or `"modal"`.
- `30_dynamic_loading.md` + `30_dynamic_loading_local.md` — confirms the loader-function mechanics (`lazyWithPreload(loadXxxPage)`) the managers-app registration uses.
- `07_components.md` — presentational structure of the simplified trigger and the new sheet content component.
- `17_testing.md` — Vitest conventions for the new/updated colocated tests.

### Explicitly excluded (with reason)

- `05_server_state.md`, `08_hooks.md` — no new query/hook is introduced; the sheet reuses `useGetShopifyShopQuery` exactly as `ShopifyIntegrationDetailContainer` already does.
- `19_permissions(_local).md`, `20_notifications.md` — no new role gate, no mutation; viewing subscriptions is already implicitly gated by reaching the detail pane at all.
- `14_styling.md` — no new `@source` entry needed (no new package dependency).

### File read intent — pattern vs. relational

This plan's design is grounded entirely in direct re-reads of already-implemented files, performed during drafting (not assumed from memory of earlier phases): `ShopifyWebhookSubscriptionSummaryPreview.tsx`, `ShopifyIntegrationDetailContainer.tsx`, `ShopifyIntegrationsSlidePage.tsx`, `surface-ids.ts`, `ShopifyShopActionsSheetPage.tsx` (the direct template for the new sheet page), `index.ts`, and the managers-app `shopify-integrations/surfaces.ts` + `use-settings-view.controller.ts`. No new "how to write" reading is needed beyond `35_shared_packages.md` itself.

## Implementation plan

1. **`packages/shopify/src/surface-ids.ts`** — extend:
   ```ts
   export const SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID =
     "shopify-webhook-subscriptions-sheet";

   export type ShopifyWebhookSubscriptionsSheetSurfaceProps = {
     shopIntegrationId: string;
   };

   export type ShopifyIntegrationsSurfaceOpeners = {
     closeSurface?: () => void;
     openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void;
     openWebhookSubscriptions?: (
       props: ShopifyWebhookSubscriptionsSheetSurfaceProps,
     ) => void;
   };
   ```

2. **`packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.tsx`** — simplify to a pure trigger:
   ```tsx
   import { ContentCard } from "@beyo/ui";
   import { ChevronRight } from "lucide-react";

   import type { ShopifyWebhookSubscriptionSummary } from "../types";

   export type ShopifyWebhookSubscriptionSummaryPreviewProps = {
     summary: ShopifyWebhookSubscriptionSummary;
     onOpenSubscriptions?: () => void;
   };

   function SummaryCount({ label, value }: { label: string; value: number }): React.JSX.Element {
     return (
       <div className="rounded-xl bg-muted px-3 py-2">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
       </div>
     );
   }

   export function ShopifyWebhookSubscriptionSummaryPreview({
     summary,
     onOpenSubscriptions,
   }: ShopifyWebhookSubscriptionSummaryPreviewProps): React.JSX.Element {
     return (
       <button
         type="button"
         className="w-full text-left disabled:opacity-60"
         disabled={!onOpenSubscriptions}
         data-testid="shopify-webhook-subscriptions-trigger"
         onClick={onOpenSubscriptions}
       >
         <ContentCard data-testid="shopify-webhook-summary-preview">
           <div className="flex items-center justify-between gap-3">
             <h3 className="text-sm font-semibold text-foreground">Webhook subscriptions</h3>
             <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
           </div>
           <div className="grid grid-cols-2 gap-2">
             <SummaryCount label="Total" value={summary.total} />
             <SummaryCount label="Active" value={summary.active} />
             <SummaryCount label="Failed" value={summary.failed} />
             <SummaryCount label="Pending" value={summary.pending} />
             <SummaryCount label="Disabled" value={summary.disabled} />
             <SummaryCount label="Removed" value={summary.removed} />
           </div>
         </ContentCard>
       </button>
     );
   }
   ```
   Note: the `subscriptions` prop is **removed** from this component's public props — it no longer needs the array, only `summary`. This is a breaking prop-signature change to an internal package component; update its one call site (step 6) accordingly.

3. **`packages/shopify/src/components/ShopifyWebhookSubscriptionsSheetContent.tsx`** (new) — the relocated per-subscription list, uncapped:
   ```tsx
   import { ContentCard, StatePill } from "@beyo/ui";

   import { formatShopifyDetailDate } from "../lib/shopify-formatters";
   import {
     shopifyWebhookSubscriptionStatusLabel,
     shopifyWebhookSubscriptionStatusVariant,
   } from "../lib/shopify-status";
   import type {
     ShopifyWebhookSubscription,
     ShopifyWebhookSubscriptionSummary,
   } from "../types";

   export type ShopifyWebhookSubscriptionsSheetContentProps = {
     summary: ShopifyWebhookSubscriptionSummary;
     subscriptions: ShopifyWebhookSubscription[];
   };

   function SummaryCount({ label, value }: { label: string; value: number }): React.JSX.Element {
     return (
       <div className="rounded-xl bg-muted px-3 py-2">
         <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
         <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
       </div>
     );
   }

   export function ShopifyWebhookSubscriptionsSheetContent({
     summary,
     subscriptions,
   }: ShopifyWebhookSubscriptionsSheetContentProps): React.JSX.Element {
     return (
       <div className="flex flex-col gap-4 px-4 pb-6 pt-4" data-testid="shopify-webhook-subscriptions-sheet">
         <ContentCard>
           <div className="grid grid-cols-2 gap-2">
             <SummaryCount label="Total" value={summary.total} />
             <SummaryCount label="Active" value={summary.active} />
             <SummaryCount label="Failed" value={summary.failed} />
             <SummaryCount label="Pending" value={summary.pending} />
             <SummaryCount label="Disabled" value={summary.disabled} />
             <SummaryCount label="Removed" value={summary.removed} />
           </div>
         </ContentCard>

         {subscriptions.length === 0 ? (
           <ContentCard>
             <p className="text-sm text-muted-foreground">No webhook subscriptions yet.</p>
           </ContentCard>
         ) : (
           <div className="flex flex-col gap-2">
             {subscriptions.map((subscription) => (
               <div
                 key={subscription.client_id}
                 className="rounded-xl border border-border bg-card px-3 py-3"
                 data-testid="shopify-webhook-subscription-item"
               >
                 <div className="flex items-start justify-between gap-3">
                   <div className="min-w-0 flex-1">
                     <p className="truncate text-sm font-medium text-foreground">{subscription.topic}</p>
                     <p className="mt-1 text-xs text-muted-foreground">
                       Installed {formatShopifyDetailDate(subscription.installed_at)}
                     </p>
                     {subscription.last_error_code ? (
                       <p className="mt-1 text-xs text-[#8a5a00]">Error: {subscription.last_error_code}</p>
                     ) : null}
                   </div>
                   <StatePill
                     label={shopifyWebhookSubscriptionStatusLabel(subscription.status)}
                     variant={shopifyWebhookSubscriptionStatusVariant(subscription.status)}
                   />
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>
     );
   }
   ```

4. **`packages/shopify/src/pages/ShopifyWebhookSubscriptionsSheetPage.tsx`** (new) — mirrors `ShopifyShopActionsSheetPage.tsx` exactly:
   ```tsx
   import { ContentCard } from "@beyo/ui";
   import { useSurfaceProps } from "@beyo/hooks";

   import { useGetShopifyShopQuery } from "../api/use-get-shopify-shop-query";
   import { ShopifyWebhookSubscriptionsSheetContent } from "../components/ShopifyWebhookSubscriptionsSheetContent";
   import type { ShopifyWebhookSubscriptionsSheetSurfaceProps } from "../surface-ids";

   export function ShopifyWebhookSubscriptionsSheetPage(): React.JSX.Element {
     const props = useSurfaceProps<ShopifyWebhookSubscriptionsSheetSurfaceProps>();
     const shopIntegrationId = props.shopIntegrationId ?? null;
     const query = useGetShopifyShopQuery(shopIntegrationId);

     if (!shopIntegrationId) {
       return (
         <div className="px-4 pb-6 pt-4">
           <ContentCard>
             <p className="text-sm text-muted-foreground">
               Webhook subscriptions could not be opened because the shop id is missing.
             </p>
           </ContentCard>
         </div>
       );
     }

     if (query.isPending) {
       return (
         <div className="flex flex-col gap-3 px-4 pb-6 pt-4">
           <div className="h-20 animate-pulse rounded-xl bg-muted" />
           <div className="h-20 animate-pulse rounded-xl bg-muted" />
           <div className="h-20 animate-pulse rounded-xl bg-muted" />
         </div>
       );
     }

     if (query.isError || !query.data) {
       return (
         <div className="px-4 pb-6 pt-4">
           <ContentCard>
             <div className="flex flex-col gap-3">
               <p className="text-sm text-muted-foreground">Webhook subscriptions could not be loaded.</p>
               <button
                 className="w-fit rounded-full border border-border px-4 py-2 text-sm font-medium"
                 type="button"
                 onClick={() => void query.refetch()}
               >
                 Try again
               </button>
             </div>
           </ContentCard>
         </div>
       );
     }

     return (
       <ShopifyWebhookSubscriptionsSheetContent
         summary={query.data.webhook_subscription_summary}
         subscriptions={query.data.webhook_subscriptions}
       />
     );
   }
   ```

5. **`packages/shopify/src/index.ts`** — add:
   ```ts
   export { ShopifyWebhookSubscriptionsSheetContent } from "./components/ShopifyWebhookSubscriptionsSheetContent";
   export {
     SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID,
   } from "./surface-ids"; // add to the existing surface-ids export block
   export type {
     ShopifyWebhookSubscriptionsSheetSurfaceProps,
   } from "./surface-ids"; // add to the existing surface-ids type export block

   export function loadShopifyWebhookSubscriptionsSheetPage() {
     return import("./pages/ShopifyWebhookSubscriptionsSheetPage").then((module) => ({
       default: module.ShopifyWebhookSubscriptionsSheetPage,
     }));
   }
   ```

6. **`packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`** — two changes:
   - Add prop `onOpenSubscriptions?: () => void` to `ShopifyIntegrationDetailContainerProps`.
   - Update the call site: `<ShopifyWebhookSubscriptionSummaryPreview summary={webhook_subscription_summary} onOpenSubscriptions={onOpenSubscriptions} />` (drop the now-removed `subscriptions` prop).

7. **`packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`** — add a second computed opener, structurally identical to the existing `onOpenActions`:
   ```tsx
   const onOpenSubscriptions =
     selectedShopIntegrationId && props.surfaceOpeners?.openWebhookSubscriptions
       ? () => {
           props.surfaceOpeners?.openWebhookSubscriptions?.({
             shopIntegrationId: selectedShopIntegrationId,
           });
         }
       : undefined;
   ```
   and pass `onOpenSubscriptions={onOpenSubscriptions}` to `ShopifyIntegrationDetailContainer`.

8. **Managers-app — `src/features/shopify-integrations/surfaces.ts`** — register the third surface:
   ```ts
   import {
     loadShopifyIntegrationsSlidePage,
     loadShopifyShopActionsSheetPage,
     loadShopifyWebhookSubscriptionsSheetPage,
     SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID,
     SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID,
     SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID,
   } from "@beyo/shopify";
   import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

   const shopifyIntegrationsSlide = lazyWithPreload(loadShopifyIntegrationsSlidePage);
   const shopifyShopActionsSheet = lazyWithPreload(loadShopifyShopActionsSheetPage);
   const shopifyWebhookSubscriptionsSheet = lazyWithPreload(loadShopifyWebhookSubscriptionsSheetPage);

   export const shopifyIntegrationsSurfaces: SurfaceRegistrations = {
     [SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID]: { surface: "slide", component: shopifyIntegrationsSlide.Component },
     [SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID]: { surface: "sheet", component: shopifyShopActionsSheet.Component },
     [SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID]: {
       surface: "sheet",
       component: shopifyWebhookSubscriptionsSheet.Component,
     },
   };
   ```

9. **Managers-app — `src/features/settings/controllers/use-settings-view.controller.ts`** — add the nested opener:
   ```ts
   import {
     SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID,
     SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID,
     SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID,
     type ShopifyShopActionsSheetSurfaceProps,
     type ShopifyWebhookSubscriptionsSheetSurfaceProps,
     useShopifyIntegrationPermissions,
   } from "@beyo/shopify";
   // ...
   function openShopifyIntegrations() {
     surface.open(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID, {
       surfaceOpeners: {
         closeSurface: () => surface.close(SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID),
         openShopActions: (props: ShopifyShopActionsSheetSurfaceProps) =>
           surface.open(SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID, props),
         openWebhookSubscriptions: (props: ShopifyWebhookSubscriptionsSheetSurfaceProps) =>
           surface.open(SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID, props),
       },
     });
   }
   ```
   No route, no new Settings UI row, no `.env` change.

10. **Tests** (colocated Vitest + Testing Library, updating existing files where the component under test changed):
    - `ShopifyWebhookSubscriptionSummaryPreview.test.tsx` — update: renders only the grid + heading + chevron; no subscription row/`"+N more"` text anywhere; tapping calls `onOpenSubscriptions`; `disabled` when the prop is absent.
    - `ShopifyWebhookSubscriptionsSheetContent.test.tsx` (new) — renders the grid + full uncapped subscription list; empty-subscriptions state; each row's fields (topic/status/installed_at/error).
    - `ShopifyWebhookSubscriptionsSheetPage.test.tsx` (new) — missing id, loading, error-retry, populated states, mirroring `ShopifyShopActionsSheetPage.test.tsx`'s exact structure.
    - `ShopifyIntegrationDetailContainer.test.tsx` — add a test forwarding `onOpenSubscriptions` to the trigger (mirroring the existing "forwards the detail actions callback to the header button" test); update the existing populated-state test's call site for the preview's changed props.
    - `ShopifyIntegrationsSlidePage.test.tsx` — add a test opening the subscriptions sheet via the injected `openWebhookSubscriptions` opener (mirroring the existing "opens the Shopify actions sheet..." test exactly).
    - `apps/managers-app/.../use-settings-view.controller.test.tsx` — extend the existing assertion to also check `openArgs.surfaceOpeners.openWebhookSubscriptions({...})` calls `surface.open(SHOPIFY_WEBHOOK_SUBSCRIPTIONS_SHEET_SURFACE_ID, {...})`, mirroring the existing `openShopActions` assertion.
    - `index.test.ts` — add the new exports to the smoke-test list.

## Risks and mitigations

- Risk: removing the `subscriptions` prop from `ShopifyWebhookSubscriptionSummaryPreview` is a breaking change to that component's public signature.
  Mitigation: it's an internal package component with exactly one call site (`ShopifyIntegrationDetailContainer.tsx`), updated in the same plan (step 6) — no other file references it.
- Risk: forgetting to update the managers-app settings-controller test after adding the new opener leaves a gap matching the exact pattern already caught and corrected once before in this project (Phase 5's `openShopActions` addition to that same test).
  Mitigation: step 10 explicitly includes this test update, learning directly from that precedent.

## Validation plan

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
npx vitest run --environment jsdom packages/shopify/src
```
Expected: zero typecheck errors; zero Vitest failures across the full package sweep (all new + updated tests included).

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers
npx vitest run src/features/settings/controllers/use-settings-view.controller.test.tsx
```
Expected: pass, including the new `openWebhookSubscriptions` assertion.

No backend/`.env` change; no Playwright required for this scoped correction.

## Review log

- `2026-07-09` Claude: Correction plan drafted at the user's explicit request, reversing Phase 6's earlier "keep it inline" decision. Architecture grounded directly in `35_shared_packages.md` §13/§14 and the already-proven `openShopActions`/`ShopifyShopActionsSheetPage` pattern from Phase 5 — no new pattern invented. No blockers; approved directly.
- `2026-07-09` Codex: Implemented the correction by converting the inline summary preview into a trigger, adding the package-owned webhook subscriptions sheet surface/content/page, registering the new sheet in managers-app, and threading `openWebhookSubscriptions` through the settings controller and slide/detail flow. Validation passed with `npm run typecheck`, the focused Shopify/managers-app tests, and the full `npx vitest run --environment jsdom packages/shopify/src` package sweep.

## Lifecycle transition

- Current state: `archived`
- Next state: none. Implementation, summary, and archive transition are complete unless a separate defect requires a new debug plan.
- Transition owner: `Claude`
