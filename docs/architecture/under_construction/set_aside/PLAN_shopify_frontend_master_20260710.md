# PLAN_shopify_frontend_master_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_master_20260710`
- Status: `approved`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T00:00:00Z`
- Last updated at (UTC): `2026-07-10T01:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`
- Plan type: **Master plan** — this document defines the phased sequence and shared decisions for a series of child implementation plans. It is not itself executable by Codex. Child plans (`PLAN_shopify_<phase-slug>_<date>.md`) will be created one at a time, each scoped to a single phase below, each carrying its own `Clarifications required`, `Contracts loaded`, and `Implementation plan` sections.

## Goal and intent

- Goal: Create a reusable, app-agnostic `@beyo/shopify` frontend package (`packages/shopify`) that provides the UI and logic to connect, list, view, reauthorize, disconnect, and manually sync webhooks for Shopify shop integrations, plus view webhook subscription status and webhook/event history — wrapping the backend routes documented in the 20260709 handoff.
- Business/user intent: Give admin and manager users in ManagerBeyo a way to link their Shopify store, monitor its connection/webhook health, and recover from OAuth scope or webhook problems, without any frontend app hardcoding Shopify-specific routing or surface wiring.
- Non-goals (first version): workspace-wide webhook sync UI, a standalone scope-status query/hook, shop_name editing, custom `redirect_after_success` targets, raw webhook payload display, worker/seller-facing UI.

## Scope

- In scope: `@beyo/shopify` package (types, API client functions, React Query hooks, action/mutation hooks, permission helper, components, containers, controllers, pages, surface-ids), plus the consuming-app wiring needed to mount it (route for the OAuth redirect landing page, surface registration for the slide page and its bottom sheets, one entry point in the consuming app's existing UI).
- Out of scope: backend changes of any kind, modifying the backend handoff document, editing the intention document, implementing any child plan's code, workspace-wide webhook sync UI, standalone scope-status UI, GraphQL/webhook worker logic (already implemented server-side).
- Assumptions:
  - The backend is fully implemented and stable per the 20260709 handoff; this master plan treats that handoff as ground truth over the intention document wherever the two could be read to disagree.
  - `managers-app` (`apps/managers-app/ManagerBeyo-app-managers`) is the first consuming app (see "Clarifications" below for confidence level).
  - No backend route, field name, or role rule may be invented; every type in this plan traces to a field explicitly present in the handoff.

## Source intention cleanup notes

The intention document (`shopify_integration_2.md`) has duplicated and stale passages. Per instructions, the document itself was **not edited**. This master plan treats the corrected intent below as authoritative; a human editor may later apply these edits directly to the intention file.

| # | Location (intention doc) | Issue | Correction applied in this master plan |
|---|---|---|---|
| 1 | Lines ~604–620 | "Expected container flow" bullet list appears twice, verbatim | Treated as a single section (see Phase 2). |
| 2 | Lines ~635–652 | "The page itself should stay thin" block appears twice, verbatim | Treated as a single section (see Phase 2 / page composition constraints). |
| 3 | Lines ~1111–1121 | `integration_event` expanded-record fields list `created_by user pill when available` / `created_at` twice | Treated as one bullet pair (Phase 6 webhook history record card). |
| 4 | Open question #7 ("Should workspace-wide webhook sync be included...") | Stale — already resolved earlier in the same doc under "Workspace-wide webhook sync" ("intentionally out of scope for the first frontend implementation") | Resolved: out of scope for v1. Not re-litigated in child plans. |
| 5 | Open question #8 ("Should scope status route be queried independently...") | Stale — already resolved earlier under "Scope status" (rely on `scopes_status`/`requested_scopes`/`granted_scopes` from list/detail responses) | Resolved: no standalone scope-status hook in v1. |
| 6 | Open question #4 ("Is shop_name currently editable...") | Stale — already resolved in Container 3 ("backend does not accept shop_name during install-url creation") | Resolved: `shop_name` is display-only (from backend response), never collected/submitted. |
| 7 | Top of doc, "package conventions" reference to `packages/tasks` as a whole | Broad, untargeted reference (unlike the later "use this file only for X" references) | This master plan narrows every implementation-file reference to a specific file + specific purpose (see "Targeted implementation references" below). `packages/tasks` as a directory is never to be read wholesale by a child plan or Codex session. |

Checked and confirmed **already clean** (no action needed, listed so the check is on record):
- No stale mentions of raw `created_by_id` / `updated_by_id` were found anywhere in the intention document — it already consistently models `created_by`/`updated_by` as compact user objects.
- No instruction anywhere asks the frontend to display `raw_payload` — every mention explicitly prohibits it.
- No accidental instruction to collect `shop_name` in the creation form was found — `shop_name` is only ever referenced as a display fallback (list/detail cards), never as a form field.

## Backend route scope (authoritative — from the 20260709 handoff)

Base path for all admin/management routes: `/api/v1/integrations/shopify`. The frontend must never call `/api/v1/shopify/webhooks` (Route 11, Shopify-facing) or `GET /api/v1/integrations/shopify/oauth/callback` (Route 10, Shopify-facing) directly.

### First-version routes (wrapped and used by `@beyo/shopify` v1)

| # | Route | Roles | Used by |
|---|---|---|---|
| 1 | `POST /install-url` | admin, manager | Create pane — install URL + redirect |
| 2 | `GET /shops` | admin, manager | List pane |
| 3 | `GET /shops/{id}` | admin, manager | Detail pane, webhook subscriptions preview |
| 4 | `POST /shops/{id}/reauthorize-url` | admin, manager | Action sheet — reauthorize |
| 5 | `DELETE /shops/{id}` | admin only | Action sheet — disconnect |
| 6 | `POST /shops/{id}/webhooks/sync` | admin only | Action sheet — sync webhooks |
| 7 | `GET /shops/{id}/webhooks/history` | admin, manager | Webhook history timeline |

### Deferred routes (not exposed in v1 UI; not built at all in v1 — see rationale below)

| Route | Reason deferred |
|---|---|
| `POST /webhooks/sync` (workspace-wide) | Bulk maintenance/admin-tools action; no dedicated admin-tools area exists yet. List/detail responses give enough signal per-shop. |
| `GET /scopes` (standalone scope status) | List/detail responses already return `requested_scopes`, `granted_scopes`, `scopes_status`, `status` — sufficient for v1's per-shop reauthorize prompt. |

**Decision (stricter than the intention doc's "type it now" suggestion):** Phase 1 will **not** create API functions, query hooks, or types for these two deferred routes at all — not even inert scaffolding. Per this codebase's convention against speculative code, they will be added in a future dedicated plan alongside the admin-tools/health-banner feature that actually consumes them. This is a deliberate, documented deviation from the intention doc's "may still type this endpoint later" phrasing — nothing prevents adding it, but nothing here should exist unused.

### Response envelope (confirmed to match existing frontend conventions)

- Success: `{ "data": {...}, "ok": true, "warnings": [] }` — read from `data`, per `04_api_client.md`.
- Domain failure: `{ "error": "...", "ok": false }` — this matches the flat-string error shape already documented in `04_api_client_local.md`. No new error-parsing pattern is required; the existing API client error handling applies unchanged.
- Auth failure (401/403): FastAPI `{ "detail": "..." }` shape — different from the above two; existing API client already distinguishes this per `04_api_client_local.md`.
- Validation failure (422): may be either the FastAPI shape (`{"detail": [...]}`) or the domain shape (`{"error": ..., "ok": false}`) depending on whether the failure was type-level or business-rule-level. The API layer must handle both defensively without assuming one specific 422 body shape.

## Package boundary

`@beyo/shopify` (`packages/shopify`) owns:
- API client functions, query keys, query hooks, mutation/action hooks, types (Zod schemas + inferred types) for the 7 first-version routes only.
- All Shopify UI: list/detail/create panes, carousel + slide page, action sheet, error sheet, webhook subscriptions sheet, webhook history component, OAuth redirect result page.
- `useShopifyIntegrationPermissions` helper.
- `surface-ids.ts` — surface ID constants for its own pages/sheets, and `ShopifyIntegrationsSurfaceOpeners` type for callbacks it needs injected (see "Surface-ids.ts placement" below).

`@beyo/shopify` does **not** own (consuming app's responsibility):
- Route registration for the OAuth redirect landing page.
- Surface registration (`lazyWithPreload` + `useSurface` wiring) — the package exposes loader functions per `35_shared_packages.md` §14; apps call `openSurface`.
- The entry point/button that opens the Shopify slide page (e.g., inside Settings) — app-specific placement.
- API base URL, token storage, QueryClient, theme setup — all already provided globally by the consuming app.

## Resolved clarifications

These were listed as open questions in the intention document. Items 1, 4, 5, 6, 7 were resolved from existing repo evidence. Items 2 and 3 were genuine product/ops decisions that could not be inferred from any file in the repo — they are now resolved by explicit user decision (2026-07-10), which unblocks Phase 3 planning.

| # | Question | Resolution | Evidence / source |
|---|---|---|---|
| 1 | Which app consumes the first Shopify slide page? | `managers-app` (`apps/managers-app/ManagerBeyo-app-managers`) | Only this app has an existing Settings feature/page (`src/features/settings`, `src/pages/settings/SettingsPage.tsx`). Workers are excluded from the UI entirely by role rule; sellers are excluded in v1 by explicit decision. No settings/integrations area exists in `selleres-app` or `workers-app`. |
| 2 | What exact frontend route/path should `SHOPIFY_OAUTH_REDIRECT_URL` point to? | Frontend route: `/settings/integrations/shopify/oauth-result`. Full URLs: production `https://managers.beyoworkaroundtheclock.com/settings/integrations/shopify/oauth-result`, local dev `http://localhost:5173/settings/integrations/shopify/oauth-result`. | User decision, 2026-07-10. The backend operator must set `SHOPIFY_OAUTH_REDIRECT_URL` to these exact values in each environment (production/local) — this is a backend `.env` change outside this plan's scope; Phase 3's child plan should note it as a deployment prerequisite, not implement it. |
| 3 | Where in managers-app should the Shopify slide page be opened from? | Managers app → Settings → Integrations → Shopify. The Integrations entry opens the `ShopifyIntegrationsSlidePage` surface. | User decision, 2026-07-10. Exact implementation (new "Integrations" section/row inside `SettingsPage.tsx` vs. a dedicated sub-page) is a Phase 3 implementation-plan detail, not a master-plan blocker — the entry point and destination are now both fixed. |
| 4 | Which primitive for status pills? | `StatePill` — `packages/ui/src/components/primitives/state-pill/StatePill.tsx` | Confirmed props: `label`, `variant: "neutral"\|"active"\|"warning"\|"success"\|"danger"`, `style?: "pill"\|"text"`. No existing package currently imports it, but it is the only established status/pill primitive in `@beyo/ui` (as opposed to `UserPill`, `InfoPill`, `FieldErrorPill`, `NavTabBadge`, which serve other purposes). |
| 5 | Which bottom-sheet opening API? | `useSurface()` from `@beyo/hooks` (`packages/hooks/src/use-surface.ts`), via the `surfaceOpeners` injection pattern (`35_shared_packages.md` §13) | Confirmed existing pattern used by `tasks`, `cases`, `task-notes`, `emails`, `task-customer-coordination` packages — all define `surface-ids.ts` with `SurfaceOpeners` types; only app controllers call `openSurface` directly. |
| 6 | How does the package read current role? | `useRole()` from `@beyo/auth` (`packages/auth/src/hooks/use-role.ts`) | Confirmed exported function; return shape (`role`, `workspaceRoleName`, `hasRole()`, `isWorkspaceRole()`) matches `19_permissions_local.md` exactly. `AuthRole` values (`admin`/`manager`/`worker`/`seller`) confirmed in `packages/auth/src/roles.ts`, matching the handoff's JWT `role_name` values one-to-one. |
| 7 | Does `surface-ids.ts` belong in the package or the consuming app? | In the package | Every existing feature package (`tasks`, `cases`, `task-notes`, `emails`, `item-categories`, `item-issues`, `items`, `scanner`, `task-working-sections`, `task-customer-coordination`) defines its own `surface-ids.ts` with surface ID constants and `SurfaceOpeners`/`SurfaceProps` types. This is the established convention, not a Shopify-specific decision. |

No open blockers remain. All 7 clarifications carried over from the intention document are now resolved.

## Permission model

Canonical long-term model: capability-based `usePermissions()` + `can(...)` (`19_permissions.md`). Current-state override (`19_permissions_local.md`): `backend_permissions` and `ui` are scaffold-only and always empty, so v1 uses the local identity layer.

`useShopifyIntegrationPermissions()` (package-internal helper, consumes `useRole()` from `@beyo/auth`, lives in `packages/shopify/src/lib/`) exposes:

| Boolean | admin | manager | worker | seller |
|---|---|---|---|---|
| `canViewShopifyIntegrations` | ✓ | ✓ | ✗ | ✗ |
| `canCreateShopifyInstallUrl` | ✓ | ✓ | ✗ | ✗ |
| `canCreateShopifyReauthorizeUrl` | ✓ | ✓ | ✗ | ✗ |
| `canDisconnectShopifyIntegration` | ✓ | ✗ | ✗ | ✗ |
| `canSyncShopifyWebhooksForShop` | ✓ | ✗ | ✗ | ✗ |
| `canViewShopifyWebhookHistory` | ✓ | ✓ | ✗ | ✗ |

Rules for all child plans:
- Presentational components (cards, action rows, footer buttons) receive these booleans as props — never call `useRole()` or check `AuthRole` strings themselves.
- The backend remains authoritative; a hidden/disabled action reaching the backend anyway still gets 401/403 — frontend hiding is UX only, never described as security in any child plan.
- No `RoleGuard` wrapping of individual Shopify buttons — booleans from the helper are sufficient and keep components reusable across apps with potentially different role-to-UI mappings later.

## Types to model (Phase 1) — exact field names from the handoff, no inventions

**Entities**
- `ShopifyShopIntegration`: `client_id`, `workspace_id`, `shop_domain`, `shop_name` (nullable), `provider` (`"shopify"`), `status: ShopifyIntegrationStatus`, `access_token_expires_at` (nullable), `granted_scopes: string[]`, `requested_scopes: string[]`, `api_version`, `installed_at` (nullable), `uninstalled_at` (nullable), `last_connected_at` (nullable), `last_health_check_at` (nullable), `last_health_check_status` (nullable — handoff does not enumerate its values; model as `string | null`, flag as a Phase 1 clarification if a stricter union is desired later), `last_error_code` (nullable), `last_error_message` (nullable), `scopes_status: ShopifyScopesStatus`, `webhooks_status: ShopifyWebhooksStatus`, `created_by: ShopifyUserReference | null`, `updated_by: ShopifyUserReference | null`, `created_at`, `updated_at`, `is_deleted: boolean`.
- `ShopifyWebhookSubscription`: `client_id`, `workspace_id`, `shop_integration_id`, `topic`, `callback_url`, `remote_subscription_id`, `payload_format`, `required_scopes: string[]`, `status: ShopifyWebhookSubscriptionStatus`, `installed_at` (nullable), `last_verified_at` (nullable), `last_install_attempt_at` (nullable), `last_error_code` (nullable), `last_error_message` (nullable), `created_at`, `updated_at`.
- `ShopifyWebhookSubscriptionSummary`: `total`, `active`, `failed`, `pending`, `disabled`, `removed` (all numbers).
- `ShopifyUserReference`: `client_id`, `username`, `profile_picture` (nullable). Used for `created_by`/`updated_by` everywhere it appears; itself always nullable at the field level (e.g. `shop.created_by: ShopifyUserReference | null`).
- `ShopifyWebhookIntakeHistoryRecord`: `record_type: "webhook_intake"`, `client_id`, `shop_integration_id`, `shop_domain`, `topic`, `webhook_id`, `status: ShopifyWebhookIntakeStatus`, `retryable: boolean`, `attempts: number`, `received_at` (nullable), `processing_started_at` (nullable), `processed_at` (nullable), `last_error` (nullable), `created_at`, `updated_at`.
- `ShopifyIntegrationEventHistoryRecord`: `record_type: "integration_event"`, `client_id`, `shop_integration_id`, `event_type: ShopifyIntegrationEventType`, `severity: ShopifyIntegrationEventSeverity`, `message`, `metadata_json: Record<string, unknown> | null`, `created_by: ShopifyUserReference | null`, `created_at`. Never has `raw_payload` — do not model that field.
- `ShopifyWebhookHistoryRecord = ShopifyWebhookIntakeHistoryRecord | ShopifyIntegrationEventHistoryRecord` (discriminated union on `record_type`).

**Response wrappers**
- `ShopifyShopsListResponse` data: `{ shops: ShopifyShopIntegration[], shops_pagination: { limit, offset, has_more } }`.
- `ShopifyShopDetailResponse` data: `{ shop_integration: ShopifyShopIntegration, webhook_subscription_summary: ShopifyWebhookSubscriptionSummary, webhook_subscriptions: ShopifyWebhookSubscription[] }`.
- `ShopifyInstallUrlResponse`: `{ install_url, shop_domain, expires_at }` (shared shape for both install-url and reauthorize-url responses).
- `ShopifyDisconnectResponse`: `{ shop_integration_id, shop_domain, status: "disabled", uninstalled_at, remove_webhooks_task_id }`.
- `ShopifySyncWebhooksForShopResponse`: `{ shop_integration_id, shop_domain, sync_status, sync_webhooks_task_id }`.
- `ShopifyWebhookHistoryResponse` data: `{ webhook_history_records: ShopifyWebhookHistoryRecord[], webhook_history_records_pagination: { has_more, limit, offset } }`.
- `ShopifyOAuthResultParams`: `{ success: boolean, shop_domain: string | null, error_code: ShopifyOAuthErrorCode | null }` — parsed from the redirect page's query string (`success` arrives as the literal string `"true"`/`"false"` and must be parsed, not trusted as boolean).

**String unions**
- `ShopifyIntegrationStatus`: `"pending_install" | "active" | "needs_reauth" | "scopes_outdated" | "webhooks_outdated" | "disabled" | "uninstalled" | "error"`.
- `ShopifyWebhookSubscriptionStatus`: `"pending" | "active" | "failed" | "disabled" | "removed"`.
- `ShopifyWebhookIntakeStatus`: `"received" | "processing" | "processed" | "failed" | "ignored"`.
- `ShopifyIntegrationEventType`: at minimum the 4 values this feed can emit — `"webhook_sync" | "webhook_received" | "webhook_processed" | "disconnect"`. (Broader lifecycle events like `install`/`reauthorize` exist backend-side but are explicitly excluded from Route 7's feed per the handoff — do not model them as reachable here.)
- `ShopifyIntegrationEventSeverity`: `"info" | "warning" | "error"`.
- `ShopifyScopesStatus`: `"outdated" | "up_to_date"`.
- `ShopifyWebhooksStatus`: `"has_failures" | "needs_sync" | "synced"`.
- `ShopifyOAuthErrorCode`: `"invalid_signature" | "invalid_state" | "state_shop_mismatch" | "state_already_consumed" | "state_expired" | "access_denied" | "missing_code" | "token_exchange_failed" | "oauth_callback_failed"`.

Not modeled in v1 (per the deferred-route decision above): `ShopifyScopeStatus` (Route 9 shape), `ShopifySyncWebhooksForWorkspaceResponse` (Route 8 shape).

## Package structure (high-level; refined per-phase by each child plan)

```
packages/shopify/
  package.json                # @beyo/shopify, peers only (react, @beyo/lib, @beyo/api-client, @beyo/hooks, @beyo/ui, @beyo/auth, zod, lucide-react, framer-motion)
  tsconfig.json                # per 35_shared_packages.md §5 template
  src/
    types.ts                   # Zod schemas + inferred types, Phase 1
    api/                       # api functions + *-keys.ts + query hooks, Phase 1
    actions/                   # mutation hooks, Phase 1
    lib/                       # useShopifyIntegrationPermissions, status/formatting helpers, Phase 1/4
    controllers/                # use-shopify-integrations-page.controller.ts, Phase 2
    components/                 # cards, pills, sheets content, history record card — Phases 2/4/5/6
    containers/                  # list/detail/create containers — Phases 2/4
    pages/                       # ShopifyIntegrationsSlidePage, ShopifyOAuthResultPage, sheet pages — Phases 2/3/4/5/6
    surface-ids.ts               # surface ID constants + SurfaceOpeners types — Phase 2 (grows in later phases)
    index.ts                     # public API barrel; loader functions for surface pages per §14
```

`providers/`, `flows/`, `store/` from the intention doc's suggested tree are **not pre-committed** — the reference controller pattern (`use-customer-coordination-email-inbox.controller.ts`) passes controller state/actions into panes as props, with no context provider needed. Each relevant phase's child plan decides whether prop-drilling depth or async orchestration complexity justifies adding one, rather than creating them speculatively now.

## Targeted implementation references (read for "what exists," never for general style)

| File | Read only for |
|---|---|
| `packages/tasks/src/pages/TaskDetailSlidePage.tsx` | hidden host header, `useSurfaceProps`, `PullToRefresh`, `useScrollHide`, fixed footer visibility, loading/error/missing-id shell states, absence of page-level `px-*` |
| `packages/tasks/src/components/detail/TaskDetailHeader.tsx` | title/subtitle layout, status pill placement, three-dot menu layout |
| `packages/tasks/src/components/detail/TaskDetailBottomActions.tsx` | fixed two-button footer pattern, safe-area handling, scroll-hide footer behavior |
| `packages/task-customer-coordination/src/pages/CustomerCoordinationEmailInboxPage.tsx` | thin package page composition, `surfaceOpeners`, hidden host header, `closeSurface` fallback, controller state/actions passed into carousel panes as props |
| `packages/task-customer-coordination/src/controllers/use-customer-coordination-email-inbox.controller.ts` | controller-owned active carousel index, selected-entity state, open/go-back actions, refresh actions, `notify.error` pattern, optional `surfaceOpeners` dependency |
| `packages/emails/src/components/EmailThreadCarousel.tsx` | sliding transform implementation, full-height overflow-hidden shell, flex strip width, transition timing |
| `packages/emails/src/components/EmailInboxView.tsx` | mobile list shell, pull-to-refresh list, loading/error/empty states, fixed footer coexistence with scroll content, `useScrollHide` |
| `packages/emails/src/components/EmailInboxFooter.tsx` | Close & Back footer styling, safe-area placement, scroll-hide transform/opacity |
| `apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/components/TaskCreationFab.tsx` | FAB positioning, safe-area bottom offset, z-index, icon sizing, rounded/shadow styling only — **not** its multi-action/scanner behavior |
| `packages/ui/src/components/primitives/confirm-action-button/ConfirmActionButton.tsx` | destructive disconnect confirmation behavior only |
| `packages/ui/src/components/primitives/user-pill/UserPill.tsx` | `userName`/`imageSrc`/`imageAlt` props, compact layout, fallback behavior |
| `packages/ui/src/components/primitives/form-field-container/FormFieldContainer.tsx`, `FieldLabelRow.tsx` | detail field layout, grouped preview rows |
| `packages/task-creation/src/components/InternalFormContent.tsx` | simple form composition only — **not** staged-form behavior (not used here; form has one field) |
| `packages/ui/src/components/primitives/state-pill/StatePill.tsx` | `label`/`variant`/`style` props for all Shopify status pills (integration status, webhook status, scope status) |
| `packages/tasks/src/surface-ids.ts` | shape of surface ID constants + `SurfaceOpeners`/`SurfaceProps` type conventions (relational read — confirms the pattern, not copied verbatim) |

No child plan or Codex session should read any package's directory broadly "for style" — only the specific files above, for the specific purpose listed. How-to-write questions go to the contracts below, not to these files.

## Contracts and skills

### Contracts loaded (with justification)

**Core (always loaded per `frontend_contract_goal_mapping_guide.md`):**
- `01_architecture.md` — overall app/package structure this feature must fit into.
- `02_types.md` — Zod schema + inferred-type conventions for `types.ts`.
- `04_api_client.md` — envelope/error handling baseline.
- `05_server_state.md` — React Query key/hook structure.
- `06_client_state.md` — when (not) to add a Zustand store; justifies omitting `store/` in v1.
- `08_hooks.md` — query/action hook structure, optimistic update/rollback shape.
- `13_errors.md` — error-surfacing conventions across the three response shapes.
- `15_feature_structure.md` — package `src/` folder layout baseline.

**"New feature (CRUD)" goal bundle:**
- `16_feature_workflow.md` — the build order (Types → Keys → API/Query hooks → Actions → Controllers → Flows → Providers → Components → Forms → Pages → Dynamic loading → Routes → Public API → tests → Playwright) is the direct backbone of the phase sequence below.
- `07_components.md` — component/context consumption pattern for cards, pills, sheet content.
- `09_forms.md` — create pane's `shop_domain` field (validation, server-error surfacing).
- `10_pages.md` — page composition, loading/error/skeleton states for slide page and sheets.
- `11_routing.md` — lazy route registration for the OAuth redirect landing page in managers-app.
- `14_styling.md` — `@source` registration when managers-app wires in `@beyo/shopify`.
- `23_providers.md` — needed to correctly justify whether/when a context provider is warranted (see package structure note above).
- `24_dto.md` — view-model mapping (e.g., `created_by`/`updated_by` → `UserPill` props, status → `StatePill` variant).
- `17_testing.md` — Vitest/MSW conventions for Phase 7.
- `34_runtime_validation.md` — Playwright conventions baseline for Phase 7.

**Trigger-based additions (this feature's surface/animation/scroll/permission footprint triggers all of these):**
- `19_permissions.md` + `19_permissions_local.md` — canonical capability model + the current-state `useRole()` override this v1 actually uses (already read in full; confirmed shape).
- `28_surfaces.md` + `28_surfaces_local.md` — slide-surface main page, sheet surfaces for action/error/webhook-subscriptions; local extension confirms `sheet`/`slide`/`modal` are valid, `drawer` is not.
- `33_vaul_drawer.md` — the three bottom sheets are vaul-based.
- `31_animations.md` — carousel slide transform durations/easings from `@beyo/lib`.
- `32_loading_skeletons.md` — list/detail loading states.
- `27_responsive.md` — mobile-first three-pane carousel.
- `36_scroll_visibility.md` — `useScrollHide`-driven fixed footers, `PullToRefresh` registration across list/detail panes.
- `30_dynamic_loading.md` + `30_dynamic_loading_local.md` — `lazyWithPreload` path, `usePreloadSurface`, and critically the loader-function requirement (`35_shared_packages.md` §14) for every page registered as a surface.
- `18_performance.md` — memoization guidance pairing with dynamic loading; no virtualization needed given small paginated lists.
- `20_notifications.md` — `notify.error`/`notify.success` pattern for mutation outcomes (reauthorize redirect, sync started, disconnect).
- `37_keyboard_aware_inputs.md` — the create pane's single text input + fixed footer combination on mobile.
- `01_architecture_local.md` — `route-entry.tsx` pattern, relevant to the OAuth redirect page route.
- `04_api_client_local.md` — confirms the handoff's exact error shape needs no new parsing logic.

**Task-specific (not in the guide's default bundles, but essential and explicitly required by the task):**
- `35_shared_packages.md` — package boundary, `surfaceOpeners` injection pattern, loader-function requirement, `package.json`/`tsconfig.json` templates. Already read in full; directly answered the `surface-ids.ts` placement question above.

### Explicitly excluded (with reason)

- `12_auth.md` / `12_auth_local.md` — the package only *consumes* the already-documented `useRole()` hook's public return shape (fully specified in `19_permissions_local.md`); it implements no sign-in/session/JWT logic itself.
- `21_realtime.md` — no websocket/live-update requirement; webhook history is pull/paginated, not socket-pushed.
- `03_env.md`, `22_*` (file upload), `25_*` (current-user profile), `26_*` (persistence), `29_*` (ScrollArea) — none of these apply: no new env var is package-owned, no file upload exists in this feature, `UserPill` already covers user display without `useCurrentUser`, no client-side persistence is needed, and `36_scroll_visibility.md` + `PullToRefresh` fully cover this feature's scroll needs without a separate `ScrollArea` contract.

### Local extensions loaded

- `04_api_client_local.md`: confirms flat-string domain error shape (no `field_errors`), matching the handoff exactly.
- `12_auth_local.md`: excluded (see above).
- `19_permissions_local.md`: `useRole()` exact return shape; scaffold-empty `backend_permissions`/`ui` justify the local-identity approach for v1.
- `28_surfaces_local.md`: valid surface types (`slide`, `sheet`, `modal`; no `drawer`).
- `30_dynamic_loading_local.md`: `lazyWithPreload` import path, `usePreloadSurface` hook.
- `34_runtime_validation_local.md`: bootstrap status, fixture/helper paths, credential env vars, project names for Phase 7's Playwright specs.
- `01_architecture_local.md`: `route-entry.tsx` pattern for the OAuth redirect route.

### File read intent — pattern vs. relational

Apply `task_system/frontend_contract_goal_mapping_guide.md`'s test to every file read a child plan or Codex session performs: "Am I reading this to understand **how to write** my new code — or **what this existing code does**?" The "Targeted implementation references" table above is exhaustive for this feature's relational reads. Any read outside that table's files, for a "how to write" purpose, is a protocol violation — go to the matching contract instead.

## Phased child implementation sequence

Each phase becomes exactly one child plan, created and approved one at a time. A child plan must not begin implementation on a later phase's responsibilities, even if convenient.

### Phase 1 — Shopify package foundation, types, API layer, and query/action hooks
- Creates: `packages/shopify` skeleton (`package.json`, `tsconfig.json`, empty `src/index.ts`), `types.ts` (all entities/unions/response wrappers listed above), `api/` (7 API functions + `shopify-keys.ts` + query hooks for list/detail/history, including an infinite-query variant for history), `actions/` (mutation hooks for install-url, reauthorize-url, disconnect, sync-webhooks-for-shop), `lib/use-shopify-integration-permissions.ts`.
- Explicitly does not implement: any component, container, controller, page, or `surface-ids.ts`. No UI at all.
- Depends on: nothing (first phase). Reads: this master plan's Types section, `04_api_client(_local).md`, `05_server_state.md`, `08_hooks.md`, `02_types.md`, `24_dto.md`, `19_permissions(_local).md`.

### Phase 2 — Shopify integrations slide page shell, carousel controller, list pane, and create/install flow
- Depends on: Phase 1 (types, query/action hooks, permission helper).
- Creates: `surface-ids.ts` (slide-page surface ID + `ShopifyIntegrationsSurfaceOpeners`), `use-shopify-integrations-page.controller.ts` (activeIndex 0|1|2, selected id, open/go-back actions, refresh actions, `closeSurface` from `surfaceOpeners`), `ShopifyIntegrationsSlidePage.tsx`, `ShopifyIntegrationsCarousel.tsx` (3-pane, `w-1/3` each, `translateX(activeIndex * -33.333333%)`), list container (cards using `StatePill`, empty state, FAB, Close & Back footer, `PullToRefresh`), create container (shop_domain-only form, install-url mutation, browser redirect). The detail pane exists as a minimal placeholder slot in the carousel (loading shell only) — full detail content is Phase 4's responsibility.
- Explicitly does not implement: OAuth result page (Phase 3), any consuming-app route/surface registration (Phase 3), detail pane content (Phase 4), action sheets (Phase 5), webhook subscriptions/history UI (Phase 6).
- Must preserve: no `px-*` on page/carousel/pane-shell wrappers; list pane is the only pane that closes the surface directly; detail/create panes slide back to list only.

### Phase 3 — OAuth result page and consuming app surface/route integration
- Depends on: Phase 1 (types/query invalidation target), Phase 2 (surface IDs, list query to invalidate).
- Unblocked: route path and Settings placement are both resolved (see "Resolved clarifications" #2, #3).
- Route: `ShopifyOAuthResultPage.tsx` is mounted in managers-app at `/settings/integrations/shopify/oauth-result`, matching the `SHOPIFY_OAUTH_REDIRECT_URL` value the backend operator must configure (production: `https://managers.beyoworkaroundtheclock.com/settings/integrations/shopify/oauth-result`; local: `http://localhost:5173/settings/integrations/shopify/oauth-result`). Setting that backend env var is a deployment prerequisite this plan documents but does not perform (no `.env` changes in scope).
- Entry point: managers-app → Settings → Integrations → Shopify opens the `ShopifyIntegrationsSlidePage` surface. Exact placement within `SettingsPage.tsx` (new row vs. sub-page) is a Phase 3 implementation detail, not a remaining blocker.
- Creates: `ShopifyOAuthResultPage.tsx` (parses `success`/`shop_domain`/`error_code`, invalidates shop list on success, links back to the slide page), managers-app route registration for that page at the path above, managers-app `surfaces.ts` registration of the slide page via a loader function (`loadShopifyIntegrationsSlidePage`), one Settings → Integrations → Shopify entry point inside managers-app that calls `openSurface` with an assembled `surfaceOpeners` object.
- Explicitly does not implement: detail/action-sheet/webhook features (Phases 4–6), the backend `.env` change itself.

### Phase 4 — Shopify shop detail view
- Depends on: Phase 1, Phase 2 (carousel/controller must already support a `selectedShopIntegrationId` slot).
- Creates: `ShopifyIntegrationDetailContainer.tsx` (own detail query), header (shop name/domain title, `created_by` `UserPill`, `StatePill` status, three-dot menu button — button exists and is wired to a controller callback, but the sheet it opens is built in Phase 5), scopes section, technical-details table (`FormFieldContainer`/`FieldLabelRow`, `updated_by` `UserPill`), error preview trigger + `ShopifyErrorSheetContent`/`ShopifyIntegrationErrorSheetPage` (self-contained, X-icon close), webhook subscription summary preview trigger (counts only — the sheet it opens is built in Phase 6), fixed Back/Edit footer (Edit is visual/no-op in v1).
- Explicitly does not implement: action sheet content (reauthorize/sync/disconnect — Phase 5), webhook subscriptions list sheet and webhook history timeline (Phase 6).

### Phase 5 — Shop action sheet and admin/manager actions
- Depends on: Phase 1 (mutations), Phase 4 (detail header's three-dot menu + selected-shop context).
- Creates: `ShopifyIntegrationActionSheetContent.tsx` + `ShopifyIntegrationActionsSheetPage.tsx`, reauthorize action (mutation → redirect to `install_url`), sync-webhooks action (mutation → invalidate detail + history → `notify.success`), disconnect action (`ConfirmActionButton` → mutation → invalidate list/detail/history → return to list or update detail state to `disabled`), role-gating via `useShopifyIntegrationPermissions` booleans (not raw role checks) on every row.
- Explicitly does not implement: webhook subscriptions/history UI (Phase 6).

### Phase 6 — Webhook subscriptions and webhook history UI
- Depends on: Phase 1 (history query/infinite-query hooks), Phase 4 (existing preview trigger stubs in the detail page).
- Creates: `ShopifyWebhookSubscriptionsPreview.tsx` + `ShopifyWebhookSubscriptionsSheetContent.tsx`/`ShopifyWebhookSubscriptionsSheetPage.tsx` (self-sufficient, own query against Route 3's detail response), `ShopifyWebhookHistory.tsx` + `ShopifyWebhookHistoryRecordCard.tsx` (branches on `record_type`, initial `limit=3`, "Show more" pages of 5, expand-to-safe-fields-only behavior, zero `raw_payload` exposure anywhere).
- Explicitly does not implement: anything beyond wiring these two features into the existing detail page's already-built trigger points.

### Phase 7 — Polish, loading/error/empty states, role behavior, tests, runtime validation, and frontend handoff
- Depends on: Phases 1–6 complete.
- Creates: final skeleton/empty/error states across every pane and sheet, accessibility pass, full role-behavior verification for all 4 roles, Vitest unit/component tests, Playwright specs (mobile then desktop per `34_runtime_validation_local.md`), finalized `index.ts` public API (loader functions for every surface page per §14, no default exports, no internal-helper leaks), a frontend handoff document mirroring the backend handoff's style for any future consuming app.
- Explicitly does not implement: new features — hardening and validation of Phases 1–6 only.

## Acceptance criteria

1. Every backend route referenced by any child plan matches the 20260709 handoff exactly (path, method, roles, request/response field names) — no invented fields.
2. `@beyo/shopify` never imports an app-specific route, surface ID, or navigation function; all app-specific wiring flows through `surfaceOpeners`/surface props supplied by the consuming app.
3. No child plan phase implements another phase's listed responsibilities ahead of schedule.
4. The frontend never calls `/api/v1/shopify/webhooks` or `GET /api/v1/integrations/shopify/oauth/callback`, and never renders `raw_payload`, access tokens, OAuth codes, or HMAC/signature values anywhere.
5. Role behavior matches the table in "Permission model" exactly, expressed as booleans passed to presentational components, never raw role checks in components.
6. Page/carousel/pane-shell spacing rules (`no default px-*`) are preserved in every phase that touches layout.
7. This master plan implements no code, creates no child plans, and modifies neither the backend nor the backend handoff nor the intention document.

## Risks and mitigations

- Risk: the backend operator sets `SHOPIFY_OAUTH_REDIRECT_URL` to a value that doesn't match `/settings/integrations/shopify/oauth-result`, causing the redirect to 404 or land on the wrong frontend route.
  Mitigation: the exact production and local URLs are fixed in "Resolved clarifications" #2; the Phase 3 child plan must state them as a deployment prerequisite and the validation plan must confirm the deployed env var matches before marking Phase 3 complete.
- Risk: A child plan re-reads `packages/tasks` or another reference package broadly "for style," pulling in task-specific patterns (multi-action FAB, scanner prewarm, staged forms) that don't belong in Shopify.
  Mitigation: the "Targeted implementation references" table is the exhaustive whitelist; child plans must cite it, not re-derive their own reference list.
- Risk: Deferred routes (workspace sync, scope status) get partially built as "just in case" scaffolding, creating dead code.
  Mitigation: explicit decision above — do not create any file for these two routes in v1.
- Risk: `last_health_check_status` and `ShopifyIntegrationEventType`'s full value set aren't fully enumerated by the handoff, risking an incomplete union that breaks on an unseen value.
  Mitigation: Phase 1 models `last_health_check_status` as `string | null` (not a closed union) and gives `ShopifyIntegrationEventType` a documented fallback-render path for any value outside the 4 known ones, rather than assuming completeness.

## Validation plan

Validation is executed per-phase by each child plan (see each phase's own plan for concrete commands); this master plan defines no code to validate directly. Every child plan must include, at minimum:
- `npm run typecheck` — zero errors introduced.
- `npm run test -- --grep shopify` — relevant Vitest suite passes (from Phase 1 onward, as hooks/types are added).
- `npx playwright test --grep shopify --project=mobile` / `--project=desktop` — required starting Phase 2 (first testable UI), mandatory completion gate in Phase 7.

## Review log

- `2026-07-10` Claude: Master plan drafted from `shopify_integration_2.md` intention doc + `HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`; cleanup notes applied without editing the source intention file; two genuine blockers identified and scoped to Phase 3 only.
- `2026-07-10` User: Resolved both Phase-3-scoped blockers — OAuth redirect frontend route (`/settings/integrations/shopify/oauth-result`, with production/local full URLs) and Settings entry-point placement (Settings → Integrations → Shopify).
- `2026-07-10` Claude: Applied both resolutions to "Resolved clarifications" and Phase 3; no other blockers found; promoted status to `approved`.

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging` only if a child plan's implementation surfaces a defect requiring master-plan revision; otherwise the master plan requires no further transitions — child plans (Phase 1 onward) proceed independently under this approved master plan.
- Transition owner: `Claude`
