# PLAN_seller_app_bootstrap_overview_20260703

## Metadata

- Plan ID: `PLAN_seller_app_bootstrap_overview_20260703`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T00:00:00Z`

## Goal

Bootstrap the seller application (`apps/selleres-app/ManagerBeyo-app-sellers`) as a first-class Beyo app.
It replicates the same architecture as the manager app but authenticates with `appScope="seller"` and
mounts only the task, case, and settings features. Home, stats, and upholstery-inventory tabs are
left as named placeholders.

## Phase index

| Phase | Plan file | Status | What it introduces |
|---|---|---|---|
| **A** | `PLAN_seller_app_bootstrap_phase_A_20260703.md` | `under_construction` | Build config (`package.json`, `vite.config.ts`, `tsconfig.app.json`), `index.css`, `main.tsx`, `src/app/App.tsx` placeholder, `src/lib/*`, `src/providers/SurfaceProvider + BreakpointProvider`, `src/hooks/use-surface* + use-preload-surface`, `src/components/ui/PageSkeleton + RouteErrorBoundary`. Stale files deleted. App renders a static placeholder. Typecheck passes. |
| **B** | `PLAN_seller_app_bootstrap_phase_B_20260703.md` | `under_construction` | Full app shell: `src/app/AppProviders`, `src/app/AppShell`, `src/app/RootRoute` (`appScope="seller"`), `src/app/TabOutlet`, `src/app/router`, `src/app/socket-registry`, `src/app/surface-registry`, `src/app/NotificationRealtimeMount`, `src/app/PushMount`, `src/app/NotificationDeepLinkMount`. `src/providers/TabBadgeCountsProvider`, `src/hooks/use-tab-badge-counts.controller`. `src/components/shell/BottomTabBar`, `MoreTabsPopup`, `use-more-tab-last-selected`. `src/app/App.tsx` wired to RouterProvider. App renders sign-in route and tab shell. Typecheck passes. |
| **C** | `PLAN_seller_app_bootstrap_phase_C_20260703.md` | `under_construction` | All features and pages: `src/features/settings/*`, `src/features/tasks/surfaces + socket-events + TaskCreationFab + index`, `src/features/cases/surfaces`, `src/features/pwa/*`, `src/components/cases/CaseTaskInfoCard + CaseTaskInfoSheetContent`. All `src/pages/*`: auth sign-in, tasks, cases (full suite), settings, home/stats/upholstery-inventory placeholders, NotFoundPage. Surface and socket registries completed. Typecheck passes. |

## Cross-phase invariants

- All shared logic (`@beyo/*` packages) is consumed directly — never copied.
- `appScope` is `"seller"` everywhere (AuthProvider, SignInForm).
- Surface registrations always use `lazyWithPreload` (Contract 30).
- Imperative surface ops (`open`/`close`) always use `useSurfaceStore.getState()`, never reactive `useSurface()` in callbacks.
- The tab structure is identical to the manager: tasks | cases | home | (more: stats | upholstery-inventory | settings).
- Home, stats, and upholstery-inventory pages render a named placeholder only — no data, no queries.

## Manager app reference paths

Codex reads these to copy identical files verbatim:

| File | Manager path |
|---|---|
| `src/lib/animation.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/animation.ts` |
| `src/lib/lazy-route.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/lazy-route.tsx` |
| `src/lib/utils.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/utils.ts` |
| `src/lib/env.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/env.ts` |
| `src/lib/api-client.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/lib/api-client.ts` |
| `src/providers/SurfaceProvider.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/providers/SurfaceProvider.tsx` |
| `src/providers/BreakpointProvider.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/providers/BreakpointProvider.tsx` |
| `src/hooks/use-surface.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface.ts` |
| `src/hooks/use-surface-props.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface-props.ts` |
| `src/hooks/use-surface-header.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-surface-header.ts` |
| `src/hooks/use-preload-surface.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/hooks/use-preload-surface.ts` |
| `src/components/ui/PageSkeleton.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/ui/PageSkeleton.tsx` |
| `src/components/ui/RouteErrorBoundary.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/ui/RouteErrorBoundary.tsx` |
| `src/components/shell/MoreTabsPopup.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/MoreTabsPopup.tsx` |
| `src/components/shell/use-more-tab-last-selected.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/components/shell/use-more-tab-last-selected.ts` |
| `src/app/TabOutlet.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/app/TabOutlet.tsx` |
| `src/app/SurfaceRouteFrame.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/app/SurfaceRouteFrame.tsx` |
| `src/app/NotificationRealtimeMount.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/app/NotificationRealtimeMount.tsx` |
| `src/app/PushMount.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/app/PushMount.tsx` |
| `src/features/settings/types.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/types.ts` |
| `src/features/settings/controllers/use-settings-view.controller.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.ts` |
| `src/features/settings/providers/SettingsViewProvider.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/providers/SettingsViewProvider.tsx` |
| `src/features/settings/components/SettingsView.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/components/SettingsView.tsx` |
| `src/features/settings/route-entry.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/route-entry.tsx` |
| `src/features/settings/index.ts` | `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/index.ts` |
| `src/features/tasks/components/TaskCreationFab.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/TaskCreationFab.tsx` |
| `src/pages/tasks/TasksPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TasksPage.tsx` |
| `src/pages/cases/CaseConversationPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationPage.tsx` |
| `src/pages/cases/CaseConversationSlidePage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseConversationSlidePage.tsx` |
| `src/pages/cases/CaseCreationSlidePage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseCreationSlidePage.tsx` |
| `src/pages/cases/CaseTypePickerSheetPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTypePickerSheetPage.tsx` |
| `src/pages/cases/ParticipantPickerSlidePage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/ParticipantPickerSlidePage.tsx` |
| `src/pages/cases/CaseTaskInfoSheetPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseTaskInfoSheetPage.tsx` |
| `src/pages/cases/CaseMessageActionsSheetPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/cases/CaseMessageActionsSheetPage.tsx` |
| `src/pages/settings/SettingsPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/pages/settings/SettingsPage.tsx` |
| `src/components/cases/CaseTaskInfoCard.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/cases/CaseTaskInfoCard.tsx` |
| `src/components/cases/CaseTaskInfoSheetContent.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/components/cases/CaseTaskInfoSheetContent.tsx` |
| `src/features/pwa/pages/PwaUpdateSheetPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/pages/PwaUpdateSheetPage.tsx` |
| `src/features/pwa/pages/PwaInstallSheetPage.tsx` | `apps/managers-app/ManagerBeyo-app-managers/src/features/pwa/pages/PwaInstallSheetPage.tsx` |

## Seller-specific deltas vs. manager (applies across all phases)

| Concern | Manager | Seller |
|---|---|---|
| `appScope` | `"manager"` | `"seller"` |
| App title | `"Manager Beyo"` | `"Seller Beyo"` |
| PWA `name` | `"Manager Beyo"` | `"Seller Beyo"` |
| Surface registry | tasks + cases + items + upholstery + working-sections + scanner + images + pwa + … | tasks + cases + scanner (for task creation) + images + pwa only |
| Socket registry | tasks + cases + items + working-sections + upholstery + notifications + task-notes | tasks + cases + notifications + task-notes only |
| `@beyo/upholstery` | Yes | No |
| `@beyo/item-categories` | Yes | No |
| `@/features/items` local surfaces | Scanner + item-category picker | Not present (scanner wired directly in surface-registry) |
| `CaseTaskInfoCard` / `CaseTaskInfoSheetContent` imports | `@/components/primitives` for `ImagePlaceholder`, `StatePill` | `@beyo/ui` directly |
| `CaseMessageActionsSheetPage` import | `@/components/primitives` for `ConfirmActionButton` | `@beyo/ui` directly |
