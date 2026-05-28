# PLAN_item_categories_package_20260528

## Metadata

- Plan ID: `PLAN_item_categories_package_20260528`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-28T17:00:00Z`
- Last updated at (UTC): `2026-05-28T16:32:26Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Create a shared `@beyo/item-categories` package with a list query (cached indefinitely as bootstrap-style data) and a flow for resolving a single item category by ID. Wire the cache-warming call into the workers app home route-entry.
- Business/user intent: Item categories are referenced across both apps (workers and managers). Fetching them once and caching indefinitely avoids repeated round trips and makes the data available synchronously to any component that needs to resolve a category name/image from an ID.
- Non-goals: No create/update/delete mutations. No category picker UI. No manager app migration in this plan.

## Scope

- In scope:
  - `packages/item-categories/` — full package scaffold (types, query keys, API fn, query hook, flow, barrel)
  - Workers app wiring: add dependency, call `useItemCategoriesQuery()` in `home/route-entry.tsx` to prime the cache on first load
- Out of scope:
  - Manager app migration (Step 5 of `35_shared_packages.md` migration cycle — separate plan)
  - Any UI component for displaying or selecting categories
  - Pagination / infinite scroll — initial fetch uses `limit: 200` to load all categories in one call

## Clarifications required

- [ ] The route-entry call mentions passing id `"ws_01KSFSQ6YAYE81KKT7K7Q48TGE"`, but item category IDs use the `itc_` prefix. The `ws_` prefix is a workspace identifier. **Clarify:** is the intent to (a) call `useItemCategoryByIdQuery` with a specific test `itc_...` ID for manual verification, or (b) simply warm the cache via `useItemCategoriesQuery()` with no specific ID lookup at route-entry level? This plan implements option (b) — cache warming at route-entry — which is the correct architectural use. Option (a) would only make sense inside a component that actually renders category data.

## Acceptance criteria

1. `npm run typecheck` (workers app) reports zero TypeScript errors.
2. On first load of the workers app home page, a single `GET /api/v1/item-categories?limit=200&offset=0` request is visible in the network tab.
3. Navigating away and back to the home page does NOT trigger a second fetch (cache hit).
4. `useItemCategoryByIdQuery("itc_...")` called with a known ID from the loaded list returns the correct category object without making a network request.
5. `node_modules/@beyo/item-categories` is a symlink pointing to `packages/item-categories` (workspace linked).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, layer rules
- `architecture/02_types.md`: branded ID types, Zod schema conventions
- `architecture/04_api_client.md`: `apiClient.get()` usage
- `architecture/04_api_client_local.md`: flat error shape, `ApiEnvelopeSchema` usage
- `architecture/05_server_state.md`: TanStack Query hook structure, `staleTime`, `gcTime`
- `architecture/08_hooks.md`: flow hook pattern
- `architecture/15_feature_structure.md`: feature folder layout
- `architecture/24_dto.md`: response schema → view model transformer
- `architecture/35_shared_packages.md`: package scaffold, peer deps, `@source` directives, migration cycle

### Local extensions loaded

- `architecture/04_api_client_local.md`: `ApiEnvelopeSchema` wraps response; backend error is a flat string

### File read intent — pattern vs. relational

Permitted relational reads performed before this plan:
- `packages/cases/package.json` — verified `package.json` structure and peer dep conventions
- `packages/cases/tsconfig.json` — confirmed tsconfig template
- `apps/workers-app/.../src/features/working_sections/api/working-section-keys.ts` — confirmed query key factory shape
- `apps/workers-app/.../src/features/home/route-entry.tsx` — confirmed existing structure to understand where cache-warming call goes
- `apps/workers-app/.../src/index.css` — confirmed existing `@source` directives

### Skill selection

- Primary skill: none (data-only package, no UI components, no surfaces)

## Implementation plan

### Phase 1 — Package scaffold

**Step 1 — Create `packages/item-categories/package.json`**

```json
{
  "name": "@beyo/item-categories",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/lib": "*",
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=19.0.0",
    "zod": ">=4.0.0"
  }
}
```

**Step 2 — Create `packages/item-categories/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node", "vite/client"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src"]
}
```

**Step 3 — Create `packages/item-categories/src/types.ts`**

Domain schema from backend response shape:

```ts
import { z } from "zod";

export const ItemCategoryIdSchema = z
  .string()
  .brand<"ItemCategoryId">();
export type ItemCategoryId = z.infer<typeof ItemCategoryIdSchema>;

export const MajorCategorySchema = z.string();
export type MajorCategory = z.infer<typeof MajorCategorySchema>;

export const ItemCategorySchema = z.object({
  client_id: z.string().transform((v) => v as ItemCategoryId),
  name: z.string(),
  major_category: MajorCategorySchema,
  created_at: z.string(),
  created_by_id: z.string(),
  image_url: z.string().nullable(),
});
export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const ItemCategoriesPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
});

export const ListItemCategoriesResponseSchema = z.object({
  item_categories: z.array(ItemCategorySchema),
  item_categories_pagination: ItemCategoriesPaginationSchema,
});
export type ListItemCategoriesResponse = z.infer<
  typeof ListItemCategoriesResponseSchema
>;

export type ListItemCategoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
};

export type ItemCategoryViewModel = {
  id: ItemCategoryId;
  name: string;
  majorCategory: string;
  imageUrl: string | null;
};

export function toItemCategoryViewModel(
  category: ItemCategory,
): ItemCategoryViewModel {
  return {
    id: category.client_id,
    name: category.name,
    majorCategory: category.major_category,
    imageUrl: category.image_url,
  };
}
```

**Step 4 — Create `packages/item-categories/src/api/item-category-keys.ts`**

```ts
export const itemCategoryKeys = {
  all: ["item-categories"] as const,
  list: (params: { limit: number; offset: number; q?: string }) =>
    [...itemCategoryKeys.all, "list", params] as const,
};
```

Note: because the initial load fetches all categories with `limit: 200, offset: 0` (no `q`), the cache key for that call is stable and will be hit on every subsequent `useItemCategoriesQuery()` call with the same params.

**Step 5 — Create `packages/item-categories/src/api/list-item-categories.ts`**

```ts
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { ListItemCategoriesParams, ListItemCategoriesResponse } from "../types";
import { ListItemCategoriesResponseSchema } from "../types";

export async function listItemCategories(
  params: ListItemCategoriesParams = {},
): Promise<ListItemCategoriesResponse> {
  const { limit = 200, offset = 0, q } = params;
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (q) searchParams.set("q", q);

  const envelope = await apiClient.get(
    `/api/v1/item-categories?${searchParams.toString()}`,
    ApiEnvelopeSchema(ListItemCategoriesResponseSchema),
  );

  return envelope.data;
}
```

**Step 6 — Create `packages/item-categories/src/api/use-item-categories-query.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { itemCategoryKeys } from "./item-category-keys";
import { listItemCategories } from "./list-item-categories";
import type { ListItemCategoriesParams } from "../types";

const CACHE_PARAMS = { limit: 200, offset: 0 } as const;

export function useItemCategoriesQuery(params?: ListItemCategoriesParams) {
  const resolvedParams = params ?? CACHE_PARAMS;

  return useQuery({
    queryKey: itemCategoryKeys.list(resolvedParams),
    queryFn: () => listItemCategories(resolvedParams),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
```

`staleTime: Infinity` — data is never considered stale; no background re-fetches.
`gcTime: Infinity` — entry never evicted from cache while the app is running.

**Step 7 — Create `packages/item-categories/src/flows/use-item-category-by-id.ts`**

```ts
import { useItemCategoriesQuery } from "../api/use-item-categories-query";
import type { ItemCategoryId, ItemCategoryViewModel } from "../types";
import { toItemCategoryViewModel } from "../types";

export type ItemCategoryByIdResult = {
  category: ItemCategoryViewModel | null;
  isPending: boolean;
  isError: boolean;
};

export function useItemCategoryByIdFlow(
  id: ItemCategoryId | null | undefined,
): ItemCategoryByIdResult {
  const query = useItemCategoriesQuery();

  const category =
    id && query.data
      ? (query.data.item_categories.find((c) => c.client_id === id) ?? null)
      : null;

  return {
    category: category ? toItemCategoryViewModel(category) : null,
    isPending: query.isPending,
    isError: query.isError,
  };
}
```

This flow does not issue a new network request — it reuses the cached result of `useItemCategoriesQuery()`. If called before the cache is warm (e.g., outside the home page context), it triggers the fetch itself.

**Step 8 — Create `packages/item-categories/src/index.ts`**

```ts
export type { ItemCategoryId, ItemCategory, ItemCategoryViewModel, ListItemCategoriesParams } from "./types";
export { ItemCategorySchema, ItemCategoryIdSchema, toItemCategoryViewModel } from "./types";
export { itemCategoryKeys } from "./api/item-category-keys";
export { listItemCategories } from "./api/list-item-categories";
export { useItemCategoriesQuery } from "./api/use-item-categories-query";
export { useItemCategoryByIdFlow } from "./flows/use-item-category-by-id";
export type { ItemCategoryByIdResult } from "./flows/use-item-category-by-id";
```

---

### Phase 2 — Workers app wiring

**Step 9 — Add dependency to workers app `package.json`**

Add to `apps/workers-app/ManagerBeyo-app-workers/package.json` under `dependencies`:

```json
"@beyo/item-categories": "*"
```

**Step 10 — Run npm install**

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify: `node_modules/@beyo/item-categories` is a symlink to `packages/item-categories`.

**Step 11 — No `@source` directive needed**

`packages/item-categories` contains no `.tsx` files with `className` props (it is a pure data/logic package). No `@source` entry required in `src/index.css`.

**Step 12 — Call `useItemCategoriesQuery()` in `home/route-entry.tsx`**

Add a single cache-warming call at the top of `HomeRouteEntry`. This call fires once on home page load, populates the cache with `staleTime: Infinity`, and the result is available instantly to any child component or flow that calls `useItemCategoriesQuery()` or `useItemCategoryByIdFlow()`.

```tsx
import { useItemCategoriesQuery } from "@beyo/item-categories";

export function HomeRouteEntry(): React.JSX.Element {
  useItemCategoriesQuery(); // primes the item-categories cache on home load

  const [selectedSection, setSelectedSection] =
    useState<WorkingSectionViewModel | null>(null);
  // ... rest unchanged
}
```

No loading gate or suspense needed here — the cache priming is fire-and-forget. Components that consume the flow handle their own `isPending` state.

---

### Phase 3 — Validation

**Step 13 — Type-check**

```bash
npx tsc --noEmit -p apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json
```

Zero errors expected.

**Step 14 — Verify network behaviour manually**

1. Load the workers app home page.
2. Network tab: one `GET /api/v1/item-categories?limit=200&offset=0` request, status 200.
3. Navigate away (e.g. to another tab) and return to home.
4. Network tab: no second `item-categories` request — cache hit confirmed.

## Risks and mitigations

- Risk: Backend returns more than 200 categories.
  Mitigation: `has_more` is present in the pagination object. If needed, a subsequent fetch with `offset: 200` can be added. For now, 200 covers all known categories.

- Risk: `ws_` ID mentioned in the brief is not a valid `itc_` item category ID.
  Mitigation: Flagged as a clarification. The route-entry wires cache-warming only (`useItemCategoriesQuery()`), which is correct regardless. `useItemCategoryByIdFlow` can be tested separately with a known `itc_` ID.

- Risk: Symlink not created after `npm install` if run from wrong directory.
  Mitigation: Always run `npm install` from `frontend/` root per §12 of `35_shared_packages.md`.

## Validation plan

- `npx tsc --noEmit -p apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json`: zero errors
- Manual browser check: single `item-categories` GET on home load, no re-fetch on return navigation

## Review log

- `2026-05-28` `claude-sonnet-4-6`: initial plan authored

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: user
