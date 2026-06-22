# PLAN_complete_task_step_confirmation_corrections_20260622

## Metadata

- Plan ID: `PLAN_complete_task_step_confirmation_corrections_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T13:24:29Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Apply the corrections and gaps identified in the post-implementation review of `PLAN_complete_task_step_confirmation_20260622`.
- Business/user intent: The original implementation is functionally correct but has two issues that affect production quality: users lose the visible dismiss affordance on the confirmation slide, and the confirmation slide bundle is never prefetched, causing a stall on first tap. A minor scroll gap may clip content on small devices. The stat box containers also need to use the app's card surface token (`bg-card`) rather than hardcoded tinted backgrounds.
- Non-goals: No logic changes. No new features. No changes to the transition payload, state machine, or any file outside the two listed below.

## Scope

- In scope:
  - Remove `header?.setActions(null)` from `CompleteTaskStepConfirmationSlidePage`
  - Add `usePreloadSurface(preloadCompleteTaskStepConfirmationSlideSurface)` to `TaskDetailSlidePage` when the complete button is visible
  - Add `overflow-y-auto` to the content wrapper in `CompleteTaskStepConfirmationSlidePage`
  - Restyle stat boxes in `CompleteTaskStepConfirmationSlidePage` to use `bg-card` with rounded edges instead of hardcoded tinted backgrounds
- Out of scope:
  - Any changes to controller logic, types, surface registration, or other pages
- Assumptions:
  - `useSurface()` in `@beyo/hooks` exposes `closeTop`, not `close` — verified in implementation
  - The surface shell renders a default back/close button unless `setActions` overrides it — removing the override restores the default

## Clarifications required

_None — all findings are confirmed from code inspection._

## Acceptance criteria

1. After removing `setActions(null)`, the confirmation slide header displays a visible close/back affordance without any code change to the surface shell.
2. When `TaskDetailSlidePageContent` mounts with `canShowCompletionAction === true`, the confirmation slide bundle begins loading in the background before the user taps.
3. On a 375 × 667 viewport (iPhone SE) with default font size, both stat boxes, both option cards, and the save button are all reachable by scrolling.
4. Both stat boxes render with `bg-card` background, rounded edges, and no hardcoded hex color classes.
5. `npm run typecheck` reports zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md`: slide surface header API (`useSurfaceHeader`, `setTitle`, `setActions`)
- `architecture/30_dynamic_loading.md`: `usePreloadSurface` pattern

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types confirmation
- `architecture/30_dynamic_loading_local.md`: `usePreloadSurface` hook path

### File read intent — pattern vs. relational

Permitted reads already taken (relational):
- `CompleteTaskStepConfirmationSlidePage.tsx` — current `setActions(null)` and layout structure
- `TaskDetailSlidePage.tsx` — current import set and `canShowCompletionAction` usage
- `TaskStepActionButton.tsx`, `TaskStepCircularActionButton.tsx` — `usePreloadSurface` precedent

## Implementation plan

### Fix 1 — Remove `setActions(null)` from confirmation slide

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx`

Remove the `setActions(null)` call from the `useEffect`. The `setTitle` call stays.

_Before:_
```tsx
useEffect(() => {
  header?.setTitle("Complete task");
  header?.setActions(null);
}, [header]);
```

_After:_
```tsx
useEffect(() => {
  header?.setTitle("Complete task");
}, [header]);
```

The surface shell's default back/close button will now render, giving users an explicit dismiss affordance.

---

### Fix 2 — Wire `usePreloadSurface` in `TaskDetailSlidePage`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

**a)** Add import for the preloader (already exported from `index.ts`):
```tsx
import { usePreloadSurface } from "@beyo/hooks";
import { preloadCompleteTaskStepConfirmationSlideSurface } from "@/features/task_steps/surfaces";
```

**b)** Add a `usePreloadSurface` call inside `TaskDetailSlidePageContent`, conditioned on `canShowCompletionAction`. Place it after the existing `useEffect` and before the early-return guards:

```tsx
usePreloadSurface(
  canShowCompletionAction
    ? preloadCompleteTaskStepConfirmationSlideSurface
    : null,
);
```

`canShowCompletionAction` is already derived at line 47 from `controller.vm.state === "working"`. The preload hook must be called unconditionally (React rules), so the condition is passed as the argument, not around the hook call. Confirm that `usePreloadSurface` accepts `null` as a no-op — this is the established pattern in `TaskStepActionButton` and `TaskStepCircularActionButton`.

Wait — `usePreloadSurface` is called unconditionally in those components, not conditionally. Looking at the components, they call `usePreloadSurface(preloadPauseReasonSheetSurface)` without a condition, because the component itself only mounts when there is a next state. In `TaskDetailSlidePage` the component always mounts but the button is conditionally rendered. The hook must be called unconditionally. Two options:

Option A (preferred — mirrors existing pattern): Move `usePreloadSurface` above the early return guards and always call it. The slide will be preloaded whenever the detail page is open, regardless of state. Since the confirmation slide is tiny, this is acceptable:

```tsx
// After the existing useEffect, before the isPending guard:
usePreloadSurface(preloadCompleteTaskStepConfirmationSlideSurface);
```

Option B: Pass a nullable preloader only if `usePreloadSurface` is documented to accept `null`. Use Option A unless the `@beyo/hooks` API confirms null support.

**Recommendation: use Option A** — always preload when the detail slide is open. The bundle is small and the user is already looking at the task, so loading the confirmation chunk is free work.

---

### Fix 3 — Add `overflow-y-auto` to confirmation slide content wrapper

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx`

_Before:_
```tsx
<div className="flex flex-1 flex-col gap-6 px-4">
```

_After:_
```tsx
<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
```

This ensures the stat boxes and option cards scroll independently of the pinned footer button on compact viewports.

---

### Fix 4 — Restyle stat boxes to `bg-card` with rounded edges

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx`

The `StatBox` component currently receives a `toneClassName` prop with hardcoded hex background colors (`bg-[#e7f1ff]` for working, `bg-[#fff7d8]` for paused). Replace these with `bg-card` and a standard shadow or border so the containers sit naturally within the slide's surface layer.

**a)** Remove the `toneClassName` prop from `StatBox` entirely. The container style is now fixed:

_Before (`StatBox` definition):_
```tsx
function StatBox({
  label,
  toneClassName,
  children,
}: {
  label: string;
  toneClassName: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl p-4", toneClassName)}>
```

_After:_
```tsx
function StatBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-4 border-soft-container">
```

`border-soft-container` is the existing app token used on card containers (e.g. `TaskStepCard`). `rounded-xl` matches the card rounding used throughout the app. `bg-card` follows the design system surface token.

**b)** Update both `StatBox` call sites — remove the `toneClassName` prop and let the text colour fall through to `text-foreground` via inheritance:

_Before:_
```tsx
<StatBox label="Time worked" toneClassName="bg-[#e7f1ff] text-[#1f4e8c]">
  ...
</StatBox>

<StatBox label="Total paused" toneClassName="bg-[#fff7d8] text-[#7c5b11]">
  ...
</StatBox>
```

_After:_
```tsx
<StatBox label="Time worked">
  ...
</StatBox>

<StatBox label="Total paused">
  ...
</StatBox>
```

The label uses `opacity-70` which is already in the component, so it will read as a muted label against the card background without needing colour overrides. The timer and formatted value inherit `text-foreground`.

## Risks and mitigations

- Risk: `usePreloadSurface` does not accept `null` and the `canShowCompletionAction` condition cannot be passed as argument.
  Mitigation: Use Option A (unconditional preload) — confirmed safe from existing usage pattern.

- Risk: Removing `setActions(null)` causes the shell to render an unexpected default action (e.g. two close buttons if the surface already has one).
  Mitigation: The surface shell renders one default back/close button. `setActions(null)` was explicitly overriding it to nothing — removing the override restores the single default. No duplication risk.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test:
  1. Open a task step in `working` state → confirmation slide header shows a back/close button
  2. Tap the back button → slide dismisses, step stays in `working` state
  3. Network throttle to Slow 3G → open task detail → wait 1 second → tap "Complete task" → confirmation slide opens without stall (bundle already loaded)
  4. On a 375 × 667 viewport → confirm scroll reaches the save button
  5. Both stat boxes render with `bg-card` background, no tinted colour, rounded corners, and a soft border visible against the slide background

## Review log

_None yet._

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
