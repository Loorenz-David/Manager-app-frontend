# Intention: Stock Report — shared frontend package for managers, sellers and workers

## Status — RATIFIED (round 7, 2026-09-21, by the owner) — no owner decision open

- Shaped from `planning/raw_intention.md` (owner draft) by the intention-shaper session, 2026-09-21.
- **Ratified by the owner (David) on 2026-09-21** — see §15 round 7. This document is the authority
  for product semantics. Items still marked *(proposal)* were presented on the ratification surface,
  left unstruck, and ship as written. A material semantic change re-opens the gate.
- Downstream gate: only a `RATIFIED` header may enter mechanism-inventory or planning.

---

## ⚠ OWNER DECISIONS REQUIRED (0)

None open. Cards 1–11 are answered and recorded in §14 with their round.

---

## 1. Objective and hard constraints

**Outcome (owner's words):** allow managers, workers and sellers to understand stock requests so
that they can act accordingly on the production line (restoration work).

Concretely, one shared package gives all three apps the same two screens:

1. **The board** — stock report instances, one priority bucket at a time. Managers and sellers triage
   (assign a priority) and sequence (drag order within a priority). Workers read it.
2. **The instance detail** — one instance's goal and progress, the tasks assigned to fulfil it, and
   (managers, workers) a way to add an assignment by creating a new internal task.

**Vocabulary (owner):**
- *Stock report instance* — one request to restore a quantity of a category of item with certain
  properties. Backend: `StockReportItem`. Exists only because Scanner asked for it.
- *Item assignment* — a task's primary item registered against an instance. Backend:
  `StockTaskAssignment`.

**Hard constraints**

- **HC-1 One package, three consumers.** New `@beyo/stock-report` under `packages/`, following
  `architecture/35_shared_packages.md` exactly (source package, peers only, loaders for pages,
  never calls `openSurface`). The three apps differ **only** by what the role permits.
- **HC-2 Built against a handoff, not a server.** The API authority is
  `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_v2_20260921.md` (**current since the
  2026-09-21 evening amendment** — it supersedes `..._api_20260921.md`, now in `archived/`) plus, for
  the compatibility check, `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_match_preview_v2_20260921.md`.
  The frontend is built as if both were live, honouring v2's two tiers: VERIFIED is read from shipping
  code; SPECIFIED is pinned by a backend criterion row — build against it, a divergence is a backend
  defect. Nullability stays nullish until the re-verified final handoff (§8.1).
- **HC-3 The mockup is customer-confirmed.** `ui_design_documentation/` is the visual authority.
  Deviations are only those listed in §6.3, each with a reason.
- **HC-4 The backend's role matrix is the permission truth** (§5). The UI hides what a role cannot
  do; it never relies on hiding for safety (the server refuses, and a 403 is handled).
- **HC-5 Two sessions, UI first (owner).** A Claude session builds the presentational UI; a Codex
  session then builds types, API, actions, controllers and wires them. §12 defines the seam. This
  inverts `16_feature_workflow.md`'s bottom-up order by owner direction.
- **HC-6 Parallel build, one human.** The backend agent and this project trust the owner's handoffs;
  neither waits on the other. The compatibility-check endpoint (§8.5) is the backend's, delivered by
  the owner as the match-preview v2 handoff (round 5).

---

## 2. Grounding — verified in the repo 2026-09-21

### 2.1 Apps and navigation
- Apps: `apps/managers-app/ManagerBeyo-app-managers`, `apps/workers-app/ManagerBeyo-app-workers`,
  `apps/selleres-app/ManagerBeyo-app-sellers` — structurally identical shells.
- **"More" is a popup, not a page** (`src/components/shell/MoreTabsPopup.tsx`). A More entry is a
  full tab rendered as a `SlideStackPane`. Adding one is six edits per app: `src/lib/routes.ts`
  (`ROUTES`, `TAB_ORDER`, `MORE_TABS`), `src/app/router.tsx` (`TAB_ROUTES`),
  `src/lib/primary-tab-preload.ts`, `BottomTabBar.tsx` (`TABS`, `MORE_TAB_META`),
  `MoreTabsPopup.tsx` (`MORE_TAB_META`), and a thin `src/pages/<x>/XPage.tsx`.
- Package pages are consumed as `loadXRouteEntryPage()` loaders wrapped in `lazy` + `Suspense`
  (`pages/tasks/TasksPage.tsx`); app chrome such as a FAB is rendered by the app as a sibling.
- Surfaces: packages export ids, prop types and loaders; apps register them
  (`src/app/surface-registry.ts`) and are the only callers of `openSurface` for injected openers
  (`35_shared_packages.md §13`). Slides render via `SlidePageSurface`, sheets via
  `BottomSheetSurface`.

### 2.2 Roles
- `@beyo/auth` `roles.ts`: `AuthRole = admin | manager | worker | seller`;
  `WorkspaceSpecialization = wood_worker | upholstery_worker | quality_control`. `useRole()` returns
  `{ role, workspaceSpecialization, hasRole, hasSpecialization }`. There is no `@beyo/permissions`.

### 2.3 Building blocks that exist
- `BoxSlidePicker` and `SearchBar` (`packages/ui/.../primitives/`); `SearchBar` hides sort with
  `showSortButton={false}` and already supports `activeFilterCount`.
- **No FAB primitive exists.** `TaskCreationFab.tsx` is hand-rolled (framer-motion), prop-less, and
  duplicated in managers and sellers. Workers have no FAB.
- `@dnd-kit/core|sortable|utilities` are installed in managers and workers and used by three
  packages (`images`, `upholstery`, `shopify`). **The sellers app does not declare them.**
- `TaskListCard` (`@beyo/tasks`) is a pure presentational component taking flat `task` / `item` /
  `imageUrl` props plus `onTapCard`, `onTapImage`, `onTapActions`, `bottomAction`, `statePill`,
  `dateDisplay`, `typeIcon`. Usable from another package.
- TasksView's three openers: body → `TASK_DETAIL_SURFACE_ID {taskId}`; ⋮ →
  `TASK_ACTIONS_SHEET_SURFACE_ID {taskId, itemId}`; image → `IMAGE_VIEWER_SURFACE_ID` (from
  `@beyo/images`). Managers and sellers register all three. **Workers register only the image
  viewer** — no task detail, no actions sheet. Owner, round 2: they get registered (§7).
- Task creation: `InternalTaskSlidePage` accepts `callbacks.onTaskCreated({result, hadUpholstery})`;
  `WorkerInternalTaskSlidePage` accepts **no callbacks and discards the mutation result**. The
  create response carries `client_id` (task) and `item_id`. Both forms close themselves on success.
  Neither has a "mode". Item lookup is `GET /api/v1/items/lookup` via `useItemLookupQuery`, applied
  in `handleLookupResult`, which sets the item's category and properties.

### 2.4 Gaps found
- Snapshots (owner, round 2): `ui_design_documentation/snapshot/stock_report_cards.png` and
  `snapshot/stock_report_detail_page_header.png` (folder is `snapshot`, singular). With the eight
  documents they are the visual authority. The detail snapshot's back-arrow bar is **not** built —
  the slide surface's own header is used (owner).
- Item categories carry a picture as `image_url`, rendered with `BackendImage` + `ImagePlaceholder`
  (`packages/item-categories`); there is no separate "icon" field. The stock report row's nested
  category has no `image_url` today (card 10).
- The mockup's sort button, whole-card drag, inert ⋮ and undefined Add-item destination are all
  overridden by the owner's draft (§6.3).

---

## 3. Core workflow

```
More menu → Board (bucket = one priority)
   ├─ switch bucket ─────────────► new list query
   ├─ tap card ──────────────────► Instance detail (slide)
   └─ FAB → "Reorganise"  [manager · seller · admin]
        ├─ drag handle ──────────► PATCH priority-order   (not in Unset)
        └─ "Set priority" button ─► sheet → PATCH priority

Instance detail
   ├─ task card: body / image / ⋮ ► task detail / picture viewer / this page's own ⋮ menu
   ├─ ⋮ → Remove from stock need ► POST assignments/delete
   └─ "Add item"  [manager · admin · wood worker]
        └─ internal task form in stock-assignment mode
             ├─ item found by lookup ► compatibility check (§8.5, owner's endpoint)
             │      category mismatch → blocked · property mismatch → warn, confirm
             ├─ submit ──────────► create task  →  on success  →  create assignment
             └─ success ─────────► "Add another" | "Done"
```

---

## 4. Domain model (frontend view)

The frontend **owns no stock-report facts.** Everything is read from the backend; the only values
the frontend writes are the two user-owned fields and the assignment create/delete requests.

### 4.1 Stock report instance
| Field | Writer | Frontend use |
|---|---|---|
| `client_id` | backend | identity, path parameter |
| `item_category {client_id, name, major_category, image_url}` | Scanner | `name` = card title and detail page title. The type icon is the **category's own picture** (owner, round 2), matched by category id — read from `item_category.image_url` in the row itself (owner, card 10 → A: assumed present in the payload — the owner is arranging it with the backend); rendered with `BackendImage`, `ImagePlaceholder` when null |
| `properties` — `Record<string, string[] \| null>`, Scanner **criteria** | Scanner | property tags, rendered from what the backend sent and nothing else (owner); label text: **one tag per key, its values joined with " / " and capitalised ("Dark / Teak"); a key whose value list is null produces no tag** (owner, card 2 → A); keys in the order received. Never compared with an item's properties on the client — matching is the backend's alone |
| `properties_signature` | backend | unused by UI; never computed client-side |
| `quantity_requested` | Scanner only | the big number ("pc") |
| `quantity_in_queue`, `quantity_in_progress`, `quantity_awaiting` | backend only | bar inputs (card 1) |
| `priority` — `high \| medium \| low \| null` | **user** (manager, seller, admin) | bucket membership |
| `priority_order` — `1..n` dense within a priority, null iff priority null | backend, from user moves | list order |
| `created_at`, `updated_at`, `created_by_id`, `updated_by_id` | backend | not displayed |

### 4.2 Assignment
`client_id`, `state` (`in_queue | in_progress | awaiting | resolved | failed | resolved_early`),
`stock_report_item_id`, `task_id`, `item_id`, `quantity` (copied at creation, never changes),
`property_mismatch_overridden`, nested `item` (`article_number`, `sku`, `quantity`,
`item_category_snapshot`, `item_major_category_snapshot`, `item_images[]`) and nested compact `task`
(twelve names per handoff §8 #3). All backend-written. The nested shapes supply every field
`TaskListCard` requires; `is_overdue` is absent and is left unset, not invented.

### 4.3 Derived on the client, never stored, never sent
- **Bar mapping (owner, card 1 → A):** `fulfilled = quantity_awaiting`;
  `inProgress = quantity_in_queue + quantity_in_progress`;
  `remaining = max(0, quantity_requested − fulfilled − inProgress)`.
- Bar segment widths (design rules: 14 % minimum per coloured segment, 84 % budget while remaining
  > 0, zero-value segments absent).
- "N items" count = number of assignments returned (all states, as the endpoint returns them).

### 4.4 Client state (not server state)
Active bucket; reorganise-mode on/off; search text (inert). Held in the board's controller/provider,
in memory. *(proposal)* The active bucket survives opening and closing a detail slide (the board
stays mounted beneath it); it is not persisted across reloads.

---

## 5. Roles — complete matrix

Backend matrix (handoff §4, STABLE) projected onto UI affordances. ADMIN behaves as MANAGER.

| Affordance | admin / manager | seller | worker |
|---|---|---|---|
| More-menu entry, board, detail | ✓ | ✓ | ✓ |
| Buckets offered | Unset · High · Medium · Low | Unset · High · Medium · Low | High · Medium · Low |
| Bucket shown when the page opens (owner, round 3) | Unset — **unless Unset is empty, then High** | same | High |
| FAB (one action: Reorganise) | ✓ | ✓ | — (no FAB rendered) |
| Drag to reorder, Set priority | ✓ (in mode) | ✓ (in mode) | — |
| "Add item" | ✓ | — | **wood worker only** (owner, card 4 → A) |
| Remove assignment (in this page's ⋮ menu) | ✓ | — | ✓ same workers as Add |
| Delete an instance; consistency / repair | **deferred** (§10) | — | — |

The role is read inside the package from `@beyo/auth` (`useRole()`), resolved once into a
capabilities object (`canPrioritise`, `canAssign`, `seesUnset`) that every component consumes — no
role comparisons scattered through components. A 403 on any call is still handled (§8.2).

---

## 6. Screens

Visual detail lives in `ui_design_documentation/` and is not restated. This section fixes behaviour
and the owner's departures from the mockup.

### 6.1 Board
- Scroll: header (bucket picker, search row) is part of the scrolling body; nothing sticky.
- Bucket picker: `BoxSlidePicker`, single selection. Selecting a bucket issues that bucket's query
  (§8.3). `Unset` renders without the active fill (design D3) — *the UI session must confirm the
  primitive can express this; if not, it is a primitive extension, not a local fork.*
- Search row: `SearchBar`, sort hidden, placeholder `Search stock need...`. Typing changes nothing (owner: no
  search parameter exists yet). The value is held so wiring later is one line. **The filter button is
  hidden too** until a filter exists (owner, card 6 → B) — the row is the search field alone.
- List: `StockNeedCard` per instance, in backend order. Empty bucket: the designed empty line.
  Loading: card-shaped skeleton (`32_loading_skeletons.md`). Error: the app's standard error pattern.
- Tap a card → detail slide, **in reorganise mode too; on return the board is still in reorganise
  mode** and on the same bucket (owner, round 3). Only a drag begun on the handle moves a card, so a
  tap on the card body is never a drag.
- Opening rule detail: the Unset-or-High choice is made **once, when the page opens**, from the
  first Unset result; the bucket does not jump later if the user triages Unset down to empty
  (shaper's reading of the owner's rule — the user is mid-work there).
- **Reorganise mode** (manager, seller, admin): entered from the FAB, left by the same control.
  Outside the mode no card shows a handle or a priority button, and nothing can be dragged.
  - Handle: top-right of the card, touch target ≥ 44 × 44 px with generous padding. **Drag starts
    only from the handle**; the rest of the card scrolls the page. Vertical axis only, within the
    visible bucket. Dragging card: accent border, reduced opacity, accent icon; list reflows live, no
    drop line (design B2/B3).
  - Bottom button "Set priority" on each card → sheet with the four choices (Unset · High · Medium ·
    Low), current one marked. Choosing a different one moves the row: it leaves this bucket's list.
  - **In the Unset bucket there are no handles** — unprioritised rows have no order (backend refuses
    with `STOCK_REPORT_ROW_HAS_NO_PRIORITY`). Only "Set priority" is offered there.
  - Keyboard path for reordering via dnd-kit's keyboard sensor (design ambiguity 11).
- FAB: same interaction language as `TaskCreationFab` (expanding action buttons), one action today.
  Promote a small `FabMenu` primitive (owner-approved, round 3) into `@beyo/ui` rather than hand-rolling a third
  copy; the existing two FABs are **not** migrated in this project.

### 6.2 Instance detail (slide surface)
- Opens as a slide surface and uses **that surface's natural header** (owner, round 2): title =
  category name, the surface's own back/close. The summary card and everything below scroll as one.
- Title = category name. Summary card, legend, "Add item"
  (capability-gated), divider, "Selected items · N items", assignment list, designed empty state.
- Assignments render with `TaskListCard` from `@beyo/tasks`, status vocabulary and date display from
  the existing task card (design ambiguities 6–8 resolved: reuse, do not invent). The quantity badge
  shows the assignment's item quantity.
- Card interactions, injected by the app as `surfaceOpeners`: body → task detail
  (`openTaskDetail`), image → picture viewer (`openImageViewer`) — identical to TasksView, **in all
  three apps** (owner, card 3 → C: the `@beyo/tasks` task pages are registered in the workers app;
  what a worker sees inside them is card 9).
- **The ⋮ menu on this page is not the task page's menu** (owner, card 5). It opens this package's
  own small sheet with **one action today: "Remove from stock need"**, followed by a confirm step,
  then §8.4. **Sellers, who cannot remove, see no ⋮ at all.** Other task actions are reached by
  tapping the card → task detail (owner, card 5 → A).
- **Workers inside the task detail opened from here (owner, card 9 → A):** read-only and narrow —
  item, images, steps and dates. Customer, money/budget, notes and every editing control are
  hidden. The rule must fail closed: a section with no explicit worker allowance is not rendered.
  Widening is the owner's next project.
- If the instance disappears while open (deleted by Scanner or a user — handoff §5.10), the slide
  closes and the user is told the stock need no longer exists.

### 6.3 Owner departures from the mockup (each is the owner's, from the raw draft)
| Mockup | Ships | Why |
|---|---|---|
| Sort button | hidden | unnecessary for this page |
| Whole card draggable, always | handle-only, only in reorganise mode | tap-to-open and scrolling must stay reliable |
| No way to set priority | per-card button + sheet in reorganise mode | triage must be possible |
| Live search | visible, unwired | no backend parameter yet |
| Add item → undefined picker | internal task creation form in stock-assignment mode | assignments are made by creating the task |
| Back-arrow header | the slide surface's natural header (owner) | slides already own back/close gestures |
| ⋮ = task menu | this page's own menu with Remove (owner) | removal must live somewhere; the task menu has no such action |
| Filter button | hidden (owner) | a button that does nothing reads as broken |
| CSS placeholder type icons | the item category's own picture, matched by category id (owner) | one icon reference across the product |

Over-fulfilment (design A7) and completed rows (ambiguity 10): *(proposal)* the bar clamps at 100 %,
no special treatment, rows stay listed — Scanner owns whether a need still exists.

---

## 7. App integration

Per app: the six More-tab edits (§2.1; menu label **"Stock needs"** — owner, card 7 → A; code
identifiers stay `stock-report`), a thin page mounting `loadStockReportRouteEntryPage()`,
`@source` for the package in `index.css`, the package's surfaces registered, `surfaceOpeners`
assembled in the app, and the `typecheck` / `test:stock-report` root scripts. Sellers additionally
gains the three `@dnd-kit/*` dependencies. **Workers additionally registers the `@beyo/tasks` task
detail surfaces** it lacks today (owner, card 3 → C), restricted per card 9 — this is the first step
of the owner's later project giving workers the main task page, which itself stays out of scope here. The FAB is rendered by the package page itself from
capabilities (it toggles package state), not as an app sibling.

Dependency direction (constraint): `@beyo/stock-report` may depend on `@beyo/tasks` (card, types),
`@beyo/ui`, `@beyo/hooks`, `@beyo/auth`, `@beyo/api-client`, `@beyo/realtime`, `@beyo/lib`.
**`@beyo/task-creation` must not import `@beyo/stock-report`** — the stock-assignment mode is a
generic seam on task-creation (§8.4) that the app fills with stock-report functions.

---

## 8. Operations and wire contracts

### 8.1 Schema tolerance (NOT PINNED handling)
Nullability arrives only with the backend's final handoff. Until then every response field other
than identifiers and the closed enums is parsed as **nullish** (accepts null *and* absent) and the
view-model mapper supplies display defaults (quantities → 0, lists → empty). A strict schema here
reproduces the known failure "200 + endless refetch + blank page". Tightening is a named follow-up
when the phase-14 handoff lands. Enum fields reject unknown values loudly **except** assignment
`state`, where an unknown value degrades to the neutral pill rather than blanking the list.

### 8.2 Errors
Envelope per handoff §2. **Status 403 is special-cased before the body is read** (`{detail}`, no
`ok`). `error` strings are shown, never parsed or switched on. Machine handling uses `code` only.

### 8.3 Reads
- Board: `GET /api/v1/stock-report/items` — one query per bucket. High/Medium/Low send
  `priority=<that one value>`; **Unset omits the parameter** (the documented default returns
  null-priority rows). "All" is never requested. Unpaginated. Backend order is display order.
- Detail: `GET …/items/{client_id}/assignments`; the instance itself comes from the board cache and
  is kept fresh by events (no single-instance GET exists).

### 8.4 Writes
- **Set priority** — `PATCH …/items/{id}/priority {priority}`. Optimistic: the row leaves the
  current bucket's list; rollback on failure. Setting the same value is not sent.
- **Reorder** — `PATCH …/items/{id}/priority-order {priority_order}` where the value is the
  **1-based index of the drop position in the complete bucket list**. Optimistic array move;
  rollback + notice on 422. One request per drop; a drop in place sends nothing. **Reordering is
  only permitted while the visible list is the complete bucket** — when search or filters become
  real, reorganise mode is unavailable while either is active (an index in a filtered list is not a
  position in the bucket).
- **Create assignment** — `POST …/assignments {entries:[{stock_report_item_id, task_id, item_id,
  override_property_mismatch}]}`, always a single entry from this UI. Response is the full
  assignment and is written straight into the detail cache.
  - 422 `stock_assignment_refused`: show a message per `reason` (closed vocabulary of eleven).
  - 409 `stock_assignment_property_mismatch`: show the failures; on confirm **resend the whole
    request** with the flag true. Never auto-override.
- **Remove assignment** — `POST …/assignments/delete {client_ids:[id]}`; confirm first; optimistic
  removal, rollback on failure (404 text is never matched).
- **Stock-assignment mode of task creation.** A generic seam on `@beyo/task-creation`, supported by
  both `InternalTaskSlidePage` and `WorkerInternalTaskSlidePage` (the latter gains callback support
  it lacks today):
  1. *Item gate* — the form calls an injected check (§8.5) **as soon as it knows a category and a
     quantity — whether or not the lookup found the item** (owner, card 11 → A), and again whenever
     identifier, category or quantity change. Submit in stock mode is never enabled before the
     latest check has answered (or failed, §8.5). "blocked" shows
     the reason and disables submit; "warn" shows the mismatches and requires an explicit
     confirmation, which is remembered for step 3; "ok" is silent.
  2. *Create task* — unchanged.
  3. *Post-create* — with the returned `client_id` + `item_id`, the injected function creates the
     assignment (override flag = the confirmation from step 1). An unexpected 409 here runs the
     override dialog.
  4. *Outcome* — success → "Add another" (form resets, stays open, mode kept) or "Done" (closes).
     **If the assignment fails after the task was created, the task is not rolled back**: the user
     is told the task exists but was not added to the stock need, with the reason. No retry loop is
     invented; they can remove or re-add by hand.
  If the item has no `item_id` in the create response (no item on the task), stock mode treats it as
  a failed assignment with that explanation — it cannot happen from these two forms, which always
  carry an item.

### 8.5 Compatibility check — match preview (handoff v2, RATIFIED contract on the backend)
`POST /api/v1/stock-report/items/{stock_report_item_client_id}/match-preview` — roles ADMIN,
MANAGER, WORKER; read-only; single row, single item. Supersedes every earlier sketch in this document.

**Request the form sends**
| Field | Value |
|---|---|
| `task_id` | always `null` — this UI only ever creates the task in the same form |
| `article_number` / `sku` | the identifier the user entered: article number when present, else SKU, **never both** (422); neither when the form has none |
| `item_category_id` | the form's current category |
| `properties` | **the properties object of the lookup result the form applied, passed through unchanged** (owner, round 2; verified: `lookup_item_by_article_number` serialises `properties` for both the purchase-API and the internal source). `{}` when there is no lookup result |
| `quantity` | the form's current quantity — **required** |

**What the answer means, and what the form does — driven by three fields only**
| Answer | Form |
|---|---|
| `can_proceed: false` | **Blocked.** Show the message for `refusal_reason` (same closed vocabulary and the same renderer as the create 422). Submit disabled. Way out: change the item |
| `can_proceed: true`, `override_required: true` | **Soft warning.** List `property_failures` (`{key, reason}`, identical to the create 409's — one renderer; a quantity mismatch arrives here as key `quantity`). Ways out: *change the item*, or *continue* = the user's override, sent as `override_property_mismatch: true` **on the first create call** |
| `can_proceed: true`, no override | Silent; submit enabled |

- **Stored wins.** When the identifier resolves to a live Manager item the backend evaluates that
  item's *stored* category, properties and quantity and ignores what was sent, reporting
  `values_source: "stored"`. The form then says so in the result ("checked against the item already
  registered"), so a user who changed category or quantity is not misled. `"supplied"` shows nothing.
- `checks[]` is **not displayed** *(proposal)*; nothing in the UI depends on it, so the
  `pass` / `pass_by_construction` distinction needs no visual.
- **Never a promise.** The result is not cached across navigation or across "Add another"; it is
  re-asked whenever identifier, category or quantity change; a result for inputs that are no
  longer current is discarded (latest-request-wins). `item_already_assigned` is advisory, so a
  later create refusal is correct behaviour and §8.4's 422/409 handling stays complete.
- The preview failing (network, 5xx) never blocks creation *(proposal)*: the form proceeds as if
  no check existed and creation-time handling applies. A 404 means the stock need is gone (§6.2).
- **When it is asked (owner, card 11 → A): always before creation.** With a lookup match the
  lookup's properties are sent; with no match the user's hand-picked category and quantity are
  sent with `properties: {}`. Both paths are protected by the matcher first: a wrong category is
  stopped before any task exists, and a property warning is shown and accepted up front so the
  assignment is created on the first call.
- **OPEN on the backend, handled without guessing:** (1) exact response field names — the call has
  one schema and one mapper, tolerant per §8.1, so a rename is a one-file change; (2) whether the
  standard envelope wraps the response — the parser accepts both the wrapped and the bare body. 403
  is `{detail}` as everywhere.

### 8.6 Realtime (handoff §3, STABLE)
| Event | Client effect |
|---|---|
| `stock_report_item:created` | invalidate board lists (payload is empty — must fetch) |
| `stock_report_item:updated` | patch the cached row with the six values; if `priority` differs from the list it sits in, move it (remove here, invalidate destination); re-sort by `priority_order` |
| `stock_report_item:deleted` | remove from every list; close its open detail (§6.2) |
| `stock_task_assignment:created / :state-changed / :deleted` | invalidate that instance's assignments query |
Events and optimistic writes converge on the same cache; an event for a change the client already
applied is a no-op. While a drag is in progress, incoming reorders are applied after the drop.

### 8.7 Requests to the backend raised by this intention
1. `image_url` inside each row's `item_category` block (card 10 → A). **The owner carries this
   request to the backend; this project assumes it is delivered** and builds against it. Parsed
   nullish like every other non-identifier field (§8.1), so its late arrival degrades to the
   placeholder, never to a blank page.

---

## 9. Facts vs derived
Facts: everything in §4.1–4.2, owned by the backend. Derived, client-only: §4.3. The client never
computes a signature, never infers a missing quantity (absent → 0 for display only, never sent
back), never decides compatibility itself (the matcher lives on the backend only), and never sends
`priority_order` for a row it did not move.

---

## 10. Scope ladder

**Must ship (as extended by §12B: api-client error details, the `dismissible: false` surface flag in `@beyo/ui`, preload/prefetch, PullToRefresh; the workers' task-detail tap is deferred — B8):** package + three-app More-tab integration; `FabMenu` primitive in `@beyo/ui`; board with buckets, role-gated buckets;
reorganise mode (drag order, set priority); detail with TaskListCard assignments and the three
openers; Add item through both forms in stock-assignment mode incl. pre-check, override, add-another;
remove assignment from this page's ⋮ menu; registering the task detail surfaces in the workers app,
restricted per card 9; realtime; error/403 handling; tolerant schemas; loading, empty,
error states; unit + component tests and Playwright (mobile first) per `17`/`34`.

**Only if cheap:** keyboard reordering polish; preloading the
detail surface on card press.

**Explicitly deferred / non-goals:** search and filter behaviour (filter button hidden); sort; the
workers' main task page and the full worker permission design (owner's next project); deleting an instance;
consistency report and repair screens; assigning an *existing* task or item (owner: "at the moment
the user is only capable of creating an item with a new internal task"); history; pagination;
desktop/tablet layouts beyond the app frame; over-fulfilment and completed-row treatments; a
"forgotten items" (`resolved_early`) view; migrating the two existing FABs; schema tightening
(waits for the backend's final handoff).

---

## 11. Measurement ledger (ratified 2026-09-21)

| ID | Observable outcome | Defect family guarded |
|---|---|---|
| **M1** | In each of the three apps the same package page opens from the More menu, and each role gets exactly the §5 row: buckets offered, opening bucket (Unset, or High when Unset is empty; workers High), FAB presence, reorder/priority controls, Add and Remove; for a worker the task card's body tap is inert in this build (§12B B8). | privilege leak; a capability missing for a role that has it; app drift |
| **M2** | The cards shown for a bucket are exactly the backend's rows for that priority, in backend order; Unset shows only unprioritised rows and is requested by omitting the parameter; no request ever asks for "all". | the default-filter trap; client re-sorting; wrong bucket after a move |
| **M3** | A drop sends exactly one request with the row's id in the path and the correct 1-based target; setting a priority sends exactly one request; both show immediately and revert with a notice when refused. Nothing can be dragged outside reorganise mode, in Unset, by a worker, or by scrolling the page. Opening a card from reorganise mode and coming back leaves the mode on. | off-by-one order; duplicate or phantom writes; scroll mistaken for drag; silent failed write |
| **M4** | For any four quantities the bar shows fulfilled = awaiting, in progress = in queue + in progress, remaining = the rest: correct numbers, zero segments absent, remaining floored at 0, coloured segments never narrower than their minimum, remaining always able to show its number. | wrong progress shown to the floor; clipped or lying bar |
| **M5** | Add item: a match preview always precedes creation, with or without a lookup match; it is sent with the lookup's properties unchanged, the form's category and quantity, one identifier at most and a null task; a stale answer never decides; "continue" on a soft warning puts the override on the **first** create call; the task is created first and the assignment second, using the ids the task creation returned; a category mismatch blocks before any task exists; a property mismatch requires explicit confirmation and only then sends the override; a 409 resends the whole request; an assignment failure after task creation is reported truthfully and the task remains; "Add another" yields a fresh form in the same mode. Remove, from this page's own ⋮ menu, takes the assignment off the list. | orphan tasks created unknowingly; silent override; assignment attached to the wrong ids; false success |
| **M6** | With no reload, each of the six events brings an open board and an open detail to the state a fresh fetch would show; a vanished instance closes its detail with a notice; an echo of the user's own change alters nothing. | stale board; double-applied updates; crash on a row deleted underneath the user |
| **M7** | A response with any non-identifier field null or absent still renders; an unknown assignment state renders a neutral pill; a 403 body is handled without a crash; no behaviour depends on the text of `error`. | blank page from strict schemas; envelope assumptions; string-matching errors |

---

## 12. Pre-implementation protocol — the two-session seam

1. Ratify this document → mechanism-inventory → planner.
2. **UI session (Claude):** builds presentational components and both page layouts as **pure,
   prop-driven components** against view-model types it defines (`StockNeedCardViewModel`, etc.)
   and a fixtures file; includes all states in `05-ui-states.md`, reorganise-mode visuals, the
   priority sheet content, the bar's width arithmetic as a pure tested function, skeletons, and
   `data-testid`s. It fetches nothing, reads no role, opens no surface. It does not touch
   `@beyo/task-creation`.
3. **Logic session (Codex):** types/schemas, keys, API, query hooks, actions, controllers,
   providers, realtime, capabilities, surface ids/loaders, the task-creation seam, app integration,
   tests. It maps DTO → the UI session's view models and **does not restyle**; a view-model gap is
   reported, not patched around.
4. Contracts to resolve per the goal-mapping guide: core set + New feature (CRUD) + Auth/permissions
   (`12`,`19`) + Real-time (`21`) + UI surfaces (`28`,`27`,`31`,`32`,`36`,`38`) + `30` + `35 §13–14`
   + `17`/`34`, with their `_local` companions.

## 12A. Amendment — implementation shape and the match-warning surface (owner, 2026-09-21, post-ratification)

Session/packaging decisions; no product semantic changes, so the gate stays RATIFIED. Where this
section and §12 or §8.4 disagree, this section ships.

| # | What ships | Status |
|---|---|---|
| A1 | **Two phases only**: one Claude phase builds all UI; one Codex phase implements and wires everything. This knowingly exceeds the charter's ≤ 8-criteria sizing; the planner records the owner's decision as the reason, orders the tasks inside each phase (UI: primitives → board → detail → match-warning sheet; logic: reads + app integration → reorganise → detail + workers registration → task-creation seam → realtime → Playwright) and groups criteria by ledger entry so a fix round re-runs only its group | owner |
| A2 | **The match warning is an app bottom-sheet surface owned by `@beyo/stock-report`**, exported as a loader, registered by each app as a `sheet`. It carries the blocked view, the soft-warning view (failure list · *Change item* / *Continue*) and the "checked against the item already registered" note. Built by the UI phase inside stock-report | owner |
| A3 | **Task-creation receives the gate by injection**: one generic function ("may this candidate proceed?") whose app-supplied implementation calls the match preview and opens the A2 sheet. `@beyo/task-creation` never imports stock-report and never names the sheet (35_shared_packages §13). This replaces §8.4 step 1's implied in-form panels | owner |
| A4 | **Loading**: while a check is in flight a spinner status is shown and submit is disabled. The status row is an injected component owned by stock-report, rendered through one generic, stock-agnostic slot under the item-identity field in both forms — the **only** change the UI phase makes to `@beyo/task-creation` (supersedes §12 step 2's "does not touch") | owner (spinner) + shaper (slot placement) |
| A5 | A match opens nothing: the status row disappears silently | shaper, follows from §8.5 |
| A6 | **The user must choose** (owner): the match sheet cannot be dismissed by swipe, backdrop tap or Back — for both the block and the warning. It closes only through its buttons: *Change item* (block and warning) or *Continue* (warning only) | owner |
| A6a | After *Continue* the status row stays as a quiet, tappable "mismatch accepted" line that reopens the sheet, so the armed override is visible until the item changes. Any change to identifier, category or quantity discards the acceptance and re-checks (§8.5) | shaper, from the owner-approved status-line recommendation |
| A7 | ***Change item*** closes the sheet, clears and focuses the identifier field, **and clears every field the item lookup filled in** (category and major category, quantity, properties, lookup images, purchase price — whatever the applied lookup result wrote). Fields the user typed by hand are left alone. The next entry starts a fresh check | owner |

---

## 12B. Amendment — architecture alignment (audit of 2026-09-21, post-ratification)

An audit of this document against `architecture/*.md` (+ `_local`) and the code it touches. Each row
corrects *how* something is built or states a repo fact the text had wrong; none changes what the
user experiences, except B8, which by the owner's decision defers the worker's task-detail tap. **Where this section and an
earlier section disagree, this section ships.**

| # | Corrects | What ships | Evidence |
|---|---|---|---|
| B1 | §8.2, §8.4, §8.5 | **`@beyo/api-client` + `@beyo/lib` must be extended.** Today the error body's `code` and `details[]` are discarded (`ApiErrorSchema` = `{error, ok}`; `ApiRequestError.code` is *status-derived*: `conflict`, `unprocessable`, `forbidden`). `ApiRequestError` gains optional `serverCode` and `details: unknown`, filled from the body; `code` keeps its meaning. Stock-report parses `details` with its own schema at the API-function boundary. `04_api_client_local.md` ("No code field") is amended. Must-ship; covered by `test:api-client` | `packages/api-client/src/api-client.ts:12-22,66-101`; `packages/lib/src/types/api.ts:10-13` |
| B2 | §8.2, HC-4, M7 | **403 needs no new code.** api-client already maps `{detail}` to `ApiRequestError(403, 'forbidden', …)`. Stock-report branches on `error.code === 'forbidden'` and shows the `13_errors` copy. M7's 403 clause becomes a regression test added to api-client | `api-client.ts:87-94`; `04_api_client.md:384`; `13_errors.md:65`; `19_permissions.md:416` |
| B3 | §8.2 | **Messages are mapped, not echoed.** User text comes from `error.code`, `serverCode` and the closed `reason` vocabularies. The backend's `error` string is shown only for a 409/422 with no known reason — which includes the two reorder refusals (no `code` key) | `13_errors.md:172`; precedent `packages/tasks/src/lib/force-task-ready.ts:58-66` |
| B4 | §8.6 | **Events are flat on the wire**: `{client_id, ...fields}` — there is no `extra` key. `stock_report_item:*` → `client_id` is the row; `:updated` adds the six values. `stock_task_assignment:*` → `client_id` is the assignment, plus `stock_report_item_id`, `task_id`, `state`. Every payload is Zod-parsed in the handler; a parse failure invalidates instead of patching | `backend/.../events/handlers/socket_handler.py:59-63`; precedent `packages/worker-shifts/src/socket-events.ts:21-33` |
| B5 | §8.6, §6.2, M6 | **Handlers only write or invalidate cache** (static registry, ctx = `{queryClient, notify}`; never listeners in components). So: the package exports `socket-events.ts`; each app composes it in `src/app/socket-registry.ts`; the six event types are added to `packages/realtime/src/lib/socket-types.ts`. *Closing a vanished detail* is the detail controller's job; *mid-drag deferral* is the board controller rendering from a frozen snapshot while dragging | `packages/realtime/src/lib/socket-registry-types.ts:5-15`; `21_realtime.md:716-721` |
| B6 | §8.3, §8.6 | **A row that changes priority is moved, not dropped.** On `:updated` (or the user's own PATCH) with a different priority, the patched row is inserted into the destination bucket's cached list if that cache exists, then that list is invalidated (`refetchType: 'active'` would otherwise never refetch an unobserved bucket). The detail resolves its instance by scanning all cached bucket lists. **"Gone" is declared only on `:deleted` or an assignments 404** — never because a row is momentarily in no list | `21_realtime.md:721` |
| B7 | §12A A6 | **Locking becomes a flag on the open call** (owner, 2026-09-21): e.g. `open(id, props, { dismissible: false })`, off by default, available to every caller. Today a sheet cannot be locked at all — `BottomSheetSurface` hard-codes swipe/backdrop/close-interceptor as no-ops, Escape closes, and Back pops the surface's history entry. The `@beyo/ui` extension makes the flag cover **all four**: swipe (vaul `dismissible={false}`), backdrop tap, Escape, and **Back — neutralised by re-pushing the surface's history entry in the popstate handler when the topmost surface is locked**, so the sheet simply stays. A locked surface closes only programmatically (its own buttons). `33_vaul_drawer.md` requires a visible way out — the sheet's buttons are it. The match sheet is opened locked; nothing else changes behaviour. The shaper's earlier "Back = *Change item*" is withdrawn | `packages/ui/src/components/surfaces/BottomSheetSurface.tsx:76-122`; `SurfaceProvider.tsx:264-271` (`syncToDepth`), popstate handler; `33_vaul_drawer.md:193-206` |
| B8 | card 9, card 3, §6.2, §7, §10, §13(9) | **Deferred to the owner's next project (owner, 2026-09-21 → option B).** Registering the task detail in the workers app would fail *open*: it has no view mode, its sections are hard-coded (customer, notes, editable images, production-time money, "Assign Stages", ⋯ menu, auto-opening unread-notes viewer), and the workers app already registers four of the sub-surfaces it opens. So in **this** build the workers app does **not** register the `@beyo/tasks` task detail: for workers the card-body tap is inert (no `openTaskDetail` opener is injected), while the image tap (picture viewer) and this page's ⋮ (Remove, for wood workers) work. Managers and sellers are unchanged. The view mode with an allow-list in `@beyo/tasks` is the first task of the owner's "workers see the task page" project. **This supersedes card 3 → C and card 9 for this build**; `@beyo/tasks` is not modified | `packages/tasks/src/pages/TaskDetailSlidePage.tsx:184-307`; `flows/use-task-detail.flow.ts:47-103` |
| B9 | §5 last paragraph | **Capabilities, contract-shaped.** One hook `lib/use-stock-report-permissions.ts`, called by controllers and exposed through provider context; components never import `useRole`. The package declares `permissions.ts` keys (`stock_report:prioritise`, `stock_report:assign`, `stock_report:view_unset`) so a later swap to `can()` touches one file. This is a recorded deviation from `19_permissions_local.md` ("forbidden: gating an operation on a role string") — the permission layer is dormant (`backend_permissions` empty) and role-derived capability hooks are the de-facto package pattern. `useRole()` returns `{role, workspaceRoleName, workspaceSpecialization, hasRole, hasSpecialization, isWorkspaceRole}` | `packages/tasks/src/lib/use-item-upholstery-permissions.ts:16-25`; `packages/auth/src/hooks/use-role.ts:55-62` |
| B10 | §6.1, design "no pull-to-refresh" | **The board is wrapped in `<PullToRefresh>` with no `scrollRef`** — the only package-legal way to register a tab page's scroll container. `onRefresh` refetches the active bucket; **`disabled` while reorganise mode is on**, so pull and drag never compete. Playwright mobile: use `tap()` inside it | `36_scroll_visibility.md:166-177,669`; `PullToRefresh.tsx:22` |
| B11 | §10 "only if cheap" | **Preload is mandatory, not optional:** `preloadStockReportDetailSurface` + `prefetchStockReportAssignmentsData(queryClient, params)` with matching `staleTime`; the board hoists `usePreloadSurface`. The injected gate (A3) carries an optional `preload()` the forms hoist, wired by the app to the match sheet's preloader | `30_dynamic_loading_local.md:13,67,115-119,163-166` |
| B12 | §8.4 step 1, §12A A4 | **Gate enforcement in the forms.** The manager form is a multi-step `StagedForm` whose final button has no `disabled` input and whose identity field is on an earlier step. So the gate is enforced in `onBeforeAdvance` / `onSubmit`: await the latest check; on a block or an unaccepted warning, open the sheet (and return to the item step) instead of submitting. The worker form's bottom action gains `disabled`. **A4 is narrowed:** the UI phase builds the status-row *component* in stock-report and touches `@beyo/task-creation` not at all; inserting the generic slot (manager: inside the item ContentCard above `ItemPositionZoneField`; worker: above `ItemQuantityField`; must not collide with `ItemIdentityField`'s own status flash) is logic-phase work | `InternalFormContent.tsx:244-330,403-417`; `StagedFormNavigation.tsx:62-73`; `WorkerTaskCreationBottomActions.tsx:25-32` |
| B13 | §12A A7, §13(8c) | **What *Change item* clears, exactly.** Manager form lookup writes: `item.item_category_id`, `item.article_number`, `item.major_category`, `item.quantity`, `item_pricing.purchase_cost_per_piece`, `item.properties`, + images (owned by `use-lookup-item-images`). Worker form writes: `item.article_number`, `item.quantity`, `item.properties`, `item.item_category_id`, `item.major_category` (pinned to wood — **never cleared**), + images created inline with no cleanup. Mechanism: a per-field last-injected map — a field is cleared only if its current value still equals what the lookup injected (precedent `use-shopify-customer-lookup-prefill.ts:124-166`). The worker form adopts `use-lookup-item-images` so its lookup images can be removed | `InternalFormContent.tsx:170-218`; `WorkerInternalFormContent.tsx:201-268` |
| B14 | §8.5 request table | **"The lookup result the form applied" = the purchase-API result** — both forms apply only that one; an internal-only match applies nothing and the preview goes out with `properties: {}` (the backend answers on stored values anyway). **`quantity` is sent as `item.quantity ?? 1`**, the same default the create payload uses, so preview and create cannot disagree. The stale comment at `packages/items/src/types.ts:62-65` is corrected | `lib/item-lookup-prefill.ts:37-47`; `normalize-task-form-payload.ts:108` |
| B15 | §8.5, §12A A3 | **The preview is an action hook, not a query**: `useStockMatchPreview(stockReportItemId)` → `{check(input), isPending}`, a `useMutation` with a monotonically increasing token for latest-wins; no cache writes, no invalidation — a documented exception to `05_server_state.md:479-480`. Stock-report also exports `useStockAssignmentGate`, composing preview + sheet opener + accepted-override state, so each app only supplies the opener. Callbacks passed through surface props close over refs (props are an open-time snapshot) | `05_server_state.md:475-480`; `SurfaceProvider.tsx:171-181` |
| B16 | §8.4, M3 | "Exactly one request" means **one *write***; `onSettled` still invalidates the bucket list as `05` mandates. **Drag is disabled while a reorder is pending** (no concurrent-rollback hazard). Create-assignment is non-optimistic and has no client-generated `client_id` — the exception is documented in `types.ts` per `24_dto.md:243-296` | `05_server_state.md:382-390,479-480` |
| B17 | §12 step 2 | **Prop types vs view models.** The UI phase defines component **prop types** beside the components. The logic phase defines `StockReportItemViewModel = StockReportItem & {…}` and `toStockReportItemViewModel` in `types.ts`, called in the controller, and maps to the props. Ids are plain strings (repo practice; `@beyo/lib` exports no brand helper). Enums are `as const` objects, never TS `enum` (`erasableSyntaxOnly`) | `24_dto.md:166-206` |
| B18 | §8.1 | An unrecognised `priority` on a row **drops that row with a logged warning** rather than failing the whole list (a schema failure surfaces as a 502-style `invalid_response` for the entire query) | `api-client.ts:152-158` |
| B19 | §6.2 | Detail slide: title set at runtime via `useSurfaceHeader().setTitle(categoryName)`; **no `path`** (state-only slide, as 30 of 31 registered slides — no single-instance GET exists to render a deep link). **Remove** = `ConfirmActionButton` ("Remove from stock need" → "Tap again to remove") inside this page's actions sheet — the repo's standard confirm; no second surface | `SlidePageSurface.tsx:231-251`; `TaskDetailMenuSheetPage.tsx:160-180` |
| B20 | §7 | **Per-app checklist, complete:** the six tab edits; `"@beyo/stock-report": "*"`; `@source`; surface registrations; `src/app/socket-registry.ts` (+ its test); root `typecheck` chain + `test:stock-report`. **Workers has a seventh tab edit:** `LAST_ACTIVE_STEP_CARD_HIDDEN_TABS` in `AppShell.tsx:26-29` — the floating step card stays **visible** on Stock needs *(proposal; workers have no FAB there, so nothing collides)*. No per-user tab-visibility mechanism exists; nothing to register | `apps/workers-app/.../app/AppShell.tsx:26-29` |
| B21 | §4.4 | Bucket + reorganise mode live in the board controller/provider (or a `store/` page store like tasks), not in URL params — recorded deviation from `11_routing.md:242`. Tab panes stay mounted, so the state also survives tab switches | `TabSlideStack.tsx:50` |
| B22 | §12 step 4 | Contract list gains: `33_vaul_drawer` (B7), `09_forms` (the seam; never `form.reset()` on error — relevant to *Add another*), `20_notifications`, `14_styling`, `37_keyboard_aware_inputs` (search field), `29`, `18`, `26` | goal-mapping guide |
| B23 | §8.4 step 3–4 | The forms already reset after success; only their `surface.close(...)` needs gating. `onTaskCreated` is sync `void`, so the seam adds an async-aware hook — `afterCreate?: (info) => Promise<'close' \| 'reset-stay'>` — and `WorkerInternalTaskSlidePage` starts reading surface props (it reads none today) | `InternalFormContent.tsx:293-329`; `WorkerInternalFormContent.tsx:324-328`; `surfaces.ts:38-40` |
| B24 | §10 testing | Playwright is per app; all three have configs, managers is fully bootstrapped, sellers has no helpers dir. No app has a socket-trigger helper → **M6 is proven in Vitest** (handler + cache), not Playwright. All specs mock with `page.route`; mock 403 as `{detail}`. Default `staleTime` is 60 s — revisiting a bucket fires no request, so M2's network assertions count first visits. Suites to keep green: `test:stock-report`, `test:ui`, `test:tasks`, `test:task-creation`, `test:api-client`, `test:realtime` | `34_runtime_validation(_local).md`; `17_testing.md` |

---

## 13. Mechanism invariants already known (seeds for mechanism-inventory)
Ranked by silent-failure risk: (1) index → `priority_order` translation and its "complete bucket
only" precondition; (2) optimistic cache vs realtime convergence, including mid-drag events and
cross-bucket moves; (3) the task-then-assignment sequence and its partial-failure state; (4) the
override confirmation carried from pre-check to creation; (5) drag activation constraints that
separate scroll from drag on touch; (6) schema tolerance boundaries; (7) criteria → tag text;
(8) the lookup-properties payload passed unchanged to the match preview, and preview/create
agreement when a stored item already exists for the identifier while the form creates a new item
(the preview answers about the stored one); (8b) latest-request-wins on the preview; (8c) knowing exactly which form fields the applied lookup
result wrote, so *Change item* clears those and nothing the user typed (§12A A7); (9) the worker-side
restriction of the task detail (card 9) — a hiding rule that fails open is a leak.

---

## 14. Open decisions ledger
**Open — owner:** none.
**Closed round 6 (owner):** card 11 → A — the preview runs with or without a lookup match.
**Closed round 3 (owner):** card 2 → A · card 5 follow-up → A · card 9 → A · card 10 → A (assume `image_url` delivered) · opening bucket rule · tap works in reorganise mode and the mode persists · no check when lookup finds nothing · `FabMenu` primitive approved.
**Closed round 2 (owner):** card 1 → A · card 3 → C · card 4 → A · card 5 → removal lives in this page's ⋮ menu, which differs from the task page's · card 6 → B · card 7 → A · card 8 → snapshots added; slide surface's natural header; icons are the item category's picture.
**Open — external:** match-preview field names and envelope (backend OPEN; tolerated by design, §8.5); handoff §8
NOT PINNED items 1–3 close with the backend's final handoff (the design tolerates them until then).
**Closed this round (repo- or backend-derivable):** see changelog.

## 15. Shaping changelog
**Round 1 — 2026-09-21 — intention-shaper (Claude).** First grounded shaping of the owner's raw draft.
- Resolved: "More page" → More **popup** tab entry, six edits per app (repo fact).
- Resolved: no reordering in Unset; priority-only there (backend refuses ordering a null-priority row).
- Resolved: Unset bucket is requested by omitting `priority`; never "all" (handoff §5.5).
- Resolved: ADMIN treated as MANAGER; sellers get no Add/Remove (backend matrix).
- Resolved: schemas tolerant until the backend's nullability handoff (handoff §0, §8; known blank-page failure).
- Resolved: task-creation must not depend on stock-report; stock mode is a generic injected seam; the worker form needs callback support it lacks today.
- Resolved: partial failure keeps the created task and reports truthfully (no endpoint exists to undo; silent rollback would be invention).
- Resolved: sellers app needs `@dnd-kit/*` added.
- Resolved: design ambiguities 1, 5, 6, 7, 8 by the owner's draft (handle-only drag; creation form; reuse task card, its menu and its status vocabulary).
- Proposed (shaper's, strike if wrong): default buckets; tap disabled in reorganise mode; bucket survives detail open/close; standard slide chrome instead of the mocked back bar; `FabMenu` primitive; clamp-only over-fulfilment; instance deletion deferred; the §8.5 endpoint shape; the M1–M7 ledger.
- Raised to owner: cards 1–8.

**Round 2 — 2026-09-21 — owner answers folded (David).**
- Card 1 → A: bar mapping fixed in §4.3 and M4.
- Card 2: owner's principle recorded — the frontend renders only the tags the backend sends and never judges a match (§4.1, §9). The remaining text-only question is re-asked with a concrete payload.
- §8.5 **withdrawn and replaced**: the owner has built the check endpoint (article number or SKU, category id, properties, quantity) and will hand over its contract; the properties sent are the item-identity lookup's object, unchanged. HC-6 amended.
- Card 3 → C: `@beyo/tasks` task pages get registered in the workers app (§6.2, §7, §10); worker restriction raised as card 9 at the owner's invitation.
- Card 4 → A. Card 6 → B (filter hidden). Card 7 → A ("Stock need" copy, "Stock needs" menu label).
- Card 5: removal lives in the ⋮ menu, and this page's ⋮ menu differs from the task page's (§6.2, §6.3); contents asked as a follow-up.
- Card 8: snapshots read (`snapshot/`, two images). Detail uses the slide surface's natural header (proposal promoted to owner decision). Icons = item category picture; repo check found categories expose `image_url` and the stock row's category block lacks it → card 10, §8.7.

**Round 3 — 2026-09-21 — owner answers folded (David); status → READY_FOR_RATIFICATION.**
- Card 2 → A (tag text rule, §4.1). Card 5 follow-up → A (own one-action sheet; no ⋮ for sellers, §6.2). Card 9 → A (workers read-only and narrow, fail-closed; widening is the owner's next project). Card 10 → A, with the owner's instruction to **assume `image_url` is in the payload** (§4.1, §8.7).
- Shaper proposals corrected by the owner: opening bucket is Unset unless empty, then High (§5, M1); tapping a card **works** in reorganise mode and the mode survives the round trip (§6.1, M3) — the shaper's "tap disabled" is struck.
- Shaper proposals confirmed: no compatibility check when the lookup finds nothing; `FabMenu` primitive (moved to must-ship).
- Trivial resolution by the shaper: the Unset-or-High choice is evaluated once at page open, not continuously.
- Still the shaper's, unchallenged through three rounds and presented on the ratification surface: over-fulfilment clamps with no special treatment; deleting an instance and the consistency/repair screens are deferred; the M1–M7 ledger.
- Ratification surface presented to the owner in chat: outcome, M1–M7 verbatim, scope boundaries, decisions (none open). **Not ratified until the owner says so.**

**Round 4 — 2026-09-21 — owner (David): ratification held for one input.**
- The owner reviewed the ratification surface favourably ("sounds great") but did **not** ratify: the compatibility-check endpoint handoff will be delivered first and folded into §8.5 before mechanism-inventory. Status header says so; the gate holds.
- Folded now: soft warnings include a **quantity** mismatch as well as properties; the warning offers *change item* or *continue* (= override flag at assignment creation); the check runs when the article number is known and the lookup matched an item (§8.5).

**Round 5 — 2026-09-21 — match-preview handoff v2 folded; status back to COLLABORATING.**
- §8.5 replaced with the delivered contract (path, request, the three driving response fields, stored-wins rule, advisory check, no caching). HC-2 names the second handoff; HC-6 updated.
- Verified in the backend: the item lookup serialises `properties` for both sources, so "pass the lookup's properties through unchanged" is buildable. The frontend's `ItemLookupResultSchema` comment saying the endpoint "does not serialize it yet" is stale.
- Resolved by the shaper (repo/handoff-derivable): `task_id` always null; one identifier, article number preferred; override goes on the first create call (handoff §6) while the 409 path stays as a fallback; the two backend-OPEN points are absorbed by one tolerant schema/mapper and an envelope-agnostic parser rather than guessed.
- Proposed (shaper's): `checks[]` not displayed; a failed preview never blocks creation; the "stored" note.
- **Conflict raised, not resolved:** the owner's trigger ("on a lookup match") and round 3's "no check when the lookup finds nothing" versus the handoff's statement that the no-item case is what the endpoint exists for → card 11. The round-3 line is suspended until answered.

**Round 6 — 2026-09-21 — owner (David): card 11 → A; status → READY_FOR_RATIFICATION.**
- The match preview runs whenever category and quantity are known, lookup match or not (§8.4 step 1, §8.5, M5). Round 3's "no check when the lookup finds nothing" is **struck** — superseded by the owner's answer ("both lookup and not look up are protected by the matcher first").
- Shaper's consequence, stated for review: submit in stock mode waits for the latest preview to answer or fail.
- Ratification surface re-presented in chat with the round 5–6 changes. **Not ratified until the owner says so.**

**Round 7 — 2026-09-21 — RATIFIED by the owner (David Loorenz).**
- The owner's words: "we can rattified the intention".
- Ratification surface presented (round 3 in full, re-presented in round 6 with the round 5–6 deltas): the intended outcome; the measurement ledger M1–M7 verbatim, M5 as amended in round 6 ("a match preview always precedes creation, with or without a lookup match…"); scope boundaries (ships / not in this build); open decisions: none; the shaper's remaining proposals listed for striking (`checks[]` not displayed; the "stored" note; a failed preview never blocks creation; submit waits for the latest preview; opening bucket decided once at page open; over-fulfilment clamps; instance deletion and consistency/repair deferred) — none struck.
- Standing owner assumptions carried into planning: `item_category.image_url` is delivered by the backend (owner is arranging it); match-preview field names and envelope remain backend-OPEN and are tolerated by design.
- Next gate: mechanism-inventory (seeds in §13).

**Post-ratification amendment — 2026-09-21 — owner (David): §12A added.**
- Two phases only (one Claude UI, one Codex logic) — approved by the owner; charter sizing exception recorded for the planner.
- The match warning is a stock-report-owned bottom-sheet surface injected into task creation; a spinner shows while checking (owner). The shaper's earlier "generic panels inside task-creation" suggestion is withdrawn. Not a semantic change; status remains RATIFIED.
- Same day, owner confirmations: the inline spinner approach is accepted (a sheet on every success was judged intrusive by the owner); the sheet is **not dismissable** — the user must choose (A6); *Change item* also clears every lookup-filled field (A7). A6a is the shaper's consequence. No item in §12A is pending.

**Post-ratification amendment — 2026-09-21 — architecture alignment audit: §12B added.**
- 24 corrections (B1–B24) from an audit against the architecture contracts and the touched code; each cites its evidence. They change mechanisms and repo facts, not user-visible behaviour. Notable: the error-detail gap in api-client (B1), the flat event envelope (B4), handlers-only-touch-cache (B5), move-not-drop on priority change (B6), PullToRefresh registration (B10), gate enforcement in a staged form (B12), the exact lookup-written fields (B13), preview as an action hook (B15). A4 narrowed: the UI phase no longer touches `@beyo/task-creation` (B12).
- Two rows carry an owner question and are marked ⚠: B7 (Back on the locked match sheet = *Change item*) and B8 (the real cost of card 9 → a view mode in `@beyo/tasks`). Status remains RATIFIED; both are raised in chat.

**Post-ratification amendment — 2026-09-21 — owner (David): B7 and B8 closed.**
- B7: the owner asked why locking cannot simply be a flag set from the open call. It can: the shaper's "deeper surgery" wording overstated it — Back is neutralised by re-pushing the history entry when the top surface is locked. Ships as a general `dismissible: false` open-option in `@beyo/ui` covering swipe, backdrop, Escape and Back; "Back = Change item" withdrawn.
- B8 → option B: the workers' task-detail registration and its read-only view are deferred to the owner's next project; card 3 → C and card 9 are superseded for this build; M1 and the must-ship list updated. This narrows scope for one role's one tap; the owner made the call, status remains RATIFIED.

**Post-ratification amendment — 2026-09-21 (evening) — backend contract v2 adopted.**
- HC-2 now points at `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_v2_20260921.md`; the first api handoff is archived. The match-preview v2 handoff stays current. No section of this document changes meaning; v2 confirms the assumptions the build rested on and settles the ones that were open:
  - `item_category.image_url` is always present, `string | null` (owner assumption → contract).
  - Match preview is VERIFIED: standard success envelope, pinned field names, `item_category_id`, `properties` and `quantity` required, `checks[]` of exactly nine. Consequence for §8.5: the preview is never sent before a category is chosen; branch on `can_proceed`, never on `refusal_reason` (advisory `item_already_assigned` may fill it while proceeding). The envelope-agnostic parser of §12 is no longer needed.
  - Assignment `item` (7 keys) and `task` (12 keys) are VERIFIED; six assignment states including `resolved_early` (a success state).
  - Events: v2 §7 lists the builders' `extra` fields, but the wire payload is flat — `socket_handler.py` sends `{"client_id", **extra}` — so B4 stands unchanged.
  - Auth and body-shape failures are `{detail}` with no `ok` key at 401/403/422 alike (v2 §2.3); B1's api-client rule is "no `ok` → detail response", for any status.
  - Row reorder refusals (`STOCK_REPORT_ROW_HAS_NO_PRIORITY`, `STOCK_REPORT_TARGET_OUT_OF_RANGE`) arrive in the plain `{error, ok:false}` shape; the UI prevents both cases and never parses the text (§8.2 unchanged).
  - `DELETE /items/{id}` and the consistency/repair routes exist; they remain out of scope (§10).
- Status remains RATIFIED.
