# Debug Handoff: Task Detail Footer Scroll Visibility

Date: 2026-06-15
Area: Managers app task detail bottom actions hide/show on scroll

## Goal

Make task detail footer hide when scrolling down (target at 50px), and show again when scrolling up near top (target at 55px), without body scroll interference.

## What Was Implemented

### 1) Shared scroll utility updates

File: packages/ui/src/components/primitives/scroll-visibility/scroll-visibility.types.ts

- Added support for:
  - hideThreshold
  - showThreshold
  - topOffset

File: packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts

- Wired topOffset, hideThreshold, showThreshold through to useScrollState.
- Added temporary guarded debug logs (enabled only when window.**BEYO_SCROLL_DEBUG** is true):
  - [scroll-debug][visibility] init
  - [scroll-debug][visibility] scroll
  - [scroll-debug][visibility] reset

File: packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts

- Absolute mode behavior adjusted:
  - Hide when value > topOffset + threshold
  - Show when hidden && delta < 0 && value < topOffset + hysteresis
- Direction gating added for absolute show (requires upward movement).
- lastScrollValueRef update/initialization stabilized so delta is consistent.
- resetState callback dependency fixed to include topOffset (stale closure prevention).
- Temporary guarded debug logs added:
  - [scroll-debug][state] initialize
  - [scroll-debug][state] onScroll
  - [scroll-debug][state] resetState
  - [scroll-debug][state] applyHidden

### 2) Task Detail page wiring and instrumentation

File: apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx

- Using useScrollVisibility in absolute mode:
  - threshold: 50
  - hysteresis: 55
- PullToRefresh receives the local scrollRef.
- Temporary guarded log added:
  - [scroll-debug][task-detail] isHidden

### 3) Footer component test hook

File: apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskDetailBottomActions.tsx

- Added data-testid="task-detail-bottom-actions" to the fixed footer container for deterministic Playwright assertions.

### 4) New focused Playwright test for this behavior

File: apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/task-detail-footer-visibility.spec.ts

- New test attempts to validate:
  - footer starts visible (translate-y-0)
  - after scrolling beyond threshold it hides (translate-y-full)
  - after scrolling back up to 54 it shows again (translate-y-0)
- Enables scroll debug flag via addInitScript:
  - window.**BEYO_SCROLL_DEBUG** = true
- Captures console logs containing [scroll-debug].

## Validation Performed

### Type/lint checks

- get_errors on touched TS/TSX files: clean (no compile errors).

### Unit checks

- Existing focused unit test for TaskDetailBottomActions had passed in earlier session context.

### E2E runs and outcomes

Command run from app folder:

- npm run test:e2e:mobile -- tests/playwright/features/tasks/task-detail-footer-visibility.spec.ts

Observed progression:

1. Initial failures: task detail not opening reliably from list click path.
2. After stabilizing click path: task detail opens.
3. Current reproducible failure:
   - Scroll is attempted, but footer class remains translate-y-0.
   - Assertion waiting for translate-y-full times out.
4. Additional assertion showed one attempted run had downMetrics.scrollTop reported as 0 (wrong/ambiguous scroll target in test path at that step); test then updated to scope inside task-detail-slide.
5. Latest direct run still fails on hide assertion even when test executes correctly and auth is present.

## Confirmed Non-Issue

- This is not an auth blocker.
- The exact spec executes and does not skip for missing credentials.

## Current Hypothesis (Most Likely Issue)

There is still a mismatch between the element being scrolled in runtime and the element observed by useScrollVisibility listener in task detail, or the event/value path into onScroll is not crossing the hide condition in the real UI flow.

Likely sub-cases:

1. The intended scroll container inside PullToRefresh is not the one actually changing scrollTop in this surface configuration.
2. Scroll events fire on a nested element while listener is attached to a sibling/ancestor via scrollRef handoff.
3. A competing layout/transform layer in task detail keeps effective scroll value near 0 for the registered element.
4. The initial suppression window or immediate reset/initialize cycle is swallowing first meaningful down-scroll events in this flow.

## High-Value Next Steps For Claude

1. In browser, inspect and compare these values at runtime in Task Detail:
   - scrollRef.current
   - scrollRef.current.scrollTop
   - nearest .overflow-y-auto element scrollTop
   - element receiving native scroll events
2. Add temporary log in PullToRefresh around activeRef.current identity and scrollTop to confirm registration target.
3. Verify useScrollVisibility effect attaches listener to the same DOM node that changes scrollTop.
4. If mismatch found, align wiring by ensuring scrollRef points to the actual scrolling node.
5. Keep current absolute logic (delta<0 for show) unless logs prove behavioral regression.

## Files Touched In This Work

- packages/ui/src/components/primitives/scroll-visibility/use-scroll-state.ts
- packages/ui/src/components/primitives/scroll-visibility/use-scroll-visibility.ts
- apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx
- apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskDetailBottomActions.tsx
- apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/task-detail-footer-visibility.spec.ts

## Notes

- Temporary debug logs are intentionally guarded by window.**BEYO_SCROLL_DEBUG** and should not emit in normal runtime.
- This handoff is meant to continue root-cause analysis from runtime behavior, not from threshold tuning.
