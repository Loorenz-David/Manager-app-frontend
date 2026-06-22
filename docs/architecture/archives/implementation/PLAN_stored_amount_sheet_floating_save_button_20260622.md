# PLAN_stored_amount_sheet_floating_save_button_20260622

## Metadata

- Plan ID: `PLAN_stored_amount_sheet_floating_save_button_20260622`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T11:46:51Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/upholstery_changes.txt`

## Goal and intent

- Goal: Three improvements to the "add amount" flow. (1) Move the "Add amount" save button and inline error inside `FloatingKeyboardBar.renderControls` in `StoredAmountSheetPage` so both clamp above the keyboard. (2) Redesign the inventory list card's trigger area: replace the separate stored-amount label + circular "+" button with a single composite element — a bordered container showing the stored amount with a `bg-primary` "+" extension on its right border — positioned at the bottom right of the card.
- Business/user intent: (1) After typing an amount the user must not have to dismiss the keyboard to tap save. (2) A wider, thumb-friendly composite trigger is easier to tap than a small icon button, and co-locating the stored display with the add action makes the affordance self-explanatory.
- Non-goals: Changing the save mutation logic, the reference info block at the top of the sheet, `StoredAmountSurfaceProps`, `surfaces.ts`, the controller, or any other page in the inventory feature.

## Scope

- In scope:
  - `src/features/upholstery-inventory/pages/StoredAmountSheetPage.tsx` — keyboard clamp
  - `src/features/upholstery-inventory/components/InventoryListCard.tsx` — composite trigger redesign
  - `src/features/upholstery-inventory/components/InventoryListHeader.tsx` — header height increase
  - `src/features/upholstery-inventory/components/InventoryListView.tsx` — body offset update to match new header height
- Out of scope:
  - `StoredAmountSurfaceProps`, `surfaces.ts`, the controller — no changes
  - `types.ts`, `InventoryListCardViewModel` — no field changes needed

## Clarifications required

_None._

## Acceptance criteria

1. When the keyboard is open on the add-amount sheet, the input field, error message (if present), and "Add amount" button are all visible above the keyboard without requiring the keyboard to be dismissed first.
2. Tapping "Add amount" while the keyboard is open does not cause a focus-steal flicker — the `onMouseDown={preventFocusSteal}` guard is applied.
3. The save logic (decimal addition, mutation call, sheet close on success, error string on failure) is identical to the pre-change implementation.
4. The inventory list card's bottom area renders a single composite `<button>` at the bottom right: a bordered container with "Stored" label + `storedDisplay` value on the left and a `bg-primary` "+" extension on the right, both clipped by `rounded-2xl overflow-hidden`. The old separate stored-amount block and circular "+" button are removed.
5. The `InventoryListHeader` outer container height increases from `h-14` (56 px) to `h-20` (80 px). Both animated panels use `top-6` instead of `top-0` so their content sits 24 px from the top of the header, giving visible breathing room.
6. All body offset values in `InventoryListView` are updated in lock-step with the new header height: `pt-14` → `pt-20`, `min-h-[calc(100dvh-3.5rem)]` → `min-h-[calc(100dvh-5rem)]`, and `indicatorOffset={56}` → `indicatorOffset={80}`. No layout shift or overlap occurs.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/37_keyboard_aware_inputs.md`: `FloatingKeyboardBar` clamp pattern — `renderControls` receives `inputRef` and `preventFocusSteal`; any interactive element inside `renderControls` that must not steal focus from the input must attach `onMouseDown={preventFocusSteal}`.

### Local extensions loaded

_None_

### File read intent — pattern vs. relational

Permitted relational reads:
- `StoredAmountSheetPage.tsx` — to locate the exact block to move (already read).
- `ItemUpholsteryAmountSheetPage.tsx` — canonical reference for the established clamp pattern (already read).

Prohibited:
- Reading any other action hook or sheet page to understand the FloatingKeyboardBar shape — `37_keyboard_aware_inputs.md` covers this.

### Skill selection

- Primary skill: `skills/react_component/SKILL.md`
- Trigger terms: keyboard, FloatingKeyboardBar, floating input, clamp
- Excluded alternatives: none

## Implementation plan

### Step 1 — `src/features/upholstery-inventory/pages/StoredAmountSheetPage.tsx`

**Extract the save handler into a named function** (avoids duplicating the inline arrow in `renderControls`):

Before the `return` statement, add:

```ts
function handleSave(): void {
  if (!inventoryId || normalized === null) {
    setError("Enter a positive amount to add.");
    return;
  }

  const currentDecimal =
    toDecimal(prefill?.currentStoredAmountMeters ?? null) ?? new Decimal(0);
  const total = currentDecimal
    .plus(new Decimal(normalized))
    .toDecimalPlaces(3)
    .toFixed(3);

  setStoredAmount.mutate(
    {
      inventoryId,
      current_stored_amount_meters: total,
    },
    {
      onSuccess: () => {
        useSurfaceStore.getState().close(STORED_AMOUNT_SHEET_ID);
      },
      onError: () => {
        setError("Could not save. Please try again.");
      },
    },
  );
}
```

**Move the error paragraph and save button inside `FloatingKeyboardBar.renderControls`**, and destructure `preventFocusSteal` from the render args:

Replace the current `FloatingKeyboardBar` block (input only inside `renderControls`) plus the external `{error}` paragraph and external save `<button>` with the following unified block:

```tsx
<FloatingKeyboardBar
  renderControls={({ inputRef, preventFocusSteal }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground">
        Amount to add
      </label>
      <div className="flex items-center rounded-2xl border border-border bg-card px-4 py-3">
        <input
          ref={inputRef}
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none"
          inputMode="decimal"
          placeholder="0.000"
          value={draft}
          onChange={(event) => {
            setError(null);
            setDraft(event.target.value);
          }}
        />
        <span className="ml-3 shrink-0 text-sm text-muted-foreground">m</span>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        className="mt-1 rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={setStoredAmount.isPending || !canSave}
        type="button"
        onMouseDown={preventFocusSteal}
        onClick={handleSave}
      >
        Add amount
      </button>
    </div>
  )}
/>
```

After this change the `return` body is only:
1. The reference info block (image + name + stored display) — unchanged
2. The `FloatingKeyboardBar` block above — now containing label, input, error, and save button

The standalone `{error}` paragraph and standalone save `<button>` that were below the `FloatingKeyboardBar` are removed.

---

### Step 2 — `src/features/upholstery-inventory/components/InventoryListCard.tsx`

**Replace the bottom metric row with a composite trigger element.**

Current bottom section to remove in full:

```tsx
<div className="mt-auto flex items-center justify-between pt-3">
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">Stored</span>
    <span className="text-lg font-semibold text-foreground">
      {card.storedDisplay}
    </span>
  </div>
  <button
    aria-label="Add amount"
    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-card"
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onTapAdd(card);
    }}
  >
    <Plus className="size-4" />
  </button>
</div>
```

Replace with:

```tsx
<div className="mt-auto flex justify-end pt-3">
  <button
    aria-label="Add amount"
    className="flex items-stretch overflow-hidden rounded-2xl border border-border"
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onTapAdd(card);
    }}
  >
    <div className="flex flex-col justify-center px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Stored</span>
      <span className="text-sm font-semibold text-foreground">
        {card.storedDisplay}
      </span>
    </div>
    <div className="flex items-center border-l border-border bg-primary px-3 text-card">
      <Plus className="size-4" />
    </div>
  </button>
</div>
```

**What this produces visually:**

```
┌─────────────────────┬─────┐
│ Stored              │     │
│ 12.500 m            │  +  │
└─────────────────────┴─────┘
```

- The outer `<button>` is the single tap target for `onTapAdd` — no nested buttons.
- `overflow-hidden rounded-2xl` clips both sides to the same border radius so the left section and the `bg-primary` extension share the same rounded corners.
- `border-l border-border` on the right section creates the visual separation between stored amount and the "+" extension.
- `items-stretch` on the outer button makes the right section fill the full height of the left section automatically, regardless of font size.
- `event.stopPropagation()` is required because the button sits inside the tappable card content `div[role="button"]`.

No other changes to `InventoryListCard` are needed. `onTapAdd`, `onTapActions`, `onTapCard` props and all other card content remain identical.

---

### Step 3 — `src/features/upholstery-inventory/components/InventoryListHeader.tsx`

**Increase the outer container height and push both inner panels down from the top.**

The header is a fixed-height clip container. Its content panels use `absolute inset-0` to fill it. To create top breathing room the container must grow taller and each panel must be inset from the top by the same amount, leaving the content area unchanged in size but shifted down.

**Outer container:** Change `h-14` → `h-20`:

```diff
- className="relative h-14 overflow-hidden bg-background"
+ className="relative h-20 overflow-hidden bg-background"
```

**Category browse panel:** Change `absolute inset-0` → `absolute inset-x-0 bottom-0 top-6`:

```diff
- className="absolute inset-0 flex flex-col justify-center px-4"
+ className="absolute inset-x-0 bottom-0 top-6 flex flex-col justify-center px-4"
```

**Inventory category detail panel:** Same change:

```diff
- className="absolute inset-0 flex items-center gap-3 px-4"
+ className="absolute inset-x-0 bottom-0 top-6 flex items-center gap-3 px-4"
```

Result: the outer container is 80 px tall. Each panel occupies the bottom 56 px (80 − 24 = 56), identical in size to before. The 24 px gap at the top provides the visual spacing between the page edge and the SearchBar / category row. `overflow-hidden` clips any transitioning panel that slides outside the 80 px boundary.

---

### Step 4 — `src/features/upholstery-inventory/components/InventoryListView.tsx`

All three offset values that mirror the header height must be updated together. A mismatch causes either content hidden under the header or a visible gap between the header and the body.

| Value | Before | After |
|---|---|---|
| Body top padding | `pt-14` | `pt-20` |
| Body min-height | `min-h-[calc(100dvh-3.5rem)]` | `min-h-[calc(100dvh-5rem)]` |
| `PullToRefresh` `indicatorOffset` | `56` | `80` |

Apply all three changes together:

```diff
- <div className="pt-14" data-testid="upholstery-inventory-list-scroll">
-   <div className="relative flex min-h-[calc(100dvh-3.5rem)]">
+ <div className="pt-20" data-testid="upholstery-inventory-list-scroll">
+   <div className="relative flex min-h-[calc(100dvh-5rem)]">
```

```diff
- indicatorOffset={56}
+ indicatorOffset={80}
```

No other changes to `InventoryListView.tsx`.

## Risks and mitigations

- Risk: `renderControls` is called twice by `FloatingKeyboardBar` (once for the inline placeholder, once for the portal above the keyboard). The `handleSave` function captures `normalized`, `inventoryId`, etc. from the component closure — both renders reference the same live closure, so both renders always see current state. No stale-closure risk.
  Mitigation: None needed; this is the documented contract of `FloatingKeyboardBar` (`37_keyboard_aware_inputs.md`).

- Risk: Forgetting `onMouseDown={preventFocusSteal}` on the save button would cause a keyboard-dismiss flicker before the click handler fires.
  Mitigation: Explicitly required in acceptance criteria 2; follow the `ItemUpholsteryAmountSheetPage` reference exactly.

- Risk: The composite button in `InventoryListCard` contains non-interactive `div` children. Some lint rules flag non-interactive content inside buttons. This is intentional layout — the divs are presentational, not interactive.
  Mitigation: No interactive child elements inside the composite `<button>`; only `div` layout wrappers and text/icon spans. No nested `<button>` tags.

- Risk: Updating only some of the three body offset values in `InventoryListView` (pt, min-h, indicatorOffset) will cause a layout misalignment — content hidden behind the header or a visible gap.
  Mitigation: Step 4 lists all three values explicitly as a single atomic change; they must all be updated together.

## Validation plan

- `npm run typecheck`: zero TypeScript errors

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
