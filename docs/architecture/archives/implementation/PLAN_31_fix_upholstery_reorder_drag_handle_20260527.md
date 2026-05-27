# PLAN_31_fix_upholstery_reorder_drag_handle_20260527

## Metadata

- Plan ID: `PLAN_31_fix_upholstery_reorder_drag_handle_20260527`
- Status: `archived`
- Owner agent: `david` (authored) → `copilot` (implementation)
- Created at (UTC): `2026-05-27T13:00:00Z`
- Last updated at (UTC): `2026-05-27T10:16:48Z`
- Related issue/ticket: follow-up to `PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527`
- Intention plan: none — this is a bug-fix plan against a known breakage

---

## Goal and intent

- **Goal**: Fix the broken drag-handle in `UpholsteryReorderSheetPage`. Tapping and dragging the grip icon does not start a drag at all. Additionally fix the contract drift introduced by PLAN_29 that breaks the existing `upholstery-swap` Playwright spec.
- **Business/user intent**: Users must be able to drag upholstery cards to set their display order. Currently the entire reorder feature is non-functional.
- **Non-goals**: Redesigning the drag UX. Changing card layout. Touching the favorite mutation or list-order mutation logic.

---

## Scope

- **In scope**:
  - Sensor configuration in `UpholsteryReorderSheetPage.tsx`
  - Mock data fix in `upholstery-swap.spec.ts`
  - New Playwright diagnostic test for drag (written first to confirm the bug; stays as regression coverage)
  - New Playwright spec for the full reorder flow

- **Out of scope**:
  - Changing `BottomSheetSurface` (vaul setup is confirmed not the cause)
  - Modifying mutation hooks, API clients, or cache logic
  - Changing the visual design of `UpholsteryDnDCard` or `UpholsteryCard`

- **Assumptions**:
  - The dev server can be started for manual verification (`npm run dev`).
  - Playwright test credentials are available in `.env.test` OR tests use mocked routes (this plan uses mocked routes, no credentials needed).

---

## Clarifications required

None — root cause is confirmed from source code analysis (see Diagnosis section below).

---

## Root cause diagnosis

### Bug 1: dnd-kit `TouchSensor` with `delay: 0` cancels every drag

From `@dnd-kit/core/dist/core.cjs.development.js` line 1555–1558:

```javascript
// In AbstractPointerSensor.handleMove() (the touchmove handler):
if (isDelayConstraint(activationConstraint)) {
  if (hasExceededDistance(delta, activationConstraint.tolerance)) {
    return this.handleCancel(); // CANCEL if tolerance exceeded during delay
  }
}
```

And from line 1464–1466:

```javascript
if (isDelayConstraint(activationConstraint)) {
  this.timeoutId = setTimeout(this.handleStart, activationConstraint.delay);
  ...
  return;
}
```

With `delay: 0`, dnd-kit calls `setTimeout(handleStart, 0)`. The timer resolves at the next macro-task boundary. Meanwhile, `touchmove` events fire synchronously when the user's finger moves. Any `touchmove` with delta > `tolerance` (4px) before the `setTimeout(0)` resolves causes immediate cancellation.

On real devices (and Playwright mobile emulation), a user touching a small grip button will have some finger wobble. Even 4–5px of incidental movement during the initial contact cancels the drag before it activates. The user observes "no drag at all."

**Fix**: Match the sensor configuration from the working `ImageSortableGrid`, which uses `delay: 250, tolerance: 8`. A 250ms delay means the user must press and hold for 250ms, after which the drag activates. Any movement > 8px during those 250ms cancels (preventing accidental drags during scroll attempts).

### Bug 2: `PointerSensor` with `distance: 0` is too aggressive for a `<button>` target

From `@dnd-kit/core/dist/core.cjs.development.js` line 1050–1055:

```javascript
function hasExceededDistance(delta, measurement) {
  const dx = Math.abs(delta.x);
  const dy = Math.abs(delta.y);
  if (typeof measurement === 'number') {
    return Math.sqrt(dx ** 2 + dy ** 2) > measurement; // STRICT >
  }
  // ...
}
```

`distance: 0` means the drag activates on ANY movement (delta > 0). Technically correct, but on a `<button>` element this conflicts with click detection: any micro-jitter between `pointerdown` and `pointerup` would activate a drag instead of a click (breaking the button's click role). `distance: 5` gives a clean threshold — a deliberate drag vs a click.

**Note on vaul**: vaul v1.1.2 with `handleOnly={true}` has been confirmed NOT to interfere. `Drawer.Content.onPointerDown` returns immediately (`if (handleOnly) return`), and `Drawer.Content.onPointerMove` also returns immediately. No `setPointerCapture` is called by vaul on the content area. The event path to dnd-kit's document-level `pointermove` listener is clear.

### Bug 3: Contract drift — `upholstery-swap.spec.ts` mocks missing `favorite`/`list_order`

PLAN_29 added `favorite: z.boolean()` and `list_order: z.number().nullable()` as **required** fields to `UpholsteryPickerOptionSchema`. The existing `upholstery-swap.spec.ts` mocks the `/api/v1/upholsteries` route returning objects without these fields. Zod parses the response strictly, so the missing fields cause a runtime validation error (data is `undefined`, UI silently breaks).

**Fix**: Add `favorite: false, list_order: null` to every upholstery object in `upholstery-swap.spec.ts` mock responses.

---

## Acceptance criteria

1. On both desktop and mobile Playwright projects, a simulated drag of the first card's grip handle below the second card produces a reordered list and fires `PATCH /api/v1/upholsteries/{client_id}/list-order` with `{ list_order: 2 }`.
2. `upholstery-swap.spec.ts` passes without errors (no Zod validation failure from missing `favorite`/`list_order`).
3. `npm run typecheck` reports zero errors.
4. The drag handle button no longer cancels immediately on touch — a 250ms press activates drag correctly.

---

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: No cache changes in this plan.
- `architecture/08_hooks.md`: No hook authoring in this plan.
- `architecture/07_components.md`: `UpholsteryDnDCard` is not changed.

### File read intent — relational reads only

The following reads were done to understand existing behavior (not to pattern-match against contracts):

- `UpholsteryReorderSheetPage.tsx` — understand current sensor config and sortable wiring
- `UpholsteryDnDCard.tsx` — understand `dragHandleProps` spread and ref type
- `ImageSortableGrid.tsx` — understand working reference sensor config
- `BottomSheetSurface.tsx` — confirm vaul `handleOnly` does not interfere
- `node_modules/vaul/dist/index.js` — confirm vaul event paths
- `node_modules/@dnd-kit/core/dist/core.cjs.development.js` — confirm `hasExceededDistance` and sensor activation logic

---

## Implementation plan

### Step 1 — Write Playwright diagnostic test (run first to confirm and provide regression coverage)

**File**: `tests/playwright/features/upholstery/upholstery-reorder.spec.ts` (new)

Write a spec that:

1. Mocks `GET **/api/v1/upholsteries**` to return three ordered upholsteries with `favorite`, `list_order`, `in_stock` fields:
   ```json
   [
     { "client_id": "uph_a", "name": "Alpha", "code": "A", "image_url": null, "favorite": false, "list_order": 1, "current_stored_amount_meters": "5.000", "inventory_condition": "available" },
     { "client_id": "uph_b", "name": "Beta",  "code": "B", "image_url": null, "favorite": false, "list_order": 2, "current_stored_amount_meters": "3.000", "inventory_condition": "available" },
     { "client_id": "uph_c", "name": "Gamma", "code": "C", "image_url": null, "favorite": true,  "list_order": 3, "current_stored_amount_meters": "1.000", "inventory_condition": "low_stock" }
   ]
   ```
   Pagination: `{ has_more: false, limit: 50, offset: 0 }`

2. Mocks `PATCH **/api/v1/upholsteries/*/list-order` to record the request body and return:
   ```json
   { "ok": true, "warnings": [], "data": { "upholstery": { ... } } }
   ```

3. Navigates to tasks and locates the upholstery picker trigger (or navigates directly if a test route exists). If no direct route, navigate to a task detail page with upholstery and open the picker. See note below on route.

   > **Route note**: The upholstery picker opens from task item upholstery fields. For isolated testing without a task, reuse the `upholstery-swap.spec.ts` pattern: mock the task detail API and open the picker from `upholstery-field-item_upholstery_1`. The reorder sheet opens from `upholstery-card-reorder-button` within the picker.

4. Opens the picker and waits for `upholstery-picker-body-in_stock` to be visible.

5. Clicks `[data-testid="upholstery-card-reorder-button"]` (first reorder button visible).

6. Waits for `[data-testid="upholstery-reorder-sheet"]` to be visible.

7. Checks the computed CSS of the first drag handle:
   ```typescript
   const handle = page.getByTestId('upholstery-dnd-handle-uph_a');
   const touchAction = await handle.evaluate((el) =>
     window.getComputedStyle(el).touchAction
   );
   // Assert touchAction is 'none' (the button has touch-none Tailwind class)
   expect(touchAction).toBe('none');
   ```

8. Simulates a drag (desktop): moves the first card's grip below the second card:
   ```typescript
   const handleA = page.getByTestId('upholstery-dnd-handle-uph_a');
   const handleB = page.getByTestId('upholstery-dnd-handle-uph_b');
   const boundsA = await handleA.boundingBox();
   const boundsB = await handleB.boundingBox();
   
   const startX = boundsA!.x + boundsA!.width / 2;
   const startY = boundsA!.y + boundsA!.height / 2;
   const endY   = boundsB!.y + boundsB!.height * 1.5; // past center of B
   
   await page.mouse.move(startX, startY);
   await page.mouse.down();
   await page.mouse.move(startX, startY + 10, { steps: 5 }); // small initial move
   await page.mouse.move(startX, endY, { steps: 20 });
   await page.mouse.up();
   ```

9. Asserts: `PATCH .../list-order` was called, request body contains `{ list_order: 2 }`.

10. (Mobile project) Same test using `page.touchscreen.tap()` with a press-hold approach:
    ```typescript
    // Mobile drag: press and hold 300ms, then move
    await handle.dispatchEvent('touchstart', { touches: [{ clientX: cx, clientY: cy }] });
    await page.waitForTimeout(300);
    await handle.dispatchEvent('touchmove', { touches: [{ clientX: cx, clientY: cy - 50 }] });
    await handle.dispatchEvent('touchend');
    ```

    **NOTE**: The mobile drag test will FAIL before the sensor fix in Step 2. This is intentional — the test serves as the regression guard.

**Structure** (write using `expect, test` from `../../fixtures/app-fixture`):
```typescript
test.describe('Upholstery reorder sheet', () => {
  test('drag handle reorders cards and fires list-order PATCH', async ({ page }) => { ... });
  test('touch drag handle activates after 250ms hold', async ({ page }) => { ... }); // mobile project
});
```

---

### Step 2 — Fix sensor configuration in `UpholsteryReorderSheetPage.tsx`

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryReorderSheetPage.tsx`

**Change**: Replace the aggressive zero-threshold sensor config with the stable values from `ImageSortableGrid`.

**Before** (lines 121–133):
```typescript
const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 0,
      tolerance: 4,
    },
  }),
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 0,
    },
  }),
);
```

**After**:
```typescript
const sensors = useSensors(
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 8,
    },
  }),
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  }),
);
```

**Why**: dnd-kit's `handleMove` for a delay constraint cancels the drag (`handleCancel()`) when `hasExceededDistance(delta, tolerance)` returns true before the delay timer fires. With `delay: 0`, the `setTimeout(0)` fires after `touchmove` is processed. Even 4px of initial finger wobble cancels the drag. `delay: 250` gives the user 250ms to establish the press before drag activates; `tolerance: 8` allows 8px of finger stabilization during that hold window. `distance: 5` for `PointerSensor` prevents accidental drag activation on `<button>` click intent.

No other changes to `UpholsteryReorderSheetPage.tsx`.

---

### Step 3 — Fix contract drift in `upholstery-swap.spec.ts`

**File**: `tests/playwright/features/tasks/upholstery-swap.spec.ts`

The mock route at lines 138–169 and 174–204 returns upholstery objects without `favorite` and `list_order`. After PLAN_29, `UpholsteryPickerOptionSchema` requires both. Add the missing fields.

**Change**: In every upholstery object literal in the mock, add:
```typescript
favorite: false,
list_order: null,
```

Specifically:
- Line ~151: `upholstery_old` object in the list mock
- Line ~156: `upholstery_new` object in the list mock
- Lines ~178–190: `upholstery_old` object in the single-get mock
- Lines ~191–198: `upholstery_new` object in the single-get mock

All four objects get `favorite: false, list_order: null` added.

---

### Step 4 — Add `data-testid` to `UpholsteryDnDCard` for the sortable item wrapper (needed for drag-end assertion)

**File**: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryReorderSheetPage.tsx`

The `SortableUpholsteryDnDCard` wrapper div has no `data-testid`. The Playwright assertion for drag success needs to verify that the DOM order of cards changed. Add a `data-testid` to the wrapper div:

**Before**:
```tsx
return (
  <div
    ref={setNodeRef}
    className="select-none"
    style={style}
    onContextMenu={(event) => event.preventDefault()}
  >
```

**After**:
```tsx
return (
  <div
    ref={setNodeRef}
    className="select-none"
    data-testid={`upholstery-sortable-card-${record.client_id}`}
    style={style}
    onContextMenu={(event) => event.preventDefault()}
  >
```

This `data-testid` lets the Playwright test assert on card order after drag.

---

### Step 5 — Update the Playwright diagnostic test to use the new `data-testid` (adjust Step 1 test)

In the test written in Step 1, replace the card-order assertion with:
```typescript
// After drag, card A should be after card B in DOM
const cards = page.locator('[data-testid^="upholstery-sortable-card-"]');
const firstCardId = await cards.first().getAttribute('data-testid');
// After dragging uph_a below uph_b, uph_b should be first
expect(firstCardId).toBe('upholstery-sortable-card-uph_b');
```

---

### Step 6 — Run validation

1. Run `npm run typecheck` inside `apps/managers-app/ManagerBeyo-app-managers`. Expect zero errors.

2. Run the new Playwright spec against desktop project first:
   ```bash
   npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=desktop
   ```
   After Step 2 fix, drag test should pass.

3. Run the existing upholstery-swap spec to confirm no regression:
   ```bash
   npx playwright test tests/playwright/features/tasks/upholstery-swap.spec.ts --project=desktop
   ```
   After Step 3 fix, the spec should pass.

4. Run mobile project for the new spec:
   ```bash
   npx playwright test tests/playwright/features/upholstery/upholstery-reorder.spec.ts --project=mobile
   ```
   The touch-hold test should pass with `delay: 250`.

---

## Risks and mitigations

- **Risk**: `delay: 250` makes the grip feel slow on desktop (pointer sensor also has `distance: 5`). On desktop, pointer drag activates after 5px movement (no delay), which is instant. The 250ms delay only applies to `TouchSensor` (mobile).
  **Mitigation**: None needed — `TouchSensor` and `PointerSensor` are independent. Desktop uses pointer (5px threshold, instant feel). Mobile uses touch (250ms hold). This matches `ImageSortableGrid` which is already established as the correct pattern.

- **Risk**: Playwright mock routes in `upholstery-reorder.spec.ts` use wildcard `**/api/v1/upholsteries/**` which might also catch the favorite and list-order PATCH routes.
  **Mitigation**: Use specific route matchers: one for `GET /api/v1/upholsteries` (list, no trailing `/{id}`), one for `PATCH /api/v1/upholsteries/*/list-order`. Order matchers from most-specific to least-specific.

- **Risk**: The reorder test depends on reaching the upholstery picker via a task detail flow — requires mocking the full task detail API.
  **Mitigation**: Reuse the exact mock pattern from `upholstery-swap.spec.ts` (it already mocks task detail, item, item_upholstery, etc.). The test opens the picker from the same entry point.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npx playwright test --grep "reorder" --project=desktop`: drag test passes, PATCH called with `{ list_order: 2 }`
- `npx playwright test --grep "reorder" --project=mobile`: touch hold test passes
- `npx playwright test tests/playwright/features/tasks/upholstery-swap.spec.ts --project=desktop`: upholstery-swap spec passes (no Zod validation error)

---

## Review log

- `2026-05-27` `david`: Plan authored. Root causes identified via dnd-kit source inspection and vaul source inspection. No clarifications required.

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david` (review) → `copilot` (implementation)
