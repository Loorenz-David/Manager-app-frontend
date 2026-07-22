# PLAN_presentation_phase9_phone_apps_wiring_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase9_phone_apps_wiring_20260722`
- Status: `approved`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 9)
- Note: Re-validated 2026-07-23 — Phase 8 shipped as planned (`@beyo/presentations` public API confirmed: provider, surfaces, keys, loaders). Carried from the Phase 8 review: the three surface entry modules use `export default` (zero repo precedent) — this phase's surface registration maps named exports and drops the defaults in the same touch.

## Goal and intent

- Goal: Mount `@beyo/presentations` in the three phone apps (managers, sellers, workers): provider + surface registration + `@source` + per-app `app_key`, plus the realtime refresh (master decision #10): on `app_update_presentation:published` **or** `app_update_presentation:archived`, invalidate the active-presentation query. Full runtime validation across all three apps. (**V3 resolved** — see clarifications.)
- Business/user intent: announcements published from the studio actually reach every targeted user in the app they use, live when connected.
- Non-goals: What's New pages; studio changes; new player features.

## Scope

- In scope: per app (managers `app_key="manager"`, sellers `"seller"`, workers `"worker"`): `@source` registration for `@beyo/presentations` + `@beyo/presentation-runtime` in `index.css`; surface registration via loader functions (`30_dynamic_loading_local.md`); `ActivePresentationProvider` mounted at the authenticated-shell level with injected openers + CTA navigation callback (each app maps `action.route` through its own router); trigger policy: check `/active` on authenticated app boot and on app foreground/resume (per each app's existing lifecycle conventions); realtime: subscribe via `@beyo/realtime` to both `app_update_presentation:published` and `app_update_presentation:archived` (room `workspace:{workspace_id}`, auto-joined on connect; payload `{client_id, logical_client_id, version}` with no outer envelope — a change signal only, carries no content) → invalidate `activePresentationKeys`; provider dedupe prevents double-show (master risk); Vitest where app-level logic is added; Playwright specs per app.
- Out of scope: player internals (fixes go to Phase 8's package as corrections); push notifications.
- Assumptions: Phase 8 shipped; `@beyo/realtime` subscription API per `21_realtime.md`.

- Division of labor (master): this phase creates no styled UI — all player UI ships from `@beyo/presentations`; any missing visual affordance is logged for Claude, never improvised in the apps.

## Clarifications required

- [x] **V3 — RESOLVED (backend team, 2026-07-22)**: Socket.io events `app_update_presentation:published` and `app_update_presentation:archived`, emitted to room `workspace:{workspace_id}` (auto-joined on connect). Payload, no outer envelope: `{ "client_id": "aup_...", "logical_client_id": "aup_...", "version": 2 }` — change signal only; on receipt refetch `/active`. No created/updated events. Documented in backend `04_admin_presentations.md` → "Realtime (socket) events".
- [x] **Timing policy — RESOLVED (user decision, 2026-07-23)**: auto-open **only while on the app's home/root route**, in all three apps; elsewhere defer until the next navigation-to-home or app foreground. Implemented as the trigger predicate each app injects into `ActivePresentationProvider`.

## Acceptance criteria

1. Publish from the studio targeted at `app_keys: ["worker"]` shows in the workers app (and not the others) without reload when connected (realtime), and on next boot when offline at publish time — matching backend eligibility (frontend performs zero eligibility logic).
2. View-state loop verified end-to-end per app: completed presentations never reappear; next eligible one surfaces after terminal action.
3. `presentation_type` respected in real app chrome (modal over current screen; full_screen takeover; slide_page surface) with each app's surface host.
4. CTA `action.route` navigates correctly inside each app (relative in-app path per backend guarantee).
5. Realtime handler only invalidates queries; it never opens surfaces directly; no double-show under simultaneous boot-fetch + socket event.
6. App bundle impact: player chunks are lazy; no player code in any app's boot chunk (verified per `30_dynamic_loading.md`).
7. All three apps pass typecheck; Playwright mobile then desktop suites green per app.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/21_realtime.md`: subscription + invalidation pattern.
- `architecture/28_surfaces.md` (+ `_local`): app surface registration.
- `architecture/30_dynamic_loading.md` (+ `_local`): loader registration, lazy chunks.
- `architecture/14_styling.md` §14: `@source` additions.
- `architecture/23_providers.md`: provider mounting position.
- `architecture/27_responsive.md`: phone-first validation.
- `architecture/11_routing.md`: CTA route mapping per app.
- `architecture/18_performance.md`: boot-impact criterion.
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md` (+ `_local`): per-app specs, mobile-first.

### Local extensions loaded

- `architecture/28_surfaces_local.md`, `architecture/30_dynamic_loading_local.md`, `architecture/34_runtime_validation_local.md`, `architecture/01_architecture_local.md`.

### File read intent — pattern vs. relational

Permitted relational reads: each app's shell (`AppShell.tsx`/root providers — where surface hosts and realtime subscriptions already mount; what exists), `@beyo/realtime` public API, an existing realtime consumer's subscription call (relational: exact subscribe signature in use). Prohibited: broad app reads beyond the shell/provider files.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Resolve V3 (backend source check) + the timing-policy clarification with the user.
2. Wire managers-app first (full path: `@source`, surfaces, provider + trigger predicate, realtime, CTA mapping); validate manually against a studio-published test announcement end-to-end (the first true cross-system validation of the whole capability).
3. Replicate to sellers-app and workers-app (each honoring its own shell conventions).
4. Vitest for any app-level glue introduced.
5. Playwright per app: seeded active presentation → auto-shows → advance → complete → gone on reload; dismissible vs not; CTA navigation; mobile project first, then desktop (per `34_runtime_validation_local.md`; respect the `feedback_playwright_mobile_filtertaps_tap` press/tap helper if a player control sits inside `PullToRefresh`).
6. Cross-app matrix check of criterion 1 (targeting per app_key) against a live backend.

## Risks and mitigations

- Risk: each app's shell differs enough that provider mounting diverges.
  Mitigation: managers-app first (step 2) establishes the recipe; divergences recorded in the review log before replication.
- Risk: auto-show interrupts critical worker flows (e.g., mid step completion).
  Mitigation: the timing-policy clarification exists precisely for this; trigger predicate is injectable per app so workers can be more conservative.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (all workspaces).
- `npm run test:presentations` + affected app suites: green.
- `npx playwright test --grep presentation-player --project=mobile` then `--project=desktop`: green in all three apps.
- Manual cross-system check: studio publish → phone receipt (realtime + cold boot) per criterion 1.

## Review log

- `2026-07-22` Claude: drafted from master Phase 9.

- `2026-07-23` User: approved — Phases 1–8 complete; V3 + timing policy resolved; final phase. Codex session archives the MASTER at close (the only phase allowed to).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `archived` (by the Codex session after green validation, together with the master close-out)
- Transition owner: `Claude`
