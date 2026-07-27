# SUMMARY_presentation_phase6_editor_preview_publish_20260722

## Lifecycle

- Plan: `PLAN_presentation_phase6_editor_preview_publish_20260722`
- Final state: `archived`
- Completed at (UTC): `2026-07-22T18:03:49Z`
- Master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (remains under construction)

## Delivered

- Consolidated editor animation and font-size conversion onto `lib/composition-mapping.ts` and removed the inline view conversions.
- Added full-deck preview playback over runtime primitives, total progress, final-frame stopping, shared runtime rendering, dirty-slide flush on entry, and a dev-only server-preview composition parity assertion.
- Added the builder-owned compact `/api/v1/users` wrapper, pagination/search query hook, and query keys without a `@beyo/cases` dependency or injected fetch.
- Added zod-backed publish form mapping for both audience modes, app/role/user targeting, implied own workspace, category/type/dismissibility, derived-or-explicit integer priority, and local datetime to UTC ISO conversion.
- Added client validation and visible 409/422 error mapping for audience, priority, scheduling, slide/content/media, and unknown audience-key causes.
- Added editor lifecycle orchestration in the required order: flush → replace audience → patch metadata → publish, plus editor/dashboard archive and read-only Edit-as-new-version navigation.
- Completed read-only gating and Scheduled display derivation, with visible raced-conflict refetch notices.
- Added unit coverage for audience mapping, priority derivation/override, scheduling, 409/422 mapping, preview advance/stop/progress, and user query keys.
- Added the desktop `presentation-publish` lifecycle Playwright flow with console/page-error guards.

## Backend verification

`POST /{id}/new-version` has no source-status restriction in `04_admin_presentations.md`; it creates the next draft and clears lifecycle timestamps. Archived presentations therefore keep the **Edit as new version** affordance.

## Files

Created:

- `packages/presentation-builder/src/api/list-users.ts`
- `packages/presentation-builder/src/api/use-presentation-users.ts`
- `packages/presentation-builder/src/lib/publish-form.ts`
- `packages/presentation-builder/src/lib/publish-form.test.ts`
- `packages/presentation-builder/src/preview/preview-parity.ts`
- `packages/presentation-builder/src/preview/use-presentation-preview-playback.ts`
- `packages/presentation-builder/src/preview/use-presentation-preview-playback.test.ts`
- `packages/presentation-builder/src/publish/PublishDialog.tsx`
- `apps/presentation-studio/ManagerBeyo-app-presentation-studio/tests/playwright/presentation-publish.spec.ts`

Modified:

- `packages/presentation-builder/src/lib/composition-mapping.ts`
- `packages/presentation-builder/src/api/presentation-keys.ts` and its test
- `packages/presentation-builder/src/controllers/use-presentation-editor.controller.ts`
- `packages/presentation-builder/src/controllers/use-presentation-dashboard.controller.ts` and its test
- `packages/presentation-builder/src/views/EditorView.tsx`
- `packages/presentation-builder/src/views/DashboardView.tsx`
- `packages/presentation-builder/src/components/editor/EditorTopBar.tsx`
- `packages/presentation-builder/src/components/dashboard/AnnouncementCard.tsx`
- `packages/presentation-builder/src/index.ts`
- `apps/presentation-studio/ManagerBeyo-app-presentation-studio/src/pages/EditorPage.tsx`

## Validation

- `npm run typecheck` — PASS, zero TypeScript errors.
- `npm run test:presentation-runtime` — PASS, 4 files / 18 tests.
- `npm run test:presentation-builder` — PASS, 15 files / 75 tests.
- `presentation-publish` desktop Playwright — PASS, 1/1.
- Existing `presentation-dashboard|presentation-editor` desktop Playwright — PASS, 3/3.
- `git diff --check` — PASS.
- `rg -n "slide.title" packages/presentation-builder/src/lib packages/presentation-builder/src/editor` — no matches.
- Component-kit audit — only the pre-recorded additive optional archive props/conditional affordances changed; supplied Phase 6 kit DOM/classes were untouched.

## Deviations

- The supplied kit exposed no archive entry point. Per the plan's allowed exception, the Review log was updated first, then optional archive props/conditional affordances were added to `EditorTopBar` and `AnnouncementCard`. Existing output is unchanged when those props are omitted.
- The final chained validation initially hit sandbox `EPERM` while Playwright tried to bind `127.0.0.1:4175`; the exact Playwright commands were rerun with localhost permission and passed. This was environment-only, not an implementation failure.
