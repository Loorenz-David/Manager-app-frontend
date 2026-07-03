# PLAN_seller_app_bootstrap_phase_C_20260703

## Metadata

- Plan ID: `PLAN_seller_app_bootstrap_phase_C_20260703`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-07-03T00:00:00Z`
- Last updated at (UTC): `2026-07-03T00:00:00Z`
- Overview plan: `docs/architecture/under_construction/implementation/PLAN_seller_app_bootstrap_overview_20260703.md`
- Prerequisite: `PLAN_seller_app_bootstrap_phase_B_20260703.md` must be implemented and typechecking first.

## Goal and intent

- Goal: Wire all features and real pages — settings, tasks (with FAB), cases (full surface suite), scanner, images, and PWA surfaces. Replace all Phase B stubs. Complete the surface and socket registries.
- Business/user intent: After Phase C the seller app is fully functional: sellers can sign in, create tasks (pre-orders and returns), view task details, send and receive case messages, and use PWA install/update prompts.
- Non-goals: Upholstery inventory, item categories, upholstery ordering, working-section assignment (manager-only features). Quick-task-assign (no home-tab feature for sellers).

## Scope

- In scope: `src/features/tasks/*`, `src/features/cases/surfaces.ts` (final), `src/features/pwa/*` (final), `src/features/scanner/surfaces.ts` (new), `src/features/settings/*`, `src/components/cases/*`, `src/pages/tasks/TasksPage.tsx` (final), `src/pages/cases/*.tsx` (full suite), `src/pages/settings/SettingsPage.tsx` (final), `src/app/surface-registry.ts` (final).
- Out of scope: Real logic for home/stats/upholstery-inventory — those stay as permanent named placeholders (already written in Phase B).
- Assumptions: Phase B completed and typecheck passes. All `@beyo/*` packages referenced here are listed in the seller `package.json` (Phase A).

## File manifest

All paths are relative to `apps/selleres-app/ManagerBeyo-app-sellers/`.

### Existing files to replace/edit

| Path | Change |
|---|---|
| `src/features/cases/surfaces.ts` | Replace Phase B no-op stub with real case surfaces |
| `src/features/pwa/surfaces.ts` | Replace Phase B ID-only stub with full `pwaSurfaces` object |
| `src/pages/tasks/TasksPage.tsx` | Replace Phase B stub — verbatim copy from manager |
| `src/pages/cases/CasesPage.tsx` | Replace Phase B stub — verbatim copy from manager |
| `src/pages/settings/SettingsPage.tsx` | Replace Phase B stub — verbatim copy from manager |
| `src/app/surface-registry.ts` | Replace Phase A empty stub with real aggregated registry |

### New files to create

| Path | Content origin |
|---|---|
| `src/features/tasks/surfaces.ts` | Seller-specific (see step 1) |
| `src/features/tasks/index.ts` | Seller-specific (see step 2) |
| `src/features/tasks/components/TaskCreationFab.tsx` | Verbatim copy from manager |
| `src/features/scanner/surfaces.ts` | Seller-specific (see step 5) |
| `src/features/settings/types.ts` | Verbatim copy from manager |
| `src/features/settings/controllers/use-settings-view.controller.ts` | Verbatim copy from manager |
| `src/features/settings/providers/SettingsViewProvider.tsx` | Verbatim copy from manager |
| `src/features/settings/components/SettingsView.tsx` | Verbatim copy from manager |
| `src/features/settings/route-entry.tsx` | Verbatim copy from manager |
| `src/features/settings/index.ts` | Verbatim copy from manager |
| `src/components/cases/CaseTaskInfoCard.tsx` | Modified — see step 11 |
| `src/components/cases/CaseTaskInfoSheetContent.tsx` | Modified — see step 12 |
| `src/pages/cases/CaseConversationSlidePage.tsx` | Verbatim copy from manager |
| `src/pages/cases/CaseCreationSlidePage.tsx` | Verbatim copy from manager |
| `src/pages/cases/CaseTypePickerSheetPage.tsx` | Verbatim copy from manager |
| `src/pages/cases/ParticipantPickerSlidePage.tsx` | Verbatim copy from manager |
| `src/pages/cases/CaseTaskInfoSheetPage.tsx` | Verbatim copy from manager |
| `src/pages/cases/CaseMessageActionsSheetPage.tsx` | Modified — see step 13 |
| `src/features/pwa/pages/PwaUpdateSheetPage.tsx` | Verbatim copy from manager |
| `src/features/pwa/pages/PwaInstallSheetPage.tsx` | Verbatim copy from manager |

## Clarifications required

None — Phase C is fully specified.

## Acceptance criteria

1. `npm run typecheck` exits with zero errors.
2. `npm run dev` starts; sign-in page renders.
3. Signing in with a seller account shows the Tasks tab with the task list and the FAB (+ button).
4. Tapping the FAB opens the task creation slide; completing a pre-order or return creation flow works end to end.
5. Tapping a task card opens `TaskDetailSlidePage` (slides in from the right).
6. Cases tab shows the case list; tapping a case opens `CaseConversationPage`; sending a message works.
7. The "New case" FAB on the Cases tab opens the creation slide, type picker, and participant picker.
8. Settings tab shows logout and PWA notification controls.
9. The PWA install/update sheet opens when triggered.
10. Hard-refreshing any route renders the correct page.

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `lazyWithPreload` for all surface components.
- `architecture/30_dynamic_loading.md`: all lazy-loaded pages use `lazyWithPreload` (not raw `lazy`), except PWA pages which may use `lazy` (they do not need preloading).
- `architecture/01_architecture.md`: no cross-app imports; all shared logic via `@beyo/*` packages.

### File read intent

Before writing each step, Codex should read the referenced manager source file verbatim, then apply the delta described below. Manager base path: `apps/managers-app/ManagerBeyo-app-managers/src/`.

## Implementation plan

### Step 1 — Create `src/features/tasks/surfaces.ts`

Copy from manager `src/features/tasks/surfaces.ts`, then apply these two changes:

**Remove** the `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` surface entry and its loader (sellers have no home-tab quick-assign box):
- Remove `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID`, `loadQuickTaskAssignSlidePage`, `loadQuickTaskAssignSlidePage` import from `@beyo/task-working-sections`.
- Remove `const quickTaskAssignSlide = lazyWithPreload(loadQuickTaskAssignSlidePage);`
- Remove the `[QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID]` entry from `taskSurfaces`.
- Remove the `QUICK_TASK_ASSIGN_SLIDE_SURFACE_ID` re-export at the bottom.
- Remove `QuickTaskAssignSurfaceProps` type re-export.

**Fix provider import**: the manager file imports `type SurfaceRegistrations` from `@/providers/SurfaceProvider`. This path exists in the seller too — no change needed.

Everything else is identical to the manager version.

> The resulting `taskSurfaces` object covers: `TASK_DETAIL_SURFACE_ID`, `TASK_ACTIONS_SHEET_SURFACE_ID`, `TASK_FILTER_SHEET_SURFACE_ID`, `TASK_READY_BY_AT_SHEET_SURFACE_ID`, `TASK_ASSORTMENT_SHEET_SURFACE_ID`, `TASK_FULFILLMENT_METHOD_SHEET_SURFACE_ID`, `TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID`, `TASK_POST_HANDLING_SLIDE_SURFACE_ID`, `TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID`, `TASK_POST_HANDLING_PENDING_WARNING_SHEET_SURFACE_ID`, `ITEM_QUANTITY_SHEET_SURFACE_ID`, `ITEM_POSITION_SHEET_SURFACE_ID`, `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID`, `TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID`, `TASK_EDIT_SLIDE_SURFACE_ID`, `TASK_WORKING_SECTIONS_SLIDE_SURFACE_ID`, `TASK_WORKING_SECTIONS_DISCARD_CHANGES_SURFACE_ID`, `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID`, `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID`, `TASK_NOTES_SHEET_SURFACE_ID`, `TASK_NOTE_UNREAD_VIEWER_SURFACE_ID`.

---

### Step 2 — Create `src/features/tasks/index.ts`

```ts
export * from "@beyo/tasks";
export { taskSurfaces } from "./surfaces";
export type {
  ItemQuantitySurfaceProps,
  ItemUpholsteryAmountSurfaceProps,
  TaskActionsSurfaceProps,
  TaskDetailSurfaceProps,
  TaskEditSurfaceProps,
  TaskFlowRecordDetailSurfaceProps,
  TaskReadyByAtSheetSurfaceProps,
  TaskScheduledDeliverySheetSurfaceProps,
} from "./surfaces";
```

---

### Step 3 — Create `src/features/tasks/components/TaskCreationFab.tsx`

Verbatim copy from manager `src/features/tasks/components/TaskCreationFab.tsx`.

---

### Step 4 — Replace `src/pages/tasks/TasksPage.tsx`

Replace the Phase B stub with a verbatim copy from manager `src/pages/tasks/TasksPage.tsx`.

The file imports `TaskCreationFab` from `@/features/tasks/components/TaskCreationFab` and `loadTasksRouteEntryPage` from `@beyo/tasks` — both exist in the seller.

---

### Step 5 — Create `src/features/scanner/surfaces.ts`

The seller has no `@/features/items` directory, but the task creation forms require the scanner surface to be registered. Wire it here as a standalone scanner feature:

```ts
import { SCANNER_SLIDE_SURFACE_ID, loadScannerSlidePage } from "@beyo/scanner";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadScannerSlideSurface = scannerSlide.preload;

export const scannerSurfaces: SurfaceRegistrations = {
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
```

---

### Step 6 — Replace `src/features/cases/surfaces.ts`

Replace the Phase B no-op stub with the full implementation. Verbatim copy from manager `src/features/cases/surfaces.ts`.

The file imports only from `@beyo/ui`, `@beyo/cases`, `@/lib/routes`, and local `@/pages/cases/*` — all present in the seller.

---

### Step 7 — Replace `src/features/pwa/surfaces.ts`

Replace the Phase B ID-only stub with the full `pwaSurfaces` implementation. Verbatim copy from manager `src/features/pwa/surfaces.ts`.

The file uses `lazy` (not `lazyWithPreload`) for PWA pages — this is intentional (PWA sheets are triggered only by the system, no preload needed).

---

### Step 8 — Create `src/features/pwa/pages/PwaUpdateSheetPage.tsx` and `PwaInstallSheetPage.tsx`

Both: verbatim copies from manager.

| Manager path | Seller path |
|---|---|
| `src/features/pwa/pages/PwaUpdateSheetPage.tsx` | `src/features/pwa/pages/PwaUpdateSheetPage.tsx` |
| `src/features/pwa/pages/PwaInstallSheetPage.tsx` | `src/features/pwa/pages/PwaInstallSheetPage.tsx` |

---

### Steps 9–14 — Settings feature (all verbatim copies)

| # | Create at (seller `src/`) | Copy from (manager `src/`) |
|---|---|---|
| 9 | `features/settings/types.ts` | `features/settings/types.ts` |
| 10 | `features/settings/controllers/use-settings-view.controller.ts` | `features/settings/controllers/use-settings-view.controller.ts` |
| 11 | `features/settings/providers/SettingsViewProvider.tsx` | `features/settings/providers/SettingsViewProvider.tsx` |
| 12 | `features/settings/components/SettingsView.tsx` | `features/settings/components/SettingsView.tsx` |
| 13 | `features/settings/route-entry.tsx` | `features/settings/route-entry.tsx` |
| 14 | `features/settings/index.ts` | `features/settings/index.ts` |

---

### Step 15 — Replace `src/pages/settings/SettingsPage.tsx`

Replace the Phase B stub with a verbatim copy from manager `src/pages/settings/SettingsPage.tsx`.

---

### Step 16 — Create `src/components/cases/CaseTaskInfoCard.tsx` (modified)

Copy from manager `src/components/cases/CaseTaskInfoCard.tsx`, then apply one import change:

```diff
- import { ImagePlaceholder, StatePill } from "@/components/primitives";
+ import { ImagePlaceholder, StatePill } from "@beyo/ui";
```

Everything else is identical.

---

### Step 17 — Create `src/components/cases/CaseTaskInfoSheetContent.tsx` (modified)

Copy from manager `src/components/cases/CaseTaskInfoSheetContent.tsx`, then apply one import change:

```diff
- import { TASK_DETAIL_SURFACE_ID } from "@/features/tasks/surfaces";
+ import { TASK_DETAIL_SURFACE_ID } from "@beyo/tasks";
```

Everything else is identical.

---

### Steps 18–22 — Case pages

| # | Create at (seller `src/`) | Delta vs. manager |
|---|---|---|
| 18 | `pages/cases/CaseConversationSlidePage.tsx` | Verbatim copy |
| 19 | `pages/cases/CaseCreationSlidePage.tsx` | Verbatim copy |
| 20 | `pages/cases/CaseTypePickerSheetPage.tsx` | Verbatim copy |
| 21 | `pages/cases/ParticipantPickerSlidePage.tsx` | Verbatim copy |
| 22 | `pages/cases/CaseTaskInfoSheetPage.tsx` | Verbatim copy |

---

### Step 23 — Create `src/pages/cases/CaseMessageActionsSheetPage.tsx` (modified)

Copy from manager `src/pages/cases/CaseMessageActionsSheetPage.tsx`, then apply one import change:

```diff
- import { ConfirmActionButton } from "@/components/primitives";
+ import { ConfirmActionButton } from "@beyo/ui";
```

Everything else is identical.

---

### Step 24 — Replace `src/pages/cases/CasesPage.tsx`

Replace the Phase B stub with a verbatim copy from manager `src/pages/cases/CasesPage.tsx`.

The file imports `CaseTaskInfoSheetContent` from `@/components/cases/CaseTaskInfoSheetContent` (created in step 17) and `PageSkeleton` from `@/components/ui/PageSkeleton` (Phase A) — both exist.

---

### Step 25 — Replace `src/app/surface-registry.ts`

Replace the Phase A empty stub with the final seller surface registry:

```ts
import { imageSurfaces } from "@beyo/images";
import { taskCreationSurfaces } from "@beyo/task-creation";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { caseSurfaces } from "@/features/cases/surfaces";
import { pwaSurfaces } from "@/features/pwa/surfaces";
import { scannerSurfaces } from "@/features/scanner/surfaces";
import { taskSurfaces } from "@/features/tasks/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...caseSurfaces,
  ...taskCreationSurfaces,
  ...taskSurfaces,
  ...scannerSurfaces,
  ...imageSurfaces,
  ...pwaSurfaces,
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

> No upholstery, no item-categories, no working-sections feature surfaces (beyond what `taskSurfaces` already includes from `@beyo/task-working-sections`), no test/phone-input/pending-upholstery surfaces.

## Risks and mitigations

- Risk: `CaseTaskInfoSheetContent.tsx` (step 17) originally imports `TASK_DETAIL_SURFACE_ID` from `@/features/tasks/surfaces`. After the change it comes from `@beyo/tasks`. Confirm the ID string value is identical (`"task-detail"`) between both sources before writing — it is, since the manager's `features/tasks/surfaces.ts` re-exports it from `@beyo/tasks`.

- Risk: Settings feature files import from each other and from `@beyo/auth` (for logout). All inter-feature imports use relative paths (`./`, `../`) so verbatim copies work as-is.

- Risk: `taskCreationSurfaces` from `@beyo/task-creation` may internally reference scanner surfaces by ID. The seller's `scannerSurfaces` registration uses the same `SCANNER_SLIDE_SURFACE_ID` constant from `@beyo/scanner`, so they match.

- Risk: PWA surfaces file still imports `type SurfaceRegistrations` from `@/providers/SurfaceProvider` (manager pattern). The seller has `src/providers/SurfaceProvider.tsx` (Phase A), so this import resolves correctly.

## Validation plan

- `npm run typecheck`: zero errors.
- Tasks tab: list renders + FAB visible → tap FAB → task creation slide opens → fill pre-order form → submit → task appears in list.
- Task card → detail slide → working sections tab visible → can navigate step sub-tabs.
- Cases tab: list renders → tap case → conversation page → send a message.
- "New case" FAB → case type picker sheet → participant picker → creation slide.
- Settings tab: logout button → redirects to sign-in; notifications toggle visible.
- Dev tools: no surface-not-registered console warnings during normal navigation.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
