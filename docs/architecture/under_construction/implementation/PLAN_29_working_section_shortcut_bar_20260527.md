# PLAN_29_working_section_shortcut_bar_20260527

## Metadata

- Plan ID: `PLAN_29_working_section_shortcut_bar_20260527`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-27T00:00:00Z`
- Last updated at (UTC): `2026-05-27T00:00:00Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add a horizontally-scrollable shortcut pill bar to both the `WorkingSectionPickerField` form field and the `TaskWorkingSectionsStepList` task-detail component. Tapping a pill applies a named preset that selects a group of working sections via case-insensitive substring matching against section names.
- Business/user intent: Repeat processes (e.g. "Full upholstery job") always require the same set of working sections. Rather than scrolling and tapping each one individually, users want a single-tap shortcut to queue the common combination. The bar hides when the user scrolls down (more visual space), reappears on scroll-up — matching the LinkedIn mobile pattern.
- Non-goals: Persisting custom shortcuts to localStorage (scaffolded for later, not implemented now). Editing shortcuts from within the UI. Showing which sections a shortcut *would* add before tapping.

## Scope

- In scope:
  - `WorkingSectionShortcutBar` primitive component (new)
  - `WorkingSectionShortcutConfig` type alias (new, in `working-sections/types.ts`)
  - `DEFAULT_WORKING_SECTION_SHORTCUTS` constant (new file, `working-sections/constants/`)
  - Controller method `handleShortcutPress` on `useTaskWorkingSectionsController` (new)
  - Integration into `TaskWorkingSectionsStepList` (modified)
  - Integration into `WorkingSectionPickerField` (modified)
  - Exports wired through `primitives/index.ts` and `working-sections/index.ts`
- Out of scope: localStorage persistence, custom shortcut editor UI, per-shortcut count badges, Playwright e2e tests (deferred — bar is purely additive UI)
- Assumptions:
  - A `ScrollVisibilityProvider` (or equivalent scroll element registration) is already present in the ancestor tree for both usage sites. Both the task working-sections slide and the task creation form already have a scrollable container managed by the app. **Codex must verify this at integration time** by tracing the component trees for both integration sites and confirming `ScrollVisibilityContext` is provided. If not present, Codex must add `ScrollVisibilityProvider` at the nearest scroll-owning ancestor before integrating the bar.
  - `HorizontalScrollArea` from `@/components/primitives` is already stable and used elsewhere.
  - The `DEFAULT_WORKING_SECTION_SHORTCUTS` constant uses placeholder name patterns derived from test-data names (`"upholstery"`, `"carpentry"`, `"finishing"`). Before shipping, verify against real production section names returned by the API.

## Clarifications required

- None blocking. The scroll-context assumption is a verification task for Codex, not a blocker.

## Acceptance criteria

1. A `WorkingSectionShortcutBar` component exists at `src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx` and is exported from `src/components/primitives/index.ts`.
2. Tapping a pill calls `onShortcutPress` with the `client_id`s of all `availableSections` whose `name` contains at least one of the shortcut's patterns (case-insensitive substring match). Sections with no pattern match produce an empty array call (caller handles gracefully).
3. The bar animates out (opacity → 0, max-height → 0) when `isHidden === true` from `useScrollVisibilityContext()`, and animates in when `isHidden === false`. The animation uses `transition-[max-height,opacity] duration-300 ease-in-out`.
4. Pills overflow horizontally; the user can scroll the pill row via `HorizontalScrollArea`. The outer container's background and padding are fully controlled by the `className` prop.
5. `DEFAULT_WORKING_SECTION_SHORTCUTS` is exported from `src/features/working-sections/index.ts` and is `WorkingSectionShortcutConfig`.
6. `useTaskWorkingSectionsController` returns `handleShortcutPress(sectionIds: string[]): void`, which stages a step for each ID that is not already active (best-effort, skips missing or already-active entries).
7. Both `TaskWorkingSectionsStepList` and `WorkingSectionPickerField` render `WorkingSectionShortcutBar` below their respective lists, wired to the correct handler, using `DEFAULT_WORKING_SECTION_SHORTCUTS` and the available sections appropriate to each context.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component structure, no logic in components, context-only consumption
- `architecture/14_styling.md`: Tailwind class conventions, transition patterns
- `architecture/15_feature_structure.md`: primitives placement, feature directory layout
- `architecture/08_hooks.md`: controller return shape, handler naming convention

### Local extensions loaded

- `architecture/15_feature_structure_local.md` (if present): any app-specific feature directory rules

### File read intent — pattern vs. relational

Permitted relational reads (understanding what exists):
- `src/features/tasks/controllers/use-task-working-sections.controller.ts` — read to understand existing `handleSectionPress` and `stageStepStart` so `handleShortcutPress` mirrors the pattern
- `src/components/primitives/scroll-visibility/` — read to confirm `useScrollVisibilityContext` API and `isHidden` shape
- `src/components/primitives/horizontal-scroll-area/HorizontalScrollArea.tsx` — read to confirm `children` / `className` API
- `src/features/working-sections/types.ts` — read for exact field names (`client_id`, `name`)
- `src/features/tasks/providers/TaskWorkingSectionsProvider.tsx` — read to confirm the provider passes the full controller (no extra wiring needed)
- `src/features/working-sections/components/fields/WorkingSectionPickerField.tsx` — read to locate insertion point and understand `field.onChange` shape
- `src/features/tasks/components/TaskWorkingSectionsStepList.tsx` — read to locate insertion point

Prohibited pattern reads (contracts cover these):
- Reading another primitive to understand component shell → `07_components.md`
- Reading another controller to understand handler structure → `08_hooks.md`

### Skill selection

- Primary skill: `skills/component/SKILL.md` (UI primitive)
- Trigger terms: primitive, scroll-visibility, horizontal scroll, pill
- Excluded alternatives: none

## Implementation plan

### Step 1 — Add `WorkingSectionShortcutConfig` type to `src/features/working-sections/types.ts`

Append after the last existing `export type` line:

```ts
export type WorkingSectionShortcutConfig = Record<string, string[]>;
```

No schema needed — this is a static config type, not a DTO.

---

### Step 2 — Create `src/features/working-sections/constants/working-section-shortcuts.ts`

```ts
import type { WorkingSectionShortcutConfig } from '../types';

export const DEFAULT_WORKING_SECTION_SHORTCUTS: WorkingSectionShortcutConfig = {
  "Upholstery & Finish": ["upholstery", "finishing"],
  "Carpentry & Finish": ["carpentry", "finishing"],
  "Full job": ["upholstery", "carpentry", "finishing"],
};
```

**Note for Codex:** These patterns are derived from test-data section names. Before shipping, verify the patterns match actual production working-section `name` values returned by the picker API. Adjust labels and patterns to reflect the real taxonomy.

---

### Step 3 — Export from `src/features/working-sections/index.ts`

Add two lines to the existing exports:

```ts
export { DEFAULT_WORKING_SECTION_SHORTCUTS } from './constants/working-section-shortcuts';
export type { WorkingSectionShortcutConfig } from './types';
```

`WorkingSectionShortcutConfig` is a new type addition to `types.ts` — also add it to the existing `export type { ... } from './types'` block, or as a standalone re-export as shown above.

---

### Step 4 — Create `src/components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx`

```tsx
import { useMemo } from "react";

import { HorizontalScrollArea, useScrollVisibilityContext } from "@/components/primitives";
import type { WorkingSectionOption, WorkingSectionShortcutConfig } from "@/features/working-sections/types";
import { cn } from "@/lib/utils";

export type WorkingSectionShortcutBarProps = {
  shortcuts: WorkingSectionShortcutConfig;
  availableSections: WorkingSectionOption[];
  onShortcutPress: (matchedIds: string[]) => void;
  className?: string;
  "data-testid"?: string;
};

export function WorkingSectionShortcutBar({
  shortcuts,
  availableSections,
  onShortcutPress,
  className,
  "data-testid": testId = "working-section-shortcut-bar",
}: WorkingSectionShortcutBarProps): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  const pillEntries = useMemo(
    () =>
      Object.entries(shortcuts).map(([label, patterns]) => ({
        label,
        matchedIds: availableSections
          .filter((section) =>
            patterns.some((pattern) =>
              section.name.toLowerCase().includes(pattern.toLowerCase()),
            ),
          )
          .map((section) => section.client_id),
      })),
    [shortcuts, availableSections],
  );

  return (
    <div
      className={cn(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
        isHidden ? "max-h-0 opacity-0 pointer-events-none" : "max-h-20 opacity-100",
        className,
      )}
      data-testid={testId}
    >
      <HorizontalScrollArea>
        <div className="flex items-center gap-2 px-4 py-2">
          {pillEntries.map(({ label, matchedIds }) => (
            <button
              key={label}
              type="button"
              className="shrink-0 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              data-testid={`shortcut-pill-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => onShortcutPress(matchedIds)}
            >
              {label}
            </button>
          ))}
        </div>
      </HorizontalScrollArea>
    </div>
  );
}
```

**Architectural notes:**
- Imports `WorkingSectionOption` and `WorkingSectionShortcutConfig` from the feature `types` file directly (not through the feature's public `index.ts`) because this primitive is a generic component and the types are structural, not domain-specific exports. Alternatively Codex may import from `@/features/working-sections` if that is the project convention — check `15_feature_structure_local.md`.
- `useScrollVisibilityContext()` throws if there is no ancestor `ScrollVisibilityProvider`. Both integration sites must confirm the provider exists (see Assumptions).
- `max-h-20` (80 px) covers one row of pills with standard padding. If pills can wrap to two rows, increase to `max-h-32`. For this implementation, pills are single-row (horizontal scroll handles overflow).

---

### Step 5 — Create `src/components/primitives/working-section-shortcut-bar/index.ts`

```ts
export { WorkingSectionShortcutBar } from "./WorkingSectionShortcutBar";
export type { WorkingSectionShortcutBarProps } from "./WorkingSectionShortcutBar";
```

---

### Step 6 — Export from `src/components/primitives/index.ts`

Add after the `ScrollVisibilityProvider` / `useScrollVisibility` block:

```ts
export { WorkingSectionShortcutBar } from './working-section-shortcut-bar';
export type { WorkingSectionShortcutBarProps } from './working-section-shortcut-bar';
```

---

### Step 7 — Add `handleShortcutPress` to `src/features/tasks/controllers/use-task-working-sections.controller.ts`

Inside `useTaskWorkingSectionsController`, after the existing `handleSectionPress` definition, add:

```ts
const handleShortcutPress = useCallback(
  (sectionIds: string[]) => {
    for (const sectionId of sectionIds) {
      const entry = sectionEntries.find(
        (candidate) => candidate.section.client_id === sectionId,
      );
      if (!entry || entry.isActive) {
        continue;
      }
      stageStepStart(entry.section);
    }
  },
  [sectionEntries, stageStepStart],
);
```

Add `handleShortcutPress` to the controller's return object:

```ts
return {
  // ...existing fields...
  handleShortcutPress,
};
```

The `TaskWorkingSectionsController` type is inferred via `ReturnType<typeof useTaskWorkingSectionsController>` so no separate type update is needed.

---

### Step 8 — Integrate into `src/features/tasks/components/TaskWorkingSectionsStepList.tsx`

**Pre-step:** Trace the component tree to confirm a `ScrollVisibilityProvider` ancestor exists for the task working-sections slide. If not, add `ScrollVisibilityProvider` wrapping the scrollable container in the slide's root component (not in `TaskWorkingSectionsStepList` itself — the provider belongs at the scroll-container level).

Add the bar below the section list `<div>`, as a sibling:

```diff
-  return (
-    <div
-      className="flex flex-col gap-3"
-      data-testid="task-working-sections-step-list"
-    >
-      {controller.sectionEntries.map((entry) => { ... })}
-    </div>
-  );
+  const availableSections = useMemo(
+    () => controller.sectionEntries.map((e) => e.section),
+    [controller.sectionEntries],
+  );
+
+  return (
+    <div className="flex flex-col gap-3" data-testid="task-working-sections-step-list">
+      {controller.sectionEntries.map((entry) => { ... })}
+
+      <WorkingSectionShortcutBar
+        shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
+        availableSections={availableSections}
+        onShortcutPress={controller.handleShortcutPress}
+        data-testid="task-working-sections-shortcut-bar"
+      />
+    </div>
+  );
```

Add imports:

```ts
import { useMemo } from "react";
import { WorkingSectionShortcutBar } from "@/components/primitives";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@/features/working-sections";
```

**Note:** No `className` override needed here because the bar sits naturally at the bottom of the list card without custom background.

---

### Step 9 — Integrate into `src/features/working-sections/components/fields/WorkingSectionPickerField.tsx`

**Pre-step:** Confirm `ScrollVisibilityProvider` ancestor exists for the task creation form / wherever this field is rendered. If missing, add the provider at the form's scroll container.

Inside `WorkingSectionPickerField`, add the handler:

```ts
function handleShortcutPress(resolvedIds: string[]) {
  const newAssignments = resolvedIds
    .filter((id) => !selectedSectionIds.includes(id))
    .map((id) => ({
      working_section_id: id,
      assigned_worker_id: null,
    }));
  if (newAssignments.length > 0) {
    field.onChange([...currentAssignments, ...newAssignments]);
  }
}
```

Add the bar after the picker list `<div>`, before `<FieldErrorPill>`:

```diff
       </div>

+      <WorkingSectionShortcutBar
+        shortcuts={DEFAULT_WORKING_SECTION_SHORTCUTS}
+        availableSections={displayedOptions}
+        onShortcutPress={handleShortcutPress}
+        className="pt-1"
+        data-testid="working-section-picker-shortcut-bar"
+      />

       <FieldErrorPill
         data-testid="working-section-picker-error"
         message={fieldState.error?.message}
       />
```

Add imports:

```ts
import { WorkingSectionShortcutBar } from "@/components/primitives";
import { DEFAULT_WORKING_SECTION_SHORTCUTS } from "@/features/working-sections";
```

---

## Risks and mitigations

- Risk: `ScrollVisibilityProvider` not present at either integration site — component throws at runtime.
  Mitigation: Step 8 and Step 9 both include an explicit pre-step to verify the provider exists in the ancestor tree before integrating. If missing, add the provider at the nearest scroll-owning ancestor (do not add it inside `TaskWorkingSectionsStepList` or `WorkingSectionPickerField` themselves — these components are context consumers, not scroll owners).

- Risk: `DEFAULT_WORKING_SECTION_SHORTCUTS` patterns don't match real section names (test-data names used as placeholder).
  Mitigation: Documented in Step 2. Codex should log a warning or leave a `// TODO: verify against production names` comment near the constant.

- Risk: `max-h-20` too small if labels are long and pill row height exceeds 80 px.
  Mitigation: Pills are `text-xs py-1.5` → ~28 px tall. With `py-2` wrapper padding, total ≈ 48 px, well within 80 px. Single-row assumption is safe.

- Risk: Import path for `WorkingSectionOption` / `WorkingSectionShortcutConfig` inside a primitive crosses feature boundaries.
  Mitigation: If project convention prohibits primitives importing from features directly, move both types to `src/types/common.ts` or create a dedicated `src/types/working-section-shortcut.ts`. Check `15_feature_structure_local.md` for the rule. If no rule exists, the direct import is acceptable because these are pure structural types with no side effects.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke: open task working-sections slide → shortcut bar visible at bottom → scroll down list → bar hides → scroll up → bar reappears → tap a pill → correct sections selected
- Manual smoke: open task creation form → scroll form down → bar hides → scroll up → bar reappears → tap pill → correct sections selected in picker
- Edge cases:
  - Pill whose patterns match zero available sections → `onShortcutPress([])` called → no-op in both handlers (empty loop / empty `newAssignments`)
  - Pill tapped when all matched sections already active/selected → no-op
  - Short shortcut config (1 pill) → bar renders but no scroll affordance (HorizontalScrollArea handles gracefully)

## Review log

_(empty — awaiting Codex implementation)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
