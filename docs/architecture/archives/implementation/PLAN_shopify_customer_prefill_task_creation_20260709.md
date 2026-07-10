# PLAN_shopify_customer_prefill_task_creation_20260709

## Metadata

- Plan ID: `PLAN_shopify_customer_prefill_task_creation_20260709`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-09T00:00:00Z`
- Last updated at (UTC): `2026-07-09T12:11:20Z`
- Related issue/ticket: `n/a`
- Intention plan: provided inline by the user on 2026-07-09 (not persisted as a separate `INTENTION_*.md` file)
- Backend handoff: `HANDOFF_TO_FRONTEND_shopify_customer_lookup_by_product_identity_20260709`

## Goal and intent

- Goal: add a second, independent lookup query to task creation that resolves a Shopify customer from the item identity fields (`article_number`, `sku`) already entered in `ItemIdentityField`, and prefill the customer step of `PreOrderFormContent` / `ReturnFormContent` when a match is found — without touching the existing item lookup behavior in `ItemIdentityField`.
- Business/user intent: reduce manual typing in the customer step. A worker scanning/typing an article number or SKU that Shopify already associates with a customer (via an order containing that product) should see the customer step pre-populated.
- Non-goals:
  - Not building a generic multi-source external-identity-lookup framework (only laying groundwork so it stays possible later).
  - Not adding Playwright/runtime-validation coverage as part of this plan — the spec is deferred to a follow-up once e2e fixtures are available (endpoint now exists; see Risks/Lifecycle).
  - Not changing `ItemIdentityField`, its thresholds, its debounce, or its loading spinner.
  - Not adding `customer_type` inference from Shopify data.

## Scope

- In scope:
  - New Shopify customer lookup query hook + fetch fn + query keys, owned by `@beyo/task-creation`.
  - New pure selection helper (`selectBestShopifyCustomerLookupResult`) and pure field-mapping helper (`mapShopifyCustomerLookupResultToFormFields`).
  - New orchestration hook `useShopifyCustomerLookupPrefill` that watches `item.article_number`/`item.sku`, runs the two per-source queries, derives one selected customer per the priority rule, and injects values into the customer fields with dirty-safe `setValue`.
  - New presentational `ShopifyCustomerStatusPill` component (wraps `@beyo/ui`'s `StatePill`, no new global primitive).
  - Wiring into `PreOrderFormContent.tsx` (always eligible) and `ReturnFormContent.tsx` (eligible except `return_source === "store_return"`).
  - `@beyo/api-client` added to `@beyo/task-creation`'s `peerDependencies` (needed to call `apiClient.post` directly, matching the `@beyo/items` pattern).
  - Unit tests for both pure helpers; a hook-level test for the injection/priority derivation logic.
- Out of scope:
  - `InternalFormContent.tsx` — no import, no call, no pill. It has no customer step.
  - `packages/items` — untouched. `ItemIdentityField.tsx`'s spinner, thresholds, and debounce remain item-lookup-only.
  - `packages/shopify` — untouched. That package is the shop-integration admin bounded context (OAuth, webhooks, shop management); this feature is a task-creation-owned customer-prefill concern with a different lifecycle and different consumers. See "Package boundary decision" below.
- Assumptions:
  - `article_number` is sent to the backend exactly as typed (not run through `normalizeArticleNumberForLookup`, which is an items-package-local zero-padding heuristic for a different backend contract). The backend interprets `article_number` as the Shopify barcode raw value, so no normalization is applied here.
  - Both `sku` and `article_number` are trimmed client-side before sending; the backend requires at least one to be non-blank after trimming.
  - The backend handles per-shop SKU-first, barcode-fallback logic internally — the frontend sends both eligible values in one request and lets the backend decide which matched per shop.
  - `worker` role receives a `403` from this endpoint; only `admin`, `manager`, and `seller` are permitted. The hook is only mounted from form containers whose parent route already enforces one of these roles, so no additional frontend role gate is needed on the hook itself.

## Clarifications required

None. The backend endpoint is now delivered (see backend handoff `HANDOFF_TO_FRONTEND_shopify_customer_lookup_by_product_identity_20260709`). The previously uncertain items (HTTP method, response envelope key, full response shape) are now confirmed: the endpoint is a `POST` with a JSON body, the list key is `customer_matches`, and the full field set is documented in the handoff. The package-location and hook-naming decisions remain as specified in this plan.

## Acceptance criteria

1. `ItemIdentityField.tsx` has zero diff. Its existing item-lookup spinner, thresholds (`ARTICLE_NUMBER_MIN_LENGTH = 7` effective via padding, `SKU_MIN_LENGTH = 4`), and debounce (400ms) are unchanged.
2. `InternalFormContent.tsx` never imports or calls anything Shopify-customer-related.
3. `PreOrderFormContent.tsx` and `ReturnFormContent.tsx` each run a single unified Shopify customer lookup `POST` that includes whichever of `article_number` / `sku` passes its threshold (`article_number.trim().length > 6` / `sku.trim().length > 5`). At least one threshold-passing field must be present for the query to fire.
4. `ReturnFormContent.tsx` disables the lookup entirely (no query, no pill) when `return_source === "store_return"`.
5. A found Shopify customer fills `customer.display_name`, `customer.primary_email`, `customer.primary_phone_number`, `customer.address.street`, `customer.address.city`, `customer.address.postal_code` via `setValue(..., { shouldDirty: true })`, matching the existing `item-lookup-prefill.ts` style.
6. A customer field the user has manually diverged from (current value ≠ last-injected value, and not empty) is never overwritten by a later injection.
7. When one identity field drops below its minimum threshold while the other remains eligible, the query re-fires with only the still-eligible field. If that field still produces a match, the result is preserved. When both fields are eligible they are sent together in one request, and the best result is selected from the combined `customer_matches` response.
8. The customer step shows: nothing when idle, a neutral pill while loading, a green "Shopify customer" pill when found, a red "Shopify customer not found" pill when both eligible sources have settled with no match.
9. The existing item-lookup loading spinner in `ItemIdentityField` never reflects Shopify customer lookup state, and vice versa.
10. A Shopify lookup query error never throws to a route boundary, never blocks task creation/submission, and never shows raw backend error text.
11. `npm run typecheck` passes with zero errors across `@beyo/task-creation`.
12. New unit tests for `selectBestShopifyCustomerLookupResult` and `mapShopifyCustomerLookupResultToFormFields` pass; a hook-level test covering the per-source priority/fallback rule passes.

## Contracts and skills

### Domain schemas consulted

- `packages/task-creation/src/types.ts`: established `PreOrderFormSchema` uses full `CustomerFieldsSchema` (from `@beyo/customers`) for its `customer` field; `ReturnFormSchema` uses a locally-narrowed `ReturnCustomerFieldsSchema` (same shape, all optional, conditionally required unless `return_source === "store_return"`). Both expose `customer.display_name`, `customer.customer_type`, `customer.primary_email`, `customer.primary_phone_number`, `customer.address` at identical field paths — safe to target with one generic hook.
- `packages/customers/src/types.ts`: `CustomerFieldsSchema.address` is `AddressSchema` from `@beyo/lib`; confirmed concrete field names (`street`, `city`, `postal_code`, `country`) via both form containers' `defaultValues` blocks. No `country` mapping exists in the Shopify conceptual shape, so `country` is never touched.
- `packages/items/src/types.ts`: established the existing sibling convention for a lookup feature's Query Params DTO (`LookupItemsParams`, a discriminated union of `{article_number}` / `{sku}`) and Response DTO (`ItemLookupResultSchema`, permissive/nullable fields) — reused as the structural template for the new Shopify types, per `24_dto.md`'s Response DTO / Query Params DTO categories.

### Selected contracts

- `architecture/01_architecture.md`: overall layering (component → hook → query fn → api client) applies to the new query hook.
- `architecture/02_types.md`: schema/type placement and naming conventions in `types.ts`.
- `architecture/04_api_client.md`: `apiClient.post(path, schema, body)` shape, used by `fetch-shopify-customer-lookup.ts`.
- `architecture/05_server_state.md`: query hook / query-key-factory structure (one hook per query, `all`/`lookup(params)` key shape, `enabled` gating for dependent/thresholded queries, "never call the API client directly from a component").
- `architecture/06_client_state.md`: confirms the per-source lookup/injection state (loading/found/not_found, last-injected values) belongs in a hook via `useState`/`useRef`, not Zustand — it's transient, component-tree-scoped derived state, not shared app state.
- `architecture/08_hooks.md`: custom-hook composition conventions (combining two query hooks + derived state) for `useShopifyCustomerLookupPrefill`.
- `architecture/09_forms.md`: `setValue(..., { shouldDirty: true })` convention for system-applied form values, matching `item-lookup-prefill.ts`'s existing usage.
- `architecture/13_errors.md`: query-error handling; see explicit deviation noted in Risks (silent non-blocking failure, matching existing item-lookup precedent).
- `architecture/15_feature_structure.md`: file placement (`api/`, `lib/`, new `hooks/`, `components/`).
- `architecture/16_feature_workflow.md`: build order (types → keys → api fn → query hook → hook → components).
- `architecture/17_testing.md`: Vitest conventions for the new pure-helper and hook tests.
- `architecture/24_dto.md`: Response DTO / Query Params DTO categories — `ShopifyCustomerLookupResultSchema` and `ShopifyLookupFailedShopSchema` are permissive Response DTOs (all fields optional/nullable; Zod strips unknown fields silently). `ShopifyCustomerLookupParams` is a POST body type, not a URL Query Params DTO — both `sku` and `article_number` are sent as a JSON body, not serialized into a URL query string.
- `architecture/34_runtime_validation.md`: Playwright runtime validation is deferred to a follow-up plan; the real endpoint now exists, so the deferral reason is fixture/credential availability, not endpoint absence.

### Local extensions loaded

- None of the six known local companions (`01`, `04`, `12`, `28`, `30`, `34`) add a delta relevant to this feature — no auth/permission change, no new surface type, no dynamic-loading concern, and `34_runtime_validation_local.md`'s fixture/credential conventions only matter once a real Playwright spec is written (deferred).

### Excluded contracts

- `architecture/19_permissions.md`: the real endpoint restricts to `admin`/`manager`/`seller` (`worker` returns `403`), but the form containers that mount this hook are already behind route-level role gates that exclude `worker`. No additional frontend permission check is added at the hook or pill level — a `403` from the endpoint is treated as a silent non-blocking error, matching the existing item-lookup-query precedent.
- `architecture/28_surfaces.md`: no new surface, drawer, sheet, or modal introduced.
- `architecture/31_animations.md`: the pill is a static `StatePill` render, no transition/animation authored.
- `architecture/37_keyboard_aware_inputs.md`: no new text input, no keyboard-interaction change.
- `architecture/07_components.md`, `10_pages.md`, `11_routing.md`, `23_providers.md`: no new page, route, or provider — this is additive hook + small presentational component wiring into existing form containers.
- `architecture/21_realtime.md`, `26_persistence.md`, `18_performance.md`/`30_dynamic_loading.md`: no websocket, no persistence, no code-splitting concern.

### File read intent — pattern vs. relational

All implementation-file reads performed while building this plan were relational ("what exists"), not pattern reads substituting for a contract:

- `ItemIdentityField.tsx`, `PreOrderFormContent.tsx`, `ReturnFormContent.tsx`, `InternalFormContent.tsx`, `task-creation/src/types.ts`, `item-lookup-prefill.ts` — read because the intention named them as the exact existing behavior to preserve/extend (thresholds, watched fields, `handleLookupResult` shape, schema field names). Required relational reads, not pattern substitution.
- `packages/items/src/api/use-item-lookup-query.ts`, `fetch-item-lookup.ts`, `item-keys.ts`, `packages/items/src/types.ts` (lookup section), `normalize-article-number.ts` — read to confirm the **existing, already-established sibling convention** for a lookup feature's query key shape, Response DTO permissiveness, and `enabled` gating, since a directly analogous feature already exists one package over. `05_server_state.md` and `24_dto.md` remain the authority for _how_ to structure it; these reads confirmed what convention this specific codebase already committed to (staleTime `30_000`, `retry: false`, discriminated-union Query Params DTO) so the new hook doesn't invent a second, inconsistent lookup-query shape next to the first one.
- `packages/customers/src/types.ts`, `packages/ui/.../StatePill.tsx`, `packages/ui/.../StagedFormStep.tsx` — read to confirm exact existing field names/props (relational: "what exists"), not to learn how to structure a schema or a component.
- `packages/shopify/src/**` (file listing only, no content read) — confirmed via `ls`/`find` that the package is entirely shop-integration-admin (OAuth, webhooks, shop CRUD) with zero item/customer-lookup surface, informing the package-boundary decision below.
- `architecture/05_server_state.md`, `24_dto.md`, `13_errors.md` — read in full as the authoritative contracts for query-hook structure, DTO categorization, and error handling.

### Skill selection

- Primary skill: none (no slash-command skill matches "add a query + prefill hook to an existing form feature"; this is standard feature-workflow implementation covered by the contracts above).
- Trigger terms: n/a
- Excluded alternatives: none

## Package boundary decision

The new Shopify customer lookup query hook is placed inside `@beyo/task-creation` (`src/api/`, `src/lib/`, `src/hooks/`), **not** inside `@beyo/shopify`. Reasoning:

- `@beyo/shopify` (per the Shopify frontend master plan) is a self-contained shop-integration-admin bounded context: OAuth install/reauthorize, webhook subscriptions/history, shop connect/disconnect, consumed by managers-app's Settings feature. It has no concept of items, customers, or task creation today, and adding one would blur that boundary for a single admin-facing package.
- The intention itself states the reasoning for task-creation ownership explicitly: task-creation knows the task type, knows whether the form has a customer step, owns the customer form fields, and decides whether to inject returned data. None of that context exists in `@beyo/shopify`.
- This mirrors the existing precedent in this exact package: `@beyo/task-creation` already owns `use-item-lookup-query`-adjacent orchestration via `item-lookup-prefill.ts`, even though the raw item lookup query hook itself lives in `@beyo/items`. The Shopify case is symmetric: if a raw "Shopify customer lookup by identity" query hook were ever needed outside task creation, it could be extracted into `@beyo/shopify` later — but no such second consumer exists today, so keeping it local avoids a premature package split.
- Consequence: `@beyo/task-creation/package.json` gets one new `peerDependency`: `@beyo/api-client` (it has none of its own API-calling code today; all existing API hooks it uses are imported from `@beyo/items`, `@beyo/tasks`, etc.). No new dependency on `@beyo/shopify` is introduced.

## Implementation plan

Build order follows `16_feature_workflow.md`: types → keys → api fn → query hook → orchestration hook → component → wiring → tests.

1. **`packages/task-creation/package.json`** — add `"@beyo/api-client": "*"` to `peerDependencies` (alphabetically, after `@beyo/auth`... actually before it — insert alphabetically between the existing entries).

2. **`packages/task-creation/src/types.ts`** — add, near the existing form schemas:
   - `SHOPIFY_CUSTOMER_MATCH_TYPE = ["sku", "barcode"] as const` + `ShopifyCustomerMatchType` type.
   - `ShopifyCustomerLookupResultSchema` (Response DTO, fields optional/nullable for permissive parsing — see "Proposed DTO/schema types" below). Includes the confirmed real fields from the backend handoff: `shop_integration_id`, `shop_domain`, `match_type`, `matched_value`, `order_id`, `order_name`, `customer_id`, `display_name`, `primary_phone_number`, `primary_email`, `address`.
   - `ShopifyLookupFailedShopSchema` (Response DTO for the `failed_shops` array: `shop_integration_id`, `shop_domain`, `error_code` — all optional/nullable).
   - `ShopifyCustomerLookupParams` type (POST body DTO — at least one of `sku` or `article_number` required, both allowed simultaneously; not a strict discriminated union since the real endpoint accepts both fields in one request).
   - Export `ShopifyCustomerLookupResult` and `ShopifyLookupFailedShop` types alongside the existing type re-exports at the bottom of the file.

3. **`packages/task-creation/src/api/shopify-customer-lookup-keys.ts`** (new) — query key factory.

4. **`packages/task-creation/src/api/fetch-shopify-customer-lookup.ts`** (new) — `apiClient.post` call to `POST /api/v1/integrations/shopify/customers/by-product-identity`. Sends trimmed `sku` and/or `article_number` fields (whichever are present in `params`) as a JSON body. Reads results from `envelope.data.customer_matches`; surfaces `envelope.data.failed_shops` for downstream use. No query params — this is a POST with a JSON body, not a GET.

5. **`packages/task-creation/src/api/use-shopify-customer-lookup-query.ts`** (new) — one `useQuery` wrapper, mirrors `useItemLookupQuery`'s `staleTime: 30_000, retry: false`. Accepts `ShopifyCustomerLookupParams` (which permits both `sku` and `article_number` together). The query key encodes both field values so the cache re-fires automatically whenever either changes. `enabled` is false until at least one threshold-passing field is present in `params`.

6. **`packages/task-creation/src/lib/select-shopify-customer-lookup-result.ts`** (new) — pure `selectBestShopifyCustomerLookupResult` helper.

7. **`packages/task-creation/src/lib/select-shopify-customer-lookup-result.test.ts`** (new) — Vitest: empty list → `null`; exact `matched_value` match wins; `match_type` boost as tiebreak; equal scores → first result.

8. **`packages/task-creation/src/lib/map-shopify-customer-to-form-fields.ts`** (new) — pure `mapShopifyCustomerLookupResultToFormFields` helper.

9. **`packages/task-creation/src/lib/map-shopify-customer-to-form-fields.test.ts`** (new) — Vitest: nulls/blank strings map to `undefined` (never write empty strings over existing values); nested address fields map correctly; `country`/`district`/`coordinates` are never surfaced.

10. **`packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.ts`** (new) — the orchestration hook. This is a new `hooks/` directory in this package (no sibling package uses one; closest existing analogues are `controllers/` in `@beyo/upholstery`/`@beyo/task-notes`, which feed a provider/context — this hook has no context, is called directly by two form components, and is a plain composed custom hook per `08_hooks.md`, hence `hooks/` rather than `controllers/`). See "Proposed hook" section below for full behavior spec.

11. **`packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.test.tsx`** (new) — `renderHook` test (per `17_testing.md`) covering: both fields eligible → combined POST body sent, best result selected from `customer_matches`; only one field eligible → single-field POST still fires and finds result; switching identity values → query re-fires with new params, injected values update; a manually-edited field is not overwritten by a later injection; an empty field is filled; mock `isError: true` → non-blocking, status becomes `not_found`, form submission unaffected.

12. **`packages/task-creation/src/components/ShopifyCustomerStatusPill.tsx`** (new) — presentational component, wraps `@beyo/ui`'s `StatePill` in a `data-testid`-bearing wrapper (see "UI status/pill behavior" below).

13. **`packages/task-creation/src/components/PreOrderFormContent.tsx`** — import the hook + pill; call `useShopifyCustomerLookupPrefill({ form, articleNumber: itemArticleNumber, sku: itemSku, enabled: true })`; render `<ShopifyCustomerStatusPill status={...} />` as the first child inside the `id="customer"` step's wrapper `div`, before the first `ContentCard`.

14. **`packages/task-creation/src/components/ReturnFormContent.tsx`** — same wiring, with `enabled: returnSource !== "store_return"`; the pill renders inside the existing `{shouldShowCustomerStep ? (...) : null}` block, so it's already structurally absent for `store_return` (the `enabled: false` flag is still passed so the hook stays inert if `shouldShowCustomerStep` and the eligibility check ever diverge).

15. **`packages/task-creation/src/index.ts`** — export nothing new publicly unless another package needs it (it doesn't; this is fully internal to the two form containers). Confirm via `grep` before finalizing that no barrel export is expected.

16. Do **not** touch `InternalFormContent.tsx`, `ItemIdentityField.tsx`, `@beyo/items`, or `@beyo/shopify`.

## Proposed query hook and query key structure

```ts
// api/shopify-customer-lookup-keys.ts
export const shopifyCustomerLookupKeys = {
  all: ["shopify-customer-lookup"] as const,
  lookup: (params: ShopifyCustomerLookupParams) =>
    [...shopifyCustomerLookupKeys.all, params] as const,
};

// api/fetch-shopify-customer-lookup.ts
const SHOPIFY_CUSTOMER_LOOKUP_ENDPOINT =
  "/api/v1/integrations/shopify/customers/by-product-identity";

export async function fetchShopifyCustomerLookup(
  params: ShopifyCustomerLookupParams,
): Promise<{
  customer_matches: ShopifyCustomerLookupResult[];
  failed_shops: ShopifyLookupFailedShop[];
}> {
  const body: Record<string, string> = {};
  if (params.article_number) body.article_number = params.article_number.trim();
  if (params.sku) body.sku = params.sku.trim();

  const envelope = await apiClient.post(
    SHOPIFY_CUSTOMER_LOOKUP_ENDPOINT,
    ShopifyCustomerLookupResponseSchema, // ApiEnvelopeSchema(z.object({ customer_matches: z.array(ShopifyCustomerLookupResultSchema), failed_shops: z.array(ShopifyLookupFailedShopSchema) }))
    body,
  );

  return {
    customer_matches: envelope.data.customer_matches,
    failed_shops: envelope.data.failed_shops ?? [],
  };
}

// api/use-shopify-customer-lookup-query.ts
export function useShopifyCustomerLookupQuery(
  params: ShopifyCustomerLookupParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: shopifyCustomerLookupKeys.lookup(params),
    queryFn: () => fetchShopifyCustomerLookup(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    retry: false,
  });
}
```

One hook instance is called from the orchestration hook with a unified `{ article_number?, sku? }` params object containing whichever fields pass their eligibility threshold. The backend accepts both in a single POST and handles per-shop SKU-first/barcode-fallback logic internally. TanStack Query caches by the full params key — changing either field value triggers a new fetch automatically.

## Proposed DTO/schema/result types

```ts
// types.ts
export const SHOPIFY_CUSTOMER_MATCH_TYPE = ["sku", "barcode"] as const;
export type ShopifyCustomerMatchType =
  (typeof SHOPIFY_CUSTOMER_MATCH_TYPE)[number];

const ShopifyCustomerLookupAddressSchema = z
  .object({
    street_address: z.string().nullable().optional(),
    post_code: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    coordinates: z
      .object({
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional();

// Real backend shape confirmed via handoff doc. All fields still optional/nullable
// per 24_dto.md Response DTO guidance — Zod strips unknown fields silently.
export const ShopifyCustomerLookupResultSchema = z.object({
  shop_integration_id: z.string().nullable().optional(),
  shop_domain: z.string().nullable().optional(),
  match_type: z.enum(SHOPIFY_CUSTOMER_MATCH_TYPE).nullable().optional(),
  matched_value: z.string().nullable().optional(),
  order_id: z.string().nullable().optional(),
  order_name: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  primary_phone_number: z.string().nullable().optional(),
  primary_email: z.string().nullable().optional(),
  address: ShopifyCustomerLookupAddressSchema,
});
export type ShopifyCustomerLookupResult = z.infer<
  typeof ShopifyCustomerLookupResultSchema
>;

export const ShopifyLookupFailedShopSchema = z.object({
  shop_integration_id: z.string().nullable().optional(),
  shop_domain: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
});
export type ShopifyLookupFailedShop = z.infer<
  typeof ShopifyLookupFailedShopSchema
>;

// POST body type — at least one of sku or article_number required, both allowed simultaneously.
export type ShopifyCustomerLookupParams =
  | { article_number: string; sku?: string }
  | { sku: string; article_number?: string };
```

All `ShopifyCustomerLookupResult` fields remain optional/nullable per `24_dto.md` — the backend shape is now confirmed but Zod still strips unknown fields silently, so adding extra backend fields in the future won't break parsing. The `ShopifyCustomerLookupParams` type now permits both `sku` and `article_number` simultaneously (matching the real backend's accepted POST body), replacing the original strict discriminated union that only allowed one at a time.

## Customer result selection algorithm

```ts
// lib/select-shopify-customer-lookup-result.ts
export function selectBestShopifyCustomerLookupResult(
  results: ShopifyCustomerLookupResult[],
  requestedIdentity: { source: "article_number" | "sku"; value: string },
): ShopifyCustomerLookupResult | null {
  if (results.length === 0) return null;

  const expectedMatchType: ShopifyCustomerMatchType =
    requestedIdentity.source === "sku" ? "sku" : "barcode";
  const requestedValue = requestedIdentity.value.trim().toLowerCase();

  let bestIndex = 0;
  let bestScore = -1;

  results.forEach((result, index) => {
    let score = 0;
    if (result.matched_value?.trim().toLowerCase() === requestedValue)
      score += 10;
    if (result.match_type === expectedMatchType) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return results[bestIndex];
}
```

Strict `>` (not `>=`) guarantees a tie keeps the first-seen index, satisfying "tie: first result" exactly. Pure and independently unit-testable, and isolated behind an adapter boundary (this file) so backend-doc corrections only ever touch this one function.

## Customer field injection algorithm

```ts
// lib/map-shopify-customer-to-form-fields.ts
export type ShopifyCustomerInjectableFields = {
  display_name?: string;
  primary_email?: string;
  primary_phone_number?: string;
  address?: { street?: string; city?: string; postal_code?: string };
};

export function mapShopifyCustomerLookupResultToFormFields(
  result: ShopifyCustomerLookupResult,
): ShopifyCustomerInjectableFields {
  return {
    display_name: result.display_name?.trim() || undefined,
    primary_email: result.primary_email?.trim() || undefined,
    primary_phone_number: result.primary_phone_number?.trim() || undefined,
    address: {
      street: result.address?.street_address?.trim() || undefined,
      city: result.address?.city?.trim() || undefined,
      postal_code: result.address?.post_code?.trim() || undefined,
    },
  };
}
```

```ts
// hooks/use-shopify-customer-lookup-prefill.ts (behavior spec)

type CustomerPrefillableFormValues = {
  customer: {
    display_name?: string;
    primary_email?: string;
    primary_phone_number?: string;
    address?: { street?: string; city?: string; postal_code?: string };
  };
};

export type ShopifyCustomerPrefillStatus =
  | "idle"
  | "loading"
  | "found"
  | "not_found";

export function useShopifyCustomerLookupPrefill<
  TFormValues extends CustomerPrefillableFormValues,
>({
  form,
  articleNumber,
  sku,
  enabled,
}: {
  form: UseFormReturn<TFormValues>;
  articleNumber: string | undefined;
  sku: string | undefined;
  enabled: boolean;
}): { status: ShopifyCustomerPrefillStatus } {
  // 1. Debounce article_number/sku independently (400ms, mirrors ItemIdentityField's
  //    own private debounce — duplicated locally, not imported, since it's a private
  //    unexported function in that file and this hook must stay independent per the
  //    architecture requirement).
  // 2. isArticleNumberEligible = enabled && debouncedArticleNumber.trim().length > 6
  //    isSkuEligible          = enabled && debouncedSku.trim().length > 5
  //    isEligible             = isArticleNumberEligible || isSkuEligible
  // 3. Build unified POST body params (include only fields that pass their threshold):
  //      params: ShopifyCustomerLookupParams = {}
  //      if (isArticleNumberEligible) params.article_number = debouncedArticleNumber.trim()
  //      if (isSkuEligible)           params.sku            = debouncedSku.trim()
  // 4. ONE useShopifyCustomerLookupQuery call, gated by isEligible. The query key
  //    encodes both field values — changing either triggers a re-fetch automatically.
  //    The backend receives whichever fields are in the body and handles per-shop
  //    SKU-first / barcode-fallback logic internally.
  // 5. Apply selectBestShopifyCustomerLookupResult() to query.data?.customer_matches ?? []
  //    -> selectedResult (null | ShopifyCustomerLookupResult).
  //    (query.data?.failed_shops is available for future warning UI but is not
  //    surfaced in this plan's pill — it is silently ignored at this stage.)
  // 6. Derive status:
  //      if (!isEligible) status = "idle"
  //      else if (query.isFetching) status = "loading"
  //      else if (selectedResult) status = "found"
  //      else if (query.isSuccess || query.isError) status = "not_found"
  //      else status = "loading"  // query enabled but not yet settled
  //    A query error is treated as "settled with no result" (isError counts as
  //    settled) — see Risks for the deliberate silent-failure justification.
  // 7. Injection effect: on selectedResult change (guarded by a JSON-signature ref
  //    so re-renders with the same result don't re-run), map via
  //    mapShopifyCustomerLookupResultToFormFields, then for each of the 6 target
  //    field paths apply the safe-overwrite rule:
  //      currentValue = form.getValues(path)
  //      isEmpty = !currentValue?.trim()
  //      matchesPreviousInjection = currentValue === lastInjectedRef.current?.<field>
  //      if (isEmpty || matchesPreviousInjection) form.setValue(path, nextValue, { shouldDirty: true })
  //      // else: user has manually diverged — skip this field, leave lastInjectedRef's
  //      // value for this field unchanged so future comparisons stay correct.
  //    Update lastInjectedRef.current to the fields actually written.
  //    Use useEffectEvent for the injection body (mirrors handleLookupResult's
  //    existing pattern in item-lookup-prefill call sites) so the effect only
  //    depends on the selectedResult signature, not on `form` identity.
  // 8. Return { status }.
}
```

## UI status/pill behavior

`StagedFormStep` (`packages/ui/.../StagedFormStep.tsx`) is a plain children-renderer with no header/status slot — confirmed by reading it directly. No change to `StagedForm`/`StagedFormStep` is needed or made. Per the intention's "preferred first implementation," the pill is rendered as a normal child at the top of the customer step's content `div`, above the first `ContentCard`.

`StatePill` (`packages/ui/.../StatePill.tsx`) takes `{ label, variant, style?, className? }` and does not spread arbitrary props (no `data-testid` passthrough) — so `ShopifyCustomerStatusPill` wraps it in a `<span data-testid="...">` rather than modifying the shared primitive:

```tsx
export function ShopifyCustomerStatusPill({
  status,
}: {
  status: ShopifyCustomerPrefillStatus;
}): React.JSX.Element | null {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <span data-testid="shopify-customer-status-pill-loading">
        <StatePill label="Checking Shopify…" variant="neutral" />
      </span>
    );
  }

  if (status === "found") {
    return (
      <span data-testid="shopify-customer-status-pill-found">
        <StatePill label="Shopify customer" variant="success" />
      </span>
    );
  }

  return (
    <span data-testid="shopify-customer-status-pill-not-found">
      <StatePill label="Shopify customer not found" variant="danger" />
    </span>
  );
}
```

`StatePill`'s `success` variant already renders green (`#9ed9b5`/`#eaf8ef`/`#1e7a46`) and `danger` already renders red (`#ecb0aa`/`#fdecea`/`#b9382a`) — matches "modern green pill" / "modern red pill" without inventing new colors.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across the workspace, in particular `@beyo/task-creation`.
- `npx vitest run --environment jsdom packages/task-creation/src/lib/select-shopify-customer-lookup-result.test.ts`: all cases (empty → null, exact match wins, match_type tiebreak, first-on-tie) pass.
- `npx vitest run --environment jsdom packages/task-creation/src/lib/map-shopify-customer-to-form-fields.test.ts`: blank/null → `undefined`, nested address mapped, no stray fields.
- `npx vitest run --environment jsdom packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.test.tsx`: per-source priority/fallback rule, manual-edit protection, empty-field-fill, source-switch update — all pass (mock `useShopifyCustomerLookupQuery` at the module boundary; do not hit the network).
- Manual/QA checklist (from the intention's 17-point list) — unit-level assertions run against a mocked query response; integration-level assertions can now target the real endpoint:
  1. PreOrder: SKU ≤5 chars → no lookup fired (assert `useShopifyCustomerLookupQuery` mock never called with `enabled: true` for that source).
  2. PreOrder: SKU >5 chars → lookup fires.
  3. PreOrder: article_number ≤6 chars → no lookup.
  4. PreOrder: article_number >6 chars → lookup fires.
  5. Return (non-`store_return`): lookup allowed.
  6. Return `store_return`: lookup disabled, no pill rendered.
  7. Internal: hook never imported/called (static check — grep import in `InternalFormContent.tsx` finds nothing).
  8. Item-lookup spinner (`item-article-number-loading-indicator`/`item-sku-loading-indicator`) untouched — snapshot/regression test on `ItemIdentityField` unchanged.
  9. Shopify loading pill and item-lookup spinner are independent state (component test: mock Shopify query as fetching while item lookup query is idle, assert only Shopify pill shows loading).
  10. Found customer prepopulates all 6 mapped fields.
  11. Not-found pill only after both eligible sources settle with no result.
      12/13. SKU-found + article-not-found keeps SKU result and vice versa.
  12. Changing identity to a new match updates injected values.
  13. User-edited field not overwritten unless still equal to previous injection.
  14. Query error (mock `isError: true`) → non-blocking, no thrown error, form submission unaffected.
  15. Existing item-lookup prefill (`selectPurchaseApiLookupResult`, `createLookupResultSignature`, image batch creation) — unchanged, existing tests (if any) still pass.
- Playwright (`34_runtime_validation.md`): **deferred to a follow-up plan** — the real endpoint now exists and e2e validation is unblocked. A separate follow-up plan adds `npx playwright test --grep shopify-customer-prefill` (mobile project first, then desktop, per convention) once fixtures/credentials are configured.

## Risks and mitigations

- Risk: silently swallowing Shopify lookup errors (no toast, no rethrow) is a deliberate, narrow deviation from `13_errors.md`'s "never swallow errors silently" rule.
  Mitigation: this exactly mirrors the **existing, already-shipped** precedent in this same codebase — `ItemIdentityField`'s own item-lookup query already shows no toast and no error UI on failure (`isLookupLoading`/`lookupStatus` simply stay neutral). The Shopify lookup is a soft, best-effort prefill for a non-blocking secondary concern, not a user-initiated mutation; treating it identically to its sibling item-lookup query keeps the two "external identity lookup" affordances behaviorally consistent for the user, and avoids adding the codebase's first "toast on a background prefetch" pattern for a feature that explicitly must never block task creation. A `403` from a `worker`-role hit is also caught here — it surfaces as a silent non-blocking failure, which is correct since `worker` is not a permitted role for this endpoint and the hook is already behind route-level auth.
- Risk: switching from two per-source queries to one unified query means a cached positive result from one field is not preserved when the other field drops below threshold and triggers a re-fetch with only the surviving field.
  Mitigation: this is a deliberate trade-off in favour of a simpler, more network-efficient design (one POST vs two). When both fields are eligible the combined request yields the best overall result from `customer_matches`; when only one field remains eligible the re-fired single-field query will retain any still-matching result. The edge case (SKU had a match, user clears SKU, article_number doesn't match) resolves to "not_found" — acceptable UX since the identity input itself changed. The threshold gating (>6 / >5 chars) and 400ms debounce bound the call rate to one POST per keystroke-settle event, same cadence as the existing item-lookup call; `staleTime: 30_000` + `retry: false` bounds retry storms.
- Risk: introducing a new `hooks/` directory in `@beyo/task-creation` is a small, novel convention for this package (no sibling package has one).
  Mitigation: documented explicitly in "Package boundary decision" and step 10 above; scoped to exactly one hook file, not a new generic pattern to be filled in speculatively.
- Risk: no Playwright coverage ships with this plan.
  Mitigation: the real endpoint now exists and unblocks e2e validation. A follow-up plan adds the Playwright spec once fixtures/credentials are available (mobile project first, then desktop, per convention). Deferred, not forgotten.

## Review log

- (none yet — plan awaiting user review)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` (pending user sign-off; once approved, hand to Codex for implementation)
- Transition owner: user
