# PLAN_shopify_frontend_webhook_subscriptions_history_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_webhook_subscriptions_history_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T09:00:00Z`
- Last updated at (UTC): `2026-07-08T18:04:20Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 6 of 7.
- Phase 5 plan (implemented, reviewed, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_action_sheet_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_shop_action_sheet_20260710.md`. Reviewed 2026-07-10 by reading every listed source file directly, then independently re-running `npm run typecheck` (full monorepo, zero errors), `npx vitest run --environment jsdom packages/shopify/src` (21 files, 48 tests, all pass), and the managers-app settings controller test directly (2/2 pass) — verdict: **approved**, no critical issues, zero deviations from the approved plan. See "Phase 5 review findings and confirmed facts" below.
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

**Phase 5 is implemented and reviewed. Every symbol/prop this plan names below has been verified directly against the merged `packages/shopify` source — no assumption in the original draft turned out to be wrong, and critically, the detail container's insertion point this plan depends on is completely unchanged.** This plan is ready for Codex.

## Goal and intent

- Goal: Complete the read-only inspection half of the Shopify detail experience — a webhook history/activity timeline (paginated, heterogeneous by `record_type`) appended to the detail pane already built in Phase 4.
- Business/user intent: Let an admin/manager see exactly what has happened to a shop's webhooks (deliveries, sync events, disconnects) without leaving the detail pane, closing out the intention document's original "developer-log/timeline style" requirement.
- Non-goals: any new shop-management action (reauthorize/sync/disconnect — Phase 5's job), workspace-wide sync, scope-status endpoint, a new webhook-subscriptions sheet (deferred — see "Subscriptions UI decision"), any managers-app/backend/`.env` change.

## Scope

- In scope: a self-contained `ShopifyWebhookHistorySection` (paginated history timeline) inserted into the existing `ShopifyIntegrationDetailContainer`, its two record-type card components, a small metadata-preview helper, new status/label helper additions (extending, not duplicating, Phase 4's `shopify-status.ts`), a small new `shopify-history.ts` lib file for history-specific interpretation logic, and one small extension to the detail container's existing pull-to-refresh handler so it also refreshes history. Focused tests throughout.
- Out of scope: everything the master plan assigns to Phase 7; any file under `apps/`; any backend or `.env` change; Phase 5's action-sheet work.
- Assumptions: Phase 5 lands exactly as its approved plan describes — adding one `onOpenActions` prop to `ShopifyIntegrationDetailContainer` and forwarding it to the header, with no other structural change to the container's populated-content JSX. **Confirmed** by direct source review — see "Phase 5 review findings and confirmed facts" below.

## Phase 5 review findings and confirmed facts

**All items below were verified 2026-07-10 by reading the real, merged `packages/shopify` and managers-app source directly** (`ShopifyShopActionsSheetPage.tsx`, `ShopifyShopActionsSheetContent.tsx`, `surface-ids.ts`, `ShopifyIntegrationsSlidePage.tsx`, `ShopifyIntegrationDetailContainer.tsx`, `index.ts`, `apps/managers-app/.../shopify-integrations/surfaces.ts`, `use-settings-view.controller.ts`, and the settings controller test) — not just the plan/summary. Independently re-ran `npm run typecheck` (zero errors) and `npx vitest run --environment jsdom packages/shopify/src` (21 files, 48 tests, all pass) plus the managers-app controller test directly (2/2 pass, run from `apps/managers-app/ManagerBeyo-app-managers`). Also confirmed the managers-app-local Vitest environment issue noted in the Phase 3 review (missing `@rolldown/binding-darwin-arm64`) is now resolved — the earlier Phase 4 review's `npm install` fixed it as a side effect.

- **`ShopifyShopActionsSheetPage`** — confirmed at `packages/shopify/src/pages/ShopifyShopActionsSheetPage.tsx`. Reads `shopIntegrationId` via `useSurfaceProps<ShopifyShopActionsSheetSurfaceProps>()`, self-queries `useGetShopifyShopQuery(shopIntegrationId)`, renders missing/loading/error-retry states, wires all three Phase 1 mutation hooks, and renders `ShopifyShopActionsSheetContent`. Fully app-agnostic — no managers-app import anywhere. (New fact worth recording: sheet pages in this codebase use `header?.setTitle(...)`/`header?.setActions(null)` rather than slides' `setHeaderHidden(true)` — a different host-header API per surface type. Not needed by this phase, but useful to know for any future sheet work.)
- **`ShopifyShopActionsSheetContent`** — confirmed at `packages/shopify/src/components/ShopifyShopActionsSheetContent.tsx`, props `{ shop, permissions, onReauthorize, isReauthorizing, onSyncWebhooks, isSyncingWebhooks, onDisconnect, isDisconnecting }`. Renders exactly the three approved actions with the exact visibility rules planned (`canReauthorize`/`canSyncWebhooks`/`canDisconnect` booleans matching this plan's — and the master plan's — spec precisely), `ConfirmActionButton` for disconnect only, and a calm "No actions are available for this shop right now." empty state. No naming collision risk for this phase's new files.
- **Action-sheet surface ID**: confirmed `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID = "shopify-shop-actions-sheet"` in `surface-ids.ts`.
- **`ShopifyShopActionsSheetSurfaceProps`**: confirmed `{ shopIntegrationId: string }`.
- **`ShopifyIntegrationsSurfaceOpeners` after Phase 5**: confirmed `{ closeSurface?: () => void; openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void }`. This phase needs no new opener key.
- **`ShopifyIntegrationsSlidePage.tsx` changes**: confirmed limited to computing `onOpenActions` (guarded on both `selectedShopIntegrationId` and `props.surfaceOpeners?.openShopActions` being present) and passing it to `ShopifyIntegrationDetailContainer`. No other structural change; this phase does not touch this file.
- **`ShopifyIntegrationDetailContainer.tsx` changes — the single most important fact for this plan**: confirmed Phase 5 added **exactly** one new optional prop, `onOpenActions?: () => void`, forwarded straight to `ShopifyIntegrationDetailHeader`. The populated-content wrapper (`<div className="mx-4 flex flex-col gap-4">`) still renders, in this exact unchanged order: `ShopifyIntegrationScopesSection` → `ShopifyIntegrationTechnicalDetails` → `ShopifyIntegrationErrorPreview` → `ShopifyWebhookSubscriptionSummaryPreview`. The `PullToRefresh`'s `onRefresh` handler is still exactly `await query.refetch()` — untouched. **This confirms Implementation plan step 8 below is correct exactly as drafted, with zero revision needed.**
- **Managers-app surface registration**: confirmed `src/features/shopify-integrations/surfaces.ts` now registers both `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` (slide) and `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` (sheet); `use-settings-view.controller.ts`'s `openShopifyIntegrations()` assembles the nested `openShopActions` opener exactly matching `HomeView.tsx`'s established pattern; its test was correctly extended to assert the nested call. This phase makes zero managers-app changes of its own.
- **Package exports (`packages/shopify/src/index.ts`)**: confirmed the full current export list (including the new sheet content/loader/surface-ID exports) — no naming collision with this phase's planned new exports (`ShopifyWebhookHistorySection`, the two record cards, the metadata preview component, the new `shopify-status.ts`/`shopify-history.ts` helpers).
- **Tests/results**: independently re-ran — `npm run typecheck` zero errors; `npx vitest run --environment jsdom packages/shopify/src` 21 files/48 tests pass, matching the summary exactly; managers-app's `use-settings-view.controller.test.tsx` 2/2 pass (confirms the rolldown environment issue from the Phase 3 review is now resolved).
- **Implemented Phase 5 summary path**: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_shop_action_sheet_20260710.md` — confirmed exists, read in full.
- **Archived Phase 5 plan path**: `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_action_sheet_20260710.md` — confirmed archived.
- **Deviations from the approved Phase 5 plan**: none found.
- **Scope confirmation**: `git status`/`git diff --stat` confirm only the expected `packages/shopify/**` and the already-known managers-app Settings/surfaces files changed — no backend, `.env`, or unexpected files.

**Verdict: approved, no critical issues, no corrections needed to this plan's core architecture.**

## Verified Phase 1 facts this plan depends on (already confirmed this session, re-checked unchanged during this draft)

Re-read directly (not assumed) during this draft: `packages/shopify/src/api/{get-shopify-webhook-history.ts, use-shopify-webhook-history-query.ts, use-shopify-webhook-history-infinite-query.ts, shopify-keys.ts}` and `types.ts` — all confirmed unchanged since the Phase 1 review.

- **`useShopifyWebhookHistoryInfiniteQuery({ shopIntegrationId, pageSize = 3, loadMoreSize = 5 })`** (`packages/shopify/src/api/use-shopify-webhook-history-infinite-query.ts`) — a plain `useInfiniteQuery`. Takes **one object argument**, not `(id, { limit })` as the task prompt's guessed shape suggested — the real signature already implements exactly "3 initial, 5 per Show More" via its own `pageSize`/`loadMoreSize` defaults, so this phase does not need to pass anything beyond `shopIntegrationId`. Query key: `shopifyKeys.webhookHistoryInfinite(shopIntegrationId)` (or `shopifyKeys.missing()` when the id is falsy); `enabled: Boolean(shopIntegrationId)`. `queryFn` calls `getShopifyWebhookHistory(shopIntegrationId, { limit: pageParam === 0 ? pageSize : loadMoreSize, offset: pageParam })`; `getNextPageParam` reads `lastPage.webhook_history_records_pagination.has_more/offset/limit`, returning `undefined` (→ `hasNextPage: false`) when `has_more` is `false`.
- **Return shape**: standard TanStack Query v5 `UseInfiniteQueryResult` — `data.pages` is an array of `GetShopifyWebhookHistoryResult` (`{ webhook_history_records: ShopifyWebhookHistoryRecord[], webhook_history_records_pagination }`), plus `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`, `isPending`, `isError`, `error`, `refetch`. This phase flattens `data.pages.flatMap(page => page.webhook_history_records)` to render one continuous, growing list.
- **`ShopifyWebhookIntakeHistoryRecord`** (`types.ts`): `record_type: "webhook_intake"`, `client_id`, `shop_integration_id`, `shop_domain`, `topic`, `webhook_id`, `status: ShopifyWebhookIntakeStatus` (`"received"|"processing"|"processed"|"failed"|"ignored"`), `retryable: boolean`, `attempts: number`, `received_at`/`processing_started_at`/`processed_at` (all nullable strings), `last_error` (nullable), `created_at`, `updated_at`. No `raw_payload` field exists on this type — confirmed, cannot be invented.
- **`ShopifyIntegrationEventHistoryRecord`** (`types.ts`): `record_type: "integration_event"`, `client_id`, `shop_integration_id`, `event_type: ShopifyIntegrationEventType` (`"webhook_sync"|"webhook_received"|"webhook_processed"|"disconnect"` — only these 4 ever appear in this feed per the handoff), `severity: ShopifyIntegrationEventSeverity` (`"info"|"warning"|"error"`), `message: string`, `metadata_json: Record<string, unknown> | null`, `created_by: ShopifyUserReference | null`, `created_at`. No `raw_payload` field.
- **`shopifyKeys`** (`packages/shopify/src/api/shopify-keys.ts`): confirmed shape includes `webhookHistoryRoot(id)` (the shared prefix for both single-page and infinite history caches) and `webhookHistoryInfinite(id)` (the infinite-query-specific key). This phase's pull-to-refresh extension invalidates `shopifyKeys.webhookHistoryRoot(id)` — the parent prefix — so it correctly invalidates both cache shapes without needing to know which one is mounted.
- **No-secret guarantee (backend-enforced, not re-implemented here)**: the handoff states Route 7's `metadata_json` already strips any key containing `token`/`secret`/`hmac`/`signature`/`authorization`/`code`/`raw_payload`/`payload`/`raw_response`/`provider_response` server-side, and returns `null` if every key was unsafe. This phase does not re-implement secret-stripping — it only adds a defensive **shape** filter (scalars only, capped count) on top of an already-secret-free payload, for layout/readability reasons, not security ones.

## Verified Phase 4 fact this plan depends on (already reviewed this session, unchanged since — and now doubly confirmed unchanged by the Phase 5 review)

`ShopifyIntegrationDetailContainer.tsx`'s populated-content branch renders, inside one `<div className="mx-4 flex flex-col gap-4">` wrapper: `ShopifyIntegrationScopesSection` → `ShopifyIntegrationTechnicalDetails` → `ShopifyIntegrationErrorPreview` → `ShopifyWebhookSubscriptionSummaryPreview`, in that exact order, as the last four children. This phase's insertion point (Implementation plan step 8) appends `ShopifyWebhookHistorySection` as a fifth child, immediately after the summary preview — **confirmed correct, no revision needed** (Phase 5 only added the `onOpenActions` prop/forwarding, nothing else in this file).

## Subscriptions UI decision

**Keep Phase 4's existing inline `ShopifyWebhookSubscriptionSummaryPreview` unchanged. Do not add a webhook-subscriptions sheet in this phase.** Phase 4 already implemented a capped-at-5, "+N more"-noted inline list showing `topic`, a `StatePill` for `status`, `installed_at`, and `last_error_code` — this already satisfies "a concise list of subscriptions" for v1. Expanding it to add `callback_url`/`required_scopes`/`last_verified_at` or promoting it to a dedicated bottom sheet would be a layout redesign this phase's own scope explicitly warns against ("Do not turn Phase 6 into a broad layout redesign"), and the existing surface conventions don't make a new sheet "clearly cleaner" for a list that's already capped and readable inline. **Consequence: this phase adds zero new surface IDs, zero new managers-app files, and does not modify `ShopifyWebhookSubscriptionSummaryPreview.tsx`.** If a future need arises (e.g. an admin wants to inspect all subscriptions beyond the 5-item cap), that becomes its own small follow-up plan, not part of Phase 6.

## Acceptance criteria

1. `ShopifyWebhookHistorySection` renders inside the detail pane's scroll content, self-contained (owns its own `useShopifyWebhookHistoryInfiniteQuery(shopIntegrationId)` call), showing loading/error-with-retry/empty ("No webhook activity yet.")/populated states.
2. Initial load shows the 3 most recent records; "Show more" fetches 5 more at a time via `fetchNextPage()`, hidden when `!hasNextPage`, showing a fetching-more indicator while `isFetchingNextPage`.
3. `webhook_intake` records render `topic`, a status pill, `webhook_id`, `retryable` (friendly Yes/No), `attempts`, `received_at`/`processing_started_at`/`processed_at` (formatted, `"—"` when null), `last_error` when present.
4. `integration_event` records render `event_type` (friendly label), a severity pill, `message`, `created_at`, and `created_by` via `UserPill` when present or a deterministic system-source label (derived from `event_type`, not raw text-matching on `message`) when `created_by` is `null` — never a raw `client_id`, never the word "Unknown user" for a system-generated event.
5. `metadata_json` renders at most 4 scalar (`string`/`number`/`boolean`) entries; any nested object/array value is silently omitted from display, never rendered as a JSON blob; no field named `raw_payload` is ever modeled or rendered anywhere.
6. Pull-to-refresh on the detail pane also invalidates `shopifyKeys.webhookHistoryRoot(selectedShopIntegrationId)`, refreshing any currently-mounted history query alongside the shop detail query.
7. No new surface, no managers-app file, no action-sheet/mutation UI, no workspace-wide sync, no scope-status query exists anywhere in this phase's diff.
8. This plan's Phase 5 facts have been fully verified against real, merged Phase 5 code (satisfied — see "Phase 5 review findings and confirmed facts").

## Contracts and skills

### Contracts loaded

- `05_server_state.md` — `useInfiniteQuery` consumption pattern (`data.pages`, `fetchNextPage`, `hasNextPage`), already established by Phase 1's hook; this phase only consumes it.
- `07_components.md` — presentational structure of the section/card components.
- `08_hooks.md` — confirms no new hook is needed (Phase 1's infinite-query hook is reused as-is).
- `10_pages.md` — loading/error/empty state conventions for the history section, matching the detail container's own established conventions from Phase 4.
- `13_errors.md` — error-with-retry state for the history query.
- `14_styling.md` — confirms no new `@source` entry needed (no new package dependency).
- `15_feature_structure.md` — new files land in existing `components/`/`lib/` folders.
- `16_feature_workflow.md` — confirms this phase's ordering (extend `shopify-status.ts` → new `shopify-history.ts` lib → new card/section components → insert into existing container) is the correct next slice.
- `17_testing.md` — Vitest/Testing Library conventions for the new colocated tests.
- `24_dto.md` — confirms raw snake_case fields are read directly by presentational components, matching every prior phase's precedent; the one small transform (metadata scalar-filtering) is documented as a lib helper, not a hidden DTO layer.
- `27_responsive.md` — mobile-first single-column timeline layout.
- `32_loading_skeletons.md` — loading-state rows for the history section, matching the detail container's own skeleton pattern.
- `35_shared_packages.md` — confirms no new peer dependency, no new surface ID, no loader-function change is needed (this phase adds no new page/surface).

### Explicitly excluded (with reason)

- `28_surfaces(_local).md`, `30_dynamic_loading(_local).md` — no new surface is registered in this phase (see "Subscriptions UI decision"); these would only be needed if a subscriptions sheet were added, which this plan explicitly declines.
- `09_forms.md`, `06_client_state.md`, `23_providers.md` — no form, no new client-state store, no provider.
- `19_permissions(_local).md`, `20_notifications.md` — no new role-gated action, no mutation, hence no notification needed; viewing history is already gated upstream by `canViewShopifyWebhookHistory` at whatever level Phase 5's action-sheet visibility rules apply it (this phase's own UI doesn't need to re-check that boolean, since reaching the detail pane at all already implies view access).
- `36_scroll_visibility.md`, `37_keyboard_aware_inputs.md` — the history section lives inside the detail pane's existing single scroll container (no new scroll-hide footer, no input).
- `11_routing.md`, `01_architecture(_local).md`, `12_auth(_local).md` — nothing touched here.

### File read intent — pattern vs. relational

Relational reads performed for this plan (reproduced concretely above, not to be re-read broadly): `packages/shopify/src/api/{get-shopify-webhook-history.ts, use-shopify-webhook-history-query.ts, use-shopify-webhook-history-infinite-query.ts, shopify-keys.ts}`, `types.ts` (exact history-record field names, re-confirmed unchanged since Phase 1's review), `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx` (exact current content order, re-confirmed unchanged since Phase 4's review, and again during the Phase 5 review), and — newly added during the Phase 5 review — `ShopifyShopActionsSheetPage.tsx`, `ShopifyShopActionsSheetContent.tsx`, `surface-ids.ts`, `ShopifyIntegrationsSlidePage.tsx`, `index.ts`, and the managers-app surfaces/settings-controller files (all confirmed to introduce no conflict with this phase's files).

## Implementation plan

*(Every symbol name below — from Phase 1's webhook-history hook, Phase 4's detail container, and Phase 5's action-sheet wiring — has been verified against the real, merged source. No corrections were needed; the code below is ready to execute as written.)*

1. **`packages/shopify/src/lib/shopify-status.ts`** (extend) — add:
   ```ts
   const WEBHOOK_INTAKE_STATUS_LABELS: Record<ShopifyWebhookIntakeStatus, string> = {
     received: "Received", processing: "Processing", processed: "Processed",
     failed: "Failed", ignored: "Ignored",
   };
   export function shopifyWebhookIntakeStatusVariant(status: ShopifyWebhookIntakeStatus): StatePillVariant {
     switch (status) {
       case "processed": return "success";
       case "processing":
       case "received": return "neutral";
       case "failed": return "danger";
       case "ignored": return "neutral";
     }
   }
   export function shopifyWebhookIntakeStatusLabel(status: ShopifyWebhookIntakeStatus): string {
     return WEBHOOK_INTAKE_STATUS_LABELS[status];
   }

   const EVENT_SEVERITY_LABELS: Record<ShopifyIntegrationEventSeverity, string> = {
     info: "Info", warning: "Warning", error: "Error",
   };
   export function shopifyIntegrationEventSeverityVariant(severity: ShopifyIntegrationEventSeverity): StatePillVariant {
     switch (severity) {
       case "info": return "neutral";
       case "warning": return "warning";
       case "error": return "danger";
     }
   }
   export function shopifyIntegrationEventSeverityLabel(severity: ShopifyIntegrationEventSeverity): string {
     return EVENT_SEVERITY_LABELS[severity];
   }

   const EVENT_TYPE_LABELS: Record<ShopifyIntegrationEventType, string> = {
     webhook_sync: "Webhook sync", webhook_received: "Webhook received",
     webhook_processed: "Webhook processed", disconnect: "Disconnected",
   };
   export function shopifyIntegrationEventTypeLabel(eventType: ShopifyIntegrationEventType): string {
     return EVENT_TYPE_LABELS[eventType];
   }
   ```

2. **`packages/shopify/src/lib/shopify-history.ts`** (new — history-specific interpretation logic, separate from generic status/formatter helpers, matching the intention document's own original package-structure sketch which listed this file separately):
   ```ts
   import type { ShopifyIntegrationEventType } from "../types";

   const SYSTEM_SOURCE_LABELS: Record<ShopifyIntegrationEventType, string> = {
     webhook_received: "Shopify webhook",
     webhook_processed: "Background worker",
     webhook_sync: "System",
     disconnect: "System",
   };

   export function resolveShopifyIntegrationEventSourceLabel(
     eventType: ShopifyIntegrationEventType,
   ): string {
     return SYSTEM_SOURCE_LABELS[eventType];
   }

   const METADATA_PREVIEW_LIMIT = 4;

   export function getShopifyMetadataPreviewEntries(
     metadata: Record<string, unknown> | null,
   ): Array<[string, string]> {
     if (!metadata) return [];

     const entries: Array<[string, string]> = [];
     for (const [key, value] of Object.entries(metadata)) {
       if (entries.length >= METADATA_PREVIEW_LIMIT) break;
       if (typeof value === "string" || typeof value === "number") {
         entries.push([key, String(value)]);
       } else if (typeof value === "boolean") {
         entries.push([key, value ? "Yes" : "No"]);
       }
       // nested objects/arrays/null/undefined are silently omitted — never rendered as a JSON blob.
     }
     return entries;
   }
   ```
   Deterministic, `event_type`-keyed source label — never parses `message` text (fragile) and never falls back to a raw id.

3. **`packages/shopify/src/components/ShopifyWebhookMetadataPreview.tsx`** (new, small):
   ```tsx
   type ShopifyWebhookMetadataPreviewProps = {
     metadata: Record<string, unknown> | null;
   };
   ```
   Renders `getShopifyMetadataPreviewEntries(metadata)` as compact `label: value` rows; renders nothing if the array is empty (no "no metadata" clutter — this is a sub-detail, not a primary section).

4. **`packages/shopify/src/components/ShopifyWebhookIntakeRecordCard.tsx`** (new):
   ```tsx
   type ShopifyWebhookIntakeRecordCardProps = {
     record: ShopifyWebhookIntakeHistoryRecord;
   };
   ```
   A compact card: `topic` + `StatePill` (via `shopifyWebhookIntakeStatusVariant`/`Label`), then `webhook_id`, "Retryable: Yes/No", `attempts`, formatted `received_at`/`processing_started_at`/`processed_at` (via `formatShopifyDetailDate`), and `last_error` when present — all via `FieldLabelRow`-style rows matching the detail container's existing field layout. Never references `raw_payload`.

5. **`packages/shopify/src/components/ShopifyIntegrationEventRecordCard.tsx`** (new):
   ```tsx
   type ShopifyIntegrationEventRecordCardProps = {
     record: ShopifyIntegrationEventHistoryRecord;
   };
   ```
   A compact card: `shopifyIntegrationEventTypeLabel(event_type)` as the title + `StatePill` (via `shopifyIntegrationEventSeverityVariant`/`Label`), `message`, formatted `created_at`, and a provenance row: `UserPill` (`userName: created_by.username`, `imageSrc: created_by.profile_picture`, `imageAlt: created_by.username`) when `created_by` is present, otherwise a plain `<span>` showing `resolveShopifyIntegrationEventSourceLabel(event_type)` — never "Unknown user" for a system-generated event, never a raw `client_id`. Renders `<ShopifyWebhookMetadataPreview metadata={metadata_json} />` beneath.

6. **`packages/shopify/src/components/ShopifyWebhookHistoryRecordCard.tsx`** (new — dispatcher):
   ```tsx
   type ShopifyWebhookHistoryRecordCardProps = {
     record: ShopifyWebhookHistoryRecord;
   };

   export function ShopifyWebhookHistoryRecordCard({ record }: ShopifyWebhookHistoryRecordCardProps): React.JSX.Element {
     if (record.record_type === "webhook_intake") {
       return <ShopifyWebhookIntakeRecordCard record={record} />;
     }
     return <ShopifyIntegrationEventRecordCard record={record} />;
   }
   ```

7. **`packages/shopify/src/components/ShopifyWebhookHistorySection.tsx`** (new — self-contained, owns its own query per the intention document's explicit "self-sufficient" instruction):
   ```tsx
   type ShopifyWebhookHistorySectionProps = {
     shopIntegrationId: string | null | undefined;
   };

   export function ShopifyWebhookHistorySection({
     shopIntegrationId,
   }: ShopifyWebhookHistorySectionProps): React.JSX.Element | null {
     const query = useShopifyWebhookHistoryInfiniteQuery({ shopIntegrationId });

     if (!shopIntegrationId) {
       return null; // omitted, not a calm-state message — this section only ever mounts once a shop is already selected (see rationale below)
     }

     const records = query.data?.pages.flatMap((page) => page.webhook_history_records) ?? [];

     // loading / error-with-retry / empty ("No webhook activity yet.") / populated states,
     // mirroring ShopifyIntegrationDetailContainer's own loading/error state conventions.

     return (
       <ContentCard data-testid="shopify-webhook-history-section">
         <h3 className="text-sm font-semibold text-foreground">Webhook activity</h3>
         {/* loading/error/empty branches omitted here for brevity */}
         <div className="flex flex-col gap-2">
           {records.map((record) => (
             <ShopifyWebhookHistoryRecordCard key={record.client_id} record={record} />
           ))}
         </div>
         {query.hasNextPage ? (
           <button
             type="button"
             disabled={query.isFetchingNextPage}
             onClick={() => void query.fetchNextPage()}
           >
             {query.isFetchingNextPage ? "Loading…" : "Show more"}
           </button>
         ) : null}
       </ContentCard>
     );
   }
   ```
   Rationale for returning `null` (not a calm-state message) when `shopIntegrationId` is absent: this section only ever mounts inside `ShopifyIntegrationDetailContainer`'s **populated** branch (step 8 below), which by construction only renders once a shop is already selected and its detail query has resolved — so the `null`/`undefined` id path is unreachable in practice here, unlike the top-level detail container which genuinely has a real "no shop selected yet" state to show. The defensive `null`-id prop type keeps the component reusable without forcing a redundant empty-state message that can never actually appear.

8. **`packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`** — two small, additive changes:
   - Append `<ShopifyWebhookHistorySection shopIntegrationId={selectedShopIntegrationId} />` as the fifth child inside the existing `<div className="mx-4 flex flex-col gap-4">` wrapper, immediately after `<ShopifyWebhookSubscriptionSummaryPreview ... />` — **confirmed correct**: Phase 5's review verified this wrapper's content order is unchanged.
   - Extend the existing `PullToRefresh`'s `onRefresh` handler: alongside `await query.refetch()`, add `void queryClient.invalidateQueries({ queryKey: shopifyKeys.webhookHistoryRoot(selectedShopIntegrationId) })` (import `useQueryClient` from `@tanstack/react-query` and `shopifyKeys` from `../api/shopify-keys`, both new imports to this file). This makes a single pull-to-refresh gesture refresh both the shop detail and any currently-mounted history query, without the container needing to know about the history section's internal pagination state — it only invalidates the cache; the self-contained `ShopifyWebhookHistorySection` refetches its own currently-loaded pages in response, same as any other query observer would.

9. **`packages/shopify/src/index.ts`** — add exports for `ShopifyWebhookHistorySection` (and, only if a later phase needs them directly, the two record-card components and `ShopifyWebhookHistoryRecordCard`) plus the new `shopify-status.ts`/`shopify-history.ts` helper functions.

10. **Tests** (colocated Vitest + Testing Library):
    - `ShopifyWebhookHistorySection.test.tsx` — loading state; error-with-retry; empty state ("No webhook activity yet."); populated state renders both record types; "Show more" calls `fetchNextPage`; hidden when `hasNextPage` is `false`; disabled/loading label while `isFetchingNextPage`; no `raw_payload` text ever appears in the rendered output (a `queryByText`/DOM-scan guard, matching Phase 4's own established scope-drift-guard test style).
    - `ShopifyWebhookIntakeRecordCard.test.tsx` — renders all listed fields; `last_error` omitted when `null`.
    - `ShopifyIntegrationEventRecordCard.test.tsx` — `created_by` present renders `UserPill`; `created_by` null renders the deterministic system-source label per `event_type` (not "Unknown user"); metadata preview renders scalar entries and omits a nested object/array field if one is present in a test fixture.
    - `shopify-history.test.ts` — `getShopifyMetadataPreviewEntries` caps at 4, skips non-scalar values, formats booleans as Yes/No; `resolveShopifyIntegrationEventSourceLabel` covers all 4 `event_type` values.
    - Extend `shopify-status.test.ts` with the three new helper functions' full enum coverage.

## Risks and mitigations

- Risk: `getNextPageParam`'s pagination math (`offset + limit`) drifts from what "Show more" actually needs if the backend ever returns a non-contiguous page (unlikely, but not this phase's concern to guard against — it's Phase 1's hook, already tested).
  Mitigation: none needed — this is an already-verified, already-tested Phase 1 concern; this phase only consumes the hook's public return shape.
- Risk: rendering `metadata_json` even in a filtered/capped form could still surprise a reviewer expecting zero metadata display per the intention document's strict "no raw_payload" framing.
  Mitigation: the plan explicitly distinguishes "no raw_payload" (a hard backend-enforced guarantee, never violated) from "a small, capped, scalar-only metadata preview" (an intentional, safe, opt-in UX enhancement, not a security boundary) — documented clearly so a reviewer doesn't conflate the two.

## Validation plan

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
```

- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyWebhookHistorySection.test.tsx packages/shopify/src/components/ShopifyWebhookIntakeRecordCard.test.tsx packages/shopify/src/components/ShopifyIntegrationEventRecordCard.test.tsx packages/shopify/src/lib/shopify-history.test.ts packages/shopify/src/lib/shopify-status.test.ts`: all pass.
- Re-run the full existing Shopify Vitest suite to confirm the container's new section/pull-to-refresh extension introduced no regression: `npx vitest run --environment jsdom packages/shopify/src`.
- No Playwright run required yet (full runtime validation is Phase 7's job).

## Phase 6 approval policy

Satisfied: Phase 5 was implemented, reviewed (reading the real merged code directly, re-running `npm run typecheck` and the full Shopify Vitest suite plus the managers-app controller test independently), and archived — verdict approved, zero deviations, zero critical issues. The detail container's exact final content structure was verified unchanged. No Phase 7 polish/runtime-validation scope is present. No workspace-wide sync or scope-status work is present. This phase requires no managers-app changes at all (see "Subscriptions UI decision").

## Review log

- `2026-07-10` Claude: Phase 6 draft plan prepared while Phase 5 is pending implementation. Phase 1's webhook-history hook signature and Phase 4's detail-container content order were re-confirmed unchanged this session (not re-derived from scratch). Decided against a webhook-subscriptions sheet — Phase 4's existing inline preview already suffices for v1, avoiding unnecessary layout redesign and a new surface. Plan intentionally left `under_construction`.
- `2026-07-10` Claude: Reviewed the completed, archived Phase 5 implementation directly against source (action sheet page/content, surface-ids, slide page, detail container, managers-app surfaces/settings-controller files) — also independently re-ran `npm run typecheck` (zero errors), the full Shopify Vitest suite (21 files/48 tests, all pass), and the managers-app settings-controller test directly (2/2 pass, confirming the earlier rolldown environment issue is now resolved). Zero deviations from Phase 5's approved plan; critically, the detail container's populated-content order this plan's insertion point depends on is completely unchanged. Promoted status to `approved`.
- `2026-07-08` Codex: Implemented Phase 6 entirely inside `packages/shopify` by adding the webhook history section, record dispatcher/cards, metadata preview, history/status helpers, and detail-pane pull-to-refresh history invalidation. Validation completed with `npm run typecheck` passing and all focused Phase 6 tests passing; an additional broad `packages/shopify/src` Vitest sweep surfaced one pre-existing environment-dependent failure in `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx` (`VITE_API_URL` validation during `@beyo/api-client` import), outside the Phase 6 files. Wrote summary `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_webhook_subscriptions_history_20260710.md` and archived this child plan.

## Lifecycle transition

- Current state: `archived`
- Next state: none. Implementation, summary, and archive transition are complete unless a future defect requires a separate debug plan.
- Transition owner: `Claude`
