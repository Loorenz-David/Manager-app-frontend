# PLAN_working_section_shortcut_fields_20260523

## Metadata

- Plan ID: `PLAN_working_section_shortcut_fields_20260523`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-22T22:32:23Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: (1) Extend the working section API shape with `dependencies`, `item_categories` (including `major_category`), and `supported_issue_types`. (2) Add a `majorCategory` filter prop to `WorkingSectionPickerField`. (3) Add two single-assignment shortcut fields — `NeedsCleaningPickerField` and `OilingTreatmentPickerField`.
- Business/user intent: The API is expanding the section payload; the `majorCategory` filter lets parent forms show only relevant sections for the selected item type. The shortcut fields let managers assign cleaning and oiling workers without navigating the full section grid.
- Non-goals: No new API endpoints. No server-side changes. No changes to the worker picker bottom sheet page.

## Scope

- In scope:
  - New sub-schemas in `types.ts`: `WorkingSectionDependencySchema`, `WorkingSectionItemCategorySchema`, `WorkingSectionSupportedIssueTypeSchema`
  - Extend `WorkingSectionPickerOptionSchema` with `dependencies`, `item_categories`, `supported_issue_types`
  - Extend `WorkingSectionPickerFieldsSchema` with `needs_cleaning_assignment` and `oiling_treatment_assignment`
  - `majorCategory?: string` prop on `WorkingSectionPickerField` — filters displayed sections by `item_categories.some(c => c.major_category === majorCategory)`; omitting it shows all sections (current behaviour)
  - Update `working-sections-test-data.ts` to include new required fields
  - Update `WorkingSectionPickerField.test.tsx` — fix `OPTIONS` types + add `majorCategory` filtering tests
  - Two new flow hooks: `useNeedsCleaningPickerFlow`, `useOilingTreatmentPickerFlow`
  - Two new field components: `NeedsCleaningPickerField`, `OilingTreatmentPickerField`
  - Export all new symbols from `features/working-sections/index.ts`
  - Testing harness: register both shortcut fields in `TestingFormsContent.tsx`
- Out of scope:
  - Changes to `working-section-selection.store.ts` (no derived state in store — contract `06_client_state.md`)
  - Changes to `WorkingSectionWorkerPickerSheetPage` or `surfaces.ts`
  - Using `dependencies` or `supported_issue_types` beyond storing them in the type (future feature)
  - Production form wiring beyond the testing harness
- Assumptions:
  - `dependencies`, `item_categories`, and `supported_issue_types` are always present in the API response (not optional); Zod parses with `z.array(...)` defaults to empty array semantics at the type level
  - The shortcut fields filter on section NAME (partial match); `majorCategory` filtering does NOT apply to shortcut fields
  - The existing `useWorkingSectionPickerFlow` handles store population; shortcut flows compose it
  - Reuses existing `WORKING_SECTION_WORKER_PICKER_SURFACE_ID` sheet unchanged

## Clarifications required

_Resolved during implementation using the plan defaults: `cleaning`, `hardwax oil`, and `ground oil` keyword matching; `Sparkles` and `Droplets` icons; `Tap to assign` placeholder copy; and `Cleaning workers` / `Oiling workers` sheet titles._

## Acceptance criteria

1. `WorkingSectionPickerOptionSchema` parses `dependencies`, `item_categories` (with `major_category`), and `supported_issue_types` without error.
2. `WorkingSectionPickerField` with no prop renders all sections (unchanged behaviour).
3. `WorkingSectionPickerField` with `majorCategory="wood"` renders only sections whose `item_categories` contain at least one entry with `major_category === "wood"`.
4. A section whose `item_categories` spans both `"wood"` and `"seat"` appears when either major category is passed.
5. `NeedsCleaningPickerField` renders a single card with a cleaning icon and `Needs cleaning` title.
6. `OilingTreatmentPickerField` renders a single card with an oil icon and `Oiling treatment` title.
7. Both shortcut fields show the selected worker's avatar + username below the title when an assignment is set.
8. Tapping a shortcut card with exactly **one** combined worker auto-assigns without opening the sheet.
9. Tapping a shortcut card with **multiple** workers opens the worker picker sheet with the combined flat member list.
10. The X button clears the shortcut assignment.
11. Both shortcut fields hydrate correctly: existing assignment on mount resolves and displays worker name/avatar from the store.
12. `WorkingSectionPickerFieldsSchema` includes `needs_cleaning_assignment` and `oiling_treatment_assignment`.
13. All new symbols exported from `features/working-sections/index.ts`.
14. `npm run typecheck` passes with zero errors.
15. `npm run test -- --grep WorkingSectionPickerField` passes, including the new `majorCategory` filtering tests.

## Contracts and skills

### Contracts loaded

- `architecture/06_client_state.md`: No derived state in stores — filter maps and `majorCategory` filtering computed in components/flows via `useMemo`, never in Zustand
- `architecture/08_hooks.md`: Flow hook and form field patterns

### Local extensions loaded

- None

### File read intent — pattern vs. relational

Permitted (relational reads — understanding what exists):
- `features/working-sections/types.ts` — current schema to extend
- `features/working-sections/index.ts` — export list before adding
- `features/working-sections/flows/use-working-section-picker.flow.ts` — existing flow to compose in shortcut flows
- `features/working-sections/surfaces.ts` — surface ID and props type to reuse
- `features/working-sections/components/fields/WorkingSectionPickerField.tsx` — add `majorCategory` prop
- `features/working-sections/working-sections-test-data.ts` — update test fixtures
- `features/working-sections/components/fields/WorkingSectionPickerField.test.tsx` — update OPTIONS type + add new tests
- `features/testing_forms/components/TestingFormsContent.tsx` — form schema structure for new shortcut fields

## Architecture note — no derived state in store

The user suggested pre-computing filtered section maps at store injection time. This is rejected per `06_client_state.md`: "no derived state in stores." Filtering for `majorCategory` happens inline in the component; filtering for cleaning/oiling name keywords happens in flow hooks via `useMemo`. The store remains `options: WorkingSectionOption[]` — unchanged. This is the same decision applied during the prior audit of `item-category-selection.store.ts` (where `byMajorCategory` was removed from the store).

## Implementation plan

### Step 1 — Extend `WorkingSectionPickerOptionSchema` in `types.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/types.ts`

Add three new sub-schemas **before** `WorkingSectionPickerOptionSchema`, then extend that schema:

```ts
export const WorkingSectionDependencySchema = z.object({
  client_id: z.string(),
  name: z.string(),
});
export type WorkingSectionDependency = z.infer<typeof WorkingSectionDependencySchema>;

export const WorkingSectionItemCategorySchema = z.object({
  client_id: z.string(),
  name: z.string(),
  major_category: z.string(),
});
export type WorkingSectionItemCategory = z.infer<typeof WorkingSectionItemCategorySchema>;

export const WorkingSectionSupportedIssueTypeSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});
export type WorkingSectionSupportedIssueType = z.infer<typeof WorkingSectionSupportedIssueTypeSchema>;

export const WorkingSectionPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  dependencies: z.array(WorkingSectionDependencySchema),
  item_categories: z.array(WorkingSectionItemCategorySchema),
  supported_issue_types: z.array(WorkingSectionSupportedIssueTypeSchema),
  members: z.array(WorkingSectionMemberSchema),
});
```

`WorkingSectionOption` is a type alias of `WorkingSectionPickerOption` — no change needed, it updates automatically.

---

### Step 2 — Extend `WorkingSectionPickerFieldsSchema` in `types.ts`

Same file as Step 1. Add the two shortcut assignment fields:

```ts
export const WorkingSectionPickerFieldsSchema = z.object({
  working_section_assignments: z.array(WorkingSectionAssignmentSchema).default([]),
  needs_cleaning_assignment: WorkingSectionAssignmentSchema.nullable().optional(),
  oiling_treatment_assignment: WorkingSectionAssignmentSchema.nullable().optional(),
});
```

---

### Step 3 — Add `majorCategory` prop to `WorkingSectionPickerField`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/WorkingSectionPickerField.tsx`

**Add a props type** at the top of the file:

```ts
type WorkingSectionPickerFieldProps = {
  majorCategory?: string;
};
```

**Update the function signature:**

```tsx
export function WorkingSectionPickerField({ majorCategory }: WorkingSectionPickerFieldProps = {}): React.JSX.Element {
```

**Derive `displayedOptions` right after `flow` is obtained** (before `currentAssignments`):

```ts
const flow = useWorkingSectionPickerFlow();

const displayedOptions = majorCategory !== undefined
  ? flow.options.filter((section) =>
      section.item_categories.some((cat) => cat.major_category === majorCategory)
    )
  : flow.options;
```

**Replace all references to `flow.options`** in the render with `displayedOptions`:
- The loading empty check: `flow.isLoading && displayedOptions.length === 0`
- The `.map()` call: `displayedOptions.map((section) => ...)`
- The `handleSectionPress` lookup: `displayedOptions.find(...)` (or keep as `flow.options.find(...)` so deselecting works correctly even if filter changes)

> Note on `handleSectionPress`: keep the lookup using `flow.options` (all options), not `displayedOptions`, so that existing assignments from other major categories can still be deselected correctly. Only the rendering loop uses `displayedOptions`.

---

### Step 4 — Update `working-sections-test-data.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/working-sections-test-data.ts`

Add `dependencies`, `item_categories`, and `supported_issue_types` to every entry. Use representative data:

```ts
export const TEST_WORKING_SECTIONS: WorkingSectionOption[] = [
  {
    client_id: 'ws_upholstery',
    name: 'Upholstery',
    image: 'https://placehold.co/32x32/6366f1/ffffff?text=U',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_seat_1', name: 'Cushion', major_category: 'seat' },
    ],
    supported_issue_types: [
      { client_id: 'ist_scratch', name: 'Scratch' },
    ],
    members: [
      {
        client_id: 'usr_alice',
        username: 'Alice Martin',
        profile_picture: 'https://placehold.co/32x32/a3e635/000000?text=A',
      },
      {
        client_id: 'usr_bob',
        username: 'Bob Chen',
        profile_picture: 'https://placehold.co/32x32/facc15/000000?text=B',
      },
    ],
  },
  {
    client_id: 'ws_carpentry',
    name: 'Carpentry',
    image: 'https://placehold.co/32x32/f59e0b/ffffff?text=C',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_wood_1', name: 'Chair', major_category: 'wood' },
    ],
    supported_issue_types: [],
    members: [
      {
        client_id: 'usr_carol',
        username: 'Carol Davis',
        profile_picture: 'https://placehold.co/32x32/fb923c/000000?text=C',
      },
    ],
  },
  {
    client_id: 'ws_finishing',
    name: 'Finishing',
    image: 'https://placehold.co/32x32/10b981/ffffff?text=F',
    dependencies: [{ client_id: 'ws_carpentry', name: 'Carpentry' }],
    item_categories: [
      { client_id: 'itc_wood_2', name: 'Table', major_category: 'wood' },
      { client_id: 'itc_seat_2', name: 'Armchair', major_category: 'seat' },
    ],
    supported_issue_types: [
      { client_id: 'ist_finish', name: 'Finish damage' },
    ],
    members: [
      {
        client_id: 'usr_dan',
        username: 'Dan Wilson',
        profile_picture: 'https://placehold.co/32x32/22d3ee/000000?text=D',
      },
      {
        client_id: 'usr_eve',
        username: 'Eve Johnson',
        profile_picture: 'https://placehold.co/32x32/c084fc/000000?text=E',
      },
      {
        client_id: 'usr_frank',
        username: 'Frank Lee',
        profile_picture: 'https://placehold.co/32x32/f43f5e/000000?text=F',
      },
    ],
  },
];
```

Note: `ws_finishing` spans both `wood` and `seat` — used to verify the "appears in both filters" requirement.

---

### Step 5 — Update `WorkingSectionPickerField.test.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/WorkingSectionPickerField.test.tsx`

**Fix the `OPTIONS` constant** — add the three new required fields to both entries:

```ts
const OPTIONS: WorkingSectionOption[] = [
  {
    client_id: 'ws_upholstery',
    name: 'Upholstery',
    image: 'https://example.com/upholstery.png',
    dependencies: [],
    item_categories: [{ client_id: 'itc_seat', name: 'Cushion', major_category: 'seat' }],
    supported_issue_types: [],
    members: [
      { client_id: 'usr_alice', username: 'Alice Martin', profile_picture: 'https://example.com/alice.png' },
      { client_id: 'usr_bob', username: 'Bob Chen', profile_picture: 'https://example.com/bob.png' },
    ],
  },
  {
    client_id: 'ws_carpentry',
    name: 'Carpentry',
    image: 'https://example.com/carpentry.png',
    dependencies: [],
    item_categories: [{ client_id: 'itc_wood', name: 'Chair', major_category: 'wood' }],
    supported_issue_types: [],
    members: [
      { client_id: 'usr_carol', username: 'Carol Davis', profile_picture: 'https://example.com/carol.png' },
    ],
  },
];
```

**Update `renderField`** to accept an optional `majorCategory` prop and pass it to the field:

```ts
function renderField(majorCategory?: string) {
  const Wrapper = () => {
    const methods = useForm({ defaultValues: { working_section_assignments: [] } });
    return (
      <FormProvider {...methods}>
        <WorkingSectionPickerField majorCategory={majorCategory} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
}
```

**Add new `majorCategory` filtering tests** at the end of the `describe` block:

```ts
it('renders only sections matching the given majorCategory', () => {
  renderField('wood');

  expect(screen.queryByText('Upholstery')).not.toBeInTheDocument();
  expect(screen.getByText('Carpentry')).toBeVisible();
});

it('renders all sections when majorCategory is not provided', () => {
  renderField();

  expect(screen.getByText('Upholstery')).toBeVisible();
  expect(screen.getByText('Carpentry')).toBeVisible();
});
```

---

### Step 6 — Create `useNeedsCleaningPickerFlow`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/flows/use-needs-cleaning-picker.flow.ts`

```ts
import { useMemo } from 'react';

import { useWorkingSectionPickerFlow } from './use-working-section-picker.flow';
import type { WorkingSectionMember } from '../types';

export function useNeedsCleaningPickerFlow() {
  const { options, isLoading } = useWorkingSectionPickerFlow();

  const sections = useMemo(
    () => options.filter((s) => s.name.toLowerCase().includes('cleaning')),
    [options],
  );

  const { members, workerToSectionId } = useMemo(() => {
    const seen = new Set<string>();
    const result: WorkingSectionMember[] = [];
    const map = new Map<string, string>();

    for (const section of sections) {
      for (const member of section.members) {
        if (!seen.has(member.client_id)) {
          seen.add(member.client_id);
          result.push(member);
          map.set(member.client_id, section.client_id);
        }
      }
    }

    return { members: result, workerToSectionId: map };
  }, [sections]);

  return { sections, members, workerToSectionId, isLoading };
}
```

---

### Step 7 — Create `useOilingTreatmentPickerFlow`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/flows/use-oiling-treatment-picker.flow.ts`

Same structure as Step 6; filter keywords change:

```ts
import { useMemo } from 'react';

import { useWorkingSectionPickerFlow } from './use-working-section-picker.flow';
import type { WorkingSectionMember } from '../types';

const OIL_KEYWORDS = ['hardwax oil', 'ground oil'];

export function useOilingTreatmentPickerFlow() {
  const { options, isLoading } = useWorkingSectionPickerFlow();

  const sections = useMemo(
    () =>
      options.filter((s) => {
        const lower = s.name.toLowerCase();
        return OIL_KEYWORDS.some((kw) => lower.includes(kw));
      }),
    [options],
  );

  const { members, workerToSectionId } = useMemo(() => {
    const seen = new Set<string>();
    const result: WorkingSectionMember[] = [];
    const map = new Map<string, string>();

    for (const section of sections) {
      for (const member of section.members) {
        if (!seen.has(member.client_id)) {
          seen.add(member.client_id);
          result.push(member);
          map.set(member.client_id, section.client_id);
        }
      }
    }

    return { members: result, workerToSectionId: map };
  }, [sections]);

  return { sections, members, workerToSectionId, isLoading };
}
```

---

### Step 8 — Create `NeedsCleaningPickerField`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/NeedsCleaningPickerField.tsx`

```tsx
import { Sparkles, X } from 'lucide-react';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { FieldErrorPill } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  preloadWorkingSectionWorkerPickerSurface,
} from '../../surfaces';
import { useNeedsCleaningPickerFlow } from '../../flows/use-needs-cleaning-picker.flow';
import type { WorkingSectionAssignment } from '../../types';

export function NeedsCleaningPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const flow = useNeedsCleaningPickerFlow();
  const { field, fieldState } = useController({
    name: 'needs_cleaning_assignment',
    control,
    defaultValue: null,
  });

  const currentAssignment: WorkingSectionAssignment | null = field.value ?? null;

  const resolvedMember = currentAssignment
    ? flow.members.find((m) => m.client_id === currentAssignment.assigned_worker_id) ?? null
    : null;

  const isSelected = currentAssignment !== null;

  useEffect(() => {
    void preloadWorkingSectionWorkerPickerSurface();
  }, []);

  function handlePress() {
    if (flow.members.length === 0) return;

    if (flow.members.length === 1) {
      const member = flow.members[0];
      const sectionId = flow.workerToSectionId.get(member.client_id);
      if (sectionId) {
        field.onChange({ working_section_id: sectionId, assigned_worker_id: member.client_id });
      }
      return;
    }

    useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
      sectionName: 'Cleaning workers',
      members: flow.members,
      currentWorkerId: currentAssignment?.assigned_worker_id ?? null,
      onSelect: (workerId: string) => {
        const sectionId = flow.workerToSectionId.get(workerId);
        if (sectionId) {
          field.onChange({ working_section_id: sectionId, assigned_worker_id: workerId });
        }
      },
    });
  }

  function handleDeselect(event: React.MouseEvent) {
    event.stopPropagation();
    field.onChange(null);
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="needs-cleaning-picker-field">
      <div
        aria-pressed={isSelected}
        className={cn(
          'relative flex min-h-14 w-full cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isSelected
            ? 'border-primary bg-primary text-card'
            : 'border-border bg-card text-foreground',
        )}
        data-testid="needs-cleaning-picker-card"
        role="button"
        tabIndex={0}
        onClick={handlePress}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePress();
          }
        }}
      >
        <Sparkles aria-hidden="true" className="size-8 shrink-0" />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">Needs cleaning</span>
          {resolvedMember ? (
            <span className="flex items-center gap-1">
              {resolvedMember.profile_picture ? (
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full object-cover"
                  src={resolvedMember.profile_picture}
                />
              ) : (
                <div aria-hidden="true" className="size-4 shrink-0 rounded-full bg-muted" />
              )}
              <span className="truncate text-xs opacity-80">{resolvedMember.username}</span>
            </span>
          ) : (
            <span className="truncate text-xs opacity-60">Tap to assign</span>
          )}
        </span>

        {isSelected ? (
          <button
            aria-label="Remove cleaning assignment"
            className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 opacity-70 hover:opacity-100"
            data-testid="needs-cleaning-picker-remove"
            type="button"
            onClick={handleDeselect}
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>

      <FieldErrorPill
        data-testid="needs-cleaning-picker-error"
        message={fieldState.error?.message}
      />
    </div>
  );
}
```

---

### Step 9 — Create `OilingTreatmentPickerField`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/working-sections/components/fields/OilingTreatmentPickerField.tsx`

Identical structure to Step 8 with these substitutions:

| `NeedsCleaningPickerField` | `OilingTreatmentPickerField` |
|---|---|
| `useNeedsCleaningPickerFlow` | `useOilingTreatmentPickerFlow` |
| `Sparkles` icon | `Droplets` icon |
| `name: 'needs_cleaning_assignment'` | `name: 'oiling_treatment_assignment'` |
| `'Cleaning workers'` (sheet title) | `'Oiling workers'` |
| `"Needs cleaning"` (card label) | `"Oiling treatment"` |
| `"Remove cleaning assignment"` (aria-label) | `"Remove oiling assignment"` |
| `data-testid="needs-cleaning-picker-*"` | `data-testid="oiling-treatment-picker-*"` |

Write the full file independently — do not import from `NeedsCleaningPickerField`.

---

### Step 10 — Export from `features/working-sections/index.ts`

Add to existing exports:

```ts
// New schemas and types for extended working section shape
export {
  WorkingSectionDependencySchema,
  WorkingSectionItemCategorySchema,
  WorkingSectionSupportedIssueTypeSchema,
} from './types';
export type {
  WorkingSectionDependency,
  WorkingSectionItemCategory,
  WorkingSectionSupportedIssueType,
} from './types';

// New shortcut field components
export { NeedsCleaningPickerField } from './components/fields/NeedsCleaningPickerField';
export { OilingTreatmentPickerField } from './components/fields/OilingTreatmentPickerField';

// New shortcut flows
export { useNeedsCleaningPickerFlow } from './flows/use-needs-cleaning-picker.flow';
export { useOilingTreatmentPickerFlow } from './flows/use-oiling-treatment-picker.flow';
```

---

### Step 11 — Register shortcut fields in testing harness

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/testing_forms/components/TestingFormsContent.tsx`

**Import additions:**
```ts
import {
  NeedsCleaningPickerField,
  OilingTreatmentPickerField,
  WorkingSectionPickerField,
  WorkingSectionPickerFieldsSchema,
} from '@/features/working-sections';
```

**Schema additions** (in `TestingFormsSchema`):
```ts
needs_cleaning_assignment: WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment,
oiling_treatment_assignment: WorkingSectionPickerFieldsSchema.shape.oiling_treatment_assignment,
```

**Default values additions** (in `useForm` `defaultValues`):
```ts
needs_cleaning_assignment: null,
oiling_treatment_assignment: null,
```

**Render** (below `<WorkingSectionPickerField />`):
```tsx
<NeedsCleaningPickerField />
<OilingTreatmentPickerField />
```

## Risks and mitigations

- Risk: `WorkingSectionPickerField` `handleSectionPress` uses `flow.options.find(...)` — if `majorCategory` is provided, the pressed section must still be found in the unfiltered list
  Mitigation: Step 3 explicitly keeps `handleSectionPress` and `handleSectionDeselect` using `flow.options`, not `displayedOptions`. Only the render loop uses `displayedOptions`.

- Risk: A worker appears in multiple matched sections — de-dup logic keeps first section's `sectionId`
  Mitigation: Acceptable business behaviour; `workerToSectionId` always maps to the first matched section in iteration order.

- Risk: `WorkingSectionPickerFieldsSchema.shape.needs_cleaning_assignment` returns `ZodOptional<ZodNullable<...>>` which TypeScript may complain about in `TestingFormsSchema`
  Mitigation: If TypeScript errors, replace with inline `WorkingSectionAssignmentSchema.nullable().optional()` in the testing form schema.

- Risk: Store is still loading when shortcut card is tapped
  Mitigation: `handlePress` returns early when `flow.members.length === 0`.

- Risk: `useWorkingSectionPickerFlow` called three times (once per field in the task step) — triple store subscription
  Mitigation: TanStack Query deduplicates the network request; Zustand subscriptions are cheap. No action needed.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep WorkingSectionPickerField`: all existing tests pass + new `majorCategory` filtering tests pass
- Manual: open testing harness → task step → `WorkingSectionPickerField` with no prop renders all sections
- Manual (requires mock data): pass `majorCategory="wood"` → only wood sections visible
- Manual: tap `NeedsCleaningPickerField` with one matching worker → auto-assigns
- Manual: tap `NeedsCleaningPickerField` with multiple matching workers → sheet opens
- Manual: select worker → card shows selected state + avatar
- Manual: tap X → card clears
- Manual: repeat for `OilingTreatmentPickerField`

## Review log

- 2026-05-22T22:32:23Z — Implemented schema updates, `majorCategory` filtering, shortcut flows, shortcut fields, testing harness wiring, and passed `npm run typecheck`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
