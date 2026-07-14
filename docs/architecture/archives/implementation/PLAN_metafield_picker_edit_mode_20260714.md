# PLAN_metafield_picker_edit_mode_20260714

## Metadata

- Plan ID: `PLAN_metafield_picker_edit_mode_20260714`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T06:46:12Z`
- Related issue/ticket: `<none provided>`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_metafield_picker_edit_mode_20260714.md` (not yet written)

## Goal and intent

- Goal: Rework `ShopifyMetafieldPickerForm` so the picker owns preference lifecycle (create / delete / reorder) with optimistic updates, and introduce an explicit **edit mode** for managing saved preferences.
- Business/user intent: Let a user save a metafield as a reusable preference the moment they interact with it (per-field "Add" button), and later curate the saved set — remove entries and drag to reorder them — without leaving the sync form or waiting on the network.
- Non-goals:
  - No change to how metafield **values** are submitted with the product sync (`onChange`/`value` contract with `ShopifyProductSyncForm` is preserved).
  - No change to the metafield input resolver kinds (text / url / choice / unsupported).
  - No backend changes — all three endpoints (create, delete, reorder) already exist and are verified below.
  - No removal of the deferred batch-create-on-submit path until the per-field create path fully replaces it (see Clarification 1).

## Scope

- In scope:
  - `packages/lib/src/client-id.ts` — register the `ShopifyMetafieldPreference: 'shpmfp'` prefix.
  - `packages/shopify` — new delete + reorder API functions, query hooks/action hooks, controller extensions, edit-mode client state, and component changes (`ShopifyMetafieldPickerForm`, `ShopifyMetafieldSearch`, `ShopifyMetafieldFields`, `ShopifyMetafieldField`, `ShopifyMetafieldInputResolver`, new sortable wrapper).
  - Optimistic cache handling on the category preferences query.
- Out of scope:
  - The search-result → active-field auto-add/auto-remove heuristics beyond what the new create flow requires.
  - `ShopifyProductSyncForm` submit orchestration, except removing now-dead pending-store batch-create code **only if** Clarification 1 resolves toward full replacement.
- Assumptions:
  - The `@dnd-kit/*` stack (`core` / `sortable` / `utilities`) is already a dependency of the monorepo (used by `@beyo/images`) and can be added as a peer/dependency to `@beyo/shopify`. Verified present in `package-lock.json`.
  - Backend create accepts an optional per-selection `client_id` (verified) so the frontend-generated `shpmfp_<ulid>` enables optimistic insertion.

## Backend contract verification (source-checked 2026-07-14)

Verified against `backend/app/beyo_manager/routers/api_v1/shopify.py` and command/request modules:

- **Create** `POST /api/v1/integrations/shopify/metafield-preferences`
  Body: `{ item_category_id, preferences: [{ client_id?, shop_integration_id, shopify_metafield_definition_id, sequence_order }] }`.
  `client_id` is optional per selection (`CreateShopifyMetafieldPreferenceSelectionRequest.client_id: str | None`). Duplicate `client_id`s and duplicate (shop, definition) pairs are rejected. Returns `data: ShopifyMetafieldPreference[]`.
- **Delete** `DELETE /api/v1/integrations/shopify/metafield-preferences`
  Body: `{ client_ids: string[] }` (min length 1). Returns `data: {}` (empty). **Note: delete is a body-based batch endpoint, not a path-param single delete.**
- **Reorder** `PATCH /api/v1/integrations/shopify/metafield-preferences/{preference_client_id}`
  Body: `{ sequence_order: int >= 0 }`. Returns `data: { client_id, sequence_order }`. Backend re-sequences other active preferences **within the same shop + item-category group only**; other shops/categories untouched.
- **Prefix** Backend `ShopifyMetafieldPreference.CLIENT_ID_PREFIX = "shpmfp"`; ULID form `shpmfp_01J...` accepted by create. Frontend map must mirror this exactly.
- **Search + category together** `GET /metafield-preferences` accepts `q` and `item_category_ids` simultaneously; when both are present it returns saved preferences for the category **and** a global `search_results` array (search is NOT scoped to saved preferences). This drives Clarification 2.

## Clarifications required — RESOLVED 2026-07-14

- [x] **Batch-create removal.** RESOLVED: **Remove entirely.** Delete the submit-time batch-create in `ShopifyProductSyncForm.handleSubmit` and the entire `useShopifyMetafieldPendingPreferencesStore`. Per-field "Add" becomes the only create path. Eliminates double-create risk.
- [x] **Edit-mode search semantics.** RESOLVED (source-confirmed by owner): the backend does **not** scope saved preferences by `q`. `item_category_ids` only hydrates saved preferences (unfiltered by `q`); `q` runs a **global** Shopify definition name-search returned separately as `search_results`. Therefore edit-mode "search within saved preferences" is a **client-side filter** on the already-loaded saved-preference list. The picker may still pass `item_category_id` when in edit mode (per intention), but the visible narrowing of the saved set is done in the controller/component, not the server.
- [x] **Multi-shop reordering.** RESOLVED: **Within shop group only.** Each shop's saved preferences form a separate `SortableContext`; no cross-shop drops. Matches backend re-sequencing (shift is scoped to same shop + item-category group).
- [x] **"Add" availability without item category.** RESOLVED: **Hide the "Add" button** when no `item_category_id` is selected. The existing "cannot be remembered without an item category" copy already explains the state.

## Acceptance criteria

1. A metafield field that is a search result (not yet a saved preference) and has `item_category_id` available renders a floating "Add" pill (`py-2 px-1.5 bg-primary text-card text-sm rounded-full`, Lucide plus icon + "Add" label) absolutely positioned on the right edge, vertically centered on the input column.
2. Tapping "Add" generates a `shpmfp_<ulid>` client_id, POSTs the create with that client_id, and optimistically transitions the field to a saved preference — the "Add" button disappears immediately without waiting for the response. On success the category query is invalidated; on failure the optimistic insert is rolled back and an error surfaced.
3. Fields no longer render the top-right "Remove" control in normal (non-edit) mode.
4. An edit toggle renders beside the SearchBar (Lucide edit/pencil icon). Tapping it enters edit mode; the button then shows a check icon with a distinct "done" background. Tapping again exits edit mode.
5. In edit mode, each **saved** preference field renders, in the same right-edge slot as "Add", a "Remove" pill (`bg-destructive text-card`, Lucide X icon + label). Tapping it DELETEs the preference by `client_id`, optimistically removes it from the list, and invalidates the category query.
6. In edit mode, each saved preference field renders a Lucide grip/grid handle enabling drag-to-reorder within its shop+category group. On drop, the picker PATCHes the dragged preference's new zero-based `sequence_order`, optimistically reorders the list, and reconciles with the server response.
7. Reordering, adding, and removing are reliable on touch and pointer devices and do not lose in-progress input values.
8. `npm run typecheck` passes; new Vitest unit/component tests and the Playwright metafield flow pass on mobile and desktop projects.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer boundaries (components consume context only).
- `architecture/02_types.md`: Zod schema + type conventions for new request/response shapes.
- `architecture/04_api_client.md` + `architecture/04_api_client_local.md`: `apiClient` usage, envelope shape, flat error string.
- `architecture/05_server_state.md`: query hook structure for the new reorder/delete-adjacent reads (reuse of existing category query).
- `architecture/06_client_state.md`: edit-mode boolean and drag transient state placement.
- `architecture/08_hooks.md`: **action hooks with optimistic cache snapshot + rollback + invalidation** — the core pattern for create/delete/reorder.
- `architecture/13_errors.md`: surfacing mutation failures.
- `architecture/15_feature_structure.md` + `architecture/35_shared_packages.md`: file placement inside the `@beyo/shopify` package (actions/, api/, controllers/, store/, components/) and public API exports via `index.ts`.
- `architecture/07_components.md`: feature component structure, context consumption, `data-testid` placement.
- `architecture/24_dto.md`: `client_id` generation and view-model transform conventions.
- `architecture/17_testing.md`: Vitest + MSW + renderHook for the new hooks and controller.
- `architecture/34_runtime_validation.md` + `_local.md`: Playwright flow, element naming, mobile-first validation.

### Local extensions loaded

- `architecture/04_api_client_local.md`: backend error is a flat string (no `field_errors`); envelope `{ ok, data, warnings }`.
- `architecture/34_runtime_validation_local.md`: fixture paths, `data-testid` naming convention, npm scripts.

### File read intent — pattern vs. relational

All implementation-file reads performed for this plan were **relational** (understanding existing behavior/shapes), which the guide permits:
- `use-shopify-metafield-picker.controller.ts`, `ShopifyMetafieldPickerForm.tsx`, `ShopifyMetafieldFields.tsx`, `ShopifyMetafieldField.tsx`, `ShopifyMetafieldInputResolver.tsx`, `ShopifyMetafieldSearch.tsx` — current picker behavior and props.
- `types.ts`, `shopify-keys.ts`, `get-shopify-metafield-preferences.ts`, `create-shopify-metafield-preferences.ts`, `normalize-shopify-metafield-fields.ts`, `shopify-metafield-identity.ts` — exact field names, query key structure, response shapes.
- `packages/lib/src/client-id.ts` — existing prefix map to extend.
- `packages/images/src/components/ImageSortableGrid.tsx` — reference for the **existing, proven `@dnd-kit` usage** in this repo (sensors, `DragOverlay`, `arrayMove`, touch activation). This is a relational read of an existing implementation, used as the drag-and-drop reference rather than re-deriving the pattern.
- Backend router/command/request modules — contract verification (see above).

### Skill selection

- Primary skill: none required for planning. During implementation, use `verify` to drive the add/remove/reorder flow end-to-end before commit.
- Trigger terms: `optimistic update`, `dnd`, `drag`, `client_id`, `edit mode`.
- Excluded alternatives: `dataviz`/`artifact-design` — no visualization or artifact deliverable.

## Implementation plan

1. **Client-id prefix.** Add `ShopifyMetafieldPreference: 'shpmfp'` to `CLIENT_ID_PREFIXES` in `packages/lib/src/client-id.ts` (keeps the mirror with backend `CLIENT_ID_PREFIX = "shpmfp"`). No regex change needed (`shpmfp` matches `^[a-z][a-z_]*_...`).

2. **Types (`packages/shopify/src/types.ts`).** Add Zod schemas + types:
   - `DeleteShopifyMetafieldPreferencesRequestSchema` = `{ client_ids: string[] (min 1) }`.
   - `UpdateShopifyMetafieldPreferenceSequenceOrderRequestSchema` = `{ sequence_order: int >= 0 }` and a response schema `{ client_id, sequence_order }`.
   - Extend `CreateShopifyMetafieldPreferenceInputSchema` to include optional `client_id`.

3. **API functions (`packages/shopify/src/api/`).**
   - `delete-shopify-metafield-preferences.ts` → `DELETE` with body `{ client_ids }`, empty-data envelope.
   - `update-shopify-metafield-preference-sequence-order.ts` → `PATCH /{preference_client_id}` with `{ sequence_order }`.
   - Update `create-shopify-metafield-preferences.ts` to pass through the optional `client_id`.

4. **Action hooks (`packages/shopify/src/actions/`)** — following `08_hooks.md` optimistic pattern against `shopifyKeys.metafieldPreferencesCategory(...)`:
   - `use-create-shopify-metafield-preference.ts` (single-add): snapshot category cache, optimistically inject a synthesized `ShopifyMetafieldPreference` (from the search-result field + generated `client_id` + computed `sequence_order`), rollback on error, invalidate `shopifyKeys.metafieldPreferences()` on settle.
   - `use-delete-shopify-metafield-preference.ts`: optimistically drop the preference from category cache; rollback on error; invalidate on settle.
   - `use-reorder-shopify-metafield-preference.ts`: optimistically re-sequence the affected shop+category group in cache (mirror backend shift semantics); rollback on error; invalidate on settle.
   - **Remove** the batch `useCreateShopifyMetafieldPreferences` action and its API/type once its only caller (`ShopifyProductSyncForm` submit) is stripped (Clarification 1). Also delete `use-shopify-metafield-pending-preferences-store.ts` and its usages.

5. **Client state.** Add `isEditMode` to the controller via `useState` (transient UI, not persisted — per `06_client_state.md`). Expose `isEditMode` + `toggleEditMode`.

6. **Controller (`use-shopify-metafield-picker.controller.ts`).**
   - Wire the three action hooks; expose `addPreference(field)`, `removePreference(field)`, `reorderPreference(field, newIndex)` and per-field `isSaved`/`isMutating` flags.
   - `addPreference` computes `sequence_order` = count of saved preferences already in that shop+category group; generates `client_id` via `generateClientId('ShopifyMetafieldPreference')`; guarded so it is a no-op / hidden when `item_category_id` is null (Clarification 4).
   - Edit-mode search (Clarification 2): the backend does not filter saved preferences by `q`, so filter the loaded saved-preference list **client-side** by the debounced query in the controller. Optionally still pass `item_category_id` on the request when in edit mode, but never rely on the server to narrow the saved set.
   - Reorder (Clarification 3): expose saved preferences grouped by `shopIntegrationId` so the component can render one `SortableContext` per shop; disallow cross-shop moves.
   - Preserve the existing `value`/`onChange` draft-value contract so input text is never lost during add/remove/reorder.
   - Drop all pending-store wiring (removed in step 4).

7. **Components.**
   - `ShopifyMetafieldSearch.tsx`: add an edit-toggle button beside `SearchBar` (edit icon → check icon + "done" background), driven by `isEditMode`/`onToggleEditMode` props. In edit mode the SearchBar filters the loaded saved-preference list client-side (Clarification 2).
   - `ShopifyMetafieldField.tsx` / `ShopifyMetafieldInputResolver.tsx`: remove the top-right "Remove" control; add the right-edge absolutely-positioned action slot rendering **Add** (unsaved, non-edit), **Remove** (saved, edit mode), and the **grip handle** (saved, edit mode). Wrap the input column `relative` so the pill positions against it.
   - New `ShopifyMetafieldSortableFields.tsx` (or extend `ShopifyMetafieldFields.tsx`): mirror `ImageSortableGrid`'s `@dnd-kit` setup — `DndContext` + `SortableContext` **per shop group**, `TouchSensor` (delay 250, tolerance 8) + `PointerSensor` (distance 6), `DragOverlay`, `arrayMove` on drop → `reorderPreference`. Only active in edit mode; non-edit renders the plain list.

8. **Public API (`packages/shopify/src/index.ts`).** Export any new hooks/types needed by consumers; keep the picker's outward props stable.

9. **Tests.** Vitest unit tests for the three API functions + action-hook optimistic/rollback behavior (MSW), a controller test for add/remove/reorder + edit-mode toggle, and a Playwright flow (`tests/playwright/features/shopify/metafield-preferences.spec.ts`) covering add → button disappears, edit → remove, edit → drag reorder, on mobile then desktop.

## Risks and mitigations

- Risk: Optimistic cache shape for the category query is nested (`shops[].item_categories[].metafield_preferences[]`); an incorrect optimistic mutation corrupts the list.
  Mitigation: Centralize cache mutation helpers in the action layer, snapshot the full query data before mutate, unconditionally rollback in `onError`, and invalidate on `onSettled` so the server remains source of truth.
- Risk: DnD reorder `sequence_order` drift vs. backend re-sequencing (backend shifts neighbors), causing a flash on reconciliation.
  Mitigation: Optimistically apply the same shift rule the backend uses (documented above), then invalidate to converge; guard the reorder against `isDragging` staleness as `ImageSortableGrid` does.
- Risk: Losing in-progress input text when a field flips from search-result to saved-preference (identity/source changes).
  Mitigation: Keep draft values keyed by the stable `identity` (`shopIntegrationId:definitionId`), which is unchanged by the save; assert this in a controller test.
- Risk: Double-create if the submit-time batch path is left alongside the new per-field create.
  Mitigation: Resolve Clarification 1 before implementation; if kept, dedupe by `client_id` server-side rejection is already enforced, but the UI should not enqueue already-saved fields.
- Risk: Delete is a batch endpoint (`client_ids`); calling it per-field is fine but naming/shape can mislead.
  Mitigation: API function accepts a single id and wraps it as `{ client_ids: [id] }`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep metafield`: new API, action-hook, and controller tests pass (optimistic add/remove/reorder + rollback + edit toggle).
- `npx playwright test --grep metafield-preferences --project=mobile`: add hides button, edit-mode remove, drag reorder persist.
- `npx playwright test --grep metafield-preferences --project=desktop`: same flow on desktop.
- Manual `verify` pass driving the picker inside `ShopifyProductSyncForm`.

## Review log

- `2026-07-14` `claude-opus-4-8`: Initial draft. Backend contracts (create/delete/reorder/prefix/search) verified against source. Four clarifications open.
- `2026-07-14` `David`: All four clarifications resolved (remove batch-create + store; client-side edit-mode search since backend does not scope saved prefs by `q`; per-shop-group reorder; hide Add without category). Search-scoping claim re-verified against `get_shopify_metafield_preferences.py` and confirmed.
- `2026-07-14` `Codex`: Implemented per-field optimistic create, edit-mode delete/reorder, per-shop drag-and-drop, and removed submit-time batch creation. Typecheck and Shopify package tests passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `David`
