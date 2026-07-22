# PLAN_presentation_phase3_corrections_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase3_corrections_20260722`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-22T12:52:03Z`
- Last updated at (UTC): `2026-07-22T16:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`
- Related phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase3_studio_dashboard_20260722.md`
- Review finding source: Phase 3 implementation review, 2026-07-22

## Goal and intent

- Goal: complete the missing Phase 3 logic, assembly, route wiring, tests, and lifecycle bookkeeping around the already user-approved dashboard component kit.
- Business/user intent: make the studio `/` route a working announcements dashboard with list/search/filter/create behavior while preserving the approved visual kit unchanged.
- Non-goals: any editor implementation; card context menus; publish/archive/new-version actions; version-history UI; any Phase 4+ behavior; any DOM, class, or styling change to `packages/presentation-builder/src/components/dashboard/`.

## Scope

- In scope:
  - **F1 — Codex (logic), critical:** replace the studio's dashboard placeholder with the Phase 3 `DashboardView`, controller, API-backed list state, and injected editor navigation required by phase acceptance criteria 1–7.
  - **F2 — Codex (logic), critical:** add the missing pure status/grouping/meta helpers and Phase 3 unit/controller/component/Playwright coverage, including the exact scheduled boundary and highest-version behavior.
  - **F2b — Codex (logic), critical (amended 2026-07-22):** extend `PresentationListItemSchema` in `packages/presentation-builder/src/types.ts` with the three card-preview fields (`slide_count`: int ≥ 0; `media_kinds`: array of the existing media-type enum; `cover_url`: url string nullable) and update the list fixture to the re-synced doc's example.
  - **F3 — Codex (logic), high:** complete the create flow with `title: "Untitled announcement"`, navigate on success, and one `notify.error` on failure.
  - **F4 — Codex (logic), medium:** after successful correction validation, write the Phase 3 implementation summary, archive the original Phase 3 plan without editing its archived contents, and append the implementation result to the master Review log.
- Out of scope: changes to the approved kit components, backend routes or schemas, mapping code, runtime/player packages, lifecycle actions, editor UI, or the master outside its Review log.
- Assumptions:
  - The component kit currently in `packages/presentation-builder/src/components/dashboard/` is the approved Claude-builder baseline and is read-only.
  - **(Amended 2026-07-22)** The admin list response now carries per-deck card-preview fields — `slide_count` (int ≥ 0), `media_kinds` (ordered `("image"|"video")[]`), `cover_url` (presigned string | null) — implemented backend-side per `docs/handoff/to_backend/HANDOFF_presentation_admin_list_card_fields_20260722.md` and documented in the re-synced `docs/presentation_capability/backend/04_admin_presentations.md`. Cards derive entirely from list items; **no `GET /{id}` detail enrichment exists in this phase**.
  - The app remains a thin shell: it owns `useNavigate` and passes `navigateToEditor(id)` into the builder package.

## Clarifications required

None. The original phase plan and the user's kit approval resolve the card-action and visual questions.

## Acceptance criteria

1. Pure helpers derive `scheduled` only when `status === "published"` and `starts_at` is strictly in the future relative to an injected `now`; derive the other three display statuses correctly; group by `logical_client_id` and keep the highest numeric `version`; and format edited/scheduled meta lines. Boundary cases are unit tested without React.
2. The dashboard controller owns filter state, immediate search text, debounced `q`, list query parameters, latest-version grouping, client-side Published/Scheduled refinement, card view models (built from list items' `slide_count`/`media_kinds`/`cover_url`), loading/error/empty/retry state, and create state. Components import none of the API/action/controller modules. No `GET /{id}` call exists on the dashboard.
3. Filters send exactly: All → no `status`; Published/Scheduled → `status=published`; Drafts → `status=draft`; Archived → `status=archived`. Published excludes future `starts_at`; Scheduled includes only future `starts_at`. Search composes with every filter and clearing it removes `q` after the debounce.
4. `DashboardView` assembles the approved kit without modifying its DOM/classes/styling. It shows the dashed new card first; the four pill variants; scheduled `sends <date>` metadata; skeleton, filter-specific empty, and retryable error states; real slide counts, media chips, and cover thumbnails straight from the list's card-preview fields; and the stripe fallback when `cover_url` is null.
5. Clicking an announcement invokes the injected `navigateToEditor(client_id)`. Neither the builder package nor any dashboard component imports `react-router-dom`, app routes, app aliases, or app-specific surface IDs. No card context menu or lifecycle action is added.
6. Either create entry point calls `useCreatePresentation` once with `{ title: "Untitled announcement" }`, disables duplicate submission while pending, navigates with the returned `client_id` only after success, and emits exactly one `notify.error` on failure without navigating.
7. The studio `DashboardPage` is a thin adapter that renders the exported builder `DashboardView` and injects editor navigation to `/editor/:presentationId`; no dashboard business logic moves into the app.
8. Builder tests cover helpers, filter/query composition, debounce/clear, grouping, four statuses, the extended list schema (fixture with the three preview fields, incl. `cover_url: null` + `media_kinds: []`), cover fallback, loading/empty/error/retry, and create success/failure. The Playwright `presentation-dashboard` flow covers render, filters, search, create navigation, and fails on console/page errors.
9. Validation passes using the repository root for typecheck/unit tests and the studio config for Playwright: `npm run typecheck`; `npm run test:presentation-builder`; `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-dashboard --project=desktop`.
10. Lifecycle bookkeeping is complete only after green validation: Phase 3 summary exists; the original phase plan is archived under `docs/architecture/archives/implementation/`; the master remains under construction and gains only its dated Phase 3 implementation entry. The correction plan remains under construction until independently reviewed.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md`, `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`: core layering, query/action/controller, error, and package rules.
- `architecture/07_components.md`: approved components remain props-only and contain no business derivation or API calls.
- `architecture/10_pages.md`, `16_feature_workflow.md`, `24_dto.md`, `32_loading_skeletons.md`: dashboard composition, controller-first workflow, list/detail-to-card view models, and state rendering.
- `architecture/17_testing.md`, `34_runtime_validation.md`: unit/component/runtime coverage.
- `architecture/18_performance.md`: memoized card/view-model derivation and bounded detail enrichment.
- `architecture/20_notifications.md`: mutation failure notification is owned by logic, never duplicated by components.
- `architecture/35_shared_packages.md` §13–14: injected navigation and public routed-page export; no app-specific imports in the package.
- `docs/presentation_capability/backend/04_admin_presentations.md`: exact create/list/detail request and response contracts.
- `docs/presentation_capability/design/README.md` §1a + `presentation_menu.png`: approved dashboard fidelity target.

### Local extensions loaded

- `architecture/04_api_client_local.md`: existing backend error/envelope behavior.
- `architecture/34_runtime_validation_local.md`: deterministic route mocking, selector, and console-error requirements; the studio's own Playwright config supplies its desktop project.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead.
- **What exists** → read only Phase 1 presentation types/hooks/actions, the approved dashboard kit prop surfaces, the builder public index, and the studio dashboard/router adapter.
- Do not read unrelated list/controller/page implementations for patterns.
- Do not modify `packages/presentation-builder/src/components/dashboard/`; if an additive prop proves unavoidable, stop and route it to Claude-builder rather than changing it in this corrections session.

### Skill selection

- Primary skill: none.
- Trigger terms: none.
- Excluded alternatives: no available skill is needed for this scoped React/controller/test correction.

## Implementation plan

1. Add pure dashboard view-model helpers and tests first: display-status derivation with injected `now`, latest-version grouping, and meta-line/date formatting.
2. Extend `PresentationListItemSchema` (+ fixture) with `slide_count`/`media_kinds`/`cover_url` per the re-synced `04_admin_presentations.md`; card view models map them to the kit's `AnnouncementCardData` (`mediaKinds`, `coverImageUrl`, meta line) in the controller/view-model layer only.
3. Implement `use-presentation-dashboard.controller.ts` with filter/query mapping, debounced search, grouping across loaded items, Published/Scheduled client refinement, list-derived card preview data, retry/empty/loading state, and create-and-open orchestration. Use `notify.error` in one logic owner only.
4. Add `DashboardView` as the assembly boundary over the read-only kit. Render no context menu and no Phase 6 lifecycle controls.
5. Export `DashboardView` from the builder public API and replace the studio placeholder with a thin adapter that injects `navigateToEditor` through the app router.
6. Add Vitest coverage for criteria 1–6 and a studio Playwright `presentation-dashboard` spec with deterministic API interception for list/detail/create responses and console/page-error checking.
7. Run all three validation commands from acceptance criterion 9. Fix only Phase 3 logic/assembly/test defects; do not alter the kit to make tests pass.
8. On green validation, write the implementation summary, archive the original Phase 3 plan through the repository lifecycle convention, append the master implementation entry, and leave this corrections plan for independent review.

## Risks and mitigations

- Risk: the frontend schema for the three new list fields drifts from the backend serialization (e.g. over-strict nullability), breaking list parsing at runtime.
  Mitigation: model exactly per the re-synced `04_admin_presentations.md` field table (`slide_count` int ≥ 0, `media_kinds` possibly empty, `cover_url` nullable); fixture-test the doc's example verbatim plus the null/empty case.
- Risk: Scheduled/Published client refinement across pagination can omit or duplicate logical announcements.
  Mitigation: group across all pages currently loaded, use a bounded high list limit appropriate to the dashboard, expose load-more when `has_more`, and test grouping again after an appended page.
- Risk: adding logic directly to the approved components breaks the division of labor.
  Mitigation: treat the entire dashboard component directory as read-only; place derivation in pure helpers/controller and assembly in the new view.
- Risk: create errors are notified twice by both controller and action callbacks.
  Mitigation: designate the controller as the sole Phase 3 notification owner and assert one notification in the failure test.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-builder`: all existing suites plus Phase 3 helper/controller/component suites pass.
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-dashboard --project=desktop`: the complete dashboard flow passes with no console/page errors.
- `git diff -- packages/presentation-builder/src/components/dashboard/`: empty relative to the approved kit baseline.

## Review log

- `2026-07-22` Codex: corrections implemented and all validation gates passed (root typecheck; builder 8 files / 29 tests; dashboard Playwright 1/1; approved kit diff empty/checksum unchanged). The original Phase 3 plan was archived and the implementation summary/master log were updated. This corrections plan remains approved in place pending independent re-review.
- `2026-07-22` Claude (builder): **Amended after the backend landed the card-preview fields** (user-run backend agent, implemented exactly per the handoff; verified in `backend/.../serializers.py` + integration test; frontend doc copy re-synced). The `GET /{id}` detail-enrichment approach is removed everywhere; cards derive from list items; new F2b extends `PresentationListItemSchema`. Plan remains `approved`.
- `2026-07-22` Claude (builder): reviewed and **approved**. The detail-enrichment assumption is correct (admin list items are compact — no slides — per backend `04_admin_presentations.md`; slide counts/covers must come from bounded `GET /{id}` enrichment). Note: this pulls `GET /{id}` usage forward from Phase 4 to Phase 3 — acceptable, same Phase 1 hook. Optional future backend follow-up (not v1): add `slide_count`/cover ref to the admin list response to remove the N+1. Handed to a fresh Codex session via `prompts/PROMPT_phase3_corrections.md`.
- `2026-07-22` Codex reviewer: **DEFECTS FOUND.** The repository contains the approved dashboard component kit only; the production route remains the Phase 2 placeholder. No Phase 3 controller/helpers/view/tests/summary/archive entry exist. Typecheck passed; the 5 existing builder test files (16 tests) passed but contain no Phase 3 coverage; the dashboard Playwright grep found no tests. Corrections assigned entirely to **Codex (logic)**; no Claude-builder visual finding.

## Lifecycle transition

- Current state: `approved`
- Next state: `archived` only after independent re-review.
- Transition owner: implementation reviewer.
