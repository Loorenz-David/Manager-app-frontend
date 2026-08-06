# PLAN_item_can_have_upholstery_none_field_20260805

## Metadata

- Plan ID: `PLAN_item_can_have_upholstery_none_field_20260805`
- Status: `under_construction`
- Owner agent: `claude-opus-5`
- Created at (UTC): `2026-08-05T00:00:00Z`
- Last updated at (UTC): `2026-08-05T00:00:00Z`
- Backend handoff consumed: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_can_have_upholstery_flag_20260805.md`
  (revised version, in place as of 2026-08-05 — the stale pre-§4b copy was removed)
- Intention plan: none (small feature, driven directly by the backend handoff)

## Goal and intent

- Goal: let a manager mark a seat item as "does not need upholstery" (`can_have_upholstery: false`)
  from the same control that already picks an upholstery — in the three task-creation forms and on
  `TaskDetailSlidePage` — and let them undo that, all through one shared `ItemUpholsteryField`.
- Business/user intent: not every seat item carries fabric work. Today the pending-upholstery queue
  is category-driven only, so frame-only seats sit in the queue forever. The flag narrows the queue
  (handoff §6) but is invisible until the UI exposes it.
- Non-goals: no changes to upholstery amounts/requirements semantics, no changes to the
  pending-upholstery list UI itself, no migration of the stale managers-app duplicates
  (`apps/managers-app/.../src/features/items/**`, `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx`
  — both dead: surfaces load `loadTaskDetailSlidePage` from `@beyo/tasks`), no role/permission layer.

## Scope

- In scope
  - `ItemUpholsteryField` (`@beyo/upholstery`) gains the split **None / Select upholstery** control.
  - `UpholsteryPickerSlidePage` gains the ability to save a *cleared* selection (`onSelect(null)`),
    which is the only route back from "upholstery selected" to the initial state.
  - Task-creation forms (internal / pre-order / return): the flag rides in the form state and is sent
    on `PUT /api/v1/tasks` as `item.can_have_upholstery`.
  - `TaskDetailSlidePage` / `TaskUpholsterySection`: the same field, persisting via
    `PATCH /api/v1/items/{client_id}` and `DELETE /api/v1/item-upholsteries/{client_id}`.
  - Schema widening for the new response field so strict Zod parsing keeps passing.
- Out of scope: the sellers-app read path (see clarification 1), the pending-upholstery queue's own
  socket invalidation beyond the one-line addition in step 12.
- Assumptions
  - `undefined` (field absent) means **never recorded** and is sent as "omit the key", per handoff §3.
    `null` is explicitly rejected by the backend — the frontend must never send it.
  - An item can only be in the "None" visual state while it has *no* upholstery linked; a linked
    upholstery always wins the render (defensive against inconsistent data).

## Verified facts this plan rests on (read from live source, not assumed)

| Fact | Source |
|---|---|
| `PATCH /api/v1/items/{client_id}` accepts `can_have_upholstery`, roles `ADMIN, MANAGER, SELLER` (**no `WORKER`**) | `backend/app/beyo_manager/routers/api_v1/items.py:341`, `services/commands/items/update_item.py:44` |
| `DELETE /api/v1/item-upholsteries/{client_id}` exists, soft-deletes unconditionally, roles `ADMIN, MANAGER` | `routers/api_v1/item_upholsteries.py:343`, `commands/items/update_and_delete_item_upholstery.py:247` |
| Standalone item responses carry the flag (`_serialize_item_base`) | `domain/items/serializers.py:112` |
| **Embedded** item responses now carry it too (`serialize_item`) → `taskDetail.item.can_have_upholstery` is available | `domain/tasks/serializers.py:113` — verified, resolves the original clarification 1 |
| Worker-light item shape (`serialize_item_worker_light`) deliberately omits it | handoff §4c — affects workers-app step cards, out of scope here |
| `PUT /api/v1/tasks` passes `item.can_have_upholstery` straight through to item creation | `routers/api_v1/tasks.py:114`, `commands/tasks/create_task.py:217`, `commands/items/_create_item_in_session.py:126` |
| `PATCH /items/{id}` dispatches `item:updated`; the managers-app handler does **not** invalidate the pending-seat queue | `commands/items/update_item.py:119`, `apps/managers-app/.../features/items/socket-events.ts:20` |
| `TaskDetailSlidePage` is registered by managers, sellers **and** workers apps | `apps/*/src/features/*/surfaces.ts` |

## Clarifications

- [x] **1. Where does the detail page read the flag from?** ~~Task payloads don't carry it.~~
      **Resolved 2026-08-05** — `domain/tasks/serializers.py::serialize_item` now emits
      `can_have_upholstery`, so `taskDetail.item.can_have_upholstery` is authoritative. No extra
      `GET /items/{id}` query, no backend handoff needed; the detail half is unblocked.
- [x] **4. `PUT /api/v1/tasks` passthrough.** **Resolved** — verified end to end:
      `routers/api_v1/tasks.py:114` (`can_have_upholstery: bool = True` on the embedded item body)
      → `create_task.py:217` → `_create_item_in_session.py:126`.
- [x] **5. Pending-upholstery invalidation on `item:updated`.** **Confirmed by David** — do it (step 12).
- [x] **2. Roles.** **Decided by David** — a worker must not see the None control at all; workers
      cannot edit upholstery. Implemented via a role gate, not a host prop (step 11a): no
      `onCanHaveUpholsteryChange` is passed for workers, and the capability-by-callback rule already in
      the design makes the segment disappear. Sellers keep it — they were added to `PATCH /items`.
      **Extra, flagged:** the same gate also disables the upholstery *picker* for workers on the detail
      page. That is a pre-existing bug being fixed in passing (workers can already open a picker whose
      save 403s, since every item-upholstery write route is `ADMIN`/`MANAGER`), not part of the original
      ask — say if you'd rather keep the picker as-is and gate only the None segment.
- [x] **3. Deselect semantics.** **Decided by David** — yes, an `ordered`/`in_use` requirement goes
      with the link. The intended sequence is: deselect the upholstery first (that is what drives the
      inventory release), *then* mark `can_have_upholstery = false`. The field design already enforces
      that order for free: the None segment only renders while no upholstery is linked, so the flag
      cannot be flipped out from under a live requirement. **But see the blocker below** — the delete
      endpoint does not currently perform that inventory release.

## Blocker found while verifying clarification 3

The "deselect first, which initiates the backend inventory management" flow **does not hold for the
delete path today**:

| Path | Requirement handling | Source |
|---|---|---|
| Swap (`PATCH /item-upholsteries/{id}` with a new `upholstery_id`) | calls `cancel_requirements_in_session` → `adjust_need` / `rollback_in_use_to_stored`, i.e. reserved meters return to stock; raises `ConflictError` if the requirement is `COMPLETED` | `commands/items/update_and_delete_item_upholstery.py:159` |
| Delete task | calls `cancel_unfinished_item_requirements_in_session` | `commands/tasks/delete_task.py:16` |
| **Delete link (`DELETE /item-upholsteries/{id}`)** | **no cancellation at all** — soft-deletes the `ItemUpholstery`, writes history, dispatches events, and leaves the active requirement untouched | `commands/items/update_and_delete_item_upholstery.py:247-300` |

So removing an upholstery whose requirement is `needs_ordering`/`ordered`/`in_use` orphans that
requirement: its meters stay counted as need or in-use inventory forever, with no link back to an item.
The fix is backend-side and mirrors code that already exists — cancel the row's unfinished requirements
inside `delete_item_upholstery` before the soft delete, exactly as the swap path does.

- [x] **6. Backend handoff for the delete path** — **written 2026-08-05**:
      `docs/handoff/to_backend/HANDOFF_TO_BACKEND_delete_item_upholstery_cancels_requirements_20260805.md`
      (David is implementing it). It carries two questions back for backend to answer: whether delete
      should 409 on a `COMPLETED` requirement like swap does, and whether `ordered` deserves a
      confirmation step. Until it lands, deselecting an upholstery that has a live requirement leaks
      inventory. Interim options if you want to ship the frontend first: (a) ship anyway and accept the
      leak for the `ordered`/`in_use` cases, (b) disable deselect while the active requirement is not
      `missing_quantity`/`available`/`failed` — safe but blocks exactly the flow you described, or
      (c) hold the deselect half of the detail page until backend lands. **Recommend (c) for the detail
      page while shipping the creation forms**, since nothing in the creation forms can orphan a
      requirement (no requirement exists yet at submit time).

## Design

### Field states (one control, three renders)

| # | Condition | Render |
|---|---|---|
| 1 | `value != null` | today's full-width row: thumbnail, name, code, chevron. **No None segment.** |
| 2 | `value == null && canHaveUpholstery === false` | split: left `None` **active** (`bg-primary text-card`), right `No upholstery` + chevron (screenshot 1) |
| 3 | `value == null && canHaveUpholstery !== false` | split: left `None` **inactive** (`text-muted-foreground`, hairline divider), right `Select upholstery` + chevron (screenshot 2) |

Interactions:

| Gesture | Emits |
|---|---|
| Right segment (states 2 & 3) | opens the picker, as today |
| `None` in state 3 | `onCanHaveUpholsteryChange(false)` |
| `None` in state 2 | `onCanHaveUpholsteryChange(null)` — "back to never recorded" |
| Picker saves an id | `onChange(id)` **and** `onCanHaveUpholsteryChange(true)` |
| Picker saves a cleared selection | `onChange(null)` **and** `onCanHaveUpholsteryChange(null)` |

The component emits `boolean \| null` and stays dumb about persistence; each host maps `null`:
creation forms → `undefined` (key omitted from the payload); detail page → `true` (the column is
non-nullable, so `true` is the only way back — handoff §3).

### Markup note (not cosmetic)

The current component is a single `<button>` wrapping everything. States 2 & 3 need **two** buttons,
so the split render must be a `<div>` container with two sibling `<button>`s — nesting buttons is
invalid HTML and breaks the picker tap on iOS. State 1 keeps the single full-width button. The
`requirementState` pill stays absolutely positioned on the container in all three states.
`rounded-xl overflow-hidden` on the container is what rounds the active None block's left corners.

### API surface

```ts
type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (value: string | null) => void;          // widened: null clears
  canHaveUpholstery?: boolean | null;                 // undefined/null = never recorded
  onCanHaveUpholsteryChange?: (next: boolean | null) => void;
  placeholder?: string;
  requirementState?: UpholsteryRequirementState | null;
  disabled?: boolean;
  testId?: string;
};
```

The None segment renders **only when `onCanHaveUpholsteryChange` is provided**. That keeps every
existing caller (including the legacy managers-app testing form) rendering exactly as today, with no
`showNone` boolean to keep in sync — and it is what makes the worker role gate a one-line condition
rather than new prop plumbing.

### Role gate (clarification 2)

Mirrors the backend routes exactly, in a `use-item-upholstery-permissions` hook following the existing
`use-presentation-builder-permissions` / `use-shopify-integration-permissions` pattern
(`@beyo/auth`'s `useRole` + `AuthRole`; `@beyo/tasks` already depends on `@beyo/auth`):

| Capability | Roles | Backend route it mirrors |
|---|---|---|
| `canEditUpholsteryFlag` — renders the None segment | `admin`, `manager`, `seller` | `PATCH /api/v1/items/{client_id}` |
| `canEditUpholsteryLink` — enables the picker / create / swap / remove | `admin`, `manager` | `PUT`/`PATCH`/`DELETE /api/v1/item-upholsteries` |

A worker therefore sees the upholstery section read-only: no None segment, no picker. This is
package-level and app-agnostic, so the three host apps need no changes.

## File manifest

### Existing files to edit

| Path | Change summary |
|---|---|
| `packages/upholstery/src/components/ItemUpholsteryField.tsx` | Split None/Select control, three-state render, widened `onChange`, flag props, split-render uses sibling buttons |
| `packages/upholstery/src/components/ItemUpholsteryField.test.tsx` | Cases: none-inactive, none-active labels; None press emits `false` / `null`; picker `onSelect(null)` clears both; no None segment without the callback |
| `packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx` | `onSelect?: (clientId: string \| null) => void`; save button shows whenever staged ≠ current (incl. cleared); label `Remove upholstery` when cleared; skip `selectUpholstery` on null |
| `packages/upholstery/src/pages/UpholsteryPickerSlidePage.test.tsx` | Deselect → save → `onSelect(null)` |
| `packages/items/src/types.ts` | `ItemDetailsFieldsSchema` += `can_have_upholstery: z.boolean().optional()`; `UpdateItemInput` += `can_have_upholstery?: boolean` |
| `packages/items/src/index.ts` | Export `deleteItemUpholstery` |
| `packages/task-creation/src/components/InternalFormContent.tsx` | Drop the local `UpholsteryField` wrapper, render `<UpholsteryFieldGroup />` |
| `packages/task-creation/src/components/ReturnFormContent.tsx` | Same |
| `packages/task-creation/src/components/PreOrderFormContent.tsx` | Same |
| `packages/task-creation/src/lib/normalize-task-form-payload.ts` | Pass the flag through `buildItemFields` (omit when `undefined`); `buildUpholsteryFields` returns `undefined` when the flag is `false`; count the flag in `hasAnyItemData` |
| `packages/task-creation/src/lib/normalize-task-form-payload.test.ts` | Flag omitted / `false` / `true` cases + "no upholstery section when flag is false" |
| `packages/tasks/src/types.ts` | `TaskDetailRawSchema.item` and `TaskListItemRawSchema.primary_item` += `can_have_upholstery: z.boolean().optional()` (optional, not required: the field is now always sent on these paths, but `undefined ⇒ treated as true` costs nothing and keeps any unmigrated fixture/mock parsing) |
| `packages/tasks/src/components/detail/TaskUpholsterySection.tsx` | New props `canHaveUpholstery`, `onCanHaveUpholsteryChange`, `onRemove`; render-prop input widened; suppress "No upholstery linked yet." when the flag is `false` |
| `packages/tasks/src/pages/TaskDetailSlidePage.tsx` | Wire the flag from `taskDetail.item`, `updateItem` for the toggle, delete mutation for clearing |
| `packages/tasks/src/index.ts` | Export the new delete action if a host needs it |
| `apps/managers-app/.../src/features/items/socket-events.ts` | `item:updated` also invalidates `pendingSeatUpholsteryKeys.lists()/counts()` — flipping the flag changes queue membership (handoff §6) |

### New files to create

| Path |
|---|
| `packages/items/src/api/delete-item-upholstery.ts` |
| `packages/task-creation/src/components/UpholsteryFieldGroup.tsx` |
| `packages/tasks/src/actions/use-delete-item-upholstery.ts` |
| `packages/tasks/src/lib/use-item-upholstery-permissions.ts` |
| `packages/tasks/src/lib/use-item-upholstery-permissions.test.ts` |
| `packages/tasks/src/components/detail/TaskUpholsterySection.test.tsx` |
| ~~`docs/handoff/to_backend/HANDOFF_TO_BACKEND_delete_item_upholstery_cancels_requirements_20260805.md`~~ — written 2026-08-05 |

## Implementation plan

1. **`ItemUpholsteryField`** — add the props above; derive
   `hasSelection = value != null`, `isNone = !hasSelection && canHaveUpholstery === false`,
   `showNoneSegment = !hasSelection && Boolean(onCanHaveUpholsteryChange)`. Extract the existing body
   into a `renderSelection()` helper so state 1 is untouched. Split render = container `div`
   (`flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-card`) + None button
   (`px-4 py-3 text-sm`, active `bg-primary text-card`, inactive `text-muted-foreground border-r border-border`,
   `aria-pressed={isNone}`) + right button (`flex flex-1 items-center justify-between gap-3 px-4 py-3`).
   Right label: `isNone ? "No upholstery" : placeholder`.
2. **Picker open handler** — `onSelect` becomes an internal callback that fans out:
   `id → onChange(id); onCanHaveUpholsteryChange?.(true)`, `null → onChange(null); onCanHaveUpholsteryChange?.(null)`.
   Note the existing test asserts `open()` is called with `{ currentClientId, onSelect: handleChange }` —
   it must be updated to assert the wrapped callback's *behavior*, not identity.
3. **`UpholsteryPickerSlidePage`** — `shouldShowSaveButton = stagedClientId !== (currentClientId ?? null)`;
   in `handleSaveSelection`, when `stagedClientId === null` skip `controller.selectUpholstery`, close,
   and `scheduleListCommit(() => onSelect?.(null))`. Button label switches to `Remove upholstery`.
4. **`@beyo/items`** — schema/type widening; new `deleteItemUpholstery(clientId)` calling
   `apiClient.delete('/api/v1/item-upholsteries/{id}')` with an `ApiEnvelopeSchema` mirroring
   `update-item-upholstery.ts`; export it.
5. **`UpholsteryFieldGroup`** (new, `@beyo/task-creation`) — replaces three byte-identical local
   wrappers. Uses `useFormContext()` (all three forms already sit in a `FormProvider`; the amount
   field does the same) and `useController` on `item_upholstery.upholstery_client_id` and
   `item.can_have_upholstery`. Renders `<ItemUpholsteryField />` plus `<ItemUpholsteryAmountField />`,
   **hiding the amount field while `isNone`**. Handlers:
   - `onCanHaveUpholsteryChange(false)` → flag `false`, clear id, clear amount
   - `onCanHaveUpholsteryChange(null)` → flag `undefined`
   - `onCanHaveUpholsteryChange(true)` → flag `true`
   - `onChange(null)` → clear id **and** amount, flag `undefined`
   Takes `quantity` as a prop for the amount field.
6. **Three form contents** — delete the local `UpholsteryField` function and the
   `ItemUpholsteryField`/`ItemUpholsteryAmountField` imports; render
   `<UpholsteryFieldGroup quantity={itemQuantity ?? 0} />` inside the existing seat-gated
   `ContentCard`. Add `"item.can_have_upholstery"` to each `*_STEP_FIELDS_MAP.item` array.
   `defaultValues`/`form.reset` need no new key (absent ⇒ `undefined` ⇒ never recorded), and the
   pre-order/return default-value builders stay untouched.
7. **`normalize-task-form-payload`** — `buildItemFields` spreads
   `...(item.can_have_upholstery === undefined ? {} : { can_have_upholstery: item.can_have_upholstery })`;
   `hasAnyItemData` also counts `item.can_have_upholstery !== undefined`;
   `buildUpholsteryFields` takes the flag and returns `undefined` when it is `false` (guards the
   existing "amount set but no id still emits a section" path).
8. **`@beyo/tasks` schemas** — add the optional boolean to both item schemas so nothing breaks when
   the backend starts sending it (and so `useUpdateItem`'s optimistic merge type-checks).
9. **`use-delete-item-upholstery`** — mutation mirroring `use-update-item-upholstery`: invalidate
   `itemUpholsteryKeys.byItem(itemId)`, `taskKeys.detail(taskId)`, `taskKeys.lists()`.
10. **`TaskUpholsterySection`** — accept `canHaveUpholstery` + `onCanHaveUpholsteryChange` + `onRemove`;
    widen `UpholsteryFieldRenderInput` (`onChange: (id: string | null) => void`, plus the flag pair);
    pass them through both branches; suppress the "No upholstery linked yet." paragraph when the flag
    is `false`; in the linked branch, `onChange(null)` → `onRemove(entry.client_id)`.
11. **`TaskDetailSlidePage`** — read `controller.taskDetail.item.can_have_upholstery`; pass
    `onCanHaveUpholsteryChange={(next) => controller.updateItem.mutate({ id: itemId, can_have_upholstery: next ?? true })}`
    (`null → true`, the only legal way back); `onRemove` → the new delete mutation; on `onCreate`/`onUpdate`,
    also PATCH `can_have_upholstery: true` **only when it is currently `false`** (avoids a redundant write).
    `useUpdateItem` already snapshots + rolls back, so the toggle is optimistic for free.
11a. **Role gate** — new `use-item-upholstery-permissions` hook (table in the Design section). In
    `TaskDetailSlidePage`: pass `onCanHaveUpholsteryChange` **only** when `canEditUpholsteryFlag`
    (workers get no None segment at all), and pass `disabled` on the field when `!canEditUpholsteryLink`
    (workers get no picker either — see the flagged note in clarification 2). Unit-test the hook by
    mocking `@beyo/auth` the way `use-shopify-integration-permissions.test.ts` already does.
12. **Managers-app socket** (confirmed by David) — extend `item:updated` to invalidate
    `pendingSeatUpholsteryKeys.lists()` and `.counts()`; without it the queue keeps showing a task
    whose item just opted out (handoff §6). Mirror the invalidation shape already used by the
    `item:upholstery-created` handler in the same file (`refetchType: "active"`).
13. **Backend handoff** — `HANDOFF_TO_BACKEND_delete_item_upholstery_cancels_requirements_20260805.md`:
    ask for `delete_item_upholstery` to cancel the row's unfinished requirements before soft-deleting,
    reusing `cancel_requirements_in_session` the way the swap path at line 159 of the same file already
    does. Include the leak scenario and the `COMPLETED` question (the swap path raises `ConflictError`
    there; delete should probably do the same rather than silently dropping a finished requirement).
14. **No extra ordering guard is needed** — because the None segment only exists while `value == null`,
    the user must go through the picker's *Remove upholstery* (the step that releases inventory) before
    the flag can be set to `false`. The render rules enforce David's intended sequence for free.

## Risks and mitigations

- ~~Risk: the detail page shows None, then silently reverts after the next refetch.~~ Retired — the
  embedded serializer now carries the flag.
- Risk: deselecting an upholstery with a live (`needs_ordering`/`ordered`/`in_use`) requirement orphans
  it — `delete_item_upholstery` performs no cancellation, so the reserved meters never return to stock.
  Mitigation: clarification 6 / step 13 (backend fix); until then, ship the creation forms and hold the
  detail-page deselect, or accept the leak knowingly.
- Risk: an amount is entered, then None is selected → the old `buildUpholsteryFields` would still emit
  an `item_upholstery` section with no upholstery id.
  Mitigation: step 7's flag guard plus the amount clear in step 5.
- Risk: nested `<button>` in the split state breaks taps.
  Mitigation: explicit markup rule in the design section; test asserts two `role="button"` nodes.
- Risk: widening `onChange` to `string | null` ripples into the stale managers-app duplicates.
  Mitigation: those files import their own local `ItemUpholsteryField` from `@/features/items`, not the
  package — verified; they are unreachable dead code and stay untouched. Typecheck confirms.
- ~~Risk: workers see a control that 403s.~~ Retired — step 11a's role gate hides the None segment and
  disables the picker for workers, mirroring the backend route roles exactly.
- Risk: the role gate drifts from the backend routes if backend later adds/removes a role (as just
  happened with `SELLER` on `PATCH /items`).
  Mitigation: the permissions hook keeps both capabilities in one small file with the route each mirrors
  named in a comment, so the drift is a one-line fix in one place.
- Risk: someone later assumes the flag is on *every* item payload. It is not — the worker-light shape
  (`serialize_item_worker_light`, used by the workers-app step endpoints) omits it by design (handoff §4c).
  Mitigation: do not add it to the workers-app step schemas; treat "seat item needs upholstery?" on the
  worker step card as a separate product decision.

## Validation plan

- `npm run typecheck` (root): zero errors.
- `npm run test -w packages/upholstery`: existing 29+ pass, new field/picker cases pass.
- `npm run test -w packages/task-creation -- normalize-task-form-payload`: new flag cases pass.
- `npm run test -w packages/tasks -- TaskUpholsterySection use-item-upholstery-permissions`: new suites pass.
- Runtime (user-driven, per the dev-server rule — I will not start servers):
  1. Internal form, seat category → None inactive + "Select upholstery"; tap None → dark + "No upholstery";
     submit → request body has `item.can_have_upholstery: false` and **no** `item_upholstery`.
  2. Same form, tap None twice → key absent from the payload entirely.
  3. Pick an upholstery → full row, `can_have_upholstery: true` in the payload.
  4. Task detail, seat item → toggle None → `PATCH /items/{id} {can_have_upholstery:false}`; reopen the
     task; state persists (the task-detail payload now echoes the flag).
  5. Task detail with a linked upholstery → open picker → deselect → Remove upholstery → link deleted,
     field back to None-inactive + "Select upholstery".
  6. Managers pending-upholstery queue drops the task after step 4 without a manual reload.
  7. Same seat task opened in the **workers** app → upholstery section shows the current selection
     read-only: no None segment, picker not tappable. Sellers app → both available.

## Implementation status — 2026-08-05

**Implemented in full.** Every step 1–14 landed, plus one addition found during implementation:
`ItemUpholsteryField` needed a separate `selectionDisabled` prop, because a seller may edit the flag
(`PATCH /items` includes SELLER) but not the link (item-upholstery routes do not) — one `disabled` prop
could not express both.

Validation:

- `npm run typecheck` — clean across all five apps and every package.
- `vitest`: upholstery 48 pass (17 in the field suite, 6 in the picker suite), tasks 68 pass (new
  permissions + section suites), task-creation 100 pass.
- Playwright `upholstery-swap.spec.ts` — **green on desktop and mobile**, exercising the real field,
  the picker, the staged save and the resulting PATCH.
- `upholstery-reorder.spec.ts` remains red for pre-existing reasons unrelated to this plan; the
  investigation, the four stale-mock fields and the fast way to diagnose it are written up in
  `docs/debugging/DEBUG_20260805_stale_upholstery_e2e_mocks.md`.

Runtime spot-checks of the None flow itself (creation forms, detail toggle, worker read-only view) are
still worth a manual pass — see the Validation plan list below.

## Review log

- `2026-08-05` `claude-opus-5`: plan drafted, awaiting review.
- `2026-08-05` `David`: revised backend handoff — embedded `serialize_item` now carries the flag,
  `SELLER` added to `PATCH /items`, pending-upholstery invalidation approved.
- `2026-08-05` `claude-opus-5`: clarifications 1, 4, 5 closed against live backend source; clarification 2
  narrowed to the workers app only; backend handoff step and its new-file row removed. 2 and 3 still open.
- `2026-08-05` `David`: clarification 3 decided — deselect first (that drives the inventory release),
  then set the flag; an `ordered`/`in_use` requirement goes with the deleted link.
- `2026-08-05` `David`: backend delete fix merged (verified: `delete_item_upholstery` now cancels the
  active requirement and raises `ConflictError` on `COMPLETED`); clarification 2 answered (workers see
  nothing); implement the plan in full.
- `2026-08-05` `claude-opus-5`: implemented — see "Implementation status" above.
- `2026-08-05` `claude-opus-5`: verifying that decision against source surfaced a real gap —
  `delete_item_upholstery` performs **no** requirement cancellation (unlike the swap path and
  `delete_task`), so the release David expects does not happen. New clarification 6 + step 13 + risk
  entry. Open: 2 (workers parity) and 6 (backend delete fix).
- `2026-08-05` `David`: clarification 2 decided — workers must not see the control at all.
- `2026-08-05` `claude-opus-5`: backend handoff written (clarification 6 closed on the frontend side,
  backend implementation pending); role gate added as step 11a + a new permissions hook. **All
  clarifications closed** — the plan is ready to implement, with the detail-page deselect held until
  the backend delete fix lands.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` — no clarification blocks implementation; the only external dependency is the
  backend delete fix, which gates the detail-page *deselect* only.
- Transition owner: `David`
