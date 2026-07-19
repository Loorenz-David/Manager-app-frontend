# PLAN_upholstery_grouping_lists_20260718

## Metadata

- Plan ID: `PLAN_upholstery_grouping_lists_20260718`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-18T00:00:00Z`
- Last updated at (UTC): `2026-07-18T21:05:00Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_upholstery_grouping_20260718`
- Intention plan: n/a (direct implementation request from backend handoff)

## Goal and intent

- Goal: Let users optionally group the **task list** and the **working-section task-steps list** by upholstery. When enabled, the flat paginated list is visually sectioned: a header card (fabric image on the left, upholstery name on the right, no background) is rendered before each contiguous group of rows that share the same upholstery. Rows with no upholstery fall into a trailing "Upholstery not selected" section.
- Business/user intent: Workers and managers scanning long lists want to see all items sharing a fabric together, so they can batch mental context (and, in a later iteration, act on shared inventory). The server already re-orders and annotates rows; the frontend only needs to opt in via a query param and render the section headers.
- Non-goals:
  - No use of the extra inventory fields (`upholstery_group_inventory`, condition, meters) in the UI yet — they are parsed and threaded but not rendered. (Explicitly deferred to a later iteration per the request.)
  - No change to pagination, sorting, existing filters, or the row cards themselves.
  - No new backend work — the `group_by_upholstery` param and response fields already exist.
  - No grouping on any other list surface (only the two named endpoints).

## Scope

- In scope:
  - `@beyo/tasks` list surface: `GET /api/v1/tasks` with `group_by_upholstery=true`, grouped rendering in `TasksView`, on/off toggle in `TaskFilterSheetPage`, persisted preference.
  - Workers-app task-steps surface: `GET /api/v1/working-sections/{id}/steps` with `group_by_upholstery=true`, grouped rendering in `WorkingSectionStepsView` (both normal and batch list branches), on/off toggle in `StepStateFilterSheetPage`, persisted preference.
  - A shared, reusable grouping primitive set in `@beyo/upholstery`: response-field schema, group-header view model, a pure "flat list → sectioned render list" builder, and the `UpholsteryGroupHeaderCard` component (Avatar-based).
- Out of scope:
  - Inventory-amount rendering, tap-through on the header, navigation to the master upholstery.
  - Infinite-scroll changes; the tasks list keeps its "Load more" pagination and the steps list keeps its single-page (limit 50) fetch.
- Assumptions:
  - Both endpoints send all four `upholstery_group_*` fields as `null` when the param is omitted/false (per handoff §"When `group_by_upholstery` is omitted"), so schema fields are additive and backward compatible.
  - The tasks flow concatenates every fetched page in order before grouping, so the handoff's "carry `currentKey` across pages" caveat is satisfied automatically by grouping over the flattened list (no per-page header emission).
  - `@beyo/upholstery` is a safe home for shared code: both `@beyo/tasks` and `workers-app` already depend on it, and it does not depend on either (no import cycle).
  - `Avatar` is already exported from `@beyo/ui` (`export * from "./components/primitives/avatar"`).

## Clarifications required

These are resolved with defaults so the plan is not blocked; flag before coding only if a default is wrong.

- [ ] Persist scope — **Default: two independent `localStorage` keys**, one per surface (`beyo.tasksList.groupByUpholstery`, `beyo.workingSectionSteps.groupByUpholstery`). A worker's step-list preference and a manager's task-list preference are independent contexts. Alternative: one shared key.
- [ ] Should the grouping toggle count toward the filter badge (`activeFilterCount`)? **Default: no** — grouping is a view mode, it does not hide/reduce rows, so it should not light up the "filters active" badge.
- [ ] "No upholstery" header visual when `upholstery_group_image_url` is `null` — **Default: render `Avatar` with no `imageSrc`** (falls back to the neutral `ImagePlaceholder`, not the "UN" initials of the label) and the label text "Upholstery not selected". Confirm the exact label wording/casing.
- [ ] Apply headers in the **batch-selection** branch of the steps list too? **Default: yes** — consistency; the header is a non-selectable divider row.

## Acceptance criteria

1. Toggling "Group by upholstery" ON in the task filter sheet re-requests `GET /api/v1/tasks?group_by_upholstery=true&…` (all existing params preserved) and renders a header card before each upholstery group; the "Upholstery not selected" section renders last.
2. Toggling ON in the step-state filter sheet re-requests `GET /api/v1/working-sections/{id}/steps?group_by_upholstery=true&…` and renders grouped headers in both the normal and batch list branches.
3. The preference persists across reloads per surface (default OFF on first ever visit); toggling OFF removes headers and returns the list to the previous ordering.
4. Each header renders the fabric image (via `Avatar`) on the left and the upholstery name on the right, with no card background; a `null` key renders "Upholstery not selected".
5. Across a group that spans a `Load more` page boundary on the task list, no duplicate header is emitted (verified by grouping over the concatenated page list).
6. With grouping OFF, the four response fields are ignored, ordering/behavior is byte-for-byte unchanged, and `activeFilterCount` is unaffected.
7. `npm run typecheck` is clean; new unit tests for the grouping builder pass.

## Contracts and skills

### Contracts loaded

Core (always): `01_architecture.md`, `02_types.md`, `04_api_client.md` (+ `04_api_client_local.md`), `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`.

Added from guide:
- `24_dto.md` — trigger "view model", "toXxxViewModel": the grouping builder + header view model is a pure DTO/view-model transform over raw response rows.
- `07_components.md` — the presentational `UpholsteryGroupHeaderCard` (context-free, prop-driven).
- `26_persistence.md` — trigger "persistence", "localStorage": the on/off preference is persisted client-side.
- `35_shared_packages.md` — placing the reusable builder + component in `@beyo/upholstery` and consuming from `@beyo/tasks` and `workers-app` (package boundary; no picker/surface injection needed here).

### Local extensions loaded

- `04_api_client_local.md`: confirms envelope + error shape used by `apiClient.get`; the two API functions already follow it. No new error cases (handoff §"Error cases": only a `422` on unparseable bool, already handled generically).

### File read intent — pattern vs. relational

All implementation reads performed for this plan were **relational** (what exists), not pattern reads:
- `types.ts` of tasks + workers task_steps — exact field names, VM shapes, param types (legitimate: return shapes / field names).
- `list-tasks.ts` / `fetch-working-section-steps.ts` — how params are currently serialized.
- `use-tasks-page.flow.ts`, `use-working-section-steps.controller.ts` — how the flat list is currently built and where to interleave headers.
- `TasksView.tsx` / `WorkingSectionStepsView.tsx` — current render mapping.
- `TaskFilterSheetPage.tsx` / `StepStateFilterSheetPage.tsx` + surface-id prop types — how apply flows back.
- `shopify-product-sync-storage.ts`, `use-more-tab-last-selected.ts` — the established localStorage helper convention (relational: existing behavior).
- `Avatar.tsx`, `getUpholsteryImageUrl`, `UPHOLSTERY_INVENTORY_CONDITION` — existing primitives to reuse.

No action-hook / provider / other-DTO pattern reads were needed.

### Domain schemas consulted

- `packages/tasks/src/types.ts`: `TaskListItemRawSchema` (raw row), `TaskCardViewModel`, `ListTasksFullParams` — target of the 4 additive fields + param.
- `apps/workers-app/.../task_steps/types.ts`: `TaskStepSchema` (raw row, reused by `ReassignmentStepSchema`), `TaskStepCardViewModel`, `ListWorkingSectionStepsParams`.
- `packages/upholstery/src/types.ts`: `UPHOLSTERY_INVENTORY_CONDITION`, `nullableMetersValue` (decimals-as-strings), `getUpholsteryImageUrl` — reused for the inventory schema and thumbnail sizing.

### Skill selection

- No repo skill required; standard feature edit. Validation uses the existing Playwright/vitest harness (`34_runtime_validation_local.md`).

## Implementation plan

### A. Shared primitives in `@beyo/upholstery`

1. **Grouping schema + types** (`packages/upholstery/src/upholstery-grouping.ts`, new):
   - `UpholsteryGroupInventorySchema` — mirror the handoff inventory object, reusing `UPHOLSTERY_INVENTORY_CONDITION` for `inventory_condition` and `nullableMetersValue` for the four `*_meters` decimals-as-strings; `client_id`, `upholstery_id` strings.
   - `UpholsteryGroupFieldsSchema` — the four additive fields, each `nullable`, wrapped so raw rows validate whether or not the param was sent:
     - `upholstery_group_key: z.string().nullable().optional().default(null)`
     - `upholstery_group_image_url: z.string().nullable().optional().default(null)`
     - `upholstery_group_upholstery_id: z.string().nullable().optional().default(null)`
     - `upholstery_group_inventory: UpholsteryGroupInventorySchema.nullable().optional().default(null)`
   - Export `type UpholsteryGroupFields` and `type UpholsteryGroupInventory`.
   - `type UpholsteryGroupHeaderViewModel = { reactKey: string; label: string; imageUrl: string | null; upholsteryId: string | null; inventory: UpholsteryGroupInventory | null }`.
   - `NO_UPHOLSTERY_LABEL = "Upholstery not selected"`.
2. **Pure grouping builder** (same file):
   - `type UpholsteryGroupedRow<T> = { kind: "header"; header: UpholsteryGroupHeaderViewModel } | { kind: "row"; row: T }`.
   - `buildUpholsteryGroupedRows<T>(rows: T[], getGroup: (row: T) => UpholsteryGroupFields): UpholsteryGroupedRow<T>[]` — single pass over the already-ordered list; emit a header whenever `upholstery_group_key` changes vs. the previous row (exact string equality, `undefined` sentinel for "before first row" per the handoff recipe), then push each row. `reactKey = upholstery_group_upholstery_id ?? key ?? "__no_upholstery__"`; `label = key ?? NO_UPHOLSTERY_LABEL`. The builder is only ever called when grouping is enabled.
3. **Header component** (`packages/upholstery/src/components/UpholsteryGroupHeaderCard.tsx`, new):
   - Props: `{ header: UpholsteryGroupHeaderViewModel; testId?: string }`.
   - Renders a `flex items-center gap-3 px-4 py-2` row (no background). `Avatar` on the left: `name={header.label}`, `imageSrc={getUpholsteryImageUrl(header.imageUrl, { width: 44, height: 44, fillCanvas: true })}` (nevotex URLs get thumbnailed, backend URLs pass through; `null` → placeholder). Name on the right: `text-sm font-semibold text-foreground truncate`.
   - `data-testid="upholstery-group-header"`.
4. **Public API** (`packages/upholstery/src/index.ts`): export the schema, types, `NO_UPHOLSTERY_LABEL`, `buildUpholsteryGroupedRows`, and `UpholsteryGroupHeaderCard`.
5. **Unit test** (`packages/upholstery/src/upholstery-grouping.test.ts`): builder emits one header per contiguous key, collapses repeated keys, places `null` bucket wherever it appears in the input order (server guarantees last), and produces stable `reactKey`s.

### B. Tasks list surface (`@beyo/tasks`)

6. **Param plumbing**:
   - `ListTasksFullParams` (types.ts): add `group_by_upholstery?: boolean`.
   - `list-tasks.ts`: `if (params.group_by_upholstery != null) queryParams.group_by_upholstery = params.group_by_upholstery;`
7. **Raw schema** (types.ts): `TaskListItemRawSchema` `.extend(UpholsteryGroupFieldsSchema.shape)` (or spread the four fields) so rows carry the group fields.
8. **View model**: add `upholsteryGroup: UpholsteryGroupFields` to `TaskCardViewModel`; populate it in the flow when building each card (read the four fields off the raw list item).
9. **Preference store + persistence**:
   - New `packages/tasks/src/lib/grouping-preference-storage.ts` following `shopify-product-sync-storage.ts` (zod-validated read/write, `beyo.tasksList.groupByUpholstery`, SSR-guarded).
   - `tasks-page.store.ts`: add `groupByUpholstery: boolean` + `setGroupByUpholstery`; hydrate `INITIAL_STATE.groupByUpholstery` from the storage read (default `false`); the setter writes through to storage. Keep `groupByUpholstery` out of `reset()`'s cleared set (or re-read from storage in reset) so a reset does not silently flip a persisted view mode. `reset()` is currently unused, but preserve intent.
10. **Flow** (`use-tasks-page.flow.ts`):
    - Pull `groupByUpholstery` from the store; add `...(groupByUpholstery ? { group_by_upholstery: true } : {})` to `params` (so the query key changes and TanStack refetches into a separate cache entry).
    - After building `cards`, expose `renderRows: buildUpholsteryGroupedRows(cards, (c) => c.upholsteryGroup)` when `groupByUpholstery`, else `cards.map((card) => ({ kind: "row", row: card }))`. Return both `cards` (kept for length/skeleton checks) and `renderRows`.
11. **Controller** (`use-tasks-view.controller.ts`): surface `groupByUpholstery` and `setGroupByUpholstery`; keep `activeFilterCount` unchanged (grouping excluded). In `openFilterSheet`, pass current `groupByUpholstery` and extend `onApply` to also set it.
12. **Surface props** (`surface-ids.ts`): extend `TaskFilterSheetSurfaceProps` to `{ selectedItemPosition; groupByUpholstery; onApply: (itemPosition: string, groupByUpholstery: boolean) => void }`.
13. **Filter page** (`TaskFilterSheetPage.tsx`): add a single on/off `BoxPicker` (`mode="multiple"`, one option `{ value: "on", label: "Group by upholstery", testId: "task-filter-group-upholstery" }`, `value={local ? ["on"] : []}`, `onValueChange={(v) => setLocal(v.includes("on"))}`). Local state seeded from `groupByUpholstery`; `handleApply` passes `(itemPosition, groupByUpholstery)`.
14. **View** (`TasksView.tsx`): map `controller.renderRows` instead of `controller.cards`; `header` → `UpholsteryGroupHeaderCard`, `row` → the existing `TaskListCard` block unchanged. Skeleton/empty conditions keep using `controller.cards.length`.

### C. Working-section steps surface (workers-app)

15. **Param plumbing**: `ListWorkingSectionStepsParams` (task_steps/types.ts): add `group_by_upholstery?: boolean`. `fetch-working-section-steps.ts` already spreads `...queryParams`, so no change there (booleans are already passed, e.g. `upholstery_search`).
16. **Raw schema**: `TaskStepSchema` `.extend(UpholsteryGroupFieldsSchema.shape)`. Safe for `ReassignmentStepSchema`/detail/last-active reuse (fields are optional-nullable-defaulted).
17. **View model**: add `upholsteryGroup: UpholsteryGroupFields` to `TaskStepCardViewModel`; populate in `toTaskStepCardViewModel`.
18. **Preference + persistence**: new `apps/workers-app/.../task_steps/lib/grouping-preference-storage.ts` (key `beyo.workingSectionSteps.groupByUpholstery`, same convention).
19. **Controller** (`use-working-section-steps.controller.ts`):
    - `const [groupByUpholstery, setGroupByUpholstery] = useState(readGroupingPreference)`; setter also writes storage.
    - Add `...(groupByUpholstery ? { group_by_upholstery: true } : {})` to `queryParams` (changes `taskStepKeys.sectionList` key → refetch).
    - Expose `renderRows` = `buildUpholsteryGroupedRows(steps, (s) => s.upholsteryGroup)` when enabled, else `steps.map((row) => ({ kind: "row", row }))`. Keep `steps` for length/empty checks.
    - `handleOpenStateFilter`: pass `selectedGroupByUpholstery` and extend `onApply` to set it. Keep `activeFilterCount` unchanged.
20. **Surface props** (`surface-ids.ts`): extend `StepStateFilterSheetSurfaceProps` with `selectedGroupByUpholstery: boolean` and a 5th `onApply` arg `groupByUpholstery: boolean`.
21. **Filter page** (`StepStateFilterSheetPage.tsx`): add the same single on/off `BoxPicker` (testId `step-filter-group-upholstery`) below the item-position field; seed local state; pass through in `handleApply`.
22. **View** (`WorkingSectionStepsView.tsx`): in both list branches (batch + normal), map `renderRows`: `header` → `UpholsteryGroupHeaderCard`, `row` → the existing `BatchSelectableTaskStepCard` / `TaskStepCard` block. Empty/skeleton keeps using `steps.length`.

### D. Wiring / exports

23. Confirm `@beyo/upholstery` new exports resolve in both consumers; run `npm run typecheck` at root.

## Risks and mitigations

- Risk: Adding fields to `TaskStepSchema` breaks a reuse site (reassignment `/pending`, last-active, detail) that does not send them.
  Mitigation: fields are `optional().nullable().default(null)` — zod validates absent keys to `null`; no runtime break.
- Risk: Header duplicated across a `Load more` boundary on the task list.
  Mitigation: build the grouped list over the **flattened, concatenated** page array in one pass (not per page), which is exactly what the handoff recipe requires; covered by acceptance criterion 5 and a unit test.
- Risk: `Avatar` uses a plain `<img>` (no backend presign/transform) while other upholstery images use `BackendImage`.
  Mitigation: the handoff delivers a ready-to-use full `upholstery_group_image_url`; pass it through `getUpholsteryImageUrl` for nevotex sizing. If backend presign turns out to be required, revisit by swapping the header image element — isolated to `UpholsteryGroupHeaderCard`.
- Risk: Grouping accidentally applied when OFF (every row has `null` key → one giant "Upholstery not selected" section).
  Mitigation: builder is gated on the `groupByUpholstery` flag; when OFF, rows are mapped to `{ kind: "row" }` with no headers.
- Risk: Query-key churn causes a loading flash when toggling.
  Mitigation: both queries use `keepPreviousData`, so the previous list stays visible during the grouped refetch.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across `@beyo/upholstery`, `@beyo/tasks`, `workers-app`.
- `npm run test -- upholstery-grouping`: builder unit tests pass (contiguous grouping, collapse, null bucket, stable keys).
- Manual/Playwright (per handoff validation notes) on a workspace with items on ≥2 upholsteries plus one item with none:
  - `npx playwright test --grep "task.*group" --project=mobile` / `--project=desktop`: toggle ON in the task filter sheet → headers appear, "Upholstery not selected" last; `Load more` continues a group without a duplicate header; toggle OFF → headers gone, ordering restored; preference survives reload.
  - Workers steps list: toggle ON in the step-state filter sheet → headers in normal and batch branches; preference persists.

## Review log

- `2026-07-18` `owner`: initial draft from backend handoff.

## Lifecycle transition

- Current state: `archived`
- Next state: `—` (implemented + summarized; runtime validation follow-up pending)
- Transition owner: `claude`
