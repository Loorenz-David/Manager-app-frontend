# SUMMARY_PLAN_39_tab_badge_counts_system_20260530

## Metadata

- Summary ID: `SUMMARY_PLAN_39_tab_badge_counts_system_20260530`
- Status: `summarized`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-30T10:33:37Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_39_tab_badge_counts_system_20260530.md`
- Related debug plan (optional): `-`

## What was implemented

- Added a new global unread-count server-state entry point in `@beyo/cases` with `caseKeys.globalUnreadCount()`, `getGlobalUnreadCount()`, and `useGlobalCaseUnreadCountQuery()` for `GET /api/v1/cases/unread-count`.
- Added `NavTabBadge` primitive to `@beyo/ui` with floating badge layout, icon + count items, pointer-safe overlay behavior, and Framer Motion enter/exit animations.
- Implemented workers app shell badge orchestration with `useTabBadgeCountsController()` and `TabBadgeCountsProvider`.
- Integrated badge rendering and dismiss-on-tab-tap behavior into `BottomTabBar`, and wrapped app shell content with the badge provider.
- Added Playwright coverage in `tests/playwright/features/cases/cases-unread-badge.spec.ts` for badge visibility (when unread exists) and immediate dismiss on cases-tab tap.

## Files changed

- `packages/cases/src/api/case-keys.ts`
- `packages/cases/src/api/get-global-unread-count.ts`
- `packages/cases/src/api/use-global-case-unread-count.ts`
- `packages/cases/src/index.ts`
- `packages/ui/src/components/primitives/nav-tab-badge/NavTabBadge.tsx`
- `packages/ui/src/components/primitives/nav-tab-badge/index.ts`
- `packages/ui/src/index.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/hooks/use-tab-badge-counts.controller.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/providers/TabBadgeCountsProvider.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/AppShell.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/components/shell/BottomTabBar.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/cases/cases-unread-badge.spec.ts`

## Validation evidence

- `npm run typecheck` (in `apps/workers-app/ManagerBeyo-app-workers`): pass
- `npm run typecheck` (in frontend root): not available (`Missing script: "typecheck"`)
- `npx playwright test --project=mobile`: not run in this lifecycle closure

## Known gaps or deferred items

- The badge tests are environment-state dependent and skip when the signed-in test account has zero unread case messages.
- End-to-end mobile Playwright execution remains pending (test file added, not executed in this run).

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_PLAN_39_tab_badge_counts_system_20260530_1033.md`
