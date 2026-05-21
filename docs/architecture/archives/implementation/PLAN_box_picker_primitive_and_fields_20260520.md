# PLAN_box_picker_primitive_and_fields_20260520

## Metadata

- Plan ID: `PLAN_box_picker_primitive_and_fields_20260520`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T00:00:00Z`
- Last updated at (UTC): `2026-05-20T19:32:11Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Build the `BoxPicker` reusable primitive (RHF-agnostic, layout/variant-configurable box selection component) and five RHF-aware field components built on top of it: `TaskFulfillmentMethodField`, `TaskReturnSourceField`, `ItemCategorySelectionField`, `ItemIssuesField`, and `ItemFastIssueActionField`. Three bottom sheet surface pages and the item surface registry are included.
- Business/user intent: These fields form the visual selection layer for key task and item form surfaces. The `BoxPicker` primitive must be reusable across any feature without knowing about business domains, RHF, or surface routing. Field components own all domain-specific behavior.
- Non-goals: Store integration for categories, issues, and severities (test data constants for now). Functional content of `ItemFastIssueSheetPage` (placeholder only). Task/item CRUD actions, controllers, providers. A custom `Select` primitive.

---

## Scope

### In scope

**Primitive:**
- `src/components/primitives/box-picker/` — full BoxPicker primitive system
- Export from `src/components/primitives/index.ts`

**Task fields:**
- `src/features/tasks/components/fields/TaskFulfillmentMethodField.tsx`
- `src/features/tasks/components/fields/TaskReturnSourceField.tsx`
- `src/features/tasks/index.ts` — export new fields

**Item fields:**
- `src/features/items/components/fields/ItemCategorySelectionField.tsx`
- `src/features/items/components/fields/ItemIssuesField.tsx`
- `src/features/items/components/fields/ItemFastIssueActionField.tsx`

**Surface pages (item feature):**
- `src/features/items/pages/ItemCategoryPickerSheetPage.tsx`
- `src/features/items/pages/ItemIssueSeverityPickerSheetPage.tsx`
- `src/features/items/pages/ItemFastIssueSheetPage.tsx`

**Surface registration:**
- `src/features/items/surfaces.ts` — new feature surface map
- `src/app/surface-registry.ts` — add `itemSurfaces`

**Schema augmentation:**
- `src/features/items/types.ts` — augment `ItemDetailsFieldsSchema` with `item_category_id` and `major_category`; add `ItemIssuesFieldsSchema`
- `src/features/items/index.ts` — export `ItemIssuesFieldsSchema` and new field components

### Out of scope

- Store-backed data for categories, issues, severities
- `ItemFastIssueSheetPage` functional content
- Task and item CRUD mutation hooks/actions
- Any feature provider or controller
- Pricing/dimension item fields

### Assumptions

- `useSurfaceStore.getState().open(id, props)` is called directly from event handlers (not during render), matching the established pattern in `TaskReadyByDateField`.
- Sheet pages read props via `useSurfaceProps<T>()`.
- All item test data constants (categories, issues, severities) are centralized in `src/features/items/item-test-data.ts`, not colocated with individual field or page files.
- `major_category` is a UI-only RHF field — it drives category filtering and display but is never sent to the backend.
- The form schema that composes these fields is responsible for declaring `major_category` and `item_issues` using the schemas exported by this plan.

---

## Clarifications required

All clarifications resolved in the user prompt.

---

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors
2. `BoxPicker` works without any RHF context — it is a pure controlled component
3. `BoxPicker` single-select: `onValueChange` called with the tapped value; deselecting a selected option passes the same value (toggle behavior is the field's concern, not the primitive's)
4. `BoxPicker` multi-select: `onValueChange` called with the updated array
5. `BoxPicker` renders `layout="grid"` (2-col default) and `layout="stack"` (full-width)
6. `BoxPicker` renders `visualVariant="default"`, `"horizontalDescription"`, and `"pill"`
7. `renderSelectedAction` renders only on selected options; clicking it does NOT trigger the outer `onValueChange` handler
8. `TaskFulfillmentMethodField` writes `'pickup_at_store'` | `'delivery'` to `fulfillment_method`
9. `TaskReturnSourceField` writes `'after_purchase'` | `'before_purchase'` | `'store_return'` to `return_source`
10. Selecting a major category in `ItemCategorySelectionField` opens the category picker sheet; incompatible `item_category_id` is cleared
11. Selecting a category in the picker sheet closes the sheet and writes `item_category_id`
12. Existing `item_category_id` resolves to the correct `major_category` on mount
13. `ItemIssuesField` stores `Array<{ issue_id: string; issue_severity_id: string }>`
14. Tapping an unselected issue box opens the severity picker sheet
15. Selecting a severity commits the pair and closes the sheet
16. Tapping a selected issue box (not the ×) reopens the severity picker
17. Tapping the selected issue × removes it without opening the severity picker
18. `ItemFastIssueActionField` opens a sheet page showing "Coming soon"
19. `grep -r "useFormContext\|useController" src/components/primitives` returns zero results
20. No primitive file imports from any `features/` path

---

## Contracts and skills

### Contracts loaded

Core (always include):
- `architecture/01_architecture.md`: dependency rules — primitives cannot import features
- `architecture/02_types.md`: Zod schema conventions
- `architecture/08_hooks.md`: `useController` field anatomy
- `architecture/15_feature_structure.md`: feature folder layout and `index.ts` boundary

New feature bundle:
- `architecture/07_components.md`: named exports, `cva`, `cn()`, no default exports
- `architecture/09_forms.md`: RHF contract — `useController`, `FormProvider`, `useFormContext`
- `architecture/14_styling.md`: Tailwind-only, `cva`, `cn()`
- `architecture/24_dto.md`: schema conventions
- `architecture/28_surfaces.md`: surface types and architecture
- `architecture/17_testing.md` + `architecture/34_runtime_validation.md` + `architecture/34_runtime_validation_local.md`: `data-testid` naming, Playwright spec

### Local extensions loaded

- `28_surfaces_local.md`: active surface types (`slide`, `sheet`, `modal`; `drawer` excluded)
- `34_runtime_validation_local.md`: fixture paths, npm scripts, project names, spec file convention

### Domain schemas consulted

- `src/features/tasks/types.ts`: `TASK_FULFILLMENT_METHOD = ['pickup_at_store', 'delivery']`; `TASK_RETURN_SOURCE = ['after_purchase', 'before_purchase', 'store_return']` — both already defined in `CreateTaskInputSchema`.
- `src/features/items/types.ts`: `item_category_id: z.string().nullable()` in `ItemSchema`; `item_category_id: z.string().min(1).optional()` in `CreateItemInputSchema`; `ItemIssueSchema` and `ITEM_ISSUE_STATE` newly added; `ItemDetailsFieldsSchema` needs augmentation.

### File read intent

Permitted relational reads:
- `src/features/tasks/types.ts` — verify exact enum values
- `src/features/items/types.ts` — verify `item_category_id` shape and `ItemIssue`
- `src/components/primitives/input/TextInput.tsx` — verify `cva` + `forwardRef` pattern
- `src/components/primitives/shared/primitive-base.ts` — verify shared constants
- `src/providers/SurfaceProvider.tsx` — verify `open()` API and `useSurfaceProps` pattern
- `src/components/primitives/date/surfaces.ts` — verify surface registration shape
- `src/app/surface-registry.ts` — verify merge pattern
- `src/features/tasks/components/fields/TaskReadyByDateField.tsx` — verify `useController` + surface open pattern

Prohibited:
- Reading another field component to understand `useController` shape → `09_forms.md`
- Reading another provider to understand context shell → `23_providers.md`

---

## Architecture explanation

### The BoxPicker responsibility boundary

The `BoxPicker` primitive answers one question: **which option is selected?**

It knows about:
- Which values are in the `value` prop
- Layout (grid / stack)
- Visual variant (default / horizontalDescription / pill)
- Whether to render icon, label, description
- Whether to render a selected action slot via `renderSelectedAction`

It does NOT know about:
- RHF, form context, or field paths
- Tasks, items, categories, issues, or severities
- Bottom sheets, routing, or navigation
- What the selected action should do

### The field component responsibility boundary

A field component owns:
- `useController()` binding to the RHF path
- Mapping domain data (test constants or future store records) to `BoxPickerOption[]`
- Opening bottom sheets on selection events via `useSurfaceStore.getState().open()`
- Implementing `renderSelectedAction` callbacks (remove, open severity picker, etc.)
- Error display
- All `data-testid` attributes

### The surface page responsibility boundary

Surface pages own:
- Reading `useSurfaceProps<T>()` to access the callback and current value passed from the field
- Rendering a `BoxPicker` (or other content) with appropriate options
- Calling the callback on selection
- Closing via `useSurfaceStore.getState().closeTop()` after selection

### Nested button problem and solution

A `<button>` inside a `<button>` is invalid HTML. Since `renderSelectedAction` must return a real `<button>` element (for accessibility), the `BoxPickerOption` container must NOT itself be a `<button>`.

**Solution:** `BoxPickerOption` renders a `<div>` with `role="button"`, `tabIndex`, `onClick`, and `onKeyDown` (Enter / Space activate). The `renderSelectedAction` slot is a direct child of the container div, wrapped in a `<span onClick={e => e.stopPropagation()}>` to block the parent click handler. The callback provided by the feature field also calls `e.stopPropagation()` as a defensive measure.

```
<div role="button" tabIndex={0} onClick={handleSelect} ...>
  <span class="flex-1">           ← icon + label + description
  <span onClick={stopProp}>       ← selected action slot
    <button type="button" ...>×</button>   ← provided by feature field
```

This is valid HTML, keyboard-accessible, and click-isolated.

### Where surface pages live

Calendar picker pages live in `src/pages/calendar/` because they serve a shared primitive used across features.

Item picker pages are item-feature-specific and live at:
```
src/features/items/pages/
```

The `surfaces.ts` for items lives at `src/features/items/surfaces.ts` and exports `itemSurfaces`, consistent with `calendarSurfaces` and `testingFormsSurfaces`.

---

## Full file tree

```
src/
  components/primitives/
    box-picker/
      box-picker.types.ts              ← NEW: all types
      box-picker.variants.ts           ← NEW: cva option variants
      BoxPickerOption.tsx              ← NEW: single option rendering
      BoxPicker.tsx                    ← NEW: orchestration component
      index.ts                         ← NEW: public API
    index.ts                           ← MODIFIED: add BoxPicker exports

  features/
    tasks/
      components/fields/
        TaskFulfillmentMethodField.tsx ← NEW
        TaskReturnSourceField.tsx      ← NEW
      index.ts                         ← MODIFIED: export new fields

    items/
      types.ts                         ← MODIFIED: augment ItemDetailsFieldsSchema + add ItemIssuesFieldsSchema
      item-test-data.ts                ← NEW: shared test constants (categories, issues, severities)
      components/fields/
        ItemCategorySelectionField.tsx ← NEW
        ItemIssuesField.tsx            ← NEW
        ItemFastIssueActionField.tsx   ← NEW
      pages/
        ItemCategoryPickerSheetPage.tsx        ← NEW
        ItemIssueSeverityPickerSheetPage.tsx   ← NEW
        ItemFastIssueSheetPage.tsx             ← NEW
      surfaces.ts                      ← NEW
      index.ts                         ← MODIFIED: export new fields + ItemIssuesFieldsSchema

  app/
    surface-registry.ts                ← MODIFIED: add itemSurfaces
```

---

## Primitive API

### `box-picker.types.ts`

```ts
export type BoxPickerOption<Value extends string = string> = {
  value: Value;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  disabled?: boolean;
  testId?: string;
};

export type BoxPickerSelectionMode = 'single' | 'multiple';
export type BoxPickerLayout = 'grid' | 'stack';
export type BoxPickerVisualVariant = 'default' | 'horizontalDescription' | 'pill';

type BoxPickerSingleProps<Value extends string> = {
  mode: 'single';
  value: Value | null | undefined;
  onValueChange: (value: Value) => void;
};

type BoxPickerMultipleProps<Value extends string> = {
  mode: 'multiple';
  value: Value[];
  onValueChange: (value: Value[]) => void;
};

export type BoxPickerProps<Value extends string = string> = (
  | BoxPickerSingleProps<Value>
  | BoxPickerMultipleProps<Value>
) & {
  options: BoxPickerOption<Value>[];
  layout?: BoxPickerLayout;
  visualVariant?: BoxPickerVisualVariant;
  columns?: 2 | 3 | 4;
  showIcon?: boolean;
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
  optionClassName?: string;
  selectedOptionClassName?: string;
  unselectedOptionClassName?: string;
  disabledOptionClassName?: string;
  getOptionTestId?: (option: BoxPickerOption<Value>) => string;
  renderSelectedAction?: (option: BoxPickerOption<Value>) => React.ReactNode;
  'data-testid'?: string;
};
```

### `box-picker.variants.ts`

```ts
import { cva } from 'class-variance-authority';

// Container variant — applied to the outer div[role="button"]
export const boxOptionVariants = cva(
  [
    'relative flex select-none cursor-pointer',
    'border transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'aria-disabled:pointer-events-none aria-disabled:opacity-40',
  ],
  {
    variants: {
      visualVariant: {
        // rounded-xl NOT in base — pill variant uses rounded-full; both in base = CSS order decides winner
        default: 'flex-col items-center justify-center gap-2 bg-background p-3 text-center rounded-xl',
        horizontalDescription: 'flex-row items-center gap-3 bg-background px-4 py-3 text-left rounded-xl',
        pill: 'flex-row items-center justify-between gap-2 rounded-full px-4 py-2',
      },
      selected: {
        true: 'bg-neutral-900 text-white border-neutral-900',
        false: 'border-border text-foreground bg-background',
      },
    },
    defaultVariants: {
      visualVariant: 'default',
      selected: false,
    },
  },
);

// Grid layout column classes
export const GRID_COLUMNS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};
```

### `BoxPickerOption.tsx`

```tsx
import { cn } from '@/lib/utils';
import { boxOptionVariants } from './box-picker.variants';
import type { BoxPickerOption as BoxPickerOptionType, BoxPickerVisualVariant } from './box-picker.types';

type BoxPickerOptionProps<Value extends string> = {
  option: BoxPickerOptionType<Value>;
  isSelected: boolean;
  visualVariant?: BoxPickerVisualVariant;
  showIcon?: boolean;
  showLabel?: boolean;
  showDescription?: boolean;
  optionClassName?: string;
  selectedOptionClassName?: string;
  unselectedOptionClassName?: string;
  disabledOptionClassName?: string;
  testId?: string;
  onPress: (value: Value) => void;
  renderSelectedAction?: (option: BoxPickerOptionType<Value>) => React.ReactNode;
};

export function BoxPickerOption<Value extends string>({
  option,
  isSelected,
  visualVariant = 'default',
  showIcon = true,
  showLabel = true,
  showDescription = true,
  optionClassName,
  selectedOptionClassName,
  unselectedOptionClassName,
  disabledOptionClassName,
  testId,
  onPress,
  renderSelectedAction,
}: BoxPickerOptionProps<Value>) {
  const Icon = option.icon;

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && !option.disabled) {
      e.preventDefault();
      onPress(option.value);
    }
  }

  return (
    <div
      role="button"
      tabIndex={option.disabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={option.disabled}
      data-testid={testId}
      onClick={!option.disabled ? () => onPress(option.value) : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        boxOptionVariants({ visualVariant, selected: isSelected }),
        optionClassName,
        isSelected && selectedOptionClassName,
        !isSelected && unselectedOptionClassName,
        option.disabled && disabledOptionClassName,
      )}
    >
      {/* Content area.
          default variant:              flex-col so icon sits above label.
          horizontalDescription + pill: flex-row so icon sits left of label. */}
      <span className={cn(
        'flex min-w-0 flex-1 gap-2',
        visualVariant === 'default'
          ? 'flex-col items-center justify-center'
          : 'flex-row items-center',
      )}>
        {showIcon && Icon && (
          <Icon className="size-5 shrink-0" />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          {showLabel && (
            <span className="truncate text-sm font-medium">{option.label}</span>
          )}
          {showDescription && option.description && visualVariant === 'horizontalDescription' && (
            <span className="text-xs opacity-70">{option.description}</span>
          )}
        </span>
      </span>

      {/* Selected action slot — stopPropagation prevents outer onClick from firing */}
      {isSelected && renderSelectedAction && (
        <span
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {renderSelectedAction(option)}
        </span>
      )}
    </div>
  );
}
```

### `BoxPicker.tsx`

```tsx
import { cn } from '@/lib/utils';
import { GRID_COLUMNS } from './box-picker.variants';
import { BoxPickerOption } from './BoxPickerOption';
import type { BoxPickerProps } from './box-picker.types';

export function BoxPicker<Value extends string = string>({
  mode,
  value,
  onValueChange,
  options,
  layout = 'grid',
  visualVariant = 'default',
  columns = 2,
  showIcon = true,
  showLabel = true,
  showDescription = true,
  className,
  optionClassName,
  selectedOptionClassName,
  unselectedOptionClassName,
  disabledOptionClassName,
  getOptionTestId,
  renderSelectedAction,
  'data-testid': testId,
}: BoxPickerProps<Value>) {
  function isSelected(optionValue: Value): boolean {
    if (mode === 'multiple') return (value as Value[]).includes(optionValue);
    return value === optionValue;
  }

  function handlePress(optionValue: Value) {
    if (mode === 'multiple') {
      const current = value as Value[];
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      (onValueChange as (v: Value[]) => void)(next);
    } else {
      (onValueChange as (v: Value) => void)(optionValue);
    }
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        layout === 'grid'
          ? `grid ${GRID_COLUMNS[columns]} gap-2`
          : 'flex flex-col gap-2',
        className,
      )}
    >
      {options.map((option) => (
        <BoxPickerOption
          key={option.value}
          option={option}
          isSelected={isSelected(option.value)}
          visualVariant={visualVariant}
          showIcon={showIcon}
          showLabel={showLabel}
          showDescription={showDescription}
          optionClassName={optionClassName}
          selectedOptionClassName={selectedOptionClassName}
          unselectedOptionClassName={unselectedOptionClassName}
          disabledOptionClassName={disabledOptionClassName}
          testId={getOptionTestId ? getOptionTestId(option) : option.testId}
          onPress={handlePress}
          renderSelectedAction={renderSelectedAction}
        />
      ))}
    </div>
  );
}
```

### `box-picker/index.ts`

```ts
export { BoxPicker } from './BoxPicker';
export { BoxPickerOption } from './BoxPickerOption';
export type {
  BoxPickerOption as BoxPickerOptionType,
  BoxPickerProps,
  BoxPickerLayout,
  BoxPickerSelectionMode,
  BoxPickerVisualVariant,
} from './box-picker.types';
```

---

## Schema augmentation — `src/features/items/types.ts`

**Replace** the existing `ItemDetailsFieldsSchema` export with the augmented version below (adds `item_category_id` and `major_category`). The existing fields are unchanged — only two new fields are appended:

```ts
// MODIFIED — replace existing ItemDetailsFieldsSchema to add item_category_id and major_category
export const ItemDetailsFieldsSchema = z.object({
  designer:           z.string().max(255).optional(),
  article_number:     z.string().max(128).optional(),
  sku:                z.string().max(128).optional(),
  quantity:           z.number({ message: 'Enter a number.' }).int().nonnegative().optional(),
  item_position:      z.string().max(255).optional(),
  item_currency:      z.enum(ITEM_CURRENCY, { message: 'Select a currency.' }).optional(),
  item_category_id:   z.string().optional(),
  major_category:     z.string().optional(),  // UI-only — not sent to backend
});
export type ItemDetailsFields = z.infer<typeof ItemDetailsFieldsSchema>;
```

**Add** `ItemIssuesFieldsSchema` below:

```ts
export const ItemIssuesFieldSchema = z.object({
  issue_id:           z.string().min(1),
  issue_severity_id:  z.string().min(1),
});

export const ItemIssuesFieldsSchema = z.object({
  item_issues: z.array(ItemIssuesFieldSchema).default([]),
});

export type ItemIssueFieldEntry = z.infer<typeof ItemIssuesFieldSchema>;
export type ItemIssuesFields = z.infer<typeof ItemIssuesFieldsSchema>;
```

**Note on `major_category`:** It is declared in the form schema so RHF can track it. It must never be included in `CreateItemInput` or `UpdateItemInput` payloads sent to the backend.

### Composite form schema reference

The schemas exported by this plan are composed in a parent form schema as follows. Field components bind to paths derived from this shape — get this wrong and all `useController` paths silently bind to `undefined`.

```ts
// Example: a form that combines item details + issues
const CreateItemFormSchema = z.object({
  item:        ItemDetailsFieldsSchema,                         // → item.item_category_id, item.major_category, item.designer, etc.
  item_issues: ItemIssuesFieldsSchema.shape.item_issues,        // → item_issues (flat, not nested under item)
});

// Usage:
// <ItemCategorySelectionField />  binds to  item.major_category  +  item.item_category_id
// <ItemIssuesField />             binds to  item_issues
```

Task fields bind to flat paths in the task form schema:
```ts
// fulfillment_method  →  TaskFulfillmentMethodField
// return_source       →  TaskReturnSourceField
```

---

## Temporary test data shape

**All item test data lives in a single shared file:**

```
src/features/items/item-test-data.ts
```

Do NOT colocate test constants in individual field or page files. `ItemIssuesField` needs severity names to render `"Scratches · Medium"` labels, and `ItemIssueSeverityPickerSheetPage` needs the same severity records to display options — two files needing the same data with no clean import direction between them. The shared file resolves this.

`TEST_ITEM_CATEGORIES` is also here so `ItemCategorySelectionField` and `ItemCategoryPickerSheetPage` share one source.

```ts
// src/features/items/item-test-data.ts
// Temporary — replace with store selectors when data layer is built.

import type { ComponentType } from 'react';
import { Box, Armchair, Table, Archive, Sofa } from 'lucide-react';

export type ItemCategoryOptionRecord = {
  client_id: string;
  name: string;
  major_category: string;
  icon?: ComponentType<{ className?: string }>;
};

export type ItemIssueOptionRecord = {
  client_id: string;
  name: string;
};

export type IssueSeverityOptionRecord = {
  client_id: string;
  name: string;
  time_multiplier: number;
};

export const TEST_ITEM_CATEGORIES: ItemCategoryOptionRecord[] = [
  { client_id: 'cat_wood_table',   name: 'Table',   major_category: 'wood', icon: Table },
  { client_id: 'cat_wood_cabinet', name: 'Cabinet', major_category: 'wood', icon: Archive },
  { client_id: 'cat_seat_chair',   name: 'Chair',   major_category: 'seat', icon: Armchair },
  { client_id: 'cat_seat_sofa',    name: 'Sofa',    major_category: 'seat', icon: Sofa },
];

export const TEST_ITEM_ISSUES: ItemIssueOptionRecord[] = [
  { client_id: 'issue_scratches',  name: 'Scratches' },
  { client_id: 'issue_stains',     name: 'Stains' },
  { client_id: 'issue_broken_leg', name: 'Broken leg' },
];

export const TEST_ISSUE_SEVERITIES: IssueSeverityOptionRecord[] = [
  { client_id: 'severity_low',    name: 'Low',    time_multiplier: 1 },
  { client_id: 'severity_medium', name: 'Medium', time_multiplier: 1.5 },
  { client_id: 'severity_high',   name: 'High',   time_multiplier: 2 },
];
```

When store integration is ready, delete this file and replace each import with a store selector — the `BoxPickerOption[]` mapping logic in each field stays unchanged.

---

## Surface registration plan

### `src/features/items/surfaces.ts`

```ts
import { lazy } from 'react';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const itemSurfaces: SurfaceRegistrations = {
  'item-category-picker': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/features/items/pages/ItemCategoryPickerSheetPage').then((m) => ({
        default: m.ItemCategoryPickerSheetPage,
      })),
    ),
  },
  'item-issue-severity-picker': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/features/items/pages/ItemIssueSeverityPickerSheetPage').then((m) => ({
        default: m.ItemIssueSeverityPickerSheetPage,
      })),
    ),
  },
  'item-fast-issue-page': {
    surface: 'sheet',
    component: lazy(() =>
      import('@/features/items/pages/ItemFastIssueSheetPage').then((m) => ({
        default: m.ItemFastIssueSheetPage,
      })),
    ),
  },
};
```

### `src/app/surface-registry.ts` — add `itemSurfaces`

```ts
import { calendarSurfaces }    from '@/components/primitives/date/surfaces';
import { testingFormsSurfaces } from '@/features/testing_forms';
import { testSurfaces }         from '@/features/test_feature';
import { itemSurfaces }         from '@/features/items';            // ← add (via feature index, consistent with testSurfaces / testingFormsSurfaces)
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,  // ← add
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

## Implementation steps

### Step 1 — `src/components/primitives/box-picker/box-picker.types.ts`

Write the full types file as specified in the Primitive API section above.

---

### Step 2 — `src/components/primitives/box-picker/box-picker.variants.ts`

Write the `cva` variants as specified in the Primitive API section above.

---

### Step 3 — `src/components/primitives/box-picker/BoxPickerOption.tsx`

Write `BoxPickerOption` as specified in the Primitive API section above.

Key rules:
- Container is a `<div role="button">` not a `<button>` — enables a real `<button>` inside for `renderSelectedAction`
- `onKeyDown` activates on Enter or Space
- `renderSelectedAction` slot is wrapped in `<span onClick={e => e.stopPropagation()}>` to prevent parent activation
- `aria-pressed={isSelected}` on the container
- `aria-disabled={option.disabled}` on the container

---

### Step 4 — `src/components/primitives/box-picker/BoxPicker.tsx`

Write `BoxPicker` as specified in the Primitive API section above.

Key rules:
- For `mode="single"`: `handlePress` calls `onValueChange(optionValue)` — toggle behavior (re-pressing a selected option) is the field's concern
- For `mode="multiple"`: `handlePress` toggles the value in the array and calls `onValueChange(next)`
- Grid uses CSS `grid` with `GRID_COLUMNS` lookup; stack uses `flex flex-col`
- `data-testid` passed through to the container div

---

### Step 5 — `src/components/primitives/box-picker/index.ts`

Write the barrel file as specified above.

---

### Step 6 — Update `src/components/primitives/index.ts`

Add BoxPicker exports:

```ts
export { BoxPicker, BoxPickerOption } from './box-picker';
export type {
  BoxPickerOptionType,
  BoxPickerProps,
  BoxPickerLayout,
  BoxPickerSelectionMode,
  BoxPickerVisualVariant,
} from './box-picker';
```

---

### Step 7 — `src/features/tasks/components/fields/TaskFulfillmentMethodField.tsx`

Field path: `fulfillment_method`. Uses `useController`. Single select. Grid layout. Default visual variant. Icon above label. Icons: `StoreIcon` and `TruckIcon` from `lucide-react`.

```tsx
import { useController, useFormContext } from 'react-hook-form';
import { Store as StoreIcon, Truck as TruckIcon } from 'lucide-react';
import { BoxPicker } from '@/components/primitives';
import type { BoxPickerOptionType } from '@/components/primitives';

type FulfillmentMethodValue = 'pickup_at_store' | 'delivery';

const OPTIONS: BoxPickerOptionType<FulfillmentMethodValue>[] = [
  { value: 'pickup_at_store', label: 'Pickup at store', icon: StoreIcon, testId: 'task-fulfillment-method-pickup-at-store-option' },
  { value: 'delivery',        label: 'Delivery',        icon: TruckIcon, testId: 'task-fulfillment-method-delivery-option' },
];

export function TaskFulfillmentMethodField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: 'fulfillment_method', control });

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-fulfillment-method-field">
      <label className="text-sm font-medium text-foreground">Fulfillment method</label>
      <BoxPicker
        mode="single"
        value={field.value ?? null}
        options={OPTIONS}
        onValueChange={field.onChange}
        layout="grid"
        visualVariant="default"
        columns={2}
        data-testid="task-fulfillment-method-picker"
      />
      {fieldState.error?.message && (
        <p className="text-xs text-destructive" data-testid="task-fulfillment-method-error" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
```

---

### Step 8 — `src/features/tasks/components/fields/TaskReturnSourceField.tsx`

Field path: `return_source`. Uses `useController`. Single select. Stack layout. `horizontalDescription` visual variant. Icons on the left. Icons: `Undo as UndoIcon`, `RotateCcw as RotateCcwIcon`, `Store as StoreIcon` from `lucide-react`.

```tsx
import { useController, useFormContext } from 'react-hook-form';
import { Undo as UndoIcon, RotateCcw as RotateCcwIcon, Store as StoreIcon } from 'lucide-react';
import { BoxPicker } from '@/components/primitives';
import type { BoxPickerOptionType } from '@/components/primitives';

type ReturnSourceValue = 'after_purchase' | 'before_purchase' | 'store_return';

const OPTIONS: BoxPickerOptionType<ReturnSourceValue>[] = [
  {
    value: 'after_purchase',
    label: 'After purchase',
    description: 'The item is returned after being purchased.',
    icon: UndoIcon,
    testId: 'task-return-source-after-purchase-option',
  },
  {
    value: 'before_purchase',
    label: 'Before purchase',
    description: 'The item is returned before the purchase is completed.',
    icon: RotateCcwIcon,
    testId: 'task-return-source-before-purchase-option',
  },
  {
    value: 'store_return',
    label: 'Store return',
    description: 'The item is returned internally from the store.',
    icon: StoreIcon,
    testId: 'task-return-source-store-return-option',
  },
];

export function TaskReturnSourceField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: 'return_source', control });

  return (
    <div className="flex flex-col gap-1.5" data-testid="task-return-source-field">
      <label className="text-sm font-medium text-foreground">Return source</label>
      <BoxPicker
        mode="single"
        value={field.value ?? null}
        options={OPTIONS}
        onValueChange={field.onChange}
        layout="stack"
        visualVariant="horizontalDescription"
        showIcon={true}
        data-testid="task-return-source-picker"
      />
      {fieldState.error?.message && (
        <p className="text-xs text-destructive" data-testid="task-return-source-error" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
```

---

### Step 9 — Augment `src/features/items/types.ts`

**Replace** the existing `ItemDetailsFieldsSchema` export with the augmented version from the Schema augmentation section (adds `item_category_id` and `major_category`; all existing fields are preserved). Then **append** `ItemIssuesFieldSchema`, `ItemIssuesFieldsSchema`, and their exported types below the existing `ItemDetailsFields` type. Follow the schema augmentation section above exactly.

---

### Step 9a — `src/features/items/item-test-data.ts`

Write the shared test data file as specified in the Temporary test data shape section above. This must be created before any field or page file that imports from it (Steps 10–13).

---

### Step 10 — `src/features/items/pages/ItemCategoryPickerSheetPage.tsx`

Surface page for the category picker sheet.

Props (via `useSurfaceProps`):
```ts
type ItemCategoryPickerProps = {
  majorCategory: string;
  currentCategoryId: string | null;
  onSelect: (categoryId: string) => void;
};
```

Renders:
- Sheet title: "Select category"
- `BoxPicker` in `mode="single"`, `layout="grid"`, `visualVariant="default"` with categories filtered by `majorCategory`
- Options mapped from `TEST_ITEM_CATEGORIES` where `record.major_category === majorCategory`
- On selection: calls `onSelect(selectedId)` then `useSurfaceStore.getState().closeTop()`
- `data-testid="item-category-picker-sheet"` on the page container

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { BoxPicker } from '@/components/primitives';
import { TEST_ITEM_CATEGORIES } from '@/features/items/item-test-data';

type ItemCategoryPickerProps = {
  majorCategory: string;
  currentCategoryId: string | null | undefined;
  onSelect: (categoryId: string) => void;
};

export function ItemCategoryPickerSheetPage() {
  const { majorCategory, currentCategoryId, onSelect } =
    useSurfaceProps<ItemCategoryPickerProps>();

  const options = TEST_ITEM_CATEGORIES
    .filter((c) => c.major_category === majorCategory)
    .map((c) => ({
      value: c.client_id,
      label: c.name,
      icon: c.icon,
      testId: `item-category-${c.client_id}-option`,
    }));

  function handleSelect(categoryId: string) {
    onSelect?.(categoryId);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="item-category-picker-sheet">
      <p className="text-base font-semibold text-foreground">Select category</p>
      <BoxPicker
        mode="single"
        value={currentCategoryId ?? null}
        options={options}
        onValueChange={handleSelect}
        layout="grid"
        visualVariant="default"
        columns={2}
      />
    </div>
  );
}
```

---

### Step 11 — `src/features/items/components/fields/ItemCategorySelectionField.tsx`

RHF field paths: `item.major_category` and `item.item_category_id`.

Behavior:
1. Uses `useController` for both paths.
2. On mount via `useEffect`: if `item_category_id` is set but `major_category` is empty, infer `major_category` from `TEST_ITEM_CATEGORIES` and call `majorCategoryField.onChange(inferred)`.
3. On major category change: if current `item_category_id` does not belong to the new major category, clear it. Then open the `item-category-picker` sheet.
4. Selected category trigger: if `item_category_id` is set, render a tappable row showing the category name. Tapping it reopens the picker sheet.

```tsx
import { useEffect } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Box as BoxIcon, Armchair as ArmchairIcon, ChevronRight } from 'lucide-react';
import { BoxPicker } from '@/components/primitives';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { TEST_ITEM_CATEGORIES } from '../item-test-data';

const MAJOR_CATEGORY_OPTIONS = [
  { value: 'wood', label: 'Wood', icon: BoxIcon,      testId: 'item-major-category-wood-option' },
  { value: 'seat', label: 'Seat', icon: ArmchairIcon, testId: 'item-major-category-seat-option' },
];

export function ItemCategorySelectionField() {
  const { control } = useFormContext();
  const { field: majorField,    fieldState: majorFieldState }    = useController({ name: 'item.major_category',   control });
  const { field: categoryField, fieldState: categoryFieldState } = useController({ name: 'item.item_category_id', control });

  // Infer major category from existing item_category_id on mount
  useEffect(() => {
    if (categoryField.value && !majorField.value) {
      const found = TEST_ITEM_CATEGORIES.find((c) => c.client_id === categoryField.value);
      if (found) majorField.onChange(found.major_category);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMajorCategoryChange(newMajor: string) {
    majorField.onChange(newMajor);
    // Determine whether the current item_category_id belongs to the new major category.
    // Compute shouldClear BEFORE calling onChange — categoryField.value is a captured
    // closure value that won't reflect the setState call until the next render.
    const current = TEST_ITEM_CATEGORIES.find((c) => c.client_id === categoryField.value);
    const shouldClear = !current || current.major_category !== newMajor;
    if (shouldClear) categoryField.onChange(null);
    // Pass null explicitly when clearing so the picker opens with no pre-selection,
    // instead of accidentally forwarding the now-cleared stale ID.
    openCategoryPicker(newMajor, shouldClear ? null : categoryField.value);
  }

  function openCategoryPicker(majorCategory: string, currentId: string | null | undefined) {
    useSurfaceStore.getState().open('item-category-picker', {
      majorCategory,
      currentCategoryId: currentId ?? null,
      onSelect: (id: string) => categoryField.onChange(id),
    });
  }

  const selectedCategory = TEST_ITEM_CATEGORIES.find(
    (c) => c.client_id === categoryField.value,
  );

  return (
    <div className="flex flex-col gap-3" data-testid="item-category-selection-field">
      <label className="text-sm font-medium text-foreground">Category</label>
      <BoxPicker
        mode="single"
        value={majorField.value ?? null}
        options={MAJOR_CATEGORY_OPTIONS}
        onValueChange={handleMajorCategoryChange}
        layout="grid"
        visualVariant="default"
        columns={2}
        data-testid="item-major-category-picker"
      />

      {selectedCategory && (
        <button
          type="button"
          data-testid="item-category-selected-trigger"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm"
          onClick={() => openCategoryPicker(majorField.value, categoryField.value)}
        >
          <span>{selectedCategory.name}</span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      )}

      {majorFieldState.error?.message && (
        <p className="text-xs text-destructive" data-testid="item-major-category-error" role="alert">
          {majorFieldState.error.message}
        </p>
      )}
      {categoryFieldState.error?.message && (
        <p className="text-xs text-destructive" data-testid="item-category-id-error" role="alert">
          {categoryFieldState.error.message}
        </p>
      )}
    </div>
  );
}
```

---

### Step 12 — `src/features/items/pages/ItemIssueSeverityPickerSheetPage.tsx`

Props (via `useSurfaceProps`):
```ts
type ItemIssueSeverityPickerProps = {
  issueId: string;
  issueName: string;
  currentSeverityId: string | null | undefined;
  onSelect: (issueId: string, severityId: string) => void;
};
```

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { BoxPicker } from '@/components/primitives';
import {
  TEST_ISSUE_SEVERITIES,
} from '@/features/items/item-test-data';

type ItemIssueSeverityPickerProps = {
  issueId: string;
  issueName: string;
  currentSeverityId: string | null | undefined;
  onSelect: (issueId: string, severityId: string) => void;
};

export function ItemIssueSeverityPickerSheetPage() {
  const { issueId, issueName, currentSeverityId, onSelect } =
    useSurfaceProps<ItemIssueSeverityPickerProps>();

  const options = TEST_ISSUE_SEVERITIES.map((s) => ({
    value: s.client_id,
    label: s.name,
    testId: `item-issue-severity-${s.client_id}-option`,
  }));

  function handleSelect(severityId: string) {
    if (issueId) onSelect?.(issueId, severityId);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="item-issue-severity-picker-sheet">
      <p className="text-base font-semibold text-foreground">{issueName ?? 'Select severity'}</p>
      <BoxPicker
        mode="single"
        value={currentSeverityId ?? null}
        options={options}
        onValueChange={handleSelect}
        layout="stack"
        visualVariant="pill"
        showIcon={false}
      />
    </div>
  );
}
```

---

### Step 13 — `src/features/items/components/fields/ItemIssuesField.tsx`

RHF field path: `item_issues` (shape: `Array<{ issue_id: string; issue_severity_id: string }>`).

Uses `useController`. Multi-select visual concept (issue boxes shown as pills), but the primitive is used in a custom way — the `value` passed to `BoxPicker` is the array of selected `issue_id` strings for display purposes only; the actual RHF field stores the richer pair array.

```tsx
import { useController, useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import { BoxPicker } from '@/components/primitives';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import type { BoxPickerOptionType } from '@/components/primitives';
import type { ItemIssueFieldEntry } from '../types';
import {
  TEST_ITEM_ISSUES,
  TEST_ISSUE_SEVERITIES,
} from '../item-test-data';

export function ItemIssuesField() {
  const { control } = useFormContext();
  const { field, fieldState } = useController({
    name: 'item_issues',
    control,
    defaultValue: [],
  });

  const currentPairs: ItemIssueFieldEntry[] = field.value ?? [];
  const selectedIssueIds = currentPairs.map((p) => p.issue_id);

  // Build options: label shows severity name when selected
  const options: BoxPickerOptionType[] = TEST_ITEM_ISSUES.map((issue) => {
    const pair = currentPairs.find((p) => p.issue_id === issue.client_id);
    const label = pair
      ? `${issue.name} · ${TEST_ISSUE_SEVERITIES.find((s) => s.client_id === pair.issue_severity_id)?.name ?? ''}`
      : issue.name;
    return {
      value: issue.client_id,
      label,
      testId: `item-issue-${issue.client_id}-option`,
    };
  });

  function handleIssuePress(issueId: string) {
    const issue = TEST_ITEM_ISSUES.find((i) => i.client_id === issueId);
    if (!issue) return;
    // onSelect captures currentPairs at call time. If field value changes while the sheet
    // is open (fast double-tap), the committed value is built from the snapshot taken here.
    // Low risk in practice: the sheet modal prevents further interaction until closed.
    useSurfaceStore.getState().open('item-issue-severity-picker', {
      issueId: issue.client_id,
      issueName: issue.name,
      currentSeverityId: currentPairs.find((p) => p.issue_id === issueId)?.issue_severity_id ?? null,
      onSelect: (id: string, severityId: string) => {
        const next = currentPairs.filter((p) => p.issue_id !== id);
        field.onChange([...next, { issue_id: id, issue_severity_id: severityId }]);
      },
    });
  }

  function removeIssue(issueId: string) {
    field.onChange(currentPairs.filter((p) => p.issue_id !== issueId));
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="item-issues-field">
      <label className="text-sm font-medium text-foreground">Issues</label>
      <BoxPicker
        mode="multiple"
        value={selectedIssueIds}
        options={options}
        onValueChange={(ids) => {
          // The primitive toggles IDs. Two cases arise:
          //   added:   user tapped an unselected issue → open severity picker
          //   removed: user tapped a selected issue body → reopen severity picker
          // The RHF value is NEVER updated here — only the onSelect callback in
          // handleIssuePress (called after severity is chosen) writes to field.onChange.
          // Removals via the × button go through removeIssue, not this handler.
          const added   = ids.find((id) => !selectedIssueIds.includes(id));
          const removed = selectedIssueIds.find((id) => !ids.includes(id));
          if (added)   handleIssuePress(added);
          if (removed) handleIssuePress(removed);
        }}
        layout="stack"
        visualVariant="pill"
        showIcon={false}
        data-testid="item-issues-picker"
        renderSelectedAction={(option) => (
          <button
            type="button"
            aria-label={`Remove ${option.label} issue`}
            data-testid={`item-issue-${option.value}-remove-button`}
            className="ml-2 flex size-4 items-center justify-center rounded-full text-xs opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              removeIssue(option.value);
            }}
          >
            <X className="size-3" />
          </button>
        )}
      />
      {fieldState.error?.message && (
        <p className="text-xs text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
```

**Important implementation note:** The `onValueChange` from `BoxPicker` fires when the primitive toggles the value array. Two meaningful events arrive here:
- `added` — a new ID appeared → user tapped an unselected issue → open severity picker
- `removed` — an ID disappeared → user tapped a selected issue body → reopen severity picker to change it

The RHF `field.value` is never updated inside `onValueChange`. Updates happen only via the `onSelect` callback inside `handleIssuePress`, after the user picks a severity. The `×` button calls `removeIssue` directly, bypassing `onValueChange` entirely via `stopPropagation`.

---

### Step 14 — `src/features/items/pages/ItemFastIssueSheetPage.tsx`

Placeholder page. Renders "Coming soon" text only.

```tsx
export function ItemFastIssueSheetPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8" data-testid="item-fast-issue-sheet">
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  );
}
```

---

### Step 15 — `src/features/items/components/fields/ItemFastIssueActionField.tsx`

Renders a button that opens the `item-fast-issue-page` sheet. This is not an RHF-bound field — it is a trigger action. It takes no props and has no field path.

```tsx
import { Plus } from 'lucide-react';
import { useSurfaceStore } from '@/providers/SurfaceProvider';

export function ItemFastIssueActionField() {
  function handlePress() {
    useSurfaceStore.getState().open('item-fast-issue-page', {});
  }

  return (
    <button
      type="button"
      data-testid="item-fast-issue-open-button"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground"
      onClick={handlePress}
    >
      <Plus className="size-4" />
      Add custom issue
    </button>
  );
}
```

---

### Step 16 — `src/features/items/surfaces.ts`

Write the surface registration file as specified in the Surface registration plan section above.

---

### Step 17 — Update `src/app/surface-registry.ts`

Add `itemSurfaces` as specified in the Surface registration plan section above.

---

### Step 18 — Update `src/features/tasks/index.ts`

Add:
```ts
export { TaskFulfillmentMethodField } from './components/fields/TaskFulfillmentMethodField';
export { TaskReturnSourceField }      from './components/fields/TaskReturnSourceField';
```

---

### Step 19 — Update `src/features/items/index.ts`

Add:
```ts
// New box-picker fields
export { ItemCategorySelectionField } from './components/fields/ItemCategorySelectionField';
export { ItemIssuesField }            from './components/fields/ItemIssuesField';
export { ItemFastIssueActionField }   from './components/fields/ItemFastIssueActionField';

// Surface registration (re-exported so surface-registry can import from feature boundary)
export { itemSurfaces } from './surfaces';

// New schemas
export { ItemIssuesFieldsSchema, ItemIssuesFieldSchema } from './types';
export type { ItemIssueFieldEntry, ItemIssuesFields }     from './types';
```

---

### Step 20 — `npm run typecheck`

Expected: zero TypeScript errors.

---

## data-testid naming reference

| Element | `data-testid` |
|---|---|
| TaskFulfillmentMethodField container | `task-fulfillment-method-field` |
| TaskFulfillmentMethodField BoxPicker | `task-fulfillment-method-picker` |
| Pickup at store option | `task-fulfillment-method-pickup-at-store-option` |
| Delivery option | `task-fulfillment-method-delivery-option` |
| TaskFulfillmentMethodField error | `task-fulfillment-method-error` |
| TaskReturnSourceField container | `task-return-source-field` |
| TaskReturnSourceField BoxPicker | `task-return-source-picker` |
| After purchase option | `task-return-source-after-purchase-option` |
| Before purchase option | `task-return-source-before-purchase-option` |
| Store return option | `task-return-source-store-return-option` |
| TaskReturnSourceField error | `task-return-source-error` |
| ItemCategorySelectionField container | `item-category-selection-field` |
| Major category BoxPicker | `item-major-category-picker` |
| Wood option | `item-major-category-wood-option` |
| Seat option | `item-major-category-seat-option` |
| Major category error | `item-major-category-error` |
| Category ID error | `item-category-id-error` |
| Selected category trigger | `item-category-selected-trigger` |
| Category picker sheet page | `item-category-picker-sheet` |
| Category option (dynamic) | `item-category-<client_id>-option` |
| ItemIssuesField container | `item-issues-field` |
| Issues BoxPicker | `item-issues-picker` |
| Issue option (dynamic) | `item-issue-<client_id>-option` |
| Issue remove button (dynamic) | `item-issue-<client_id>-remove-button` |
| Severity picker sheet page | `item-issue-severity-picker-sheet` |
| Severity option (dynamic) | `item-issue-severity-<client_id>-option` |
| Fast issue open button | `item-fast-issue-open-button` |
| Fast issue sheet page | `item-fast-issue-sheet` |

---

## Accessibility notes

- `BoxPickerOption` container: `role="button"`, `tabIndex={0}` (or `-1` when disabled), `aria-pressed={isSelected}`, `aria-disabled={option.disabled}`
- Keyboard: Enter and Space activate the option; handled in `onKeyDown`
- `renderSelectedAction` must receive a real `<button type="button">` from the field
- Selected action button: descriptive `aria-label` — e.g., `Remove Scratches issue`
- Selected action click handler: call `e.stopPropagation()` inside to prevent triggering the container's `onClick`
- Disabled options: `aria-disabled={true}` + `tabIndex={-1}` on the container div; pointer-events handled via `aria-disabled` CSS selector

---

## Mobile UX notes

- All option containers minimum touch target: 48px tall (`h-12` minimum or `py-3` padding)
- Pill variant: `px-4 py-2` + `rounded-full` — check that minimum height ≥ 44px on iOS
- Grid 2-col: each cell expands to fill available width — use `w-full` on the inner container
- Stack layout: full-width options — better for options with long labels or descriptions
- Selected option action (× button): minimum 24×24px tap target; consider adding `p-1` padding around the icon
- Sheet pages opened via `useSurfaceStore.getState().open()` use the existing `BottomSheetSurface` — no custom sheet sizing required unless explicitly overriding snap points

---

## Risks and mitigations

- Risk: `BoxPicker` multi-select `onValueChange` fires with the toggled array. For `ItemIssuesField`, listening for the diff (newly added ID) to open the picker is fragile if the user taps multiple items quickly.
  Mitigation: `ItemIssuesField` processes the diff synchronously; the severity picker opens immediately on detection of a new ID. Removals go through `renderSelectedAction` only and do not touch `onValueChange`.

- Risk: `div[role="button"]` is less discoverable than `<button>` for screen readers in some implementations.
  Mitigation: `role="button"` + `tabIndex` + `aria-pressed` + keyboard handler is the ARIA-compliant equivalent. This approach is required specifically to allow a real `<button>` inside the option for the selected action.

- Risk: `useSurfaceStore.getState().open()` called with an inline `onSelect` function creates a new closure reference each render. If the surface stores props by reference, stale closures are possible.
  Mitigation: This matches the established pattern in `TaskReadyByDateField`. Props passed to open are re-serialized on each call; the surface re-renders on each `open()` call with the latest props.

- Risk: `major_category` in `ItemDetailsFieldsSchema` is a UI-only field that could accidentally be included in `CreateItemInput` or `UpdateItemInput` mutation payloads.
  Mitigation: `major_category` is explicitly absent from both input schemas. Action hooks responsible for building the mutation payload must only spread from `CreateItemInputSchema`-compatible fields.

- Risk: `TEST_ITEM_CATEGORIES`, `TEST_ITEM_ISSUES`, and `TEST_ISSUE_SEVERITIES` are temporary constants — when store integration lands, they must be replaced with store selectors.
  Mitigation: All constants are centralized in `src/features/items/item-test-data.ts`. The type shapes are defined alongside the constants. The mapping to `BoxPickerOption[]` in each field is a pure function. Store integration replaces the constant source only; the mapping function remains unchanged.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: `TaskFulfillmentMethodField` inside `<FormProvider>` — tap each option, value updates correctly
- Manual: `TaskReturnSourceField` — description visible below label, single select
- Manual: `ItemCategorySelectionField` — tap Wood → category picker opens with Table/Cabinet; select one → trigger appears; tap trigger → picker reopens; tap Seat → category resets
- Manual: `ItemCategorySelectionField` — mount with existing `item_category_id = 'cat_seat_sofa'` → major category infers to `seat`, selected trigger shows "Sofa"
- Manual: `ItemIssuesField` — tap Scratches → severity picker opens; select Medium → "Scratches · Medium" pill shown; tap × → issue removed; tap pill body → severity picker reopens
- Manual: `ItemFastIssueActionField` — tap button → sheet opens showing "Coming soon"
- `npx playwright test --grep "BoxPicker\|fulfillment\|return source\|item category\|item issues" --project=mobile`: tests pass (Playwright spec written post-implementation)
- `npx playwright test --grep "BoxPicker\|fulfillment\|return source\|item category\|item issues" --project=desktop`: tests pass

---

## Playwright spec plan

After implementation, write the following specs:

```
tests/playwright/features/tasks/task-fulfillment-method.spec.ts
tests/playwright/features/tasks/task-return-source.spec.ts
tests/playwright/features/items/item-category-selection.spec.ts
tests/playwright/features/items/item-issues.spec.ts
```

Each spec imports from `../../fixtures/app-fixture` and uses `auth.signIn()` for authenticated tests. Follow the spec naming and structure from `34_runtime_validation_local.md`.

---

## Review log

- `2026-05-20` David: Approved structure with `renderSelectedAction` flexible API; confirmed pill variant for issues; confirmed `div[role="button"]` approach for nested button solution.
- `2026-05-20` Claude: Applied 8 fixes from review pass 1 — (1) `onValueChange` now detects both `added` and `removed` for re-tap behavior; (2) `TEST_ISSUE_SEVERITIES` extracted to shared `item-test-data.ts`; (3) `BoxPickerOption` content area layout corrected for `default` variant (icon-above-label); (4) Step 12 now has full implementation code; (5) stale `categoryField.value` bug fixed in `handleMajorCategoryChange`; (6) schema step 9 instruction clarified (Replace, not Append); (7) composite form schema reference added; (8) `surface-registry.ts` now imports via `@/features/items` index, consistent with other features.
- `2026-05-20` Claude: Applied 8 fixes from review pass 2 — (1) stale assumption updated (test data centralized in `item-test-data.ts`, not colocated); (2) stale risk entry updated to match; (3) `rounded-xl` removed from `cva` base — moved into `default` and `horizontalDescription` variants to avoid Tailwind conflict with `rounded-full` in `pill`; (4) `item-test-data.ts` import order fixed (value imports before type declarations); (5) `data-testid` added to error `<p>` in `TaskFulfillmentMethodField` and `TaskReturnSourceField`; (6) `ItemCategorySelectionField` now renders error paragraphs for both `majorField` and `categoryField`; (7) redundant Step 19 note about `ItemDetailsFieldsSchema` export removed; (8) stale closure risk in `handleIssuePress` documented inline.

## Lifecycle transition

- Current state: `archived`
- Transition owner: Codex (archived 2026-05-20T19:32:11Z)
