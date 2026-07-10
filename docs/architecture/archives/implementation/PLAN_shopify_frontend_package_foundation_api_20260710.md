# PLAN_shopify_frontend_package_foundation_api_20260710

## Metadata

- Plan ID: `PLAN_shopify_frontend_package_foundation_api_20260710`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-10T02:00:00Z`
- Last updated at (UTC): `2026-07-08T14:17:48Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/intention/shopify_integration_2.md`
- Master plan: `docs/architecture/under_construction/implementation/PLAN_shopify_frontend_master_20260710.md` — Phase 1 of 7. This plan implements only Phase 1's scope; it must not implement any responsibility listed under Phases 2–7 in the master plan.
- Backend handoff (authoritative API contract): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md`

## Goal and intent

- Goal: Stand up the `@beyo/shopify` package skeleton with accurate types, a 7-route API layer, React Query hooks, mutation/action hooks, and a role-based permission helper — no UI, no consuming-app wiring.
- Business/user intent: Give later phases (2–7) a typed, tested, contract-accurate foundation to build UI on top of, so no later phase has to re-derive field names or re-litigate the API client wrapper pattern.
- Non-goals: any component/container/controller/page, `surface-ids.ts`, any managers-app change, any backend or `.env` change, workspace-wide webhook sync or scope-status API/types (deferred past v1 per the master plan).

## Scope

- In scope: `packages/shopify` package skeleton (`package.json`, `tsconfig.json`, `src/index.ts`), `src/types.ts`, `src/api/*` (7 API functions + query-key factory + query hooks + one infinite-query hook), `src/actions/*` (4 mutation hooks), `src/lib/use-shopify-integration-permissions.ts`, colocated Vitest unit tests, root `package.json` workspace/typecheck wiring so the new package is checked even before any app consumes it.
- Out of scope: everything listed in the master plan's Phases 2–7 (see that document for the full phase list); any file under `apps/`; `docs/handoff/from_backend/...` (read-only); `docs/architecture/under_construction/intention/shopify_integration_2.md` (read-only).
- Assumptions:
  - No app will import `@beyo/shopify` yet, so this package has zero consumers until Phase 3. Its own `tsconfig.json` must therefore be typechecked directly (see Validation plan) — the existing root `npm run typecheck` script only reaches packages through app compilation or an explicit `tsc -p packages/<name>/tsconfig.json` entry, neither of which exists for `shopify` yet.
  - `@beyo/auth`, `@beyo/api-client`, `@beyo/lib`, `@tanstack/react-query`, `zod` are all already installed at the workspace root (confirmed via `packages/auth/package.json`, `packages/tasks/package.json`) — no new external dependency needs adding.

## Clarifications required

All 7 package-ownership decisions the master plan flagged for this phase are resolved below from direct inspection of `packages/tasks/src/api/*.ts`, `packages/tasks/src/actions/*.ts`, `packages/api-client/src/api-client.ts`, `packages/auth/src/index.ts`, and `packages/auth/package.json`. None are blocking.

- [x] Exact package folder and package name — `packages/shopify`, `@beyo/shopify`. (Per intention doc + master plan; matches every other package's naming.)
- [x] Whether `surface-ids.ts` exists in package foundation or is deferred — **Deferred to Phase 2.** Phase 1 has no pages/sheets to define surface IDs for; creating it now would be speculative scaffolding with no consumer, which this codebase's conventions avoid.
- [x] Exact API client import/wrapper pattern — `import { apiClient } from "@beyo/api-client"` + `ApiEnvelopeSchema` from `@beyo/lib`. Confirmed exact method signatures in `packages/api-client/src/api-client.ts:163-185`: `apiClient.get<T>(path, schema, params?)`, `apiClient.post<T>(path, schema, body)`, `apiClient.delete<T>(path, schema, body?, params?)`. No `put`/`patch` needed for this route set.
- [x] Exact React Query import/wrapper pattern — `@tanstack/react-query`'s `useQuery`/`useInfiniteQuery`/`useMutation`/`useQueryClient`, with a plain query-key-factory object (confirmed shape in `packages/tasks/src/api/task-keys.ts`) — no custom query-hook abstraction layer exists in this codebase.
- [x] Exact `useRole()` import path — `import { useRole } from "@beyo/auth"` (confirmed re-exported from `packages/auth/src/index.ts:18`, not just the internal `hooks/use-role.ts` file).
- [x] Exact test file locations — colocated `*.test.ts` next to the source file it tests (confirmed convention: `packages/tasks/src/components/detail/TaskDetailBottomActions.test.tsx`, `packages/ui/.../use-scroll-state.test.ts`), excluded from `tsconfig.json`'s `include` via an `exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"]` entry (confirmed in `packages/tasks/tsconfig.json`), run directly with `npx vitest run --environment jsdom <path>` — package-level tests are **not** picked up by any app's `vitest.config.ts` (those scope `include` to their own `src/**`), so this direct-invocation pattern is the only way package tests run today (confirmed via `docs/architecture/implemented_summaries/SUMMARY_staged_form_footer_edge_reveal_decoupling_20260707.md`).
- [x] Whether runtime validators are needed now or deferred — **Needed now, but scoped correctly.** The Zod schemas in `types.ts`/`api/*.ts` (via `ApiEnvelopeSchema(...).extend({ ok: z.literal(true) })`) are not optional extras — `apiClient`'s internal `request()` calls `schema.safeParse(json)` and throws `ApiRequestError(502, "invalid_response", ...)` on mismatch (`packages/api-client/src/api-client.ts:150-160`). Without accurate schemas, every API call in this package would throw at runtime. Browser/Playwright runtime validation (`34_runtime_validation.md`'s sense of the term) is correctly deferred to Phase 7 — there is no UI to drive yet.

## Acceptance criteria

1. `packages/shopify` exists with `package.json`, `tsconfig.json`, `src/index.ts` following the exact template in `35_shared_packages.md` §3/§5, adapted with only the peer dependencies this package actually imports.
2. Every type in `src/types.ts` uses only field names present in `HANDOFF_TO_FRONTEND_shopify_integration_routes_20260709.md` — no invented fields, no fields from the two deferred routes (Route 8, Route 9).
3. All 7 first-version API functions exist, each returning a Zod-parsed, typed result, calling the exact route/method/role documented in the handoff.
4. Query hooks and the infinite-query hook follow the exact `useQuery`/`useInfiniteQuery` + key-factory pattern already used in `packages/tasks/src/api/`.
5. Mutation hooks invalidate the query keys documented in the master plan's "Query invalidation expectations" (derived from the intention doc), using `onSettled`/`onSuccess` per the existing `packages/tasks/src/actions/` pattern.
6. `useShopifyIntegrationPermissions()` returns exactly the 6 booleans in the master plan's "Permission model" table, matching the admin/manager/worker/seller matrix exactly, and consumes `useRole()` — never raw `AuthRole` string comparisons scattered elsewhere.
7. No component, container, controller, page, or `surface-ids.ts` file exists anywhere in `packages/shopify` after this phase.
8. `tsc -p packages/shopify/tsconfig.json --noEmit` passes with zero errors, run directly (this package has no consumer yet, so no app's `npm run typecheck` reaches it).
9. Every colocated `*.test.ts` file passes via direct `npx vitest run --environment jsdom <path>` invocation.
10. This plan implements nothing from Phase 2 onward (no controller, no carousel, no `surface-ids.ts`, no managers-app change).

## Contracts and skills

### Contracts loaded

- `architecture/02_types.md`: Zod schema + inferred-type conventions for `types.ts`.
- `architecture/04_api_client.md`: envelope/error handling baseline for the API layer.
- `architecture/04_api_client_local.md`: confirms the flat-string domain error shape (no `field_errors`) matches the handoff exactly — no new error-parsing logic needed.
- `architecture/05_server_state.md`: React Query key/hook structure baseline.
- `architecture/08_hooks.md`: query/action hook structure, invalidation/optimistic patterns (this phase only needs plain invalidation, no optimistic updates, since none of the 4 mutations have a meaningful list-item to optimistically patch pre-response).
- `architecture/13_errors.md`: error-surfacing conventions across the three response shapes (success/domain-failure/auth-failure/validation-failure).
- `architecture/15_feature_structure.md`: package `src/` folder layout baseline (`api/`, `actions/`, `lib/`, `types.ts`, `index.ts`).
- `architecture/16_feature_workflow.md`: confirms this phase's ordering — Types → Query Keys → API functions + Query hooks → Actions — is the correct first slice of the full build order; Controllers/Components/Forms/Pages intentionally not started yet.
- `architecture/17_testing.md`: Vitest conventions for colocated unit tests.
- `architecture/19_permissions.md`: canonical capability-model context for the migration note in the permission helper.
- `architecture/19_permissions_local.md`: exact `useRole()` return shape (`role`, `workspaceRoleName`, `hasRole()`, `isWorkspaceRole()`) and the current-state rule that local identity, not `can()`, drives v1 gating.
- `architecture/24_dto.md`: guidance on keeping `types.ts` a faithful mirror of backend snake_case fields (no premature camelCase view-model transformation at this layer — that belongs to later phases' presentational mapping).
- `architecture/34_runtime_validation.md`: baseline Playwright conventions — read only to confirm Phase 1 correctly has nothing to validate yet (no UI), not to write specs now.
- `architecture/34_runtime_validation_local.md`: confirms npm script names/project names for later phases; noted here so Phase 1's validation plan doesn't invent different script names than what Phase 7 will use.
- `architecture/35_shared_packages.md`: package boundary rules, `package.json`/`tsconfig.json` templates (§3/§5), peer-dependency classification (§4), what never belongs in a package's dependencies.

### Local extensions loaded

- `04_api_client_local.md`, `19_permissions_local.md`, `34_runtime_validation_local.md` — see reasons above.

### Explicitly excluded (with reason)

- `07_components.md`, `09_forms.md`, `10_pages.md`, `11_routing.md`, `14_styling.md`, `23_providers.md` — no component, form, page, route, or provider exists in this phase.
- `27_responsive.md`, `28_surfaces(_local).md`, `31_animations.md`, `32_loading_skeletons.md`, `33_vaul_drawer.md`, `36_scroll_visibility.md`, `37_keyboard_aware_inputs.md`, `30_dynamic_loading(_local).md`, `18_performance.md`, `20_notifications.md` — all UI/surface/animation/loading contracts; nothing in this phase renders anything. Deferred to the phases that actually need them (see master plan's per-phase contract notes).
- `12_auth(_local).md` — same reasoning as the master plan: this package only consumes `useRole()`'s already-documented return shape.
- `06_client_state.md` — no client-side store is created in this phase (or planned at all for the controller layer per the master plan's package-structure note).

### File read intent — pattern vs. relational

Per `task_system/frontend_contract_goal_mapping_guide.md`'s test ("how to write" → contract; "what exists" → read it), this phase's implementer may read, for **relational** purposes only:
- `packages/tasks/src/api/get-task.ts`, `create-task.ts`, `delete-task.ts`, `task-keys.ts`, `use-get-task-query.ts`, `use-task-flow-records-infinite-query.ts` — to confirm the exact API-function/key-factory/query-hook/infinite-query-hook shapes (already confirmed during this plan's research; reproduced in "Implementation plan" below so the implementer does not need to re-read them).
- `packages/tasks/src/actions/use-delete-task.ts` — to confirm the mutation-hook `onSettled` invalidation shape.
- `packages/api-client/src/api-client.ts` — to confirm `apiClient`'s exact method signatures (already reproduced below).
- `packages/auth/src/index.ts`, `packages/auth/src/roles.ts` — to confirm `useRole()`'s export path and `AuthRole` values (already reproduced below).
- `packages/auth/package.json`, `packages/tasks/package.json` — to confirm the `package.json` peer-dependency shape (already reproduced below).

No implementer should read any component, container, controller, or page file from any other package for this phase — there is nothing UI-shaped to model yet.

## Implementation plan

1. **Package skeleton**
   - Create `packages/shopify/package.json`:
     ```json
     {
       "name": "@beyo/shopify",
       "version": "0.0.0",
       "private": true,
       "type": "module",
       "exports": { ".": "./src/index.ts" },
       "peerDependencies": {
         "@beyo/api-client": "*",
         "@beyo/auth": "*",
         "@beyo/lib": "*",
         "@tanstack/react-query": ">=5.0.0",
         "react": ">=19.0.0",
         "zod": ">=4.0.0"
       }
     }
     ```
     (No `@beyo/ui`, `@beyo/hooks`, `framer-motion`, `lucide-react` peers yet — none of this phase's files import them. Add them in Phase 2 when components/pages need them.)
   - Create `packages/shopify/tsconfig.json`, copied from the `35_shared_packages.md` §5 template exactly (`target: es2023`, `types: ["node", "vite/client"]`, `moduleResolution: "bundler"`, `erasableSyntaxOnly: true`, etc.), with `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]` matching `packages/tasks/tsconfig.json`'s pattern.
   - Create `packages/shopify/src/index.ts` as an empty-but-valid barrel (populated incrementally by steps below; final content is the full list of Phase 1 public exports — types, schemas, API functions, query hooks, action hooks, the permission helper — following the named-exports-only rule from `35_shared_packages.md` §11).
   - Add `"@beyo/shopify": "*"` to nothing yet (no app consumes it this phase) — but add a direct typecheck entry to the root `package.json`'s `typecheck` script: `&& tsc -p packages/shopify/tsconfig.json --noEmit`, matching the existing pattern for `ui`/`hooks`/`realtime`/`notifications`/`celebration` (packages with no guaranteed app-compilation reach). This is the only way Phase 1's types get checked in CI/local `npm run typecheck` before Phase 3 wires the package into managers-app.

2. **`src/types.ts`** — Zod schemas + inferred types, using the master plan's "Types to model" section verbatim (field names sourced from the handoff, not re-derived). Structure:
   - `ShopifyUserReferenceSchema` (`client_id`, `username`, `profile_picture: z.string().nullable()`) → `ShopifyUserReference` type; used nullable itself wherever referenced (`z.nullable(ShopifyUserReferenceSchema)`).
   - String union schemas via `z.enum([...])` for: `ShopifyIntegrationStatus`, `ShopifyWebhookSubscriptionStatus`, `ShopifyWebhookIntakeStatus`, `ShopifyIntegrationEventType` (the 4 webhook-relevant values only — `webhook_sync`, `webhook_received`, `webhook_processed`, `disconnect`), `ShopifyIntegrationEventSeverity`, `ShopifyScopesStatus`, `ShopifyWebhooksStatus`.
   - `ShopifyShopIntegrationSchema` — all fields from the master plan's entity list; `last_health_check_status` modeled as `z.string().nullable()` (not a closed union — the handoff never enumerates its values).
   - `ShopifyWebhookSubscriptionSchema`, `ShopifyWebhookSubscriptionSummarySchema`.
   - `ShopifyWebhookIntakeHistoryRecordSchema` (`record_type: z.literal("webhook_intake")`, ...), `ShopifyIntegrationEventHistoryRecordSchema` (`record_type: z.literal("integration_event")`, ...), unioned via `z.discriminatedUnion("record_type", [...])` into `ShopifyWebhookHistoryRecordSchema`.
   - Response-wrapper types (not schemas needed standalone — they compose inline in each API function via `ApiEnvelopeSchema(...)`, per the `get-task.ts` pattern): `ShopifyShopsListResponse` data shape, `ShopifyShopDetailResponse` data shape, `ShopifyInstallUrlResponse`, `ShopifyDisconnectResponse`, `ShopifySyncWebhooksForShopResponse`, `ShopifyWebhookHistoryResponse` data shape.
   - `ShopifyOAuthResultParams` — plain type (not parsed via `apiClient`; Phase 3's redirect page reads it from `URLSearchParams`, so this is a plain TS type here, unblocked for that phase to consume): `{ success: boolean; shop_domain: string | null; error_code: ShopifyOAuthErrorCode | null }`, plus a `ShopifyOAuthErrorCodeSchema`/`ShopifyOAuthErrorCode` union with the 9 documented values.
   - Do **not** add `ShopifyScopeStatus` or `ShopifySyncWebhooksForWorkspaceResponse` — deferred-route types are explicitly excluded per the master plan's decision.

3. **`src/api/shopify-keys.ts`** — key-factory object matching `taskKeys`' shape:
   ```ts
   export const shopifyKeys = {
     all: ["shopify"] as const,
     shops: () => [...shopifyKeys.all, "shops"] as const,
     shopsList: (params: { limit?: number; offset?: number } = {}) =>
       [...shopifyKeys.shops(), "list", params] as const,
     shopDetail: (id: string) => [...shopifyKeys.shops(), "detail", id] as const,
     webhookHistory: (id: string) =>
       [...shopifyKeys.shops(), id, "webhook-history"] as const,
   };
   ```

4. **`src/api/*.ts`** — 7 API functions, each following the `get-task.ts`/`create-task.ts`/`delete-task.ts` pattern exactly (`ApiEnvelopeSchema(EntitySchema).extend({ ok: z.literal(true) })`, `apiClient.<method>(path, schema, body?/params?)`, return `parsed.data`):
   - `create-shopify-install-url.ts` → `createShopifyInstallUrl(shopDomain: string): Promise<ShopifyInstallUrlResponse>` — `apiClient.post("/api/v1/integrations/shopify/install-url", schema, { shop_domain: shopDomain, redirect_after_success: null })`. `redirect_after_success` is hardcoded `null` here — no parameter exposes a custom value, per the master plan's "current decisions."
   - `list-shopify-shops.ts` → `listShopifyShops(params?: { limit?: number; offset?: number }): Promise<ShopifyShopsListResponse>` — `apiClient.get("/api/v1/integrations/shopify/shops", schema, params)`.
   - `get-shopify-shop.ts` → `getShopifyShop(shopIntegrationId: string): Promise<ShopifyShopDetailResponse>` — `apiClient.get(\`/api/v1/integrations/shopify/shops/${shopIntegrationId}\`, schema)`.
   - `create-shopify-reauthorize-url.ts` → `createShopifyReauthorizeUrl(shopIntegrationId: string): Promise<ShopifyInstallUrlResponse>` — `apiClient.post(\`.../shops/${shopIntegrationId}/reauthorize-url\`, schema, undefined)`. Handoff confirms no request body for this route.
   - `disconnect-shopify-shop.ts` → `disconnectShopifyShop(shopIntegrationId: string): Promise<ShopifyDisconnectResponse>` — `apiClient.delete(\`.../shops/${shopIntegrationId}\`, schema)`.
   - `sync-shopify-webhooks-for-shop.ts` → `syncShopifyWebhooksForShop(shopIntegrationId: string): Promise<ShopifySyncWebhooksForShopResponse>` — `apiClient.post(\`.../shops/${shopIntegrationId}/webhooks/sync\`, schema, undefined)`.
   - `get-shopify-webhook-history.ts` → `getShopifyWebhookHistory(shopIntegrationId: string, params?: { limit?: number; offset?: number }): Promise<ShopifyWebhookHistoryResponse>` — `apiClient.get(\`.../shops/${shopIntegrationId}/webhooks/history\`, schema, params)`.
   - None of these 7 files import or reference the two deferred routes.

5. **Query hooks** (`src/api/`):
   - `use-list-shopify-shops-query.ts` → `useListShopifyShopsQuery(params?)`, plain `useQuery` per `use-get-task-query.ts`'s shape.
   - `use-get-shopify-shop-query.ts` → `useGetShopifyShopQuery(shopIntegrationId: string | null | undefined)`, `enabled: Boolean(shopIntegrationId)` per the same pattern.
   - `use-shopify-webhook-history-query.ts` → plain single-page query, for any caller that doesn't need infinite pagination.
   - `use-shopify-webhook-history-infinite-query.ts` → modeled directly on `use-task-flow-records-infinite-query.ts`: `pageSize = 3` (initial), `loadMoreSize = 5` (subsequent), `getNextPageParam` reads `webhook_history_records_pagination.has_more`/`.offset`/`.limit` — matching the intention doc's "initial 3, then 5 per page" requirement exactly.

6. **Action hooks** (`src/actions/`), each a plain `useMutation` per `use-delete-task.ts`'s shape:
   - `use-create-shopify-install-url.ts` — no invalidation `onSettled` needed (per the master plan: "no immediate invalidation is needed because the user leaves for Shopify OAuth").
   - `use-create-shopify-reauthorize-url.ts` — same, no invalidation (user leaves for OAuth).
   - `use-disconnect-shopify-shop.ts` — `onSettled` invalidates `shopifyKeys.shops()` (covers both list and any cached detail queries under that prefix) and `shopifyKeys.webhookHistory(shopIntegrationId)`.
   - `use-sync-shopify-webhooks-for-shop.ts` — `onSettled` invalidates `shopifyKeys.shopDetail(shopIntegrationId)` and `shopifyKeys.webhookHistory(shopIntegrationId)`.
   - None of these hooks call `notify.success`/`notify.error` themselves — per the reference controller pattern (`use-customer-coordination-email-inbox.controller.ts`), notification calls belong to the *controller* layer (Phase 2/5), not the action hook itself. This keeps action hooks reusable outside any specific controller's notification conventions.

7. **`src/lib/use-shopify-integration-permissions.ts`**:
   ```ts
   import { useRole } from "@beyo/auth";

   export function useShopifyIntegrationPermissions() {
     const { hasRole } = useRole();
     const isAdmin = hasRole("admin");
     const isManager = hasRole("manager");
     const canManage = isAdmin || isManager;

     return {
       canViewShopifyIntegrations: canManage,
       canCreateShopifyInstallUrl: canManage,
       canCreateShopifyReauthorizeUrl: canManage,
       canDisconnectShopifyIntegration: isAdmin,
       canSyncShopifyWebhooksForShop: isAdmin,
       canViewShopifyWebhookHistory: canManage,
     };
   }
   ```
   (Confirm `hasRole`'s exact parameter type against `useRole()`'s real signature during implementation — `19_permissions_local.md` documents `hasRole(role)` taking an `AuthRole`/`WorkspaceRole` value; use `AuthRole.Admin`/`AuthRole.Manager` from `@beyo/auth` rather than bare string literals if that's what the hook's type signature requires.)

8. **`src/index.ts`** — final barrel: named exports of every type/schema from `types.ts` that a later phase will need, all 7 API functions (only if a later phase legitimately needs the raw function — otherwise prefer exporting only the hooks), all query/action hooks, `shopifyKeys`, `useShopifyIntegrationPermissions`. No default exports (per `35_shared_packages.md` §11).

9. **Tests** (colocated, Vitest):
   - `src/lib/use-shopify-integration-permissions.test.ts` — table-test all 4 roles against all 6 booleans.
   - `src/api/shopify-keys.test.ts` — key-factory shape/uniqueness assertions.
   - At least one API function test that mocks `@beyo/api-client`'s `apiClient` and asserts the exact path/method/body passed for `createShopifyInstallUrl` (confirms `redirect_after_success: null` is always sent) and `disconnectShopifyShop` (confirms no body is required).
   - One query-hook test and one mutation-hook test using `@tanstack/react-query`'s test utilities (`QueryClientProvider` wrapper), following whatever existing test-setup helper `packages/tasks` already uses for its own hook tests (relational read if such a helper exists; write a local minimal wrapper otherwise — do not invent a shared test-utils package for this).

## Risks and mitigations

- Risk: root `npm run typecheck` silently never checks `packages/shopify` because it has no consumer yet, letting type errors slip through unnoticed until Phase 3.
  Mitigation: step 1 explicitly adds `tsc -p packages/shopify/tsconfig.json --noEmit` to the root script now, mirroring the existing pattern for other consumer-less/shared packages.
- Risk: `ShopifyIntegrationEventType` is modeled as a closed 4-value `z.enum`, and the backend later includes a broader lifecycle event type in this feed, causing every history-record parse to throw `ApiRequestError(502, "invalid_response", ...)` and break the whole history query.
  Mitigation: per the master plan's risk note, if `z.enum` proves too strict during implementation, prefer `z.string()` with a documented comment noting the 4 known values, over a closed union that can hard-fail parsing on an unexpected but valid value. Codex should choose whichever is verified safer once the actual Zod schema is drafted, but must not silently swallow unknown values without at least a fallback render path noted for Phase 6.
- Risk: `useRole()`'s actual `hasRole()` parameter type doesn't accept bare string literals like `"admin"`, causing a type error in the permission helper.
  Mitigation: step 7 explicitly flags this — implementer must check the real signature and use `AuthRole.Admin` etc. if required, rather than guessing.

## Validation plan

- `tsc -p packages/shopify/tsconfig.json --noEmit`: zero errors (this package's only compile gate until Phase 3).
- `npm run typecheck` (root): zero errors, confirming the new script entry (step 1) is wired correctly and doesn't break the existing app/package checks.
- `npx vitest run --environment jsdom packages/shopify/src/lib/use-shopify-integration-permissions.test.ts`: all 4 roles × 6 booleans pass.
- `npx vitest run --environment jsdom packages/shopify/src/api/shopify-keys.test.ts`: passes.
- `npx vitest run --environment jsdom packages/shopify/src/api/<api-function>.test.ts` (whichever function(s) get a mocked-`apiClient` test per step 9): passes, confirming exact path/method/body per route.
- No Playwright run required — no UI exists in this phase (matches master plan's Phase 1 validation note).

## Review log

- `2026-07-10` Claude: Phase 1 child plan drafted from the approved master plan; all 7 package-ownership decisions resolved via direct inspection of `packages/tasks`, `packages/api-client`, and `packages/auth`; no blockers found.
- `2026-07-08` Codex: Implemented `@beyo/shopify` Phase 1 package foundation, types, API layer, React Query hooks, action hooks, permission helper, and focused tests; validated with `npx tsc -p packages/shopify/tsconfig.json --noEmit`, `npm run typecheck`, and the focused Vitest suite.

## Lifecycle transition

- Current state: `archived`
- Next state: none
- Transition owner: `Codex`
