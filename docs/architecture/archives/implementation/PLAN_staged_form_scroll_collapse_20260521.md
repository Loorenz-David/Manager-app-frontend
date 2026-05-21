# PLAN_staged_form_scroll_collapse_20260521

## Metadata

- Plan ID: `PLAN_staged_form_scroll_collapse_20260521`
- Status: `under_construction`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal**: (1) Relocate the top fade gradient from a layout-offset element outside the scroll container to a sticky overlay _inside_ the scroll container so it never covers initial form content. (2) Make the `StagedFormTimeline` compress on scroll — labels animate out, only the progress track remains — and expand when the user scrolls back up.
- **Business/user intent**: The form content should be fully visible immediately below the timeline at scroll-position 0. As the user scrolls down the labels disappear to give the form more vertical space and the compact progress bar acts as a persistent orientation indicator. The feel should be fluid and native.
- **Non-goals**: No changes to `useStagedForm`, `StagedFormNavigation`, `StagedFormProps`, `StepConfig`, or any feature-level code. No route-based state. No Playwright spec changes.

## Scope

- **In scope**:
  - `StagedForm.tsx` — scroll container lift, scroll listener, sticky top gradient, context `isTimelineCompact`
  - `StagedFormStep.tsx` — remove `overflow-y-auto`, add `min-h-full`
  - `StagedFormTimeline.tsx` — animated collapse of labels row and padding
  - `staged-form.types.ts` — add `isTimelineCompact: boolean` to `StagedFormContextValue`

- **Out of scope**:
  - `use-staged-form.ts` — no navigation-state changes
  - `StagedFormNavigation.tsx` — bottom gradient already correct; no change
  - Any consumer (`TestingFormsContent.tsx`, etc.)

- **Assumptions**:
  - `framer-motion` `m` and `AnimatePresence` are already bundled (confirmed in `31_animations.md`).
  - `transitions` object from `@/lib/animation` exists with a `slide` key; Codex should use `{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }` inline for the collapse animation to keep it separate from step slide transitions.
  - The current bottom gradient (nav wrapper `relative z-10 shrink-0`, child `absolute top-0 -translate-y-full`) is correct and must not be removed.
  - `overflow-x: hidden` and `overflow-y: auto` can coexist on the same element — both set explicitly, no forced-visible coercion.

## Clarifications required

None — all decisions below are resolved.

## Acceptance criteria

1. At scroll-position 0 the top fade gradient is **invisible** (`opacity: 0`); the form's first field is fully visible directly below the timeline.
2. After scrolling ≥ 24 px the top gradient fades in smoothly and the timeline collapses: labels row height animates to 0 with opacity 0; padding reduces to `py-2`.
3. Scrolling back to < 24 px reverses both animations.
4. Navigating to a new step resets the scroll position to 0 and immediately returns the timeline to the expanded state (no animation, instant).
5. The bottom gradient (above nav) is unaffected and continues to work correctly.
6. `npm run typecheck` passes with zero errors.
7. `npm run build` passes.
8. No RHF or feature imports are introduced into the primitive folder.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: primitive stays in `components/primitives/`; no `features/` or `store/` imports
- `architecture/07_components.md`: named exports; one public component per file; no nested component definitions
- `architecture/14_styling.md`: Tailwind + `cva` + `cn()` only; arbitrary values need a comment explaining why the token doesn't cover it
- `architecture/31_animations.md`: Framer Motion `m` + `AnimatePresence`; `reducedMotion="user"` already set at app root — Framer Motion respects it automatically; no additional guard needed

### File read intent — pattern vs. relational

**Permitted relational reads:**
- Read `StagedForm.tsx` to verify exact current class names before replacing them
- Read `StagedFormTimeline.tsx` to identify the exact elements to wrap in `m.div`
- Read `StagedFormStep.tsx` to confirm the current `overflow-y-auto` class location
- Read `staged-form.types.ts` to confirm the exact field list before adding `isTimelineCompact`
- Read `@/lib/animation.ts` only to confirm `transitions.slide` still exists (no need to copy — use inline transition object for collapse animation)

**Prohibited:**
- Reading `StagedFormNavigation.tsx` to understand structure — no change to that file
- Reading other Framer Motion usage to understand `m.div` pattern — covered by `31_animations.md`

### Skill selection

- Primary skill: none — this is a targeted mechanical implementation with no ambiguity requiring skill-based research
- Trigger terms: `scroll collapse`, `sticky gradient`, `timeline compact`
- Excluded alternatives: `intention_planning/SKILL.md` — goal already defined; no intention document needed

## Implementation plan

### Step 1 — `staged-form.types.ts`: add `isTimelineCompact` to context shape

File: `src/components/primitives/staged-form/staged-form.types.ts`

Add one field to `StagedFormContextValue` only. Do **not** add it to `StagedFormProps` — it is derived internally in `StagedForm.tsx`, not passed by consumers.

```ts
export type StagedFormContextValue = {
  steps: StepConfig[];
  activeStepId: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing: boolean;
  navigationMode: 'sequential' | 'free';
  stepStatusMap: StepStatusMap;
  direction: 1 | -1;
  isTimelineCompact: boolean;   // ← ADD THIS
  onAdvance: () => void;
  onBack: () => void;
  onNavigate: (stepId: string) => void;
};
```

---

### Step 2 — `StagedFormStep.tsx`: remove scroll ownership, add `min-h-full`

File: `src/components/primitives/staged-form/StagedFormStep.tsx`

The scroll container is being lifted from `StagedFormStep` to the content area wrapper in `StagedForm.tsx`. The `m.div` must no longer clip its overflow — it becomes a freely-sized motion element inside the scroll container.

Change the `m.div` className:

```tsx
// BEFORE
className={cn('w-full overflow-y-auto p-6', className)}

// AFTER
className={cn('w-full min-h-full p-6', className)}
```

`min-h-full` ensures the step fills the scroll container's full height even when content is short, preventing the bottom sticky gradient from floating in the middle of an empty area. No other changes to this file.

---

### Step 3 — `StagedForm.tsx`: scroll container, scroll listener, sticky top gradient, compact context

File: `src/components/primitives/staged-form/StagedForm.tsx`

**3a. New imports**

Add to existing framer-motion import:
```tsx
import { AnimatePresence, m } from 'framer-motion';
```

Add React hooks:
```tsx
import { Children, isValidElement, useEffect, useRef, useState } from 'react';
```

**3b. State and refs inside `StagedForm` function body (before `contextValue`)**

```tsx
const scrollRef = useRef<HTMLDivElement>(null);
const [isCompact, setIsCompact] = useState(false);

// Detect scroll to drive timeline collapse.
useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  const onScroll = () => setIsCompact(el.scrollTop > 24);
  el.addEventListener('scroll', onScroll, { passive: true });
  return () => el.removeEventListener('scroll', onScroll);
}, []);

// Reset scroll and expanded state when the active step changes.
useEffect(() => {
  scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  setIsCompact(false);
}, [activeStepId]);
```

**3c. Add `isTimelineCompact` to `contextValue`**

```tsx
const contextValue = {
  steps,
  activeStepId,
  isFirstStep,
  isLastStep,
  isAdvancing,
  navigationMode,
  stepStatusMap,
  direction,
  isTimelineCompact: isCompact,   // ← ADD
  onAdvance,
  onBack,
  onNavigate,
} as const;
```

**3d. Update JSX structure**

Replace the entire inner JSX (inside the `StagedFormContext.Provider > div`) with:

```tsx
{/* Timeline renders as a plain shrink-0 flex child. No z-10 wrapper needed —
    the sticky top gradient inside the scroll container provides the fade. */}
<StagedFormTimeline />

{/* Scroll container. overflow-x-hidden clips horizontal step slide animations;
    overflow-y-auto is the scroll context for sticky children and the listener. */}
<div
  ref={scrollRef}
  className="relative flex-1 overflow-x-hidden overflow-y-auto"
>
  {/* Top fade — sticky so it always sits at the scroll viewport's top edge.
      Only visible when scrolled (opacity driven by isCompact) so it never
      covers content at scroll-position 0.
      h-10 -mb-10: natural height is negated so content starts at the same
      position as the gradient, not below it. */}
  <m.div
    initial={false}
    animate={{ opacity: isCompact ? 1 : 0 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className="pointer-events-none sticky top-0 z-20 h-10 -mb-10 bg-gradient-to-b from-background to-transparent [mask-image:linear-gradient(to_bottom,black,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]"
  />

  <AnimatePresence custom={direction} mode="wait">
    {getActiveStepChild(children, activeStepId)}
  </AnimatePresence>
</div>

{/* Navigation wrapper — bottom gradient unchanged: absolute top-0 -translate-y-full
    bleeds upward from the nav's top edge, always visible. */}
<div className="relative z-10 shrink-0">
  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 -translate-y-full bg-gradient-to-t from-background to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black,transparent)] [-webkit-mask-image:linear-gradient(to_top,black,transparent)]" />
  <StagedFormNavigation />
</div>
```

Note: the old `relative z-10 shrink-0` wrapper and `translate-y-full` gradient that surrounded `<StagedFormTimeline />` are fully removed. The nav wrapper is preserved exactly as-is.

---

### Step 4 — `StagedFormTimeline.tsx`: animated collapse

File: `src/components/primitives/staged-form/StagedFormTimeline.tsx`

**4a. New imports**

Add `m` from framer-motion:
```tsx
import { m } from 'framer-motion';
```

**4b. Read `isTimelineCompact` from context**

```tsx
const { steps, activeStepId, navigationMode, stepStatusMap, onNavigate, isTimelineCompact } =
  useStagedFormContext();
```

**4c. Replace the inner `px-6 py-4` div with an animated wrapper**

The current structure inside the outer `data-testid="staged-form-timeline"` div is:

```tsx
<div className="px-6 py-4">
  {/* Step labels row */}
  <div className="flex items-center">
    ...
  </div>

  {/* Progress track */}
  <div className="relative mt-3 h-0.5 w-full overflow-hidden rounded-full bg-border">
    ...
  </div>
</div>
```

Replace with:

```tsx
{/* Outer padding animates to reduce height when compact */}
<m.div
  className="px-6"
  initial={false}
  animate={{
    paddingTop: isTimelineCompact ? 8 : 16,
    paddingBottom: isTimelineCompact ? 8 : 16,
  }}
  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
>
  {/* Labels row — collapses to zero height when compact */}
  <m.div
    initial={false}
    animate={{
      height: isTimelineCompact ? 0 : 'auto',
      opacity: isTimelineCompact ? 0 : 1,
    }}
    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    className="overflow-hidden"
  >
    {/* Step labels row — existing markup unchanged */}
    <div className="flex items-center">
      {/* ...existing steps.map(...) content — no changes... */}
    </div>
  </m.div>

  {/* Progress track — mt animates to 0 when labels have collapsed */}
  <m.div
    initial={false}
    animate={{ marginTop: isTimelineCompact ? 0 : 12 }}
    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    className="relative h-0.5 w-full overflow-hidden rounded-full bg-border"
  >
    <div
      className="absolute inset-y-0 left-0 rounded-full bg-foreground transition-[width] duration-300 ease-out"
      style={{ width: `${progressPercent}%` }}
    />
  </m.div>
</m.div>
```

The inner `div className="flex items-center"` and everything inside it (`steps.map(...)`, Fragment, indicator buttons, label spans, separator spans) is **left entirely unchanged** — only the outer wrapper elements change.

---

## Risks and mitigations

- **Risk**: `height: 'auto'` animation in Framer Motion requires layout measurement. If `StagedFormTimeline` is inside a `display: none` container on mount, the measurement may be 0 and the expand animation will not work.
  **Mitigation**: `initial={false}` skips the mount animation entirely. The first render always shows the expanded state directly; animation only occurs on subsequent state transitions. No measurement issue.

- **Risk**: `overflow-x: hidden` and `overflow-y: auto` on the same element — CSS spec says if one overflow axis is `visible`, the computed value of the other becomes `auto`. Since both are explicitly non-visible here (`hidden` and `auto`), no forced computation occurs. Verified safe.

- **Risk**: `sticky top-0` inside `overflow-y: auto` container — works correctly because the scroll container IS the `overflow-y: auto` element. Sticky children stick relative to the scroll container's visible viewport.

- **Risk**: The `sticky top-0 h-10 -mb-10` gradient still occupies `h-10` (40 px) of space in the normal flow before the first content. The next sibling (`AnimatePresence`) starts 40 px earlier due to `-mb-10`. At scroll-position 0 and `opacity: 0`, the gradient is invisible, so the first content is fully visible. If opacity transitions are slow, there may be a brief flicker. Mitigation: use `duration: 0.15` (fast) for the gradient fade-in.

- **Risk**: Removing `overflow-y-auto` from `StagedFormStep` means content that exceeds `min-h-full` will spill into the parent scroll container instead of clipping. This is the desired behaviour — the scroll container handles it. `min-h-full` fills short steps; tall steps grow naturally and cause the parent to scroll.

- **Risk**: `scrollTo({ behavior: 'instant' })` is not supported in all environments. Mitigation: it is supported in all modern browsers (Chrome 73+, Safari 14+, Firefox 36+). The app targets modern mobile browsers per `architecture/27_responsive.md`.

## Validation plan

- `rg -n "overflow-y-auto" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/StagedFormStep.tsx`: zero matches (removed)
- `rg -n "isTimelineCompact" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`: matches in `staged-form.types.ts`, `StagedForm.tsx`, `StagedFormTimeline.tsx` only
- `rg -n "@/features/\|react-hook-form\|useFormContext" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`: zero matches
- `npm run typecheck`: pass
- `npm run build`: pass
- Manual test via `TestingFormsSlidePage`:
  1. Open testing forms, verify all item fields visible at scroll-position 0 with no gradient covering them.
  2. Scroll down ≥ 24 px — timeline labels fade out, timeline compresses, top gradient becomes visible.
  3. Scroll back up — labels reappear, gradient fades out.
  4. Advance to customer step — scroll position resets to 0, timeline immediately expanded (no animation).
  5. Verify bottom gradient (above nav) is unaffected throughout.

## Review log

- `2026-05-21` David: plan authored from conversation review session.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
