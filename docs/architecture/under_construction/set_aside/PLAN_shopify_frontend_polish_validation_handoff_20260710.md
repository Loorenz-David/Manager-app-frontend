# PLAN_shopify_frontend_polish_validation_handoff_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_polish_validation_handoff_20260710`
- Status: `approved`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-09T11:00:00Z`
- Last updated at (UTC): `2026-07-09T11:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 7 of 7, the **final** phase.
- Phase 6 plan (implemented, reviewed, archived): `docs/architecture/archives/implementation/PLAN_shopify_frontend_webhook_subscriptions_history_20260710.md`; summary: `docs/architecture/implemented_summaries/SUMMARY_shopify_frontend_webhook_subscriptions_history_20260710.md`. Reviewed by reading every listed source file directly, independently re-running `npm run typecheck` (zero errors) and both the focused Phase 6 suite (24/24 pass) and the full package sweep (60/61 pass, 1 failure investigated below) — verdict: **approved with minor follow-up**. See "Phase 6 review findings" below.
- All prior phase summaries reviewed for this plan: `SUMMARY_shopify_frontend_package_foundation_api_20260710.md`, `SUMMARY_shopify_frontend_slide_list_create_20260710.md`, `SUMMARY_shopify_frontend_oauth_result_managers_wiring_20260710.md`, `SUMMARY_shopify_frontend_shop_detail_view_20260710.md`, `SUMMARY_shopify_frontend_shop_action_sheet_20260710.md`, `SUMMARY_shopify_frontend_webhook_subscriptions_history_20260710.md`.
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

## Phase 6 review findings (carried into this plan)

**Verdict: approved with minor follow-up.** Read every listed Phase 6 file directly (all 6 new components/lib file, the 3 modified files, and the test files), confirmed via `git status`/`git diff --stat` that only `packages/shopify/**` and doc files changed (zero managers-app, backend, or `.env` files touched). Independently re-ran:
- `npm run typecheck` — zero errors, full monorepo.
- The 6 focused Phase 6 test files directly — 24/24 pass, matching the summary exactly.
- The full package sweep `npx vitest run --environment jsdom packages/shopify/src` — **60 passed, 1 failed** (`ShopifyIntegrationsSlidePage.test.tsx`), matching the summary's reported count.

**Important correction to the Phase 6 summary's own classification.** The summary states the `VITE_API_URL` failure "was outside the Phase 6 files and was not introduced by this implementation." **This is not accurate, and this plan does not repeat it uncritically.** Direct investigation traced the exact cause:
- `ShopifyIntegrationsSlidePage.test.tsx` mocks `../controllers/use-shopify-integrations-page.controller` and `../api/use-get-shopify-shop-query`, but does **not** mock `../api/use-shopify-webhook-history-infinite-query`.
- Phase 6 added `<ShopifyWebhookHistorySection selectedShopIntegrationId={...} />` to `ShopifyIntegrationDetailContainer`'s render tree, which — when rendered inside this specific test's populated-detail-state assertion — now imports the **real, unmocked** `useShopifyWebhookHistoryInfiniteQuery` → `getShopifyWebhookHistory` → `@beyo/api-client`, whose `env.ts` throws at module-load time because `VITE_API_URL` is unset in this bare `npx vitest run` invocation (no `vite.config.ts`/`.env` is loaded when running package tests directly).
- Confirmed via the Phase 5 implemented summary: the identical full-sweep command (`npx vitest run --environment jsdom packages/shopify/src`) reported **21 files, 48 tests, zero failures** immediately after Phase 5 — before Phase 6 added the history section. This is direct, dated proof the regression appeared exactly when Phase 6 wired the new section in.

**Conclusion: this is a genuine (if trivial and mechanical) regression introduced by Phase 6** — a one-line missing test mock in a pre-existing test file, not a pre-existing or unrelated environment problem. It is **not treated as blocking** for the following reasons, all satisfied simultaneously:
1. The production code itself is entirely correct — `ShopifyWebhookHistorySection` and every other Phase 6 file typecheck cleanly and are independently, correctly unit-tested (24/24 pass) with proper mocks in their own test files.
2. Every other pre-existing test file still passes; exactly one file is affected, and the fix is a single, mechanical, already-precisely-diagnosed line (mirroring the exact mock pattern the same test file already uses for `use-get-shopify-shop-query`).
3. `npm run typecheck` passes with zero errors — no type-level regression.
4. The master plan's own Phase 6 scope did not ask for test-environment hardening; Phase 7 (this plan) explicitly includes "resolve or document the broad Shopify Vitest environment issue" as in-scope, so deferring the fix here is a normal phase-boundary decision, not a dropped ball.

This plan's Implementation plan (step 1 below) fixes this exact regression, with the precise one-line addition already identified.

Also carried forward from prior reviews (see intro sections below for full detail): the Phase 2 cosmetic follow-ups (missing `bg-background`, missing `min-w-0`) remain unaddressed and are back in scope for this phase; the Phase 3 rolldown/Vitest environment issue was already resolved as a side effect of the Phase 4 review's `npm install`.

## Goal and intent

- Goal: Close out the Shopify frontend integration — fix the known cosmetic/test-environment follow-ups, verify the full flow end-to-end via a manual QA pass, and produce a frontend handoff document so any future consumer (a second app, an ops engineer, a future phase) has a single authoritative reference.
- Business/user intent: Ship a Shopify integration UI that is not just feature-complete (Phases 1–6) but demonstrably correct, consistent, and documented — the difference between "the code exists" and "this is done."
- Non-goals: any new product feature, any new backend route consumption, any workspace-wide sync or scope-status UI, any `.env`/deployment action, any redesign of the phase architecture already executed.

## Scope

- In scope (first three items **already implemented and verified** as of this update):
  - Fix: slide-page root missing `bg-background`; carousel pane wrappers missing `min-w-0` — **done**.
  - Fix: `ShopifyIntegrationsSlidePage.test.tsx`'s missing `use-shopify-webhook-history-infinite-query` mock, plus a follow-on `QueryClientProvider` wrapper the fix exposed as also-needed — **done**, full suite now 24/24 files, 64/64 tests, zero failures.
  - Confirm (not necessarily change) role behavior, OAuth result route behavior, Settings entry behavior, and query-invalidation behavior across all six implemented phases, by direct source re-inspection.
  - Review all package exports (`packages/shopify/src/index.ts`), the Tailwind `@source` setup, and the package dependency declarations for cleanliness — fix only if a real problem is found, not speculatively.
  - Produce a manual QA checklist (admin/manager/worker-seller/OAuth-result/webhook-history flows).
  - Produce the frontend handoff document at `docs/handoff/to_ops/HANDOFF_SHOPIFY_FRONTEND_INTEGRATION_20260710.md` (new folder — see rationale below).
  - Update the master plan's lifecycle section once this phase is verified complete (a documentation update, not an archival action — see "Master plan lifecycle" below).
- Out of scope: any backend route, any `.env` edit, any deployment action, workspace-wide webhook sync UI, scope-status endpoint/query, any broad UI redesign, creating new Playwright spec files (see "Runtime validation approach" below for why this is explicitly out of scope for this phase as instructed).
- Assumptions: none requiring verification before approval — this phase's own scope is fully groundable from already-reviewed, stable Phase 1–6 code; there is no "next phase" whose unimplemented state this plan needs to guess at.

## Runtime validation approach (a deliberate, explained scope decision)

The master plan's original "Validation plan" section states Playwright is a "mandatory completion gate in Phase 7." However, no `tests/playwright/features/shopify/` folder exists yet (confirmed — the existing convention has folders for `tasks`, `auth`, `images`, `cases`, `testing_forms`, `task_creation`, `surfaces`, `upholstery`, but not `shopify`), and this phase's specific, detailed task instructions explicitly ask for a **manual QA checklist**, not new automated Playwright spec files. This plan follows the concrete, current instructions over the master plan's earlier abstract statement: it delivers a thorough manual QA checklist (see below) and explicitly records "no automated Playwright coverage for Shopify yet" as a known limitation in the handoff document, rather than silently expanding this phase's scope to author new `.spec.ts` files that weren't asked for. A future phase/initiative can pick this up explicitly if desired.

## Confirmed current state (re-verified during this plan's drafting; first two items then fixed and re-verified again)

- **Cosmetic follow-up #1**: `ShopifyIntegrationsSlidePage.tsx`'s root `<div>` had only `className="h-full"` — no `bg-background`. **Fixed** — now `className="h-full bg-background"`, verified via re-run of the existing test suite.
- **Cosmetic follow-up #2**: `ShopifyIntegrationsCarousel.tsx`'s three pane wrapper `<div>`s were `flex h-full w-1/3 flex-col` — no `min-w-0`. **Fixed** — now `flex h-full w-1/3 min-w-0 flex-col`, verified via re-run of the existing test suite.
- **Test-environment follow-up**: as detailed above. **Fixed** — see Implementation plan step 1; full package sweep now 24/24 files, 64/64 tests, zero failures.
- **`node_modules`/`package-lock.json` stability**: confirmed present and healthy (458 top-level `node_modules` entries, `@beyo/shopify` symlink intact) as of this review. This plan does **not** delete or destructively reset either — no `rm -rf node_modules`, no `npm ci`, no lockfile regeneration beyond what a normal `npm install` (if genuinely needed) would produce.
- **Package dependency setup**: `packages/shopify/package.json`'s peer dependencies are unchanged since Phase 2 (`@beyo/api-client`, `@beyo/auth`, `@beyo/hooks`, `@beyo/lib`, `@beyo/ui`, `@hookform/resolvers`, `@tanstack/react-query`, `lucide-react`, `react`, `react-hook-form`, `zod`) — no dependency creep across Phases 3–6, confirming clean hygiene. No action needed here beyond confirming this in the handoff doc.
- **`@source` setup**: confirmed present in `apps/managers-app/.../src/index.css` (`@source "../../../../packages/shopify/src";`), added correctly in Phase 3, untouched since.
- **Role behavior** (re-confirmed from `useShopifyIntegrationPermissions()` and its Phase 1 test): admin — all 6 booleans true; manager — view/create-install/create-reauthorize/view-history true, disconnect/sync false; worker/seller — all false. Matches the master plan's spec exactly across every phase that consumes it (list FAB, create pane, action sheet rows).
- **Query invalidation behavior**, re-confirmed end-to-end across phases:
  - Install-url redirect (Phase 2): no invalidation before redirect (by design — user leaves for OAuth).
  - OAuth result page success (Phase 3): invalidates `shopifyKeys.shops()`.
  - Reauthorize redirect (Phase 5): no invalidation before redirect (by design).
  - Webhook sync (Phase 5): the action hook itself invalidates `shopifyKeys.shopDetail(id)` + `shopifyKeys.webhookHistoryRoot(id)`; the action sheet additionally invalidates `shopifyKeys.shops()` at the calling layer.
  - Disconnect (Phase 5): the action hook invalidates `shopifyKeys.shops()` (which, via TanStack Query's key-prefix nesting, also covers `shopifyKeys.shopDetail(id)`) + `shopifyKeys.webhookHistoryRoot(id)`.
  - Detail pull-to-refresh (Phase 6): refetches the shop-detail query and invalidates `shopifyKeys.webhookHistoryRoot(id)`.
  All of the above were built correctly in their originating phases and need no code change here — this phase only needs to *confirm* them (done) and reflect them accurately in the handoff document.

## Acceptance criteria

1. **Done.** `ShopifyIntegrationsSlidePage.tsx`'s root gained `bg-background`; `ShopifyIntegrationsCarousel.tsx`'s three pane wrappers gained `min-w-0` — confirmed via re-run of the existing automated `px-*`/class assertions, no regression.
2. **Done.** `ShopifyIntegrationsSlidePage.test.tsx` gained the missing mock plus a `QueryClientProvider` wrapper (a second, related gap the mock fix exposed); the full package sweep (`npx vitest run --environment jsdom packages/shopify/src`) now passes with **zero** failures (24 files, 64 tests).
3. **Done.** `npm run typecheck` passes with zero errors after all changes.
4. A manual QA checklist exists, covering admin/manager/worker-seller/OAuth-result/webhook-history flows as specified below.
5. `docs/handoff/to_ops/HANDOFF_SHOPIFY_FRONTEND_INTEGRATION_20260710.md` exists, covering every required section listed below.
6. The master plan's "Lifecycle transition" section is updated to reflect all 7 phases complete — the master plan itself is **not** archived as part of this phase's execution (that remains a separate, later decision, consistent with how child plans have been archived individually throughout this project rather than the master plan being touched).
7. No new product feature, backend route, `.env` edit, or Playwright spec file is added.

## Contracts and skills

### Contracts loaded

- `14_styling.md` — confirms the `@source` setup is correct and that the two cosmetic fixes (`bg-background`, `min-w-0`) don't require any new `@source` entry.
- `17_testing.md` — Vitest conventions for the one-line mock fix to `ShopifyIntegrationsSlidePage.test.tsx`.
- `27_responsive.md` — confirms the cosmetic fixes' mobile-first rationale (why `min-w-0` matters on a fixed-width flex row).
- `28_surfaces.md` + `28_surfaces_local.md` — used to confirm (not change) that both registered surfaces (`SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` slide, `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` sheet) are correctly typed and registered.
- `30_dynamic_loading.md` + `30_dynamic_loading_local.md` — used to confirm (not change) that every surface page is exposed via a loader function, never a static re-export, per the package's `index.ts`.
- `35_shared_packages.md` — used to confirm (not change) package dependency/peer hygiene and the loader-function/`surfaceOpeners` boundary rules held across all 6 phases.

### Explicitly excluded (with reason)

- `34_runtime_validation.md` + `34_runtime_validation_local.md` — deliberately not used to author new Playwright specs (see "Runtime validation approach" above); this phase's runtime validation is a manual QA checklist instead.
- `07_components.md`, `10_pages.md`, `24_dto.md`, `19_permissions(_local).md` — no new component/page/DTO/permission logic is introduced; every relevant behavior already exists and is only being confirmed, not built.
- `05_server_state.md`, `08_hooks.md` — no new query/hook is introduced; the invalidation review is a read-only confirmation of existing, already-tested behavior.

### File read intent — pattern vs. relational

This phase's relational reads are the full set of Phase 1–6 files re-confirmed above and throughout every prior phase review in this project — no new implementation file needs to be read for "how to write" purposes, since nothing new is being designed. The two cosmetic fixes and the one test-mock fix are precisely located, single-line changes to already-known files.

## Implementation plan

**Steps 1–3 below have been implemented and independently verified as of this update** (not left for a future Codex session — applied directly during this review pass, since they were fully diagnosed, one-line, low-risk fixes already specified here).

1. **Fix the Phase 6 test regression** — `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx`: added
   ```ts
   const useShopifyWebhookHistoryInfiniteQueryMock = vi.fn();

   vi.mock("../api/use-shopify-webhook-history-infinite-query", () => ({
     useShopifyWebhookHistoryInfiniteQuery: (...args: unknown[]) =>
       useShopifyWebhookHistoryInfiniteQueryMock(...args),
   }));
   ```
   plus a `beforeEach` default return value, mirroring the existing `useGetShopifyShopQueryMock` pattern. **Applying this fix uncovered a second, previously-masked issue**: once the module-load-time crash was silenced, all 3 tests in this file failed with `No QueryClient set, use QueryClientProvider to set one` — because Phase 6 also added a raw `useQueryClient()` call inside `ShopifyIntegrationDetailContainer` (for the pull-to-refresh history invalidation), and this test never wrapped its renders in a `QueryClientProvider`. This was invisible before because the earlier env-validation crash happened first, before rendering ever got far enough to reach that hook. Fixed by adding the exact same `renderWithQueryClient(ui)` helper (`QueryClient` + `QueryClientProvider`, `retry: false`) already established in the sibling `ShopifyIntegrationDetailContainer.test.tsx`, and switching all 3 `render(<ShopifyIntegrationsSlidePage />)` call sites to use it. **Verified**: `npx vitest run --environment jsdom packages/shopify/src` now passes **24 files, 64 tests, zero failures** (up from the prior 60/61); `npm run typecheck` still passes with zero errors.

2. **Cosmetic fix #1** — `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`: root `<div className="h-full" ...>` changed to `<div className="h-full bg-background" ...>`. **Applied and verified** — the existing `.not.toMatch(/\bpx-\d+/)` assertion still passes (`bg-background` doesn't match that pattern), confirmed via the full re-run above.

3. **Cosmetic fix #2** — `packages/shopify/src/components/ShopifyIntegrationsCarousel.tsx`: each of the three pane wrapper `<div className="flex h-full w-1/3 flex-col">` changed to `<div className="flex h-full w-1/3 min-w-0 flex-col">`. **Applied and verified** — `ShopifyIntegrationsCarousel.test.tsx`'s existing transform/class assertions still pass, confirmed via the full re-run above.

4. **Confirm-only pass (no code change expected)** — re-read and re-verify, recording findings in the handoff document rather than changing code:
   - `packages/shopify/src/index.ts`'s full export list — confirm no dead/unused export, no accidental default export, every surface page exposed via a loader function.
   - `apps/managers-app/.../src/index.css`'s `@source` line for `@beyo/shopify`.
   - `apps/managers-app/.../package.json`'s `"@beyo/shopify": "*"` dependency declaration.
   - Role behavior via `useShopifyIntegrationPermissions()`'s existing test (already 100% correct, per Phase 1's test and every consuming phase's test).
   - Query invalidation behavior across install-url/OAuth-result/reauthorize/sync/disconnect/pull-to-refresh (already documented above from direct source confirmation).

5. **Manual QA checklist** — add to this plan's own body (reproduced in full below) and to the handoff document; this is documentation, not code.

6. **Frontend handoff document** — create `docs/handoff/to_ops/HANDOFF_SHOPIFY_FRONTEND_INTEGRATION_20260710.md` (new folder — the existing `docs/handoff/` only has `from_backend`/`to_backend`; `to_ops` is a new, clearly-named sibling for "frontend work is done, here's what any future consumer/operator needs to know," matching the existing `<direction>_<party>` naming convention). Content structure specified below.

7. **Master plan lifecycle update** — after this phase's own validation passes, edit `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md`'s "Lifecycle transition" section to record all 7 phases complete (a text update, not a status/folder change — the master plan is not moved to `docs/architecture/archives/` as part of this step).

## Manual QA checklist (to be run against a real or staging environment with `SHOPIFY_*` env vars configured)

### Admin happy path
- [ ] Open managers-app, sign in as admin.
- [ ] Settings → Integrations → Shopify entry is visible; tapping it opens the Shopify integrations slide.
- [ ] Empty state ("No Shopify shops are connected yet.") appears if no shops exist; "Connect a shop" opens the create pane.
- [ ] Entering `my-shop.myshopify.com` and submitting redirects the browser to a Shopify-hosted install URL.
- [ ] After completing Shopify's consent screen, the browser lands on `/settings/integrations/shopify/oauth-result?success=true&shop_domain=...` and shows the success state.
- [ ] "View Shopify integrations" navigates back to Settings; reopening Shopify integrations shows the new shop in the list.
- [ ] Opening the shop's detail pane renders health/status, scopes, technical details, error preview (or calm "No current errors."), webhook subscription summary, and webhook activity history.
- [ ] The three-dot menu opens the action sheet; admin sees Reauthorize (only if scopes outdated), Sync webhooks, and Disconnect.
- [ ] Sync webhooks shows "Webhook sync started." and the detail/history refresh.
- [ ] Disconnect (two-tap `ConfirmActionButton`) shows "Shopify integration disconnected.", closes the sheet, and the shop's status updates to `disabled` without disappearing from the list.

### Manager behavior
- [ ] Manager sees Settings → Integrations → Shopify, can list shops, open detail, and connect a new shop.
- [ ] Manager sees Reauthorize only when a shop's scopes are outdated.
- [ ] Manager does **not** see Sync webhooks or Disconnect in the action sheet.

### Worker/seller behavior
- [ ] Worker and seller do not see the Settings → Integrations → Shopify entry at all.
- [ ] (Not directly testable from the UI, but confirmed by the backend handoff) any direct attempt still gets a 401/403 from the backend — the frontend hiding is UX only, never relied on as the security boundary.

### OAuth result page
- [ ] `?success=true&shop_domain=...` renders the success state and the shop domain.
- [ ] `?success=false&error_code=access_denied` (and each of the other 8 known error codes) renders the matching friendly failure message.
- [ ] Missing or unrecognized `success`/`error_code` values render the generic failure fallback, never a crash or raw error code text.
- [ ] No access token, OAuth code, HMAC, or secret value is ever expected, read, or displayed on this page.

### Webhook subscriptions/history behavior
- [ ] Pull-to-refresh on the detail pane refreshes both the shop detail and the webhook history section.
- [ ] "Show more" in the history section loads additional records (5 at a time after the initial 3) and hides itself once no more pages remain.
- [ ] No `raw_payload` text or JSON blob ever appears anywhere in the history section.
- [ ] Integration events show a `UserPill` when `created_by` is present, or a deterministic system-source label ("Shopify webhook" / "Background worker" / "System") when it is not — never "Unknown user" for a system-generated event, never a raw client id.
- [ ] Metadata preview (when present) shows at most 4 simple scalar rows, never a nested object/array.

## Frontend handoff document content (structure to create in step 6)

`docs/handoff/to_ops/HANDOFF_SHOPIFY_FRONTEND_INTEGRATION_20260710.md` must include:
- **Metadata**: handoff ID, created-at, owner agent, source master plan + all 6 child plans (archived paths + summaries).
- **Package created**: `@beyo/shopify` at `packages/shopify`, app-agnostic, consumed first by `managers-app`.
- **Managers-app route added**: `/settings/integrations/shopify/oauth-result`.
- **Settings entry**: Managers app → Settings → Integrations → Shopify.
- **Surfaces registered**: `SHOPIFY_INTEGRATIONS_SLIDE_SURFACE_ID` (slide), `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` (sheet), both in `apps/managers-app/.../src/features/shopify-integrations/surfaces.ts`.
- **Backend env prerequisite** (informational — this plan does not set it): production `SHOPIFY_OAUTH_REDIRECT_URL=https://managers.beyoworkaroundtheclock.com/settings/integrations/shopify/oauth-result`; local `SHOPIFY_OAUTH_REDIRECT_URL=http://localhost:5173/settings/integrations/shopify/oauth-result`.
- **Backend routes consumed**: the 7 first-version routes (install-url, list, detail, reauthorize-url, disconnect, sync-webhooks-for-shop, webhook-history), with roles per route.
- **Deferred backend routes not consumed**: workspace-wide webhook sync (`POST /webhooks/sync`), standalone scope-status (`GET /scopes`) — with the master plan's rationale for deferring both.
- **Role behavior**: the exact admin/manager/worker/seller matrix from `useShopifyIntegrationPermissions()`.
- **No-secret/no-raw-payload guarantees**: what the frontend never models/renders (tokens, codes, HMAC, `raw_payload`), and that this is backend-enforced, not just a frontend convention.
- **Manual QA checklist**: reproduced from this plan.
- **Validation commands and results**: `npm run typecheck`, the full `npx vitest run --environment jsdom packages/shopify/src` sweep (now 0 failures after step 1's fix), and the managers-app settings-controller test.
- **Known limitations / deferred follow-ups**: no automated Playwright coverage for Shopify yet (explicit, explained scope decision — see "Runtime validation approach"); workspace-wide sync/scope-status UI deferred; webhook subscriptions sheet deferred in favor of the existing inline preview (Phase 6 decision); `redirect_after_success` customization not exposed.

## Risks and mitigations

- Risk: the `min-w-0` fix subtly changes carousel pane sizing in a way existing tests don't catch.
  Mitigation: `ShopifyIntegrationsCarousel.test.tsx`'s existing `translateX`/class assertions are re-run as part of this phase's validation; `min-w-0` only affects flex-shrink behavior for overflow content, not the pane's own `w-1/3` sizing, so no visual regression is expected — confirmed by the same reasoning already recorded in the Phase 5 review.
- Risk: the handoff document becomes stale the moment a future phase (e.g., an eventual Phase 8 for a second consuming app) changes any of the facts it records.
  Mitigation: not this phase's concern to solve structurally — the handoff is a point-in-time snapshot, matching the convention already established by the backend's own handoff documents in this repo (`docs/handoff/from_backend/*`), which are dated snapshots, not living documents.

## Validation plan

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck
npx vitest run --environment jsdom packages/shopify/src
```
Expected: zero typecheck errors; **zero** Vitest failures (the fix in step 1 resolves the one known failure).

```
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers
npx vitest run src/features/settings/controllers/use-settings-view.controller.test.tsx
```
Expected: 2/2 pass (already confirmed passing as of the Phase 5/6 reviews).

No backend tests required. No new Playwright spec required (see "Runtime validation approach"); the manual QA checklist above is this phase's runtime-validation deliverable instead.

## Review log

- `2026-07-09` Claude: Phase 6 reviewed directly against merged source — approved with minor follow-up. Corrected the implemented summary's inaccurate claim that the `VITE_API_URL` test failure was pre-existing/unrelated: traced it precisely to Phase 6's own `ShopifyWebhookHistorySection` addition breaking an existing test's mock coverage, confirmed via the Phase 5 summary's clean full-sweep result as a before/after comparison point. Phase 7 plan drafted to fix this plus the two still-open Phase 2 cosmetic follow-ups, produce a manual QA checklist (per this task's explicit instructions, not new Playwright specs), and produce the frontend handoff document. No blockers — plan approved directly.

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging` only if Codex's execution surfaces a defect requiring plan revision; otherwise this plan is ready for Codex to execute directly. Once implemented and its own summary is reviewed, the master plan's lifecycle section should be updated per step 7 above — a separate, later action, not performed by this plan itself.
- Transition owner: `Claude`
