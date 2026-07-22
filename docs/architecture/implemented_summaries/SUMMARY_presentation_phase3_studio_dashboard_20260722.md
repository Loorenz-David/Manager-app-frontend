# SUMMARY_presentation_phase3_studio_dashboard_20260722

## Metadata

- Original plan: `PLAN_presentation_phase3_studio_dashboard_20260722`
- Corrections plan: `PLAN_presentation_phase3_corrections_20260722`
- Governing master: `PLAN_presentation_capability_master_20260722`
- Implemented at (UTC): `2026-07-22T13:27:43Z`
- Lifecycle result: original Phase 3 plan archived; corrections plan remains `approved` pending independent re-review

## Outcome

Implemented the Phase 3 announcements dashboard in `@beyo/presentation-builder` and mounted it through the presentation-studio `/` route. The dashboard now lists and groups announcements, derives Published/Draft/Scheduled/Archived display states, debounces search into the backend `q` parameter, composes status filters, renders list-provided card previews, and creates an untitled draft before navigating to the editor.

The implementation was completed through `PLAN_presentation_phase3_corrections_20260722.md` after the original Phase 3 session stopped at the approved Claude-builder component kit. That kit remained byte-for-byte unchanged.

## Delivered

- Extended `PresentationListItemSchema` with the backend's required admin-list preview fields:
  - `slide_count`: non-negative integer;
  - `media_kinds`: ordered array of the existing `image | video` media enum;
  - `cover_url`: valid URL or `null`.
- Added pure, unit-tested dashboard helpers for:
  - Scheduled derivation (`published` with `starts_at` strictly after injected `now`);
  - latest-version grouping by `logical_client_id`;
  - edited/scheduled meta-line formatting;
  - list-item → approved `AnnouncementCardData` mapping;
  - user initials.
- Added a dashboard controller owning filter state, 300 ms search debounce, list query parameters, grouping/refinement, card view models, loading/error/empty/retry state, permissions, and create orchestration.
- Added a controller-backed context provider so feature components do not import the API/action/controller layers.
- Added `DashboardView`, assembling the approved top bar, filters, cards, mini-phone previews, status pills, skeleton, empty state, and retryable error state.
- Exported `DashboardView` from the builder package and replaced the studio dashboard placeholder with a thin adapter that injects `ROUTES.editor(id)` navigation.
- Create uses exactly `{ title: "Untitled announcement" }`, locks duplicate calls, disables both create entry points while pending, navigates only after success, and emits one `notify.error` on failure.
- Added deterministic Vitest coverage for the schema, helpers, controller, and rendered states.
- Added a desktop Playwright dashboard flow covering sign-in, latest-version grouping, Published/Scheduled filters, debounced search/clear, create payload, and editor navigation, with console/page-error checks.
- Updated the existing studio auth spec to serve the dashboard list and assert the real dashboard rather than the removed Phase 2 placeholder.

## Backend and boundary conformance

- Dashboard cards derive entirely from `GET /api/v1/app-update-presentations` list items. No dashboard `GET /{id}` detail call exists.
- Filter query mapping is exact:
  - All: no `status`;
  - Published/Scheduled: `status=published`, refined client-side;
  - Drafts: `status=draft`;
  - Archived: `status=archived`.
- Search uses the documented `q` field; empty/whitespace search omits it.
- The builder package imports no router, app alias, app route, or app-specific surface ID. Navigation is injected.
- No card context menu, archive, publish, or new-version action was added.
- No presentation design↔backend composition mapping was introduced or duplicated in this phase.
- The approved files under `packages/presentation-builder/src/components/dashboard/` were not modified; their pre/post combined SHA-256 remained `7613524c36ec1bce27320aab119ff8b695482c1652d548ce62fd3560e4e2fb68`.

## Validation

- `npm run typecheck` — PASS, zero TypeScript errors across the root command.
- `npm run test:presentation-builder` — PASS, 8 files / 29 tests.
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-dashboard --project=desktop` — PASS, 1/1.
- `git diff -- packages/presentation-builder/src/components/dashboard/` — PASS, empty; combined kit checksum unchanged.
- Additional regression checks:
  - `npm run lint --workspace managerbeyo-app-presentation-studio` — PASS.
  - desktop `presentation-studio-auth` Playwright suite — PASS, 4/4.
  - `git diff --check` — PASS.

## Files

### Created

- `packages/presentation-builder/src/lib/presentation-dashboard.ts`
- `packages/presentation-builder/src/lib/presentation-dashboard.test.ts`
- `packages/presentation-builder/src/controllers/use-presentation-dashboard.controller.ts`
- `packages/presentation-builder/src/controllers/use-presentation-dashboard.controller.test.tsx`
- `packages/presentation-builder/src/providers/PresentationDashboardProvider.tsx`
- `packages/presentation-builder/src/views/DashboardView.tsx`
- `packages/presentation-builder/src/views/DashboardView.test.tsx`
- `apps/presentation-studio/ManagerBeyo-app-presentation-studio/tests/playwright/presentation-dashboard.spec.ts`
- This implementation summary and the Phase 3 archive record.

### Modified

- `packages/presentation-builder/src/types.ts`
- `packages/presentation-builder/src/types.test.ts`
- `packages/presentation-builder/src/test/fixtures.ts`
- `packages/presentation-builder/src/index.ts`
- `apps/presentation-studio/ManagerBeyo-app-presentation-studio/src/pages/DashboardPage.tsx`
- `apps/presentation-studio/ManagerBeyo-app-presentation-studio/tests/playwright/presentation-studio-auth.spec.ts`
- Original Phase 3 plan metadata/lifecycle before archival.
- Governing master Review log only.

## Deviations and notes

- No deviations from the approved corrections-plan acceptance criteria.
- The earlier correction draft's detail-enrichment approach was not implemented because the approved amended plan and re-synced backend contract replaced it with `slide_count`/`media_kinds`/`cover_url` on list items. This is the governing plan, not a deviation.
- The dashboard requests the backend's maximum documented page size (`limit=200`). Broader pagination UX remains outside Phase 3 acceptance and the approved kit surface.
