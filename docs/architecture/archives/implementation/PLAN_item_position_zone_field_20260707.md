# PLAN_item_position_zone_field_20260707

## Metadata

- Plan ID: `PLAN_item_position_zone_field_20260707`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-07T13:00:00Z`
- Last updated at (UTC): `2026-07-07T13:02:23Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_item_zone_batch_position_update_and_location_search_20260707`
- Intention plan: `none (direct request)`

## Goal and intent

- Goal: Introduce a new `ItemPositionZoneField` component in `@beyo/items` that follows the same UI/interaction principles as `ItemIdentityField` (tab switcher + animated single-input panel), but edits `item.item_position` ("Wagon") and `item.item_zone` ("Zone"). The Zone tab performs a self-owned, debounced lookup against the newly documented `GET /api/v1/location-tracker/items/location` endpoint, seeded by an item identity (SKU prioritized, article number fallback) injected by the parent. Replace the legacy numeric `ItemPositionField` in `InternalFormContent`, `PreOrderFormContent`, and `ReturnFormContent` with this new field. Add `item_zone` to every schema that currently carries `item_position` on the write/read path this feature touches. Finally, rework the position preview on `TaskDetailSlidePage` (package) and the workers-app `TaskDetailSlidePage` to show `{Zone} | #{Position}` (no icon, zone capitalized, divider line), tappable per-side to open the same field pre-selected on the tapped side, with the external lookup suppressed when opened from the preview/edit sheet.
- Business/user intent: Let workers/managers find and record an item's physical zone directly from the external location tracker instead of manual-only entry, while keeping the existing manual "Wagon" position editing flow intact and backward compatible.
- Non-goals:
  - No changes to the positions-board / bulk zone-drag UI (out of scope per handoff item 1; only the single-item edit sheet and task-creation forms are touched here).
  - No change to `WorkerInternalFormContent` (it never rendered `ItemPositionField` and is not named in scope).
  - No change to the managers-app `testing_forms` harness's own local `ItemPositionField.tsx`/`ItemDetailsFieldGroup.tsx` beyond the minimal default-value addition needed to keep it compiling against the widened shared schema.
  - No change to the legacy, dead `apps/managers-app/.../features/tasks/types.ts` (`TaskDetailRawSchema`/`TaskListItemRawSchema`) or the orphaned `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx` — confirmed unreferenced (see Risks).

## Scope

- In scope:
  - `packages/items`: types, new API fetch/hook, new field component, new preview component, rewritten `ItemPositionSheetPage`, surface prop types, public API (`index.ts`). Delete now-dead `ItemPositionField.tsx` and `ItemPositionPill.tsx`.
  - `packages/tasks`: `TaskDetailRawSchema`/`TaskListItemRawSchema` types, `use-update-item-position` action, `TaskBodyCategoryRow`, `use-task-detail.controller`, `TaskDetailSlidePage` wiring.
  - `packages/task-creation`: `InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent`, `normalize-task-form-payload.ts`, `addSeatPositionIssue` type in `types.ts`.
  - `apps/workers-app`: `features/task_steps/types.ts` (`ItemSnapshotSchema`), `features/items/actions/use-update-item-position.ts`, `features/task_steps/controllers/use-task-step-detail.controller.ts`, `pages/task_steps/TaskDetailSlidePage.tsx` (`TaskStepCategoryPositionRow`).
  - `apps/managers-app`: `features/items/types.ts` (live `ItemSchema`/`CreateItemInputSchema`/`UpdateItemInputSchema`/`ItemDetailsFieldsSchema`/`toOptimisticItem`), `features/pending-upholstery/types.ts` (`PendingSeatRawItemSchema` + `toItemFromPendingRaw`), `features/testing_forms/components/TestingFormsContent.tsx` (default value only).
  - Playwright: rework `apps/managers-app/.../tests/playwright/features/tasks/item-position-sheet.spec.ts` to cover both tabs, the new testids, and the location-tracker mock route.
- Out of scope:
  - Backend (already delivered per handoff).
  - Positions-board bulk zone-drag UI.
  - `WorkerInternalFormContent`.
  - Any Playwright spec whose `item_position` reference is only an incidental mock-fixture field with no assertion on it (`working-sections-field.spec.ts`, `upholstery-swap.spec.ts`, `case-composer.spec.ts`, `cases-page.spec.ts`, `upholstery-reorder.spec.ts`) — adding `item_zone: null` to those fixtures is optional/cosmetic since these mocks are not `.strict()`-parsed; not required for green tests.
- Assumptions:
  - The task/item **creation** payload (`POST` via `useCreateTask` → backend task-creation endpoint) accepts `item_zone` as a normal item field, analogous to `item_position` — confirmed by the user (2026-07-07): the task-creation endpoint already accepts `item_zone`.
  - "Precise match" (handoff wording) means: filter the location-tracker response array to entries whose `item_article_number`/`sku` exactly equals (after trim, and article-number zero-padding normalization) the identity value that was queried, then take the first of those.
  - The new field does not persist its active tab in `localStorage` (unlike `ItemIdentityField`) — "the parent can control which input field should render on load" is read as: initial tab is fully determined by a `defaultTab` prop on every mount, with no cross-session memory.

## Clarifications required

- [x] Does the task-creation endpoint's `item` payload accept an `item_zone` key today (mirroring `item_position`)? — **Resolved (2026-07-07, user):** yes, the task-creation endpoint already accepts `item_zone`. No backend follow-up needed for the creation path.
- [ ] When saving from the position/zone edit sheet (`ItemPositionSheetPage`), should editing `item_position` alone continue to always send `item_position` in the same call (as today), while `item_zone` is included in the request **only if the user actually edited the Zone tab** (dirty-only, so we don't force an unnecessary external location-tracker push on every save)? Plan assumes yes — confirm this doesn't surprise anyone relying on "every save quietly re-syncs zone."

## Acceptance criteria

1. `ItemPositionZoneField` renders a `BoxSlidePicker` with "Zone" / "Wagon" tabs; the initially selected tab is controlled by a `defaultTab` prop passed by the parent, not by internal storage.
2. On the Zone tab, with `disableLookup` not set, typing/holding a debounced non-empty SKU (or, absent SKU, article number) triggers `GET /api/v1/location-tracker/items/location?q=<value>`; when the response contains a precise match on the queried identity, the first such match's `item_position` value auto-fills `item.item_zone` (only while the zone field is not already dirty from a manual edit).
3. `InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent` all render `ItemPositionZoneField` instead of `ItemPositionField`, injecting `articleNumber`/`sku` from their own watched `item.article_number`/`item.sku`. `ReturnFormContent` passes `defaultTab="zone"`; the other two pass `defaultTab="position"`.
4. `PATCH /api/v1/items/positions` requests built from the edit sheet include `item_zone` in an entry only when the zone value was actually changed in that session; `item_position` is always included as before.
5. `TaskBodyCategoryRow` (package) and `TaskStepCategoryPositionRow` (workers-app) render `{Zone (capitalized)} | #{Position}` with a visual divider, no icon, and tapping either half opens the edit sheet pre-selected on the tapped field with the external lookup disabled.
6. Every schema in scope (`packages/items`, `packages/tasks`, `apps/workers-app` task-step item snapshot, `apps/managers-app` items/pending-upholstery) that carries `item_position` also carries an optional/nullable `item_zone` of matching nullability.
7. `npm run typecheck` is clean across `packages/items`, `packages/tasks`, `packages/task-creation`, `apps/workers-app`, `apps/managers-app`.
8. Updated/added Playwright spec passes for both the Zone and Wagon tabs of the edit sheet.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries (components never import the logic layer; field stays a pure context consumer).
- `architecture/02_types.md`: schema/type authoring conventions for the widened `ItemDetailsFieldsSchema`, `UpdateItemInput`, `UpdateItemPositionEntryInput`, and the new `ItemLocationResult` type.
- `architecture/04_api_client.md`: HTTP boundary rules for the new `fetchItemLocation` GET call (envelope schema, query param passthrough).
- `architecture/05_server_state.md`: query hook conventions for `useItemLocationQuery` (query key shape, `enabled`, `staleTime`, `retry`), mirrored from `useItemLookupQuery`.
- `architecture/06_client_state.md`: local component state rules for the field's active-tab state and the sheet's local form state.
- `architecture/08_hooks.md`: action/mutation rules for extending `useUpdateItemPosition` (packages/tasks and workers-app) with optimistic cache updates that now also branch on `item_zone`.
- `architecture/13_errors.md`: error propagation for the location lookup query (non-blocking failure — field stays manually editable).
- `architecture/15_feature_structure.md`: file placement inside `packages/items/src/{types,api,components,pages}`.
- `architecture/16_feature_workflow.md`: build order (types → query keys → api/hooks → actions → controllers → components → forms → pages → tests → Playwright).
- `architecture/07_components.md`: field component structure, consuming `useFormContext`/`useController` like `ItemIdentityField`.
- `architecture/09_forms.md`: form field registration/validation pattern (`item.item_position`, `item.item_zone`), and the local `useForm`+`FormProvider` wrapper needed inside `ItemPositionSheetPage` since the field requires form context but the sheet has no parent RHF form.
- `architecture/10_pages.md`: surface page component conventions for the rewritten `ItemPositionSheetPage`.
- `architecture/24_dto.md`: mapping the external location-tracker response (`item_article_number`, `sku`, `item_position`) into the precise-match selection used to fill `item.item_zone`.
- `architecture/28_surfaces.md`: surface prop/typing conventions for `ItemPositionSheetSurfaceProps` (adding `initialZone`, `openField`, revised `onSave`).
- `architecture/35_shared_packages.md` §13: `ItemPositionSurfaceOpeners` callback-injection shape — must stay in sync with the revised `onSave` signature.
- `architecture/35_shared_packages.md` §14: `ItemPositionSheetPage` remains a plain named export consumed via `lazyWithPreload`/`module.ItemPositionSheetPage` in three apps' `surfaces.ts` — the rewrite must not break that dynamic-import boundary.
- `architecture/17_testing.md`: Vitest coverage for the new field/hook and the DTO-style precise-match filter.
- `architecture/34_runtime_validation.md`: Playwright conventions (fixtures, `data-testid`, route mocking).

### Local extensions loaded

- `architecture/04_api_client_local.md`: confirms the flat-error/`ApiEnvelopeSchema` shape used by `fetch-item-lookup.ts` also applies to the new `fetch-item-location.ts`.
- `architecture/28_surfaces_local.md`: confirms `sheet` is an allowed active surface type for `ITEM_POSITION_SHEET_SURFACE_ID` (already the case today).
- `architecture/34_runtime_validation_local.md`: bootstrapped fixture/helper paths (`../../fixtures/app-fixture`), credential env vars, and the `data-testid` convention used to extend `item-position-sheet.spec.ts`.

### File read intent — pattern vs. relational

Already applied during research for this plan:
- Read `ItemIdentityField.tsx` (relational: what the tab/animation pattern actually looks like today, since the new field must match it) and `ItemPositionField.tsx`/`ItemPositionPill.tsx`/`ItemPositionSheetPage.tsx` (relational: what exists today, about to be replaced).
- Read `types.ts` in `packages/items`, `packages/tasks`, `packages/task-creation`, `apps/workers-app/features/task_steps`, `apps/managers-app/features/items` and `features/pending-upholstery` (relational: exact field names/nullability — domain grounding).
- Read `normalize-task-form-payload.ts`, the two `use-update-item-position.ts` actions, both controllers, and both `TaskDetailSlidePage.tsx` files (relational: exact wiring being replaced).
- Confirmed via grep that `apps/managers-app/.../features/tasks/types.ts` and `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx` are unreferenced dead code (managers-app now consumes `loadTaskDetailSlidePage` from `@beyo/tasks`), so excluded from scope rather than guessed at.
- Did not open any sibling action/provider/DTO file purely to learn "how to write" — those patterns come from the contracts listed above.

### Skill selection

- Primary skill: none of the domain-specific skills under `skills/` apply (only `skills/cross_cutting/*` exist, which govern the planning process itself — `skills/cross_cutting/planning_contract_selection/SKILL.md` describes the contract-selection method already applied above).
- Trigger terms: `form`, `sheet`, `surface`, `dto`, `playwright`.
- Excluded alternatives: none — no domain-specific implementation skill exists in this repo for form-field or surface-page work.

## Implementation plan

1. **`packages/items/src/types.ts`**: change `ItemDetailsFieldsSchema.item_position` from the numeric-coerced schema to `z.string().trim().max(128).optional()`; add `item_zone: z.string().trim().max(128).optional()`. Add `item_zone?: string | null` to `UpdateItemInput` and `UpdateItemPositionEntryInput`. Add `ItemLocationResultSchema` (`item_article_number: z.string().nullable()`, `sku: z.string().nullable()`, `item_position: z.string().nullable()`) and its inferred type, plus `LookupItemLocationParams = { q: string }`.
2. **`packages/items/src/api/item-keys.ts`**: add `location: (params: LookupItemLocationParams) => [...itemKeys.all, "location", params] as const`.
3. **`packages/items/src/api/fetch-item-location.ts`** (new): `apiClient.get("/api/v1/location-tracker/items/location", envelope-wrapped array schema, { q })`, returning `{ items: ItemLocationResult[] }`, mirroring `fetch-item-lookup.ts`.
4. **`packages/items/src/api/use-item-location-query.ts`** (new): `useQuery({ queryKey: itemKeys.location(params), queryFn: () => fetchItemLocation(params), enabled, staleTime: 0, retry: false })` (short/no stale time — this reads live external tracker state).
5. **`packages/items/src/components/ItemPositionZoneField.tsx`** (new): mirror `ItemIdentityField`'s tab/animation structure.
   - Tabs: `["zone", "position"]`, labels `"Zone"` / `"Wagon"`, no `localStorage` persistence.
   - Props: `{ defaultTab?: "zone" | "position"; articleNumber?: string | null; sku?: string | null; disableLookup?: boolean }`.
   - Registers `item.item_zone` and `item.item_position` via `useFormContext` + `useController` (its own fields), plain `TextInput` (no numeric keyboard).
   - Identity used for lookup: `sku?.trim()` if non-empty, else the article-number normalization helper reused from `ItemIdentityField` (extract `normalizeArticleNumberForLookup` to a small shared util or duplicate the trivial padding logic locally — prefer extracting to `packages/items/src/lib/normalize-article-number.ts` and importing it from both `ItemIdentityField` and the new field to avoid duplication).
   - Debounce identity value 400ms (same pattern as `ItemIdentityField`); `enabled = !disableLookup && activeTab === "zone" && identity.length > 0`.
   - On successful response: filter to entries where `sku === identity` (if searching by sku) or `item_article_number === identity` (if searching by article number, after the same normalization); take `matches[0]`; if `item.item_zone` is currently empty/untouched (`!formState.dirtyFields.item.item_zone` and current value falsy), call `field.onChange(match.item_position)`. Track last-applied query signature (article/sku + result) in a ref to avoid redundant re-sets, mirroring `lastAppliedLookupSignatureRef` used in the form contents.
   - Show a small loading spinner as `rightIcon` while fetching on the Zone tab; no scanner button, no success/invalid button states (those are identity-field-specific, not requested here).
6. **`packages/items/src/components/ItemPositionZonePreview.tsx`** (new, replaces `ItemPositionPill`): props `{ zone: string | null; position: string | null; isSeat: boolean; onOpenZone?: () => void; onOpenPosition?: () => void }`. Renders nothing if `!zone && !position && !isSeat` (preserve existing gating). Renders two tappable spans separated by a thin vertical divider (`<span className="h-3 w-px bg-border" />` or similar), left = zone (`className="capitalize"`, fallback `"?"` when `isSeat` and empty, else `null`), right = `#{position}` (fallback `"?"` when `isSeat` and empty). No icon. Each side is its own `<button>` when its `onOpen*` callback is provided, else plain `<span>`.
7. **Delete** `packages/items/src/components/ItemPositionField.tsx` and `packages/items/src/components/ItemPositionPill.tsx` (confirmed zero remaining usages after step 3 of the forms migration and the preview replacement).
8. **`packages/items/src/surface-ids.ts`**: extend `ItemPositionSheetSurfaceProps` to `{ itemId: string; initialPosition: string | null; initialZone: string | null; openField?: "zone" | "position"; onSave: (values: { item_position: string | null; item_zone?: string | null }) => void }` (note `item_zone` optional/omittable — the sheet only includes it when dirtied). Update `ItemPositionSurfaceOpeners` to match.
9. **`packages/items/src/pages/ItemPositionSheetPage.tsx`**: rewrite to wrap `ItemPositionZoneField` in a local `useForm` + `FormProvider` seeded with `{ item: { item_position: initialPosition ?? "", item_zone: initialZone ?? "" } }`, `disableLookup` always `true` (per requirement: opening from the preview must never hit the external API), `defaultTab={openField ?? "position"}`. On save, read `formState.dirtyFields.item.item_zone` to decide whether to include `item_zone` in the `onSave` payload (`undefined` when not dirty so it can be dropped from the eventual JSON body), always include `item_position` (trimmed, `null` if empty).
10. **`packages/items/src/index.ts`**: remove `ItemPositionField`/`ItemPositionPill` exports; add `ItemPositionZoneField`, `ItemPositionZonePreview`, `fetchItemLocation`, `useItemLocationQuery`, and the new types (`ItemLocationResult`, `LookupItemLocationParams`).
11. **`packages/tasks/src/types.ts`**: add `item_zone: z.string().nullable()` to `TaskDetailRawSchema.item` and `TaskListItemRawSchema.primary_item` (immediately after `item_position`).
12. **`packages/tasks/src/actions/use-update-item-position.ts`**: widen `UpdateItemPositionInput` to `{ id: string; item_position: string | null; item_zone?: string | null }`, pass through to `updateItemPositions([{ client_id: id, item_position, item_zone }])`, and extend the optimistic `onMutate` cache patch to also set `item.item_zone` when `item_zone !== undefined`.
13. **`packages/tasks/src/controllers/use-task-detail.controller.ts`**: change `openPositionSheet` to `openPositionSheet(field: "zone" | "position" = "position")`; pass `initialZone: taskDetail?.item?.item_zone ?? null`, `openField: field`; `savePosition` becomes `savePositionAndZone(values)` calling `updateItemPosition.mutate({ id: itemId, item_position: values.item_position, item_zone: values.item_zone })` (spreads through `undefined` untouched).
14. **`packages/tasks/src/components/detail/TaskBodyCategoryRow.tsx`**: replace `onOpenPosition: () => void` prop with `onOpenPositionField: (field: "zone" | "position") => void`; render `ItemPositionZonePreview` with `zone={item.item_zone}` `position={item.item_position}` `onOpenZone={() => onOpenPositionField("zone")}` `onOpenPosition={() => onOpenPositionField("position")}`, keep the existing `isSeatItem` gating.
15. **`packages/tasks/src/pages/TaskDetailSlidePage.tsx`**: update the `TaskBodyCategoryRow` call site to pass `onOpenPositionField={controller.openPositionSheet}`.
16. **`packages/task-creation/src/types.ts`**: change `addSeatPositionIssue`'s parameter type from `{ major_category?: string; item_position?: number | undefined }` to `{ major_category?: string; item_position?: string | undefined }` and its check from `item.item_position == null` to `!item.item_position?.trim()`.
17. **`packages/task-creation/src/components/InternalFormContent.tsx`**, **`PreOrderFormContent.tsx`**, **`ReturnFormContent.tsx`**: replace the `ItemPositionField` import/usage with `ItemPositionZoneField`; `useWatch` the form's own `item.article_number`/`item.sku` and pass as `articleNumber`/`sku` props; set `defaultTab="position"` for Internal/PreOrder and `defaultTab="zone"` for Return; update every `defaultValues`/`form.reset()` item block to use `item_position: ""` (string) instead of `undefined`, and add `item_zone: ""`.
18. **`packages/task-creation/src/lib/normalize-task-form-payload.ts`**: in `buildItemFields`, change `item_position: item.item_position != null ? String(item.item_position) : undefined` to `toOptionalString(item.item_position)`, add `item_zone: toOptionalString(item.item_zone)`, and include both in the `hasAnyItemData` OR-chain.
19. **`apps/workers-app/.../features/task_steps/types.ts`**: add `item_zone: z.string().nullable()` to `ItemSnapshotSchema`.
20. **`apps/workers-app/.../features/items/actions/use-update-item-position.ts`**: widen `UpdateItemPositionInput` and the `updateItemPositions` call the same way as step 12.
21. **`apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts`**: update `openPositionSheet` to accept `field: "zone" | "position"`, pass `initialZone: step.item.item_zone`, `openField: field`, and widen `savePosition`/the `onSave` callback to forward `item_zone` the same way as step 13.
22. **`apps/workers-app/.../pages/task_steps/TaskDetailSlidePage.tsx`**: rework `TaskStepCategoryPositionRow` to render `ItemPositionZonePreview` (same as step 14) with `onOpenZone={() => openPositionSheet("zone")}` / `onOpenPosition={() => openPositionSheet("position")}`, replacing the direct `ItemPositionPill` usage.
23. **`apps/managers-app/.../features/items/types.ts`**: add `item_zone` to `ItemSchema` (`z.string().nullable()`), `CreateItemInputSchema` (`z.string().max(255).optional()`), `UpdateItemInputSchema` (`z.string().max(255).nullable().optional()`); align `ItemDetailsFieldsSchema.item_position` to a plain string (same rationale as step 1, for whichever forms in this app still consume it) and add `item_zone`; update `toOptimisticItem` to copy `item_zone` through.
24. **`apps/managers-app/.../features/pending-upholstery/types.ts`**: add `item_zone: z.string().nullable()` to `PendingSeatRawItemSchema`; update `toItemFromPendingRaw` to copy it into the parsed `ItemSchema` shape.
25. **`apps/managers-app/.../features/testing_forms/components/TestingFormsContent.tsx`**: add `item.item_zone: ""` to the default values object so it stays aligned with the widened `ItemDetailsFieldsSchema` (no other change — this harness keeps using the local `ItemPositionField`/`ItemDetailsFieldGroup`, which is out of scope).
26. **Vitest**: add/extend unit tests for `ItemPositionZoneField` (tab switching, debounce, precise-match auto-fill, no-refetch-when-`disableLookup`) and for the precise-match filter helper; extend `use-update-item-position` action tests (both packages/tasks and workers-app) for the `item_zone` optimistic-update branch.
27. **Playwright**: extend `apps/managers-app/.../tests/playwright/features/tasks/item-position-sheet.spec.ts` to mock `**/api/v1/location-tracker/items/location**`, assert the Zone tab does **not** fire that route when opened from the task-detail preview sheet, assert switching to the Wagon tab still round-trips `item_position` as before, and assert the new preview row's two tap targets each open the sheet on the correct tab.

## Risks and mitigations

- Risk: Widening `ItemDetailsFieldsSchema.item_position` from a coerced number to a string could silently change validation behavior for the `seat`-required-position rule (`addSeatPositionIssue`) if any code still compares it with `== null` against a numeric type.
  Mitigation: Step 16 explicitly updates the check to `!item.item_position?.trim()`; typecheck across all four touched packages/apps (acceptance criterion 7) will surface any remaining numeric assumption.
- Risk: Auto-filling `item.item_zone` from the location-tracker response could clobber a value the user is actively typing.
  Mitigation: Only auto-fill when the zone field is not dirty and currently empty, and dedupe by a last-applied-signature ref (step 5), matching the existing `lastAppliedLookupSignatureRef` idiom already used for identity lookups in these same three forms.
- Risk: Deleting `ItemPositionField.tsx`/`ItemPositionPill.tsx` breaks an unnoticed consumer.
  Mitigation: Confirmed via repo-wide grep that the only consumers are the three forms being migrated (`ItemPositionField`) and `TaskBodyCategoryRow`/workers-app `TaskDetailSlidePage.tsx` (`ItemPositionPill`), both updated in this same plan. The managers-app app-local `ItemPositionField.tsx` is a separate, untouched file.
- Risk: Sending `item_zone` on every position-sheet save (even unchanged) would trigger unnecessary external location-tracker pushes and `item:updated` history noise.
  Mitigation: Dirty-field gating in `ItemPositionSheetPage` (step 9) omits the key via `undefined`, which `JSON.stringify` drops entirely — confirmed by reading `packages/api-client/src/api-client.ts`'s `request()` (`body: JSON.stringify(body)`), matching the backend's "omit key entirely to leave zone untouched" contract exactly.

## Validation plan

- `npm run typecheck` (repo root, or per-package): zero TypeScript errors in `packages/items`, `packages/tasks`, `packages/task-creation`, `apps/workers-app`, `apps/managers-app`.
- `npm run test -- --grep "ItemPositionZoneField|item-position|item-location"` (packages/items and packages/tasks vitest suites): new/updated unit tests pass, including the precise-match filter and the dirty-only zone submit logic.
- `npx playwright test --grep "Item position sheet" --project=mobile` (managers-app): pass, including the new location-tracker-not-called assertion.
- `npx playwright test --grep "Item position sheet" --project=desktop` (managers-app): pass.
- `npm run test:e2e` (workers-app, no project split): manual smoke pass on `TaskStepCategoryPositionRow` tap targets and sheet save, since workers-app has no equivalent automated spec for this flow yet (not adding one is acceptable given the existing test surface, but call this out if the reviewer wants one added).

## Review log

- `2026-07-07` `claude`: Initial plan drafted from direct user request plus `HANDOFF_TO_FRONTEND_item_zone_batch_position_update_and_location_search_20260707`.
- `2026-07-07` `user`: Confirmed the task-creation endpoint already accepts `item_zone`. Clarification #1 resolved; risk note removed accordingly.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `claude`
