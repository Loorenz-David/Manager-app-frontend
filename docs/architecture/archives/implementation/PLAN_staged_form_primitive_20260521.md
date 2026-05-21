# PLAN_staged_form_primitive_20260521

## Metadata

- Plan ID: `PLAN_staged_form_primitive_20260521`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T07:50:41Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_staged_form_system_20260521.md`

## Goal and intent

- Goal: Implement a domain-agnostic staged-form primitive system with an orchestrator hook and integrate it into `TestingFormsContent` as a three-step form (Item → Customer → Task).
- Business/user intent: Enable multi-step operational flows with a consistent mobile-first UX — horizontal timeline, directional slide transitions, external validation ownership.
- Non-goals: Backend integration, draft persistence, route-based step URLs, per-step RHF split.

## Scope

- In scope:
  - `src/types/staged-form.ts` — shared step types
  - `src/components/primitives/staged-form/` — all primitive files
  - `src/hooks/use-staged-form.ts` — orchestrator hook
  - `src/components/primitives/index.ts` — add exports
  - `src/features/testing_forms/components/TestingFormsContent.tsx` — refactor to staged form
  - Playwright spec: `tests/playwright/features/testing_forms/staged-form-flow.spec.ts`

- Out of scope:
  - API calls, TanStack Query, Zustand stores
  - Any surface registration changes
  - Routing changes

- Assumptions:
  - `lib/animation.ts` already exports `transitions.slide`; confirmed by reading the file.
  - `AnimatePresence` and `m` are available via `framer-motion` (in main bundle per `31_animations.md`).
  - `TestingFormsContent` currently uses a single RHF `FormProvider`; this plan keeps that shape.
  - `src/hooks/` already exists with `use-surface.ts` etc.; `use-staged-form.ts` is a new addition.

## Clarifications required

None — all blocking decisions resolved during intent alignment session (2026-05-21):
- Navigation model: orchestrator hook (controlled primitive)
- Timeline visual: numbered dots + connecting lines
- Navigation buttons: provided by the primitive with default labels
- Step transition: directional horizontal slide using `tabVariants` pattern + `transitions.slide`

## Acceptance criteria

1. `rg -n "useFormContext\|useController\|useForm\|react-hook-form" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/` returns zero matches.
2. `rg -n "@/features/" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/` returns zero matches.
3. `TestingFormsContent` renders a `StagedForm` with three steps: `item`, `customer`, `task`.
4. `data-testid="staged-form-timeline"` is present in the DOM.
5. `data-testid="staged-form-step-{id}-indicator"` exists for each of the three steps.
6. `data-testid="staged-form-advance-button"` and `data-testid="staged-form-back-button"` are present.
7. Forward advance triggers `form.trigger()` for the current step's fields before moving to the next step.
8. `npm run typecheck` passes with zero errors.
9. `npm run build` passes.
10. Playwright staged-form flow spec passes on mobile and desktop projects.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries — primitive in `components/primitives/`, hook in `hooks/`, no logic in components
- `architecture/01_architecture_local.md`: local surface types (slide/sheet/modal) — no impact on this plan
- `architecture/07_components.md`: named exports, one file one component, no nested definitions, `cva` for variants
- `architecture/09_forms.md`: forms are schema-first; primitive must stay RHF-free; `form.trigger()` called externally via callback
- `architecture/14_styling.md`: Tailwind + `cva`, `cn()`, no CSS files, no arbitrary values without comment
- `architecture/15_feature_structure.md`: feature boundary enforcement; primitive is not a feature
- `architecture/31_animations.md`: Framer Motion `m` + `AnimatePresence`, `transitions.slide` from `lib/animation.ts`, `reducedMotion="user"` already set at app root
- `architecture/27_responsive.md`: CSS-first responsive; `scrollbar-none` on overflow timeline; `useBreakpoint()` not needed here
- `architecture/06_client_state.md`: navigation state stays in React `useState` inside the hook — not Zustand

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types slide/sheet/modal; no impact on primitive design

### File read intent — pattern vs. relational

Prohibited (read contracts instead):
- Reading another primitive to understand cva variant structure → `07_components.md`, `14_styling.md`
- Reading surface shells to understand animation → `31_animations.md`

Permitted relational reads:
- `src/lib/animation.ts` — verify `transitions.slide` exists and its shape ✓ (done; `slide: { duration: 0.24, ease: easings.slideIn }`)
- `src/components/primitives/index.ts` — verify current exports before adding ✓ (done)
- `src/hooks/` — verify existing hook file conventions ✓ (done; `use-surface.ts` naming pattern)
- `src/features/testing_forms/components/TestingFormsContent.tsx` — existing form schema and field components ✓ (done)
- `src/types/common.ts`, `src/types/api.ts` — verify types file conventions before adding `staged-form.ts` ✓ (done; simple exports, no barrel)

### Skill selection

- Primary skill: `intention_planning/SKILL.md` + `goal_intent_alignment/SKILL.md` — used in pre-plan phase
- Trigger terms: `staged form`, `multi-step form`, `stepper`, `wizard`, `navigation guard`
- Excluded alternatives: none

## Implementation plan

### Step 1 — Shared types: `src/types/staged-form.ts`

Create a new file. Define types that are shared between the primitive and the hook.

```ts
export type StepStatus = 'active' | 'completed' | 'pending' | 'warning' | 'error' | 'locked';

export type StepConfig = {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

// Mutable per-step status map — keyed by stepId.
// The primitive reads this to apply visual state; the hook writes it.
export type StepStatusMap = Record<string, StepStatus>;
```

### Step 2 — Primitive types: `src/components/primitives/staged-form/staged-form.types.ts`

Define the component API and internal context shape. Import shared types from `@/types/staged-form`.

```ts
import type { StepConfig, StepStatus, StepStatusMap } from '@/types/staged-form';
export type { StepConfig, StepStatus, StepStatusMap };  // re-export for barrel

export type StagedFormProps = {
  steps: StepConfig[];
  activeStepId: string;
  onAdvance: () => void;
  onBack: () => void;
  onNavigate: (stepId: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing?: boolean;
  navigationMode?: 'sequential' | 'free';
  stepStatusMap?: StepStatusMap;
  direction?: 1 | -1;      // 1 = forward, -1 = backward — drives slide direction
  className?: string;
  children: React.ReactNode;  // StagedFormStep children
  'data-testid'?: string;
};

export type StagedFormContextValue = {
  steps: StepConfig[];
  activeStepId: string;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing: boolean;
  navigationMode: 'sequential' | 'free';
  stepStatusMap: StepStatusMap;
  direction: 1 | -1;
  onAdvance: () => void;
  onBack: () => void;
  onNavigate: (stepId: string) => void;
};
```

### Step 3 — Variants: `src/components/primitives/staged-form/staged-form.variants.ts`

Create a `cva` for the step indicator circle and label. Add a connector variant.

```ts
import { cva } from 'class-variance-authority';

export const stepIndicatorVariants = cva(
  [
    'relative flex size-8 shrink-0 items-center justify-center rounded-full border-2',
    'text-xs font-semibold transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ].join(' '),
  {
    variants: {
      status: {
        active:    'border-neutral-900 bg-neutral-900 text-white',
        completed: 'border-neutral-900 bg-neutral-900 text-white',
        pending:   'border-border bg-background text-muted-foreground',
        warning:   'border-yellow-500 bg-yellow-50 text-yellow-700',
        error:     'border-destructive bg-destructive/10 text-destructive',
        locked:    'border-muted bg-muted text-muted-foreground',
      },
      interactive: {
        true:  'cursor-pointer hover:opacity-80',
        false: 'cursor-default',
      },
    },
    defaultVariants: { status: 'pending', interactive: false },
  },
);

export const stepLabelVariants = cva(
  'mt-1 max-w-[56px] truncate text-center text-xs font-medium',
  {
    variants: {
      status: {
        active:    'text-foreground',
        completed: 'text-foreground',
        pending:   'text-muted-foreground',
        warning:   'text-yellow-700',
        error:     'text-destructive',
        locked:    'text-muted-foreground',
      },
    },
    defaultVariants: { status: 'pending' },
  },
);

export const connectorVariants = cva(
  'h-0.5 flex-1 transition-colors duration-150',
  {
    variants: {
      filled: {
        true:  'bg-neutral-900',
        false: 'bg-border',
      },
    },
    defaultVariants: { filled: false },
  },
);
```

### Step 4 — Internal context: `src/components/primitives/staged-form/StagedFormContext.tsx`

This file is NOT exported from the primitive's `index.ts`. It is a primitive-internal implementation detail. Sub-components (`StagedFormTimeline`, `StagedFormStep`, `StagedFormNavigation`) import directly from this file within the folder.

```tsx
import { createContext, useContext } from 'react';
import type { StagedFormContextValue } from './staged-form.types';

export const StagedFormContext = createContext<StagedFormContextValue | null>(null);

export function useStagedFormContext(): StagedFormContextValue {
  const ctx = useContext(StagedFormContext);
  if (!ctx) throw new Error('useStagedFormContext must be used inside <StagedForm>');
  return ctx;
}
```

### Step 5 — Timeline: `src/components/primitives/staged-form/StagedFormTimeline.tsx`

Horizontal scrollable timeline with numbered dot indicators and connecting lines.

Layout rules:
- Outer wrapper: `overflow-x-auto scrollbar-none` (CSS-only scroll, no bar)
- Inner container: `flex items-start px-6 py-4`
- Each step column: `flex flex-col items-center min-w-[64px]`
- Connector between steps: `h-0.5 flex-1 mt-[15px]` — the `mt-[15px]` aligns the center of the 2px line with the center of the 32px (`h-8`) indicator circle. `15px = (32px - 2px) / 2`. This requires an arbitrary value; comment must be present.
- Active step is scrolled into view via `ref` + `useEffect` calling `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })`.

Indicator rendering rules:
- `status` is resolved as: `isActive ? 'active' : (stepStatusMap[step.id] ?? 'pending')`
- Icon inside indicator:
  - `completed` → `<Check className="size-3.5" />` (lucide-react)
  - `locked`    → `<Lock className="size-3" />` (lucide-react)
  - `warning`   → `<AlertTriangle className="size-3.5" />` (lucide-react)
  - `error`     → `<AlertCircle className="size-3.5" />` (lucide-react)
  - default     → step number as text (`index + 1`)
- Connector `filled` prop: `stepStatusMap[step.id] === 'completed'` (connector after a completed step is filled)

Navigation rules:
- `isInteractive = navigationMode === 'free' && resolvedStatus !== 'locked'`
- Interactive step renders as a `<button type="button">` to satisfy accessibility
- Non-interactive step renders as a `<div>`
- `aria-current="step"` on the active indicator element

`data-testid` attributes:
- Container: `data-testid="staged-form-timeline"`
- Per-step indicator: `data-testid="staged-form-step-{step.id}-indicator"`
- Per-step label: `data-testid="staged-form-step-{step.id}-label"`

### Step 6 — Step content wrapper: `src/components/primitives/staged-form/StagedFormStep.tsx`

Renders a Framer Motion `m.div` for its content. `StagedForm` filters children by `id === activeStepId` before passing to `AnimatePresence`, so this component always renders when it is in the tree (it never conditionally returns null).

Animation variants (module-level, not inline):
```ts
const stepVariants = {
  enter: (dir: 1 | -1) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center:               { x: 0, opacity: 1 },
  exit:  (dir: 1 | -1) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};
```

`direction` is read from `useStagedFormContext()`.

The `m.div`:
- `key={id}` — required for `AnimatePresence` to track this element
- `custom={direction}` — passed to variant functions
- `variants={stepVariants}`
- `initial="enter"`, `animate="center"`, `exit="exit"`
- `transition={transitions.slide}` (from `@/lib/animation`)
- `className="w-full overflow-y-auto p-6"` + optional `className` prop

`data-testid` attribute: `data-testid="staged-form-step-{id}"`

The `StagedFormStep` props type:
```ts
type StagedFormStepProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
};
```

### Step 7 — Navigation bar: `src/components/primitives/staged-form/StagedFormNavigation.tsx`

Bottom navigation bar with Back and Next/Submit buttons.

Layout: `flex items-center justify-between border-t bg-background px-6 py-4`

Back button:
- `type="button"`
- `disabled={isFirstStep}`
- `className`: base style; when `isFirstStep` → `opacity-0 pointer-events-none` (hidden but keeps layout)
- Label: `backLabel` prop, default `'Back'`
- `data-testid="staged-form-back-button"`

Advance button:
- `type="button"` — never `type="submit"` because submit is handled by the `onAdvance` callback (which calls `onSubmit` on the last step)
- `disabled={isAdvancing}`
- Label: on last step → `submitLabel` (default `'Submit'`), otherwise `advanceLabel` (default `'Next'`)
- Pending label: `isAdvancing ? 'Checking…' : nextLabel`
- `data-testid="staged-form-advance-button"`

Props type:
```ts
type StagedFormNavigationProps = {
  advanceLabel?: string;   // default: 'Next'
  submitLabel?: string;    // default: 'Submit'
  backLabel?: string;      // default: 'Back'
  className?: string;
};
```

### Step 8 — Root component: `src/components/primitives/staged-form/StagedForm.tsx`

Composes all sub-components. Provides `StagedFormContext`. Filters children for `AnimatePresence`.

Structure:
```
<StagedFormContext.Provider value={contextValue}>
  <div data-testid={testId} className="flex h-full flex-col">
    <StagedFormTimeline />
    <div className="relative flex-1 overflow-x-hidden">
      <AnimatePresence custom={direction} mode="wait">
        {/* Only the active StagedFormStep is passed here */}
      </AnimatePresence>
    </div>
    <StagedFormNavigation />
  </div>
</StagedFormContext.Provider>
```

Child filtering logic (module-level helper, not inline in JSX):
```ts
function getActiveStepChild(
  children: React.ReactNode,
  activeStepId: string,
): React.ReactNode {
  return React.Children.toArray(children).find(
    (child) =>
      React.isValidElement(child) &&
      (child as React.ReactElement<{ id: string }>).props.id === activeStepId,
  ) ?? null;
}
```

Call as: `{getActiveStepChild(children, activeStepId)}`

`StagedFormTimeline` and `StagedFormNavigation` are composed directly inside `StagedForm`. Both read from context — no props needed.

Default prop values applied in the component signature:
- `isAdvancing = false`
- `navigationMode = 'sequential'`
- `stepStatusMap = {}`
- `direction = 1`

### Step 9 — Barrel: `src/components/primitives/staged-form/index.ts`

Export the public API. `StagedFormContext.tsx` is intentionally excluded.

```ts
export { StagedForm } from './StagedForm';
export { StagedFormStep } from './StagedFormStep';
export type {
  StagedFormProps,
  StagedFormContextValue,
  StepConfig,
  StepStatus,
  StepStatusMap,
} from './staged-form.types';
```

`StagedFormTimeline` and `StagedFormNavigation` are internal composition components. They are not exported — consumers cannot render them independently.

### Step 10 — Orchestrator hook: `src/hooks/use-staged-form.ts`

Domain-agnostic hook that manages all navigation state. Lives in `src/hooks/` per the architecture's "shared utility hooks" layer. Imports types only from `@/types/staged-form` (not from `components/`).

```ts
import type { StepConfig, StepStatus, StepStatusMap } from '@/types/staged-form';

export type StagedFormConfig = {
  steps: StepConfig[];
  mode?: 'sequential' | 'free';
  onBeforeAdvance?: (
    currentStepId: string,
    nextStepId: string | null,
  ) => boolean | Promise<boolean>;
  onNavigationGuard?: (targetStepId: string) => boolean;
  onSubmit?: () => void | Promise<void>;
};

export type StagedFormReturn = {
  steps: StepConfig[];
  activeStepId: string;
  activeStepIndex: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isAdvancing: boolean;
  direction: 1 | -1;
  navigationMode: 'sequential' | 'free';
  stepStatusMap: StepStatusMap;
  advance: () => void;      // async internally; void return for event handler compat
  back: () => void;
  navigateTo: (stepId: string) => void;
  setStepStatus: (stepId: string, status: StepStatus) => void;
};
```

State:
- `activeStepIndex: number` — useState, initial 0
- `direction: 1 | -1` — useState, initial 1
- `isAdvancing: boolean` — useState, initial false
- `stepStatusMap: StepStatusMap` — useState, initial `{}`

`advance()` behavior:
1. If `isLastStep`: call `onSubmit()` (wrapped with `isAdvancing` guard), return.
2. Compute `nextStepId = steps[activeStepIndex + 1]?.id ?? null`.
3. If `onBeforeAdvance` provided: set `isAdvancing = true`, await result, set `isAdvancing = false`. If result is falsy, return early.
4. `setStepStatusMap(prev => ({ ...prev, [currentStepId]: 'completed' }))`.
5. `setDirection(1)`.
6. `setActiveStepIndex(i => i + 1)`.

`back()` behavior:
1. If `isFirstStep`, return early.
2. `setDirection(-1)`.
3. `setActiveStepIndex(i => i - 1)`.

`navigateTo(stepId)` behavior:
1. Find target index; if not found return early.
2. If `mode === 'sequential'`, return early (no jump navigation).
3. If `onNavigationGuard` provided and returns false, return early.
4. If target step status is `'locked'`, return early.
5. `setDirection(targetIndex > activeStepIndex ? 1 : -1)`.
6. `setActiveStepIndex(targetIndex)`.

`setStepStatus(stepId, status)`: updates `stepStatusMap` for that stepId.

All handlers use `useCallback` with correct dependency arrays.

Returned value matches `StagedFormReturn` type.

### Step 11 — Update primitives barrel: `src/components/primitives/index.ts`

Append to the existing file:

```ts
export { StagedForm, StagedFormStep } from './staged-form';
export type {
  StagedFormProps,
  StepConfig,
  StepStatus,
  StepStatusMap,
} from './staged-form';
```

Also export `useStagedForm` from `src/hooks/use-staged-form.ts` — but this is NOT part of the primitives barrel. It is imported directly:
```ts
import { useStagedForm } from '@/hooks/use-staged-form';
```

### Step 12 — Refactor `TestingFormsContent.tsx`

Import changes:
- Add: `StagedForm`, `StagedFormStep` from `@/components/primitives`
- Add: `useStagedForm` from `@/hooks/use-staged-form`
- Keep all existing imports (CustomerFieldGroup, ItemDetailsFieldGroup, etc.)

The RHF setup remains unchanged (one `FormProvider`, one `useForm`, same schema). Add a `staged` variable:

```ts
const staged = useStagedForm({
  steps: [
    { id: 'item',     title: 'Item' },
    { id: 'customer', title: 'Customer' },
    { id: 'task',     title: 'Task' },
  ],
  mode: 'free',
  onBeforeAdvance: async (currentStepId) => {
    const stepFieldsMap: Record<string, FieldPath<TestingFormsValues>[]> = {
      item:     ['item', 'item_issues'],
      customer: ['customer'],
      task:     ['fulfillment_method', 'return_source'],
    };
    return form.trigger(stepFieldsMap[currentStepId] ?? []);
  },
  onSubmit: () => {
    // form.handleSubmit returns a handler; call it with no event
    return form.handleSubmit((values) => {
      console.log('testing_forms submit', values);
    })();
  },
});
```

Replace the current flat `<form>` body with:

```tsx
<FormProvider {...form}>
  <form
    data-testid="testing-forms-form"
    noValidate
    onSubmit={(e) => e.preventDefault()}   // submit via staged.advance on last step
    className="flex h-full flex-col"
  >
    <StagedForm
      steps={staged.steps}
      activeStepId={staged.activeStepId}
      onAdvance={staged.advance}
      onBack={staged.back}
      onNavigate={staged.navigateTo}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      isAdvancing={staged.isAdvancing}
      direction={staged.direction}
      navigationMode={staged.navigationMode}
      stepStatusMap={staged.stepStatusMap}
      data-testid="testing-forms-staged-form"
    >
      <StagedFormStep id="item">
        <div className="flex flex-col gap-4">
          <ItemDetailsFieldGroup />
          <ItemCategorySelectionField />
          <ItemIssuesField />
        </div>
      </StagedFormStep>

      <StagedFormStep id="customer">
        <CustomerFieldGroup />
      </StagedFormStep>

      <StagedFormStep id="task">
        <div className="flex flex-col gap-4">
          <TaskFulfillmentMethodField />
          <TaskReturnSourceField />
          <TaskReadyByDateField />
          <TaskDeliveryDateField />
        </div>
      </StagedFormStep>
    </StagedForm>
  </form>
</FormProvider>
```

Remove the original `<button type="submit">Submit test form</button>` — the staged form navigation handles submission.

Remove `ItemFastIssueActionField` if it was in the item section before; it can be added back inside `StagedFormStep id="item"` if desired.

Note: `FieldPath<TestingFormsValues>` requires importing `type { FieldPath } from 'react-hook-form'`.

### Step 13 — Playwright spec

Path: `tests/playwright/features/testing_forms/staged-form-flow.spec.ts`

Test cases:
1. **Timeline renders** — `data-testid="staged-form-timeline"` visible; three step indicators present.
2. **Advance to step 2** — click advance button; step 2 indicator becomes active; step 1 indicator shows completed state.
3. **Back to step 1** — click back button; step 1 indicator becomes active.
4. **Free navigation** — click Customer indicator directly; Customer step content renders.
5. **Submit on last step** — advance to step 3, click "Submit"; `console.log` output (or no error thrown).
6. **Back button hidden on first step** — on step 1, back button has `opacity-0` / is not interactable.

Use `tests/playwright/fixtures/app-fixture.ts` (existing fixture). Call `auth.signIn()` at the start of the spec. Navigate to the testing forms slide surface.

## Risks and mitigations

- Risk: `React.Children.toArray` + filter may lose the `key` prop passed by consumers, causing `AnimatePresence` to not track elements properly.
  Mitigation: `React.Children.toArray` assigns stable keys; `StagedFormStep` sets its own `key={id}` on the `m.div`, which is what `AnimatePresence` tracks. Test with DevTools to confirm.

- Risk: `direction` captured in the exit variant is stale if Framer Motion resolves `custom` at mount time rather than exit time.
  Mitigation: Pass `custom={direction}` on both the `AnimatePresence` element and each `m.div`. Framer Motion reads `custom` from `AnimatePresence` for exiting children when the value on the child is no longer available (because it unmounted). This is documented Framer Motion behavior with `AnimatePresence`.

- Risk: `onBeforeAdvance` is async but `advance()` is called from a `<button onClick>`. Unhandled promise rejection if the callback throws.
  Mitigation: Wrap the `onBeforeAdvance` call in try/finally inside `advance()`, setting `isAdvancing = false` in the `finally` block. Log errors in dev mode.

- Risk: `form.handleSubmit()` returns a Promise in some RHF versions. Wrapping it in `onSubmit` callback must handle async correctly.
  Mitigation: `useStagedForm.advance()` already awaits `onSubmit()`. The consumer wraps `form.handleSubmit(handler)()` which returns a Promise — this is awaited correctly.

- Risk: `overflow-x-hidden` on the step content container clips content that intentionally extends horizontally (e.g., calendar pickers, popovers).
  Mitigation: Sheet/modal surfaces opened by field components (calendar, issue severity picker) render into `document.body` via portals and are unaffected by `overflow-x-hidden` on a parent. Verify during manual testing.

## Validation plan

- `npm run typecheck`: zero TypeScript errors, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run build`: no build errors
- `rg -n "useFormContext\|useController\|useForm\|react-hook-form" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`: zero matches
- `rg -n "@/features/" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`: zero matches
- `rg -n "@/store/" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`: zero matches
- Manual test via `TestingFormsSlidePage` (open `testing-forms-slide` surface): advance through all 3 steps, go back, tap timeline in free mode, submit
- `npx playwright test --grep "staged-form" --project=mobile`: pass
- `npx playwright test --grep "staged-form" --project=desktop`: pass

## data-testid naming reference

| Element | `data-testid` value |
|---|---|
| `StagedForm` root div | `"testing-forms-staged-form"` (consumer-provided) |
| Timeline wrapper | `"staged-form-timeline"` |
| Step indicator (each step) | `"staged-form-step-{id}-indicator"` |
| Step label (each step) | `"staged-form-step-{id}-label"` |
| Step content wrapper | `"staged-form-step-{id}"` |
| Navigation bar | `"staged-form-navigation"` |
| Back button | `"staged-form-back-button"` |
| Advance/Submit button | `"staged-form-advance-button"` |

## Review log

- `2026-05-21` David: initial plan reviewed and confirmed. Alignment session completed (orchestrator hook, dots+line, primitive nav bar, directional slide).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
