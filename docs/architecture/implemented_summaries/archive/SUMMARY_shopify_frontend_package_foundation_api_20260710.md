# SUMMARY_shopify_frontend_package_foundation_api_20260710

## Metadata

- Summary ID: `SUMMARY_shopify_frontend_package_foundation_api_20260710`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_frontend_package_foundation_api_20260710.md`
- Implemented at (UTC): `2026-07-08T14:17:48Z`

## Implementation summary

- Created the new shared package `@beyo/shopify` under `packages/shopify` with its own `package.json`, `tsconfig.json`, and a Phase 1 public barrel.
- Implemented contract-accurate Shopify Zod schemas and inferred types for shop integrations, webhook subscriptions, webhook history records, response payloads, and the OAuth result params without introducing deferred-route fields or `raw_payload`.
- Wrapped the 7 approved v1 backend routes with `@beyo/api-client` envelope parsing, added Shopify query keys, standard React Query hooks, a webhook-history infinite query, and mutation hooks for install URL creation, reauthorize URL creation, disconnect, and per-shop webhook sync.
- Added `useShopifyIntegrationPermissions()` backed by `useRole()` from `@beyo/auth`, matching the required admin/manager/worker/seller matrix exactly.
- Added focused Vitest coverage for the permission matrix, query key shapes, selected API path/method/body contracts, one query hook, one mutation hook, and a package export smoke check.
- Extended the root `npm run typecheck` script so `packages/shopify` is validated even before any app imports it.

## Verification

- `npx tsc -p packages/shopify/tsconfig.json --noEmit`: passed.
- `npm run typecheck`: passed.
- `npx vitest run --environment jsdom packages/shopify/src/lib/use-shopify-integration-permissions.test.ts`: passed.
- `npx vitest run --environment jsdom packages/shopify/src/api/shopify-keys.test.ts`: passed.
- `npx vitest run --environment jsdom packages/shopify/src/api/create-shopify-install-url.test.ts packages/shopify/src/api/disconnect-shopify-shop.test.ts packages/shopify/src/api/use-list-shopify-shops-query.test.tsx packages/shopify/src/actions/use-disconnect-shopify-shop.test.tsx packages/shopify/src/index.test.ts`: passed.

## Notes

- Deferred routes `POST /api/v1/integrations/shopify/webhooks/sync` and `GET /api/v1/integrations/shopify/scopes` were intentionally not wrapped in Phase 1.
- No UI, routing, surface wiring, backend, or `.env` changes were implemented.
