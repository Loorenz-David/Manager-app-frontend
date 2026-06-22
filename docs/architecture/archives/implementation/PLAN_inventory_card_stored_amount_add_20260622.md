# PLAN_inventory_card_stored_amount_add_20260622

## Metadata

- Plan ID: `PLAN_inventory_card_stored_amount_add_20260622`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-22T00:00:00Z`
- Last updated at (UTC): `2026-06-22T11:25:28Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/upholstery_changes.txt`

## Goal and intent

- Goal: Simplify the upholstery inventory list card to show only the stored amount, and add a direct "+" shortcut that opens the "Add amount" sheet inline from the card.
- Business/user intent: Users need a fast path to increment stock without navigating into the detail page first. The card should surface only the most actionable metric (stored) and expose the add-amount action directly.
- Non-goals: Changing the detail page, the add-amount sheet logic, or any other metric display outside the list card.

## Scope

- In scope:
  - `InventoryListCardViewModel` — add `currentStoredAmountMeters` raw field
  - `toInventoryListCardViewModel` — populate new field from `item.current_stored_amount_meters`
  - `InventoryListCard` — remove "Available" and "Ordered" blocks; promote "Stored" as primary metric; add "+" button via new `onTapAdd` prop
  - `use-inventory-list.controller.ts` — add `openAddAmount(card)` that opens `STORED_AMOUNT_SHEET_ID` with full prefill from the card
  - `InventoryListView` — wire `onTapAdd={controller.openAddAmount}` on `InventoryListCard`
- Out of scope:
  - `StoredAmountSheetPage` — already updated; no changes here
  - `InventoryDetailViewModel` — separate type, not touched
  - `availableDisplay`, `availableIsNegative`, `orderedDisplay` fields — kept in VM (used elsewhere); just not rendered in the card
- Assumptions:
  - `StoredAmountSurfaceProps.prefill` already carries `imageUrl`, `upholsteryName`, `storedDisplay`, `currentStoredAmountMeters` (updated in the prior session).
  - `STORED_AMOUNT_SHEET_ID` is already registered as a `"sheet"` surface in `surfaces.ts`.

## Clarifications required

_None — intent is unambiguous and all contracts are in place._

## Acceptance criteria

1. The inventory list card renders only the "Stored" metric; "Available" and "Ordered" are gone.
2. A "+" button appears at the right of the stored amount row; tapping it opens the add-amount sheet without navigating to the detail page.
3. The add-amount sheet receives the correct `inventoryId`, `currentStoredAmountMeters`, `imageUrl`, `upholsteryName`, and `storedDisplay` prefill from the card.
4. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/contracts/08_hooks.md`: controller aggregation and mutation hook shape
- `architecture/contracts/24_dto.md`: view model transformer pattern

### Local extensions loaded

_None_

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`

Permitted (relational reads — understanding what exists):
- Reading `types.ts` to confirm exact field names and the `InventoryListCardViewModel` shape
- Reading `surfaces.ts` to confirm `StoredAmountSurfaceProps` and `STORED_AMOUNT_SHEET_ID`
- Reading `use-inventory-list.controller.ts` to understand current return shape before extending it
- Reading `InventoryListView.tsx` to locate the `InventoryListCard` call site

### Skill selection

- Primary skill: `skills/react_component/SKILL.md`
- Trigger terms: card, view model, controller, list
- Excluded alternatives: none

## Implementation plan

### Step 1 — `src/features/upholstery-inventory/types.ts`

**Add `currentStoredAmountMeters` to `InventoryListCardViewModel`:**

Locate `InventoryListCardViewModel`. Add one field:

```ts
currentStoredAmountMeters: string | null;
```

**Populate it in `toInventoryListCardViewModel`:**

Inside the `return` of `toInventoryListCardViewModel`, add:

```ts
currentStoredAmountMeters: item.current_stored_amount_meters,
```

---

### Step 2 — `src/features/upholstery-inventory/components/InventoryListCard.tsx`

**Extend props:**

Add `onTapAdd` to `InventoryListCardProps`:

```ts
onTapAdd: (card: InventoryListCardViewModel) => void;
```

Destructure it in the component signature alongside `onTapActions` and `onTapCard`.

**Import `Plus` from `lucide-react`.**

**Replace the bottom metric block:**

Remove the entire `<div className="mt-auto flex items-end gap-3 pt-3">` block (which currently renders "Available", "Stored", and optionally "Ordered"). Replace it with:

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

`event.stopPropagation()` is required because the button sits inside the tappable card content div.

Remove `cn` import if it is no longer used after removing the `availableIsNegative` conditional class.

---

### Step 3 — `src/features/upholstery-inventory/controllers/use-inventory-list.controller.ts`

**Add imports** (only if not already present):

```ts
import {
  STORED_AMOUNT_SHEET_ID,
  type StoredAmountSurfaceProps,
} from "../surfaces";
import type { InventoryListCardViewModel } from "../types";
```

**Add `openAddAmount` function** inside `useInventoryListController`:

```ts
function openAddAmount(card: InventoryListCardViewModel): void {
  useSurfaceStore.getState().open(STORED_AMOUNT_SHEET_ID, {
    inventoryId: card.inventoryId,
    prefill: {
      currentStoredAmountMeters: card.currentStoredAmountMeters,
      imageUrl: card.imageUrl,
      upholsteryName: card.name,
      storedDisplay: card.storedDisplay,
    },
  } satisfies StoredAmountSurfaceProps);
}
```

**Add `openAddAmount` to the return object.**

---

### Step 4 — `src/features/upholstery-inventory/components/InventoryListView.tsx`

In the inventory panel's `inventoryCards.map(...)` block, add the `onTapAdd` prop to `InventoryListCard`:

```tsx
<InventoryListCard
  key={card.inventoryId}
  card={card}
  onTapActions={controller.openCardActions}
  onTapCard={controller.openDetail}
  onTapAdd={controller.openAddAmount}
/>
```

## Risks and mitigations

- Risk: `cn` import becomes unused in `InventoryListCard` after removing `availableIsNegative` conditional class.
  Mitigation: Remove the `cn` import if unused; typecheck will catch it either way.

- Risk: `currentStoredAmountMeters` is `null` for inventory items with no stored amount recorded — the add-amount sheet already handles this by defaulting to `new Decimal(0)`.
  Mitigation: No change needed; the prefill contract already accepts `null`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
