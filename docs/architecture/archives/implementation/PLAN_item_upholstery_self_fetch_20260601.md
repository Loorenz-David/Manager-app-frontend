# PLAN_item_upholstery_self_fetch_20260601

## Metadata

- Plan ID: `PLAN_item_upholstery_self_fetch_20260601`
- Status: `archived`
- Owner agent: `Claude Sonnet 4.6`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T08:54:12Z`
- Related issue/ticket: `N/A`
- Intention plan: `N/A`

## Goal and intent

- Goal: Make `TaskUpholsterySection` (managers app) and `TaskStepUpholsterySection` (workers app) independently self-fetch item upholstery data via `GET /api/v1/items/{client_id}/upholstery`. The shared fetch flow (query keys, fetch function, query hook, types) lives in `packages/tasks`. Both app-owned components stop reading `item_upholstery` / `requirements` from the task detail query and instead call `useItemUpholsteryQuery(itemId)` on mount.
- Business/user intent: The new endpoint embeds `image_url`, `name`, `code` directly in each upholstery row, eliminating N per-upholstery `GET /api/v1/upholsteries/{id}` calls in the workers app. The task detail payload is slimmed; upholstery data always reflects the latest state regardless of when the task query last refreshed.
- Non-goals: Moving the UI components themselves (`TaskUpholsterySection`, `TaskStepUpholsterySection`) into `packages/tasks` — they stay app-owned. Changing the upholstery picker (`ItemUpholsteryField`).

## Scope

- In scope:
  - Add `ItemUpholsteryEntrySchema`, `UpholsteryRequirementEntrySchema` types to `packages/tasks/src/types.ts`
  - New `item-upholstery-keys.ts`, `fetch-item-upholstery.ts`, `use-item-upholstery-query.ts` in `packages/tasks/src/api/`
  - Update `packages/tasks/src/index.ts` to export the above
  - Rewrite workers app `TaskStepUpholsterySection` to use `useItemUpholsteryQuery` (removes N `useUpholsteryQuery` calls)
  - Remove `item_upholstery` and `requirements` from managers app `TaskDetailRawSchema`
  - Remove `requirementsById` / `activeUpholstery` from `useTaskDetailController` and its return
  - Rewrite managers app `TaskUpholsterySection` to self-fetch with `useItemUpholsteryQuery`
  - Rewrite `ItemUpholsteryAmountSheetPage` to self-fetch with `useItemUpholsteryQuery`
  - Rewrite `ItemQuantitySheetPage` to self-fetch first upholstery from `useItemUpholsteryQuery`
  - Update `useSetUpholsteryQuantity` and `useUpdateItemUpholstery` to accept `itemId`, remove optimistic update from `useSetUpholsteryQuantity`, add `itemUpholsteryKeys.byItem(itemId)` invalidation
  - Update `upholstery-swap.spec.ts` Playwright mock to remove `item_upholstery` / `requirements` from task response and add new endpoint route
- Out of scope: Changing `ItemUpholsteryField` picker component. Updating workers app Playwright tests (workers app has no upholstery Playwright test). Moving either UI component to `packages/tasks`.
- Assumptions: The backend `GET /api/v1/items/{client_id}/upholstery` endpoint is live (per handoff `HANDOFF_TO_FRONTEND_item_upholstery_by_item_id_contract_20260601.md`). The backend task detail endpoint may still send `item_upholstery` / `requirements` fields; Zod will silently strip them after we remove them from the schema. Workers app already declares `@beyo/tasks: "*"` in `package.json`.

## Acceptance criteria

1. `npm run typecheck` passes with zero errors in both apps and `packages/tasks`.
2. `TaskStepUpholsterySection` renders upholstery cards using `useItemUpholsteryQuery` with no `useUpholsteryQuery` calls.
3. `TaskUpholsterySection`, `ItemUpholsteryAmountSheetPage`, and `ItemQuantitySheetPage` no longer read `item_upholstery` or `requirements` from the task detail query data.
4. Cache invalidation after upholstery quantity/swap mutations refreshes the `itemUpholsteryKeys.byItem(itemId)` query in addition to the task detail.
5. `upholstery-swap.spec.ts` Playwright test passes with the new mock shape.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package boundary rules — shared fetch flow goes to `packages/tasks`, UI stays in apps
- `task_system/frontend_contract_goal_mapping_guide.md`: reading guidance for file decisions
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_upholstery_by_item_id_contract_20260601.md`: endpoint contract

### Local extensions loaded

- `N/A`

### File read intent — pattern vs. relational

Permitted relational reads for this plan:
- `packages/tasks/src/types.ts` — exact field names to append to
- `packages/tasks/src/api/*` — existing pattern to mirror (`item-issues-keys.ts`, `fetch-item-issues.ts`, `use-item-issues-query.ts`)
- `packages/tasks/src/index.ts` — existing exports list to extend
- `apps/workers-app/.../TaskStepUpholsterySection.tsx` — existing component to rewrite
- `apps/managers-app/.../tasks/types.ts` — fields to remove from `TaskDetailRawSchema`
- `apps/managers-app/.../use-task-detail.controller.ts` — keys to remove and mutation call signatures to update
- `apps/managers-app/.../TaskUpholsterySection.tsx` — existing component to update
- `apps/managers-app/.../pages/tasks/ItemUpholsteryAmountSheetPage.tsx` — existing page to update
- `apps/managers-app/.../pages/tasks/ItemQuantitySheetPage.tsx` — existing page to update
- `apps/managers-app/.../items/actions/use-set-upholstery-quantity.ts` — existing hook to update
- `apps/managers-app/.../items/actions/use-update-item-upholstery.ts` — existing hook to update
- `tests/playwright/features/tasks/upholstery-swap.spec.ts` — existing test to update

### Skill selection

- Primary skill: none (CRUD-style migration)
- Excluded alternatives: `35_shared_packages.md §9` full migration cycle — not needed since UI components stay in apps

## Implementation plan

### Step 1 — `packages/tasks/src/types.ts`: add `ItemUpholsteryEntrySchema` and `UpholsteryRequirementEntrySchema`

Append after the existing `ItemIssueSchema` block:

```ts
export const ItemUpholsteryEntrySchema = z.object({
  client_id: z.string(),
  item_id: z.string(),
  upholstery_id: z.string(),
  name: z.string().nullable(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  amount_meters: z.number().nullable(),
  source: z.string(),
  time_to_fix_in_seconds: z.number().int().nullable(),
  active_requirement_id: z.string().nullable(),
});
export type ItemUpholsteryEntry = z.infer<typeof ItemUpholsteryEntrySchema>;

export const UpholsteryRequirementEntrySchema = z.object({
  client_id: z.string(),
  item_upholstery_id: z.string(),
  upholstery_inventory_id: z.string().nullable(),
  amount_meters: z.number().nullable(),
  value_minor: z.number().int().nullable(),
  currency: z.string().nullable(),
  source: z.string(),
  state: z.string(),
});
export type UpholsteryRequirementEntry = z.infer<typeof UpholsteryRequirementEntrySchema>;
```

Use `z.string()` (loose) for `source` and `state` to avoid breakage if the backend enum evolves.

---

### Step 2 — `packages/tasks/src/api/item-upholstery-keys.ts` (NEW)

```ts
export const itemUpholsteryKeys = {
  all: ["item-upholstery"] as const,
  byItem: (itemId: string) =>
    [...itemUpholsteryKeys.all, "by-item", itemId] as const,
  missing: () => [...itemUpholsteryKeys.all, "missing"] as const,
};
```

Mirrors the `itemIssueKeys` pattern exactly.

---

### Step 3 — `packages/tasks/src/api/fetch-item-upholstery.ts` (NEW)

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ItemUpholsteryEntrySchema,
  UpholsteryRequirementEntrySchema,
  type ItemUpholsteryEntry,
  type UpholsteryRequirementEntry,
} from "../types";

const FetchItemUpholsteryResponseSchema = ApiEnvelopeSchema(
  z.object({
    item_upholstery: z.array(ItemUpholsteryEntrySchema),
    requirements: z.array(UpholsteryRequirementEntrySchema),
  }),
);

export async function fetchItemUpholstery(itemId: string): Promise<{
  upholstery: ItemUpholsteryEntry[];
  requirements: UpholsteryRequirementEntry[];
}> {
  const envelope = await apiClient.get(
    `/api/v1/items/${itemId}/upholstery`,
    FetchItemUpholsteryResponseSchema,
  );
  return {
    upholstery: envelope.data.item_upholstery,
    requirements: envelope.data.requirements,
  };
}
```

---

### Step 4 — `packages/tasks/src/api/use-item-upholstery-query.ts` (NEW)

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchItemUpholstery } from "./fetch-item-upholstery";
import { itemUpholsteryKeys } from "./item-upholstery-keys";

export function useItemUpholsteryQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: itemId
      ? itemUpholsteryKeys.byItem(itemId)
      : itemUpholsteryKeys.missing(),
    queryFn: () => {
      if (!itemId) throw new Error("itemId is required");
      return fetchItemUpholstery(itemId);
    },
    enabled: Boolean(itemId),
  });
}
```

---

### Step 5 — `packages/tasks/src/index.ts`: add new exports

Add after the existing `itemIssueKeys` / `fetchItemIssues` / `useItemIssuesQuery` export block:

```ts
export { ItemUpholsteryEntrySchema, UpholsteryRequirementEntrySchema } from "./types";
export type { ItemUpholsteryEntry, UpholsteryRequirementEntry } from "./types";
export { itemUpholsteryKeys } from "./api/item-upholstery-keys";
export { fetchItemUpholstery } from "./api/fetch-item-upholstery";
export { useItemUpholsteryQuery } from "./api/use-item-upholstery-query";
```

---

### Step 6 — workers app `TaskStepUpholsterySection.tsx`: rewrite to use `useItemUpholsteryQuery`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepUpholsterySection.tsx`

**Remove imports:**
- `z` from `"zod"`
- `useUpholsteryQuery` from `"@/features/upholstery"`
- `UpholsteryRequirementSchema` from `"../../types"`

**Add imports:**
```ts
import { useMemo } from "react";
import {
  useItemUpholsteryQuery,
  type ItemUpholsteryEntry,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";
```

**Replace the `UpholsteryRequirement` type alias** (was `z.infer<typeof UpholsteryRequirementSchema>`) **with:**
```ts
type JoinedEntry = ItemUpholsteryEntry & {
  activeRequirement: UpholsteryRequirementEntry | null;
};
```

**Replace `UpholsteryEntryCard` props and body** — remove the internal `useUpholsteryQuery` call; take a `JoinedEntry` directly:

```tsx
function UpholsteryEntryCard({
  entry,
}: {
  entry: JoinedEntry;
}): React.JSX.Element {
  const requirementVariant = getUpholsteryRequirementVariant(
    entry.activeRequirement?.state ?? null,
  );
  const amountMeters =
    entry.activeRequirement?.amount_meters ?? entry.amount_meters;
  const amountLabel =
    amountMeters === null ? "Quantity missing" : `${amountMeters} m`;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
      data-testid={`upholstery-entry-card-${entry.client_id}`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {entry.image_url ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            draggable={false}
            loading="lazy"
            src={entry.image_url}
          />
        ) : (
          <ImagePlaceholder iconClassName="size-4 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {entry.name ?? "Upholstery unavailable"}
          </p>
          {requirementVariant && entry.activeRequirement ? (
            <StatePill
              label={formatUpholsteryRequirementLabel(
                entry.activeRequirement.state,
              )}
              variant={requirementVariant}
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.code ? `${entry.code} · ` : ""}
          {amountLabel}
        </p>
      </div>
    </div>
  );
}
```

**Replace `TaskStepUpholsterySection` body:**

```tsx
export function TaskStepUpholsterySection(): React.JSX.Element | null {
  const { step, isSeatCategory } = useTaskStepDetailContext();
  const itemId = step?.item?.client_id ?? null;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((r) => [r.client_id, r]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const entries = useMemo<JoinedEntry[]>(
    () =>
      (upholsteryQuery.data?.upholstery ?? [])
        .map((entry) => ({
          ...entry,
          activeRequirement: entry.active_requirement_id
            ? (requirementsById.get(entry.active_requirement_id) ?? null)
            : null,
        }))
        .filter((entry) => entry.activeRequirement?.state !== "failed"),
    [requirementsById, upholsteryQuery.data?.upholstery],
  );

  if (!step?.item || !isSeatCategory) {
    return null;
  }

  return (
    <DashedInfoSection className=" " data-testid="task-step-upholstery-section">
      <SectionLabel as="h3" tone="muted">
        Selected Upholstery
      </SectionLabel>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upholstery linked.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <UpholsteryEntryCard key={entry.client_id} entry={entry} />
          ))}
        </div>
      )}
    </DashedInfoSection>
  );
}
```

Note: hooks (`useItemUpholsteryQuery`, `useMemo`) are declared before the early return — React hook rules compliant. The loading skeleton is omitted since the component returns `null` when `!isSeatCategory` and renders empty state when data is not yet loaded.

---

### Step 7 — managers app `tasks/types.ts`: remove `item_upholstery` and `requirements` from `TaskDetailRawSchema`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`

In `TaskDetailRawSchema`, remove:
```ts
item_upholstery: z.array(ItemUpholsterySchema),
requirements: z.array(ItemUpholsteryRequirementSchema),
```

Also remove the now-unused imports at the top of the file:
```ts
import {
  ItemUpholsteryRequirementSchema,
  ItemUpholsterySchema,
  ...
} from "@/features/items/types";
```

Remove only `ItemUpholsteryRequirementSchema` and `ItemUpholsterySchema` from the import statement. Keep other imports from `@/features/items/types` that are still used.

---

### Step 8 — managers app `use-task-detail.controller.ts`: remove `requirementsById` / `activeUpholstery`, pass `itemId` to mutations

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-task-detail.controller.ts`

**Remove:**
- The `requirementsById` useMemo (lines 33–38)
- The `activeUpholstery` useMemo (lines 40–49)
- `activeUpholstery` from the return object (line 58)

**Update mutation calls** to pass `itemId` as second argument:
```ts
// before:
const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId);
const updateItemUpholstery = useUpdateItemUpholstery(taskId);

// after:
const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId, itemId);
const updateItemUpholstery = useUpdateItemUpholstery(taskId, itemId);
```

`itemId` is already declared on line 18: `const itemId = taskQuery.data?.item?.client_id ?? null;`

---

### Step 9 — managers app `TaskUpholsterySection.tsx`: self-fetch via `useItemUpholsteryQuery`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskUpholsterySection.tsx`

**Add imports:**
```ts
import { useMemo } from "react";
import {
  useItemUpholsteryQuery,
  type UpholsteryRequirementEntry,
} from "@beyo/tasks";
```

**Remove `activeUpholstery` from context destructure.** Keep `openUpholsteryAmountSheet`, `taskDetail`, and `updateItemUpholstery`.

**After context destructure, add self-fetch and local join:**

```ts
const itemId = taskDetail?.item?.client_id ?? null;
const upholsteryQuery = useItemUpholsteryQuery(itemId);

const requirementsById = useMemo(() => {
  const entries = upholsteryQuery.data?.requirements ?? [];
  return new Map<string, UpholsteryRequirementEntry>(
    entries.map((r) => [r.client_id, r]),
  );
}, [upholsteryQuery.data?.requirements]);

const activeUpholstery = useMemo(
  () =>
    (upholsteryQuery.data?.upholstery ?? []).map((entry) => ({
      ...entry,
      activeRequirement: entry.active_requirement_id
        ? (requirementsById.get(entry.active_requirement_id) ?? null)
        : null,
    })),
  [requirementsById, upholsteryQuery.data?.upholstery],
);
```

The existing JSX in the component body continues to use `activeUpholstery` with the same iteration — no JSX changes required, but one type cast is needed for the `requirementState` prop on `ItemUpholsteryField`:

```tsx
// before (type was ItemUpholsteryRequirementState from app enum):
requirementState={entry.activeRequirement?.state ?? null}

// after (state is now string; cast to satisfy ItemUpholsteryField prop type):
requirementState={
  (entry.activeRequirement?.state as
    import("@/features/items/types").ItemUpholsteryRequirementState | null
    | undefined) ?? null
}
```

If `ItemUpholsteryField` already accepts `string` for `requirementState`, no cast is needed — check the prop type and simplify if possible.

---

### Step 10 — managers app `ItemUpholsteryAmountSheetPage.tsx`: self-fetch via `useItemUpholsteryQuery`

File: `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`

**Add import:**
```ts
import { useItemUpholsteryQuery, type UpholsteryRequirementEntry } from "@beyo/tasks";
```

**After `taskQuery` declaration**, add:
```ts
const itemId = taskQuery.data?.item?.client_id ?? null;
const upholsteryQuery = useItemUpholsteryQuery(itemId);
```

**Replace the two useMemos** (`requirementsById` and `activeUpholstery`) **and the derived `upholstery` useMemo** with:

```ts
const requirementsById = useMemo(() => {
  const entries = upholsteryQuery.data?.requirements ?? [];
  return new Map<string, UpholsteryRequirementEntry>(
    entries.map((r) => [r.client_id, r]),
  );
}, [upholsteryQuery.data?.requirements]);

const upholstery = useMemo(() => {
  const entry = (upholsteryQuery.data?.upholstery ?? []).find(
    (e) => e.client_id === itemUpholsteryId,
  ) ?? null;

  if (!entry) return null;

  return {
    ...entry,
    activeRequirement: entry.active_requirement_id
      ? (requirementsById.get(entry.active_requirement_id) ?? null)
      : null,
  };
}, [requirementsById, upholsteryQuery.data?.upholstery, itemUpholsteryId]);
```

`resolvedAmount` derivation stays the same: `upholstery?.activeRequirement?.amount_meters ?? upholstery?.amount_meters ?? null`.

**Update `useSetUpholsteryQuantity` call** to pass `itemId`:
```ts
// before:
const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId ?? "");

// after:
const setUpholsteryQuantity = useSetUpholsteryQuantity(taskId ?? "", itemId);
```

All existing JSX stays unchanged.

---

### Step 11 — managers app `ItemQuantitySheetPage.tsx`: read first upholstery from `useItemUpholsteryQuery`

File: `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemQuantitySheetPage.tsx`

**Add import:**
```ts
import { useItemUpholsteryQuery } from "@beyo/tasks";
```

**After `item` derivation**, add:
```ts
const itemId = useSurfaceProps<ItemQuantitySurfaceProps>().itemId ?? item?.client_id ?? null;
```

Wait — `itemId` is already destructured from `useSurfaceProps` at the top of the component: `const { taskId, itemId, prefill } = useSurfaceProps<ItemQuantitySurfaceProps>();`

So just add:
```ts
const upholsteryQuery = useItemUpholsteryQuery(itemId);
```

**Replace:**
```ts
// remove:
const firstUpholstery = taskQuery.data?.item_upholstery?.[0] ?? null;

// add:
const firstUpholstery = upholsteryQuery.data?.upholstery[0] ?? null;
```

The rest of the page is unchanged. `firstUpholstery.client_id` continues to work since `ItemUpholsteryEntry` has `client_id`.

---

### Step 12 — managers app `use-set-upholstery-quantity.ts`: add `itemId`, remove optimistic, add invalidation

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-set-upholstery-quantity.ts`

**Add import:**
```ts
import { itemUpholsteryKeys } from "@beyo/tasks";
```

**Remove import:**
```ts
import type { TaskDetailRaw } from '@/features/tasks/types'; // no longer used
```

**Change signature:**
```ts
// before:
export function useSetUpholsteryQuantity(taskId: string) {

// after:
export function useSetUpholsteryQuantity(taskId: string, itemId: string | null = null) {
```

**Remove `onMutate` and `onError` handlers entirely** — these performed optimistic updates on `item_upholstery` inside the task cache, which no longer contains that field.

**Replace `onSettled`:**
```ts
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: detailKey });
  void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
  if (itemId) {
    void queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.byItem(itemId),
    });
  }
},
```

Also remove the `detailKey` snapshot variable and `cancelQueries` call since there is no optimistic update anymore.

---

### Step 13 — managers app `use-update-item-upholstery.ts`: add `itemId`, add invalidation

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item-upholstery.ts`

**Add import:**
```ts
import { itemUpholsteryKeys } from "@beyo/tasks";
```

**Change signature:**
```ts
// before:
export function useUpdateItemUpholstery(taskId: string) {

// after:
export function useUpdateItemUpholstery(taskId: string, itemId: string | null = null) {
```

**Update `onSettled`:**
```ts
onSettled: () => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
  void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
  if (itemId) {
    void queryClient.invalidateQueries({
      queryKey: itemUpholsteryKeys.byItem(itemId),
    });
  }
},
```

---

### Step 14 — `upholstery-swap.spec.ts`: update mock shape

File: `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/upholstery-swap.spec.ts`

**In the task route mock**, remove `item_upholstery` and `requirements` from the `data` object. Also remove `item_issues` if still present (schema no longer parses it).

**Add a new route mock for the upholstery endpoint:**

```ts
await page.route('**/api/v1/items/item_1/upholstery', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      warnings: [],
      data: {
        item_upholstery: [
          {
            client_id: 'item_upholstery_1',
            item_id: 'item_1',
            upholstery_id: currentUpholsteryId,
            name: currentUpholsteryId === 'upholstery_old' ? 'Velvet Blue' : 'Linen Sand',
            code: currentUpholsteryId === 'upholstery_old' ? 'VB-01' : 'LS-02',
            image_url: null,
            amount_meters: 2.5,
            source: 'internal',
            time_to_fix_in_seconds: null,
            active_requirement_id: 'requirement_1',
          },
        ],
        requirements: [
          {
            client_id: 'requirement_1',
            item_upholstery_id: 'item_upholstery_1',
            upholstery_inventory_id: 'inventory_1',
            amount_meters: 2.5,
            value_minor: null,
            currency: null,
            source: 'inventory',
            state: 'available',
          },
        ],
      },
    }),
  });
});
```

This mock must be registered **before** `page.getByTestId('tab-tasks').click()`. The `**/api/v1/upholsteries/*` mock for `ItemUpholsteryField` internal query stays in place.

## Risks and mitigations

- Risk: `ItemUpholsteryField.requirementState` prop expects `ItemUpholsteryRequirementState` enum type (managers app-local). The new `activeRequirement.state` is `string`.
  Mitigation: In `TaskUpholsterySection`, cast to `ItemUpholsteryRequirementState | null`. If the component accepts `string`, remove the cast. Check `ItemUpholsteryField` prop types before writing.

- Risk: `ItemUpholsteryAmountSheetPage` calls `setUpholsteryQuantity.mutate` with `upholstery.client_id` — this field is present in both the old `ItemUpholstery` type and the new `ItemUpholsteryEntry` type. No impact.

- Risk: `useItemUpholsteryQuery` fires independently from `useGetTaskQuery`. If `taskQuery` is slow, `itemId` is `null` and `useItemUpholsteryQuery` is disabled. Both components already guard `!step?.item` / `!taskDetail?.item`, so the loading state is handled.

- Risk: Playwright test calls `page.route('**/api/v1/upholsteries/*', ...)` for `ItemUpholsteryField` display. After migration, `TaskUpholsterySection` no longer calls this route directly, but `ItemUpholsteryField` may still call `useUpholsteryQuery` internally for its display value. Keep the mock in the test.

## Validation plan

- `npm run typecheck` in `frontend/` root: zero TypeScript errors
- `npx playwright test --grep "upholstery swap" --project=mobile`: `1 passed`
- Manual verification: open a task with a seat-category item in the managers app; upholstery section renders without `item_upholstery` in the task detail response
- Manual verification: workers app task step detail shows upholstery cards without calling `GET /api/v1/upholsteries/{id}` per entry

## Review log

- `2026-06-01` `Claude Sonnet 4.6`: initial plan authored

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
