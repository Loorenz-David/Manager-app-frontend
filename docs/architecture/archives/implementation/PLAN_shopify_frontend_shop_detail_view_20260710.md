# PLAN_shopify_frontend_shop_detail_view_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_shop_detail_view_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T06:00:00Z`
- Last updated at (UTC): `2026-07-08T15:51:01Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 4 of 7.
- Phase 1 plan (implemented, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_package_foundation_api_20260710.md`.
- Phase 2 plan (implemented, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_slide_list_create_20260710.md`.
- Phase 3 plan (implemented, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_oauth_result_managers_wiring_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_oauth_result_managers_wiring_20260710.md`. Reviewed 2026-07-10 by reading every listed source file directly, re-running `npm run typecheck` (full monorepo, zero errors) and the package's Vitest suite (5/5 tests) — verdict: **approved with minor follow-up** (two non-blocking items below, neither affects this phase).
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

## Phase 3 review carried into this plan

Read directly (not just the plan/summary): `ShopifyOAuthResultPage.tsx`+test, `packages/shopify/src/index.ts`+test, and every listed managers-app file (`routes.ts`, `router.tsx`, `surfaces.ts`, `surface-registry.ts`, `settings/{types.ts, controllers/use-settings-view.controller.ts(+test), components/SettingsView.tsx}`, app `ShopifyOAuthResultPage.tsx` wrapper, `index.css`, `package.json`). Re-ran `npm run typecheck` from the repo root — passes cleanly across all three apps plus every extra `tsc -p packages/<name>/tsconfig.json` entry (including `shopify`). Re-ran `npx vitest run --environment jsdom packages/shopify/src/pages/ShopifyOAuthResultPage.test.tsx packages/shopify/src/index.test.ts` — 5/5 pass. Confirmed via `git status`/`git diff` that no backend, `.env`, or out-of-scope frontend files were touched.

**Verdict: approved with minor follow-up.** Non-blocking items (neither affects Phase 4):
- The new "Shopify" row in `apps/managers-app/.../src/features/settings/components/SettingsView.tsx` has no `data-testid`, unlike its sibling rows in the same file (`settings-push-toggle-button`, `settings-sign-out-button`). Worth adding before Phase 7's Playwright specs need a stable selector.
- The new `use-settings-view.controller.test.tsx` (correctly written, mocks `@beyo/shopify`/`@beyo/auth`/`@beyo/notifications`/`@/hooks/use-surface` and asserts the exact `open`/`close` call shape against the real controller) could not be executed locally: `apps/managers-app/ManagerBeyo-app-managers`'s Vitest fails at config-load time with `Cannot find native binding` / `Cannot find module '@rolldown/binding-darwin-arm64'`. Reproduced independently — this failure occurs even running an unrelated, pre-existing managers-app test file, confirming it is a **pre-existing, machine-local npm optional-dependency install gap** (documented upstream as npm/cli#4828), not something Phase 3 introduced or something a plan/Codex session could fix within normal scope. Non-blocking per the explicit conditions this review was asked to check: root `npm run typecheck` passes, required package tests pass, and direct reading of the wiring found no defect. Recommend fixing this (likely `rm -rf node_modules package-lock.json && npm install` from `frontend/`) before or during Phase 7's runtime-validation pass, since Phase 7 needs working Vitest/Playwright in every app.

Both Phase 2 cosmetic carry-overs (missing `bg-background` on the slide page root; missing `min-w-0` on carousel pane wrappers) remain deferred to Phase 7 polish, unaffected by Phase 3 or this phase.

## Goal and intent

- Goal: Replace the Phase 2 detail placeholder with the real Shopify shop detail view — health/status, OAuth scope status, technical integration details, a safe inline error preview, and a webhook subscription summary/preview — all read-only in this phase.
- Business/user intent: Let an admin/manager tap a shop card and actually see what's going on with that shop's connection, before Phase 5 adds the ability to act on it (reauthorize/sync/disconnect).
- Non-goals: any mutation UI (reauthorize, sync, disconnect), the action sheet itself, the full webhook subscriptions list sheet, the webhook history timeline, workspace-wide sync, scope-status endpoint, any managers-app or backend/`.env` change.

## Scope

- In scope: a real, self-contained `ShopifyIntegrationDetailContainer` (replacing `ShopifyIntegrationDetailPlaceholder` in the carousel's detail pane), its header/scopes/technical-details/error-preview/webhook-summary sub-components, loading/error/missing-id states, pull-to-refresh, a fixed Back/Edit(visual-only) footer, small formatting/status-mapping helper additions, and focused tests.
- Out of scope: everything the master plan assigns to Phases 5–7; any `apps/` file; any backend or `.env` change.
- Assumptions: `packages/shopify/src/api/use-get-shopify-shop-query.ts` and `types.ts` (verified below) are the sole data source for this phase — no new API route is wrapped, no deferred route is touched.

## Clarifications required

None remain open. Every integration-point and primitive question below was resolved by directly reading the real Phase 1/2 source (not assumed).

## Verified Phase 1/2 facts this plan depends on

- **`useGetShopifyShopQuery(shopIntegrationId: string | null | undefined)`** (`packages/shopify/src/api/use-get-shopify-shop-query.ts`) — plain `useQuery`, `enabled: Boolean(shopIntegrationId)`, queryKey `shopifyKeys.shopDetail(id)` when an id is present else `shopifyKeys.missing()`. Standard `UseQueryResult` fields (`data`, `isPending`, `isError`, `error`, `refetch`) apply — same shape already proven correct for `useListShopifyShopsQuery` in Phase 2's controller.
- **`GetShopifyShopResult`** (the query's `.data` shape, from `packages/shopify/src/api/get-shopify-shop.ts` + `types.ts`): `{ shop_integration: ShopifyShopIntegration, webhook_subscription_summary: ShopifyWebhookSubscriptionSummary, webhook_subscriptions: ShopifyWebhookSubscription[] }` — exact match to the backend handoff's Route 3 response shape, no extra/missing fields.
- **`ShopifyShopIntegration`** fields this phase renders (all confirmed present in `types.ts`, none invented): `shop_domain`, `shop_name` (nullable), `status`, `granted_scopes`, `requested_scopes`, `scopes_status`, `webhooks_status`, `api_version`, `installed_at`/`uninstalled_at`/`last_connected_at`/`last_health_check_at` (all nullable strings), `last_health_check_status` (nullable, untyped string per Phase 1's deliberate non-closed-union decision), `last_error_code`/`last_error_message` (nullable), `created_at`, `updated_at`, `created_by`/`updated_by` (nullable `ShopifyUserReference`), `client_id`.
- **`ShopifyWebhookSubscriptionSummary`**: `{ total, active, failed, pending, disabled, removed }` (all numbers).
- **`ShopifyWebhookSubscription`** fields for the preview list: `client_id` (React key), `topic`, `status`, `installed_at` (nullable), `last_error_code` (nullable).
- **`ShopifyIntegrationDetailPlaceholder`** (`packages/shopify/src/containers/ShopifyIntegrationDetailPlaceholder.tsx`) — exact prop shape confirmed: `{ selectedShopIntegrationId: string | null; onBack: () => void }`. This is the **exact same prop shape** this phase's new container will use, meaning `ShopifyIntegrationsSlidePage.tsx` needs only a one-line import + JSX swap — no controller or carousel change required (see "Exact integration point" below).
- **`StatePill`** (`packages/ui/src/components/primitives/state-pill/StatePill.tsx`): `{ label: string, variant: "neutral"|"active"|"warning"|"success"|"danger", style?: "pill"|"text" }`.
- **`UserPill`** (`packages/ui/src/components/primitives/user-pill/UserPill.tsx`): `{ userName: string, imageSrc?: string | null, imageAlt?: string, className?, avatarClassName?, userNameClassName? }` — no built-in null-user handling, so this phase's rendering code must itself decide to omit the pill or show a calm fallback when `created_by`/`updated_by` is `null` (never passes `client_id` as `userName`).
- **`ContentCard`**: `{ children, gapClassName = "gap-3", paddingClassName = "px-4 py-4" }`.
- **`FieldLabelRow`**: `{ label: React.ReactNode, htmlFor?, optional?, children? }` — a label + right-aligned slot row, used per detail field.
- **`packages/shopify/src/lib/shopify-status.ts`** (Phase 2, to be extended not duplicated): currently exports `shopifyIntegrationStatusVariant`/`shopifyIntegrationStatusLabel` (for `ShopifyIntegrationStatus`) and `hasShopifyHealthWarning(scopesStatus, webhooksStatus)`. It does **not** yet have a mapping for `ShopifyWebhookSubscriptionStatus` (needed for the subscription preview list) or `ShopifyScopesStatus` (needed for the scopes section's pill) — this phase adds both as new exported functions in the same file, reusing its existing `STATUS_LABELS`-style pattern, rather than creating a second status-mapping file.

## Design decisions (with rationale)

1. **Self-contained detail query, not controller-owned.** The intention document is explicit: "The detail container should load its own detail query using the selected shop_integration_id." Unlike the list pane (whose query lives in the shared page controller because `refreshList()`/the FAB/permissions all need it at the page level), the detail pane has no sibling that needs its data — so `ShopifyIntegrationDetailContainer` calls `useGetShopifyShopQuery(selectedShopIntegrationId)` itself. **Consequence: `use-shopify-integrations-page.controller.ts` needs zero changes in this phase** — it already exposes `selectedShopIntegrationId` and `goBackToList`, which is everything the new container needs.
2. **`ShopifyIntegrationDetailPlaceholder` is deleted, not kept as a fallback.** Its "no shop id" case is absorbed directly into the new container (same message, same back button) — keeping both would be dead, duplicated code. Nothing outside the package imports the placeholder by name (only `loadShopifyIntegrationsSlidePage` is a public app-facing export), so deleting it is safe. **Consequence: `ShopifyIntegrationsCarousel.tsx` needs zero changes** — it only renders whatever `React.ReactNode` the page passes as `detailPane`; only `ShopifyIntegrationsSlidePage.tsx` swaps the import and JSX for that one prop.
3. **Three-dot menu button: visible but disabled, not hidden.** Per the master plan's Phase 5 dependency ("detail header's three-dot menu... button exists and is wired to a controller callback, but the sheet it opens is built in Phase 5"), the button must exist now. `ShopifyIntegrationDetailHeader` takes an optional `onOpenActions?: () => void`; the button renders `disabled={!onOpenActions}`. This phase's container simply never passes that prop (renders disabled) — Phase 5 adds the prop wiring with **zero change to the header component's contract**. Rejected alternatives: hiding the button entirely (would require Phase 5 to add new layout, not just wiring) and giving it a real no-op `onClick` (a "working" button that visibly does nothing is worse UX than a disabled one).
4. **Scopes section shows a warning pill + explanatory text only — no button.** "Visual reauthorize prompt only, no reauthorize action yet" is read as: the *prompt* (pill + sentence) is visual, not that a *dead button* should exist. A second disabled affordance next to the already-disabled three-dot menu would read as two different "broken" controls on one screen. The scopes section will say, when `scopes_status === "outdated"`: a `StatePill` (warning) plus "This shop's Shopify permissions are out of date. Reauthorizing will be available soon." No button.
5. **Error preview is an inline section, not a bottom sheet.** Building a new sheet page + surface ID for one read-only field pair, when Phases 5–6 will add several more sheets to this same detail view, would mean re-touching `surface-ids.ts` and the header's menu-button plumbing twice. An inline `ContentCard` (last_error_code + last_error_message when present; a calm "No current errors" message when `last_error_code` is `null`, matching the intention doc's own suggested calm-state copy) is simpler and correct for this phase; Phase 5/6 can promote it to a sheet later if warranted without any data-shape change.
6. **Detail footer reuses Phase 2's own scroll-hide CSS-variable convention (`--scroll-hide-progress`), not `TaskDetailBottomActions`'s (`--scroll-hide-progress-footer`).** `packages/tasks/src/components/detail/TaskDetailBottomActions.tsx` is a **targeted reference for layout/safe-area/scroll-hide behavior only**, and it happens to use a differently-named CSS variable (`--scroll-hide-progress-footer`) than the one Phase 2 already established and tested inside this same package (`ShopifyIntegrationsListContainer`'s inline `ShopifyListFooter`, using plain `--scroll-hide-progress` via a no-argument `useScrollHide()`). Introducing a second, differently-named scroll-hide variable into the same carousel would be an unforced inconsistency. `ShopifyDetailBottomActions` copies the **structure** (fixed bottom bar, safe-area spacer, two-button row) but the **existing in-package `--scroll-hide-progress` convention**, giving `useScrollHide()` (no `revealAtEdge` option — Phase 2 didn't use one either) exactly as `ShopifyIntegrationsListContainer` already does.
7. **Right footer button ("Edit") is `disabled`, not wired to any callback.** Matches the intention doc exactly ("visual only for now... disabled or no-op").

## Exact integration point with the existing carousel/controller

- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx` — only change: replace
  ```tsx
  import { ShopifyIntegrationDetailPlaceholder } from "../containers/ShopifyIntegrationDetailPlaceholder";
  // ...
  detailPane={
    <ShopifyIntegrationDetailPlaceholder
      selectedShopIntegrationId={controller.selectedShopIntegrationId}
      onBack={controller.goBackToList}
    />
  }
  ```
  with
  ```tsx
  import { ShopifyIntegrationDetailContainer } from "../containers/ShopifyIntegrationDetailContainer";
  // ...
  detailPane={
    <ShopifyIntegrationDetailContainer
      selectedShopIntegrationId={controller.selectedShopIntegrationId}
      onBack={controller.goBackToList}
    />
  }
  ```
  Identical prop names/types — no other line in this file changes.
- `packages/shopify/src/controllers/use-shopify-integrations-page.controller.ts` — **no changes** (see Design decision #1).
- `packages/shopify/src/components/ShopifyIntegrationsCarousel.tsx` — **no changes** (see Design decision #2).
- `packages/shopify/src/containers/ShopifyIntegrationDetailPlaceholder.tsx` — **deleted**, along with its `export` line in `index.ts`.

## Layout and spacing

Preserved exactly as established: no `px-*` on `ShopifyIntegrationsSlidePage`'s root, `ShopifyIntegrationsCarousel`'s root/pane wrappers (both untouched by this phase anyway). `ShopifyIntegrationDetailContainer`'s own header/footer/scroll-content own their local `px-4`-style spacing directly, mirroring `ShopifyIntegrationsListContainer`'s and `ShopifyIntegrationCreateContainer`'s already-established internal spacing pattern (header row `px-4 pb-3 pt-4`, scroll content `px-4` via each `ContentCard`'s own padding, footer `px-4 pb-4 pt-3`) — no new stacked-padding risk introduced.

## Acceptance criteria

1. `ShopifyIntegrationDetailContainer` renders loading, error-with-retry, missing-selected-id, and populated states, driven by its own `useGetShopifyShopQuery` call.
2. Header shows `shop_name ?? shop_domain` as title, `shop_domain` as subtitle (only when a `shop_name` exists, matching the card's own convention), `created_at`, `created_by` rendered via `UserPill` (or a calm "Unknown user" fallback when `null` — never a raw `client_id`), a `StatePill` for `shop.status`, and a disabled three-dot menu button.
3. Scopes section renders `granted_scopes`/`requested_scopes` and a `StatePill` for `scopes_status`; shows the warning sentence (no button) only when `scopes_status === "outdated"`.
4. Technical details render `api_version`, `installed_at`, `uninstalled_at`, `last_connected_at`, `last_health_check_at`, `last_health_check_status`, `updated_at`, and `updated_by` via `UserPill`/fallback — using `FormFieldContainer`/`FieldLabelRow` rows, each nullable value formatted via a small helper (short date format or `"—"`), never raw `null`/`undefined` printed to the screen.
5. Error preview shows `last_error_code` + `last_error_message` when present, a calm "No current errors" message otherwise — never attempts to model or render `raw_payload`.
6. Webhook subscription summary shows all six counts (`total`/`active`/`failed`/`pending`/`disabled`/`removed`) and a small preview list of `webhook_subscriptions` (topic, status pill, installed_at, last_error_code) when the array is non-empty.
7. Fixed footer: left "Back" (calls `onBack`, slides to list — never closes the surface), right "Edit" (`disabled`, no handler).
8. Pull-to-refresh refetches this container's own detail query.
9. No mutation, no action sheet, no webhook history timeline, no managers-app file, no backend/`.env` change is present anywhere in this phase's diff.
10. `npm run typecheck` passes; every new/changed test passes via direct `npx vitest run --environment jsdom <path>`.

## Contracts and skills

### Contracts loaded

- `05_server_state.md` — `useGetShopifyShopQuery` consumption, no new query/key needed.
- `07_components.md` — presentational sub-component structure (header/scopes/technical-details/error-preview/webhook-summary), each receiving plain props from the container.
- `08_hooks.md` — confirms no new custom hook/controller is warranted for this phase (Design decision #1's rationale).
- `10_pages.md` — loading/error/missing-id state conventions for the container, matching the already-established list/create pane conventions from Phase 2.
- `13_errors.md` — error-with-retry state, and the calm "No current errors" empty state for the safe error preview.
- `14_styling.md` — confirms no new `@source` entry is needed (no new package dependency is added; `@beyo/shopify`'s `@source` line already exists in managers-app from Phase 3, and this phase doesn't touch any app).
- `15_feature_structure.md` — new files land in the existing `components/`/`containers/`/`lib/` folders, no new top-level folder needed.
- `16_feature_workflow.md` — confirms Components → (no new Controller/Hook layer needed) is the correct next slice after Phase 2/3.
- `17_testing.md` — Vitest/Testing Library conventions for the new colocated tests.
- `24_dto.md` — confirms `types.ts`'s raw snake_case fields are read directly by presentational components in this package (matching Phase 2's `ShopifyIntegrationCard` precedent) rather than introducing a new view-model transform layer for this phase.
- `27_responsive.md` — mobile-first single-column detail layout inside the slide pane.
- `32_loading_skeletons.md` — loading-state rows for the detail container (skeleton blocks mirroring the list pane's own loading-row pattern).
- `35_shared_packages.md` — confirms no new peer dependency, no new surface ID, no loader-function change is needed (this phase changes no public page/surface).
- `36_scroll_visibility.md` — `useScrollHide()` usage for the detail footer, per Design decision #6's exact reuse-not-reinvent rationale.

### Explicitly excluded (with reason)

- `09_forms.md` — no form exists in this phase (Edit is a disabled visual button, not a form).
- `19_permissions(_local).md` — no new role-differentiated UI is introduced; view-level gating already happened upstream at the Settings entry (Phase 3) and the list pane (Phase 2) — anyone who can open a card already has `canViewShopifyIntegrations`. The three-dot menu's disabled state is a *feature-availability* state (not yet built), not a *role* gate.
- `20_notifications.md` — no mutation exists in this phase, so no `notify.*` call is needed.
- `28_surfaces(_local).md`, `30_dynamic_loading(_local).md` — no new surface is registered and no existing surface page's loader function changes; this phase only changes what renders *inside* the already-registered slide surface's detail pane.
- `11_routing.md`, `01_architecture(_local).md`, `12_auth(_local).md` — no route, no app-shell change, no auth/session logic touched.

### File read intent — pattern vs. relational

Relational reads already performed for this plan (reproduced concretely above/below, not to be re-read broadly by the implementer): `packages/shopify/src/{containers/ShopifyIntegrationDetailPlaceholder.tsx, containers/ShopifyIntegrationsListContainer.tsx, pages/ShopifyIntegrationsSlidePage.tsx, components/ShopifyIntegrationsCarousel.tsx, controllers/use-shopify-integrations-page.controller.ts, api/use-get-shopify-shop-query.ts, api/get-shopify-shop.ts, api/shopify-keys.ts, types.ts, lib/shopify-status.ts, index.ts}` (all Phase 1–2 output, confirming exact shapes) and `packages/ui/src/components/primitives/{state-pill/StatePill.tsx, user-pill/UserPill.tsx, form-field-container/{FormFieldContainer.tsx,FieldLabelRow.tsx}}` (exact prop contracts). `packages/tasks/src/{pages/TaskDetailSlidePage.tsx, components/detail/TaskDetailHeader.tsx, components/detail/TaskDetailBottomActions.tsx}` were read strictly for the listed patterns (scroll container/footer/header layout ideas) — **not** for their CSS-variable naming, per Design decision #6, and not for `TaskDetailHeader`'s task-specific fields (article number, ready-by date, etc.), which do not transfer.

## Implementation plan

1. **`packages/shopify/src/lib/shopify-formatters.ts`** (new) — small, focused helpers:
   ```ts
   import { formatShortDate } from "@beyo/lib";

   export function formatShopifyDetailDate(value: string | null): string {
     if (!value) return "—";
     return formatShortDate(value) ?? value;
   }
   ```
   (One function is likely enough; add a second only if a genuinely different formatting need appears, e.g. for `last_health_check_status`, which is a free-text string, not a date — render it as-is or `"—"` when `null`, no separate formatter needed.)

2. **`packages/shopify/src/lib/shopify-status.ts`** (extend, do not duplicate) — add:
   ```ts
   import type { ShopifyScopesStatus, ShopifyWebhookSubscriptionStatus } from "../types";

   export function shopifyScopesStatusVariant(status: ShopifyScopesStatus): StatePillVariant {
     return status === "outdated" ? "warning" : "success";
   }
   export function shopifyScopesStatusLabel(status: ShopifyScopesStatus): string {
     return status === "outdated" ? "Outdated" : "Up to date";
   }

   const SUBSCRIPTION_STATUS_LABELS: Record<ShopifyWebhookSubscriptionStatus, string> = {
     pending: "Pending", active: "Active", failed: "Failed", disabled: "Disabled", removed: "Removed",
   };
   export function shopifyWebhookSubscriptionStatusVariant(status: ShopifyWebhookSubscriptionStatus): StatePillVariant {
     switch (status) {
       case "active": return "success";
       case "pending": return "neutral";
       case "failed": return "danger";
       case "disabled":
       case "removed": return "neutral";
     }
   }
   export function shopifyWebhookSubscriptionStatusLabel(status: ShopifyWebhookSubscriptionStatus): string {
     return SUBSCRIPTION_STATUS_LABELS[status];
   }
   ```

3. **`packages/shopify/src/components/ShopifyIntegrationDetailHeader.tsx`** (new):
   ```tsx
   type ShopifyIntegrationDetailHeaderProps = {
     shop: ShopifyShopIntegration;
     onBack: () => void;
     onOpenActions?: () => void;
   };
   ```
   Back-arrow button (`onBack`) + title (`shop.shop_name ?? shop.shop_domain`) + subtitle row (`shop.shop_domain` shown only if `shop.shop_name` exists, plus `created_at` formatted via `formatShopifyDetailDate`, plus `created_by` `UserPill` or "Unknown user" text when `null`) + `StatePill` (`shopifyIntegrationStatusVariant`/`Label`) + three-dot button (`disabled={!onOpenActions}`, `onClick={onOpenActions}`). No `px-*` beyond the header row's own local padding (mirrors list/create pane header convention exactly).

4. **`packages/shopify/src/components/ShopifyIntegrationScopesSection.tsx`** (new):
   ```tsx
   type ShopifyIntegrationScopesSectionProps = {
     grantedScopes: string[];
     requestedScopes: string[];
     scopesStatus: ShopifyScopesStatus;
   };
   ```
   `ContentCard` with a `FieldLabelRow` for "Granted scopes" (comma-joined `grantedScopes`, or "None" if empty) plus the `StatePill`; optionally a second, muted line listing `requestedScopes` for context. When `scopesStatus === "outdated"`, an additional line: "This shop's Shopify permissions are out of date. Reauthorizing will be available soon." (no button — Design decision #4).

5. **`packages/shopify/src/components/ShopifyIntegrationTechnicalDetails.tsx`** (new):
   ```tsx
   type ShopifyIntegrationTechnicalDetailsProps = {
     shop: ShopifyShopIntegration;
   };
   ```
   `ContentCard` with one `FieldLabelRow` per field: `api_version`, `installed_at`, `uninstalled_at`, `last_connected_at`, `last_health_check_at`, `last_health_check_status`, `updated_at` (all via `formatShopifyDetailDate` except `api_version`/`last_health_check_status`, which are plain strings/`"—"`), and `updated_by` rendered via `UserPill` (or "Unknown user" fallback).

6. **`packages/shopify/src/components/ShopifyIntegrationErrorPreview.tsx`** (new):
   ```tsx
   type ShopifyIntegrationErrorPreviewProps = {
     lastErrorCode: string | null;
     lastErrorMessage: string | null;
   };
   ```
   `ContentCard` — when `lastErrorCode` is present: an error-icon row with `lastErrorCode` as a small mono/code-styled label plus `lastErrorMessage` beneath it; otherwise a single calm line: "No current errors."

7. **`packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.tsx`** (new):
   ```tsx
   type ShopifyWebhookSubscriptionSummaryPreviewProps = {
     summary: ShopifyWebhookSubscriptionSummary;
     subscriptions: ShopifyWebhookSubscription[];
   };
   ```
   `ContentCard` — a compact counts row (`total`/`active`/`failed`/`pending`/`disabled`/`removed`, each a small labeled number), then, only if `subscriptions.length > 0`, a short list (cap at a small number, e.g. first 5, with a "+N more" note if truncated — full list is Phase 6's dedicated sheet) of `{ topic, StatePill via shopifyWebhookSubscriptionStatusVariant/Label, installed_at via formatShopifyDetailDate, last_error_code if present }`.

8. **`packages/shopify/src/components/ShopifyDetailBottomActions.tsx`** (new) — structurally modeled on `ShopifyIntegrationsListContainer`'s inline `ShopifyListFooter` (same `--scroll-hide-progress` CSS variable, same `absolute bottom-0 left-0 right-0 z-20` shell, same safe-area spacer), but with two buttons instead of one:
   ```tsx
   type ShopifyDetailBottomActionsProps = {
     onBack: () => void;
   };
   ```
   Left "Back" button (icon + label, calls `onBack`), right "Edit" button (`disabled`, no `onClick`).

9. **`packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`** (new) — the real replacement, same prop shape as the deleted placeholder:
   ```tsx
   type ShopifyIntegrationDetailContainerProps = {
     selectedShopIntegrationId: string | null;
     onBack: () => void;
   };
   ```
   - If `!selectedShopIntegrationId`: render the same calm "Select a shop to view its details." message the placeholder used, with the header/back-button shell still present (matches the placeholder's existing look for this state exactly, so nothing regresses visually for a state that — per the controller — should be unreachable in practice since `openShop` always sets both together).
   - Otherwise: `const query = useGetShopifyShopQuery(selectedShopIntegrationId);` — loading state (skeleton rows matching the list pane's `h-20 animate-pulse rounded-xl bg-muted` convention), error state (`ContentCard` + "Try again" calling `query.refetch`), populated state renders `ShopifyIntegrationDetailHeader` + `PullToRefresh`-wrapped scroll content (`ShopifyIntegrationScopesSection`, `ShopifyIntegrationTechnicalDetails`, `ShopifyIntegrationErrorPreview`, `ShopifyWebhookSubscriptionSummaryPreview`) + `ShopifyDetailBottomActions`, using `useScrollHide()` (no options) exactly like the list container.
   - `onOpenActions` is not passed to the header in this phase (renders disabled) — no local state/prop needed for it yet.

10. **`packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`** — one-line import + JSX swap per "Exact integration point" above.

11. **Delete `packages/shopify/src/containers/ShopifyIntegrationDetailPlaceholder.tsx`** and its `export { ShopifyIntegrationDetailPlaceholder } from "./containers/ShopifyIntegrationDetailPlaceholder";` line in `index.ts`.

12. **`packages/shopify/src/index.ts`** — add exports for `ShopifyIntegrationDetailContainer` and any of the new sub-components a later phase might need to reuse directly (at minimum the container; the smaller presentational pieces are optional to export — export them only if Phase 5/6 is expected to import them directly, otherwise keep them package-internal to avoid over-exporting).

13. **Tests** (colocated Vitest + Testing Library):
    - `ShopifyIntegrationDetailContainer.test.tsx` — missing-id state; loading state; error state + retry calls `refetch`; populated state renders title/domain/status/created_by pill; back button calls `onBack`; three-dot button is `disabled`; pull-to-refresh calls the query's refetch.
    - `ShopifyIntegrationScopesSection.test.tsx` — outdated vs. up-to-date rendering, no button present in either case.
    - `ShopifyIntegrationTechnicalDetails.test.tsx` — null fields render `"—"`, not `"null"`/blank; `updated_by` null renders the fallback, not a raw id.
    - `ShopifyWebhookSubscriptionSummaryPreview.test.tsx` — counts render; empty `subscriptions` array renders no list; non-empty renders expected rows.
    - `shopify-status.test.ts` (extend Phase 2's existing test file if one exists for this lib, otherwise add) — new status-mapping functions covered.

## Risks and mitigations

- Risk: `last_health_check_status` (an un-enumerated free-text string per Phase 1's deliberate decision) contains an unexpected value that looks odd rendered plainly.
  Mitigation: render it as plain text with a `"—"` fallback for `null` — no attempt to map it to a `StatePill` variant, since its value set isn't known; this avoids the same over-fitting risk Phase 1 already flagged for this exact field.
- Risk: the webhook subscription preview list grows unbounded if a shop has many subscriptions, crowding the detail pane.
  Mitigation: step 7 caps the inline list and defers the full list to Phase 6's dedicated sheet — this phase's preview is intentionally partial.
- Risk: reusing `--scroll-hide-progress` (Design decision #6) instead of introducing per-footer-type CSS variables could make two different fixed footers on the *same* pane conflict if ever stacked.
  Mitigation: not applicable here — only one fixed footer exists per pane at any time (list pane's footer vs. detail pane's footer are never both mounted simultaneously, since only one carousel pane is "active" conceptually, though all three are technically mounted — this is already true of Phase 2's list/create footers and has not caused a conflict, since each footer's CSS var is scoped by its own `hideProgressContainerRef` ancestor, not globally).

## Validation plan

- `npm run typecheck` (root): zero errors, from `frontend/`.
- `npx vitest run --environment jsdom packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx packages/shopify/src/components/ShopifyIntegrationScopesSection.test.tsx packages/shopify/src/components/ShopifyIntegrationTechnicalDetails.test.tsx packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.test.tsx`: all pass.
- `npx vitest run --environment jsdom packages/shopify/src/lib/shopify-status.test.ts` (or wherever its test lives): passes with the new mapping functions covered.
- Re-run the full existing Shopify Vitest suite (all prior test files) to confirm the placeholder's deletion and the slide-page swap introduced no regression: `npx vitest run --environment jsdom packages/shopify/src`.
- No Playwright run required yet (no managers-app change in this phase; full runtime validation is Phase 7's job).

## Review log

- `2026-07-10` Claude: Phase 3 reviewed directly against merged source (routes/surfaces/settings/dependency wiring) — approved with one non-blocking, pre-existing local-environment issue (rolldown native binding) and one cosmetic follow-up (missing `data-testid`), neither affecting this phase. Phase 4 plan drafted from direct inspection of the real Phase 1/2 detail-placeholder integration point, query hook signature, and UI primitive contracts — no blockers found; the detail query is self-contained per the intention document's explicit instruction, meaning the shared controller and carousel need zero changes, only a one-line swap in the slide page.

## Lifecycle / review log

- `2026-07-08T15:51:01Z` Codex: Implemented Phase 4 only inside `packages/shopify`. Replaced the detail placeholder with a real read-only detail container, added the approved header/scopes/technical-details/error-preview/webhook-summary/footer components, added formatter and status helpers, removed the placeholder file after the slide-page swap, ran root `npm run typecheck` successfully, and ran the focused/new Shopify package tests plus the full `packages/shopify/src` Vitest suite successfully. No managers-app files modified, no backend files modified, no `.env` files modified, and no Phase 5+ work implemented.

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `Codex`
