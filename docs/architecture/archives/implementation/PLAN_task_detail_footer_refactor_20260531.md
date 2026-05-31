# PLAN_task_detail_footer_refactor_20260531

## Metadata

- Plan ID: `PLAN_task_detail_footer_refactor_20260531`
- Status: `archived`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-05-31T00:00:00Z`
- Last updated at (UTC): `2026-05-31T05:24:35Z`
- Related issue/ticket: task detail page footer UX refactor
- Intention plan: —

## Goal and intent

- Goal: Replace the task-detail slide's fragmented header controls (back arrow + cases button) with a fixed two-button footer: "Close & Back" on the right and a "Help" (MessageCircle) button on the left. The existing animated "Complete task" container remains, but is repositioned to sit transparently above the new fixed footer and slide behind it when the user scrolls.
- Business/user intent: Workers operate on mobile in cramped conditions. Consolidating navigation and case-access into a thumb-reachable fixed footer improves one-handed usability and reduces header clutter.
- Non-goals: Changes to the case creation flow itself. Changes to any controller business logic. Changes to other surfaces or pages.

## Scope

- In scope:
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailHeader.tsx` — remove back arrow and cases button; clean up grouped actions container
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` — restructure footer layout; wire up `TaskStepDetailFooter`
  - New file: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailFooter.tsx`
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/index.ts` — add `TaskStepDetailFooter` export
- Out of scope: Controller logic, case surfaces, any other page or feature.
- Assumptions:
  - `NavTabBadge` from `@beyo/ui` is already available and exported; use it directly for the Help-button badge.
  - `useSurfaceHeader` from `@beyo/hooks` is accessible in `TaskDetailSlidePageContent` (already the case in the current file).
  - `liveCasesSummary.totalUnread` and `handleOpenCasesForTask` are already on `TaskStepDetailController` and exposed via `useTaskStepDetailContext()`.
  - `useScrollVisibility` already returns `isHidden`; no changes to that hook are needed.

## Clarifications required

_(none — all details resolved from existing code)_

## Acceptance criteria

1. A fixed footer is always visible at the bottom of the task detail slide, containing a left "Help" button (MessageCircle icon + "Help" label, `bg-card text-foreground border border-border`) and a right "Close & Back" button (`bg-primary text-card`).
2. "Close & Back" calls `header?.requestClose()`, dismissing the slide exactly as the removed back arrow did.
3. "Help" calls `controller.handleOpenCasesForTask()`, applying the same smart routing (creation / direct conversation / cases list) as the removed header cases button.
4. The `NavTabBadge` appears above the Help button (centered) when `liveCasesSummary.totalUnread` increases, auto-dismisses after 5 s, and also dismisses when the user scrolls (i.e., when `isHidden` becomes `true`).
5. The "Complete task" button container is transparent (no background), absolutely positioned, and visually hides behind the fixed footer when scrolling (the footer has higher `z-index`).
6. The header no longer contains a back arrow or a cases/MessageCircle button; only the three-dot actions button remains.
7. Workers app typechecks without errors (`npm run typecheck`).

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: structure for the new `TaskStepDetailFooter` presentational component and its props interface
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md`: surface close action semantics (`requestClose`); active surface types (slide, sheet, modal)
- `architecture/31_animations.md`: `AnimatePresence` / framer-motion usage already present in `NavTabBadge`; no new animation code needed

### File read intent — pattern vs. relational

Relational reads taken to write this plan (understanding what exists):
- `TaskDetailSlidePage.tsx` — current layout, `isHidden`, scroll padding values, complete-task container class names
- `TaskStepDetailHeader.tsx` — exact button markup to remove, `requestClose()` call site
- `use-task-step-detail.controller.ts` — confirmed `liveCasesSummary.totalUnread` and `handleOpenCasesForTask` exist on the controller
- `NavTabBadge.tsx` — confirmed component API (`items`, `visible`), confirmed `absolute bottom-full left-1/2 -translate-x-1/2` positioning relative to a `relative` parent
- `use-tab-badge-counts.controller.ts` — confirmed badge dismiss pattern: `lastShownCountRef`, 5 000 ms timer, dismiss on scroll
- `BottomTabBar.tsx` — confirmed `NavTabBadge` usage pattern inside a `relative` button

## Implementation plan

### Step 1 — Create `TaskStepDetailFooter.tsx`

Create `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepDetailFooter.tsx`.

**Props interface:**

```tsx
type TaskStepDetailFooterProps = {
  unreadCount: number;
  isScrollHidden: boolean;
  onOpenCases: () => void;
  onClose: () => void;
};
```

**Badge visibility logic** — mirrors `useTabBadgeCountsController` (5 s timer + scroll dismiss):

```tsx
const [badgeVisible, setBadgeVisible] = useState(false);
const lastCountRef = useRef(0);
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Show badge when unread count increases (including initial mount if > 0)
useEffect(() => {
  if (unreadCount > lastCountRef.current) {
    lastCountRef.current = unreadCount;
    setBadgeVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setBadgeVisible(false), 5_000);
  }
}, [unreadCount]);

// Dismiss on scroll
useEffect(() => {
  if (isScrollHidden && badgeVisible) {
    setBadgeVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }
}, [isScrollHidden, badgeVisible]);

// Cleanup timers on unmount
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
}, []);
```

**Rendered JSX:**

```tsx
// fixed-footer wrapper — relative + z-10 so it stacks above the absolute complete-task container (z-0)
<div className="relative z-10 shrink-0 border-t border-border bg-background px-4 pb-[calc(var(--safe-bottom,0)+0.75rem)] pt-3">
  <div className="flex gap-3">

    {/* Help button — relative so NavTabBadge can anchor above it */}
    <div className="relative flex-1">
      <NavTabBadge
        items={[{ icon: MessageCircle, count: unreadCount }]}
        visible={badgeVisible}
      />
      <button
        type="button"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition"
        data-testid="task-detail-footer-help-button"
        onClick={onOpenCases}
      >
        <MessageCircle className="size-4" />
        Help
      </button>
    </div>

    {/* Close & Back button */}
    <button
      type="button"
      className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card transition"
      data-testid="task-detail-footer-close-button"
      onClick={onClose}
    >
      Close &amp; Back
    </button>

  </div>
</div>
```

Imports needed:
- `import { useEffect, useRef, useState } from "react";`
- `import { MessageCircle } from "lucide-react";`
- `import { NavTabBadge } from "@beyo/ui";`

### Step 2 — Export `TaskStepDetailFooter` from the detail barrel

In `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/index.ts`, add:

```ts
export { TaskStepDetailFooter } from "./TaskStepDetailFooter";
```

### Step 3 — Update `TaskDetailSlidePage.tsx`

**Import changes:**
- Add `TaskStepDetailFooter` to the import from `@/features/task_steps/components/detail`.
- No new hook imports needed — `header` and `controller` are already available.

**Layout restructure in `TaskDetailSlidePageContent`:**

The outer `div` becomes:

```tsx
<div className="relative flex h-full flex-col bg-background">
```

_(unchanged)_

**`PullToRefresh` scroll padding** — increase `pb` to clear both the fixed footer (~4.5 rem) and the complete-task button (~5 rem) simultaneously:

```tsx
scrollClassName="overflow-y-auto overscroll-y-none pb-[calc(var(--safe-bottom,0)+9.5rem)]"
```

_(was `5.5rem`; add ~4 rem for the fixed footer)_

**Complete-task container changes:**

Before:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 transition-transform duration-300",
    isHidden ? "translate-y-full" : "translate-y-0",
  )}
>
  <div className="border-t border-border bg-background px-4 pb-[calc(var(--safe-bottom,0)+0.75rem)] pt-3">
```

After:
```tsx
<div
  className={cn(
    "absolute inset-x-0 bottom-0 z-0 transition-transform duration-300",
    isHidden ? "translate-y-full" : "translate-y-0",
  )}
>
  {/* Transparent background — slides behind the fixed footer (z-10) */}
  <div className="px-4 pb-[calc(var(--safe-bottom,0)+5.25rem)] pt-3">
```

Changes:
- Add `z-0` to outer div (explicit; ensures it is below the fixed footer's `z-10`).
- Remove `border-t border-border bg-background` from inner div (transparent background).
- Increase `pb` from `calc(var(--safe-bottom,0)+0.75rem)` to `calc(var(--safe-bottom,0)+5.25rem)` so the button visual content clears the ~4.5 rem fixed footer below.

**Add the fixed footer at the end of the outer div** (after the complete-task conditional):

```tsx
<TaskStepDetailFooter
  unreadCount={controller.liveCasesSummary.totalUnread}
  isScrollHidden={isHidden}
  onOpenCases={controller.handleOpenCasesForTask}
  onClose={() => header?.requestClose()}
/>
```

This is the last element in the outer flex column. Being a `shrink-0` flex child, it takes its natural height and anchors to the bottom of the column. The complete-task container (absolute, `z-0`) sits in the same space but behind it.

### Step 4 — Update `TaskStepDetailHeader.tsx`

**Remove:**
1. The back-arrow button block:
   ```tsx
   <button
     type="button"
     aria-label="Back"
     className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
     onClick={() => header?.requestClose()}
   >
     <ChevronLeft className="size-5" />
   </button>
   ```

2. The cases button and its unread-badge block, the divider, and the grouped-container wrapper — specifically this entire group:
   ```tsx
   <div className="flex rounded-full bg-card shadow-sm border border-light-border">
     <button aria-label="Open task cases" ...> ... </button>
     <div className="my-1 w-px self-stretch bg-border"></div>
     <button aria-label="Task actions" ...> ... </button>
   </div>
   ```
   Replace with just the standalone three-dot actions button (keep `onClick={handleOpenActionsSheet}`):
   ```tsx
   <button
     type="button"
     aria-label="Task actions"
     className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card shadow-sm border border-light-border text-muted-foreground"
     onClick={handleOpenActionsSheet}
   >
     <ThreeDotIcon />
   </button>
   ```

3. Remove the destructured fields that are no longer needed from `useTaskStepDetailContext()`:
   - Remove `liveCasesSummary` (no longer needed — badge has moved to footer)
   - Remove `handleOpenCasesForTask` (no longer needed — moved to footer)

4. Remove the `MessageCircle` import from lucide-react (no longer used in header).

5. Remove the `useSurfaceHeader` hook call and `header` variable if `requestClose` is the only use and `header` is no longer referenced. _(Check: `header` was only used for `requestClose()` in the back-button `onClick`. After removing the back button it is unused — remove `const header = useSurfaceHeader();` and the `import { useSurfaceHeader }` from `@beyo/hooks` if that is the only export being used from that module.)_

**Keep:**
- `handleOpenActionsSheet` — still needed for the three-dot button.
- `vm`, `readyByLabel`, `days`, type/return-source label, the date row, article label, state pill, and all related logic. None of that changes.
- `ChevronLeft` import: remove (no longer used after back button removed).

### Step 5 — Typecheck

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers
```

Zero TypeScript errors required.

## Risks and mitigations

- Risk: `pb` values for the scroll area and the complete-task inner div are approximate. The exact fixed-footer height depends on the rendered `min-h-12` buttons plus padding plus `--safe-bottom`. Visual verification is required on a real device or simulator.
  Mitigation: Adjust `pb` values in `TaskDetailSlidePage.tsx` after visual testing. The safe baseline is to over-pad rather than under-pad — content is scrollable so extra padding does not break layout.

- Risk: `z-index` stacking — the complete-task container uses `z-0` (positioned absolute), the fixed footer uses `z-10` (positioned relative). If any intermediate parent creates a new stacking context, the z relationship may break.
  Mitigation: The outer container is `relative flex flex-col h-full bg-background` with no `transform`, `opacity < 1`, or `will-change` that would create a stacking context. Inspect if z-ordering is wrong after implementation.

- Risk: Removing `useSurfaceHeader` and its `ChevronLeft` usage from the header leaves `header` as unused if it was also used elsewhere in `TaskStepDetailHeader.tsx`.
  Mitigation: Search the file for all references to `header` before removing the import.

## Validation plan

- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: zero errors
- Manual — fixed footer visible on task detail open: footer always anchored at bottom
- Manual — "Close & Back" dismisses the slide
- Manual — "Help" opens correct surface (case creation for 0-case task, conversation for 1-unread, cases list otherwise)
- Manual — badge appears above Help button when task has unread cases, disappears after 5 s
- Manual — badge disappears when user scrolls (content scrolls up, `isHidden` becomes true)
- Manual — "Complete task" button transparent background, slides smoothly behind fixed footer when scrolling up
- Manual — header shows only the article label, type row, date row, state pill, and three-dot button; no back arrow or MessageCircle

## Lifecycle transition

- Current state: `archived`
- Next state: `completed`
- Transition owner: `github-copilot`
