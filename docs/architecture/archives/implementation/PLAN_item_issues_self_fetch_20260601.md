# PLAN_item_issues_self_fetch_20260601

## Metadata

- Plan ID: `PLAN_item_issues_self_fetch_20260601`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T08:22:34Z`
- Related issue/ticket: —
- Intention plan: —
- Supersedes: `PLAN_task_issues_section_package_20260601` (that plan's component interface is replaced here; its package migration structure still applies)

## Goal and intent

- **Goal**: Add `GET /api/v1/items/{client_id}/issues` to `packages/tasks` as a self-contained query. Update `TaskIssuesSection` so that its only required caller input is `itemId` — the component fetches, displays, and invalidates its own issue data. Remove `item_issues` from the task detail API schema (managers app) since the field is no longer returned by that endpoint. Migrate the managers app `ItemFastIssueSheetPage` to initialise from the new endpoint instead.
- **Business/user intent**: Workers app can now show live item issues with zero data-wiring effort from the parent (just pass `itemId`). Both apps share one fetch path. The task detail endpoint is leaner.
- **Non-goals**: Building a workers-app issue fast-edit sheet surface (separate future task). Adding `item_issues` to `ItemSnapshotSchema` in workers (unnecessary — component fetches independently). Adding issue category configs to the package (not consumed by the component).

## Scope

- **In scope**:
  - `packages/tasks/src/types.ts` — add `ItemIssueSchema` + `ItemIssue` type (full API response shape)
  - `packages/tasks/src/api/item-issues-keys.ts` — NEW query keys
  - `packages/tasks/src/api/fetch-item-issues.ts` — NEW API function for `GET /api/v1/items/{id}/issues`
  - `packages/tasks/src/api/use-item-issues-query.ts` — NEW query hook
  - `packages/tasks/src/components/TaskIssuesSection.tsx` — NEW component (props: `itemId`, `onAddIssue`; self-fetching)
  - `packages/tasks/src/index.ts` — new exports
  - `packages/tasks/package.json` — add `lucide-react` peer dep
  - Workers app `package.json` — add `@beyo/tasks` dep (makes existing implicit dep explicit)
  - Workers app `index.css` — add `@source "../../../../packages/tasks/src"`
  - Workers app `TaskStepItemDetailsSection.tsx` — two-section layout; pass `itemId`
  - Managers app `apps/managers-app/.../features/tasks/types.ts` — remove `item_issues` from `TaskDetailRawSchema`
  - Managers app `TaskDetailSlidePage.tsx` — import from `@beyo/tasks`, pass `itemId`
  - Managers app `use-create-item-issue.ts` — add `itemIssueKeys.byItem` invalidation
  - Managers app `use-delete-item-issue.ts` — add `itemIssueKeys.byItem` invalidation
  - Managers app `ItemFastIssueSheetPage.tsx` — switch from `taskQuery.data.item_issues` to `useItemIssuesQuery`
  - Managers app `useTaskDetailController.ts` — remove `issueCategoryConfigsQuery` + `issueNameByTypeId` (see §Note on Plan 1)
  - Delete managers app local `features/tasks/components/detail/TaskIssuesSection.tsx`
  - Update managers app `features/tasks/components/detail/index.ts` barrel
- **Out of scope**: Workers app issue edit surface. Issue category configs in the package.
- **Assumptions**:
  - The new endpoint returns `issue_name_snapshot` populated on every issue — primary display label. Fallback to `"—"` when null.
  - `itemId` in this plan is the item's `client_id` (string), not a numeric ID.
  - Workers app `step.item?.client_id` is the correct value to pass as `itemId`.
  - Managers app `taskDetail.item?.client_id` is the correct value to pass as `itemId`.
  - The managers app `ItemFastIssueSheetPage` still needs `taskQuery` for `item_category_id` (for the issue picker flow). Only the issues initialisation switches to the new endpoint.

## Note on `PLAN_task_issues_section_package_20260601` (Plan 1)

Plan 1 introduced the package migration structure and a `{ issues, itemCategoryId, onAddIssue }` props design. **This plan replaces that interface**. The migration structure (creating the package files, removing the local component, updating barrel exports, wiring both apps) still applies and is included here in full so this plan is self-contained. Plan 1 should NOT be implemented independently — use only this plan.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package creation, migration cycle §9, peer dep classification §4, `@source` directive §6
- `architecture/05_server_state.md`: TanStack Query hook patterns for the new query and cache invalidation
- `architecture/08_hooks.md`: action hook mutation / `onSettled` invalidation pattern
- `architecture/07_components.md`: self-contained feature component conventions
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.get` usage, `ApiEnvelopeSchema`

### File read intent — pattern vs. relational

Permitted reads (relational):
- `packages/tasks/src/api/list-task-flow-records.ts` — confirm `@beyo/api-client` + `ApiEnvelopeSchema(@beyo/lib)` pattern for package API files
- `packages/tasks/src/api/task-flow-record-keys.ts` + `use-task-flow-records-query.ts` — confirm `missing()` fallback key and `enabled` guard pattern
- `apps/managers-app/.../features/tasks/types.ts` — `TaskDetailRawSchema` exact location of `item_issues` field to remove
- `apps/managers-app/.../features/items/actions/use-create-item-issue.ts` and `use-delete-item-issue.ts` — current `onSettled` shape before adding `itemIssueKeys` invalidation
- `apps/managers-app/.../features/items/pages/ItemFastIssueSheetPage.tsx` — current `taskQuery.data.item_issues` usage before switching

## Domain schemas consulted

- `apps/managers-app/.../features/items/types.ts`: `ItemIssueSchema` — full field set from existing schema used as the basis for the package `ItemIssueSchema`.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_issues_by_item_id_contract_20260601.md`: `GET /api/v1/items/{client_id}/issues` response shape (`data.item_issues`), error cases (`404`), role access.
- `apps/workers-app/.../features/task_steps/types.ts`: `ItemSnapshotSchema.client_id` — confirms `step.item?.client_id` is available as `itemId`.

---

## Acceptance criteria

1. `packages/tasks` exports `ItemIssueSchema`, `ItemIssue`, `itemIssueKeys`, `fetchItemIssues`, `useItemIssuesQuery`, and `TaskIssuesSection`.
2. `TaskIssuesSection` props are `{ itemId: string | null | undefined; onAddIssue?: () => void; "data-testid"?: string }` — no `issues` or `itemCategoryId` prop.
3. Workers app `TaskDetailSlidePage` renders the issues section with live data from the new endpoint (passes `itemId={step.item?.client_id ?? null}`).
4. Managers app `TaskDetailSlidePage` renders the issues section (passes `itemId={controller.taskDetail?.item?.client_id ?? null}` and `onAddIssue`).
5. `TaskDetailRawSchema` no longer has an `item_issues` field; TypeScript confirms no consumer reads `taskDetail.item_issues`.
6. Creating or deleting an issue invalidates `itemIssueKeys.byItem(itemId)`, triggering a fresh fetch from the section component.
7. `ItemFastIssueSheetPage` initialises its form from `useItemIssuesQuery(itemId)` instead of `taskQuery.data.item_issues`.
8. Both apps pass `npm run typecheck` and `npm run build` with zero errors.

---

## Implementation plan

### Step 1 — Add `ItemIssue` schema to `packages/tasks/src/types.ts`

Append after the existing schemas. Use `z.string()` for `state` (loose — avoids breakage if the server-side enum expands beyond the managers-app snapshot):

```ts
// ─── Item issue ───────────────────────────────────────────────────────────────

export const ItemIssueSchema = z.object({
  client_id: z.string(),
  item_id: z.string(),
  issue_type_id: z.string(),
  issue_severity_id: z.string().nullable(),
  state: z.string(),
  base_time_seconds: z.number().int().nullable(),
  time_multiplier: z.number().nullable(),
  issue_name_snapshot: z.string().nullable(),
  severity_name_snapshot: z.string().nullable(),
  created_by_id: z.string().nullable(),
  created_at: z.string().nullable(),
  started_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type ItemIssue = z.infer<typeof ItemIssueSchema>;
```

No other types from Plan 1 (`TaskItemIssue`, `IssueCategoryConfig*`) are added. This is the only new type needed.

---

### Step 2 — Create `packages/tasks/src/api/item-issues-keys.ts`

```ts
export const itemIssueKeys = {
  all: ["item-issues"] as const,
  byItem: (itemId: string) => [...itemIssueKeys.all, "by-item", itemId] as const,
  missing: () => [...itemIssueKeys.all, "missing"] as const,
};
```

Pattern source: `packages/tasks/src/api/task-flow-record-keys.ts`.

---

### Step 3 — Create `packages/tasks/src/api/fetch-item-issues.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { ItemIssueSchema } from "../types";

const FetchItemIssuesResponseSchema = ApiEnvelopeSchema(
  z.object({
    item_issues: z.array(ItemIssueSchema),
  }),
);

export async function fetchItemIssues(
  itemId: string,
): Promise<{ issues: ItemIssue[] }> {
  const envelope = await apiClient.get(
    `/api/v1/items/${itemId}/issues`,
    FetchItemIssuesResponseSchema,
  );
  return { issues: envelope.data.item_issues };
}
```

Import `ItemIssue` type from `"../types"` for the return annotation.

Pattern source: `packages/tasks/src/api/list-task-flow-records.ts` — `apiClient.get` + `ApiEnvelopeSchema` from `@beyo/lib`.

---

### Step 4 — Create `packages/tasks/src/api/use-item-issues-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchItemIssues } from "./fetch-item-issues";
import { itemIssueKeys } from "./item-issues-keys";

export function useItemIssuesQuery(itemId: string | null | undefined) {
  return useQuery({
    queryKey: itemId
      ? itemIssueKeys.byItem(itemId)
      : itemIssueKeys.missing(),
    queryFn: () => {
      if (!itemId) {
        throw new Error("itemId is required");
      }
      return fetchItemIssues(itemId);
    },
    enabled: Boolean(itemId),
  });
}
```

Pattern source: `packages/tasks/src/api/use-task-flow-records-query.ts`.

---

### Step 5 — Create `packages/tasks/src/components/TaskIssuesSection.tsx`

Self-contained: fetches its own issues, renders pills, exposes optional Add button.

```tsx
import { Plus } from "lucide-react";
import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";
import { useItemIssuesQuery } from "../api/use-item-issues-query";

type TaskIssuesSectionProps = {
  itemId: string | null | undefined;
  onAddIssue?: () => void;
  "data-testid"?: string;
};

export function TaskIssuesSection({
  itemId,
  onAddIssue,
  "data-testid": testId = "task-detail-issues-section",
}: TaskIssuesSectionProps): React.JSX.Element | null {
  const issuesQuery = useItemIssuesQuery(itemId);
  const issues = issuesQuery.data?.issues ?? [];

  if (!itemId) {
    return null;
  }

  if (!issues.length && !onAddIssue) {
    return null;
  }

  return (
    <DashedInfoSection data-testid={testId}>
      <EyebrowLabel>Issues Found</EyebrowLabel>
      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill key={issue.client_id}>
            {issue.issue_name_snapshot ?? "—"}
          </InfoPill>
        ))}
        {onAddIssue ? (
          <button
            aria-label="Add issue"
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
            onClick={onAddIssue}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

**Null guards**:
- `!itemId` → always null (no item to fetch from)
- `!issues.length && !onAddIssue` → null (nothing to show and no button)
- `issuesQuery.isError` is not explicitly checked — on error `issues` stays `[]` and the component naturally returns null (no issues + no button in error state), or shows the Add button if `onAddIssue` is provided. No separate error UI is needed; this is a secondary section.

**Loading state**: while `issuesQuery.isPending`, `issues = []` — if `onAddIssue` is provided the Add button renders immediately; pills appear as the query resolves. No shimmer needed for this secondary section.

**`issue_name_snapshot`**: the new endpoint always populates this field (per backend handoff). The `"—"` fallback is a safety net for null values.

---

### Step 6 — Update `packages/tasks/src/index.ts`

Append to the existing exports:

```ts
export { ItemIssueSchema } from "./types";
export type { ItemIssue } from "./types";

export { itemIssueKeys } from "./api/item-issues-keys";
export { fetchItemIssues } from "./api/fetch-item-issues";
export { useItemIssuesQuery } from "./api/use-item-issues-query";

export { TaskIssuesSection } from "./components/TaskIssuesSection";
```

---

### Step 7 — Update `packages/tasks/package.json`

Add `lucide-react` to `peerDependencies` (`TaskIssuesSection` uses the `Plus` icon):

```json
"peerDependencies": {
  "@beyo/api-client": "*",
  "@beyo/lib": "*",
  "@beyo/ui": "*",
  "@tanstack/react-query": ">=5.0.0",
  "lucide-react": ">=1.0.0",
  "react": ">=19.0.0",
  "zod": ">=4.0.0"
}
```

---

### Step 8 — Wire workers app

#### 8a — `apps/workers-app/ManagerBeyo-app-workers/package.json`

Add to `"dependencies"`:
```json
"@beyo/tasks": "*"
```

This makes explicit the dep that already existed via hoisting (`TaskFlowTimeline` was already imported from `@beyo/tasks`).

#### 8b — `apps/workers-app/ManagerBeyo-app-workers/src/index.css`

Add after the last `@source` line:
```css
@source "../../../../packages/tasks/src";
```

Registers Tailwind scanning for `TaskIssuesSection` (and retroactively for `TaskFlowTimeline` which was missing this directive).

#### 8c — Update `TaskStepItemDetailsSection.tsx`

Restructure from a single `DashedInfoGroup` inner `div` into two `DashedInfoSection` children.

**Add imports**:
```ts
import { DashedInfoSection } from "@beyo/ui";
import { TaskIssuesSection } from "@beyo/tasks";
```

**Updated JSX structure**:

```tsx
<DashedInfoGroup data-testid="task-step-item-details">
  {/* Section 1 — position / quantity / category */}
  <DashedInfoSection className="flex items-start gap-4 overflow-x-auto px-3 py-3">
    {hasPosition ? (
      <div className="flex shrink-0 flex-col gap-1">
        <EyebrowLabel>Position</EyebrowLabel>
        <InfoPill>
          <span className="text-sm">{step.item.item_position}</span>
        </InfoPill>
      </div>
    ) : null}

    {shouldRenderQuantity ? (
      <div className="flex shrink-0 flex-col gap-1">
        <EyebrowLabel>Quantity</EyebrowLabel>
        <InfoPill data-testid="task-step-item-qty-pill">
          <span className="text-sm">
            {step.item.quantity} piece{step.item.quantity > 1 ? "s" : ""}
          </span>
        </InfoPill>
      </div>
    ) : null}

    {hasCategory ? (
      <div className="flex min-w-0 shrink-0 flex-col gap-1">
        <EyebrowLabel>Category</EyebrowLabel>
        <div className="min-w-0">
          <ItemCategoryPill
            category={itemCategory}
            isPending={isItemCategoryPending}
            isError={isItemCategoryError}
          />
        </div>
      </div>
    ) : null}
  </DashedInfoSection>

  {/* Section 2 — item issues (self-fetching) */}
  <TaskIssuesSection itemId={step.item.client_id} />
</DashedInfoGroup>
```

**Notes**:
- `DashedInfoSection` default `className` is `"px-4 py-4"`. Override with `"flex items-start gap-4 overflow-x-auto px-3 py-3"` for section 1 to preserve the existing horizontal pill layout.
- No `onAddIssue` in workers app for now — the Add button does not appear. When issues exist, they render as read-only pills.
- `step.item.client_id` is always a string when `step.item` is non-null. The outer `shouldRenderDetails` guard already ensures `step.item` is present; using `step.item.client_id` without null coalescing is safe inside the already-guarded render block.
- Section 2 has its own internal null guard (`!items.length && !onAddIssue → null`). The outer `shouldRenderDetails` guard is unchanged — it still gates only on section 1 content.

---

### Step 9 — Run `npm install` from `frontend/`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

---

### Step 10 — Validate workers app (§9 Step 4 gate)

```bash
npm run typecheck -w managerbeyo-app-workers
npm run build -w managerbeyo-app-workers
```

Only proceed to Step 11 after both pass with zero errors.

---

### Step 11 — Remove `item_issues` from managers app `TaskDetailRawSchema`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`

In `TaskDetailRawSchema`, remove the `item_issues` field entirely:

```ts
// Remove this line from TaskDetailRawSchema:
item_issues: z.array(ItemIssueSchema),
```

After this change, `GetTaskResult` (inferred from `GetTaskResponseSchema`) no longer has an `item_issues` property. TypeScript will surface every consumer that still reads `taskDetail.item_issues` — each must be fixed.

**Known consumers to fix in subsequent steps**:
1. `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — currently passes `issues={controller.taskDetail?.item_issues ?? []}` (replaced in Step 12)
2. `apps/managers-app/.../features/items/pages/ItemFastIssueSheetPage.tsx` — reads `taskQuery.data.item_issues` (replaced in Step 13)

---

### Step 12 — Migrate managers app `TaskDetailSlidePage.tsx`

**Remove** `TaskIssuesSection` from the feature barrel import:
```ts
// Remove TaskIssuesSection from:
import {
  ...
  TaskIssuesSection,
  ...
} from "@/features/tasks/components/detail";
```

**Add** import from package:
```ts
import { TaskIssuesSection } from "@beyo/tasks";
```

**Replace** in JSX:
```tsx
// Before (Plan 1 shape — remove this):
<TaskIssuesSection
  issues={controller.taskDetail?.item_issues ?? []}
  itemCategoryId={controller.taskDetail?.item?.item_category_id ?? null}
  onAddIssue={controller.openIssueSheet}
/>

// After:
<TaskIssuesSection
  itemId={controller.taskDetail?.item?.client_id ?? null}
  onAddIssue={controller.openIssueSheet}
/>
```

The `controller` variable is already declared via `useTaskDetailContext()` at the top of `TaskDetailSlidePageContent`.

---

### Step 13 — Update `ItemFastIssueSheetPage.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/ItemFastIssueSheetPage.tsx`

**Add** import:
```ts
import { useItemIssuesQuery } from "@beyo/tasks";
```

**Add** query call (after the existing `useGetTaskQuery` call):
```ts
const itemIssuesQuery = useItemIssuesQuery(itemId ?? null);
```

**Update loading/error guard**:
```tsx
// Before:
if (taskQuery.isPending) {
  return <div className="p-6 text-sm text-muted-foreground">Loading issues…</div>;
}
if (taskQuery.isError || !taskQuery.data?.item) {
  return <div className="p-6 text-sm text-muted-foreground">Item issues could not be loaded.</div>;
}

// After:
if (taskQuery.isPending || itemIssuesQuery.isPending) {
  return <div className="p-6 text-sm text-muted-foreground">Loading issues…</div>;
}
if (taskQuery.isError || !taskQuery.data?.item) {
  return <div className="p-6 text-sm text-muted-foreground">Item issues could not be loaded.</div>;
}
```

**Update `useEffect` that initialises the form** (the one with `hasInitializedRef`):

```tsx
useEffect(() => {
  if (!itemIssuesQuery.data || hasInitializedRef.current) {
    return;
  }

  const issues = itemIssuesQuery.data.issues;

  initialIssuesRef.current = issues;
  form.reset({
    item: { item_category_id: taskQuery.data?.item?.item_category_id ?? undefined },
    item_issues: issues.map((issue) => ({
      issue_id: issue.issue_type_id,
      issue_severity_id: issue.issue_severity_id ?? "",
    })),
  });
  hasInitializedRef.current = true;
}, [form, itemIssuesQuery.data, taskQuery.data?.item?.item_category_id]);
```

The `taskQuery` is still needed for `item_category_id` (drives the issue picker option list). Only the issues array source changes.

---

### Step 14 — Update `use-create-item-issue.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-create-item-issue.ts`

**Add** import:
```ts
import { itemIssueKeys } from "@beyo/tasks";
```

**Update `onSettled`** to accept `(data, error, variables)` and invalidate the item issues query:

```ts
onSettled: (data, error, variables) => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
  void queryClient.invalidateQueries({
    queryKey: itemIssueKeys.byItem(variables.itemId),
  });
},
```

`variables` is the `CreateItemIssueInput` object that was passed to `mutationFn`. `variables.itemId` is the item's client id.

---

### Step 15 — Update `use-delete-item-issue.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-delete-item-issue.ts`

**Add** import:
```ts
import { itemIssueKeys } from "@beyo/tasks";
```

**Update `onSettled`**:

```ts
onSettled: (data, error, variables) => {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId as never) });
  void queryClient.invalidateQueries({
    queryKey: itemIssueKeys.byItem(variables.itemId),
  });
},
```

`variables` is `DeleteItemIssueInput`: `{ itemId: string; issueId: string }`.

---

### Step 16 — Clean up `useTaskDetailController.ts`

This step mirrors Plan 1's cleanup. Apply it only if Plan 1 has NOT already been implemented.

**Remove**:
- Import of `useIssueCategoryConfigsQuery`
- `itemCategoryId` const (was only used by the query)
- `issueCategoryConfigsQuery` call
- `issueNameByTypeId` `useMemo`
- `issueNameByTypeId` in the return object
- `issueCategoryConfigsQuery.refetch()` in the `refetch` function

**Before** (relevant sections):
```ts
const itemCategoryId = taskQuery.data?.item?.item_category_id ?? undefined;
const issueCategoryConfigsQuery = useIssueCategoryConfigsQuery(
  { item_category_id: itemCategoryId },
  { enabled: !!itemCategoryId },
);

async function refetch(): Promise<void> {
  await Promise.all([taskQuery.refetch(), issueCategoryConfigsQuery.refetch()]);
}

const issueNameByTypeId = useMemo(() => { ... }, [...]);

return {
  ...
  issueNameByTypeId,
  ...
};
```

**After**:
```ts
async function refetch(): Promise<void> {
  await taskQuery.refetch();
}

return {
  // issueNameByTypeId removed
  ...
};
```

---

### Step 17 — Delete local `TaskIssuesSection.tsx` and update barrel

**Delete**:
```
apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskIssuesSection.tsx
```

**Update** `apps/managers-app/.../features/tasks/components/detail/index.ts` — remove:
```ts
export { TaskIssuesSection } from "./TaskIssuesSection";
```

---

### Step 18 — Verify both apps

```bash
npm run typecheck -w managerbeyo-app-managers
npm run build -w managerbeyo-app-managers
npm run typecheck -w managerbeyo-app-workers
npm run build -w managerbeyo-app-workers
```

All four commands must exit with zero errors.

---

## Risks and mitigations

- **Risk**: `task_detail.item_issues` removal surfaces unexpected consumers at typecheck time.
  **Mitigation**: Step 11 intentionally breaks the type first. The TypeScript compiler surfaces every consumer. Steps 12–16 cover all known consumers. Any additional compile errors at Step 18 reveal missed consumers — fix them before marking complete.

- **Risk**: `ItemFastIssueSheetPage` now waits for two queries (`taskQuery` + `itemIssuesQuery`) before initialising the form. If one resolves before the other the guard `!itemIssuesQuery.data || hasInitializedRef.current` prevents double-initialisation. The form only resets once.
  **Mitigation**: The `hasInitializedRef` ref prevents double-init. `taskQuery.data?.item?.item_category_id` is read inside the effect dependency array; if it arrives later than `itemIssuesQuery.data`, the effect reruns only while `hasInitializedRef.current` is still false. First-data-wins semantics are preserved.

- **Risk**: Pull-to-refresh in managers app task detail (`controller.refetch()`) no longer refreshes item issues (they are now a separate query). A user who pulls to refresh the task detail won't see newly added issues unless they navigate away and back.
  **Mitigation**: Acceptable for the initial implementation. Issues are invalidated and refetched immediately on create/delete via the `onSettled` hook (Steps 14–15). The stale-while-revalidate default means TanStack Query will refetch on window focus and route re-entry. A follow-up can add `queryClient.invalidateQueries({ queryKey: itemIssueKeys.byItem(itemId) })` to `useTaskDetailController`'s `refetch` function if the UX requires it.

- **Risk**: Workers app `step.item.client_id` assumed safe inside the guarded render block. If `shouldRenderDetails` is true but `step.item` is somehow null, `step.item.client_id` throws.
  **Mitigation**: `shouldRenderDetails = hasPosition || shouldRenderQuantity || hasCategory`. `hasPosition` and `hasCategory` check `step.item.item_position` / `step.item.item_category_id`. These are only truthy when `step.item` is non-null. If all three are false (and `shouldRenderDetails` is false), the outer guard already returns null. `step.item.client_id` is only reached when `shouldRenderDetails` is true, which implies `step.item` is non-null.

- **Risk**: `lucide-react` version constraint. Workers app uses `^1.16.0`. Peer dep set to `>=1.0.0`.
  **Mitigation**: `>=1.0.0` is intentionally loose; the consuming app owns the pinned version. If there is a version range conflict at `npm install`, tighten to `>=1.16.0`.

---

## Validation plan

- `npm run typecheck -w managerbeyo-app-workers`: zero errors
- `npm run build -w managerbeyo-app-workers`: zero errors
- `npm run typecheck -w managerbeyo-app-managers`: zero errors
- `npm run build -w managerbeyo-app-managers`: zero errors
- Manual smoke — managers app: open a task with issues → issues section renders pills with names
- Manual smoke — managers app: add an issue via the sheet → section refreshes to show new issue
- Manual smoke — managers app: open a task with no issues → issues section shows only the Add button
- Manual smoke — workers app: open a step detail for an item with issues → issues section renders pills (no Add button)
- Manual smoke — workers app: open a step detail for an item with no issues → issues section is hidden (null guard)
- Manual smoke: non-existing item `GET /api/v1/items/bad_id/issues` 404 → section hidden (isError → issues=[], onAddIssue=undefined → null)

---

## Review log

- `2026-06-01` `assistant`: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
