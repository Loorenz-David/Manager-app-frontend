# PLAN_task_creation_forms_20260523

## Metadata

- Plan ID: `PLAN_task_creation_forms_20260523`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-22T23:15:12Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Implement the three task-creation forms (`return`, `pre_order`, `internal`), a `TaskCreationFormProvider` that generates stable per-session client IDs, and an animated FAB on `TasksPage` that fans out to expose the three form launchers.
- Business/user intent: Managers need to create tasks from the Tasks view. Each task type has a distinct staged-form flow adapted to the relevant entity data.
- Non-goals: Submit controllers, API mutations, and form normalizers (deferred). Editing existing tasks. Validation feedback beyond step-advance guards.

## Scope

- In scope:
  - New feature `features/task-creation/` (types, surfaces, provider, components, index)
  - Three slide pages in `pages/task-creation/`
  - Animated FAB component (`TaskCreationFab`) wired to `TasksPage`
  - `TaskCreationFormProvider` — stable `useRef`-based client IDs for task, item, customer
  - Surface registrations for all three form slides
  - `app/surface-registry.ts` update
  - `pages/tasks/TasksPage.tsx` update (replace `OpenTestingFormsButton` with `TaskCreationFab`)
- Out of scope: Submit logic, API mutations, server-side validation.
- Assumptions:
  - `ItemUpholsteryField` requires a `Controller` wrapper (takes `value`/`onChange` props, not self-wired).
  - `ItemCategorySelectionField` writes `item.item_category_id` AND `item.major_category` to the form — both paths are available for conditional rendering via `useWatch`.
  - The nav bar height is ~56 px; FAB uses `fixed bottom-24 right-4` so it sits above it.
  - Framer-motion is already installed (used in `SurfaceProvider`).

## Clarifications required

- [ ] `What icon should each FAB action button use?` — Needed to differentiate the three types visually. Suggested defaults: `return` → `RotateCcw`, `pre_order` → `ShoppingBag`, `internal` → `Wrench` (all from lucide-react). **Use these defaults unless overridden.**
- [ ] `What are the exact title strings for each slide header?` — Slide page calls `header.setTitle(...)`. Suggested defaults: `'New return'`, `'New pre-order'`, `'New internal task'`. **Use these defaults unless overridden.**

## Acceptance criteria

1. Tapping `+` on `TasksPage` animates three action buttons into a quarter-circle fan around the shrunk primary button.
2. Tapping `×` reverses the animation smoothly.
3. Tapping any of the three action buttons opens the corresponding slide form and collapses the fan.
4. Each slide form renders the correct steps, fields, and conditional logic described in the field matrix.
5. Step advance validates the current step's fields before moving forward.
6. On the final step, advancing validates all steps.
7. `EntityImagesProvider` receives the stable `itemClientId` from `TaskCreationFormProvider`.
8. Navigating away and reopening the same form session generates fresh client IDs.
9. Zero TypeScript errors (`npm run typecheck`).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: feature placement, import paths
- `architecture/02_types.md`: Zod schema patterns
- `architecture/06_client_state.md`: no derived state in stores; client IDs generated at component mount via `useRef`
- `architecture/07_components.md`: component structure, `data-testid` on feature-critical elements
- `architecture/08_hooks.md`: hook patterns
- `architecture/09_forms.md`: `useForm`, `FormProvider`, `zodResolver`, step validation
- `architecture/14_styling.md`: Tailwind, `cn()`, class ordering
- `architecture/15_feature_structure.md`: no sibling-layer imports; public API via `index.ts`
- `architecture/23_providers.md`: context provider pattern
- `architecture/28_surfaces.md`: slide surface registration and page pattern
- `architecture/31_animations.md`: framer-motion variants, `AnimatePresence`

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` pattern for primary tab routes
- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`); slide is correct for these forms
- `architecture/31_animations.md`: acceleration/deceleration via `ease: [0.32, 0.72, 0, 1]` or `easeInOut`

### File read intent — pattern vs. relational

Permitted relational reads:
- `src/features/testing_forms/components/TestingFormsContent.tsx` — existing field wiring reference (what fields exist, how `Controller` wraps `ItemUpholsteryField`, `useStagedForm` usage)
- `src/features/items/types.ts` — exact schema shapes (`ItemDetailsFieldsSchema`, `ItemUpholsteryFieldsSchema`, `ItemIssuesFieldsSchema`)
- `src/features/tasks/types.ts` — `TASK_TYPE`, `TASK_RETURN_SOURCE`, `TASK_FULFILLMENT_METHOD`, `TASK_RETURN_METHOD`
- `src/features/working-sections/types.ts` — `WorkingSectionPickerFieldsSchema`
- `src/features/customers/types.ts` — `CustomerFieldsSchema`
- `src/app/surface-registry.ts` — verify spread pattern before updating
- `src/lib/client-id.ts` — `generateClientId` signature and entity keys (`ExecutionTask`, `Item`, `Customer`)

Prohibited (pattern reads — contract covers these):
- Reading another provider to understand context shell → `23_providers.md`
- Reading another action hook to understand cache snapshot → `08_hooks.md`
- Reading another slide page to understand page structure → `28_surfaces_local.md`

### Skill selection

- Primary skill: `skills/feature_build/SKILL.md` (if present)
- Trigger terms: `form`, `surface`, `slide`, `animation`, `provider`, `staged form`

## Implementation plan

### Step 1 — Create `features/task-creation/types.ts`

Define three form schemas and supporting types. All schemas compose existing field schemas from peer features (imported via their feature `index.ts` public API only).

```
src/features/task-creation/types.ts
```

Contents:

```ts
import { z } from 'zod';

import { CustomerFieldsSchema } from '@/features/customers';
import {
  ItemDetailsFieldsSchema,
  ItemIssuesFieldsSchema,
  ItemUpholsteryFieldsSchema,
} from '@/features/items';
import {
  TaskAdditionalDetailsFieldsSchema,
  TASK_FULFILLMENT_METHOD,
  TASK_RETURN_SOURCE,
} from '@/features/tasks';
import { WorkingSectionPickerFieldsSchema } from '@/features/working-sections';
import { DateOnlySchema } from '@/types/common';

export const TASK_CREATION_FORM_TYPE = ['return', 'pre_order', 'internal'] as const;
export type TaskCreationFormType = (typeof TASK_CREATION_FORM_TYPE)[number];

// ── Return form ──────────────────────────────────────────────────────────────

export const ReturnFormSchema = z.object({
  item: ItemDetailsFieldsSchema,
  item_upholstery: ItemUpholsteryFieldsSchema,
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  customer: CustomerFieldsSchema,
  return_source: z.enum(TASK_RETURN_SOURCE).optional(),
  fulfillment_method: z.enum(TASK_FULFILLMENT_METHOD).optional(),
  scheduled_start_at: DateOnlySchema.nullable().optional(),
  scheduled_end_at: DateOnlySchema.nullable().optional(),
  ready_by_at: DateOnlySchema.nullable().optional(),
  additional_details: TaskAdditionalDetailsFieldsSchema.shape.additional_details,
});
export type ReturnFormValues = z.input<typeof ReturnFormSchema>;

// ── Pre-order form ────────────────────────────────────────────────────────────
// Same shape as ReturnFormSchema; kept separate for independent future evolution.

export const PreOrderFormSchema = ReturnFormSchema;
export type PreOrderFormValues = ReturnFormValues;

// ── Internal form ─────────────────────────────────────────────────────────────

export const InternalFormSchema = z.object({
  item: ItemDetailsFieldsSchema,
  item_upholstery: ItemUpholsteryFieldsSchema,
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,
  needs_cleaning_assignment: WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
  oiling_treatment_assignment: WorkingSectionPickerFieldsSchema.shape.oiling_treatment_assignment,
  working_section_assignments: WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
  ready_by_at: DateOnlySchema.nullable().optional(),
  additional_details: TaskAdditionalDetailsFieldsSchema.shape.additional_details,
});
export type InternalFormValues = z.input<typeof InternalFormSchema>;
```

### Step 2 — Create `features/task-creation/providers/TaskCreationFormProvider.tsx`

Generates stable client IDs once per form session using `useRef`. Mounts fresh every time the slide opens (because the slide page is unmounted on close), so each session gets new IDs.

```
src/features/task-creation/providers/TaskCreationFormProvider.tsx
```

```ts
import { createContext, useContext, useRef } from 'react';

import { generateClientId } from '@/lib/client-id';

type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
};

const TaskCreationFormContext = createContext<TaskCreationFormContextValue | null>(null);

export function TaskCreationFormProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const taskClientId = useRef(generateClientId('ExecutionTask')).current;
  const itemClientId = useRef(generateClientId('Item')).current;
  const customerClientId = useRef(generateClientId('Customer')).current;

  return (
    <TaskCreationFormContext.Provider value={{ taskClientId, itemClientId, customerClientId }}>
      {children}
    </TaskCreationFormContext.Provider>
  );
}

export function useTaskCreationFormContext(): TaskCreationFormContextValue {
  const context = useContext(TaskCreationFormContext);
  if (!context) {
    throw new Error('useTaskCreationFormContext must be used inside TaskCreationFormProvider');
  }
  return context;
}
```

### Step 3 — Create `features/task-creation/surfaces.ts`

Three lazy slide registrations — one per form type.

```
src/features/task-creation/surfaces.ts
```

```ts
import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const TASK_CREATION_RETURN_SURFACE_ID = 'task-creation-return-slide';
export const TASK_CREATION_PRE_ORDER_SURFACE_ID = 'task-creation-pre-order-slide';
export const TASK_CREATION_INTERNAL_SURFACE_ID = 'task-creation-internal-slide';

export const taskCreationSurfaces: SurfaceRegistrations = {
  [TASK_CREATION_RETURN_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/ReturnTaskSlidePage').then((m) => ({ default: m.ReturnTaskSlidePage })),
    ),
  },
  [TASK_CREATION_PRE_ORDER_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/PreOrderTaskSlidePage').then((m) => ({ default: m.PreOrderTaskSlidePage })),
    ),
  },
  [TASK_CREATION_INTERNAL_SURFACE_ID]: {
    surface: 'slide',
    component: lazy(() =>
      import('@/pages/task-creation/InternalTaskSlidePage').then((m) => ({ default: m.InternalTaskSlidePage })),
    ),
  },
};
```

### Step 4 — Create `features/task-creation/components/ReturnFormContent.tsx`

Three-step staged form for `return` task type. The form reads `item.major_category` via `useWatch` to conditionally render seat-specific fields.

```
src/features/task-creation/components/ReturnFormContent.tsx
```

**Imports needed:**
```ts
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form';

import { StagedForm, StagedFormStep } from '@/components/primitives';
import { CustomerFieldGroup } from '@/features/customers';
import { EntityImagesProvider, ImagePreviewGrid } from '@/features/images';
import {
  ItemCategorySelectionField,
  ItemDesignerField,
  ItemIdentityField,
  ItemIssuesField,
  ItemPositionField,
  ItemQuantityField,
  ItemUpholsteryAmountField,
  ItemUpholsteryField,
} from '@/features/items';
import {
  TaskAdditionalDetailsField,
  TaskDeliveryDateField,
  TaskFulfillmentMethodField,
  TaskReadyByDateField,
  TaskReturnSourceField,
} from '@/features/tasks';
import { useStagedForm } from '@/hooks/use-staged-form';
import { useTaskCreationFormContext } from '../providers/TaskCreationFormProvider';
import { ReturnFormSchema, type ReturnFormValues } from '../types';
```

**Steps config:**
```ts
steps: [
  { id: 'item', title: 'Item' },
  { id: 'customer', title: 'Customer' },
  { id: 'task', title: 'Task' },
]
```

**Step validation map:**
```ts
const stepFieldsMap: Record<string, FieldPath<ReturnFormValues>[]> = {
  item: ['item', 'item_upholstery', 'item_issues'],
  customer: ['customer'],
  task: ['return_source', 'fulfillment_method', 'additional_details'],
};
```

**On last step advance:** trigger all fields; if errors exist, set 'item' or 'customer' step to 'error'.

**Default values:**
```ts
{
  item: {
    designer: '',
    article_number: '',
    sku: '',
    quantity: 1,          // defaults to 1
    item_position: '',
    item_currency: undefined,
    item_category_id: undefined,
    major_category: undefined,
  },
  item_upholstery: {
    upholstery_client_id: null,
    upholstery_amount_meters: null,
  },
  item_issues: [],
  customer: {
    display_name: '',
    customer_type: undefined,
    primary_email: '',
    primary_phone_number: '',
    address: { street: '', city: '', postal_code: '', country: '' },
  },
  return_source: undefined,
  fulfillment_method: undefined,
  scheduled_start_at: null,
  scheduled_end_at: null,
  ready_by_at: null,
  additional_details: '',
}
```

**Item step JSX field order:**
1. `<ItemIdentityField />`
2. `<ItemQuantityField />`
3. `<ItemPositionField />`
4. `<ItemCategorySelectionField />`
5. `<ItemIssuesField />`
6. If `majorCategory === 'seat'`:
   ```tsx
   <Controller
     name="item_upholstery.upholstery_client_id"
     control={form.control}
     render={({ field }) => (
       <ItemUpholsteryField
         value={field.value}
         onChange={field.onChange}
         title="Select upholstery"
         description="Choose the upholstery for this item."
       />
     )}
   />
   <ItemUpholsteryAmountField />
   ```
7. `<ItemDesignerField />`
8. `<EntityImagesProvider entityType="item" entityClientId={itemClientId}><ImagePreviewGrid maxImages={6} /></EntityImagesProvider>`

`itemClientId` is read from `useTaskCreationFormContext()`.

`majorCategory` is read from:
```ts
const majorCategory = useWatch({ control: form.control, name: 'item.major_category' });
```

**Customer step JSX:**
```tsx
<CustomerFieldGroup />
```

**Task step JSX field order:**
1. `<TaskReturnSourceField />`
2. `<TaskFulfillmentMethodField />`
3. `<TaskDeliveryDateField />` — renders the scheduled_start_at / scheduled_end_at range; label changes based on `fulfillment_method` value (field handles this internally per existing implementation)
4. `<TaskReadyByDateField />`
5. `<TaskAdditionalDetailsField />`

**Wrapper:** `<FormProvider {...form}><form noValidate onSubmit={e => e.preventDefault()} className="flex h-full flex-col" data-testid="return-form">...</form></FormProvider>`

No heading or description paragraphs inside steps — the `StagedForm` container provides navigation context.

### Step 5 — Create `features/task-creation/components/PreOrderFormContent.tsx`

Structurally identical to `ReturnFormContent`. Uses `PreOrderFormSchema`, `PreOrderFormValues`. `data-testid` root: `"pre-order-form"`. Submit logs `'pre_order_form submit'`. No heading/description inside steps.

### Step 6 — Create `features/task-creation/components/InternalFormContent.tsx`

Three steps: `item`, `assignment`, `task`.

```
src/features/task-creation/components/InternalFormContent.tsx
```

**Imports needed** (same pattern as `ReturnFormContent` plus working-section fields):
```ts
import {
  NeedsCleaningPickerField,
  OilingTreatmentPickerField,
  WorkingSectionPickerField,
} from '@/features/working-sections';
```

**Steps config:**
```ts
steps: [
  { id: 'item', title: 'Item' },
  { id: 'assignment', title: 'Assignment' },
  { id: 'task', title: 'Task' },
]
```

**Step validation map:**
```ts
{
  item: ['item', 'item_upholstery', 'item_issues', 'needs_cleaning_assignment', 'oiling_treatment_assignment'],
  assignment: ['working_section_assignments'],
  task: ['ready_by_at', 'additional_details'],
}
```

**Default values:**
```ts
{
  item: {
    designer: '',
    article_number: '',
    sku: '',
    quantity: 1,
    item_position: '',
    item_currency: undefined,
    item_category_id: undefined,
    major_category: undefined,
  },
  item_upholstery: { upholstery_client_id: null, upholstery_amount_meters: null },
  item_issues: [],
  needs_cleaning_assignment: null,
  oiling_treatment_assignment: null,
  working_section_assignments: [],
  ready_by_at: null,
  additional_details: '',
}
```

**`majorCategory`** — read via `useWatch` on `'item.major_category'` (same as ReturnFormContent).

**Item step JSX field order:**
1. `<ItemIdentityField />`
2. `<ItemCategorySelectionField />`
3. If `majorCategory === 'seat'`: `<ItemQuantityField />`, `<ItemPositionField />`
4. If `majorCategory === 'wood'`: `<ItemIssuesField />`, `<NeedsCleaningPickerField />`, `<OilingTreatmentPickerField />`
5. If `majorCategory === 'seat'`:
   ```tsx
   <Controller name="item_upholstery.upholstery_client_id" ... />
   <ItemUpholsteryAmountField />
   ```
6. `<ItemDesignerField />`

**Assignment step JSX:**
```tsx
<WorkingSectionPickerField majorCategory={majorCategory} />
```
`majorCategory` value comes from the same `useWatch` — read at the component level and passed as a prop. Since this step is only shown after the item step, `majorCategory` should have a value, but `WorkingSectionPickerField` already handles `undefined` by showing all sections.

**Task step JSX field order:**
1. `<EntityImagesProvider entityType="item" entityClientId={itemClientId}><ImagePreviewGrid maxImages={6} /></EntityImagesProvider>`
2. `<TaskReadyByDateField />`
3. `<TaskAdditionalDetailsField />`

### Step 7 — Create slide pages in `pages/task-creation/`

Three thin page files. Each:
1. Wraps content in `TaskCreationFormProvider`
2. Sets the slide header title via `useSurfaceHeader` or `SurfaceHeaderContext`
3. Renders the corresponding form content component

**`pages/task-creation/ReturnTaskSlidePage.tsx`:**
```tsx
import { useContext, useEffect } from 'react';
import { ReturnFormContent } from '@/features/task-creation';
import { TaskCreationFormProvider } from '@/features/task-creation';
import { SurfaceHeaderContext } from '@/providers/SurfaceProvider';

export function ReturnTaskSlidePage(): React.JSX.Element {
  const header = useContext(SurfaceHeaderContext);
  useEffect(() => { header?.setTitle('New return'); }, [header]);
  return (
    <TaskCreationFormProvider>
      <ReturnFormContent />
    </TaskCreationFormProvider>
  );
}
```

**`pages/task-creation/PreOrderTaskSlidePage.tsx`:** same pattern, title `'New pre-order'`, renders `<PreOrderFormContent />`.

**`pages/task-creation/InternalTaskSlidePage.tsx`:** same pattern, title `'New internal task'`, renders `<InternalFormContent />`.

### Step 8 — Create `features/task-creation/components/TaskCreationFab.tsx`

Animated FAB with a primary button and three radial child buttons.

**Behavior:**
- `isOpen` boolean state controls expanded/collapsed state
- Primary button: `fixed bottom-24 right-4 z-40`
  - Size: `size-14` (56 px) when collapsed
  - When `isOpen`: scales to 70% (`scale-[0.7]`), icon swaps `Plus` → `X`
  - Animation: `motion.button` with `animate={{ scale: isOpen ? 0.7 : 1 }}`
  - `transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }`
  - Background: `bg-primary text-primary-foreground`
  - Border radius: `rounded-full`
- Three child buttons (framer-motion `motion.button`):
  - `fixed` positioned at same anchor as primary button
  - Scale from `scale-0` (closed) to `scale-[0.7]` (open)
  - Translate to final quarter-circle positions (radius ≈ 72 px):
    - Button 0 (directly left): `x: -72, y: 0`
    - Button 1 (diagonal up-left): `x: -51, y: -51`
    - Button 2 (directly up): `x: 0, y: -72`
  - `initial={{ scale: 0, x: 0, y: 0 }}`
  - `animate` when `isOpen`: `{ scale: 0.7, x: finalX, y: finalY }`
  - `animate` when closed: `{ scale: 0, x: 0, y: 0 }`
  - Same `transition` curve and duration as primary button
  - Stagger with `delay`: button 0 → 0ms, button 1 → 30ms, button 2 → 60ms (closing reverses)
  - Size: `size-14`, `rounded-full`, background color matches primary

**Child button config (in order):**
```ts
const ACTION_BUTTONS = [
  {
    id: 'return',
    surfaceId: TASK_CREATION_RETURN_SURFACE_ID,
    Icon: RotateCcw,
    label: 'New return',
  },
  {
    id: 'pre_order',
    surfaceId: TASK_CREATION_PRE_ORDER_SURFACE_ID,
    Icon: ShoppingBag,
    label: 'New pre-order',
  },
  {
    id: 'internal',
    surfaceId: TASK_CREATION_INTERNAL_SURFACE_ID,
    Icon: Wrench,
    label: 'New internal task',
  },
] as const;
```

**On child button press:**
```ts
function handleActionPress(surfaceId: string) {
  useSurfaceStore.getState().open(surfaceId);
  setIsOpen(false);
}
```

**Accessibility:** Primary button `aria-label` toggles `"Open task creation menu"` / `"Close task creation menu"`. Each child button has `aria-label` matching its `label` string.

**`data-testid`:** `task-creation-fab` (primary), `task-creation-fab-action-{id}` (children).

### Step 9 — Create `features/task-creation/index.ts`

Public API:

```ts
export { TaskCreationFab } from './components/TaskCreationFab';
export { ReturnFormContent } from './components/ReturnFormContent';
export { PreOrderFormContent } from './components/PreOrderFormContent';
export { InternalFormContent } from './components/InternalFormContent';
export { TaskCreationFormProvider, useTaskCreationFormContext } from './providers/TaskCreationFormProvider';
export { taskCreationSurfaces } from './surfaces';
export {
  TASK_CREATION_RETURN_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  TASK_CREATION_INTERNAL_SURFACE_ID,
} from './surfaces';
export { ReturnFormSchema, PreOrderFormSchema, InternalFormSchema } from './types';
export type { ReturnFormValues, PreOrderFormValues, InternalFormValues, TaskCreationFormType } from './types';
```

### Step 10 — Register surfaces in `app/surface-registry.ts`

Add to the spread list:
```ts
import { taskCreationSurfaces } from '@/features/task-creation';
// ...
export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...taskCreationSurfaces,   // add this line
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
};
```

### Step 11 — Update `pages/tasks/TasksPage.tsx`

Replace `OpenTestingFormsButton` with `TaskCreationFab`. The FAB is `fixed` so it does not need to live inside the page's `flex flex-col` div — render it as a sibling fragment.

```tsx
import { lazy, Suspense } from 'react';
import { TaskCreationFab } from '@/features/task-creation';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const TasksRouteEntry = lazy(() =>
  import('@/features/tasks/route-entry').then((module) => ({
    default: module.TasksRouteEntry,
  })),
);

export function TasksPage(): React.JSX.Element {
  return (
    <>
      <div className="flex flex-col">
        <Suspense fallback={<PageSkeleton />}>
          <TasksRouteEntry />
        </Suspense>
      </div>
      <TaskCreationFab />
    </>
  );
}
```

The `OpenTestingFormsButton` import and the wrapping `<div className="border-b px-6 py-4">` are removed.

## Risks and mitigations

- Risk: `ItemUpholsteryField` renders inside `Controller` — must not also be registered in `useController` internally (verify it uses prop-based control only).
  Mitigation: Read `ItemUpholsteryField` source before implementing the Controller wrappers. If self-wired, remove the Controller.

- Risk: `useWatch` on `'item.major_category'` returns `undefined` until `ItemCategorySelectionField` writes to it — conditional blocks show nothing initially.
  Mitigation: Treat `undefined` as "no category" — do not render conditional fields. This is correct UX.

- Risk: framer-motion `motion.button` with `fixed` positioning and z-index stacking may be occluded by the surface overlay stack.
  Mitigation: Set FAB `z-40`; surface overlay renders at higher z-index (e.g., `z-50`). FAB is automatically hidden under open surfaces.

- Risk: `TaskCreationFormProvider` client IDs regenerate if the component re-mounts unexpectedly.
  Mitigation: `useRef` initial value is computed only once. As long as the slide page is not forcibly unmounted mid-session this is safe. Noted for future session-restore feature.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep task-creation`: all new Vitest tests pass (no unit tests required in this plan — see note)
- Manual smoke test:
  - Open `TasksPage`, tap `+` FAB, confirm three buttons fan out
  - Tap `×`, confirm fan collapses
  - Open each form type, verify step navigation and conditional fields
  - Select `seat` category on return form — upholstery and amount fields appear
  - Select `wood` category on internal form — issues, cleaning, oiling fields appear
  - `EntityImagesProvider` receives a non-empty `itemClientId`

Note: Unit test files are not included in this plan. Tests for form content and FAB behaviour can be added in a follow-up plan following `17_testing.md`.

## Review log

- `2026-05-23` Claude: initial plan authored

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `—`
