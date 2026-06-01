# PLAN_task_issues_section_package_20260601

## Metadata

- Plan ID: `PLAN_task_issues_section_package_20260601`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T08:08:25Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal**: Move `TaskIssuesSection` from `apps/managers-app` into `packages/tasks` as a prop-driven, self-contained component that does its own issue category config fetch for name display. Update workers app `TaskStepItemDetailsSection` to a two-section layout (`DashedInfoGroup` → two `DashedInfoSection`s: position/qty/category row + issues row). Migrate managers app to consume the package component.
- **Business/user intent**: Workers need to see item issues from the task step detail view. Packaging the component makes it available to both apps under a consistent interface. The managers app gains a cleaner controller (issue name map no longer pre-computed there).
- **Non-goals**: Wiring `item_issues` data into workers app `TaskStep` schema (deferred follow-up). Building a workers-app issue fast-edit sheet surface (deferred follow-up). Playwright spec (behaviour unchanged, only relocation).

## Scope

- **In scope**:
  - `TaskItemIssue` minimal type + `IssueCategoryConfig*` types → `packages/tasks/src/types.ts`
  - 3 new API files in `packages/tasks/src/api/`
  - New `TaskIssuesSection` component in `packages/tasks/src/components/`
  - `packages/tasks/src/index.ts` — add new exports
  - `packages/tasks/package.json` — add `lucide-react` peer dep
  - Workers app `package.json` — add `@beyo/tasks` dependency
  - Workers app `index.css` — add `@source "../../../../packages/tasks/src"`
  - Workers app `TaskStepItemDetailsSection.tsx` — two-section layout
  - Managers app `TaskDetailSlidePage.tsx` — import from `@beyo/tasks`, pass props
  - Managers app `useTaskDetailController.ts` — remove `issueCategoryConfigsQuery` + `issueNameByTypeId`
  - Delete `apps/managers-app/.../features/tasks/components/detail/TaskIssuesSection.tsx`
  - Update `apps/managers-app/.../features/tasks/components/detail/index.ts` barrel
- **Out of scope**: Workers app issue edit sheet. Adding `item_issues` to `ItemSnapshotSchema`. Wiring `onAddIssue` in workers app.
- **Assumptions**:
  - Workers app `index.css` is missing `@source "../../../../packages/tasks/src"` — confirmed.
  - Workers app `package.json` does not list `@beyo/tasks` — confirmed; `TaskFlowTimeline` import in `TaskDetailSlidePage.tsx` works only through npm hoisting.
  - `issueNameByTypeId` is used only by `TaskIssuesSection` in managers app — confirmed by grep.
  - `DashedInfoSection`, `EyebrowLabel`, `InfoPill`, `DashedInfoGroup` are all exported from `@beyo/ui` — confirmed.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: primary contract — package creation, migration cycle (§9), surface opener injection (§13), peer dep classification (§4)
- `architecture/01_architecture.md`: app directory structure, package catalogue
- `architecture/05_server_state.md`: TanStack Query hook patterns for `useIssueCategoryConfigsQuery`
- `architecture/07_components.md`: feature component conventions for `TaskIssuesSection`
- `architecture/08_hooks.md`: controller cleanup pattern (removing derived state from controller)
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface types (`sheet`) — applies to managers app `onAddIssue` → `openIssueSheet`

### File read intent — pattern vs. relational

Permitted reads (relational — understanding existing state):
- `packages/tasks/src/types.ts` — establish existing types before adding new ones
- `packages/tasks/src/api/list-task-flow-records.ts` — confirm `@beyo/api-client` / `@beyo/lib` import pattern for package API files
- `apps/managers-app/.../features/items/api/fetch-issue-category-configs.ts` — understand the API call shape before porting
- `apps/managers-app/.../features/tasks/components/detail/TaskIssuesSection.tsx` — understand the exact render and null-guard logic before moving
- `apps/managers-app/.../features/tasks/controllers/use-task-detail.controller.ts` — confirm which fields to remove
- `apps/workers-app/.../features/task_steps/components/detail/TaskStepItemDetailsSection.tsx` — confirm existing layout before restructuring

## Domain schemas consulted

- `apps/managers-app/.../features/items/types.ts`: `ItemIssueSchema` / `ItemIssue` — fields used by the section component: `client_id`, `issue_type_id`, `issue_name_snapshot`. Also: `IssueCategoryConfigSchema`, `ListIssueCategoryConfigsParams`.
- `apps/workers-app/.../features/task_steps/types.ts`: `ItemSnapshotSchema` — confirms `item_issues` is absent; component will receive `issues=[]` in workers app until data is wired.

## Selected contracts

- `35_shared_packages.md`: package migration, peer deps, `@source` directives, surface opener injection
- `01_architecture.md`: directory layout, package catalogue
- `05_server_state.md`: `useQuery` hook structure for `useIssueCategoryConfigsQuery`
- `07_components.md`: props-only package component conventions
- `08_hooks.md`: controller return type cleanup

---

## Acceptance criteria

1. `packages/tasks` exports `TaskIssuesSection`, `TaskItemIssue`, `IssueCategoryConfig`, `issueCategoryConfigKeys`, `fetchIssueCategoryConfigs`, `useIssueCategoryConfigsQuery`.
2. Workers app `TaskDetailSlidePage` renders two dashed sections: position/qty/category first, issues second. Issues section returns null when empty (no issues, no `onAddIssue`).
3. Managers app `TaskDetailSlidePage` renders `TaskIssuesSection` from `@beyo/tasks` with `issues`, `itemCategoryId`, and `onAddIssue` passed from the controller.
4. `issueNameByTypeId` and `issueCategoryConfigsQuery` are removed from `useTaskDetailController`. `TaskDetailController` type no longer includes `issueNameByTypeId`.
5. Local `TaskIssuesSection.tsx` is deleted from managers app; its barrel export is removed.
6. Both apps pass `npm run typecheck` and `npm run build` with zero errors.

---

## Implementation plan

### Step 1 — Add types to `packages/tasks/src/types.ts`

Append after the existing `ListTaskFlowRecordsResponseSchema` block:

```ts
// ─── Item issue display ───────────────────────────────────────────────────────

export type TaskItemIssue = {
  client_id: string;
  issue_type_id: string;
  issue_name_snapshot: string | null;
};

// ─── Issue category configs ───────────────────────────────────────────────────

export const IssueCategoryConfigSchema = z.object({
  client_id: z.string(),
  item_category_id: z.string(),
  issue_type_id: z.string(),
  base_time_seconds: z.number().int(),
  issue_type_name: z.string(),
});
export type IssueCategoryConfig = z.infer<typeof IssueCategoryConfigSchema>;

export type ListIssueCategoryConfigsParams = {
  item_category_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};
```

No schema imports change — `z` is already imported at the top of the file.

---

### Step 2 — Create `packages/tasks/src/api/issue-category-config-keys.ts`

```ts
import type { ListIssueCategoryConfigsParams } from "../types";

export const issueCategoryConfigKeys = {
  all: ["issue-category-configs"] as const,
  lists: () => [...issueCategoryConfigKeys.all, "list"] as const,
  list: (params: ListIssueCategoryConfigsParams = {}) =>
    [...issueCategoryConfigKeys.lists(), params] as const,
};
```

---

### Step 3 — Create `packages/tasks/src/api/fetch-issue-category-configs.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { IssueCategoryConfigSchema, type ListIssueCategoryConfigsParams } from "../types";

const ListIssueCategoryConfigsResponseSchema = ApiEnvelopeSchema(
  z.object({
    issue_category_configs: z.array(IssueCategoryConfigSchema),
    issue_category_configs_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);

export async function fetchIssueCategoryConfigs(
  params: ListIssueCategoryConfigsParams = {},
) {
  const response = await apiClient.get(
    "/api/v1/issue-category-configs",
    ListIssueCategoryConfigsResponseSchema,
    {
      item_category_id: params.item_category_id,
      limit: params.limit ?? 200,
      offset: params.offset ?? 0,
      q: params.q,
    },
  );

  return {
    issueConfigs: response.data.issue_category_configs,
  };
}
```

Pattern source: mirrors `packages/tasks/src/api/list-task-flow-records.ts` — uses `@beyo/api-client` and `ApiEnvelopeSchema` from `@beyo/lib`, no `@/` alias imports.

---

### Step 4 — Create `packages/tasks/src/api/use-issue-category-configs-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import type { ListIssueCategoryConfigsParams } from "../types";
import { fetchIssueCategoryConfigs } from "./fetch-issue-category-configs";
import { issueCategoryConfigKeys } from "./issue-category-config-keys";

export function useIssueCategoryConfigsQuery(
  params: ListIssueCategoryConfigsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: issueCategoryConfigKeys.list(params),
    queryFn: () => fetchIssueCategoryConfigs(params),
    enabled: options.enabled ?? true,
  });
}
```

---

### Step 5 — Create `packages/tasks/src/components/TaskIssuesSection.tsx`

```tsx
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";
import { useIssueCategoryConfigsQuery } from "../api/use-issue-category-configs-query";
import type { TaskItemIssue } from "../types";

type TaskIssuesSectionProps = {
  issues: TaskItemIssue[];
  itemCategoryId?: string | null;
  onAddIssue?: () => void;
  "data-testid"?: string;
};

export function TaskIssuesSection({
  issues,
  itemCategoryId,
  onAddIssue,
  "data-testid": testId = "task-detail-issues-section",
}: TaskIssuesSectionProps): React.JSX.Element | null {
  const configsQuery = useIssueCategoryConfigsQuery(
    { item_category_id: itemCategoryId ?? undefined },
    { enabled: Boolean(itemCategoryId) },
  );

  const issueNameByTypeId = useMemo(() => {
    const configs = configsQuery.data?.issueConfigs ?? [];
    return new Map(configs.map((c) => [c.issue_type_id, c.issue_type_name]));
  }, [configsQuery.data]);

  if (!issues.length && !onAddIssue) {
    return null;
  }

  return (
    <DashedInfoSection data-testid={testId}>
      <EyebrowLabel>Issues Found</EyebrowLabel>
      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill key={issue.client_id}>
            {issue.issue_name_snapshot ??
              issueNameByTypeId.get(issue.issue_type_id) ??
              "—"}
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

**Null guard**: returns `null` when both `issues` is empty AND `onAddIssue` is undefined. This keeps the workers app layout clean while issues data is deferred.

**`data-testid`**: defaults to `"task-detail-issues-section"` (matching the existing value in the managers app component) so existing Playwright selectors remain valid without change.

---

### Step 6 — Update `packages/tasks/src/index.ts`

Append after the existing exports:

```ts
export type { TaskItemIssue } from "./types";
export {
  IssueCategoryConfigSchema,
  type IssueCategoryConfig,
  type ListIssueCategoryConfigsParams,
} from "./types";

export { issueCategoryConfigKeys } from "./api/issue-category-config-keys";
export { fetchIssueCategoryConfigs } from "./api/fetch-issue-category-configs";
export { useIssueCategoryConfigsQuery } from "./api/use-issue-category-configs-query";

export { TaskIssuesSection } from "./components/TaskIssuesSection";
```

---

### Step 7 — Update `packages/tasks/package.json`

Add `lucide-react` as a peer dependency (`TaskIssuesSection` uses the `Plus` icon):

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

#### 8b — `apps/workers-app/ManagerBeyo-app-workers/src/index.css`

Add after the last existing `@source` line:
```css
@source "../../../../packages/tasks/src";
```

This registers Tailwind scanning for `TaskIssuesSection` and any future components added to the package. Note: `TaskFlowTimeline` already exists in the package; adding this directive also fixes the pre-existing missing @source for that component.

#### 8c — Update `TaskStepItemDetailsSection.tsx`

Restructure from a single `DashedInfoGroup` with one inner `div` into a `DashedInfoGroup` with two `DashedInfoSection` children.

**Imports to add**:
```ts
import { DashedInfoSection } from "@beyo/ui";
import { TaskIssuesSection } from "@beyo/tasks";
```

**Existing `DashedInfoGroup` wrapping**:
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

  {/* Section 2 — item issues */}
  <TaskIssuesSection
    issues={[]}
    itemCategoryId={step.item.item_category_id ?? null}
  />
</DashedInfoGroup>
```

**Notes**:
- `DashedInfoSection` default `className` is `"px-4 py-4"`. The existing pills div uses `"flex items-start gap-4 overflow-x-auto px-3 py-3"`. Pass this as the `className` prop to override the default.
- `DashedInfoSection` applies `flex flex-col gap-2` base. To preserve the horizontal pill layout, override with `className="flex items-start gap-4 overflow-x-auto px-3 py-3"`.
- `issues={[]}` — `item_issues` is absent from `ItemSnapshotSchema`; this will be populated in a follow-up task. The component returns `null` (no `onAddIssue` provided either), so section 2 is invisible until data arrives.
- The `shouldRenderDetails` guard currently wraps the entire `DashedInfoGroup`. After restructuring, the outer guard remains the same: `if (!shouldRenderDetails) return null`. Section 2 has its own internal null guard.

**Updated `shouldRenderDetails`**: Because section 2 now provides its own null guard, the outer `shouldRenderDetails` only needs to gate section 1 content. The outer component returns null only when section 1 has nothing to show — the exact same guard as today (`hasPosition || shouldRenderQuantity || hasCategory`).

---

### Step 9 — Run `npm install` from `frontend/`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

---

### Step 10 — Validate workers app (Step 4 gate in §9)

```bash
npm run typecheck -w managerbeyo-app-workers
npm run build -w managerbeyo-app-workers
```

Only proceed to Step 11 after both pass with zero errors.

---

### Step 11 — Migrate managers app `TaskDetailSlidePage.tsx`

Replace the context-coupled local component import with the prop-driven package import.

**Remove** from imports:
```ts
import {
  ...
  TaskIssuesSection,
  ...
} from "@/features/tasks/components/detail";
```

**Add** import:
```ts
import { TaskIssuesSection } from "@beyo/tasks";
```

**Replace** in JSX:
```tsx
// Before
<TaskIssuesSection />

// After
<TaskIssuesSection
  issues={controller.taskDetail?.item_issues ?? []}
  itemCategoryId={controller.taskDetail?.item?.item_category_id ?? null}
  onAddIssue={controller.openIssueSheet}
/>
```

The `controller` variable is already declared at the top of `TaskDetailSlidePageContent` via `useTaskDetailContext()`.

---

### Step 12 — Clean up `useTaskDetailController.ts`

**Remove**:
- Import of `useIssueCategoryConfigsQuery` from `@/features/items/api/use-issue-category-configs`
- Import of `useIssueCategoryConfigsQuery` params type if used
- `itemCategoryId` const (only consumed by `issueCategoryConfigsQuery`)
- `issueCategoryConfigsQuery` call
- `issueNameByTypeId` `useMemo`
- `issueNameByTypeId` in the return object
- `issueCategoryConfigsQuery.refetch()` in `refetch()`

**Before** (relevant lines):
```ts
const itemCategoryId = taskQuery.data?.item?.item_category_id ?? undefined;
const flow = useTaskDetailFlow(taskId, itemId);

const issueCategoryConfigsQuery = useIssueCategoryConfigsQuery(
  { item_category_id: itemCategoryId },
  { enabled: !!itemCategoryId },
);

async function refetch(): Promise<void> {
  await Promise.all([taskQuery.refetch(), issueCategoryConfigsQuery.refetch()]);
}

const issueNameByTypeId = useMemo(() => {
  const configs = issueCategoryConfigsQuery.data?.issueConfigs ?? [];
  return new Map(configs.map((c) => [c.issue_type_id, c.issue_type_name]));
}, [issueCategoryConfigsQuery.data]);

return {
  ...
  issueNameByTypeId,
  ...
};
```

**After**:
```ts
const flow = useTaskDetailFlow(taskId, itemId);

async function refetch(): Promise<void> {
  await taskQuery.refetch();
}

return {
  // issueNameByTypeId removed
  ...
};
```

`TaskDetailController` (the inferred return type) automatically loses the `issueNameByTypeId` field.

---

### Step 13 — Delete local `TaskIssuesSection.tsx`

```
DELETE: apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskIssuesSection.tsx
```

---

### Step 14 — Update barrel `detail/index.ts`

Remove the `TaskIssuesSection` re-export line:

```ts
// Remove this line:
export { TaskIssuesSection } from "./TaskIssuesSection";
```

---

### Step 15 — Verify both apps

```bash
npm run typecheck -w managerbeyo-app-managers
npm run build -w managerbeyo-app-managers
npm run typecheck -w managerbeyo-app-workers
npm run build -w managerbeyo-app-workers
```

All four commands must exit with zero errors.

---

## Risks and mitigations

- **Risk**: `DashedInfoSection` default className (`"px-4 py-4"`) conflicts with existing pills div className (`"flex items-start gap-4 overflow-x-auto px-3 py-3"`).
  **Mitigation**: Pass the existing div's classes as the `className` prop to `DashedInfoSection`. The component uses `cn(...)` internally, so the prop overrides the default.

- **Risk**: Workers app `TaskStepItemDetailsSection` outer null guard (`if (!shouldRenderDetails) return null`) hides the issues section forever if `hasPosition || shouldRenderQuantity || hasCategory` is all false.
  **Mitigation**: Acceptable for now. When `item_issues` data is wired and workers app shows issues, `shouldRenderDetails` will be updated to also gate on `issues.length > 0` or an `onAddIssue` prop.

- **Risk**: `issueNameByTypeId` removed from `TaskDetailController` type — any TypeScript consumer outside the already-deleted `TaskIssuesSection` would cause a type error.
  **Mitigation**: Confirmed by grep — `issueNameByTypeId` is only referenced in `TaskIssuesSection.tsx` (now deleted) and `useTaskDetailController.ts` (now cleaned). No other consumers.

- **Risk**: `issueCategoryConfigsQuery.refetch()` was in the managers app `refetch` function. Removing it means that pull-to-refresh no longer re-fetches issue category configs. However, issue category configs are static reference data (not task-specific mutable data), so they do not need to be refreshed on every pull-to-refresh. The package component's internal query uses the same TanStack Query cache and will reuse the cached data. This is the correct behaviour.

- **Risk**: Workers app already imports `@beyo/tasks` via hoisting (for `TaskFlowTimeline`) without declaring the dep. Adding `"@beyo/tasks": "*"` to `package.json` makes this explicit and correct.

---

## Validation plan

- `npm run typecheck -w managerbeyo-app-workers`: zero TypeScript errors
- `npm run build -w managerbeyo-app-workers`: zero build errors
- `npm run typecheck -w managerbeyo-app-managers`: zero TypeScript errors
- `npm run build -w managerbeyo-app-managers`: zero build errors
- Manual smoke — workers app `TaskDetailSlidePage`: two dashed sections render; first section shows position/qty/category pills as before
- Manual smoke — managers app `TaskDetailSlidePage`: issues section renders with issue pills and Add button; tapping Add button opens the issue edit sheet

---

## Review log

- `2026-06-01` `assistant`: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
