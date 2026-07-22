# PLAN_presentation_phase9_corrections_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase9_corrections_20260722`
- Status: `debugging`
- Owner agent: `Codex (logic)`
- Created at (UTC): `2026-07-22T19:44:23Z`
- Last updated at (UTC): `2026-07-22T20:31:11Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`
- Related phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase9_phone_apps_wiring_20260722.md`
- Review finding source: Phase 9 implementation review, 2026-07-22

## Goal and intent

- Goal: complete the missing Phase 9 phone-app wiring, realtime invalidation, home-route timing policy, runtime validation, and final lifecycle close-out.
- Business/user intent: make studio-published announcements reach only eligible users in the managers, sellers, and workers apps, live while connected and on the next boot otherwise.
- Non-goals: new player chrome; a What's New/history page; frontend audience or eligibility logic; studio changes; backend changes; any restyling of the Phase 8 player kit.

## Scope

- In scope:
  - **F1 — Codex (logic), critical:** mount `@beyo/presentations` in all three authenticated app shells with the exact `appKey` (`manager`, `seller`, `worker`), injected surface openers, CTA navigation through each app router, home/root-only auto-show gating, dependencies, and Tailwind `@source` entries.
  - **F2 — Codex (logic), critical:** register all three presentation surfaces in every app through loader functions and `lazyWithPreload`; expose named context-consuming surface entry exports and remove the three carried default exports.
  - **F3 — Codex (logic), critical:** add the two backend presentation events to the shared realtime event contract and each app registry; handlers may only invalidate `activePresentationKeys` and must never open a surface.
  - **F4 — Codex (logic), high:** extend the provider's public injection seam as needed to enforce the recorded timing policy, and test home navigation/foreground deferral plus the boot-fetch/socket invalidation race without double-show.
  - **F5 — Codex (logic), high:** add deterministic Vitest/Playwright and bundle validation for all three apps, including the missing sellers Playwright setup and a command path that makes the phase's mobile-first then desktop validation resolvable.
  - **F6 — Codex (logic), high:** run and record the live cross-app targeting matrix and full view-state/CTA/presentation-type flows.
  - **F7 — Codex (logic), medium:** only after every gate is green, write the Phase 9 summary, archive the Phase 9 plan, append the all-phases-complete master entry, set the master status to `archived`, and move the master to `archives/implementation/`.
- Out of scope: modifications to player DOM/classes/design tokens; builder/runtime behavior unrelated to the host wiring; any frontend filter based on audience targets; `GET /history`; push notifications.
- Assumptions:
  - Phase 8's player/view-state implementation remains the starting point and its existing 10 tests stay green.
  - The backend event payload is exactly `{ client_id, logical_client_id, version }`, with no envelope.
  - All three apps' home route is `ROUTES.home` (`/`).

## Clarifications required

- None. V3 and the home/root-only timing policy are already resolved in the approved Phase 9 plan.

## Acceptance criteria

1. **F1/F4 — Codex (logic):** each authenticated shell mounts one `ActivePresentationProvider` with its exact app key, surface opener callbacks backed by that app's `useSurfaceStore`, and a CTA callback backed by that app's router. `/active` may be fetched on authenticated boot and foreground, but a surface opens only while `pathname === ROUTES.home`; data found elsewhere remains deferred until a later home navigation or foreground event that occurs on home.
2. **F2 — Codex (logic):** every app declares `@beyo/presentations` and `@beyo/presentation-runtime`, sources both packages from `index.css`, and spreads a presentation surface registration into its registry. All modal/full-screen/slide-page registrations use `lazyWithPreload` over loader functions that map named context-consuming entry exports. No `export default` remains in the three presentation surface entry modules.
3. **F3 — Codex (logic):** `ServerToClientEvents` declares both `app_update_presentation:published` and `app_update_presentation:archived` with the documented payload. Every app registry subscribes to both through the canonical registry pattern. The shared/app handler performs only `queryClient.invalidateQueries` using `activePresentationKeys`; it imports no surface store/opener and calls no navigation or player function.
4. **F1 — Codex (logic):** the manager/seller/worker values are the only app keys passed by their respective apps. No app reads presentation audience targets or implements role/workspace/user/app eligibility filtering; the backend remains the sole eligibility owner.
5. **F4 — Codex (logic):** provider/glue tests prove (a) boot data opens once on home, (b) boot data does not open off-home, (c) navigation to home releases deferred data, (d) foreground on home refetches/releases while foreground off-home does not open, and (e) a simultaneous boot response plus either socket event still opens exactly once.
6. **F1/F6 — Codex (logic):** end-to-end coverage per app proves completed presentations do not reappear, the next eligible presentation surfaces after terminal action, all three `presentation_type` values use the real app surface hosts, dismissible/non-dismissible exits work, and CTA routes navigate within the current app.
7. **F5 — Codex (logic):** presentation-player Playwright specs exist for managers, sellers, and workers. Each app has usable `mobile` and `desktop` projects (or an equivalent root aggregate configuration), and the phase commands run mobile first then desktop without project-resolution errors or `No tests found`.
8. **F5 — Codex (logic):** production builds for all three apps contain the player/runtime only in lazy presentation chunks; no boot entry chunk imports player code. The bundle evidence names the inspected entry and presentation chunks for each app.
9. **F6 — Codex (logic):** a recorded live matrix publishes one announcement for each single `app_key` and verifies receipt only in the matching app, both realtime-connected and cold-boot paths. The evidence explicitly confirms no frontend eligibility calculation.
10. **F7 — Codex (logic):** `npm run typecheck`, `npm run test:presentations`, all added app/glue suites, all mobile/desktop presentation-player Playwright runs, the bundle audit, and the live matrix are green before lifecycle processing. Then and only then the Phase 9 summary exists, the Phase 9 plan and master are archived with correct statuses, and the master Review log contains the final all-phases-complete entry. This corrections plan remains in place for independent re-review.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md`, `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`: core layer, query, and package discipline.
- `architecture/07_components.md`, `23_providers.md`: provider/glue owns orchestration; player components remain props/context-only.
- `architecture/11_routing.md`: app-owned CTA navigation and home-route comparison.
- `architecture/14_styling.md` §14: explicit package `@source` registration.
- `architecture/17_testing.md`, `27_responsive.md`, `34_runtime_validation.md`: deterministic mobile-first and desktop runtime coverage.
- `architecture/18_performance.md`, `30_dynamic_loading.md`: lazy player registration and boot-chunk verification.
- `architecture/21_realtime.md`: typed registry handlers and invalidation-only event processing.
- `architecture/28_surfaces.md`: app-owned surface registration and host behavior.
- `architecture/35_shared_packages.md` §13–14: injected surface/navigation boundaries and package loader functions.
- `docs/presentation_capability/backend/02_conventions.md`, `03_consumer_endpoints.md`, `04_admin_presentations.md`, `06_admin_audience.md`: exact app-scope, active/view-state, realtime, and backend-only eligibility contracts.

### Local extensions loaded

- `architecture/01_architecture_local.md`: local route-entry conventions.
- `architecture/28_surfaces_local.md`: active slide/sheet/modal host types.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` registration conventions.
- `architecture/34_runtime_validation_local.md`: app config, project, fixture, and console/page-error conventions.

### File read intent — pattern vs. relational

Before reading implementation outside this correction scope, apply `task_system/frontend_contract_goal_mapping_guide.md`:

> Read contracts to learn how to write; read implementation files only to learn what already exists.

- Relational reads are limited to the three app shells, root/provider order, routers/routes, surface/socket registries, `index.css`, package manifests, the presentations public API/provider/surface entries, realtime public types, and the affected Playwright configs/spec directories.
- Do not read unrelated feature controllers/hooks/providers for patterns.
- Do not modify Phase 8 player component DOM/classes/styling. Any visual deficiency must be separately routed to **Claude-builder (visual)**; this review found none.

### Skill selection

- Primary skill: none.
- Trigger terms: none.
- Excluded alternatives: no available skill is needed for this scoped React/realtime/app-wiring correction.

## Implementation plan

1. First add the minimal package-level public seams: named context-consuming surface entry exports (drop defaults), a tested home-route auto-show gate on the provider, and typed published/archived realtime events.
2. Build a reusable invalidation-only presentation socket handler with unit tests proving both events touch only `activePresentationKeys` and cannot open surfaces.
3. Wire managers-app end to end: dependencies and sources, lazy presentation surfaces, provider/openers/navigation/home predicate, and both registry events. Run its unit, mobile Playwright, desktop Playwright, and bundle checks before replication.
4. Replicate the validated recipe to sellers-app and workers-app using each shell/router convention and exact app key. Add the missing sellers Playwright configuration/scripts needed for equivalent mobile/desktop validation.
5. Add race/timing tests and per-app end-to-end specs for view-state terminal behavior, all surface types, dismissibility, CTA routing, off-home deferral, and cold boot.
6. Run the live one-app-key-at-a-time targeting matrix and record realtime and cold-boot outcomes without adding eligibility code.
7. Run the complete validation set and inspect production bundle manifests/chunks for each app.
8. Only after every result is green, write the Phase 9 summary and perform the child-plan plus master archival close-out. Leave this correction plan for independent review.

## Risks and mitigations

- Risk: the timing gate prevents an off-home open but never reevaluates when the user returns home.
  Mitigation: make route/foreground state an explicit reactive input to the provider and test both release paths.
- Risk: boot fetch and socket invalidation resolve together and open two surfaces.
  Mitigation: retain the provider as the sole opener, keep socket handlers invalidation-only, and assert a single open under both event races.
- Risk: importing the presentations barrel from app boot code defeats lazy loading because it re-exports player components.
  Mitigation: expose/use loader functions whose dynamic imports terminate at the surface entry modules, then inspect Vite output rather than trusting source syntax alone.
- Risk: copying the managers recipe hardcodes its app key or route assumptions into the other apps.
  Mitigation: keep host glue app-local, assert the three exact app keys, and run the cross-app matrix.
- Risk: lifecycle close-out falsely archives an unvalidated master.
  Mitigation: make summary and both archive moves the final step after all automated, bundle, and live gates are recorded green.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across every workspace.
- `npm run test:presentations`: existing Phase 8 suites plus timing/race/provider suites pass.
- Run every new app/realtime glue Vitest suite: both socket events and the three app keys/home predicates pass.
- `npx playwright test --grep presentation-player --project=mobile`: resolves and passes all three app flows first.
- `npx playwright test --grep presentation-player --project=desktop`: resolves and passes all three app flows second.
- Per-app production builds plus manifest/chunk inspection: presentation/runtime absent from each boot chunk and present only in lazy player chunks.
- Live matrix: manager-only, seller-only, and worker-only announcements appear only in the matching app for connected realtime and cold boot; terminal completion advances to the next eligible item.
- `rg -n 'GET /history|/history' packages/presentations apps/managers-app apps/selleres-app apps/workers-app`: no history wrapper/scaffolding.
- `rg -n 'export default' packages/presentations/src/surfaces`: no matches.

## Review log

- `2026-07-22` Codex: **9c (sellers/workers) implemented; close-out blocked in debugging** — sellers and workers now replicate the validated manager wiring with exact `seller`/`worker` keys, authenticated-shell providers, exact-home/foreground gating, app-local surface openers and CTA navigation, both invalidation-only realtime events, lazy surface registration, dependencies/sources, glue tests, and mobile/desktop Playwright coverage. Validation PASS: sellers and workers typecheck; seller glue 2/2; worker app/glue 7/7; presentations 17/17; all three presentation-player specs mobile then desktop 1/1 per project; all three production builds; boot entries `index-CWq-WFr1.js` (manager), `index-fd757Zs3.js` (seller), and `index-DFotZIGe.js` (worker) contain no player/runtime markers or player preload; lazy chunks `presentation-player-DzDoLdbd.js`, `presentation-player-D_U4Tfmo.js`, and `presentation-player-STIJPCSR.js` contain the player; history/default-export/eligibility scans clean. **Blocking defect:** root `npm run typecheck` still fails only at the unrelated user-owned pause-reasons change `packages/stats/src/lib/time-line-calendar/segment-adapter.test.ts:22` (`string` is not assignable to branded `PauseReasonId`), which this session was explicitly forbidden to modify. Per criterion 10, the live matrix and lifecycle close-out were not performed after that red gate; no summary/archive/master change was made. Live matrix remains pending a green root gate plus operator-confirmed live studio/backend access and credentials.
- `2026-07-22` Codex: **9b (managers) implemented** — managers authenticated `AppShell` now mounts the `manager` provider with exact-home/foreground gating, store-backed modal/full-screen/slide-page openers, router-backed CTA navigation, both invalidation-only realtime events, package dependencies/sources, and deterministic unit/Playwright coverage. Validation: managers typecheck PASS; `npm run test:presentations` PASS (6 files / 17 tests); manager glue PASS (1 file / 2 tests); presentation-player Playwright mobile PASS (1/1) then desktop PASS (1/1); production build PASS with boot entry `index-CWq-WFr1.js`, lazy player chunk `presentation-player-DzDoLdbd.js`, no player markers in the entry, and no player preload in `index.html`; surface default-export scan empty; player-kit component diff empty. Root `npm run typecheck` remains blocked only by the unrelated pause-reasons edit at `packages/stats/src/lib/time-line-calendar/segment-adapter.test.ts:22` (`string` vs branded `PauseReasonId`), left untouched. Replication notes: this shell needs an in-flow modal wrapper for its fixed player frame, uses the full-viewport slide host for `full_screen`, forwards a stable `SurfaceHeaderContext` into `slide_page`, and needs the Vite presentation-player code-splitting group plus preload filter to keep the barrel-imported player out of boot.
- `2026-07-22` Codex: **9a (seams) implemented** — named context-consuming surface entries + named-export loader mappings; reactive `canAutoShow` provider gate with deferred/home-release, off-home refetch, mid-show, and published/archived boot-race coverage; typed published/archived realtime events; reusable invalidation-only `presentationSocketEvents`/`invalidateActivePresentationQueries`. Validation: presentations + realtime scoped typechecks PASS; `npm run test:presentations` PASS (6 files / 17 tests); surface default-export scan empty; player-kit component diff empty. Root `npm run typecheck` reached the unrelated in-progress pause-reasons work and is currently blocked at `packages/stats/src/lib/time-line-calendar/segment-adapter.test.ts:22` (`string` is not assignable to branded `PauseReasonId`); per scope, 9a did not touch that work.
- `2026-07-23` Claude (builder): reviewed and **approved**, with the execution directive that has worked twice: this plan runs as **three consecutive lean Codex sessions** split along its own F-boundaries (third session-stall analysis: breadth-of-touch across many pre-existing files is the killer, not prompt weight — Phase 9's stalled brief was already lean) — **9a** = package seams only (F2's named-entry/default-export cleanup, F4's provider home-gate seam + tests, F3's shared realtime types + reusable invalidation-only handler + tests; packages scope only, no app files); **9b** = managers-app wired end-to-end + its unit/Playwright/bundle validation (criteria for one app); **9c** = replicate to sellers (incl. its missing Playwright setup) + workers, race/timing tests, live cross-app matrix, full validation, then F7's lifecycle close-out incl. the master archival. Prompts: `prompts/PROMPT_phase9a_corrections_seams.md`, `PROMPT_phase9b_corrections_managers.md`, `PROMPT_phase9c_corrections_replicate_close.md`. Each later session verifies its predecessor's deliverables first. Working-tree note: the modified managers `package.json` (+lockfile, workers types) is the user's unrelated pause-reasons work — sessions must not touch or revert it.
- `2026-07-22` Codex reviewer: **DEFECTS FOUND.** Phase 9 implementation and summary are absent; `HEAD` remains the Phase 8 commit. None of the three apps declares/sources/mounts/registers the player or its events, the provider has no timing predicate, shared realtime types omit both backend events, the carried default exports remain, and no Phase 9 app/Playwright/bundle/live-matrix evidence exists. Root typecheck and the existing Phase 8 presentations tests passed; the required Playwright commands failed project resolution and per-app greps found zero tests. All corrections are **Codex (logic)**; no Claude-builder visual correction is requested.

## Lifecycle transition

- Current state: `debugging`
- Next state: `approved`
- Transition owner: Codex after the root validation blocker and live matrix are resolved
