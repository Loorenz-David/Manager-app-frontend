# PLAN_working_section_picker_field_20260522

## Metadata

- Plan ID: `PLAN_working_section_picker_field_20260522`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T17:14:39Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Build a standalone RHF multi-select field that assigns one worker per working section, then wires it into the testing form task step.
- Business/user intent: Managers can staff multiple working sections simultaneously for a task, assigning exactly one worker per section.
- Non-goals: Server-side data fetching (test data only); permissions; real-time updates; Vitest / Playwright tests (follow-up).

## Scope

- In scope:
  - New `features/working-sections/` feature: types, test data, surfaces, sheet page, field component, public API.
  - `app/surface-registry.ts` surface registration.
  - Integration into `TestingFormsContent` task step schema + field render.
- Out of scope:
  - API layer, query hooks, action hooks.
  - Cross-field validation (field is optional in the test form).

## Clarifications required

None — all requirements specified by user.

## Acceptance criteria

1. All `TEST_WORKING_SECTIONS` render as full-row boxes: section image left, section name + selected-worker pill (avatar + username) right.
2. Tapping an unselected section with > 1 member opens the worker picker sheet. Selecting a worker closes the sheet and marks the section selected.
3. Tapping an unselected section with exactly 1 member auto-selects that member; the sheet does NOT open.
4. Tapping a selected section (body only, not X) reopens the picker sheet pre-highlighted on the current worker, allowing re-assignment.
5. The X button on a selected section removes the assignment without opening the sheet.
6. `field.value` is `WorkingSectionAssignment[]` (`{ working_section_id: string; assigned_worker_id: string }[]`).
7. `npm run typecheck` passes with zero errors.
8. Field renders in the task step of `TestingFormsContent`.

## Contracts and skills

### Contracts loaded

- `architecture/15_feature_structure.md`: feature folder layout, public API discipline
- `architecture/15_feature_structure_local.md`: local companion
- `architecture/07_components.md`: standalone component pattern
- `architecture/28_surfaces.md`: surface types, `useSurfaceProps`, `useSurfaceStore`
- `architecture/28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`)

### File read intent — pattern vs. relational

Permitted reads (relational — what already exists):
- `features/items/components/fields/ItemIssuesField.tsx` — established multi-select field pattern
- `features/items/components/fields/ItemCategorySelectionField.tsx` — established surface-open-on-select pattern
- `features/items/pages/ItemIssueSeverityPickerSheetPage.tsx` — sheet page structure
- `features/items/surfaces.ts` — surface registration shape
- `app/surface-registry.ts` — app-level surface merge target
- `features/testing_forms/components/TestingFormsContent.tsx` — integration target

Prohibited (contract covers these):
- Reading another action hook to understand cache / rollback shape — `08_hooks.md`
- Reading another query hook — `05_server_state.md`

### Skill selection

- Primary skill: standalone RHF field + surface sheet (established pattern in items feature)

## Implementation plan

### Step 1 — `features/working-sections/types.ts` (NEW FILE)

Create the domain types and Zod schemas.

```ts
import { z } from 'zod';

export type WorkingSectionMember = {
  client_id: string;
  username: string;
  profile_picture: string;
};

export type WorkingSectionOption = {
  client_id: string;
  name: string;
  image: string;
  members: WorkingSectionMember[];
};

export type WorkingSectionAssignment = {
  working_section_id: string;
  assigned_worker_id: string;
};

export const WorkingSectionAssignmentSchema = z.object({
  working_section_id: z.string(),
  assigned_worker_id: z.string(),
});

export const WorkingSectionPickerFieldsSchema = z.object({
  working_section_assignments: z.array(WorkingSectionAssignmentSchema).default([]),
});

export type WorkingSectionPickerFields = z.input<typeof WorkingSectionPickerFieldsSchema>;
```

---

### Step 2 — `features/working-sections/working-sections-test-data.ts` (NEW FILE)

Stub data covering 3 sections: one with 1 member (auto-select), two with multiple members (opens sheet).

```ts
import type { WorkingSectionOption } from './types';

export const TEST_WORKING_SECTIONS: WorkingSectionOption[] = [
  {
    client_id: 'ws_upholstery',
    name: 'Upholstery',
    image: 'https://placehold.co/32x32/6366f1/ffffff?text=U',
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

---

### Step 3 — `features/working-sections/surfaces.ts` (NEW FILE)

Surface ID constant, surface props type, lazy load function, preload helper, and `SurfaceRegistrations` export.

```ts
import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';
import type { WorkingSectionMember } from './types';

export const WORKING_SECTION_WORKER_PICKER_SURFACE_ID = 'working-section-worker-picker';

export type WorkingSectionWorkerPickerSurfaceProps = {
  sectionId: string;
  sectionName: string;
  members: WorkingSectionMember[];
  currentWorkerId: string | null;
  onSelect: (workerId: string) => void;
};

const preloadedWorkingSectionSurfaces = new Set<string>();

function loadWorkingSectionWorkerPickerSheetPage() {
  return import('@/features/working-sections/pages/WorkingSectionWorkerPickerSheetPage').then(
    (module) => ({ default: module.WorkingSectionWorkerPickerSheetPage }),
  );
}

export function preloadWorkingSectionWorkerPickerSurface(): Promise<unknown> {
  if (preloadedWorkingSectionSurfaces.has(WORKING_SECTION_WORKER_PICKER_SURFACE_ID)) {
    return Promise.resolve();
  }

  preloadedWorkingSectionSurfaces.add(WORKING_SECTION_WORKER_PICKER_SURFACE_ID);
  return loadWorkingSectionWorkerPickerSheetPage();
}

export const workingSectionSurfaces: SurfaceRegistrations = {
  [WORKING_SECTION_WORKER_PICKER_SURFACE_ID]: {
    surface: 'sheet',
    component: lazy(loadWorkingSectionWorkerPickerSheetPage),
  },
};
```

---

### Step 4 — `features/working-sections/pages/WorkingSectionWorkerPickerSheetPage.tsx` (NEW FILE)

Sheet page displaying the list of members for a given section. Each member is a custom button showing avatar + username. Selecting calls `onSelect` and closes the sheet.

```tsx
import { cn } from '@/lib/utils';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import type { WorkingSectionWorkerPickerSurfaceProps } from '../surfaces';

export function WorkingSectionWorkerPickerSheetPage(): React.JSX.Element {
  const { sectionName, members, currentWorkerId, onSelect } =
    useSurfaceProps<WorkingSectionWorkerPickerSurfaceProps>();

  function handleSelect(workerId: string) {
    onSelect?.(workerId);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div
      className="flex flex-col gap-4 p-4"
      data-testid="working-section-worker-picker-sheet"
    >
      <p className="text-base font-semibold text-foreground">
        {sectionName ?? 'Select worker'}
      </p>

      <div
        className="flex flex-col gap-2"
        data-testid="working-section-worker-picker-list"
      >
        {members?.map((member) => (
          <button
            key={member.client_id}
            type="button"
            aria-pressed={member.client_id === currentWorkerId}
            data-testid={`worker-option-${member.client_id}`}
            onClick={() => handleSelect(member.client_id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              member.client_id === currentWorkerId
                ? 'border-primary bg-primary text-card'
                : 'border-border bg-card text-foreground',
            )}
          >
            <img
              src={member.profile_picture}
              alt=""
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full object-cover"
            />
            <span className="truncate text-sm font-medium">{member.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### Step 5 — `features/working-sections/components/fields/WorkingSectionPickerField.tsx` (NEW FILE)

Standalone RHF field. Implements a custom `WorkingSectionBox` internal component (not exported) for the custom visual: section image left, name + selected-worker pill right, X button to deselect.

**Internal `WorkingSectionBox` component** (defined in the same file, not exported):

Props:
```ts
type WorkingSectionBoxProps = {
  section: WorkingSectionOption;
  isSelected: boolean;
  selectedMember: WorkingSectionMember | null;
  onPress: (sectionId: string) => void;
  onDeselect: (sectionId: string) => void;
};
```

Renders:
```tsx
<div
  role="button"
  tabIndex={0}
  aria-pressed={isSelected}
  data-testid={`working-section-box-${section.client_id}`}
  onClick={() => onPress(section.client_id)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress(section.client_id);
    }
  }}
  className={cn(
    'relative flex w-full min-h-14 cursor-pointer select-none items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    isSelected
      ? 'border-primary bg-primary text-card'
      : 'border-border bg-card text-foreground',
  )}
>
  {/* Section image */}
  <img
    src={section.image}
    alt=""
    aria-hidden="true"
    className="size-8 shrink-0 rounded-lg object-cover"
  />

  {/* Name + selected worker pill */}
  <span className="flex min-w-0 flex-1 flex-col gap-1">
    <span className="truncate text-sm font-medium">{section.name}</span>
    {selectedMember ? (
      <span className="flex items-center gap-1">
        <img
          src={selectedMember.profile_picture}
          alt=""
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full object-cover"
        />
        <span className="truncate text-xs opacity-80">{selectedMember.username}</span>
      </span>
    ) : null}
  </span>

  {/* Deselect button */}
  {isSelected ? (
    <button
      type="button"
      aria-label={`Remove ${section.name}`}
      data-testid={`working-section-box-${section.client_id}-remove`}
      className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 opacity-70 hover:opacity-100"
      onClick={(e) => {
        e.stopPropagation();
        onDeselect(section.client_id);
      }}
    >
      <X className="size-3" />
    </button>
  ) : null}
</div>
```

**`WorkingSectionPickerField` main component**:

```tsx
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { TEST_WORKING_SECTIONS } from '../../working-sections-test-data';
import {
  WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  preloadWorkingSectionWorkerPickerSurface,
} from '../../surfaces';
import type {
  WorkingSectionAssignment,
  WorkingSectionMember,
  WorkingSectionOption,
} from '../../types';

// ... WorkingSectionBox internal component (defined above) ...

export function WorkingSectionPickerField(): React.JSX.Element {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'working_section_assignments',
    control,
    defaultValue: [],
  });

  const currentAssignments: WorkingSectionAssignment[] = field.value ?? [];
  const selectedSectionIds = currentAssignments.map((a) => a.working_section_id);

  useEffect(() => {
    void preloadWorkingSectionWorkerPickerSurface();
  }, []);

  function handleSectionPress(sectionId: string) {
    const section = TEST_WORKING_SECTIONS.find((s) => s.client_id === sectionId);
    if (!section) return;

    const currentAssignment = currentAssignments.find(
      (a) => a.working_section_id === sectionId,
    );

    // Auto-select when section has exactly one member — skip sheet
    if (section.members.length === 1) {
      const member = section.members[0];
      const next = currentAssignments.filter((a) => a.working_section_id !== sectionId);
      field.onChange([
        ...next,
        { working_section_id: sectionId, assigned_worker_id: member.client_id },
      ]);
      return;
    }

    // onSelect captures currentAssignments at call time.
    // Low risk: the sheet modal prevents further interaction until closed.
    useSurfaceStore.getState().open(WORKING_SECTION_WORKER_PICKER_SURFACE_ID, {
      sectionId: section.client_id,
      sectionName: section.name,
      members: section.members,
      currentWorkerId: currentAssignment?.assigned_worker_id ?? null,
      onSelect: (workerId: string) => {
        const next = currentAssignments.filter((a) => a.working_section_id !== sectionId);
        field.onChange([
          ...next,
          { working_section_id: sectionId, assigned_worker_id: workerId },
        ]);
      },
    });
  }

  function handleSectionDeselect(sectionId: string) {
    field.onChange(currentAssignments.filter((a) => a.working_section_id !== sectionId));
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="working-section-picker-field">
      <label className="text-sm font-medium text-muted-foreground">Working sections</label>

      <div className="flex flex-col gap-2" data-testid="working-section-picker-list">
        {TEST_WORKING_SECTIONS.map((section) => {
          const isSelected = selectedSectionIds.includes(section.client_id);
          const assignment = currentAssignments.find(
            (a) => a.working_section_id === section.client_id,
          );
          const selectedMember =
            assignment
              ? (section.members.find((m) => m.client_id === assignment.assigned_worker_id) ?? null)
              : null;

          return (
            <WorkingSectionBox
              key={section.client_id}
              section={section}
              isSelected={isSelected}
              selectedMember={selectedMember}
              onPress={handleSectionPress}
              onDeselect={handleSectionDeselect}
            />
          );
        })}
      </div>

      {fieldState.error?.message ? (
        <p
          className="text-xs text-destructive"
          data-testid="working-section-picker-error"
          role="alert"
        >
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
```

---

### Step 6 — `features/working-sections/index.ts` (NEW FILE)

Public API. Export only what consumers need:

```ts
export { WorkingSectionPickerField } from './components/fields/WorkingSectionPickerField';
export { workingSectionSurfaces } from './surfaces';
export { WorkingSectionPickerFieldsSchema } from './types';
export type {
  WorkingSectionAssignment,
  WorkingSectionMember,
  WorkingSectionOption,
  WorkingSectionPickerFields,
} from './types';
```

---

### Step 7 — `app/surface-registry.ts` (MODIFY)

Add the working-sections surface import and spread.

Current file:
```ts
import { calendarSurfaces } from '@/components/primitives/date/surfaces';
import { imageSurfaces } from '@/features/images';
import { itemSurfaces } from '@/features/items';
import { phoneInputSurfaces } from '@/features/phone-input';
import { testingFormsSurfaces } from '@/features/testing_forms';
import { testSurfaces } from '@/features/test_feature';
import { upholsterySurfaces } from '@/features/upholstery';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
};
```

Add:
```ts
import { workingSectionSurfaces } from '@/features/working-sections';
```

And spread into the registry:
```ts
export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
  ...imageSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,
  ...workingSectionSurfaces,
};
```

---

### Step 8 — `features/testing_forms/components/TestingFormsContent.tsx` (MODIFY)

**a. Add import:**

```tsx
import {
  WorkingSectionPickerField,
  WorkingSectionPickerFieldsSchema,
} from '@/features/working-sections';
```

**b. Extend `TestingFormsSchema`** — add to the `z.object({...})`:

```ts
working_section_assignments: WorkingSectionPickerFieldsSchema.shape.working_section_assignments,
```

**c. Extend `defaultValues`** — add to the `useForm` defaultValues object:

```ts
working_section_assignments: [],
```

**d. Add to `stepFieldsMap`** in `onBeforeAdvance` — extend the `task` entry:

```ts
task: ['fulfillment_method', 'return_source', 'additional_details', 'working_section_assignments'],
```

**e. Render the field in the task step** — place `<WorkingSectionPickerField />` inside the `StagedFormStep id="task"` div, after the existing task fields:

```tsx
<WorkingSectionPickerField />
```

---

## Risks and mitigations

- Risk: `placehold.co` URLs may not load in CI or offline environments.
  Mitigation: Broken image fallback is graceful (empty img box). Replace URLs when real asset service is available.
- Risk: Surface props closed over stale `currentAssignments` on fast multi-tap.
  Mitigation: Sheet modal blocks further interaction while open — same accepted pattern as `ItemIssuesField`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open testing forms → task step → verify all 3 sections render
- Manual: tap Upholstery (2 members) → sheet opens → select worker → section shows worker pill
- Manual: tap Carpentry (1 member) → auto-selects Carol Davis — no sheet
- Manual: tap Finishing (3 members) → sheet opens → select worker → close → X to deselect
- Manual: re-tap selected section body → sheet reopens pre-selected on current worker

## Review log

— (awaiting first review)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
