# PLAN_staged_form_absolute_timeline_20260606

## Metadata

- Plan ID: `PLAN_staged_form_absolute_timeline_20260606`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-06T00:00:00Z`
- Last updated at (UTC): `2026-06-06T14:07:59Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Remove the layout coupling between `StagedFormTimeline` and the scroll container in `StagedForm.tsx` by making the timeline absolutely positioned, and replace all layout-property animations in the timeline and the assignment footer with GPU-accelerated compositor-only transitions (`transform` + `opacity`).
- Business/user intent: The timeline currently collapses/expands via a CSS `grid-template-rows` height animation. Because it lives in normal flow above the scroll container, its height change shifts the scroll container's top edge, causing the visible content to jump. A `ResizeObserver` hack tries to compensate by adjusting `scrollTop` each frame — creating subtle scroll artifacts during navigation transitions. Making the timeline absolute removes it from flow entirely. Additionally, both `StagedFormTimeline` and `TaskCreationAssignmentFooter` animate layout properties (`grid-template-rows`, `margin-top`, `max-height`, `padding`, `margin`) which trigger main-thread reflow on every frame — replacing these with `transform`/`opacity` moves the animations to the GPU compositor thread, keeping 60fps on low-end mobile devices.
- Non-goals: Changing the collapse/expand animation timing or easing. Changing how `useScrollVisibility` detects scroll events. Touching any of the three creation-form components (`ReturnFormContent`, `PreOrderFormContent`, `InternalFormContent`). Changing `StagedFormStep.tsx`, `StagedFormNavigation.tsx`, or `StagedFormContext.tsx`.

## Scope

- In scope:
  - `packages/ui/src/components/primitives/staged-form/StagedForm.tsx` — absolute positioning + height measurement
  - `packages/ui/src/components/primitives/staged-form/StagedFormTimeline.tsx` — replace `grid-template-rows` + `margin-top` with `transform`/`opacity`
  - `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/TaskCreationAssignmentFooter.tsx` — replace `max-height`/`margin`/`padding` with `transform`/`opacity`
- Out of scope: `StagedFormStep.tsx`, `StagedFormNavigation.tsx`, `StagedFormContext.tsx`, all scroll-visibility utilities, all creation-form consumer components (`ReturnFormContent`, `PreOrderFormContent`, `InternalFormContent`).
- Assumptions: The timeline is always fully expanded on first render (before any scrolling). The expanded height can be measured synchronously with `useLayoutEffect` after the first paint. The shortcut bar wrapper keeping a constant layout height on the assignment step is an acceptable UX trade-off (the scroll container size no longer changes during animation on that step).

## Clarifications required

_(none — design decision confirmed in conversation before this plan was written)_

## Acceptance criteria

1. Scrolling the content within any `StagedForm` step no longer shifts the content vertically when the timeline collapses or expands.
2. The `ResizeObserver` scroll-compensation `useEffect` block is fully deleted; no other compensation mechanism replaces it.
3. The timeline still collapses when the user scrolls past the threshold and re-expands when they scroll back to the top (existing `useScrollVisibility` behaviour unchanged).
4. The timeline is visually positioned at the top of the form surface, overlaying the scroll area, with the scroll content starting underneath it.
5. No animation in `StagedFormTimeline` or `TaskCreationAssignmentFooter` transitions a layout property (`grid-template-rows`, `margin`, `padding`, `max-height`). Only `transform` and `opacity` are animated.
6. `npm run typecheck` reports zero TypeScript errors.

## Contracts and skills

### Contracts loaded

_(This is a pure layout change to a single primitives file — no server state, hooks, or DTO contracts apply.)_

### Local extensions loaded

_(none)_

### File read intent — pattern vs. relational

Before reading any file outside `StagedForm.tsx`, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`.

Permitted relational reads for this plan:
- `StagedFormTimeline.tsx` — required; changes are made to this file (existing DOM structure must be understood).
- `TaskCreationAssignmentFooter.tsx` — required; changes are made to this file (existing animation classes must be understood).
- `StagedFormStep.tsx` — to confirm `p-6` base padding and that no padding-top override is needed there.

Prohibited:
- Reading other form components (`ReturnFormContent`, `PreOrderFormContent`, `InternalFormContent`) — they are consumers and are out of scope.

### Skill selection

_(No specialised skill required — single-file layout change.)_

## Implementation plan

All changes are in **`packages/ui/src/components/primitives/staged-form/StagedForm.tsx`** only.

### Step 1 — Measure the expanded timeline height on mount

Add a `timelineHeight` state (number, default `0`) and keep the existing `timelineRef`. Replace the entire `ResizeObserver` `useEffect` block (current lines 93–118) with a single `useLayoutEffect` that measures the timeline's rendered height on the first paint, when it is guaranteed to be in its expanded state:

```tsx
const [timelineHeight, setTimelineHeight] = useState(0);

useLayoutEffect(() => {
  if (timelineRef.current) {
    setTimelineHeight(timelineRef.current.getBoundingClientRect().height);
  }
}, []);
```

Import `useLayoutEffect` from `react` (add to existing import).

### Step 2 — Make the timeline absolutely positioned

Change the timeline wrapper element:

Before:
```tsx
<div ref={timelineRef}>
  <StagedFormTimeline />
</div>
```

After:
```tsx
<div ref={timelineRef} className="absolute top-0 left-0 right-0 z-10">
  <StagedFormTimeline />
</div>
```

### Step 3 — Make the outer container a positioning context

Add `relative` to the outer container div's className:

Before:
```tsx
<div
  className={cn("flex h-full flex-col", className)}
  data-testid={testId}
>
```

After:
```tsx
<div
  className={cn("relative flex h-full flex-col", className)}
  data-testid={testId}
>
```

### Step 4 — Offset the scroll content by the measured timeline height

Wrap the existing `AnimatePresence` block inside a new `div` whose `paddingTop` is set to `timelineHeight`. The sticky fade overlay stays outside this wrapper (it should remain at `top-0` of the scroll container, which puts it behind the absolute timeline — this creates the correct visual effect of content fading out behind the floating header):

Before:
```tsx
<div
  ref={scrollRef}
  className="relative flex-1 overflow-x-hidden overflow-y-auto"
  data-testid="staged-form-scroll-container"
>
  <m.div
    animate={{ opacity: isScrolled ? 1 : 0 }}
    className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-gradient-to-b from-background to-transparent [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
    initial={false}
    transition={{ duration: 0.15, ease: "easeOut" }}
  />

  <AnimatePresence custom={direction} mode="wait">
    {getActiveStepChild(children, activeStepId)}
  </AnimatePresence>
</div>
```

After:
```tsx
<div
  ref={scrollRef}
  className="relative flex-1 overflow-x-hidden overflow-y-auto"
  data-testid="staged-form-scroll-container"
>
  <m.div
    animate={{ opacity: isScrolled ? 1 : 0 }}
    className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-gradient-to-b from-background to-transparent [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
    initial={false}
    transition={{ duration: 0.15, ease: "easeOut" }}
  />

  <div style={{ paddingTop: timelineHeight }}>
    <AnimatePresence custom={direction} mode="wait">
      {getActiveStepChild(children, activeStepId)}
    </AnimatePresence>
  </div>
</div>
```

### Step 5 — Clean up unused import

Remove `useRef` from the import if `timelineRef` is the only remaining ref. Keep it if `timelineRef` is still used (it is — for the `useLayoutEffect` measurement). No import changes needed.

Verify that `useState` and `useLayoutEffect` are both imported from `react`.

---

### Step 6 — StagedFormTimeline: replace layout transitions with transform + opacity

File: `packages/ui/src/components/primitives/staged-form/StagedFormTimeline.tsx`

The labels row currently uses a `grid` wrapper to animate `grid-template-rows: 0fr → 1fr` (layout property). The progress bar transitions `margin-top: 0 → 12px` (also layout). Replace both with compositor-only transitions.

**Labels section — before:**
```tsx
<div
  className={cn(
    'grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
    isTimelineCompact ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
  )}
>
  <div className="min-h-0 overflow-hidden">
    <div className="flex items-center">
      {/* step labels */}
    </div>
  </div>
</div>
```

**Labels section — after:**
```tsx
<div className="overflow-hidden">
  <div
    className={cn(
      'flex items-center',
      'transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
      isTimelineCompact ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100',
    )}
  >
    {/* step labels — identical content, no changes inside */}
  </div>
</div>
```

The outer `overflow-hidden` div clips the content as it slides upward. The inner flex div's layout height is preserved (transform does not change layout), which is correct here because the timeline is absolute and its height does not affect any other element.

**Progress bar — before:**
```tsx
<div
  className={cn(
    'relative h-0.5 w-full overflow-hidden rounded-full bg-border',
    'transition-[margin-top] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
    isTimelineCompact ? 'mt-0' : 'mt-3',
  )}
>
```

**Progress bar — after:**
```tsx
<div className="relative h-0.5 w-full overflow-hidden rounded-full bg-border mt-3">
```

The `margin-top` transition is removed entirely. `mt-3` is applied unconditionally — no animation needed. Because the timeline is absolute (out of flow after Step 2–3), the progress bar's vertical position within the absolute element does not affect any other layout. The labels above it are clipped via transform; the progress bar simply stays at its natural `mt-3` offset.

---

### Step 7 — TaskCreationAssignmentFooter: replace layout transitions with transform + opacity

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/components/TaskCreationAssignmentFooter.tsx`

The shortcut bar outer wrapper currently transitions `max-height`, `margin-bottom`, and `padding-top` — all layout properties that trigger main-thread reflow on every animation frame. The inner div already uses `transform: translateY` but its effect is hidden behind the outer layout animation.

**Before:**
```tsx
{showShortcutBar ? (
  <div
    className={cn(
      "overflow-hidden px-4 transition-[max-height,margin,padding,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
      isHidden
        ? "mb-0 max-h-0 pt-0 opacity-0"
        : "mb-3 max-h-24 pt-3 opacity-100",
    )}
  >
    <div
      className={cn(
        "transition-transform duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden ? "translate-y-full" : "translate-y-0",
      )}
    >
      <WorkingSectionShortcutBar ... />
    </div>
  </div>
) : null}
```

**After:**
```tsx
{showShortcutBar ? (
  <div className="overflow-hidden px-4">
    <div
      className={cn(
        "pt-3 pb-3",
        "transition-[transform,opacity] duration-220 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isHidden
          ? "translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      )}
    >
      <WorkingSectionShortcutBar ... />
    </div>
  </div>
) : null}
```

Key changes:
- Outer div: remove all transition and conditional layout classes. Keep only `overflow-hidden px-4`. It clips the inner content as it slides down.
- Inner div: consolidate into one element. Move `pt-3 pb-3` here (padding travels with the content). Animate `transform` + `opacity` only. Add `pointer-events-none` when hidden so invisible pills can't be accidentally tapped.
- Remove the intermediate nested `div` — the consolidated inner div handles both spacing and animation.

**Trade-off:** The outer `overflow-hidden` wrapper always occupies its natural height (the expanded shortcut bar height), even when `isHidden`. The scroll container on the assignment step is therefore slightly shorter than under the old `max-height: 0` approach. The benefit is that no layout recalculation fires on scroll — the footer height is constant for the entire assignment step session.

## Risks and mitigations

- Risk: `timelineHeight` is `0` during the first render frame, causing a flash where content starts at the very top before jumping down.
  Mitigation: `useLayoutEffect` fires synchronously after DOM mutation and before the browser paints, so the measured height is applied before the user sees anything. No visible flash.

- Risk: Future changes to the timeline's vertical dimensions (new design tokens, extra rows) will silently break the offset because it is measured once on mount.
  Mitigation: The measurement is done via `getBoundingClientRect().height`, which reads the actual rendered height. Any future timeline height change will automatically be reflected on the next app mount. No hardcoded pixel values anywhere in this plan.

- Risk: The sticky scroll-fade div is `z-20` and the absolute timeline is `z-10`. If the fade's gradient is visible while the timeline is showing, it could look odd.
  Mitigation: The fade is only visible (`opacity: 1`) when `isScrolled` is true — meaning the user has scrolled past `scrollTop > 0`. At that point the content has already moved upward and the fade correctly renders between the absolute timeline and the content.

- Risk: In `StagedFormTimeline`, the labels wrapper's layout height is preserved even when hidden (transform does not remove layout space). The progress bar sits at `mt-3` below this "invisible" reserved space.
  Mitigation: The timeline is absolute (out of flow after Step 2–3). Its internal layout has no effect on the scroll container or any sibling. The reserved space is entirely contained within the absolute element.

- Risk: In `TaskCreationAssignmentFooter`, the outer `overflow-hidden` wrapper keeps its natural height when the shortcut bar is hidden, reducing the scroll container's available height on the assignment step.
  Mitigation: The height difference is the shortcut bar's expanded height (~72px). The assignment step shows only `WorkingSectionPickerField`, which has ample content. The scroll container is still usable. The UX benefit (no layout changes on scroll) outweighs the minor reduction in content area.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open any of the three creation forms (Return, PreOrder, Internal), scroll down within a step to trigger timeline collapse, observe that content position does not shift vertically.
- Manual: scroll back to top to trigger timeline expand, observe same — no content shift.
- Manual: navigate between steps — timeline re-expands on step change, content position is correct on the new step.
- Manual: on the assignment step (Return form with "before purchase" source, or PreOrder/Internal), scroll down — the shortcut bar hides smoothly (slides down + fades), the footer height stays constant, the scroll container does not resize.
- Manual: use browser DevTools Performance panel (or Safari Timeline on a real iOS device) — confirm zero layout/reflow events fire during timeline collapse or shortcut bar hide/show animation.

## Review log

_(empty)_

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
