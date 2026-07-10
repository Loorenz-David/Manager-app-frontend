# SUMMARY_shopify_frontend_shop_detail_view_20260710

## Metadata

- Summary ID: `SUMMARY_shopify_frontend_shop_detail_view_20260710`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_detail_view_20260710.md`
- Implemented at (UTC): `2026-07-08T15:51:01Z`

## Files created

- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`
- `packages/shopify/src/components/ShopifyIntegrationDetailHeader.tsx`
- `packages/shopify/src/components/ShopifyIntegrationScopesSection.tsx`
- `packages/shopify/src/components/ShopifyIntegrationTechnicalDetails.tsx`
- `packages/shopify/src/components/ShopifyIntegrationErrorPreview.tsx`
- `packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.tsx`
- `packages/shopify/src/components/ShopifyDetailBottomActions.tsx`
- `packages/shopify/src/lib/shopify-formatters.ts`
- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx`
- `packages/shopify/src/components/ShopifyIntegrationScopesSection.test.tsx`
- `packages/shopify/src/components/ShopifyIntegrationTechnicalDetails.test.tsx`
- `packages/shopify/src/components/ShopifyIntegrationErrorPreview.test.tsx`
- `packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.test.tsx`
- `packages/shopify/src/lib/shopify-status.test.ts`

## Files modified

- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`
- `packages/shopify/src/lib/shopify-status.ts`
- `packages/shopify/src/index.ts`
- `packages/shopify/src/index.test.ts`
- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx`

## Files deleted

- `packages/shopify/src/containers/ShopifyIntegrationDetailPlaceholder.tsx`

## Implementation summary

- Replaced the Phase 2 detail placeholder with a real read-only `ShopifyIntegrationDetailContainer` inside `@beyo/shopify`, using `useGetShopifyShopQuery(selectedShopIntegrationId)` and rendering missing-id, loading, error-with-retry, and populated detail states.
- Added `ShopifyIntegrationDetailHeader` with back navigation, title/subtitle, created date, created-by provenance via `UserPill`, shop status pill, and a visible disabled three-dot menu button reserved for Phase 5.
- Added `ShopifyIntegrationScopesSection` with scopes-status pill, granted/requested scopes, and the approved outdated-scopes warning sentence only.
- Added `ShopifyIntegrationTechnicalDetails` with API/integration timestamps, health-check fields, and updated-by provenance using `ContentCard` and `FieldLabelRow`, with `—` placeholders for null values.
- Added `ShopifyIntegrationErrorPreview` for current error code/message or a calm `No current errors.` state.
- Added `ShopifyWebhookSubscriptionSummaryPreview` for summary counts and a small preview list of webhook subscriptions, without implementing any Phase 6 sheet/timeline UI.
- Added `ShopifyDetailBottomActions` with a fixed safe-area-aware footer: working `Back` action and visual-only disabled `Edit`.
- Added `shopify-formatters.ts` with `formatShopifyDetailDate(value)` plus a small fallback string helper for detail values.
- Extended `shopify-status.ts` with `shopifyScopesStatusVariant`, `shopifyScopesStatusLabel`, `shopifyWebhookSubscriptionStatusVariant`, and `shopifyWebhookSubscriptionStatusLabel`.
- Swapped `ShopifyIntegrationsSlidePage` from `ShopifyIntegrationDetailPlaceholder` to `ShopifyIntegrationDetailContainer`, then removed the obsolete placeholder file and export.

## Detail container implemented

- `ShopifyIntegrationDetailContainer`
- Query source: `useGetShopifyShopQuery(shopIntegrationId: string | null | undefined)`
- States implemented: missing selected id, loading, error with retry, populated detail, pull-to-refresh

## Sections and components implemented

- `ShopifyIntegrationDetailHeader`
- `ShopifyIntegrationScopesSection`
- `ShopifyIntegrationTechnicalDetails`
- `ShopifyIntegrationErrorPreview`
- `ShopifyWebhookSubscriptionSummaryPreview`
- `ShopifyDetailBottomActions`

## Status and formatter helpers added

- `formatShopifyDetailDate`
- `formatShopifyDetailValue`
- `shopifyScopesStatusVariant`
- `shopifyScopesStatusLabel`
- `shopifyWebhookSubscriptionStatusVariant`
- `shopifyWebhookSubscriptionStatusLabel`

## Verification

- `npm run typecheck`: passed.
- `npx vitest run --environment jsdom packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx packages/shopify/src/components/ShopifyIntegrationScopesSection.test.tsx packages/shopify/src/components/ShopifyIntegrationTechnicalDetails.test.tsx packages/shopify/src/components/ShopifyIntegrationErrorPreview.test.tsx packages/shopify/src/components/ShopifyWebhookSubscriptionSummaryPreview.test.tsx packages/shopify/src/lib/shopify-status.test.ts packages/shopify/src/index.test.ts packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx`: passed (`8` files, `15` tests).
- `npx vitest run --environment jsdom packages/shopify/src`: passed (`19` files, `37` tests).

## Scope confirmations

- No managers-app files were modified in this Phase 4 implementation.
- No backend files were modified.
- No `.env` files were modified.
- No Phase 5+ work was implemented.
- Not implemented by design in this phase: action sheet, reauthorize mutation UI, disconnect UI, manual webhook sync UI, webhook subscriptions bottom-sheet page, webhook history timeline UI, webhook history query rendering, workspace-wide webhook sync, separate scope-status endpoint, managers-app route/surface changes, backend changes, deployment changes.
