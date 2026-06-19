# PLAN_realtime_07_upholstery_handler_corrections_20260619

## Metadata

- Plan ID: `PLAN_realtime_07_upholstery_handler_corrections_20260619`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-19T00:00:00Z`
- Last updated at (UTC): `2026-06-19T12:58:04Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_realtime_layer_shared_packages_20260619.md`

## Goal and intent

- Goal: Fix five gaps in PLAN_05's upholstery socket handlers where events are received but the wrong cache keys — or no cache keys at all — are invalidated, causing stale data in the affected surfaces.
- Business/user intent: Every surface that displays upholstery or item-upholstery data updates reactively when a socket event arrives, without a manual page refresh.
- Non-goals: adding new features; changing the backend event payloads; altering query hook implementations.

## Background — what PLAN_05 got wrong

PLAN_05 implemented upholstery socket handlers but produced five reactivity gaps, all caused by cache key mismatches:

| Gap | Root cause |
|---|---|
| `TaskUpholsterySection` (managers) and `TaskStepUpholsterySection` (workers) show stale item-upholstery data | Two `itemUpholsteryKeys` objects exist with different root strings: `"item-upholsteries"` (plural, managers `upholstery_requirements` feature) vs `"item-upholstery"` (singular, `@beyo/tasks` package). PLAN_05 invalidated the plural namespace; `useItemUpholsteryQuery` queries live in the singular namespace. Zero overlap. |
| `PendingUpholsterySlidePage` + `PendingTaskActionsSheetPage` never update | The `"pending-seat-upholstery"` key namespace (`pendingSeatUpholsteryKeys`) is never touched by any handler. |
| `UpholsteryOrderingSlidePage` never updates on requirement state changes | The `"upholstery-ordering"` key namespace (`upholsteryOrderingKeys`) is never touched by any handler. |
| `InventoryListView` shows stale upholstery names after `upholstery:updated` | `upholstery:updated` only invalidates `upholsteryKeys` — not `upholsteryInventoryKeys.lists()`. Inventory list rows embed upholstery names/codes from the upholstery entity. |
| `UpholsteryPickerSlidePage` stock filter tabs don't update after `upholstery:inventory-updated` | `upholstery:inventory-updated` only invalidates `upholsteryInventoryKeys` — not `upholsteryKeys.pickerLists()`. The picker's `in_stock`/`out_of_stock` filter tabs read from `pickerList(params)`. |

## Scope

- In scope:
  - `apps/managers-app/.../features/items/socket-events.ts` — add two missing imports; extend all four `item:upholstery-*` handlers to also invalidate `@beyo/tasks` `itemUpholsteryKeys`, `pendingSeatUpholsteryKeys`, and (for requirement state changes) `upholsteryOrderingKeys`.
  - `apps/managers-app/.../features/upholstery/socket-events.ts` — extend `upholstery:updated` to also invalidate inventory lists; extend `upholstery:inventory-updated` to also invalidate picker lists.
  - `apps/workers-app/.../features/task_steps/socket-events.ts` — add four `item:upholstery-*` handlers that invalidate `@beyo/tasks` `itemUpholsteryKeys.all`.
- Out of scope: new query hooks; registry changes (workers registry already includes `taskStepSocketEvents`); managers registry (already includes `itemSocketEvents`); `@beyo/tasks` barrel changes (already exports `itemUpholsteryKeys`).
- Assumptions:
  - `@beyo/tasks` exports `itemUpholsteryKeys` — confirmed (`export { itemUpholsteryKeys } from "./api/item-upholstery-keys"`).
  - `pendingSeatUpholsteryKeys` is at `@/features/pending-upholstery/api/pending-seat-keys` — confirmed.
  - `upholsteryOrderingKeys` is at `@/features/upholstery-ordering/api/upholstery-ordering-keys` — confirmed.
  - Both apps already depend on `@beyo/tasks` as a peer/workspace dependency.

## Clarifications required

None. All key factory structures confirmed from relational reads.

## Acceptance criteria

1. `TaskUpholsterySection` (managers) and `TaskStepUpholsterySection` (workers) reactively update when `item:upholstery-created`, `item:upholstery-updated`, `item:upholstery-deleted`, or `item:upholstery-requirement-state-changed` arrives.
2. `PendingUpholsterySlidePage` and the pending seat counts update when any `item:upholstery-*` event arrives.
3. `UpholsteryOrderingSlidePage` updates when `item:upholstery-requirement-state-changed` arrives.
4. `InventoryListView` shows updated upholstery names/codes immediately after `upholstery:updated`.
5. `UpholsteryPickerSlidePage` `in_stock`/`out_of_stock` filter tabs update when `upholstery:inventory-updated` arrives.
6. All existing invalidations from PLAN_05 are preserved — only additions, no removals.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/21_realtime.md`: handler pattern, `SocketEventHandlers`, `refetchType: 'active'`.
- `architecture/05_server_state.md`: `invalidateQueries` prefix matching — `queryKey: ['a', 'b']` invalidates all keys starting with `['a', 'b']`.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_realtime_event_catalog_20260619.md`: event payloads (no item ID in `item:upholstery-*` payloads — only `client_id` of the ItemUpholstery entity).

### File read intent — pattern vs. relational

Permitted relational reads (all confirmed — listed for reference only):
- `packages/tasks/src/api/item-upholstery-keys.ts` — `itemUpholsteryKeys.all` = `["item-upholstery"]`; `byItem(itemId)` = `["item-upholstery", "by-item", itemId]`
- `apps/managers-app/.../features/pending-upholstery/api/pending-seat-keys.ts` — `pendingSeatUpholsteryKeys.lists()`, `.counts()`
- `apps/managers-app/.../features/upholstery-ordering/api/upholstery-ordering-keys.ts` — `upholsteryOrderingKeys.needs()` targets `["upholstery-ordering", "needs"]`
- `apps/managers-app/.../features/items/socket-events.ts` — existing handler structure
- `apps/managers-app/.../features/upholstery/socket-events.ts` — existing handler structure
- `apps/workers-app/.../features/task_steps/socket-events.ts` — existing handler structure

### Skill selection

- Primary skill: `verify` / typecheck.
- Trigger terms: `socket, realtime, upholstery, invalidate, stale`.

## Implementation plan

---

### Step 1 — Update managers `features/items/socket-events.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/socket-events.ts`

**1a — Add two new imports** (alongside the existing three imports at the top of the file):

```ts
import { itemUpholsteryKeys as tasksItemUpholsteryKeys } from "@beyo/tasks";
import { pendingSeatUpholsteryKeys } from "@/features/pending-upholstery/api/pending-seat-keys";
import { upholsteryOrderingKeys } from "@/features/upholstery-ordering/api/upholstery-ordering-keys";
```

Keep the existing import of `itemUpholsteryKeys` from `upholstery_requirements` — it is still needed for the managers-specific `"item-upholsteries"` cache namespace.

**1b — Replace the four `item:upholstery-*` handlers with the corrected versions below.** The existing `item:created`, `item:updated`, and `item:deleted` handlers are NOT changed.

```ts
"item:upholstery-created": (_payload, { queryClient }) => {
  // @beyo/tasks namespace — powers TaskUpholsterySection and TaskStepUpholsterySection
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
  // managers upholstery_requirements namespace
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
  // pending seat list + counts — a new selection removes a task from the "missing selection" list
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    refetchType: "active",
  });
},

"item:upholstery-updated": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  // @beyo/tasks namespace — powers TaskUpholsterySection and TaskStepUpholsterySection
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
  // managers upholstery_requirements namespace
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.detail(id),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
  // pending seat list + counts — a swap may affect missing-selection and missing-quantity views
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    refetchType: "active",
  });
},

"item:upholstery-deleted": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  // @beyo/tasks namespace — powers TaskUpholsterySection and TaskStepUpholsterySection
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
  // managers upholstery_requirements namespace
  queryClient.removeQueries({ queryKey: itemUpholsteryKeys.detail(id) });
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.lists(),
    refetchType: "active",
  });
  // pending seat list + counts — deletion re-adds the task to "missing selection"
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    refetchType: "active",
  });
},

"item:upholstery-requirement-state-changed": ({ client_id }, { queryClient }) => {
  const id = client_id as ItemUpholsteryId;

  // @beyo/tasks namespace — powers TaskUpholsterySection and TaskStepUpholsterySection
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
  // managers upholstery_requirements namespace
  queryClient.invalidateQueries({
    queryKey: itemUpholsteryKeys.detail(id),
    refetchType: "active",
  });
  // pending seat list + counts — requirement state change drives missing-quantity view
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: pendingSeatUpholsteryKeys.counts(),
    refetchType: "active",
  });
  // upholstery ordering — requirement state change drives NEEDS_ORDERING appearance
  queryClient.invalidateQueries({
    queryKey: upholsteryOrderingKeys.needs(),
    refetchType: "active",
  });
},
```

**Key note on `tasksItemUpholsteryKeys.all`:** This is the `all` array `["item-upholstery"]` from `@beyo/tasks`. By TanStack Query prefix matching, invalidating this root key matches every query under that namespace — including `byItem(itemId)` (`["item-upholstery", "by-item", itemId]`) which is what `useItemUpholsteryQuery` uses. This broad invalidation is necessary because the `item:upholstery-*` payloads carry only the `ItemUpholstery` entity's `client_id`, not the parent item's ID.

**Key note on `pendingSeatUpholsteryKeys.counts()`:** The pending seat counts query (`["pending-seat-upholstery", "counts"]`) drives the header badge on the pending upholstery surface. It must be invalidated alongside the list on every `item:upholstery-*` event.

**Key note on `upholsteryOrderingKeys.needs()`:** This invalidates `["upholstery-ordering", "needs"]` which by prefix matching covers `needsCount`, `needsLists`, `needsList`, and `needsItems` — all the sub-queries the ordering view uses for the "needs ordering" section.

---

### Step 2 — Update managers `features/upholstery/socket-events.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/socket-events.ts`

**2a — Extend `upholstery:updated` to also invalidate inventory lists.**

Inventory list rows (`InventoryListView`) embed upholstery names and codes. When an upholstery entity's name or code changes, the inventory list must also refetch.

Replace the current `"upholstery:updated"` handler with:

```ts
"upholstery:updated": ({ client_id }, { queryClient }) => {
  const id = client_id as UpholsteryId;

  queryClient.invalidateQueries({
    queryKey: upholsteryKeys.detail(id),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: upholsteryKeys.lists(),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: upholsteryKeys.pickerLists(),
    refetchType: "active",
  });
  // inventory list rows embed upholstery names/codes — must refetch on entity changes
  queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.lists(),
    refetchType: "active",
  });
},
```

**2b — Extend `upholstery:inventory-updated` to also invalidate picker lists.**

The picker's `in_stock`/`out_of_stock` filter tabs read from `pickerList(params)`. When inventory thresholds change and an upholstery crosses the in-stock boundary, the picker must refetch its filter tabs.

Replace the current `"upholstery:inventory-updated"` handler with:

```ts
"upholstery:inventory-updated": ({ client_id }, { queryClient }) => {
  const id = client_id as UpholsteryInventoryId;

  queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.detail(id),
    refetchType: "active",
  });
  queryClient.invalidateQueries({
    queryKey: upholsteryInventoryKeys.lists(),
    refetchType: "active",
  });
  // picker in_stock/out_of_stock filter tabs depend on inventory stock levels
  queryClient.invalidateQueries({
    queryKey: upholsteryKeys.pickerLists(),
    refetchType: "active",
  });
},
```

Do NOT change `upholstery:deleted` or `upholstery:inventory-deleted`.

---

### Step 3 — Add `item:upholstery-*` handlers to workers `features/task_steps/socket-events.ts`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/socket-events.ts`

**3a — Add import:**

```ts
import { itemUpholsteryKeys as tasksItemUpholsteryKeys } from "@beyo/tasks";
```

**3b — Add four handlers to `taskStepSocketEvents`** (after the existing `task:step-state-changed` handler):

```ts
"item:upholstery-created": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
},

"item:upholstery-updated": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
},

"item:upholstery-deleted": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
},

"item:upholstery-requirement-state-changed": (_payload, { queryClient }) => {
  queryClient.invalidateQueries({
    queryKey: tasksItemUpholsteryKeys.all,
    refetchType: "active",
  });
},
```

**Why `_payload` (unused) for all four in workers:** Workers only need to know SOMETHING changed — they don't have item-upholstery detail keys (only `byItem(itemId)`) and the payload carries the `ItemUpholstery` `client_id`, not the item ID. The broad `tasksItemUpholsteryKeys.all` invalidation is both sufficient and correct.

**Why these handlers belong in `task_steps/socket-events.ts`:** The workers surface that displays item-upholstery data is `TaskStepUpholsterySection`, which is part of the task step detail. No other workers feature consumes this data. This is the nearest owning feature.

No registry changes are needed — `taskStepSocketEvents` is already registered in the workers app `socket-registry.ts`.

---

### Step 4 — Typecheck

Run from the monorepo root:

```
npm run typecheck
```

Must pass with zero errors across `apps/managers-app` and `apps/workers-app`. Verify:
- `tasksItemUpholsteryKeys` alias resolves correctly from `@beyo/tasks`.
- `pendingSeatUpholsteryKeys.lists()` and `.counts()` match the key factory signatures.
- `upholsteryOrderingKeys.needs()` matches the key factory signature.

## Risks and mitigations

- Risk: `tasksItemUpholsteryKeys.all` (`["item-upholstery"]`) is a root-level invalidation — it catches all queries under that namespace, including any future sub-keys not yet written.
  Mitigation: Accepted. Without the parent item ID in the socket payload, targeted invalidation by item is impossible. The root invalidation is the correct approach and only refetches active queries (`refetchType: 'active'`).

- Risk: Invalidating `pendingSeatUpholsteryKeys` on every `item:upholstery-*` event may cause over-fetching on the pending seat surface.
  Mitigation: The pending seat page is only active when the user has it open. `refetchType: 'active'` bounds the refetch to mounted queries. The surface is rarely open simultaneously with high-frequency upholstery events.

- Risk: Workers `item:upholstery-*` handlers in `task_steps/socket-events.ts` create a loose coupling between task steps and item upholstery.
  Mitigation: `TaskStepUpholsterySection` is the only workers surface that reads this data. The handler only calls `invalidateQueries` — no business logic. If the workers app grows a dedicated items feature later, the handlers can be migrated without changing the registry.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual test: open `TaskUpholsterySection` in managers; from another session trigger an `item:upholstery-updated` event; confirm the upholstery display updates without refresh.
- Manual test: open `TaskStepUpholsterySection` in workers; from managers update an item's upholstery selection; confirm workers display updates.
- Manual test: open `PendingUpholsterySlidePage`; create or delete an item upholstery from another session; confirm list and badge count update.
- Manual test: open `UpholsteryPickerSlidePage` on the `out_of_stock` tab; trigger an `upholstery:inventory-updated` that moves an upholstery to in-stock; confirm the tab updates.
- Manual test: open `InventoryListView`; rename an upholstery from another session; confirm the inventory list shows the new name.

## Review log

- `2026-06-19` author: initial draft.

## Lifecycle transition

- Current state: `archived`
- Next state: `n/a`
- Transition owner: `Codex`
