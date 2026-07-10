# PLAN_shopify_product_creation_20260710

## Metadata

- Plan ID: `PLAN_shopify_product_creation_20260710`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-10T00:00:00Z`
- Last updated at (UTC): `2026-07-10T12:00:00Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/under_construction/intention/shopify_product_creation.md`

## Goal and intent

- Goal: Ship a minimal, package-owned Shopify "product sync" form that lets a worker optionally create/update a Shopify product (SKU, dimensions, title, description, target shops) while completing a task step, and wire it into the workers-app task-step completion flow ahead of the existing time-accuracy confirmation slide, for working sections where `allows_shopify_product_modifications === true`.
- Business/user intent: The backend `POST /api/v1/integrations/shopify/products/process` endpoint is live and queues async Shopify sync work. This phase gives workers a lightweight way to trigger that queueing from the point where they already have the physical item in hand, without blocking or complicating the existing completion flow when they have nothing to sync.
- Non-goals: no backend changes; no product images/media; no price, tags, status, product_category, or weight fields; no full Shopify product editor; no combined batch-working + Shopify-modification flow; no full realtime result UI (only typed event + optional lightweight toast).

## Scope

- In scope:
  - `allows_shopify_product_modifications` schema/view-model support in both managers-app and workers-app `working_sections/types.ts`.
  - New `@beyo/shopify` package feature: product-sync staged form (2 steps), shop-picker trigger + sheet, SKU/dimension/title/description fields, API function + mutation hook for `POST /api/v1/integrations/shopify/products/process`, surface IDs/props, package-owned `socket-events.ts` typing for `shopify.products.synced`.
  - Workers-app wiring: package dependency, `@source` CSS registration, surface registration, `use-task-step-detail.controller.ts` gating logic before opening the existing time-confirmation slide, socket registry entry.
  - Vitest unit/component tests for schema, payload-resolution logic, form, shop picker, storage.
  - Playwright coverage for the new completion-flow branch (mobile first, then desktop), to the extent the environment allows.
- Out of scope: managers-app UI/surface wiring for this form (schema mirror only — no managers-app consumer in this phase), backend, images, price/tags/status/product_category/weight, batch+Shopify combined flow, full realtime status UI.
- Assumptions:
  - `POST /api/v1/integrations/shopify/products/process` is deployed and matches the contract in the intention plan (confirmed by the user, treated as non-placeholder).
  - `frontend/packages/shopify/src/api/list-shopify-shops.ts` + `use-list-shopify-shops-query.ts` are reused as-is (confirmed via relational read, see below) — no duplicate API function is created.
  - The request body's `client_id` field is the **existing item's** public `client_id` (`ItemSnapshotSchema.client_id`, prefix `itm_`), not a freshly generated ID. This is a documented exception to the standard "generate `client_id` for new entities" rule in `24_dto.md` — see the Request DTO section below.

## Clarifications required

- [ ] None block starting implementation. Two items are **relational reads Codex must perform during implementation**, not open judgment calls for the user (see "Implementation-time relational reads" under Risks and mitigations): (1) the exact accessor path for the item's `client_id` / `sku` / `article_number` inside the `vm` view model in `use-task-step-detail.controller.ts`, and (2) the exact mechanism already available in that controller for reading a working section's boolean flags (e.g. via `workerWorkingSectionKeys` cache lookup, already imported in that file) to derive `allowsShopifyProductModifications` for `resolvedWorkingSectionId`.

## Acceptance criteria

1. Backend field `allows_shopify_product_modifications` parses in both `WorkingSectionSchema` (managers-app) and `WorkerWorkingSectionSchema` (workers-app), and both view models expose `allowsShopifyProductModifications: boolean`.
2. `@beyo/shopify` exports `loadShopifyProductSyncSlidePage` and `loadShopifyShopPickerSheetPage` loader functions (not static page exports), plus `SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID`, `SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID`, `ShopifyProductSyncSlideSurfaceProps`, `ShopifyShopPickerSheetSurfaceProps`, `ShopifyProductSyncSurfaceOpeners`, `processShopifyProducts`, `useProcessShopifyProducts`.
3. The product sync form renders two `StagedFormStep`s (Shopify Target & Identity; Product Content) and never calls `openSurface`/`useSurface` directly — the shop-picker trigger only calls `surfaceOpeners.openShopPicker?.(...)` read from package context.
4. Submitting a completely empty form (no SKU/dimensions/title/description entered, regardless of auto-selected/restored shops or a hidden item article number) does not call the API, invokes `onSkipped`, and the submit button reads a skip-labelled state.
5. Submitting with at least one visible product field filled sends exactly the phase-one payload fields (`client_id`, `target_shop_integration_ids`, `title`, `description`, `sku`, `item_article_number`, `metafields`) and never sends `status`, `tags`, `product_category`, `price`, `weight`, `article_number`, or images.
6. `target_shop_integration_ids: []` is never sent; a real submit with zero selected shops is blocked with a field-level warning instead.
7. Title fallback precedence (`title` → `sku` → `itemArticleNumber`) is applied only on real submit; if none resolve, submit is blocked with a title warning. Identity (`sku` or `item_article_number`) is required on real submit; if neither resolves, submit is blocked with an identity warning.
8. In the workers app, completing a task step whose working section has `allowsShopifyProductModifications === true` opens the Shopify product sync slide before the existing `COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID`; skip or successful queueing both continue to the existing time-confirmation slide; a queueing failure does not advance.
9. The existing batch-working flow (`BatchDetailSlidePage`, `allowsBatchWorking`) is unmodified by this change.
10. `npm run typecheck` passes; new Vitest suites pass; the workers app's `index.css` includes `@source "../../../../packages/shopify/src"`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` — baseline layering (core, always included).
- `architecture/02_types.md` — branded ID / type conventions (core).
- `architecture/04_api_client.md` + `architecture/04_api_client_local.md` — `apiClient.post`, envelope shape, this backend's flat `{ error, ok }` error body, `codeFromStatus` (core; trigger: new API function).
- `architecture/05_server_state.md` — query/mutation hook placement, when to skip optimistic updates (core + trigger: mutation hook).
- `architecture/06_client_state.md` — confirms form/localStorage state does not belong in Zustand/TanStack Query (core).
- `architecture/08_hooks.md` — Action vs Controller taxonomy for `useProcessShopifyProducts` and the workers-app controller change (core).
- `architecture/09_forms.md` — schema-first RHF + `zodResolver` pattern for the product-sync form (trigger: "form", "zodResolver", "useForm").
- `architecture/13_errors.md` — error-code → UI-action mapping table used for the API error UX section (core).
- `architecture/15_feature_structure.md` — package-internal file layout baseline (core).
- `architecture/24_dto.md` — Response/Request/Query-Params/View-Model DTO categories; `client_id` convention and its documented exception (trigger: "dto", "view model", "client_id").
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md` — surface types (`slide`/`sheet`/`modal`, no `drawer`), `useSurfaceProps`/`useSurfaceHeader` (trigger: "surface", "useSurface").
- `architecture/30_dynamic_loading.md` + `architecture/30_dynamic_loading_local.md` — `lazyWithPreload`, `usePreloadSurface` hoisting rule for `StagedForm` (trigger: "lazy load", "surface preload").
- `architecture/35_shared_packages.md` — the authoritative contract for this whole feature: §13 `surfaceOpeners` injection pattern, §14 loader-function code-splitting rule, §6 `@source` registration (trigger: this is fundamentally a shared-package feature).
- `architecture/17_testing.md` — Vitest/RTL/MSW layer, query priority, `data-testid` requirement (trigger: "test", "testing").
- `architecture/34_runtime_validation.md` + `architecture/34_runtime_validation_local.md` — Playwright project names, fixture paths, mocked-error body shape (trigger: "playwright", "runtime validation").
- `architecture/21_realtime.md` — socket event typing/registry pattern, `SocketEventHandlers`, batch-event guidance (trigger: "socket", "realtime" — used for typing `shopify.products.synced` only).
- `architecture/37_keyboard_aware_inputs.md` — confirms the SKU/title/description text inputs need **no** page-level keyboard code since they render inside `SlidePageSurface`/`BottomSheetSurface` (trigger: "text inputs on mobile surfaces").
- `architecture/14_styling.md` — `@source` directive requirement when a new `@beyo/*` package with Tailwind classnames is added to an app (trigger: workers-app does not yet source `@beyo/shopify`).

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat `{ error: string, ok: false }` error body, no `field_errors`, `codeFromStatus` derivation, 429 → `rate_limited`. Applied to `processShopifyProducts` error handling.
- `architecture/28_surfaces_local.md`: this app's surface set is `page | slide | sheet | modal` (no `drawer`). The product-sync form is a `slide`; the shop picker is a `sheet`.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` lives in `@beyo/ui`; `usePreloadSurface` lives at `src/hooks/use-preload-surface.ts` per app; `StagedForm` forms must hoist `usePreloadSurface` calls to the form-container level for every surface reachable from any step.
- `architecture/34_runtime_validation_local.md`: spec path convention `tests/playwright/features/<feature>/<flow>.spec.ts` inside the workers app (confirmed at `frontend/apps/workers-app/ManagerBeyo-app-workers/tests/playwright/`), mocked-error body `{ error, ok: false }`, project names `mobile`/`desktop`.

### File read intent — pattern vs. relational

Applying the test from `task_system/frontend_contract_goal_mapping_guide.md`:

**Pattern reads already satisfied by contracts (do not re-read as "how to write"):**
- `35_shared_packages.md §13`/`§14` cover the `surfaceOpeners` injection and loader-function code-splitting patterns — no other package's picker-field implementation needs to be read for structure.
- `08_hooks.md` covers the Action/Controller shape for `useProcessShopifyProducts` and the workers-app controller edit.
- `09_forms.md` + `24_dto.md` cover the RHF + Zod + DTO pipeline.

**Relational reads already performed for this plan (existing behavior, confirmed by research pass):**
- `frontend/packages/shopify/src/types.ts`, `surface-ids.ts`, `index.ts` — existing schema/export conventions (see "Domain schemas consulted").
- `frontend/packages/shopify/src/api/list-shopify-shops.ts`, `use-list-shopify-shops-query.ts`, `shopify-keys.ts`, `get-shopify-shop.ts`, `sync-shopify-webhooks-for-shop.ts` + its action — confirmed the API-function/action-hook/query-key conventions actually used in this package.
- `frontend/apps/managers-app/.../working_sections/types.ts`, `frontend/apps/workers-app/.../working_sections/types.ts` — confirmed exact current field shapes for `allows_batch_working`/`allowsBatchWorking` mirroring.
- `frontend/apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts`, `.../components/WorkingSectionStepsView.tsx`, `.../pages/task_steps/BatchDetailSlidePage.tsx`, `.../features/task_steps/surfaces.ts`, `.../features/task_steps/surface-ids.ts` — confirmed where/how the two existing completion slides are opened and registered, and that the batch/single fork happens at list-render time, not at complete-time.
- `frontend/packages/tasks/src/pages/ItemQuantitySheetPage.tsx` — confirmed the "temporary local state → confirm button → `header?.requestClose()`" sheet pattern to mirror for the shop picker.
- `frontend/packages/items/src/components/ItemQuantityField.tsx` — confirmed the no-props/`useFormContext`+`useController`/`FieldLabelRow`+`FieldErrorPill` field pattern.
- `frontend/packages/ui/src/components/primitives/box-picker/*`, `.../number-input/*`, `.../textarea/TextArea.tsx` — confirmed exact prop shapes (see "Field Components" below).
- `frontend/packages/lib/src/phone/storage.ts` — confirmed the SSR-guarded, JSON+Zod-validated localStorage pattern to mirror for `beyo.shopifyProductSync.lastSelectedShopIntegrationIds`.
- `frontend/apps/workers-app/.../src/index.css`, `frontend/apps/managers-app/.../src/index.css` — confirmed workers-app is **missing** `@source "../../../../packages/shopify/src"` (managers-app already has it).
- `frontend/apps/workers-app/.../package.json` — confirmed `@beyo/shopify` is **not yet** a dependency of the workers app (only `@beyo/working-sections` is).
- `frontend/apps/workers-app/.../features/task_steps/types.ts` — confirmed `ItemSnapshotSchema` fields: `client_id`, `article_number`, `sku` (no item name/title field exists at this snapshot level — this is why the title-fallback chain in this feature is load-bearing, not optional polish).

**Relational reads Codex must still perform before writing the controller wiring (do not guess these — see Risks and mitigations):**
- The exact field-access path from `vm` (the `useMemo` around line 192 of `use-task-step-detail.controller.ts`) to the item's `client_id`/`sku`/`article_number`.
- Whether `use-task-step-detail.controller.ts` already has a way to read `WorkingSectionViewModel.allowsShopifyProductModifications` for `resolvedWorkingSectionId` (it already imports `workerWorkingSectionKeys`, suggesting cache access is available) — or whether a small new lookup must be added.
- The `@beyo/realtime` package's canonical `ServerToClientEvents`-equivalent type file location, to add `shopify.products.synced` there before typing the package's `socket-events.ts`.

### Skill selection

- Primary skill: none — this is a document-only, no-resolver planning pass per the guide's "Document-only protocol (no resolver)" section.
- Trigger terms used to expand the contract set: "form", "zodResolver" → `09`; "surface", "useSurface" → `28`; "package page", "loadXxx", "surfaceOpeners" → `35 §13/§14`; "lazy load", "surface preload" → `30`; "socket", "realtime" → `21`; "playwright", "runtime validation" → `34`; "keyboard", "input above keyboard" → `37` (read to confirm *no* action needed, see below); "@source", "tailwind source" → `14`.
- Excluded alternatives:
  - `architecture/33_vaul_drawer.md` — not read in full; the shop-picker sheet is a standard `BottomSheetSurface` consumer with no custom Vaul configuration (no snap points, no gesture overrides), so the canonical Vaul internals are not relevant to this plan's file changes.
  - `architecture/19_permissions.md` — the backend route already allows ADMIN/MANAGER/SELLER/WORKER; no frontend permission gate is required beyond the existing task-step-completion permission checks already in place.
  - `architecture/22_file_handling.md` — no file/image upload in this phase.
  - `architecture/26_persistence.md` — the localStorage need here is a single small key, satisfied directly by mirroring `phone/storage.ts`; the broader persisted-cache contract is not engaged.

## Output format (per `frontend_contract_goal_mapping_guide.md`)

**Domain schemas consulted:**
- `frontend/packages/shopify/src/types.ts` — established `ShopifyShopIntegration`, `ListShopifyShopsParams`, `ShopifyShopsListResponse`/`Schema`, the package's `XxxSchema` + `z.infer` naming convention, and that response envelopes are wrapped in the API-function file, not in `types.ts`.
- `frontend/apps/managers-app/.../working_sections/types.ts` and `frontend/apps/workers-app/.../working_sections/types.ts` — established exact current `WorkingSection`/`WorkerWorkingSection` field names and the `allows_batch_working` → `allowsBatchWorking` mirror to replicate.
- `frontend/apps/workers-app/.../features/task_steps/types.ts` — established `ItemSnapshotSchema` fields (`client_id`, `article_number`, `sku`) used to populate `ShopifyProductSyncSlideSurfaceProps`.

**Selected contracts:** see "Contracts loaded" above.

**Added from guide:** see "Contracts loaded" trigger annotations above.

**Local extensions loaded:** see "Local extensions loaded" above.

**Excluded contracts:** see "Excluded alternatives" above.

**Read order:**
- `architecture/35_shared_packages.md` (baseline for the whole feature)
- `architecture/28_surfaces.md` → `architecture/28_surfaces_local.md`
- `architecture/30_dynamic_loading.md` → `architecture/30_dynamic_loading_local.md`
- `architecture/04_api_client.md` → `architecture/04_api_client_local.md`
- `architecture/09_forms.md`, `architecture/24_dto.md`, `architecture/08_hooks.md`, `architecture/05_server_state.md`
- `architecture/21_realtime.md`
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md` → `architecture/34_runtime_validation_local.md`
- `architecture/37_keyboard_aware_inputs.md`, `architecture/14_styling.md`

**Applied precedence:** Local extensions override baseline only for this app/repo (e.g. the flat error body in `04_api_client_local.md`, the `slide`/`sheet` surface set in `28_surfaces_local.md`). Canonical files remain unmodified.

---

## Implementation plan

### 1. Working-section schema updates (managers-app + workers-app)

**Modify** `frontend/apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts`:
- Add `allows_shopify_product_modifications: z.boolean()` to `WorkingSectionSchema`.
- Add `allows_shopify_product_modifications: z.boolean().default(false)` to `CreateWorkingSectionInputSchema` and `allows_shopify_product_modifications: z.boolean().optional()` to `UpdateWorkingSectionInputSchema` (mirroring exactly how `allows_batch_working` is declared in each, since the backend accepts the field symmetrically even though no managers-app form surfaces it yet).
- Add `allowsShopifyProductModifications: boolean` to `WorkingSectionViewModel`.
- Map it in `toWorkingSectionViewModel`: `allowsShopifyProductModifications: section.allows_shopify_product_modifications`.
- In `toOptimisticWorkingSection`, add `allows_shopify_product_modifications: input.allows_shopify_product_modifications ?? false`. Do **not** add a create/edit form field for it in this phase — confirm no existing working-section create/edit form component already exposes `allows_batch_working` as a toggle before assuming this; if one exists, leave `allows_shopify_product_modifications` schema-only (not wired to that form) per the intention plan's explicit scope boundary.

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/types.ts`:
- Add `allows_shopify_product_modifications: z.boolean()` to `WorkerWorkingSectionSchema`.
- Add `allowsShopifyProductModifications: boolean` to `WorkingSectionViewModel`.
- Map it in `toWorkingSectionViewModel`: `allowsShopifyProductModifications: section.allows_shopify_product_modifications`.

No other frontend location needs this mirror — the confirmed full-repo grep for `allows_batch_working`/`allowsBatchWorking` shows exactly these two `types.ts` files plus one read-site (`WorkingSectionStepsView.tsx`) that only reads the batch flag, not a schema. Re-run the same grep for `allows_shopify_product_modifications` after this step to confirm no other schema copy was missed (there should be none yet, since this is a new field).

### 2. `@beyo/shopify` package — types

**Modify** `frontend/packages/shopify/src/types.ts` (append at the end, following the file's existing `XxxSchema` + `z.infer` convention — do **not** create a `src/types/` subfolder; this package uses one flat `types.ts`):

```ts
// ─── Product sync (process endpoint) ────────────────────────────────────────

export const ShopifyProductSyncMetafieldsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export const ProcessShopifyProductItemRequestSchema = z.object({
  client_id: z.string(),
  target_shop_integration_ids: z.array(z.string()).optional(),
  title: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  item_article_number: z.string().optional(),
  metafields: ShopifyProductSyncMetafieldsSchema.optional(),
});
export type ProcessShopifyProductItemRequest = z.infer<
  typeof ProcessShopifyProductItemRequestSchema
>;

export const ProcessShopifyProductsRequestSchema = z.object({
  items: z.array(ProcessShopifyProductItemRequestSchema).min(1).max(200),
});
export type ProcessShopifyProductsRequest = z.infer<
  typeof ProcessShopifyProductsRequestSchema
>;

export const ProcessShopifyProductsResponseSchema = z.object({
  queued: z.boolean(),
  task_id: z.string(),
  sync_item_client_ids: z.array(z.string()),
  target_count: z.number(),
});
export type ProcessShopifyProductsResponse = z.infer<
  typeof ProcessShopifyProductsResponseSchema
>;

// ─── Realtime: shopify.products.synced ──────────────────────────────────────

export const ShopifyProductSyncSucceededResultSchema = z.object({
  frontend_client_id: z.string(),
  shop_integration_id: z.string(),
  sync_item_client_id: z.string(),
  requested_operation: z.enum(["create", "update"]),
  shopify_product_id: z.string(),
  shopify_variant_id: z.string(),
});
export type ShopifyProductSyncSucceededResult = z.infer<
  typeof ShopifyProductSyncSucceededResultSchema
>;

export const ShopifyProductSyncFailedResultSchema = z.object({
  frontend_client_id: z.string(),
  shop_integration_id: z.string(),
  sync_item_client_id: z.string(),
  requested_operation: z.enum(["create", "update"]),
  error_code: z.string(),
  error_message: z.string(),
});
export type ShopifyProductSyncFailedResult = z.infer<
  typeof ShopifyProductSyncFailedResultSchema
>;

export const ShopifyProductsSyncedEventSchema = z.object({
  task_id: z.string(),
  succeeded: z.array(ShopifyProductSyncSucceededResultSchema),
  failed: z.array(ShopifyProductSyncFailedResultSchema),
});
export type ShopifyProductsSyncedEvent = z.infer<
  typeof ShopifyProductsSyncedEventSchema
>;
```

**Note on `client_id` (documented `24_dto.md` exception):** `ProcessShopifyProductItemRequest.client_id` is **not** a frontend-generated UUID for a new entity. It is the existing `Item`'s public `client_id` (prefix `itm_`, already assigned when the item was created), reused here as an opaque correlation token so the backend can echo it back as `frontend_client_id` in the realtime event. Do not call `generateClientId(...)` for it — pass `itemClientId` straight through from the surface props.

### 3. `@beyo/shopify` package — API function + mutation hook

**Create** `frontend/packages/shopify/src/api/process-shopify-products.ts`, mirroring `get-shopify-shop.ts`'s envelope-unwrap pattern exactly:

```ts
import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ProcessShopifyProductsRequestSchema,
  ProcessShopifyProductsResponseSchema,
} from "../types";
import type { ProcessShopifyProductsRequest } from "../types";

const ProcessShopifyProductsEnvelopeSchema = ApiEnvelopeSchema(
  ProcessShopifyProductsResponseSchema,
).extend({ ok: z.literal(true) });

export type ProcessShopifyProductsResult = z.infer<
  typeof ProcessShopifyProductsEnvelopeSchema
>["data"];

export async function processShopifyProducts(
  input: ProcessShopifyProductsRequest,
): Promise<ProcessShopifyProductsResult> {
  const body = ProcessShopifyProductsRequestSchema.parse(input);
  const parsed = await apiClient.post(
    "/api/v1/integrations/shopify/products/process",
    ProcessShopifyProductsEnvelopeSchema,
    body,
  );

  return parsed.data;
}
```

**Create** `frontend/packages/shopify/src/actions/use-process-shopify-products.ts`:

```ts
import { useMutation } from "@tanstack/react-query";

import { processShopifyProducts } from "../api/process-shopify-products";

export function useProcessShopifyProducts() {
  return useMutation({
    mutationFn: processShopifyProducts,
  });
}

export type ProcessShopifyProductsAction = ReturnType<
  typeof useProcessShopifyProducts
>;
```

Per `05_server_state.md`'s "When NOT to use optimistic updates" table, this mutation intentionally has **no** `onMutate`/`onError` rollback/`onSettled` invalidation: it triggers an async background worker whose result the frontend cannot predict, and there is no client-cached "Shopify products" list to optimistically update or invalidate in this phase. This is the documented exception, not an oversight — do not add optimistic scaffolding here.

### 4. `@beyo/shopify` package — surface IDs

**Modify** `frontend/packages/shopify/src/surface-ids.ts`, appending:

```ts
export const SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID =
  "shopify-product-sync-slide";
export const SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID =
  "shopify-shop-picker-sheet";

export type ShopifyShopPickerSheetSurfaceProps = {
  selectedShopIntegrationIds: string[];
  onConfirm: (selectedShopIntegrationIds: string[]) => void;
};

export type ShopifyProductSyncSurfaceOpeners = {
  openShopPicker?: (props: ShopifyShopPickerSheetSurfaceProps) => void;
};

export type ShopifyProductSyncSlideSurfaceProps = {
  itemClientId: string;
  itemArticleNumber?: string | null;
  itemSku?: string | null;
  defaultTitle?: string | null;
  surfaceOpeners?: ShopifyProductSyncSurfaceOpeners;
  onCompleted?: () => void;
  onSkipped?: () => void;
};
```

### 5. `@beyo/shopify` package — local storage helper

**Create** `frontend/packages/shopify/src/lib/shopify-product-sync-storage.ts`, mirroring `packages/lib/src/phone/storage.ts`'s SSR-guard + JSON + Zod-validate pattern:

```ts
import { z } from "zod";

export const SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY =
  "beyo.shopifyProductSync.lastSelectedShopIntegrationIds";

const LastSelectedShopsSchema = z.object({
  shopIntegrationIds: z.array(z.string()),
  updatedAt: z.number().int(),
});

export function readLastSelectedShopIntegrationIds(): string[] | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(
    SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY,
  );
  if (!raw) return null;

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const parsed = LastSelectedShopsSchema.safeParse(parsedRaw);
  return parsed.success ? parsed.data.shopIntegrationIds : null;
}

export function writeLastSelectedShopIntegrationIds(
  shopIntegrationIds: string[],
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY,
    JSON.stringify({ shopIntegrationIds, updatedAt: Date.now() }),
  );
}
```

Rules enforced by callers (not by this module): write only from the shop-picker sheet's "Save selection" confirm handler; never write on every option tap; filter remembered IDs against the live shop list before using them (the module itself does not know which shops are currently valid — that check happens in the trigger field, see §7).

### 6. `@beyo/shopify` package — provider (surfaceOpeners context)

**Create** `frontend/packages/shopify/src/providers/ShopifyProductSyncFormProvider.tsx`, following `35_shared_packages.md §13` exactly (context, not prop drilling):

```tsx
import { createContext, useContext } from "react";

import type { ShopifyProductSyncSurfaceOpeners } from "../surface-ids";

type ShopifyProductSyncFormContextValue = {
  itemClientId: string;
  itemArticleNumber: string | null;
  itemSku: string | null;
  defaultTitle: string | null;
  surfaceOpeners: ShopifyProductSyncSurfaceOpeners;
  onCompleted?: () => void;
  onSkipped?: () => void;
};

const ShopifyProductSyncFormContext =
  createContext<ShopifyProductSyncFormContextValue | null>(null);

type ProviderProps = ShopifyProductSyncFormContextValue & {
  children: React.ReactNode;
};

export function ShopifyProductSyncFormProvider({
  children,
  surfaceOpeners,
  ...rest
}: ProviderProps): React.JSX.Element {
  return (
    <ShopifyProductSyncFormContext.Provider
      value={{ ...rest, surfaceOpeners: surfaceOpeners ?? {} }}
    >
      {children}
    </ShopifyProductSyncFormContext.Provider>
  );
}

export function useShopifyProductSyncFormContext(): ShopifyProductSyncFormContextValue {
  const ctx = useContext(ShopifyProductSyncFormContext);
  if (!ctx) {
    throw new Error(
      "useShopifyProductSyncFormContext must be used within ShopifyProductSyncFormProvider",
    );
  }
  return ctx;
}
```

### 7. `@beyo/shopify` package — page: product sync slide

**Create** `frontend/packages/shopify/src/pages/ShopifyProductSyncSlidePage.tsx`:

```tsx
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { ShopifyProductSyncForm } from "../components/ShopifyProductSyncForm";
import { ShopifyProductSyncFormProvider } from "../providers/ShopifyProductSyncFormProvider";
import type { ShopifyProductSyncSlideSurfaceProps } from "../surface-ids";

export function ShopifyProductSyncSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<ShopifyProductSyncSlideSurfaceProps>();

  return (
    <ShopifyProductSyncFormProvider
      itemClientId={props.itemClientId ?? ""}
      itemArticleNumber={props.itemArticleNumber ?? null}
      itemSku={props.itemSku ?? null}
      defaultTitle={props.defaultTitle ?? null}
      surfaceOpeners={props.surfaceOpeners}
      onCompleted={props.onCompleted}
      onSkipped={props.onSkipped}
    >
      <ShopifyProductSyncForm header={header} />
    </ShopifyProductSyncFormProvider>
  );
}
```

(`header` is passed through so the form can call `header?.setTitle(...)` / `header?.requestClose()` without the form itself importing `useSurfaceHeader` a second time — matches the single-hook-call discipline `37_keyboard_aware_inputs.md` implies for surface hooks generally.)

### 8. `@beyo/shopify` package — form schema, payload resolver

**Create** `frontend/packages/shopify/src/types.ts` addition (same file, append near the product-sync types above) for the **form-input** schema (UI-shaped, camelCase — distinct from the Request DTO):

```ts
export const ShopifyProductSyncFormSchema = z.object({
  shopIntegrationIds: z.array(z.string()),
  sku: z.string().optional(),
  heightCm: z.number().nullable().optional(),
  widthCm: z.number().nullable().optional(),
  depthCm: z.number().nullable().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});
export type ShopifyProductSyncFormValues = z.infer<
  typeof ShopifyProductSyncFormSchema
>;
```

**Create** `frontend/packages/shopify/src/lib/resolve-shopify-product-sync-submit.ts` — the pure decision/payload function, unit-testable in isolation (mirrors the intent of `packages/task-creation/src/lib/normalize-task-form-payload.ts`, but also encodes the skip/block decision since that logic is the highest-risk part of this feature per the intention plan):

```ts
import type { ShopifyProductSyncFormValues } from "../types";
import type { ProcessShopifyProductsRequest } from "../types";

export type ResolveShopifyProductSyncSubmitInput = {
  values: ShopifyProductSyncFormValues;
  itemClientId: string;
  itemArticleNumber: string | null;
};

export type ResolveShopifyProductSyncSubmitResult =
  | { kind: "skip" }
  | { kind: "blocked"; field: "title" | "sku" | "shopIntegrationIds"; reason: string }
  | { kind: "submit"; payload: ProcessShopifyProductsRequest };

function isFormFilled(values: ShopifyProductSyncFormValues): boolean {
  return Boolean(
    values.sku?.trim() ||
      values.heightCm != null ||
      values.widthCm != null ||
      values.depthCm != null ||
      values.title?.trim() ||
      values.description?.trim(),
  );
}

export function resolveShopifyProductSyncSubmit({
  values,
  itemClientId,
  itemArticleNumber,
}: ResolveShopifyProductSyncSubmitInput): ResolveShopifyProductSyncSubmitResult {
  if (!isFormFilled(values)) {
    return { kind: "skip" };
  }

  const resolvedTitle =
    values.title?.trim() || values.sku?.trim() || itemArticleNumber || null;
  if (!resolvedTitle) {
    return {
      kind: "blocked",
      field: "title",
      reason:
        "Enter a product title, or provide a SKU that can be used as the title.",
    };
  }

  const resolvedIdentity = values.sku?.trim() || itemArticleNumber || null;
  if (!resolvedIdentity) {
    return {
      kind: "blocked",
      field: "sku",
      reason: "Enter a SKU so Shopify can identify this product.",
    };
  }

  if (values.shopIntegrationIds.length === 0) {
    return {
      kind: "blocked",
      field: "shopIntegrationIds",
      reason: "Select at least one Shopify shop to sync to.",
    };
  }

  const metafields: Record<string, number> = {};
  if (values.heightCm != null) metafields.Height = values.heightCm;
  if (values.widthCm != null) metafields.Width = values.widthCm;
  if (values.depthCm != null) metafields.Depth = values.depthCm;

  return {
    kind: "submit",
    payload: {
      items: [
        {
          client_id: itemClientId,
          target_shop_integration_ids: values.shopIntegrationIds,
          title: resolvedTitle,
          description: values.description?.trim() || undefined,
          sku: values.sku?.trim() || undefined,
          item_article_number: itemArticleNumber ?? undefined,
          metafields: Object.keys(metafields).length > 0 ? metafields : undefined,
        },
      ],
    },
  };
}
```

This function is the single source of truth for the skip/block/submit decision — the component calls it and branches on `.kind`, it does not reimplement any of this logic inline. This keeps the highest-risk behavior (§ "Critical behavior: skip versus real submit" in the intention plan) in one place that Vitest can cover exhaustively without mounting the form.

### 9. `@beyo/shopify` package — form component

**Create** `frontend/packages/shopify/src/components/ShopifyProductSyncForm.tsx`. Structure follows `InternalFormContent.tsx`'s wiring (per `09_forms.md` + the relational read of that file):

- `useForm<ShopifyProductSyncFormValues>({ resolver: zodResolver(ShopifyProductSyncFormSchema), mode: "onChange", defaultValues: { shopIntegrationIds: [], sku: itemSku ?? "", heightCm: null, widthCm: null, depthCm: null, title: defaultTitle ?? "", description: "" } })` — values read from `useShopifyProductSyncFormContext()`.
- `useStagedForm({ steps: [{ id: "target", title: "Shopify Target & Identity" }, { id: "content", title: "Product Content" }], mode: "free", onSubmit: () => form.handleSubmit(handleFormSubmit)() })`.
- Hoist `usePreloadSurface` is **not** needed here because the only child surface (shop picker) is opened via `surfaceOpeners.openShopPicker`, not via a package-owned `preloadXxxSurface` call — the app's own `surfaces.ts` owns that preload per `30_dynamic_loading_local.md` (the package cannot call `openSurface`/preload an app-registered surface it doesn't own the registration for). Do not add a `usePreloadSurface` call inside this package component.
- `handleFormSubmit(values)`:
  1. Call `resolveShopifyProductSyncSubmit({ values, itemClientId, itemArticleNumber })`.
  2. `kind === "skip"` → call `onSkipped?.()`, then `header?.requestClose()`.
  3. `kind === "blocked"` → `field === "title"` → `staged.navigateTo("content")` + `form.setError("title", { type: "manual", message: reason })`. `field === "sku"` or `"shopIntegrationIds"` → `staged.navigateTo("target")` + `form.setError(field, { type: "manual", message: reason })`. Return `false`-equivalent (do not close, do not call the mutation) — this branch must leave the user on the offending step with the error visible.
  4. `kind === "submit"` → call `useProcessShopifyProducts().mutateAsync(payload)`; on success call `onCompleted?.()` then `header?.requestClose()`; on error, branch on `err.code` per the "API error UX" section below and keep the surface open with an inline error (do not call `onCompleted`/`onSkipped`, do not close).
- Submit button label: reads `isFormFilled(form.watch())`-equivalent (call `resolveShopifyProductSyncSubmit` with the live watched values, or a lighter `isFormFilled` check reused from the same module — export `isFormFilled` from `resolve-shopify-product-sync-submit.ts` for this) to switch between a "Skip" label and a "Sync to Shopify" label (with a `lucide-react` `ShoppingBag` icon, matching the intention plan's "lucid icon handbag" note — confirm the closest available icon name in the installed `lucide-react` version rather than assuming `ShoppingBag` exists verbatim). Disable the button while `useProcessShopifyProducts().isPending`.
- Render two `<StagedFormStep id="target">` / `<StagedFormStep id="content">` blocks containing the field components from §10.

### 10. `@beyo/shopify` package — field components

All fields follow `ItemQuantityField.tsx`'s pattern: no props, `useFormContext()` + `useController()`, own `FieldLabelRow` + `FieldErrorPill`, reusable.

**Create** `frontend/packages/shopify/src/components/fields/ShopifyProductSyncShopField.tsx`:
- `useController({ name: "shopIntegrationIds", control })`.
- `useShopifyProductSyncFormContext()` for `surfaceOpeners`.
- `useListShopifyShopsQuery()` (existing hook, no duplicate).
- On mount / when shop list resolves (`useEffect`, guarded so it only runs once per mount and only when the field is still empty): if `field.value.length === 0`, try `readLastSelectedShopIntegrationIds()` filtered against `data.shops.map(s => s.client_id)`; if the filtered list is non-empty, `field.onChange(filtered)`. Else if `data.shops.length === 1`, `field.onChange([data.shops[0].client_id])`. Neither branch writes to storage (storage is written only from the picker sheet's confirm handler).
- Renders a trigger row (selected-shop names as chips/summary text, tap target) that calls:
  ```ts
  surfaceOpeners.openShopPicker?.({
    selectedShopIntegrationIds: field.value,
    onConfirm: (ids) => {
      field.onChange(ids);
      writeLastSelectedShopIntegrationIds(ids);
    },
  });
  ```
- If `surfaceOpeners.openShopPicker` is undefined, render the trigger `disabled` with a small inline note instead of crashing (per intention plan's graceful-degradation rule).
- `data-testid="shopify-product-sync-shop-field-trigger"`.

**Create** `frontend/packages/shopify/src/components/fields/ShopifyProductSyncSkuField.tsx` — text `<input>` bound to `sku` via `useController`, `FieldLabelRow label="SKU" optional`, `data-testid="shopify-product-sync-sku-input"`.

**Create** `frontend/packages/shopify/src/components/fields/ShopifyProductSyncDimensionField.tsx` — parameterized:
```ts
type Props = { name: "heightCm" | "widthCm" | "depthCm"; label: string; testId: string };
```
Uses `NumberInput` from `@beyo/ui` with `step={50}`, `unitLabel="cm"`, `value={field.value ?? null}`, `onValueChange={(v) => field.onChange(v)}`. Three call sites in the form: `<ShopifyProductSyncDimensionField name="heightCm" label="Height" testId="shopify-product-sync-height-input" />` (and Width/Depth).

**Create** `frontend/packages/shopify/src/components/fields/ShopifyProductSyncTitleField.tsx` — text `<input>` bound to `title`, `data-testid="shopify-product-sync-title-input"`. Renders the `FieldErrorPill` for `errors.title?.message` so the title-fallback-blocked warning (§9) is visible here.

**Create** `frontend/packages/shopify/src/components/fields/ShopifyProductSyncDescriptionField.tsx` — `TextArea` from `@beyo/ui` (confirmed existing primitive — do not create a new one) bound to `description`, `data-testid="shopify-product-sync-description-input"`. Plain text only, no rich text/HTML.

None of these fields need any `37_keyboard_aware_inputs.md` page-level code: they render inside `SlidePageSurface`'s primary scroll container (via `StagedForm`'s own scroll wrapper), which already consumes `--keyboard-inset` padding. If the SKU/title/description fields are frequently tabbed between, consider `<StagedForm enableKeyboardAccessory>` (opt-in, defaults `false`) — recommended but not required for acceptance.

### 11. `@beyo/shopify` package — shop picker sheet

**Create** `frontend/packages/shopify/src/pages/ShopifyShopPickerSheetPage.tsx`, mirroring `ItemQuantitySheetPage.tsx`'s temporary-state-then-confirm pattern:

```tsx
import { useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker } from "@beyo/ui";

import { useListShopifyShopsQuery } from "../api/use-list-shopify-shops-query";
import type { ShopifyShopPickerSheetSurfaceProps } from "../surface-ids";

export function ShopifyShopPickerSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { selectedShopIntegrationIds = [], onConfirm } =
    useSurfaceProps<ShopifyShopPickerSheetSurfaceProps>();
  const [tempSelected, setTempSelected] = useState<string[]>(
    selectedShopIntegrationIds,
  );
  const shopsQuery = useListShopifyShopsQuery();
  const shops = shopsQuery.data?.shops ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <BoxPicker
        mode="multiple"
        value={tempSelected}
        onValueChange={setTempSelected}
        options={shops.map((shop) => ({
          value: shop.client_id,
          label: shop.shop_name ?? shop.shop_domain,
        }))}
        data-testid="shopify-shop-picker-options"
      />
      <button
        type="button"
        data-testid="shopify-shop-picker-save-button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={!onConfirm}
        onClick={() => {
          onConfirm?.(tempSelected);
          header?.requestClose();
        }}
      >
        Save selection
      </button>
    </div>
  );
}
```

Note: this page does **not** call `useFormContext()` — it is a standalone picker surface, matching the intention plan's explicit rule that the sheet must not read the product-sync form directly.

### 12. `@beyo/shopify` package — realtime typing

**Create** `frontend/packages/shopify/src/socket-events.ts`. Before writing it, Codex must do the relational read noted in "File read intent" to find `@beyo/realtime`'s canonical server-event union type and add an entry there, e.g.:

```ts
'shopify.products.synced': (payload: ShopifyProductsSyncedEvent) => void;
```

Then:

```ts
import type { SocketEventHandlers } from "@beyo/realtime";

import { notify } from "@beyo/lib";

export const shopifyProductSyncSocketEvents: SocketEventHandlers = {
  "shopify.products.synced": ({ succeeded, failed }) => {
    if (failed.length > 0) {
      notify.error(
        "Some Shopify products did not sync",
        `${failed.length} item${failed.length === 1 ? "" : "s"} failed to sync.`,
      );
      return;
    }
    if (succeeded.length > 0) {
      notify.success("Shopify products synced");
    }
  },
};
```

This is the "lightweight, safe" option explicitly allowed by the intention plan (a toast via the existing `notify` singleton) — it does **not** invalidate any query cache (no such cache exists yet in this phase) and does **not** attempt to map results back onto any in-progress UI. If the relational read of `@beyo/realtime` shows this event union is harder to extend than expected (e.g. it is not a simple mapped type, or extending it requires touching generated/shared code with broader blast radius), stop and document the finding instead of forcing it — the types added in §2 (`ShopifyProductsSyncedEvent` etc.) are still valid and usable even if the socket-registry wiring is deferred to a follow-up plan.

### 13. `@beyo/shopify` package — exports

**Modify** `frontend/packages/shopify/src/index.ts`:
- Add named exports for the new schemas/types from `./types` (follow the existing "re-export all schemas, then all types" grouping).
- Add `processShopifyProducts` (from `./api/process-shopify-products`) and `useProcessShopifyProducts` (from `./actions/use-process-shopify-products`) to their respective existing export groups.
- Add `resolveShopifyProductSyncSubmit` and `isFormFilled` (if exported) from `./lib/resolve-shopify-product-sync-submit`.
- Add `readLastSelectedShopIntegrationIds`, `writeLastSelectedShopIntegrationIds`, `SHOPIFY_PRODUCT_SYNC_LAST_SHOPS_STORAGE_KEY` from `./lib/shopify-product-sync-storage`.
- Add `shopifyProductSyncSocketEvents` from `./socket-events`.
- Add surface IDs + prop types from `./surface-ids` (`SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID`, `SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID`, `ShopifyProductSyncSlideSurfaceProps`, `ShopifyShopPickerSheetSurfaceProps`, `ShopifyProductSyncSurfaceOpeners`).
- **Do not** statically export `ShopifyProductSyncSlidePage` or `ShopifyShopPickerSheetPage`. Instead append two loader functions at the bottom, following the existing four `loadXxxPage` functions exactly:

```ts
export function loadShopifyProductSyncSlidePage() {
  return import("./pages/ShopifyProductSyncSlidePage").then((module) => ({
    default: module.ShopifyProductSyncSlidePage,
  }));
}

export function loadShopifyShopPickerSheetPage() {
  return import("./pages/ShopifyShopPickerSheetPage").then((module) => ({
    default: module.ShopifyShopPickerSheetPage,
  }));
}
```

### 14. Workers-app — package dependency + CSS

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/package.json`: add `"@beyo/shopify": "*"` to `dependencies` (confirmed absent). Run `npm install` from `frontend/` after this change.

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/src/index.css`: add `@source "../../../../packages/shopify/src";` (confirmed absent — managers-app already has this line, workers-app does not).

### 15. Workers-app — surface registration

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`:

```ts
import {
  SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID,
  SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID,
  loadShopifyProductSyncSlidePage,
  loadShopifyShopPickerSheetPage,
} from "@beyo/shopify";
```

Add, following the file's existing `lazyWithPreload(...)` + registration pattern:

```ts
const shopifyProductSyncSlide = lazyWithPreload(loadShopifyProductSyncSlidePage);
const shopifyShopPickerSheet = lazyWithPreload(loadShopifyShopPickerSheetPage);

export const preloadShopifyProductSyncSlideSurface = shopifyProductSyncSlide.preload;
export const preloadShopifyShopPickerSheetSurface = shopifyShopPickerSheet.preload;
```

Register both in `taskStepSurfaces: SurfaceRegistrations`:

```ts
[SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID]: { surface: "slide", component: shopifyProductSyncSlide.Component },
[SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID]: { surface: "sheet", component: shopifyShopPickerSheet.Component },
```

### 16. Workers-app — controller wiring (the gate)

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`.

Before writing this step, Codex must perform the two relational reads flagged in "File read intent":
1. Read the `vm` `useMemo` definition (around line 192) to confirm the exact accessor path to the item's `client_id`, `sku`, and `article_number` (confirmed to exist on `ItemSnapshotSchema` as `client_id`/`sku`/`article_number` — but confirm whether `vm` exposes the item as a nested `item` object or flattens these fields onto `vm` directly).
2. Confirm how to read `allowsShopifyProductModifications` for `resolvedWorkingSectionId` in this controller's scope. The controller already imports `workerWorkingSectionKeys` from `../../working_sections/api/working-section-keys` — check whether that cache (populated by whatever hook powers `WorkingSectionsHomeView`/`WorkingSectionStepsView`) can be read here via `useQueryClient().getQueryData(...)` and mapped through `toWorkingSectionViewModel`, or whether a small dedicated query/selector must be added. Do not add a duplicate full working-sections fetch if the cache is already warm and reachable — that would create an unnecessary network waterfall on every task-step detail mount.

Once resolved, change `handleComplete`:

```ts
const handleComplete = useCallback(() => {
  if (!vm || STEP_TERMINAL_STATES.has(vm.state)) return;

  const openTimeConfirmation = () => {
    openSurface(COMPLETE_TASK_STEP_CONFIRMATION_SLIDE_SURFACE_ID, {
      stepId: resolvedStepId,
      taskId: resolvedTaskId,
      workingSectionId: resolvedWorkingSectionId,
      totalWorkingSeconds: vm.totalWorkingSeconds,
      totalPauseSeconds: vm.totalPauseSeconds,
      lastStateRecordEnteredAt: vm.lastStateRecord?.entered_at ?? null,
      onConfirm: (markInaccurate: boolean) => {
        transitionStepState({ /* unchanged */ });
      },
    });
  };

  if (allowsShopifyProductModifications && vm.item) {
    const surfaceOpeners: ShopifyProductSyncSurfaceOpeners = {
      openShopPicker: (props) =>
        openSurface(SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID, props),
    };
    openSurface(SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID, {
      itemClientId: vm.item.client_id,
      itemArticleNumber: vm.item.article_number ?? null,
      itemSku: vm.item.sku ?? null,
      surfaceOpeners,
      onCompleted: openTimeConfirmation,
      onSkipped: openTimeConfirmation,
    });
    return;
  }

  openTimeConfirmation();
}, [/* existing deps + allowsShopifyProductModifications, vm.item */]);
```

Import `SHOPIFY_PRODUCT_SYNC_SLIDE_SURFACE_ID`, `SHOPIFY_SHOP_PICKER_SHEET_SURFACE_ID`, `type ShopifyProductSyncSurfaceOpeners` from `@beyo/shopify`. Do not omit the `vm.item` null-guard — `ItemSnapshotSchema` is nullable in `types.ts`; if the current step has no associated item, fall straight to `openTimeConfirmation()`.

`defaultTitle` is intentionally omitted (left `undefined`) from the surface-open call: `ItemSnapshotSchema` has no name/title field, so there is nothing meaningful to prefill — the form's own title→sku→itemArticleNumber fallback chain (§8) is what makes this safe.

### 17. Workers-app — socket registry

**Modify** `frontend/apps/workers-app/ManagerBeyo-app-workers/src/app/socket-registry.ts`: import `shopifyProductSyncSocketEvents` from `@beyo/shopify` and spread it into `socketRegistry`, following the existing `...caseSocketEvents` etc. pattern. Only do this if §12's realtime typing step was completed without blockers; otherwise skip and note it as deferred.

### 18. Managers-app — no UI wiring (explicitly out of scope)

Managers-app already has `@source "../../../../packages/shopify/src"` and already depends on `@beyo/shopify` (it consumes `ShopifyIntegrationsSlidePage` today). No further managers-app change is needed for this phase beyond §1's schema mirror — do not add surface registration or a consumption point there.

---

## API error UX (mutation `onError` branch inside `ShopifyProductSyncForm`)

Per `13_errors.md`'s error-code table and `04_api_client_local.md`'s flat error body, branch on `err.code` (from `ApiRequestError`):

| `err.code` | Condition (inferred from `err.message` / expected 422 cases) | UI action |
|---|---|---|
| `unprocessable` (422) | missing identity | Show identity warning on `sku` field (same message path as the client-side block in §8) |
| `unprocessable` (422) | no active Shopify integrations in workspace | Inline banner: "No active Shopify shops are connected for this workspace." |
| `not_found` (404) | explicit target shop invalid/inactive/foreign | Refetch `useListShopifyShopsQuery()` (`.refetch()`), clear `shopIntegrationIds` field value, show inline banner asking the user to reselect shops |
| `unauthorized` (401) / `forbidden` (403) | — | Standard app auth/session handling already triggered by the API client (401 refresh-then-redirect) / show `err.message` as a toast for 403 |
| anything else | — | Generic inline error banner with `err.message`, form stays open, mutation can be retried |

In every branch: do **not** call `onCompleted`/`onSkipped`, do **not** call `header?.requestClose()` — queueing failure must not advance to the time-confirmation slide (acceptance criterion 8).

---

## Validation rules (consolidated, restated from decision logic for the test-writer's convenience)

- Skip: all of `sku`, `heightCm`, `widthCm`, `depthCm`, `title`, `description` empty/null → no API call, `onSkipped()`, regardless of `shopIntegrationIds` or hidden `itemArticleNumber`.
- Real submit requires (in order, each blocking if unresolved): title fallback (`title` → `sku` → `itemArticleNumber`); identity (`sku` → `item_article_number`); at least one selected shop.
- `target_shop_integration_ids` is only ever sent as a non-empty array; never `[]`; omitted only in the skip case (where nothing is sent at all).
- `metafields` includes only `Height`/`Width`/`Depth` keys with a non-null value; the whole key is omitted from the payload if all three are null.
- Only `client_id`, `target_shop_integration_ids`, `title`, `description`, `sku`, `item_article_number`, `metafields` are ever present in the request body — no `status`, `tags`, `product_category`, `price`, `weight`, `article_number`, or image fields.

---

## Test plan

### Vitest — schema

- `frontend/apps/managers-app/.../working_sections/types.test.ts` (add cases if file exists, else create): `WorkingSectionSchema` parses `allows_shopify_product_modifications`; `toWorkingSectionViewModel` exposes `allowsShopifyProductModifications`.
- `frontend/apps/workers-app/.../working_sections/types.test.ts`: same, for `WorkerWorkingSectionSchema`.

### Vitest — `resolve-shopify-product-sync-submit.ts` (pure function, highest priority — covers the "Critical behavior" section exhaustively without mounting anything)

`frontend/packages/shopify/src/lib/resolve-shopify-product-sync-submit.test.ts`:
- empty values → `{ kind: "skip" }`.
- only `shopIntegrationIds` filled → still `{ kind: "skip" }` (shops alone don't count).
- `sku` filled, no title → `submit` with `title` = sku.
- `title` empty, `sku` empty, `itemArticleNumber` present → `submit` with `title` = itemArticleNumber.
- `title`/`sku`/`itemArticleNumber` all empty, `heightCm` filled → `{ kind: "blocked", field: "title" }`.
- `title` filled, `sku` empty, `itemArticleNumber` null → `{ kind: "blocked", field: "sku" }` (identity still required even though title resolved).
- `title` + `sku` filled, no shops selected → `{ kind: "blocked", field: "shopIntegrationIds" }`.
- full valid input → payload has exactly the phase-one keys; `metafields` present only for filled dimensions; `target_shop_integration_ids` never `[]`.
- dimension values of `0` are treated as "filled" (not confused with `null`/empty) — explicit test for `heightCm: 0`.

### Vitest — component: `ShopifyProductSyncForm.test.tsx`

- renders two staged steps (`getByText`/`getByRole` for step titles, not testid, per `17_testing.md` RTL query priority).
- SKU input prefilled from `itemSku` context value.
- submitting empty form calls `onSkipped`, never calls the mocked `POST /api/v1/integrations/shopify/products/process` (assert via MSW `onUnhandledRequest: 'error'` + no handler registered, or an explicit spy).
- submit button label switches between skip-state and submit-state text as fields are filled (`userEvent.type` into SKU, assert label change).
- filling only shop selection (mock context with pre-selected shops) does not flip the button out of skip-state.
- real submit sends only the phase-one payload keys (assert via MSW request body capture).
- title-fallback-blocked case shows the title `FieldErrorPill` and does not call the mutation.
- identity-blocked case shows the SKU-step error and navigates back to step 1.
- mutation success calls `onCompleted` and closes; mutation error keeps the form open and does not call `onCompleted`.

### Vitest — component: `ShopifyProductSyncShopField.test.tsx`

- auto-selects the only shop when the mocked shop list has exactly one entry and no prior local storage.
- restores valid remembered shop IDs from local storage when the shop list contains them.
- ignores remembered IDs that are no longer present in the shop list.
- calls `surfaceOpeners.openShopPicker` with current selection on tap; on `onConfirm`, updates the field value and writes to local storage.
- renders a disabled/degraded state (no crash) when `surfaceOpeners.openShopPicker` is undefined.

### Vitest — component: `ShopifyShopPickerSheetPage.test.tsx`

- initial temp selection matches `selectedShopIntegrationIds` prop.
- tapping options updates only local temp state — `onConfirm` is not called on tap.
- tapping "Save selection" calls `onConfirm` with the current temp selection exactly once, then triggers close (assert `header.requestClose` mock called).

### Vitest — `shopify-product-sync-storage.test.ts`

- write-then-read round trip.
- corrupt JSON in storage → `readLastSelectedShopIntegrationIds()` returns `null`, no throw.
- `typeof window === "undefined"` path is unreachable in jsdom but keep the guard; if feasible, test via `vi.stubGlobal('window', undefined)` for both read and write, else document as untestable in this runner and rely on TypeScript + code review.

### Vitest — `process-shopify-products.ts` / `use-process-shopify-products.ts`

- API function: happy path parses `ProcessShopifyProductsResponseSchema` correctly from a mocked envelope; malformed response throws `ApiRequestError` with `code: 'invalid_response'`-equivalent (per `04_api_client.md`).
- mutation hook: `isPending` true during the call, resolves with the parsed result, `onError` receives an `ApiRequestError`.

### Playwright — workers app, mobile first then desktop

`frontend/apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/shopify-product-sync/task-step-completion.spec.ts`:
- Mock `GET /api/v1/integrations/shopify/shops` and `POST /api/v1/integrations/shopify/products/process` via `page.route`.
- Flow 1: complete a task step in a working section with `allows_shopify_product_modifications: true` → assert the Shopify product sync slide opens (`data-testid` on the slide root) before the time-confirmation slide.
- Flow 2: tap the skip-labelled submit with an empty form → assert no request to the process endpoint fired, assert the time-confirmation slide opens next.
- Flow 3: fill SKU + one dimension, select a shop via the picker sheet (`Save selection` flow), submit → assert the mocked request body, assert the time-confirmation slide opens after a successful mocked response.
- Flow 4: mock the process endpoint to return 422 → assert the slide stays open with the identity/title warning and the time-confirmation slide never opens.
- Flow 5 (regression): complete a task step in a working section with `allows_batch_working: true` → assert the existing batch flow is unchanged and the Shopify slide never opens.

Run `npm run test:e2e:mobile` first; only proceed to `npm run test:e2e:desktop` once mobile passes, per `34_runtime_validation_local.md`.

---

## Known deferrals

- Managers-app consumption of the Shopify product sync form (schema mirror only in this phase).
- Product images/media.
- `status`, `tags`, `product_category`, `price`, `weight` fields.
- Combined `allows_batch_working && allows_shopify_product_modifications` flow — if backend later supports both simultaneously, this needs its own plan; for now the batch path is left completely untouched and the Shopify gate only applies to the single-step completion path.
- Full realtime result UI for `shopify.products.synced` beyond the lightweight toast in §12 — if the `@beyo/realtime` relational read in §12 shows the event union is non-trivial to extend safely, even the toast wiring may need to be deferred to a follow-up plan; the Zod schemas/types added in §2 remain valid either way.
- A managers-app/workers-app create/edit working-section form field for `allows_shopify_product_modifications` (schema supports it; no UI toggle is added in this phase).

## Risks and mitigations

- Risk: `vm` in `use-task-step-detail.controller.ts` may not expose the item as a nested `vm.item` object (could be flattened, or named differently).
  Mitigation: explicit relational-read instruction in §16 before writing the wiring; do not guess the accessor path — read the `useMemo` definition first.
- Risk: no existing mechanism in `use-task-step-detail.controller.ts` to read `allowsShopifyProductModifications` for the current working section, requiring a new query/cache read that could introduce an extra request per task-step-detail mount.
  Mitigation: §16 requires checking the already-imported `workerWorkingSectionKeys` cache first (likely already warm from the working-sections list view the user navigated from) before adding any new network call; if a new call is unavoidable, prefer `enabled`-gated and cached via existing query keys rather than a bespoke fetch.
- Risk: `@beyo/realtime`'s server-event type union may not be a simple mapped type to extend, or may be shared/generated in a way that increases blast radius.
  Mitigation: §12 explicitly authorizes deferring the socket-registry wiring (not the Zod types) if this relational read surfaces complications — documented as a known deferral rather than forced through.
- Risk: `lucide-react`'s exact icon name for a "handbag/shopping" glyph (intention plan says "lucid icon handbag") may not exist verbatim in the installed version.
  Mitigation: §9 instructs confirming the closest available icon name at implementation time rather than hardcoding an assumed export name that could fail to compile.
- Risk: adding `@source "../../../../packages/shopify/src"` to the already-large workers-app `index.css` could pull in unexpected Tailwind class scanning if the shopify package has classnames not yet exercised by this app.
  Mitigation: this is the standard, required step per `14_styling.md` — run `npm run build` after the change to confirm no unexpected style regressions in existing workers-app screens.

## Validation plan

- `npm run typecheck` (repo root, or per-app as configured): zero TypeScript errors across `packages/shopify`, `apps/managers-app`, `apps/workers-app`.
- `npm run test -- --grep shopify`: all new Vitest suites pass (schema, `resolve-shopify-product-sync-submit`, form, shop field, picker sheet, storage, API/mutation).
- `npm run test:e2e:mobile --grep shopify-product-sync` (run from the workers app): passes before proceeding to desktop.
- `npx playwright test --grep shopify-product-sync --project=desktop` (workers app): passes.
- `npm run build` (workers app and managers app): confirms the new `@source` line and package dependency resolve cleanly and no `[INEFFECTIVE_DYNAMIC_IMPORT]` warning appears for `ShopifyProductSyncSlidePage`/`ShopifyShopPickerSheetPage` (validates §13's loader-function requirement was followed correctly).
- If any of the above cannot be run in the implementation environment (e.g. no real backend for the Playwright real-request flows, or credentials unavailable per `34_runtime_validation_local.md`), Codex must record the exact command attempted and the exact reason it could not complete — never report success without having run it.

## Review log

- `2026-07-10` `Claude`: initial plan drafted from `docs/architecture/under_construction/intention/shopify_product_creation.md`, `task_system/frontend_contract_goal_mapping_guide.md`, and a relational-read research pass over the existing `@beyo/shopify` package, both apps' `working_sections/types.ts`, the workers-app task-step completion flow, and the relevant UI primitives.

## Lifecycle transition

- Current state: `archived`
- Next state: `archived` — implementation summary written and validation completed.
- Transition owner: `Claude`
