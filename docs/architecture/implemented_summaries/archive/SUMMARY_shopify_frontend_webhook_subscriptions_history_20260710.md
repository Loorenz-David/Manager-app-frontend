# SUMMARY_shopify_frontend_webhook_subscriptions_history_20260710

## Metadata

- Summary ID: `SUMMARY_shopify_frontend_webhook_subscriptions_history_20260710`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_frontend_webhook_subscriptions_history_20260710.md`
- Implemented at (UTC): `2026-07-08T18:04:20Z`

## Files created

- `packages/shopify/src/components/ShopifyWebhookHistorySection.tsx`
- `packages/shopify/src/components/ShopifyWebhookHistoryRecordCard.tsx`
- `packages/shopify/src/components/ShopifyWebhookIntakeRecordCard.tsx`
- `packages/shopify/src/components/ShopifyIntegrationEventRecordCard.tsx`
- `packages/shopify/src/components/ShopifyWebhookMetadataPreview.tsx`
- `packages/shopify/src/lib/shopify-history.ts`
- `packages/shopify/src/components/ShopifyWebhookHistorySection.test.tsx`
- `packages/shopify/src/components/ShopifyWebhookHistoryRecordCard.test.tsx`
- `packages/shopify/src/lib/shopify-history.test.ts`

## Files modified

- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`
- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx`
- `packages/shopify/src/lib/shopify-status.ts`
- `packages/shopify/src/lib/shopify-status.test.ts`
- `packages/shopify/src/index.ts`
- `packages/shopify/src/index.test.ts`
- `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_webhook_subscriptions_history_20260710.md`

## Webhook history section implemented

- Added `ShopifyWebhookHistorySection` as the fifth child in the existing Shopify detail pane content stack, after the unchanged inline subscription summary preview.
- The section uses `useShopifyWebhookHistoryInfiniteQuery({ shopIntegrationId: selectedShopIntegrationId })` exactly as approved, flattens `data.pages` in backend order, and renders loading, retry, empty, populated, and paginated "Show more" states.
- The section returns `null` when `selectedShopIntegrationId` is missing, matching the approved read-only detail-pane integration and relying on the hook's existing disabled-query behavior.

## Record cards implemented

- Added `ShopifyWebhookHistoryRecordCard` as the record-type dispatcher.
- Added `ShopifyWebhookIntakeRecordCard` for `webhook_intake` records, rendering topic, status pill, webhook id, retryable Yes/No, attempts, received/processing/processed timestamps, and `last_error` when present.
- Added `ShopifyIntegrationEventRecordCard` for `integration_event` records, rendering friendly event type, severity pill, message, created-at, `UserPill` when `created_by` exists, and deterministic system/source fallbacks when it does not.

## Metadata preview behavior

- Added `ShopifyWebhookMetadataPreview` plus `getShopifyMetadataPreviewEntries(metadata)` to keep metadata display readable and bounded.
- Metadata preview renders at most four scalar entries, formats booleans as `Yes` / `No`, omits nested objects, arrays, `null`, and `undefined`, and explicitly skips any `raw_payload` key.
- No raw webhook payload is modeled or rendered anywhere in the Phase 6 UI.

## Status and history helpers added

- Extended `packages/shopify/src/lib/shopify-status.ts` with:
  - `shopifyWebhookIntakeStatusVariant`
  - `shopifyWebhookIntakeStatusLabel`
  - `shopifyIntegrationEventSeverityVariant`
  - `shopifyIntegrationEventSeverityLabel`
  - `shopifyIntegrationEventTypeLabel`
- Added `packages/shopify/src/lib/shopify-history.ts` with:
  - `resolveShopifyIntegrationEventSourceLabel`
  - `getShopifyMetadataPreviewEntries`

## Pull-to-refresh history invalidation

- Extended `ShopifyIntegrationDetailContainer` pull-to-refresh so it still calls the existing detail `query.refetch()`, and now also invalidates `shopifyKeys.webhookHistoryRoot(selectedShopIntegrationId)` through the existing query-client pattern when a shop is selected.

## Tests run and results

- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyWebhookHistorySection.test.tsx`: passed (`7` tests).
- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyWebhookHistoryRecordCard.test.tsx`: passed (`3` tests).
- `npx vitest run --environment jsdom packages/shopify/src/lib/shopify-status.test.ts`: passed (`5` tests).
- `npx vitest run --environment jsdom packages/shopify/src/lib/shopify-history.test.ts`: passed (`3` tests).
- `npx vitest run --environment jsdom packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx packages/shopify/src/index.test.ts`: passed (`2` files, `6` tests).
- `npx vitest run --environment jsdom packages/shopify/src`: partial regression sweep completed with `60` passing tests and `1` pre-existing failure in `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx` caused by environment validation for missing `VITE_API_URL` during `@beyo/api-client` import. This failure was outside the Phase 6 files and was not introduced by this implementation.

## Typecheck result

- `npm run typecheck`: passed.

## Scope confirmations

- No managers-app files were modified by this Phase 6 implementation.
- No backend files were modified.
- No `.env` files were modified.
- No Phase 7 or later work was implemented.
- Not implemented by design in this phase: action sheet work, reauthorize UI, disconnect UI, manual webhook sync UI, workspace-wide webhook sync, separate scope-status endpoint/query, OAuth result page changes, managers-app surface/settings changes, backend changes, deployment changes, Phase 7 runtime/polish work.
