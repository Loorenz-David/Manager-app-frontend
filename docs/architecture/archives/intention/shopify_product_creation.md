Intention Plan: Frontend Shopify Product Sync Form

Goal

Develop the frontend capability for creating or updating Shopify products from the ManagerBeyo task-completion flow.

The backend capability is now implemented and exposes the async product processing endpoint:

POST /api/v1/integrations/shopify/products/process

The frontend should treat this route as a queueing endpoint: it validates the request, creates tracking rows, enqueues the Shopify worker task, and returns immediately. The frontend must not expect this response to mean that Shopify creation/update has completed. The frontend should start with a minimal form that sends only the first supported fields:

- target Shopify shops
- SKU
- product dimensions as metafields
  - Height
  - Width
  - Depth
- product title
- product description
- item article number / barcode if available

The form should be built inside the shared Shopify package so applications can consume it through their own slide surfaces.

⸻

Important Scope Boundary

This implementation is frontend-only.

Do not modify backend files.

Do not implement product images yet.

Do not implement price, tags, status, product category, or weight yet, even though the backend payload contract supports them.

Do not build a full Shopify product editor yet. This is the first minimal version needed to test the new backend product sync capability.

⸻

Relevant Existing Files to Inspect

Shared Shopify package

Root package:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify

Existing Shopify package examples:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/pages/ShopifyIntegrationsSlidePage.tsx
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/actions/use-sync-shopify-webhooks-for-shop.ts
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/shopify/src/api/get-shopify-shop.ts

These files show the current package organization for:

- pages
- API functions
- React Query mutation actions
- Shopify endpoint URL conventions
- package-level exports

⸻

Existing staged form example

Use this as the main form-architecture reference:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/task-creation/src/components/InternalFormContent.tsx

This file demonstrates:

- useForm
- FormProvider
- zodResolver
- StagedForm
- StagedFormStep
- step-level validation
- ContentCard
- reusable form field components
- submission through a mutation hook
- form reset behavior

The Shopify product sync form should follow the same general approach, but with its own package-local types, schema, fields, API function, and mutation hook.

⸻

Reusable field component pattern

Use this as the reference for independent form field components:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/items/src/components/ItemQuantityField.tsx

This file demonstrates the desired pattern:

- field component is self-contained
- uses useFormContext
- uses useController
- reads its own error from form state
- renders label/error/input internally
- can be reused in other forms

The new Shopify product sync fields should follow this pattern.

⸻

Working section schema to update

The backend now returns a new field everywhere it previously and it will continue to returned allows_batch_working.

Update frontend schemas and view models that currently understand allows_batch_working.

Reference file:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts

Current relevant field:

allows_batch_working: z.boolean()

Add support for:

allows_shopify_product_modifications: z.boolean()

Also update the view model shape with a camelCase alias, for example:

allowsShopifyProductModifications: boolean

This update is required in both currently known frontend working-section schema locations:

- `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts`
- `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/types.ts`

Claude should still search for every frontend occurrence of `allows_batch_working` to catch any other duplicated working-section schemas or view models, but the two files above are confirmed required updates from the currently open files.

In the managers app schema, add `allows_shopify_product_modifications: z.boolean()` to `WorkingSectionSchema`, add the matching camelCase alias `allowsShopifyProductModifications: boolean` to `WorkingSectionViewModel`, map it in `toWorkingSectionViewModel`, and include `allows_shopify_product_modifications: false` in `toOptimisticWorkingSection` unless the create/update working-section form is explicitly extended to support this field later.

In the workers app schema, add `allows_shopify_product_modifications: z.boolean()` to `WorkerWorkingSectionSchema`, add `allowsShopifyProductModifications: boolean` to the worker `WorkingSectionViewModel`, and map it from `section.allows_shopify_product_modifications` in `toWorkingSectionViewModel`.

⸻

Shared package contract and consuming-app surface wiring

Inspect this architecture contract before wiring the Shopify package page into consuming apps:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/architecture/35_shared_packages.md

This contract is especially important for this implementation because the Shopify product sync form will live inside the shared `@beyo/shopify` package, but it will be opened from consuming apps through their own registered slide/sheet surfaces.

The Shopify package must follow the shared-package surface rules:

- The package must not call `openSurface` directly.
- Surface registration must stay inside the consuming app.
- The package should declare surface IDs and typed surface props in its own `surface-ids.ts`.
- The package should expose optional `surfaceOpeners` callbacks for picker surfaces that need to be opened from inside package components.
- Trigger fields inside the package should call the injected opener callbacks, not `useSurface`.
- Top-level slide/sheet page components should not be statically re-exported from `index.ts`.
- Page components registered as surfaces should be exposed through loader functions so consuming apps can use `lazyWithPreload`.

Use the currently seller app files as concrete examples of the desired pattern:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/selleres-app/ManagerBeyo-app-sellers/src/pages/tasks/TasksPage.tsx
/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/apps/selleres-app/ManagerBeyo-app-sellers/src/features/tasks/surfaces.ts

`TasksPage.tsx` shows the app consuming a package route entry through a loader function:

loadTasksRouteEntryPage -> lazy(loadTasksRouteEntryPage)

`features/tasks/surfaces.ts` shows the app-level surface registration pattern:

- import surface IDs and loader functions from packages
- wrap package loader functions with `lazyWithPreload`
- register the resulting component in the app’s `taskSurfaces` map
- re-export the surface IDs and surface prop types needed by the app

The Shopify package should follow the same model.

The package should define and export static IDs/types such as:

type ShopifyProductSyncSlideSurfaceProps = {
itemClientId: string;
itemArticleNumber?: string | null;
itemSku?: string | null;
defaultTitle?: string | null;
surfaceOpeners?: ShopifyProductSyncSurfaceOpeners;
onCompleted?: () => void;
onSkipped?: () => void;
};

type ShopifyProductSyncSurfaceOpeners = {
openShopPicker?: (props: ShopifyShopPickerSheetSurfaceProps) => void;
};

type ShopifyShopPickerSheetSurfaceProps = {
selectedShopIntegrationIds: string[];
onConfirm: (selectedShopIntegrationIds: string[]) => void;
};

The exact prop names can be adjusted during planning, but the architecture should preserve this shape:

- the product sync slide receives item/task context
- the shop picker trigger receives access to `surfaceOpeners` through package context/provider
- the app provides the concrete `openShopPicker` implementation using its own `openSurface`
- the shop picker sheet confirms selection through the callback passed by the package trigger

The Shopify package should expose loader functions from its public entry point, for example:

loadShopifyProductSyncSlidePage()
loadShopifyShopPickerSheetPage()

The package should not statically export the page components themselves from `index.ts`.

Consuming apps that need this capability must then:

1. Add the Shopify package dependency if not already present.
2. Register the Shopify product sync slide surface in the app’s `surfaces.ts`.
3. Register the Shopify shop picker sheet surface in the app’s `surfaces.ts`.
4. Use `lazyWithPreload(loadShopifyProductSyncSlidePage)` and `lazyWithPreload(loadShopifyShopPickerSheetPage)`.
5. Add the concrete `surfaceOpeners.openShopPicker` implementation from the app controller that opens the shop picker sheet surface.
6. Pass the `surfaceOpeners` map when opening the Shopify product sync slide.
7. Ensure the app’s `index.css` includes `@source "../../../../packages/shopify/src"` if the Shopify package contains Tailwind class names.

This keeps the Shopify package reusable while preserving the contract that apps own surface registration and package components do not directly open app surfaces.

⸻

Box picker primitive

Use the box picker primitive for selecting one or multiple Shopify shops:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/box-picker

The shop picker should follow the primitive’s existing usage patterns.

⸻

Number input primitive

Use the existing number input primitive for dimension fields:

/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend/packages/ui/src/components/primitives/number-input

Dimension fields should use this primitive with 50 cm increment/decrement steps.

⸻

New Package Feature

Create a new Shopify package feature for the product sync form under:

frontend/packages/shopify/src

Suggested structure:

frontend/packages/shopify/src/pages/ShopifyProductSyncSlidePage.tsx
frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx
frontend/packages/shopify/src/components/fields/ShopifyProductSyncShopField.tsx
frontend/packages/shopify/src/components/fields/ShopifyProductSyncSkuField.tsx
frontend/packages/shopify/src/components/fields/ShopifyProductSyncDimensionField.tsx
frontend/packages/shopify/src/components/fields/ShopifyProductSyncTitleField.tsx
frontend/packages/shopify/src/components/fields/ShopifyProductSyncDescriptionField.tsx
frontend/packages/shopify/src/components/ShopifyShopPickerTrigger.tsx
frontend/packages/shopify/src/pages/ShopifyShopPickerSlidePage.tsx
frontend/packages/shopify/src/api/process-shopify-products.ts
frontend/packages/shopify/src/actions/use-process-shopify-products.ts
frontend/packages/shopify/src/types/product-sync.ts

The exact names can be adjusted to match existing Shopify package conventions, but keep the separation clear:

- API function
- mutation hook
- page
- form component
- individual field components
- picker trigger
- picker surface/page
- types/schema

⸻

Product Sync Page Responsibility

Create a package-level page that renders the Shopify product sync staged form.

The page should be reusable by consuming applications and should receive the item/task context it needs through surface props.

Suggested surface/page props:

type ShopifyProductSyncSlideSurfaceProps = {
itemClientId: string;
itemArticleNumber?: string | null;
itemSku?: string | null;
defaultTitle?: string | null;
surfaceOpeners?: ShopifyProductSyncSurfaceOpeners;
onCompleted?: () => void;
onSkipped?: () => void;
};

The exact prop shape should align with the existing surface architecture.

The page should support two outcomes:

1. User submits product sync data.
2. User skips the form by submitting an empty form.

⸻

Form Steps

Use StagedForm and StagedFormStep.

For the initial implementation, create two steps.

Step 1: Shopify Target and Identity

Fields:

1. Shopify shop picker
2. SKU input
3. Height dimension metafield
4. Width dimension metafield
5. Depth dimension metafield

This step is focused on where the product should be synced and the product’s identity/dimensions.

Step 2: Product Content

Fields:

1. Product title
2. Product description

This step is focused on Shopify product content.

More fields will be added later.

⸻

Field Components

Each form field should be an independent reusable component.

Each field should:

- use useFormContext
- use useController or Controller where needed
- render its own label
- render its own error state
- avoid receiving the full form object as a prop
- be reusable by future Shopify forms

Follow the field pattern shown in:

frontend/packages/items/src/components/ItemQuantityField.tsx

⸻
Shop Picker Field and App-Owned Surface Opening

Create a Shopify shop picker field that follows the shared-package surface architecture.

This field has two package-owned UI parts:

1. A trigger/preview field rendered inside the Shopify product sync form.
2. A shop picker sheet/page component exported by the Shopify package through a loader function and registered by the consuming app.

Important architecture rule:

The trigger component lives inside `@beyo/shopify`, but the bottom sheet / slide surface is owned by the consuming app. Therefore the trigger must not call `useSurface`, `openSurface`, or any app-level surface controller directly.

Instead, the major Shopify product sync page should receive injected `surfaceOpeners` through its surface props. The shop picker field should call the injected opener callback when the user taps the trigger.

The package-level surface prop shape should include something like:

type ShopifyProductSyncSurfaceOpeners = {
openShopPicker?: (props: ShopifyShopPickerSheetSurfaceProps) => void;
};

type ShopifyProductSyncSlideSurfaceProps = {
itemClientId: string;
itemArticleNumber?: string | null;
itemSku?: string | null;
defaultTitle?: string | null;
surfaceOpeners?: ShopifyProductSyncSurfaceOpeners;
onCompleted?: () => void;
onSkipped?: () => void;
};

type ShopifyShopPickerSheetSurfaceProps = {
selectedShopIntegrationIds: string[];
onConfirm: (selectedShopIntegrationIds: string[]) => void;
};

The exact type names can be adjusted during planning, but the dependency direction must remain:

- consuming app owns `openSurface`
- consuming app registers the Shopify shop picker sheet/page surface
- consuming app passes `surfaceOpeners.openShopPicker` into the Shopify product sync slide
- Shopify package trigger calls `surfaceOpeners.openShopPicker`
- Shopify package trigger never imports or calls app-specific surface APIs directly

This is the same pattern described in contract 35 and shown by the currently opened seller app examples, where apps register package pages in their own `surfaces.ts` and consume package loader functions instead of statically importing page components.

The Shopify package should expose the shop picker page through a loader function, for example:

loadShopifyShopPickerSheetPage()

The consuming app should register it with `lazyWithPreload(loadShopifyShopPickerSheetPage)` in its own `surfaces.ts`.

The trigger/preview component should:

- display selected shops
- open the app-owned shop picker surface through `surfaceOpeners.openShopPicker`
- pass the current selected shop IDs into the picker surface
- receive confirmed shop IDs through the picker surface `onConfirm` callback
- write the confirmed selection back into the form field
- support multiple selected shops
- auto-select the only available shop if the query returns exactly one shop
- remember the last selected shops locally so the next time the user opens the form, the previous choice is automatically selected if those shops are still available
- gracefully degrade if `surfaceOpeners.openShopPicker` is missing by showing a disabled/error state instead of crashing

The picker page should:

- be implemented inside the Shopify package
- be exported through a loader function, not as a direct static page export
- be registered by the consuming app as a sheet/slide surface
- receive `selectedShopIntegrationIds` and `onConfirm` through surface props
- query available Shopify shops
- render options using the box picker primitive
- support multi-select
- confirm selection through the passed `onConfirm` callback
- only show shops that the current workspace can use

Use the existing Shopify shop list API function instead of creating a duplicate:

frontend/packages/shopify/src/api/list-shopify-shops.ts

This file already confirms the actual endpoint:

GET /api/v1/integrations/shopify/shops

The implementation should reuse `listShopifyShops` and the existing response schema from:

frontend/packages/shopify/src/types.ts

Relevant existing types/schemas:

- `ListShopifyShopsParams`
- `ShopifyShopsListResponseSchema`
- `ShopifyShopsListResponse`
- `ShopifyShopIntegration`

The shop picker field/page should build its query flow on top of the existing `listShopifyShops` API function. If no React Query hook exists yet for listing shops, create a package-local query hook that wraps `listShopifyShops`; do not create another raw API function for the same endpoint.

Shop Picker Local Memory and Confirmed Selection Flow

The shop picker trigger should remember the last confirmed selected shop IDs.

Use a package-local storage key, for example:

beyo.shopifyProductSync.lastSelectedShopIntegrationIds

Important behavior:

The shop picker sheet/page should not immediately write every tap to the form field or to local storage.

Instead, the picker sheet should keep a temporary local selection while the user is choosing shops. The selected shops are committed only when the user taps a clear confirmation button, for example:

Save selection

When the user taps Save selection:

1. The picker sheet calls `onConfirm(selectedShopIntegrationIds)`.
2. The product sync form field is updated with the confirmed selected shop IDs.
3. The confirmed selected shop IDs are written to local storage.
4. The bottom sheet/surface closes.

This should follow the same confirmation-oriented interaction pattern as:

frontend/packages/tasks/src/pages/ItemQuantitySheetPage.tsx

That page keeps temporary local state in the sheet, then commits the value when the user taps the save button, and closes the surface through the surface header.

Rules:

- Store only confirmed selected shop integration IDs.
- Do not update local storage on every option tap inside the picker sheet.
- Do not update the product sync form field on every option tap inside the picker sheet. The picker sheet should not use `useFormContext` for the product sync form. It should be a temporary picker surface that receives `selectedShopIntegrationIds`, manages local temporary selection state, and returns confirmed IDs through `onConfirm`.
- The picker sheet should own temporary selection state initialized from `selectedShopIntegrationIds`.
- The picker sheet should render a bottom action button labeled `Save selection`.
- The `Save selection` button should commit the temporary selection through `onConfirm`.
- After calling `onConfirm`, the picker sheet should close itself through the available surface close mechanism, following the same pattern used by `ItemQuantitySheetPage`.
- When loading remembered shops, filter out IDs that are no longer present in the available shops query.
- If exactly one shop is available, auto-select it even if no memory exists.
- If memory exists and those shops are still available, auto-select memory.
- Do not block form rendering if local storage is unavailable.
- The picker sheet should remain controlled by the selected IDs passed in surface props only for its initial value; after opening, user changes are temporary until confirmed.

Expected interaction flow:

1. User opens the Shopify product sync slide from the task completion flow.
2. Consuming app passes `surfaceOpeners.openShopPicker` into the Shopify product sync slide props.
3. Shopify product sync form renders the shop picker trigger.
4. Trigger queries available shops or reads the shop query state used by the field.
5. Trigger auto-selects one shop or restores valid remembered shops when applicable.
6. User taps the trigger.
7. Trigger calls `surfaceOpeners.openShopPicker({ selectedShopIntegrationIds, onConfirm })`.
8. Consuming app opens the registered Shopify shop picker sheet surface.
9. Picker sheet initializes temporary local selection from `selectedShopIntegrationIds`.
10. User selects or deselects one or more shops using the box picker primitive.
11. User taps `Save selection`.
12. Picker sheet calls `onConfirm(temporarySelectedShopIntegrationIds)`.
13. Trigger/form field stores the confirmed selected IDs.
14. Trigger/form field updates local memory with the confirmed selected IDs.
15. Picker sheet closes.
    ⸻

SKU Field

Create a simple SKU input field.

Rules:

- If the item already has a SKU, prefill the SKU input with that value.
- User can edit the SKU before submitting.
- SKU maps to backend payload key:

sku

⸻

Article Number / Barcode

The form does not need a visible article number field in phase one.

However, if the item/task context provides an article number, include it in the submitted payload.

Mapping:

itemArticleNumber -> item_article_number

This maps to Shopify barcode semantics in the backend.

If the item has no article number and the user does not enter a SKU, then there is no identity field. In that case:

- if the form is empty, treat as skip
- if the user filled product fields but neither SKU nor article number exists, show a validation error requiring SKU

⸻

Dimension Metafields

Create a reusable dimension field component.

The field should be parameterized by the target metafield key:

"Height" | "Width" | "Depth"

Each field should use the number input primitive.

Rules:

- Unit is centimeters.
- Step is 50 cm.
- Values are optional.
- Empty values should not be sent.
- Filled values should be sent as metafields.

Payload mapping:

height -> metafields.Height
width -> metafields.Width
depth -> metafields.Depth

Example submitted metafields:

{
"Height": 100,
"Width": 200,
"Depth": 50
}

Do not send a metafields key for a dimension that is empty.

⸻

Title Field

Create a product title input field.

Rules:

- Optional in the UI for now.
- If present, send as:

title

Important backend contract note:

The current backend shape says `title` is required on the item payload when a real Shopify sync request is submitted.

This requirement does not apply when the user skips the Shopify form. If the form is empty and the user is skipping, no request is sent and no title is required.

If the user submits a real Shopify sync request but leaves the title field empty, the frontend should derive a fallback title using this precedence:

1. `sku`
2. `itemArticleNumber`

If neither `sku` nor `itemArticleNumber` is available, the form must block the real submit and show a warning/error on the title field.

The warning should communicate that Shopify needs a product title and that the user must either enter a title or provide an SKU/article number that can be used as the fallback title.

Important distinction:

`itemArticleNumber` can be used as:

- the hidden backend identity field, and
- the fallback title when a real sync request is submitted.

But `itemArticleNumber` must not by itself make the form count as filled. It is only included after the user has entered at least one visible product value and the request becomes a real sync request.

Recommended frontend behavior:

- If the user skips the form, do not require title and do not call the API.
- If the user submits a real sync request and `title` is filled, send the entered title.
- If the user submits a real sync request and `title` is empty but `sku` is available, send `sku` as the title fallback.
- If the user submits a real sync request and `title` and `sku` are empty but `itemArticleNumber` is available, send `itemArticleNumber` as the title fallback.
- If the user submits a real sync request and none of `title`, `sku`, or `itemArticleNumber` are available, block submission and show a title-field warning.
- The frontend must only apply this fallback when it is actually sending a Shopify sync request. A skipped form must not synthesize a title and must not call the endpoint.
- The final payload must always include `title` when a request is sent because the backend route requires it for each item.

⸻

Description Field

Create a product description text area field.

Rules:

- Optional.
- Send as:

description

This will map to Shopify descriptionHtml on the backend.

For phase one, send `description` as plain text. The backend may store it as Shopify `descriptionHtml`. Do not add rich text or HTML editing in this phase.

⸻

Empty Form / Skip Behavior

The form can be submitted while empty.

If the user has not filled any Shopify product sync field:

- do not call the backend endpoint
- treat the action as skipped
- invoke the page’s onSkipped / completion callback
- continue to the normal task completion confirmation slide

The submit button should dynamically read:

Skip

when the form has no meaningful values.

When the form has meaningful values, the submit button should read something like:

( lucid icon handbag ) "shopSync"

the important rule is that the button clearly communicates skip when the form is empty.

Meaningful values for deciding skip vs real submit should be user-editable product fields only:

- SKU
- Height
- Width
- Depth
- title
- description

Selected shops alone must not make the form count as filled, because shops can be auto-selected from the only available shop or restored from local memory.

The hidden item article number alone must also not make the form count as filled.

A real sync request should only be sent when the user has entered or changed at least one visible product value. Once a real sync request is being sent, selected shops and hidden item article number are included in the payload as supporting values.

The presence of a hidden article number alone should not force a sync request. The user must provide or confirm at least one visible sync value, unless the design intentionally preselects one shop and requires explicit submission.

⸻
Submit Payload

The backend endpoint is now finished.

Use this endpoint:

POST /api/v1/integrations/shopify/products/process

This route accepts a batch of product items and queues the Shopify create-or-update work asynchronously.

Authorization note:

The backend route allows ADMIN, MANAGER, SELLER, and WORKER. This is important because the first consuming flow is the workers-app task completion flow. The frontend should not assume this endpoint is manager-only.

Important backend behavior:

- The route never calls Shopify synchronously.
- The route validates the request.
- The route persists one tracking row per `(item, shop)` target.
- The route enqueues one background Shopify task.
- The route returns immediately.
- Final Shopify success/failure is reported later through the `shopify.products.synced` realtime event.

The frontend endpoint request shape is:

type ProcessShopifyProductsRequest = {
items: ProcessShopifyProductItemRequest[];
};

type ProcessShopifyProductItemRequest = {
client_id: string;
target_shop_integration_ids?: string[] | null;
title: string;
description?: string | null;
status?: "draft" | "active" | "archived" | null;
tags?: string[];
product_category?: string | null;
price?: string | null;
weight?: {
value: number;
unit: "kg" | "g" | "lb" | "oz";
} | null;
sku?: string | null;
item_article_number?: string | null;
article_number?: string | null;
metafields?: Record<string, string | number | boolean | null>;
};

For this first frontend implementation, only send:

{
items: [
{
client_id,
target_shop_integration_ids,
title,
description,
sku,
item_article_number,
metafields
}
]
}

Do not send these fields yet:

- status
- tags
- product_category
- price
- weight
- article_number

unless they are added to the form later.

For phase one, do not send `status`. The backend will default omitted status to `"draft"`.

Use `item_article_number` for the item article number / barcode value in this first frontend implementation.

Backend field rules:

- `items` must contain 1-200 entries.
- `client_id` is required.
- `client_id` is opaque to the backend and is returned unchanged in the realtime event as `frontend_client_id`.
- `target_shop_integration_ids` is optional.
- If `target_shop_integration_ids` is omitted, the backend targets every active Shopify shop integration in the current workspace.
- If `target_shop_integration_ids` is provided, every ID must resolve to an active Shopify integration in the current workspace.
- If an explicit target shop ID is invalid, foreign, or inactive, the whole request fails with 404.
- At least one identity field is required per item:
  - `sku`
  - `item_article_number`
  - `article_number`
- `sku` maps to Shopify variant SKU.
- `item_article_number` and `article_number` both map to Shopify variant barcode.
- `metafields` must be a flat object.
- In this phase, all metafields are stored by the backend in the fixed `custom` namespace with type `single_line_text_field`.
- Product images are not supported yet and must not be sent.
  ⸻

Example Payload for Phase One

{
"items": [
{
"client_id": "item-client-id-123",
"target_shop_integration_ids": ["shop-integration-id-1"],
"title": "Dining Chair",
"description": "Wooden dining chair.",
"sku": "CHAIR-001",
"item_article_number": "7350000000012",
"metafields": {
"Height": 100,
"Width": 50,
"Depth": 50
}
}
]
}

⸻
API Function and Mutation Hook

Add a package API function:

frontend/packages/shopify/src/api/process-shopify-products.ts

Endpoint:

POST /api/v1/integrations/shopify/products/process

The endpoint is now confirmed and should not be treated as a placeholder.

Add a React Query mutation hook:

frontend/packages/shopify/src/actions/use-process-shopify-products.ts

The mutation should:

- call the `processShopifyProducts` API function
- send `ProcessShopifyProductsRequest`
- parse the queued response
- return the queued response
- not wait for final Shopify worker processing
- not subscribe to the final realtime event inside the mutation itself
- allow the page to continue to the next task-completion slide after successful queueing

The route returns immediately after queueing. The final result is received later through the workspace-level `shopify.products.synced` socket event.

The API response schema should be:

type ProcessShopifyProductsResponse = {
queued: boolean;
task_id: string;
sync_item_client_ids: string[];
target_count: number;
};

The response should be read from the backend `data` envelope following the existing app API client conventions.

⸻
Realtime Event: shopify.products.synced

After the background worker finishes the whole batch, the backend emits exactly one socket event:

shopify.products.synced

This event is emitted to the workspace room, not a per-user room. Every connected admin/manager in the workspace can receive it.

Event shape:

{
"event": "shopify.products.synced",
"data": {
"task*id": "task*...",
"succeeded": [
{
"frontend_client_id": "local-item-id-or-client-id",
"shop_integration_id": "shpint_...",
"sync_item_client_id": "shpsi_...",
"requested_operation": "create",
"shopify_product_id": "gid://shopify/Product/...",
"shopify_variant_id": "gid://shopify/ProductVariant/..."
}
],
"failed": [
{
"frontend_client_id": "local-item-id-or-client-id",
"shop_integration_id": "shpint_...",
"sync_item_client_id": "shpsi_...",
"requested_operation": "update",
"error_code": "ambiguous_product_match",
"error_message": "Multiple Shopify products matched the same identity."
}
]
}
}

Frontend handling rules:

- Use `frontend_client_id` to map the result back to the original item/form/card.
- `frontend_client_id` is the same value sent as `client_id` in the request.
- Use `sync_item_client_id` if the frontend needs to reference the backend tracking row.
- `requested_operation` is decided by the backend after lookup.
- The frontend never chooses create vs update.
- One item targeting multiple shops produces one event entry per `(item, shop)` pair.
- A batch can contain both successes and failures.
- A fully failed batch is represented by `succeeded: []` and one or more `failed` entries.
- The event never contains Shopify access tokens or secret values.

Known failure codes include:

- `ambiguous_product_match`
- `missing_access_token`
- `missing_shop_integration`
- `graphql_user_errors`
- `rate_limited`
- `timeout`

The first implementation does not need to build a complete realtime status UI, but the types should be added so the app can consume this event later.
⸻

Integration With Task Completion Flow

This Shopify product sync page should be shown during task-step completion only for working sections where:

allows_shopify_product_modifications === true

The flow should be:

1. User completes a task step.
2. If the task’s working section allows Shopify product modifications:
   - show the Shopify product sync form first.
3. After user submits or skips the Shopify form:
   - continue to the existing time accuracy confirmation slide.
4. User confirms accurate/inaccurate time.
5. Existing task completion behavior continues.

Reference existing completion pages:

frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteTaskStepConfirmationSlidePage.tsx
frontend/apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/CompleteBatchTaskStepsConfirmationSlidePage.tsx

The backend currently does not support a working section having both of these as true at the same time:

allows_batch_working
allows_shopify_product_modifications

So Claude should not design a combined batch + Shopify modification flow yet.

For now:

- allows_batch_working === true keeps using the existing batch completion flow.
- allows_shopify_product_modifications === true uses the new Shopify product sync form before normal completion confirmation.
- If both somehow become true, choose a safe deterministic fallback and document it. Recommended fallback: preserve existing batch behavior and do not open the Shopify form until backend support exists.

⸻
Validation Rules

Validation must support both skip and real submit.

Skip case

If all visible Shopify product sync fields are empty:

- allow submission
- do not call the API
- do not synthesize a title
- do not submit the hidden article number by itself
- continue to the next slide

Real submit case

If any visible Shopify field is filled, submit is a real Shopify sync request.

Visible Shopify product fields include:

- SKU
- Height
- Width
- Depth
- title
- description

Selected shops are visible in the UI, but they must not count as product input for deciding skip vs real submit, because they may be auto-selected or restored from local memory.

For a real submit, require or derive:

1. Title

The backend requires `title`.

Use this precedence:

- entered `title`
- fallback to `sku`
- fallback to `itemArticleNumber`

If none exists, block submit and show a title-field warning.

2. Identity

The backend requires at least one identity field:

- `sku`
- `item_article_number`
- `article_number`

For this frontend phase, use:

- `sku` from the form
- `item_article_number` from item context

If neither exists, block submit and show a SKU/identity warning.

3. Target shops

The backend allows omitted `target_shop_integration_ids` to mean all active Shopify shops in the workspace.

However, this frontend form includes a visible shop picker, so preferred behavior is:

- if the shop picker has selected shops, send `target_shop_integration_ids`
- if the shop picker has no selected shops and the user is doing a real submit, block submit and show a shop selection warning

Do not send `target_shop_integration_ids: []`.

An explicitly empty array causes backend validation failure.

4. Metafields

Only include dimension metafields that have values.

Do not send empty dimension values.

5. Images

Do not send image/media fields. Product images are not supported by the backend endpoint in this phase.

Expected backend validation errors:

- 422 if identity is missing
- 422 if `items` is empty
- 422 if more than 200 items are sent
- 422 if `target_shop_integration_ids: []` is explicitly sent
- 422 if there are no active Shopify integrations in the workspace
- 404 if an explicit target shop integration ID is invalid, inactive, or outside the caller workspace
- 401/403 for auth/authorization failures
  ⸻

Backend Contract Notes

The backend endpoint supports more fields than this first frontend implementation will expose.

Supported later but intentionally deferred:

- status
- tags
- product category
- price
- weight
- product images

The current frontend implementation should leave room for those fields but not add them yet.

⸻

UX Requirements

The form should be lightweight and optimized for workers completing task steps.

Requirements:

- clear staged flow
- minimal typing
- tappable number inputs for dimensions
- 50 cm increments for dimensions
- visible selected-shop preview
- easy skip
- do not block normal task completion if the user skips
- show loading/submitting state while queueing the backend request
- show a friendly error if queueing fails
- do not wait for final Shopify worker completion before continuing the task completion flow

API error UX:

- If the endpoint returns 422 for missing identity, show a SKU/identity warning.
- If the endpoint returns 422 because no active Shopify integrations exist, show a friendly message that no active Shopify shops are connected.
- If the endpoint returns 404 for explicit target shop IDs, refetch the shop list and ask the user to select shops again.
- If the endpoint returns 401/403, show the app’s standard authorization/session error handling.
- Do not advance to the time confirmation slide if queueing fails.

⸻

Testing Requirements

Add tests for:

Working section schema

- allows_shopify_product_modifications is parsed from backend response.
- view model exposes allowsShopifyProductModifications.

Product sync form

- renders two staged steps.
- SKU is prefilled from props/context when provided.
- article number is included in submit payload when provided.
- empty form submits as skip and does not call the API.
- submit button label changes for skip vs real submit.
- dimension fields map to metafields:
  - Height
  - Width
  - Depth
- empty dimensions are omitted from metafields.
- selected shops map to target_shop_integration_ids.
- shop picker auto-selects the only available shop.
- shop picker restores valid last selected shops from local storage.
- invalid local storage shop IDs are ignored.
- mutation sends only the phase-one fields.

Task completion integration

- when allows_shopify_product_modifications is true, Shopify form is shown before time confirmation.
- skipping the Shopify form continues to time confirmation.
- successful queueing continues to time confirmation.
- existing batch flow remains unchanged for allows_batch_working.

⸻

Desired Output From Claude

Claude should produce an implementation plan for Codex that includes:

- files to create
- files to modify
- package exports to update
- surface IDs / surface props to add
- schema updates for allows_shopify_product_modifications
- API function and mutation hook design
- staged form structure
- individual field component plan
- shop picker trigger and picker page plan
- local storage strategy
- task completion flow integration plan
- validation rules
- test plan
- known deferrals

Keep the plan specific enough that Codex can implement it without broad exploration.
