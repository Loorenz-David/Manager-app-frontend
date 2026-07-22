# PLAN_presentation_phase3_studio_dashboard_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase3_studio_dashboard_20260722`
- Status: `under_construction`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 3)
- Design reference: `docs/presentation_capability/design/README.md` §1a + `presentation_menu.png`

## Goal and intent

- Goal: Implement the announcements dashboard (design screen 1a) inside `@beyo/presentation-builder`, mounted by the studio's `/` route: searchable, filterable card grid of announcements + "New announcement" creation flow into the editor.
- Business/user intent: managers land here to browse/manage announcements and start new ones.
- Non-goals: the editor itself (Phase 4+); archive/new-version *actions from cards* (Phase 6 owns lifecycle actions; cards navigate only in this phase); dashboard pagination UX beyond "load more" if needed.

## Scope

- In scope: `DashboardView` (+ subcomponents) in the builder package; dashboard controller (`use-presentation-dashboard.controller.ts`) aggregating list query + filters + search + create action; card grid per design (dashed new-card, mini-phone cover, media chips, status pill, title + meta line); status filters All/Published/Drafts/Scheduled/Archived; debounced search (`q`); latest-version-per-announcement grouping; create → navigate to `/editor/:id`; studio route wiring (the app passes a `navigateToEditor(id)` callback — the package never imports the router).
- Out of scope: editor; publish/archive; version history UI (cards show the latest version; a version count badge may render if trivially derivable, else deferred).
- Assumptions: Phase 1 hooks exist; Phase 2 shell exists; master decision #11 (status mapping).

- Division of labor (master): the presentational component kit (top bar, filter row, cards, mini-phone cover, pills, skeletons) is built by Claude in a kit session **before** the Codex session; Codex wires controller/helpers/assembly through the kit's prop contracts and treats kit components as read-only.

## Clarifications required

- [ ] Should announcement cards offer a context menu (archive / new version) already? Default: **no** — navigation only; lifecycle actions arrive in Phase 6. Flagging because the mockup shows no menu either way.

## Acceptance criteria

1. Grid matches design 1a: 3 columns wide / responsive collapse, dashed new-card first, cover with centered mini phone (88×156, radius 13, dark bezel, media stripe), media chips, status pill variants (Published=accent tint, Draft=grey, Scheduled=amber, Archived=neutral), body title + meta ("3 slides · edited 2 days ago"; scheduled cards show "sends <date>").
2. Filters map: All→no status param (grouped); Published→`status=published` minus future `starts_at`; Drafts→`status=draft`; Scheduled→`status=published` with future `starts_at` (client-derived); Archived→`status=archived`.
3. Grouping: one card per `logical_client_id` showing its highest `version`; grouping is a pure, unit-tested helper.
4. Search debounces into the `q` param and composes with filters; clearing restores.
5. "New announcement" (card or top-right button) calls `useCreatePresentation` with a default title ("Untitled announcement"), then `navigateToEditor(client_id)`; failure surfaces via `notify.error`.
6. Loading skeleton grid, empty states per filter, and error state with retry all present.
7. Card covers use real slide media when available (first slide's first media poster/thumb via `BackendImage`), falling back to the design's stripe placeholder.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15) — as master.
- `architecture/16_feature_workflow.md`: controller-before-components order.
- `architecture/07_components.md`: component/context consumption.
- `architecture/10_pages.md`: page composition, loading/error states.
- `architecture/23_providers.md`: whether the dashboard needs a provider (expected: controller + props suffice; provider only if prop-drilling exceeds the contract's threshold).
- `architecture/24_dto.md`: list item → card view model (status derivation, meta line formatting).
- `architecture/32_loading_skeletons.md`: skeleton grid.
- `architecture/18_performance.md`: memoized cards; no virtualization (paginated ≤50).
- `architecture/20_notifications.md`: create-failure toast.
- `architecture/35_shared_packages.md` §13–14: navigation callback injection; page export/loader if the dashboard is surface-registered (here it is a routed page — plain export + app lazyRoute).
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md`: tests.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: spec location, fixtures, desktop project.

### File read intent — pattern vs. relational

Permitted relational reads: `packages/ui` `StatePill` + `BackendImage` prop surfaces; Phase 1's `types.ts`/hooks (what exists). Prohibited: reading other packages' list pages for layout patterns — design README + `10_pages.md` govern.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. View-model helpers in builder `src/lib/`: `derivePresentationDisplayStatus(item, now)` (draft/published/scheduled/archived), `groupLatestVersions(items)`, meta-line formatter (relative edited time, "sends <date>"). Unit tests first (pure functions).
2. `use-presentation-dashboard.controller.ts`: filter state, debounced search state, `usePresentationsList` wiring, grouped+derived items, `createAndOpen()` action, load-more if `has_more`.
3. Components: `DashboardTopBar` (workspace avatar, title, search field, user avatar), `DashboardFilterRow` (chips + New announcement button), `AnnouncementCardGrid`, `AnnouncementCard`, `NewAnnouncementCard`, skeleton/empty/error states. `data-testid` on all feature-critical elements.
4. `DashboardView` assembling the above; exported from package `index.ts`; studio `DashboardPage` renders it passing `navigateToEditor`.
5. Vitest: helpers (step 1), controller (filters × search × grouping), card rendering variants (4 statuses, media fallback).
6. Playwright (desktop): sign in → dashboard renders seeded announcements → filter chips switch content → search narrows → create navigates to `/editor/:id`.

## Risks and mitigations

- Risk: client-side Scheduled derivation disagrees with server list filtering when composing `status=published` + future `starts_at` across pages.
  Mitigation: derive within fetched pages and document that Scheduled is a client refinement of Published; if page-boundary artifacts appear, fetch Published with a larger limit for that chip (dashboard scale is small).
- Risk: grouping hides older published versions a manager expects to find.
  Mitigation: grouping helper is pure/tested; card meta shows `v<N>` when `version > 1` so multi-version state is visible; full version history UI is an acknowledged later feature.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-builder`: dashboard suites green.
- `npx playwright test --grep presentation-dashboard --project=desktop`: flow above passes.

## Review log

- `2026-07-22` Claude: drafted from master Phase 3.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
