# PLAN_task_creation_form_containers_20260523

## Metadata

- Plan ID: `PLAN_task_creation_form_containers_20260523`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T08:10:52Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Wrap form fields in card-style containers across all three task-creation forms. Containers go edge-to-edge (full device width), supply their own horizontal padding, and carry `bg-[var(--color-card)]`, rounded corners, and a bottom shadow.
- Business/user intent: Improve visual organisation of the staged forms by grouping related fields into distinct surfaces with consistent spacing between groups.
- Non-goals: Field logic, validation, schema, or submit behaviour changes. Styling individual field components.

## Scope

- In scope:
  - New `FormFieldContainer` primitive, internal to `features/task-creation/`
  - Restructure of all three `StagedFormStep` bodies in `ReturnFormContent`, `PreOrderFormContent`, and `InternalFormContent`
  - Remove `CustomerTypeField` from Return and PreOrder customer steps (replace `CustomerFieldGroup` with individual field imports)
  - Override `StagedFormStep` x-padding via its `className` prop so containers go edge-to-edge
- Out of scope: Changes to `StagedFormStep` component itself, individual field component styling, any form schema or logic.
- Assumptions:
  - `cn()` in `StagedFormStep` uses `tailwind-merge`, so passing `className="px-0"` correctly strips the x-padding from the built-in `p-6` class while keeping `py-6`.
  - `CustomerAddressFieldGroup` already renders its own title label ("Address (optional)") — it goes directly inside a `FormFieldContainer` without needing an extra wrapper.
  - `WorkingSectionPickerField` already renders its own "Working sections" label — it goes directly inside a `FormFieldContainer`.
  - `ImagePreviewGrid` renders correctly inside a `FormFieldContainer` without extra wrapping; the old `<section className="rounded-2xl border border-border p-4">` wrapper is removed wherever images appear.

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/task-creation/components/ReturnFormContent.tsx` | Replace step content with container-grouped fields; swap `CustomerFieldGroup` for individual fields; add `className="px-0"` to all `StagedFormStep` usages |
| `features/task-creation/components/PreOrderFormContent.tsx` | Same restructuring as `ReturnFormContent` |
| `features/task-creation/components/InternalFormContent.tsx` | Replace step content with container-grouped fields; add `className="px-0"` to all `StagedFormStep` usages |

### New files to create

| Path (relative to `src/`) |
|---|
| `features/task-creation/components/FormFieldContainer.tsx` |

## Clarifications required

*(none — all groupings are unambiguous from the spec)*

## Acceptance criteria

1. `FormFieldContainer` renders a `w-full` div with `bg-[var(--color-card)]`, `rounded-xl`, `shadow-sm`, `px-4`, and `py-4`.
2. All three forms have zero horizontal padding at the step level — containers touch the screen edges.
3. Containers are spaced `gap-4` apart vertically inside each step.
4. Return and PreOrder forms have no `CustomerTypeField` rendered in the customer step.
5. No `<section className="rounded-2xl border border-border p-4">` wrapper remains around images — the `FormFieldContainer` serves as the image card.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component structure, `data-testid` placement
- `architecture/14_styling.md`: Tailwind, `cn()`, class ordering, CSS variable usage
- `architecture/15_feature_structure.md`: `FormFieldContainer` stays internal to `features/task-creation/` — not exported from `index.ts` (it is a layout-only component used only within this feature's content files)

### Local extensions loaded

- `architecture/14_styling.md`: uses `bg-[var(--color-card)]` to reference the CSS custom property `--color-card` defined in `src/index.css`

### Skill selection

- Primary skill: layout / component composition
- Trigger terms: `container`, `card`, `padding`, `shadow`, `group fields`

## Implementation plan

### Step 1 — Create `FormFieldContainer`

Create `src/features/task-creation/components/FormFieldContainer.tsx`.

```tsx
type FormFieldContainerProps = {
  children: React.ReactNode;
  'data-testid'?: string;
};

export function FormFieldContainer({
  children,
  'data-testid': testId,
}: FormFieldContainerProps): React.JSX.Element {
  return (
    <div
      className="flex w-full flex-col gap-3 rounded-xl bg-[var(--color-card)] px-4 py-4 shadow-sm"
      data-testid={testId}
    >
      {children}
    </div>
  );
}
```

Do NOT export this from `features/task-creation/index.ts` — it is an internal layout helper used only by the three form content files.

---

### Step 2 — Rewrite `ReturnFormContent` step bodies

**Import changes:**
- Remove: `import { CustomerFieldGroup } from '@/features/customers';`
- Add:
  ```ts
  import {
    CustomerAddressFieldGroup,
    CustomerDisplayNameField,
    CustomerEmailField,
    CustomerPhoneField,
  } from '@/features/customers';
  ```
- Add local import: `import { FormFieldContainer } from './FormFieldContainer';`

**`StagedFormStep` changes — add `className="px-0"` to every `StagedFormStep` usage** (removes x-padding from the built-in `p-6`).

**Item step — replace `<section className="flex flex-col gap-4">` with:**

```tsx
<StagedFormStep id="item" className="px-0">
  <div className="flex flex-col gap-4">

    {/* identity + core details */}
    <FormFieldContainer>
      <ItemDesignerField />
      <ItemIdentityField />
      <ItemQuantityField />
      <ItemPositionField />
    </FormFieldContainer>

    {/* category */}
    <FormFieldContainer>
      <ItemCategorySelectionField />
    </FormFieldContainer>

    {/* issues */}
    <FormFieldContainer>
      <ItemIssuesField />
    </FormFieldContainer>

    {/* upholstery (seat only) */}
    {majorCategory === 'seat' ? (
      <FormFieldContainer>
        <UpholsteryField control={form.control} />
        <ItemUpholsteryAmountField />
      </FormFieldContainer>
    ) : null}

    {/* images */}
    <FormFieldContainer data-testid="return-form-images-section">
      <EntityImagesProvider entityClientId={itemClientId} entityType="item">
        <ImagePreviewGrid maxImages={6} testId="return-form-images-grid" />
      </EntityImagesProvider>
    </FormFieldContainer>

  </div>
</StagedFormStep>
```

**Customer step:**

```tsx
<StagedFormStep id="customer" className="px-0">
  <div className="flex flex-col gap-4">

    {/* name / email / phone */}
    <FormFieldContainer>
      <CustomerDisplayNameField />
      <CustomerEmailField />
      <CustomerPhoneField />
    </FormFieldContainer>

    {/* address */}
    <FormFieldContainer>
      <CustomerAddressFieldGroup />
    </FormFieldContainer>

  </div>
</StagedFormStep>
```

`CustomerTypeField` is NOT rendered.

**Task step:**

```tsx
<StagedFormStep id="task" className="px-0">
  <div className="flex flex-col gap-4">

    {/* source + fulfilment */}
    <FormFieldContainer>
      <TaskReturnSourceField />
      <TaskFulfillmentMethodField />
    </FormFieldContainer>

    {/* dates */}
    <FormFieldContainer>
      <TaskDeliveryDateField />
      <TaskReadyByDateField />
    </FormFieldContainer>

    {/* details */}
    <FormFieldContainer>
      <TaskAdditionalDetailsField />
    </FormFieldContainer>

  </div>
</StagedFormStep>
```

---

### Step 3 — Rewrite `PreOrderFormContent` step bodies

Identical restructuring to Step 2. The only differences are the existing `data-testid` values and the step fields map constant name (`PRE_ORDER_STEP_FIELDS_MAP`).

Image container testIds: `data-testid="pre-order-form-images-section"`, `testId="pre-order-form-images-grid"`.

---

### Step 4 — Rewrite `InternalFormContent` step bodies

**Import changes:**
- Add local import: `import { FormFieldContainer } from './FormFieldContainer';`

**`StagedFormStep` changes — add `className="px-0"` to all three step usages.**

**Item step:**

```tsx
<StagedFormStep id="item" className="px-0">
  <div className="flex flex-col gap-4">

    {/* identity */}
    <FormFieldContainer>
      <ItemIdentityField />
    </FormFieldContainer>

    {/* category */}
    <FormFieldContainer>
      <ItemCategorySelectionField />
    </FormFieldContainer>

    {/* quantity + position (seat only) */}
    {majorCategory === 'seat' ? (
      <FormFieldContainer>
        <ItemQuantityField />
        <ItemPositionField />
      </FormFieldContainer>
    ) : null}

    {/* upholstery (seat only) */}
    {majorCategory === 'seat' ? (
      <FormFieldContainer>
        <UpholsteryField control={form.control} />
        <ItemUpholsteryAmountField />
      </FormFieldContainer>
    ) : null}

    {/* issues (wood only) */}
    {majorCategory === 'wood' ? (
      <FormFieldContainer>
        <ItemIssuesField />
      </FormFieldContainer>
    ) : null}

    {/* cleaning + oiling (wood only) */}
    {majorCategory === 'wood' ? (
      <FormFieldContainer>
        <NeedsCleaningPickerField />
        <OilingTreatmentPickerField />
      </FormFieldContainer>
    ) : null}

    {/* designer */}
    <FormFieldContainer>
      <ItemDesignerField />
    </FormFieldContainer>

  </div>
</StagedFormStep>
```

**Assignment step:**

```tsx
<StagedFormStep id="assignment" className="px-0">
  <div className="flex flex-col gap-4">
    <FormFieldContainer>
      <WorkingSectionPickerField majorCategory={majorCategory} />
    </FormFieldContainer>
  </div>
</StagedFormStep>
```

**Task step:**

```tsx
<StagedFormStep id="task" className="px-0">
  <div className="flex flex-col gap-4">

    {/* images */}
    <FormFieldContainer data-testid="internal-form-images-section">
      <EntityImagesProvider entityClientId={itemClientId} entityType="item">
        <ImagePreviewGrid maxImages={6} testId="internal-form-images-grid" />
      </EntityImagesProvider>
    </FormFieldContainer>

    {/* due date + details */}
    <FormFieldContainer>
      <TaskReadyByDateField />
      <TaskAdditionalDetailsField />
    </FormFieldContainer>

  </div>
</StagedFormStep>
```

---

### Step 5 — Clean up removed image wrappers

After the rewrites, verify no `<section className="rounded-2xl border border-border p-4">` wrapper remains in any of the three form content files. The `FormFieldContainer` now provides that card surface for images.

## Risks and mitigations

- Risk: `tailwind-merge` may not strip x-padding when `className="px-0"` is passed to `StagedFormStep`, leaving containers inset by 24px on each side.
  Mitigation: `StagedFormStep` uses `cn('w-full min-h-full p-6', className)` — `tailwind-merge` resolves `p-6` vs `px-0` with `px-0` winning (later-listed class wins on same axis). If this fails at runtime, fallback: pass `className="!px-0"` (Tailwind important modifier).

- Risk: `CustomerAddressFieldGroup` inner `<div className="flex flex-col gap-3">` adds extra spacing when nested inside `FormFieldContainer` which already has `gap-3`.
  Mitigation: `FormFieldContainer.gap-3` spaces between its direct children. `CustomerAddressFieldGroup`'s inner `gap-3` is between its own children (inputs). These are different levels and do not compound.

- Risk: Fields that render card-like bordered divs internally (e.g., `NeedsCleaningPickerField`, `WorkingSectionPickerField` boxes) will be inset by `px-4` from the container. This is the intended layout (container provides the outer card; fields render flush within that card's padding).
  Mitigation: Accepted by design.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Visual inspection on mobile viewport: containers touch screen edges, `gap-4` spacing visible between groups, `shadow-sm` visible as subtle bottom shadow, card background distinct from page background.

## Review log

- `2026-05-23` Claude: initial plan authored
- `2026-05-23` Codex: implemented `FormFieldContainer`, restructured all three task creation forms, and completed summary/archive handoff

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
