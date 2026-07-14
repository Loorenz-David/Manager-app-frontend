# PLAN_restructure_metafields_form_20260713

## Metadata

- Plan ID: `PLAN_restructure_metafields_form_20260713`
- Status: `archived`
- Owner agent: `Claude (Opus 4.8)`
- Created at (UTC): `2026-07-13T00:00:00Z`
- Last updated at (UTC): `2026-07-13T11:22:14Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/restructuring_metafields_form.md`
- Backend contract: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_metafield_preferences_20260713.md`

## Goal and intent

- **Goal:** Replace the hardcoded dimension fields inside `ShopifyProductSyncForm` with a reusable, shop-scoped dynamic **metafield picker** that loads saved category preferences, searches live Shopify metafield definitions, lets the user fill values, tracks unsaved selections as pending preferences, and contributes valid values to the product-processing request — under parent-controlled persistence.
- **Business/user intent:** Stop assuming every Shopify product metafield is a numeric dimension. Let workers reuse per-category, per-shop metafield choices they previously made, discover new definitions per shop, and remember useful new ones — while keeping every definition, value, preference, and request scoped by `shop_integration_id`.
- **Non-goals:** (mirrors intention §41) creating/editing/deleting Shopify metafield definitions; repairing unavailable preferences; persisting live definition characteristics locally; supporting every metafield type (only `single_line_text_field` and `url` this phase); reference/file/metaobject/list pickers; search pagination; a preference-management settings page; persisting preferences before a valid value exists; modifying or duplicating the shared `SearchableSelectInput`.

## Scope

- **In scope (package `@beyo/shopify`, `frontend/packages/shopify/`):**
  - New response/request/normalized types + Zod schemas in `src/types.ts`.
  - New query keys for category and search modes in `src/api/shopify-keys.ts`.
  - New API functions + TanStack Query hook (GET) and mutation action (POST).
  - New Zustand pending-preferences store.
  - New orchestration controller + lib helpers (identity, choices parser, input resolution, field normalization, value serialization).
  - New `components/metafields/` component tree + input adapters.
  - Rewiring `ShopifyProductSyncForm`, its schema, `resolve-shopify-product-sync-submit`, provider, and surface props.
  - Removal of dimension code.
  - Vitest unit/component tests co-located per file.
- **In scope (host app `apps/workers-app/ManagerBeyo-app-workers/`):**
  - Thread `itemCategoryId` through the surface opener (Clarification 2 fix).
  - Playwright spec for the metafield flow.
- **Out of scope:** backend changes to `products/process` (see Blocking Clarification 1); a delete-preference route; the shop-picker sheet; any dimension backend metafield keys (`totalheight`, etc.).
- **Assumptions:**
  - `step.item.item_category_id` is the internal item-category client ID the preference routes require (verified: it already feeds `useItemCategoryByIdFlow`, `useIssueTypesQuery({ item_category_ids })`, and `buildProceedToStart` in `use-task-step-detail.controller.ts`).
  - react-hook-form remains the single authoritative value source (Clarification 4).
  - One field per shop-specific definition; no cross-shop field fan-out (Clarification 5, per intention's stated safer default).
  - The GET/POST envelopes follow the shared `ApiEnvelopeSchema(...).extend({ ok: z.literal(true) })` pattern already used across the package.

## Clarifications required

### Resolved during implementation

- [x] **Clarification 1 — dynamic `products/process` payload.** The current request field is `metafields: Record<string, string|number|boolean|null>` (`ShopifyProductSyncMetafieldsSchema` in `src/types.ts`), a single **global, key→scalar** map that the dimension code populated with backend keys like `totalheight`. Dynamic metafields are **per-shop**, carry `namespace`, `key`, `type`, and a `shopify_metafield_definition_id`, and different shops may receive different definitions. The metafield-preferences handoff (2026-07-13) does **not** cover `products/process`; there is no confirmed shape for submitting dynamic values. Confirm, with backend:
  - Are metafields scoped per product (global) or **per target shop**?
  - Can different shops receive different definitions in one request?
  - Does the backend key on `shopify_metafield_definition_id`, or on `namespace`+`key`, or on `type`?
  - Must values be pre-serialized strings?
  - Is the existing `Record<string, object>` field sufficient, or is a new/changed contract required?
  **Implementation resolution:** repository inspection confirmed the deployed contract still accepts a key→scalar map and normalizes every value as a `single_line_text_field`. The frontend therefore emits one process item per selected shop whenever dynamic values exist, with only that shop's filled values, preventing cross-shop leakage while remaining compatible with the current route. Preserving definition ID, namespace, and Shopify type remains a backend-contract follow-up and is recorded in the implementation summary.

### RESOLVED in this plan (decisions recorded; confirm if a stakeholder disagrees)

- [x] **Clarification 2 — item category ID source.** Resolved: add `itemCategoryId?: string | null` to `ShopifyProductSyncSlideSurfaceProps`, thread it through `ShopifyProductSyncFormProvider` → context → form, and update the workers-app opener (`use-task-step-detail.controller.ts`, `handleComplete`) to pass `itemCategoryId: step.item?.item_category_id ?? null`. The existing `productCategory` (a display **name**) stays for `products/process`'s `product_category`; it must **not** be reused as the internal ID.
- [x] **Clarification 3 — preference-creation trigger.** Adopted default: persist pending preferences **after a successful `products/process` mutation** (fire-and-reconcile; failure of persistence must not fail the sync or lose pending candidates). Rationale: only remember metafields actually used in a real sync; keeps the create call out of the render/keystroke path. The component never triggers it — the parent (`ShopifyProductSyncForm.handleSubmit`) does. Flag for product confirmation; changing the trigger touches only the parent wiring (step 13).
- [x] **Clarification 4 — form state ownership.** Resolved: **react-hook-form is authoritative.** `ShopifyProductSyncFormSchema.metafields` holds committed values; the picker is a controlled child (`value` / `onChange`) driven by the controller. The controller owns interaction + server state (active definitions, search, pending store) but never a second copy of committed values.
- [x] **Clarification 5 — equivalent metafields across shops.** Resolved: **one field per shop-specific definition** (identity = `shopIntegrationId:definitionId`). No shared fan-out input this phase.
- [x] **Clarification 6 — removing active fields.** Resolved: the user may remove **both** search-result and saved-preference fields **from the current product form only**. Removal never calls a delete-preference route (none exists). Removing a search-result field also removes its pending candidate; removing a saved-preference field leaves the backend row intact.

## Acceptance criteria

(Normalized from intention §44, continuous order preserved.)

1. Hardcoded dimension fields and dimension-specific submission logic are removed.
2. `ShopifyProductSyncForm` renders the new metafield component.
3. The component accepts one or more Shopify integration client IDs.
4. The component can preload saved preferences for an internal item category.
5. The component can search live metafield definitions by visible name.
6. Category and search modes are mutually exclusive.
7. Search begins only after more than three characters and uses a 300 ms debounce.
8. Results remain grouped and identified per shop.
9. With one selected shop, fields and search results do not render redundant shop labels.
10. With multiple selected shops, every field and search result visibly identifies its shop.
11. Shop-label visibility affects presentation only.
12. All underlying identities, values, preferences, and requests remain scoped by `shop_integration_id`.
13. Saved preferences and unsaved search results remain distinct.
14. Search results can be added as active fields.
15. The resolver supports `single_line_text_field` and `url`.
16. Choice-based single-line fields use the existing `SearchableSelectInput` through a metafield-specific adapter.
17. The metafield implementation does not duplicate searchable-select filtering, popup, keyboard, focus, or selection behavior.
18. Predefined-choice metafields enforce selection from the supplied choices via `forceSelection={true}`.
19. The adapter converts selected-option results into the final string value without adding metafield behavior to the shared primitive.
20. Unsupported types render explicit unsupported presentation.
21. Valid filled unsaved fields become pending preference candidates.
22. Saved preferences do not become pending candidates.
23. The parent controls when pending preferences are persisted.
24. Empty pending sets do not trigger creation.
25. Preference creation uses one atomic multi-shop request.
26. Successful creation reconciles active fields and pending state.
27. Unavailable saved definitions receive visible shop-specific feedback.
28. Dynamic metafield values participate in form-filled logic.
29. Dynamic metafield values are submitted using a confirmed backend contract (gated on Clarification 1).
30. Shop-selection changes preserve values for remaining shops.
31. Changing between single-shop and multi-shop presentation does not recreate field state.
32. API, server state, controller, presentation, resolver, field, pending store, and parent orchestration responsibilities remain separated.

## Contracts and skills

### Read order (document-only protocol — canonical first, local delta second)

Core (always):
- `../architecture/01_architecture.md` (+ `01_architecture_local.md`) — layer boundaries; app delta not directly used (no new tab route).
- `../architecture/02_types.md` — Zod-first schema/type definitions.
- `../architecture/04_api_client.md` (+ `04_api_client_local.md`) — `apiClient.get/post`, envelope parsing, **flat-string backend error shape** (drives error states; the metafield routes are domain-shape `{ error, ok:false }`).
- `../architecture/05_server_state.md` — query hook structure, query keys, `enabled` gating, stale-response handling.
- `../architecture/06_client_state.md` — Zustand store shape for the pending-preferences store.
- `../architecture/08_hooks.md` — controller/action-hook structure, mutation cache reconciliation.
- `../architecture/13_errors.md` — scoped error handling.
- `../architecture/15_feature_structure.md` — file placement within a package.

Added (goal bundle + triggers):
- `../architecture/16_feature_workflow.md` — build order.
- `../architecture/07_components.md` — feature component consumes controller/context, never the logic layer directly.
- `../architecture/09_forms.md` — react-hook-form integration, controlled sub-fields, server-error surfacing (trigger: "form", "useForm").
- `../architecture/24_dto.md` — response → normalized view-model transform (`ShopifyMetafieldField`), keeping saved-preference vs search-result shapes distinct (trigger: "dto", "view model", "response schema", "client_id").
- `../architecture/23_providers.md` — parent form provider/context wiring for `itemCategoryId` + `shopIntegrationIds`.
- `../architecture/17_testing.md` — vitest/MSW, stable `data-testid` selectors.
- `../architecture/27_responsive.md` — mobile+desktop Playwright projects.
- `../architecture/32_loading_skeletons.md` — category-preload skeleton vs compact search spinner (trigger: "loading state", "skeleton").
- `../architecture/34_runtime_validation.md` (+ `34_runtime_validation_local.md`) — Playwright fixtures, credential env vars, element-naming; category vs search flows (trigger: "playwright", "runtime validation", "data-testid").
- `../architecture/35_shared_packages.md` — this feature lives in a shared package; keeps components internal, exports only types/hooks needed by hosts.
- `../architecture/37_keyboard_aware_inputs.md` — the choice adapter composes `SearchableSelectInput`, which renders through `FloatingKeyboardBar`; the picker must not break keyboard-inset behavior (trigger: "floating input", "FloatingKeyboardBar").

Excluded (not needed now):
- `10_pages.md`, `11_routing.md`, `30_dynamic_loading.md` — reuses the existing `ShopifyProductSyncSlidePage` + `loadShopifyProductSyncSlidePage`; no new page/route/lazy loader.
- `28_surfaces.md` (+ local) — the picker renders inline inside the existing slide; it opens no new surface.
- `12_auth.md`, `19_permissions.md` — role gating is enforced backend-side; JWT is handled by `apiClient`.
- `14_styling.md` — no new app bootstrap.
- `03`, `18`, `20`, `21`, `22`, `25`, `26`, `29`, `31`, `33`, `36` — not triggered.

Applied precedence: local extensions override baseline for this app only; canonical unchanged.

### File read intent — pattern vs. relational (evidence already gathered)

Relational reads performed (understanding what exists — permitted):
- `src/types.ts` — actual entity/field names & Zod shapes (`ShopifyShopIntegration`, `ProcessShopifyProductItemRequestSchema`, `ShopifyProductSyncFormSchema`).
- `src/api/shopify-keys.ts` — existing query-key factory to extend.
- `src/api/list-shopify-shops.ts`, `use-list-shopify-shops-query.ts`, `api/process-shopify-products.ts`, `actions/use-process-shopify-products.ts` — existing GET/POST/query/mutation shapes to mirror.
- `src/index.ts` — public API surface.
- `src/components/ShopifyProductSyncForm.tsx`, `lib/resolve-shopify-product-sync-submit.ts`, `lib/shopify-product-sync-dimensions.ts`, `components/fields/ShopifyProductSyncShopField.tsx`, `providers/ShopifyProductSyncFormProvider.tsx`, `surface-ids.ts`, `pages/ShopifyProductSyncSlidePage.tsx` — current behavior to remove/rewire.
- `packages/ui/.../SearchableSelectInput.tsx` + `option-list.types.ts` — exact `SearchableSelectOption` / `SearchableSelectResult` contract the adapter must satisfy.
- `packages/tasks/.../TasksView.tsx` / `TasksHeader.tsx`, `packages/cases/.../use-cases-view.controller.ts` — the established `SearchBar` + 300 ms debounce query-state pattern.
- `apps/workers-app/.../use-task-step-detail.controller.ts` — the surface opener (Clarification 2 evidence).

No prohibited pattern reads are required — all "how to write" questions are answered by the contracts above.

### Skill selection

- Not applicable at planning time. During implementation the resolver/adapter work touches no chart/artifact/config skills. `verify` / `run` (drive the workers app to the product-sync slide) and `/code-review` apply at implementation close.

## Implementation plan

Build strictly bottom-up (logic before UI), top-down assembly of UI. Steps 1–12 are unblocked by Clarification 1; step 14 is gated.

### Layer 1 — Types & schemas (`src/types.ts`)

1. **Add response/request Zod schemas + inferred types** (intention §34), following existing casing (snake_case API fields, `z.infer` type exports), reusing `ShopifyUserReferenceSchema` for `created_by`:
   - `ShopifyMetafieldValidationSchema` = `{ name: string, value: string | null }` (confirm `value` nullability against a live payload; handoff shows `"value": "[...]"` strings and empty `validations: []`).
   - `ShopifyMetafieldDefinitionSchema` = `{ shopify_metafield_definition_id, name, namespace, key, description: string|null, type, validations: ShopifyMetafieldValidation[] }` (search-result shape).
   - `ShopifyMetafieldPreferenceSchema` = definition + `{ client_id, item_category_id, shop_integration_id, sequence_order: int, is_enabled: bool, created_at, updated_at: string|null, created_by }` (saved-preference shape — **kept distinct**, not a shared ambiguous type).
   - `ShopifyMetafieldPreferenceItemCategorySchema` = `{ item_category_id, metafield_preferences: ShopifyMetafieldPreference[] }`.
   - `ShopifyMetafieldPreferenceShopResultSchema` = `{ shop_integration_id, shop_domain: string|null, item_categories: [...], unavailable_definition_ids: string[], search_results: ShopifyMetafieldDefinition[] }`.
   - `ShopifyMetafieldPreferencesResponseSchema` = `{ shops: ShopifyMetafieldPreferenceShopResult[] }`.
   - `CreateShopifyMetafieldPreferencesRequestSchema` = `{ item_category_id: string, preferences: z.array({ shop_integration_id, shopify_metafield_definition_id: gid-regex, sequence_order: int().min(0) }).min(1) }`. Enforce the `gid://shopify/MetafieldDefinition/...` regex client-side to fail fast before the network call.
   - `CreateShopifyMetafieldPreferencesResponseSchema` = `z.array(ShopifyMetafieldPreferenceSchema)` (plain array, request order).
2. **Add front-end normalized/model types** (intention §11, §18, §20; camelCase, matching existing internal casing):
   - `ShopifyMetafieldFieldSource = "saved_preference" | "search_result"`.
   - `ShopifyMetafieldField` (identity, source, preferenceClientId?, shopIntegrationId, shopDisplayName, shopDomain?, shopifyMetafieldDefinitionId, itemCategoryId?, name, namespace, key, description, type, validations, sequenceOrder, value: string | null, and a `draftValue`/`isValid` distinction per §19).
   - `ShopifyMetafieldFormValue` (shopIntegrationId, shopifyMetafieldDefinitionId, namespace, key, type, value: string, sequenceOrder) — **final serialized shape is gated on Clarification 1**; define the internal model now, align the submit mapping later.
   - `PendingShopifyMetafieldPreference` (itemCategoryId, shopIntegrationId, shopifyMetafieldDefinitionId, sequenceOrder).
3. **Amend `ShopifyProductSyncFormSchema`** (intention §30): remove `heightCm`/`widthCm`/`depthCm`; add `metafields: z.array(ShopifyProductSyncMetafieldValueSchema)` validating shopIntegrationId, definitionId, namespace, key, type, value (non-numeric-safe) + supported type constraints. Update `ShopifyProductSyncFormValues`.
4. **Amend `ProcessShopifyProductItemRequestSchema.metafields`** — **DEFERRED to step 14** (Clarification 1). Leave the existing schema untouched until the contract is confirmed so typecheck stays green.

### Layer 2 — Query keys (`src/api/shopify-keys.ts`)

5. Extend the `shopifyKeys` factory with **distinct** category and search keys (intention §33), keys normalized (sort `shopIntegrationIds`, sort `itemCategoryIds`, trimmed lowercased `q`, `onlyMyPreferences`):
   - `metafieldPreferences: () => [...all, "metafield-preferences"]`
   - `metafieldPreferencesCategory: ({ shopIntegrationIds, itemCategoryIds, onlyMyPreferences }) => [...metafieldPreferences(), "category", {...}]`
   - `metafieldPreferencesSearch: ({ shopIntegrationIds, q }) => [...metafieldPreferences(), "search", {...}]`
   Update `src/api/shopify-keys.test.ts`.

### Layer 3 — API functions + query hook

6. `src/api/get-shopify-metafield-preferences.ts` — `getShopifyMetafieldPreferences(params)` using `apiClient.get("/api/v1/integrations/shopify/metafield-preferences", Envelope, queryParams)`. Serialize `shop_integration_ids` / `item_category_ids` as comma-joined strings, include `q` / `only_my_preferences` only when present. Envelope = `ApiEnvelopeSchema(ShopifyMetafieldPreferencesResponseSchema).extend({ ok: z.literal(true) })`; return `.data`.
7. `src/api/use-shopify-metafield-preferences-query.ts` — a param-driven hook using **query-enabling conditions** (intention §8, §6, §7). Two call sites (category, search) select the correct key + `enabled` flag rather than firing both:
   - Category `enabled`: `shopIntegrationIds.length > 0 && !!itemCategoryId && !hasValidSearch`.
   - Search `enabled`: `shopIntegrationIds.length > 0 && normalizedQuery.length > 3`.
   - Never send `item_category_ids` while search is active.
   - Set `placeholderData: keepPreviousData` so stale-but-present data isn't blanked; guard against out-of-order responses by keying on normalized params (TanStack already discards superseded keys).
   Export `useShopifyMetafieldPreferencesCategoryQuery` and `useShopifyMetafieldPreferencesSearchQuery` (thin wrappers) for clarity, or one hook parameterized by `mode`.

### Layer 4 — Mutation action

8. `src/api/create-shopify-metafield-preferences.ts` — `createShopifyMetafieldPreferences(input)` = `apiClient.post(".../metafield-preferences", Envelope, CreateShopifyMetafieldPreferencesRequestSchema.parse(input))`, returns `.data` (array). (Placement in `api/` + hook in `actions/` follows the existing `process-shopify-products` convention, **not** the intention's suggested `actions/create-...` path.)
9. `src/actions/use-create-shopify-metafield-preferences.ts` — `useMutation({ mutationFn: createShopifyMetafieldPreferences })`. On success, invalidate `shopifyKeys.metafieldPreferencesCategory(...)` for the affected category+shops (intention §24 "invalidate and refetch" combined with direct reconciliation in the controller). Preserve pending candidates on error (no cache mutation on failure).

### Layer 5 — Pending store (Zustand) & lib helpers

10. `src/store/use-shopify-metafield-pending-preferences-store.ts` (folder `store/` singular, per `item-categories`/`cases`/`tasks` convention — deviates from intention's `stores/`). State: a `Map`/record keyed by identity `itemCategoryId:shopIntegrationId:shopifyMetafieldDefinitionId` (intention §20). Actions: `upsert`, `remove(identity)`, `removeByShop(shopIntegrationId)`, `removeByCategory(itemCategoryId)`, `clear`, `list()`. Deduplicate by identity. Store holds **only unsaved** candidates.
11. lib helpers (each unit-tested):
   - `src/lib/shopify-metafield-identity.ts` — `createMetafieldFieldIdentity(shopIntegrationId, definitionId)` → `` `${shopIntegrationId}:${definitionId}` `` (intention §3). Used for dedupe, keys, values, pending, reconciliation, removal.
   - `src/lib/parse-metafield-choices.ts` — `parseMetafieldChoices(validations)` defensively JSON-parsing the `choices` validation (intention §15); returns `string[]`, `[]` on malformed.
   - `src/lib/resolve-shopify-metafield-input.ts` — `resolveMetafieldInputKind(definition)` → `"choice" | "text" | "url" | "unsupported"` inspecting `type` + `validations` only (no I/O). Supported set: `single_line_text_field` (choice if valid non-empty choices, else text), `url`.
   - `src/lib/normalize-shopify-metafield-fields.ts` — DTO transform (contract 24): response shops → ordered `ShopifyMetafieldField[]`, attaching `shopDisplayName` (prefer the integration's `shop_name`, fall back to normalized `shop_domain`), preserving `sequence_order` per shop, tagging `source`, and carrying `unavailable_definition_ids` per shop for feedback.
   - `src/lib/shopify-metafield-value.ts` — `isMetafieldFieldFilled(field)` (choice: valid option selected; text: trimmed non-empty; url: trimmed non-empty **and** valid; unsupported: never) and `toShopifyMetafieldFormValues(fields)` producing committed values (final serialization aligned in step 14). Inspect existing URL validation conventions before adding a validator (intention §16); reuse if one exists, otherwise add a minimal `isValidUrl` here.

### Layer 6 — Controller (`src/controllers/`)

12. `src/controllers/use-shopify-metafield-picker.controller.ts` (`.controller.ts` suffix per package convention; `useShopifyMetafieldPickerController`). Responsibilities (intention §36, §40):
    - Normalize `shopIntegrationIds`; compute `shouldDisplayShopIdentity = shopIntegrationIds.length > 1` (presentation only — never gates identity/query/preference/submission).
    - Own `searchQuery` + `debouncedQuery` (300 ms `setTimeout` pattern from `use-cases-view.controller.ts`); derive `hasValidSearch = debouncedQuery.trim().length > 3`.
    - Drive category vs search queries via the enabling flags (step 7); map results through `normalize-shopify-metafield-fields`.
    - Maintain **active fields** (merge saved-preference fields + user-selected search-result fields), dedupe by identity, prevent duplicate active fields per shop; assign deterministic per-shop `sequenceOrder` for new selections after existing fields.
    - Maintain committed values and emit them to the parent via `onChange` (RHF authority) — no second source of truth.
    - Pending logic (intention §21): a `search_result` field with a valid confirmed value and an available `itemCategoryId` → `store.upsert`; becomes empty/invalid → `store.remove`. Saved preferences never enter the store.
    - Reconcile successful creation (intention §24): flip matching fields `search_result → saved_preference`, set `preferenceClientId`, drop matching pending candidates, avoid duplicate active fields; rely on category-query invalidation for server truth.
    - Lifecycle cleanup (intention §21, §26, §27, §28): shop deselected → drop that shop's active + pending fields, keep others; category changed → clear previous-category saved + pending + (default) manually-selected fields, block stale responses; search cleared → keep active fields + values + pending, hide results.
    - Expose per-scope loading (category skeleton vs search spinner) and per-operation error state; surface `unavailable_definition_ids` per shop.

### Layer 7 — Components (`src/components/metafields/`)

13. Build the component tree (intention §35; add `data-testid` to every feature-critical element per `34_runtime_validation_local.md`). Components consume the controller/props only — never the API/action layer directly (contract 07):
    - `ShopifyMetafieldPickerForm.tsx` — top-level; props `{ shopIntegrationIds, itemCategoryId, value, onChange }`; instantiates the controller; lays out header/search, search results, active fields, and empty/loading/error/no-category states (intention §39, §37, §38).
    - `ShopifyMetafieldSearch.tsx` — `SearchBar` from `@beyo/ui` wired to controller `searchQuery`/`setSearchQuery` (mirrors `TasksHeader`); shows `isLoading` during search.
    - `ShopifyMetafieldSearchResults.tsx` — renders `search_results` grouped/identified per shop **only** when `shouldDisplayShopIdentity`; shows name (+ namespace/key/type/description as secondary context); selection handler adds an active field (intention §9, §10). Distinct search-error slot.
    - `ShopifyMetafieldFields.tsx` — active-field list, grouped per shop (labeled only in multi-shop), preserving per-shop sequence; renders `unavailable_definition_ids` feedback chips; never mixes unlabeled multi-shop fields.
    - `ShopifyMetafieldField.tsx` — one active field: label, shop label (multi-shop only), resolved input, description/supporting text, remove control (Clarification 6).
    - `ShopifyMetafieldInputResolver.tsx` — pure switch on `resolveMetafieldInputKind`; renders the correct input adapter or the unsupported field; performs no I/O and owns no preference state (intention §13).
    - `ShopifyMetafieldUnsupportedField.tsx` — name + unsupported type + short explanation; never editable/filled/pending (intention §17).
    - `inputs/ShopifyMetafieldTextInput.tsx` — wraps `@beyo/ui` `TextInput`; trimmed-non-empty = filled.
    - `inputs/ShopifyMetafieldUrlInput.tsx` — `TextInput` with URL `type`/`inputMode`; preserves raw draft; validates before submit.
    - `inputs/ShopifyMetafieldChoiceInput.tsx` — **adapter** around `SearchableSelectInput`: parse choices → `SearchableSelectOption[]` (`value === displayValue === choice`), pass `forceSelection={true}`, map `SearchableSelectResult` → string (`type:"option"` → `option.value`; `null` → clear; `type:"text"` → **reject** for predefined choices), forward `disabled`/`invalid`. Reimplements none of the popup/filter/keyboard/selection logic (intention §35, §13, acceptance 16–19).

### Layer 8 — Parent form integration & removals

14. **Submission serialization (GATED on Clarification 1).** In `src/lib/resolve-shopify-product-sync-submit.ts`:
    - Remove the `Record<string, number>` dimension construction and the `shopify-product-sync-dimensions` imports.
    - Build the metafields payload from `values.metafields`, excluding empty/invalid/unsupported fields, scoped per the **confirmed** `products/process` contract.
    - Apply the confirmed change to `ProcessShopifyProductItemRequestSchema.metafields` (step 4) once the shape is known.
15. **Form-filled logic** (`resolve-shopify-product-sync-submit.ts`, intention §31): `isFormFilled` = `sku` filled **OR** at least one dynamic metafield valid+filled **OR** `title` filled **OR** `description` filled. Unfilled preferences, unfilled selections, and unsupported fields never count as filled. Update `resolve-shopify-product-sync-submit.test.ts`.
16. **`ShopifyProductSyncForm.tsx`** (intention §29):
    - Remove `ShopifyProductSyncDimensionField`, `SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS` imports and the dimension `ContentCard` map; drop `heightCm/widthCm/depthCm` defaults.
    - Add `metafields: []` default; register/`useController` a `metafields` field; render `<ShopifyMetafieldPickerForm shopIntegrationIds={watch("shopIntegrationIds")} itemCategoryId={ctx.itemCategoryId} value={metafields} onChange={...} />` inside the replacement `ContentCard`.
    - In `handleSubmit`, after a successful `mutation.mutateAsync`, trigger parent-controlled preference persistence (Clarification 3): read pending candidates from the store, skip if empty (acceptance 24), else call `useCreateShopifyMetafieldPreferences` with `item_category_id` + deduped, ordered, saved-excluded, valid-only entries (intention §23); reconcile via controller/cache on success; preserve candidates on failure.
17. **Provider + surface props (Clarification 2):**
    - `src/providers/ShopifyProductSyncFormProvider.tsx` — add `itemCategoryId: string | null` to the context `Value`.
    - `src/surface-ids.ts` — add `itemCategoryId?: string | null` to `ShopifyProductSyncSlideSurfaceProps`.
    - `src/pages/ShopifyProductSyncSlidePage.tsx` — pass `itemCategoryId={props.itemCategoryId ?? null}`.
    - `apps/workers-app/.../use-task-step-detail.controller.ts` `handleComplete` — add `itemCategoryId: step.item?.item_category_id ?? null` to the `openSurface(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, {...})` props.
18. **Delete dimension files:** `src/lib/shopify-product-sync-dimensions.ts` and `src/components/fields/ShopifyProductSyncDimensionField.tsx` (plus their tests/references). Grep the repo for `heightCm|widthCm|depthCm|SHOPIFY_PRODUCT_SYNC_DIMENSION_FIELDS|ShopifyProductSyncDimensionField|totalheight|totalwidth|totaldepth` and remove all.

### Layer 9 — Public API (`src/index.ts`)

19. Export new **types** (`ShopifyMetafieldDefinition`, `ShopifyMetafieldPreference`, `ShopifyMetafieldPreferencesResponse`, `CreateShopifyMetafieldPreferencesRequest`, `ShopifyMetafieldFormValue`, etc.) and, if a host needs them, the query/action hooks and updated schemas. Keep the `components/metafields/*` tree **internal** (consumed only by the package's own form; §35 keeps package internals unexported). Add the new query keys via the existing `shopifyKeys` export (already exported).

### Layer 10 — Tests, Playwright, runtime validation

20. Vitest unit/component tests (Layer 11 below). 21. Playwright spec + mobile-then-desktop runtime validation (Validation plan below).

## Risks and mitigations

- **Risk:** Clarification 1 stays unresolved, blocking submission. **Mitigation:** steps 1–13, 15–19 proceed independently; keep `ProcessShopifyProductItemRequestSchema` untouched until confirmed; isolate serialization in `resolve-shopify-product-sync-submit.ts` behind one function so wiring is a small, late change.
- **Risk:** Stale category/search responses overwrite newer state on rapid shop/category/query changes. **Mitigation:** normalized query keys + `enabled` gating + `keepPreviousData`; controller ignores results whose normalized params don't match current selection.
- **Risk:** Two authoritative value sources (controller vs RHF) drift. **Mitigation:** RHF is sole authority (Clarification 4); controller emits `onChange` only; no committed-value copy in the store (store holds pending identities, not values).
- **Risk:** Adapter re-implements or mutates `SearchableSelectInput` behavior. **Mitigation:** adapter only parses choices + maps results; `forceSelection` + option mapping only; a test asserts no duplicated filtering/popup/keyboard logic and that `text` results are rejected.
- **Risk:** Multi-shop equivalent definitions collapse into one field. **Mitigation:** identity includes `shopIntegrationId`; dedupe/keys/values/pending all use `createMetafieldFieldIdentity`; test for equivalent GIDs across shops.
- **Risk:** Atomic create failure leaves UI thinking preferences saved. **Mitigation:** reconcile only on success; preserve pending on error; no optimistic source flip.
- **Risk:** Shopify characteristics drift between save and read (handoff note). **Mitigation:** treat Route 2 as source of truth; don't cache definition characteristics long-term; reconcile from category query.
- **Risk:** No committed vitest runner currently targets `packages/shopify` tests (only `packages/ui/vitest.config.ts` exists; app configs include only their own `src/`). **Mitigation:** add `packages/shopify/vitest.config.ts` mirroring `packages/ui/vitest.config.ts` and a root `test:shopify` script, so the new (and existing) shopify unit tests actually execute.
- **Risk:** `itemCategoryId` unavailable for some entry points, disabling preferences. **Mitigation:** intended — search still works; category preload + creation stay disabled; render the "no item category" empty state (intention §39) without implying persistence.

## Validation plan

- `npm run typecheck` (root; includes `tsc -p packages/shopify/tsconfig.json` and the three apps): zero TypeScript errors after schema + surface-prop changes.
- Vitest (shopify package): all new unit/component tests pass, existing `resolve-shopify-product-sync-submit.test.ts` updated and green. Run via the added `packages/shopify/vitest.config.ts` (see risk). Normalized required tests (intention §43, one continuous sequence):
  1. Category mode runs with shops + category + no valid search.
  2. Search mode runs when debounced query length > 3.
  3. Category mode disabled while search active.
  4. Search mode disabled when search cleared.
  5. Search debounced 300 ms.
  6. No query without selected shops.
  7. No category query without item category.
  8. Stale category responses don't overwrite newer category.
  9. Stale search responses don't overwrite newer search.
  10. All selected integration IDs passed to the query.
  11. Results remain grouped by shop.
  12. Equivalent-looking definitions from different shops stay distinct.
  13. Deselecting a shop removes its active + pending fields.
  14. Requested shop order preserved.
  15. Raw shop domains never sent.
  16. One shop → active fields render no shop label.
  17. One shop → search results render no shop label.
  18. Multiple shops → every active field identifies its shop.
  19. Multiple shops → every search result identifies its shop / labeled group.
  20. Identical names across shops stay visually distinguishable.
  21. Hiding the shop label doesn't remove `shop_integration_id`.
  22. One→multiple shops reveals labels without recreating values.
  23. Multiple→one hides labels without losing values.
  24. Search results render from `shops[].search_results`.
  25. Selecting a search result adds one active field.
  26. Selecting the same shop-specific definition twice doesn't duplicate.
  27. Equivalent definitions from different shops create separate fields.
  28. Clearing search preserves selected active fields.
  29. Search errors don't clear active values.
  30. Queries ≤ 3 chars don't call the backend.
  31. Category preferences render from `metafield_preferences`.
  32. Preferences render in `sequence_order`.
  33. Saved preferences don't enter the pending store.
  34. `created_by` remains available in normalized preference data.
  35. Unavailable IDs produce visible shop-specific feedback.
  36. No saved preferences → correct empty state.
  37. `single_line_text_field` without choices → `TextInput`.
  38. `single_line_text_field` with valid choices → `SearchableSelectInput`.
  39. Choice strings map to options whose `value` and `displayValue` equal the choice.
  40. Choice-based metafields pass `forceSelection={true}`.
  41. Selecting an option stores the option value as the metafield value.
  42. Clearing the searchable select clears the metafield value.
  43. A `text` result is not accepted for a predefined-choice metafield.
  44. The adapter doesn't duplicate filtering/popup/keyboard/selection logic.
  45. Malformed choices fall back safely.
  46. `url` renders the URL input.
  47. Unsupported types render the unsupported component.
  48. The resolver performs no API calls.
  49. The resolver doesn't persist preferences.
  50. A valid filled search-result field enters the pending store.
  51. Selecting without filling creates no pending candidate.
  52. Invalid values create no pending candidate.
  53. Saved preferences never enter the pending store.
  54. Pending candidates are deduplicated.
  55. Clearing a pending field removes its candidate.
  56. Changing category clears previous-category candidates.
  57. Deselecting a shop clears that shop's candidates.
  58. Successful creation removes matching candidates.
  59. Failed creation preserves candidates.
  60. Parent skips the create mutation when no pending candidates exist.
  61. One batch request may contain candidates from multiple shops.
  62. Several definitions for one shop are allowed.
  63. Exact duplicate shop-and-definition pairs are removed.
  64. The item category ID is required for creation.
  65. Successful responses convert unsaved fields into saved preferences.
  66. Atomic backend failure marks no candidate as saved.
  67. Hardcoded dimension fields removed.
  68. Dimension-specific default values removed.
  69. Dimension-specific schema fields removed.
  70. Dimension-specific filled-state logic removed.
  71. A valid dynamic metafield makes the form count as filled.
  72. An unfilled saved preference doesn't make the form count as filled.
  73. An unfilled search selection doesn't make the form count as filled.
  74. Unsupported fields don't make the form count as filled.
  75. Final metafield submission follows the confirmed backend contract (gated on Clarification 1).
- `npx playwright test --project=mobile` (workers app): metafield flow — open product-sync slide from step completion, select shop(s), preload category preferences, search (>3 chars, debounced), add a search result, fill a choice + a text/url field, verify form-filled → "Sync", and (with Clarification 1 resolved) a successful sync followed by preference persistence. Spec at `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/shopify/metafield-picker.spec.ts`, importing from the app fixture and calling `auth.signIn()`.
- `npx playwright test --project=desktop`: same flow on the desktop project.
- `verify` / `run` skill: drive the workers app to the slide and confirm real behavior (single-shop = no labels, multi-shop = labels, unsupported presentation, unavailable-definition feedback).

## Review log

- `2026-07-13` `owner`: Initial plan drafted from intention + backend handoff + code inspection. One blocking clarification (products/process dynamic payload) outstanding; clarifications 2–6 resolved with recorded decisions.
- `2026-07-13` `Codex`: Implemented the dynamic picker, verified the existing products/process contract in backend source, passed package tests and workspace typecheck, and archived the plan with the remaining backend type/namespace limitation documented.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`; implementation summary and archive record are complete.
- Transition owner: `Codex`
