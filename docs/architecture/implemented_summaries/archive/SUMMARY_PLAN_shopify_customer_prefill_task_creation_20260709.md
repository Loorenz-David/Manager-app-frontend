# SUMMARY_PLAN_shopify_customer_prefill_task_creation_20260709

## Metadata

- Summary ID: `SUMMARY_PLAN_shopify_customer_prefill_task_creation_20260709`
- Status: `summarized`
- Owner agent: `Codex (GPT-5)`
- Created at (UTC): `2026-07-09T12:11:20Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_customer_prefill_task_creation_20260709.md`

## What was implemented

- Added Shopify customer lookup DTOs, query keys, a typed POST fetcher, and a dedicated TanStack Query hook inside `@beyo/task-creation` for `/api/v1/integrations/shopify/customers/by-product-identity`.
- Added pure selection and mapping helpers so combined `sku` + `article_number` responses resolve to one preferred customer result and map only the supported customer-form fields.
- Added `useShopifyCustomerLookupPrefill`, which watches item identity values, applies the lookup thresholds, performs non-blocking customer lookup prefill, and preserves manually diverged customer fields from later overwrites.
- Added `ShopifyCustomerStatusPill` and wired the prefill/status flow into `PreOrderFormContent` and `ReturnFormContent`, while keeping `ItemIdentityField` and `InternalFormContent` unchanged and disabling the lookup for `store_return`.
- Added focused unit coverage for the selector, mapper, and prefill hook behavior.

## Files changed

- `packages/task-creation/package.json`
- `packages/task-creation/src/api/fetch-shopify-customer-lookup.ts`
- `packages/task-creation/src/api/shopify-customer-lookup-keys.ts`
- `packages/task-creation/src/api/use-shopify-customer-lookup-query.ts`
- `packages/task-creation/src/components/PreOrderFormContent.tsx`
- `packages/task-creation/src/components/ReturnFormContent.tsx`
- `packages/task-creation/src/components/ShopifyCustomerStatusPill.tsx`
- `packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.ts`
- `packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.test.tsx`
- `packages/task-creation/src/lib/map-shopify-customer-to-form-fields.test.ts`
- `packages/task-creation/src/lib/map-shopify-customer-to-form-fields.ts`
- `packages/task-creation/src/lib/select-shopify-customer-lookup-result.test.ts`
- `packages/task-creation/src/lib/select-shopify-customer-lookup-result.ts`
- `packages/task-creation/src/types.ts`

## Contract adherence

- `architecture/04_api_client.md`: the new lookup fetcher uses `apiClient.post(...)` with an envelope schema at the HTTP boundary.
- `architecture/05_server_state.md`: the lookup owns a dedicated query key factory and query hook with `staleTime: 30_000` and `retry: false`.
- `architecture/06_client_state.md`: transient lookup/injection state stays local to the composed hook via refs/effects rather than shared store state.
- `architecture/09_forms.md`: customer fields are injected with `form.setValue(..., { shouldDirty: true })` and kept within the existing RHF form state.
- `architecture/15_feature_structure.md`: new logic lives under `src/api/`, `src/lib/`, `src/hooks/`, and `src/components/` inside the owning feature package.
- `architecture/24_dto.md`: Shopify lookup request/response DTOs are defined in `types.ts`, and mapping to form fields is handled separately from the response DTO.

## Validation evidence

- `npm run typecheck`: `pass`
- `npx vitest run packages/task-creation/src/lib/select-shopify-customer-lookup-result.test.ts packages/task-creation/src/lib/map-shopify-customer-to-form-fields.test.ts packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.test.tsx`: `pass` (`8` tests)
- Manual runtime validation: not run
- `npx playwright test --project=mobile`: not run

## Known gaps or deferred items

- No Playwright/runtime validation was added in this pass; the plan explicitly deferred that follow-up.
- Query errors are intentionally treated as a silent, non-blocking not-found state in the UI, matching the feature plan’s failure-handling requirement.

## Handoff notes (if needed)

- Backend contract: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_customer_lookup_by_product_identity_20260709.md`

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Archived plan: `docs/architecture/archives/implementation/PLAN_shopify_customer_prefill_task_creation_20260709.md`
