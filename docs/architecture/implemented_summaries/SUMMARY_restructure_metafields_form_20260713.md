# SUMMARY_restructure_metafields_form_20260713

## Metadata

- Summary ID: `SUMMARY_restructure_metafields_form_20260713`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-13T11:22:14Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_restructure_metafields_form_20260713.md`
- Intention plan: `docs/architecture/under_construction/intention/restructuring_metafields_form.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_metafield_preferences_20260713.md`

## What was implemented

- Replaced the hardcoded height/width/depth fields with a reusable, controlled metafield picker in `@beyo/shopify`.
- Placed the picker in its own `Metafields` staged-form step between `Target` and `Content`, while keeping its values controlled by the parent RHF form.
- Added Zod schemas and normalized models for saved preferences, live definitions, create requests, shop-specific active fields, and committed form values.
- Added normalized category/search query keys, GET query hooks with mutually exclusive modes and 300 ms debounce, and the atomic create-preferences mutation.
- Added shop/category-scoped pending preference state with deduplication, cleanup, and successful-create reconciliation through query invalidation.
- Added field identity, choice parsing, input resolution, normalization, URL validation, and form-value helpers.
- Added text, URL, predefined-choice, and unsupported resolver branches. Every branch renders the metafield name through the shared `FieldLabelRow` primitive; predefined choices compose `SearchableSelectInput` with `forceSelection`.
- Added saved-field hydration, search-result activation/removal, unavailable-definition feedback, single-/multi-shop labeling, and shop/category lifecycle cleanup.
- Threaded the internal item-category ID from the workers task-step controller through the Shopify surface and provider.
- Removed all dimension files, schema fields, defaults, rendering, filled-state checks, and submission mapping.
- Added a Shopify package Vitest runner and updated its stale test harness expectations.

## Submission contract decision

- The current backend `products/process` route still accepts `metafields` as a key-to-scalar map and normalizes values as `single_line_text_field`.
- When metafields are present, the frontend emits one process item per selected shop and includes only that shop's values. This preserves shop scoping under the existing contract.
- The existing route cannot yet preserve `shopify_metafield_definition_id`, namespace, or the Shopify `url` type. A backend contract extension is still required for full type/namespace fidelity; the frontend retains those attributes in form state so a later serialization update stays localized.

## Validation evidence

- `npm run test:shopify`: pass, 30 files / 78 tests.
- `npm run typecheck`: pass, zero TypeScript errors across all three apps and shared packages in the root script.
- Dimension residue grep: no remaining `heightCm`, `widthCm`, `depthCm`, dimension component/constants, or legacy total-dimension metafield keys in the Shopify package or workers source.
- Playwright runtime validation was not run because this workspace requires live authenticated Shopify/category data for the planned end-to-end flow.

## Files changed

- `packages/shopify/src/types.ts`, `api/`, `actions/`, `controllers/`, `store/`, and `lib/`: dynamic metafield domain and orchestration layers.
- `packages/shopify/src/components/metafields/`: picker presentation and input adapters.
- `packages/shopify/src/components/ShopifyProductSyncForm.tsx`: controlled field and parent persistence integration.
- `packages/shopify/src/providers/ShopifyProductSyncFormProvider.tsx`, `surface-ids.ts`, and `pages/ShopifyProductSyncSlidePage.tsx`: item-category threading.
- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`: surface opener now supplies the internal category ID.
- `packages/shopify/vitest.config.ts`, package tests, and root/package manifests: executable package test coverage.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive record: `docs/architecture/archives/ARCHIVE_restructure_metafields_form_20260713_1122.md`
