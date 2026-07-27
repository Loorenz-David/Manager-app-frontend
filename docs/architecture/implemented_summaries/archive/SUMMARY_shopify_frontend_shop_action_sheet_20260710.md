# SUMMARY_shopify_frontend_shop_action_sheet_20260710

## Metadata

- Summary ID: `SUMMARY_shopify_frontend_shop_action_sheet_20260710`
- Source plan: `docs/architecture/archives/implementation/PLAN_shopify_frontend_shop_action_sheet_20260710.md`
- Implemented at (UTC): `2026-07-08T17:48:04Z`

## Files created

- `packages/shopify/src/components/ShopifyShopActionsSheetContent.tsx`
- `packages/shopify/src/components/ShopifyShopActionsSheetContent.test.tsx`
- `packages/shopify/src/pages/ShopifyShopActionsSheetPage.tsx`
- `packages/shopify/src/pages/ShopifyShopActionsSheetPage.test.tsx`

## Files modified

- `packages/shopify/src/surface-ids.ts`
- `packages/shopify/src/index.ts`
- `packages/shopify/src/index.test.ts`
- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx`
- `packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx`
- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.tsx`
- `packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/shopify-integrations/surfaces.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/settings/controllers/use-settings-view.controller.test.tsx`

## Action sheet page/content implemented

- Added `ShopifyShopActionsSheetPage` as the package-owned sheet surface page. It reads `shopIntegrationId` from surface props, self-queries `useGetShopifyShopQuery(shopIntegrationId)`, renders missing/loading/error/retry states, wires the three Phase 1 mutation hooks, invalidates `shopifyKeys.shops()` after webhook sync success, and closes the host sheet via `requestClose()` after disconnect success.
- Added `ShopifyShopActionsSheetContent` as the presentational action list for the selected shop. It renders the approved action set only:
  - `Reauthorize Shopify integration`
  - `Sync webhooks`
  - `Disconnect Shopify integration`
- `Disconnect Shopify integration` uses `ConfirmActionButton`; reauthorize and sync use plain action buttons.

## Surface IDs, props, and loaders added

- Added `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID = "shopify-shop-actions-sheet"`.
- Added `ShopifyShopActionsSheetSurfaceProps = { shopIntegrationId: string }`.
- Extended `ShopifyIntegrationsSurfaceOpeners` with `openShopActions?: (props: ShopifyShopActionsSheetSurfaceProps) => void`.
- Exported `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID`, `ShopifyShopActionsSheetSurfaceProps`, `ShopifyShopActionsSheetContent`, and `loadShopifyShopActionsSheetPage()` from `packages/shopify/src/index.ts`.

## Managers-app sheet registration and opening

- Registered `SHOPIFY_SHOP_ACTIONS_SHEET_SURFACE_ID` in `apps/managers-app/ManagerBeyo-app-managers/src/features/shopify-integrations/surfaces.ts` as a `"sheet"` surface using `loadShopifyShopActionsSheetPage`.
- Extended `openShopifyIntegrations()` in the Settings controller to inject `surfaceOpeners.openShopActions`, and to open the new sheet with `{ shopIntegrationId }`.
- Threaded the package-side opener from `ShopifyIntegrationsSlidePage` into `ShopifyIntegrationDetailContainer`, which now forwards `onOpenActions` into the existing `ShopifyIntegrationDetailHeader` three-dot button.

## Action visibility behavior

- Reauthorize is shown only when `permissions.canCreateShopifyReauthorizeUrl` and `shop.scopes_status === "outdated"`.
- Sync webhooks is shown only when `permissions.canSyncShopifyWebhooksForShop` and `shop.status` is not `pending_install`, `disabled`, or `uninstalled`.
- Disconnect is shown only when `permissions.canDisconnectShopifyIntegration` and `shop.status` is not `disabled` or `uninstalled`.
- Managers see only reauthorize when scopes are outdated; they do not see sync or disconnect.
- No workspace-wide webhook sync action was added.
- No separate scope-status action, endpoint usage, or hook was added.

## Mutation behavior

- Reauthorize calls `useCreateShopifyReauthorizeUrl().mutateAsync(shopIntegrationId)` and redirects with `window.location.assign(result.install_url)`. No success toast is shown before redirect.
- Sync webhooks calls `useSyncShopifyWebhooksForShop().mutateAsync(shopIntegrationId)`, shows `Webhook sync started.`, and then invalidates `shopifyKeys.shops()`.
- Disconnect calls `useDisconnectShopifyShop().mutateAsync(shopIntegrationId)`, uses `ConfirmActionButton`, shows `Shopify integration disconnected.`, and closes the sheet without forcing list navigation.
- All three failure paths use `notify.error(...)`.

## Query invalidation behavior

- Reauthorize adds no extra invalidation before redirect.
- Sync webhooks relies on the existing Phase 1 detail/history invalidation in its hook, and additionally invalidates `shopifyKeys.shops()` from the sheet page.
- Disconnect relies on the existing Phase 1 hook invalidation (`shopifyKeys.shops()` and `shopifyKeys.webhookHistoryRoot(shopIntegrationId)`); no disconnect hook changes were made in this phase.

## Verification

- `npx vitest run --environment jsdom packages/shopify/src/components/ShopifyShopActionsSheetContent.test.tsx`: passed (`5` tests).
- `npx vitest run --environment jsdom packages/shopify/src/pages/ShopifyShopActionsSheetPage.test.tsx packages/shopify/src/pages/ShopifyIntegrationsSlidePage.test.tsx packages/shopify/src/components/ShopifyShopActionsSheetContent.test.tsx packages/shopify/src/containers/ShopifyIntegrationDetailContainer.test.tsx packages/shopify/src/index.test.ts`: passed (`5` files, `18` tests).
- `npx vitest run --environment jsdom packages/shopify/src`: passed (`21` files, `48` tests).
- `npx vitest run src/features/settings/controllers/use-settings-view.controller.test.tsx` from `apps/managers-app/ManagerBeyo-app-managers`: passed (`1` file, `2` tests).
- `npm run typecheck`: passed.

## Scope confirmations

- No backend files were modified.
- No `.env` files were modified.
- No Phase 6+ work was implemented.
- Not implemented by design in this phase: webhook history timeline UI, full webhook subscriptions page/sheet, workspace-wide webhook sync, separate scope-status endpoint/query, OAuth result page changes, create/list/detail redesign, backend changes, deployment changes.
