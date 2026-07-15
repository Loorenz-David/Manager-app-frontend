# PLAN_shopify_inventory_location_box_picker_field_20260715

## Metadata

- Plan ID: `PLAN_shopify_inventory_location_box_picker_field_20260715`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-15T00:00:00Z`
- Last updated at (UTC): `2026-07-15T07:11:24Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/inventory_track_shopify.md`

## Goal and intent

- Goal: Replace the current quantity-input `ShopifyProductSyncInventoryField` with a self-sustaining, per-shop field that lets the user tap Shopify locations (via the `BoxPicker` primitive) to mark a hardcoded `quantity_to_add = 1`, and move inventory selection into the `target` staged step (one field instance per selected shop) instead of its own `inventory` step.
- Business/user intent: Sellers/managers building a Shopify sync submission need a fast way to pick which Shopify locations should receive +1 unit per shop, without typing quantities. The field should remember each shop's last-picked locations locally, the same way `ShopifyProductSyncShopField` remembers the last-picked shops.
- Non-goals:
  - No backend changes — `GET /api/v1/integrations/shopify/locations` and `POST /api/v1/integrations/shopify/products/process` already exist and are unchanged (see `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_inventory_product_sync_20260715.md`).
  - No change to `quantity_to_add` beyond the hardcoded `1` default — no per-location quantity stepper UI.
  - No change to the metafields step, title/description/SKU fields, or the draft "keep" repository schema (it already round-trips `inventoryAdjustments` generically).

## Scope

- In scope:
  - `packages/shopify/src/components/fields/ShopifyProductSyncInventoryField.tsx` — rewrite as a per-shop, self-sustaining `BoxPicker` field.
  - A new per-shop local storage module for remembered location selections (mirrors `packages/shopify/src/lib/shopify-product-sync-storage.ts`).
  - `packages/shopify/src/components/ShopifyProductSyncForm.tsx` — remove the `inventory` staged step, render one `ShopifyProductSyncInventoryField` per selected shop inside the `target` step.
  - Unit/component tests for the rewritten field and the new storage module.
- Out of scope:
  - `packages/shopify/src/api/list-shopify-locations.ts`, `use-list-shopify-locations-query.ts`, `shopify-keys.ts` (already implemented and correct — read-only reference, no edits needed).
  - `packages/shopify/src/types.ts` (`ShopifyProductSyncInventoryAdjustmentSchema`, `InventoryAdjustmentRequestSchema`, `ShopifyProductSyncFormSchema`) — already shaped correctly; no edits needed.
  - `packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts` — already filters `quantityToAdd > 0` per shop and builds `inventory_adjustments` correctly; no edits needed.
  - `packages/shopify/src/drafts/*` — draft schema already defaults missing `inventoryAdjustments` to `[]` and round-trips the field generically; no edits needed.
- Assumptions:
  - The `inventory` staged step and its step-list entry are removed entirely; inventory selection now lives inside `target`. Nothing else references the `"inventory"` step id (confirmed via repo search — only `ShopifyProductSyncForm.tsx` referenced it).
  - Deselecting a location in the picker removes that `(shopIntegrationId, locationId)` entry from `inventoryAdjustments` outright, rather than keeping a `quantityToAdd: 0` row. The existing submit resolver already only forwards entries with `quantityToAdd > 0`, so a fully-removed entry and a zeroed one behave identically at submit time — dropping it entirely simplifies the picker to a pure membership toggle.
  - The field queries `useListShopifyLocationsQuery` with the **full** currently-selected `shopIntegrationIds` array (not just its own shop id) so that every per-shop instance shares one normalized query key and TanStack Query dedupes them into a single network request; each instance then reads out only its own shop's entry from the shared response.
  - `location_id` (a Shopify GID string) is used as the `BoxPicker` option `value`, which satisfies the primitive's `Value extends string` constraint.

## Clarifications required

- [x] Confirm removing the standalone `inventory` staged step (and its nav entry) is correct, vs. keeping an empty/hidden step for some other reason — resolved: remove it. Once the field moves into `target`, `inventory` would render no content (it currently renders only `ShopifyProductSyncInventoryField`), leaving a dead step in staged navigation; user confirmed removal on 2026-07-15.
- [x] Confirm deselecting a location should delete its `inventoryAdjustments` entry outright (no `quantityToAdd: 0` row kept in form state) — resolved: delete outright; user confirmed on 2026-07-15.

## Acceptance criteria

1. `ShopifyProductSyncForm.tsx` renders one `ShopifyProductSyncInventoryField` per entry in `shopIntegrationIds`, inside `<StagedFormStep id="target">`, after `ShopifyProductSyncShopField`/`ShopifyProductSyncSkuField`; the `inventory` step no longer exists in `staged.steps` or as a `StagedFormStep`.
2. Each `ShopifyProductSyncInventoryField` instance calls `useListShopifyLocationsQuery(shopIntegrationIds)` (the full selected-shops array) and renders only the locations belonging to its own `shopIntegrationId`.
3. Locations for a shop with `status: "ok"` render as `BoxPicker` (`mode="multiple"`) options; tapping an option adds a `{ shopIntegrationId, locationId, quantityToAdd: 1 }` entry to the `inventoryAdjustments` field array, tapping a selected option removes that entry.
4. Inactive locations (`is_active: false`) still render as selectable options with a visible "will be activated" description; `needs_reauth` and `error` shop statuses render the existing non-blocking messaging instead of a picker.
5. The label "Inventory" renders once per field instance; the shop's `shop_domain` renders beneath it only when `shopIntegrationIds.length > 1` — a single selected shop shows no domain/name line.
6. On mount, if the form has no existing `inventoryAdjustments` entries for a given `shopIntegrationId` and that shop's locations have loaded (`status: "ok"`), the field auto-selects the locations previously stored in local storage for that shop (filtered to location ids that still exist in the current response).
7. Selecting/deselecting a location writes the shop's current location-id selection to local storage, keyed per `shopIntegrationId`, independent of other shops' stored selections.
8. Submitting the form still produces `inventory_adjustments` per the handoff shape (`shop_integration_id`, `location_id`, `quantity_to_add: 1`) via the existing unchanged `resolveShopifyProductSyncSubmit`.
9. "Keep" (draft save/restore) still round-trips the selected `inventoryAdjustments` unchanged, since the draft schema already defaults/passes this field through generically.
10. `npm run typecheck` and the shopify package's vitest suite pass with zero errors/regressions.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: core contract, always included.
- `architecture/02_types.md`: core contract, always included; also governs Zod schema conventions used by the new storage module.
- `architecture/04_api_client.md`: core contract, always included (no new API calls are added, but the existing `listShopifyLocations` call this field consumes was built to this contract).
- `architecture/05_server_state.md`: core contract, always included; confirms the field must consume `useListShopifyLocationsQuery` as-is rather than inventing a second query hook.
- `architecture/06_client_state.md`: core contract, always included.
- `architecture/08_hooks.md`: core contract, always included.
- `architecture/13_errors.md`: core contract, always included; governs how `needs_reauth`/`error`/`isError` states are surfaced (non-blocking, per-shop).
- `architecture/15_feature_structure.md`: core contract, always included; confirms field lives in `packages/shopify/src/components/fields/`.
- `architecture/07_components.md`: this is a feature component that only reads from `useFormContext`/`useController` (react-hook-form) — governs the "component reads context/form only" boundary from the layer cheat sheet.
- `architecture/09_forms.md`: trigger — this is a react-hook-form field (`useController`, `field.onChange`) inside an existing `zodResolver`-validated form.
- `architecture/26_persistence.md`: trigger — the field needs its own `localStorage` read/write module, keyed per shop, mirroring `shopify-product-sync-storage.ts`.
- `architecture/17_testing.md`: trigger — new Vitest unit/component tests are required for the rewritten field and the new storage module.

### Local extensions loaded

- None of the core contracts touched here (`01`, `04`, `12`, `28`, `30`, `34`) have a relevant local companion for this change; `26_persistence.md` and `17_testing.md` have no local companion files in the repo.

### File read intent — pattern vs. relational

Per `task_system/frontend_contract_goal_mapping_guide.md`, the following implementation-file reads performed while drafting this plan were relational ("what exists"), not pattern reads:

- `packages/shopify/src/components/fields/ShopifyProductSyncShopField.tsx` — read to confirm the exact shape of "self-sustaining field" already established in this codebase (own query hook, own local-storage read/write, `useController` on a named form field). This is the pattern the intention doc explicitly names as the precedent to follow.
- `packages/shopify/src/lib/shopify-product-sync-storage.ts` — read to confirm the existing localStorage read/write shape (Zod-validated blob, pure `read*`/`write*` functions) that the new per-shop storage module should mirror.
- `packages/shopify/src/types.ts`, `packages/shopify/src/api/list-shopify-locations.ts`, `use-list-shopify-locations-query.ts`, `shopify-keys.ts` — read to confirm exact field names (`shop_integration_id`, `shop_domain`, `status`, `locations[].location_id/name/is_active`) and that the query hook/keys/API function are already fully implemented; no new query infra is needed.
- `packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts` — read to confirm the submit resolver already filters `quantityToAdd > 0` and tags each entry to its shop; confirms no changes needed there.
- `packages/shopify/src/drafts/shopify-product-sync-draft-types.ts` — read to confirm the draft schema already preprocesses missing `inventoryAdjustments` to `[]`, so "keep" already round-trips this field.
- `packages/shopify/src/components/ShopifyProductSyncForm.tsx`, `providers/ShopifyProductSyncFormProvider.tsx` — read to confirm current staged-step wiring and available form context (`ctx.surfaceOpeners`, etc.) that this field does **not** need (it renders inline, unlike the shop-picker sheet).
- `packages/ui/src/components/primitives/box-picker/box-picker.types.ts`, `BoxPicker.tsx` — read to confirm the primitive's prop contract (`mode`, `value`/`onValueChange`, `options[].value/label/description/disabled`).
- `packages/tasks/src/components/fields/TaskFulfillmentMethodField.tsx` — read as a second, independent example of an existing form field that renders `BoxPicker` directly inline (not via a surface picker sheet), confirming this is an established pattern in the codebase and not something invented for this plan.

No contract file was substituted with an implementation-file read for "how to write" questions; the box-picker prop contract and self-sustaining-field pattern are read directly from the primitive/precedent files because no canonical contract document defines them (there is no `architecture/*box_picker*.md` or `*self_sustaining_field*.md`).

### Skill selection

- Primary skill: none — this is a scoped component rewrite inside an existing, fully-scaffolded feature package; no bootstrap/scaffolding skill applies.
- Trigger terms: `form field`, `localStorage`, `box picker`
- Excluded alternatives: `architecture/35_shared_packages.md §13` (`surfaceOpeners`/picker-sheet-injection pattern) — excluded because this field renders `BoxPicker` inline in the staged step, the same way `TaskFulfillmentMethodField` does; it does not open a surface/sheet the way `ShopifyProductSyncShopField` does.

## Implementation plan

1. Create `packages/shopify/src/lib/shopify-product-sync-inventory-storage.ts`: a Zod-validated `localStorage` module keyed by a single storage key holding a map of `shopIntegrationId -> { locationIds: string[]; updatedAt: number }`, exposing `readLastSelectedInventoryLocationIds(shopIntegrationId: string): string[] | null` and `writeLastSelectedInventoryLocationIds(shopIntegrationId: string, locationIds: string[]): void`, following the same `safeParse`/`typeof window === "undefined"` guard style as `shopify-product-sync-storage.ts`.
2. Rewrite `packages/shopify/src/components/fields/ShopifyProductSyncInventoryField.tsx`:
   - Props: `{ shopIntegrationId: string; shopIntegrationIds: string[] }`.
   - `useController({ name: "inventoryAdjustments", control })` against `ShopifyProductSyncFormValues`.
   - `useListShopifyLocationsQuery(shopIntegrationIds)` (full array — shared query key across sibling instances).
   - Resolve `shop = query.data?.shops.find(s => s.shop_integration_id === shopIntegrationId)`.
   - Derive `selectedLocationIds` from `field.value` entries matching this `shopIntegrationId`.
   - `useEffect`: when `shop?.status === "ok"` and no existing `field.value` entries exist for this `shopIntegrationId`, read stored location ids via `readLastSelectedInventoryLocationIds`, filter to ids present in `shop.locations`, and if non-empty, append `{ shopIntegrationId, locationId, quantityToAdd: 1 }` entries for each to `field.value` (do not overwrite other shops' entries).
   - `handleSelectionChange(nextLocationIds: string[])`: replace this shop's entries in `field.value` with `nextLocationIds.map(locationId => ({ shopIntegrationId, locationId, quantityToAdd: 1 }))`, call `field.onChange`, and call `writeLastSelectedInventoryLocationIds(shopIntegrationId, nextLocationIds)`.
   - Render: `FieldLabelRow label="Inventory"`; shop domain line only when `shopIntegrationIds.length > 1`; loading/error/needs_reauth/no-locations messaging matching the current field's existing copy; `BoxPicker mode="multiple" layout="stack" value={selectedLocationIds} onValueChange={handleSelectionChange} options={shop.locations.map(l => ({ value: l.location_id, label: l.name, description: l.is_active ? undefined : "Inactive — will be activated at 0 before adding units.", testId: \`shopify-inventory-location-${shopIntegrationId}-${l.location_id}\` }))}` with `data-testid={\`shopify-product-sync-inventory-field-${shopIntegrationId}\`}` on the wrapper.
3. Edit `packages/shopify/src/components/ShopifyProductSyncForm.tsx`:
   - Remove `{ id: "inventory", title: "Inventory" }` from the `useStagedForm({ steps: [...] })` array.
   - Remove the `<StagedFormStep id="inventory">...</StagedFormStep>` block entirely.
   - Inside `<StagedFormStep id="target">`'s `ContentCard`, after `ShopifyProductSyncShopField`/`ShopifyProductSyncSkuField`, render `{values.shopIntegrationIds.map((shopIntegrationId) => (<ShopifyProductSyncInventoryField key={shopIntegrationId} shopIntegrationId={shopIntegrationId} shopIntegrationIds={values.shopIntegrationIds} />))}`.
4. Update the export in `packages/shopify/src/lib/shopify-product-sync-storage.ts`'s sibling export list only if the new storage module needs to be exported from the package's public `index.ts` for testability — otherwise keep it package-internal (not exported), matching that `ShopifyProductSyncInventoryField` itself is not in the public API today.
5. Write/replace Vitest tests:
   - `shopify-product-sync-inventory-storage.test.ts`: covers read of missing/malformed data, write-then-read round trip per shop key, and that one shop's write does not clobber another shop's stored entry.
   - `ShopifyProductSyncInventoryField.test.tsx` (or extend an existing field test file if one already covers a similar field): mocks `useListShopifyLocationsQuery`, verifies tapping a `BoxPicker` option adds a `quantityToAdd: 1` entry, tapping again removes it, the shop-domain line only renders when multiple shops are selected, `needs_reauth`/`error` statuses suppress the picker, and local-storage autoselect populates `field.value` on first mount when no existing selection exists.
6. Run `npm run typecheck` and the shopify package's vitest suite; fix any fallout from removing the `inventory` step (e.g., any Playwright spec referencing the old step id or the old numeric `NumberInput` testids) — repo search during planning found none, but re-confirm at implementation time.

## Risks and mitigations

- Risk: A stale Playwright spec or fixture references the removed `inventory` step id or the old `shopify-inventory-${shop}-${location}` `NumberInput` testids.
  Mitigation: Grep `tests/playwright` for `"inventory"` step id and the old testid prefix before deleting the step; update or remove any matching assertions.
- Risk: Rendering `shopIntegrationIds.length` separate `ShopifyProductSyncInventoryField` instances, each calling `useListShopifyLocationsQuery(shopIntegrationIds)` with the same array reference issue (new array identity per render) could cause redundant query-key churn.
  Mitigation: `useListShopifyLocationsQuery` already normalizes via `[...shopIntegrationIds].sort()` before building the query key, so identical *content* always produces an identical key regardless of array identity — TanStack Query dedupes correctly as long as `values.shopIntegrationIds` content is stable across the sibling instances' renders (it is, since all instances read from the same `form.watch()` result in one render pass).
  Risk: Local-storage autoselect effect could fire repeatedly or fight the user's manual deselection (re-adding a location the user just removed).
  Mitigation: Gate the autoselect effect strictly on "no existing `field.value` entries for this shop yet" — once the user has any entry (including zero, i.e., after any manual interaction that leaves the shop with no selected locations) the effect must not run again for that shop. Track this with a per-shop `hasAppliedStoredSelectionRef` (a `Set<string>` ref of shop ids already processed), mirroring the `hasRestoredRef` pattern already used for draft restoration in `ShopifyProductSyncForm.tsx`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep shopify-product-sync-inventory`: new storage and field tests pass; no regressions in existing `shopify-product-sync-draft-repository.test.ts` or `resolve-shopify-product-sync-submit.test.ts`.
- `npx playwright test --grep shopify-product-sync --project=mobile`: confirm the `target` step now includes tappable location boxes per selected shop and the removed `inventory` step no longer appears in staged navigation.
- `npx playwright test --grep shopify-product-sync --project=desktop`: same as above on desktop viewport.

## Review log

- `2026-07-15` `planning-agent`: Initial draft from user intention + handoff doc; flagged two clarifications (step removal, deselect-drops-entry) with recommended defaults so implementation is not blocked pending trivial confirmations.
- `2026-07-15` `David`: Confirmed removal of the empty `inventory` staged step.
- `2026-07-15` `David`: Confirmed deselecting a location drops its `inventoryAdjustments` entry outright.
- `2026-07-15` `Codex`: Implemented the per-shop BoxPicker field, localStorage memory, target-step wiring, and focused storage/component tests. `npm run typecheck` and `npm run test:shopify` passed (35 files / 101 tests).

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `David`
