# PLAN_item_fast_issue_sheet_package_20260601

## Metadata

- Plan ID: `PLAN_item_fast_issue_sheet_package_20260601`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T09:02:31Z`
- Related issue/ticket: N/A
- Intention plan: N/A

## Goal and intent

- Goal: Move the `ItemFastIssueSheetPage` and all its supporting logic into `packages/tasks` so that both the managers app and the workers app can open the issue-edit sheet from `TaskIssuesSection`. Wire the workers app to register and open the shared sheet.
- Business/user intent: Workers need to be able to add and remove item issues directly from the task detail screen, the same way managers can. The feature exists in the managers app but has never been wired in the workers app.
- Non-goals: Moving task-creation flows, upholstery flows, or any other items feature. Changing the issue data model or API contract.

## Scope

- In scope:
  - Add `IssueCategoryConfig` types, query key factory, fetcher, and query hook to `packages/tasks`.
  - Add `createItemIssue` and `deleteItemIssue` API fetchers to `packages/tasks`.
  - Add `useCreateItemIssue` and `useDeleteItemIssue` hooks to `packages/tasks` (invalidate only `itemIssueKeys.byItem`, no task cache).
  - Add `useIssueCategoryConfigSelectionStore` zustand store to `packages/tasks`.
  - Add `useItemIssuesPickerFlow` to `packages/tasks`.
  - Add `ItemIssuesField` component to `packages/tasks` (imports `BoxPicker`, `FieldLabelRow` from `@beyo/ui`).
  - Add `ItemFastIssueSheetPage` to `packages/tasks` as a self-contained page that receives `itemCategoryId` from surface props (no `useGetTaskQuery` dependency).
  - Add `surface-ids.ts` to `packages/tasks`: `ITEM_FAST_ISSUE_SHEET_SURFACE_ID`, `ItemFastIssueSheetSurfaceProps`, `TaskIssueSurfaceOpeners`.
  - Update `TaskIssuesSection` to accept `surfaceOpeners?: TaskIssueSurfaceOpeners` instead of `onAddIssue?: () => void`.
  - Add `zustand` and `react-hook-form` to `packages/tasks` peer deps.
  - Delete the 12 files in the managers app that are superseded by package equivalents.
  - Update managers app surfaces, index, flow, controller, and detail page to use the package.
  - Wire the workers app: register surface, add `issuesSurfaceOpeners` to controller, pass to `TaskIssuesSection`.
- Out of scope:
  - Issue severity picker (disabled in both apps; keep it disabled).
  - Moving `useGetTaskQuery` to the package.
  - Moving any upholstery, position, or quantity flows.
- Assumptions:
  - `item_issues` is no longer in `TaskDetailRawSchema` (removed in a prior plan), so no task-cache invalidation is needed in `useCreateItemIssue` / `useDeleteItemIssue`.
  - `BoxPicker`, `FieldLabelRow`, `useSurfaceHeader`, `useSurfaceProps` are all available from `@beyo/ui` / `@beyo/hooks`.

## Clarifications required

None — scope is fully determined.

## Acceptance criteria

1. Managers app typechecks without errors (`npm run typecheck`).
2. Workers app typechecks without errors (`npm run typecheck`).
3. `TaskIssuesSection` renders the add-issue "+" button in both apps when `surfaceOpeners.openFastIssueSheet` is defined.
4. Tapping "+" opens the `ItemFastIssueSheetPage` sheet in both the managers app and the workers app.
5. Saving issues in the sheet invalidates `itemIssueKeys.byItem(itemId)` and the `TaskIssuesSection` re-renders with the updated list.
6. When `surfaceOpeners` is `undefined` or `openFastIssueSheet` is absent, `TaskIssuesSection` renders read-only (no button) — backwards-compatible for any future consumer that does not wire up the opener.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: monorepo workspace setup, peer deps, Tailwind source directive, surfaceOpeners injection pattern (§13).
- `architecture/05_server_state.md`: query key factories, TanStack Query hook setup.
- `architecture/08_hooks.md`: mutation hook cache invalidation rules.

### Local extensions loaded

None.

### File read intent — pattern vs. relational

Permitted relational reads only:
- Existing files for exact field names, return shapes, import paths.
- `packages/tasks/src/index.ts` to verify current exports before appending.
- `packages/tasks/package.json` before editing peer deps.
- App `index.ts` files to understand what needs re-exporting.

### Skill selection

- Primary skill: standard package-migration + surfaceOpeners wiring.

## Implementation plan

### Step 1 — Update `packages/tasks/src/types.ts`

Append the following schemas and types (do not modify existing entries):

```ts
// Issue category config
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

// Item issue form field entry
export const ItemIssueFieldEntrySchema = z.object({
  issue_id: z.string().min(1),
  issue_severity_id: z.string().optional().or(z.literal("")),
});
export type ItemIssueFieldEntry = z.infer<typeof ItemIssueFieldEntrySchema>;
```

### Step 2 — Create `packages/tasks/src/surface-ids.ts`

```ts
export const ITEM_FAST_ISSUE_SHEET_SURFACE_ID = "item-fast-issue-sheet";

export type ItemFastIssueSheetSurfaceProps = {
  taskId: string;
  itemId: string;
  itemCategoryId: string | null;
};

export type TaskIssueSurfaceOpeners = {
  openFastIssueSheet?: () => void;
};
```

### Step 3 — Create `packages/tasks/src/api/issue-category-config-keys.ts`

```ts
import type { ListIssueCategoryConfigsParams } from "../types";

export const issueCategoryConfigKeys = {
  all: ["issue-category-configs"] as const,
  lists: () => [...issueCategoryConfigKeys.all, "list"] as const,
  list: (params: ListIssueCategoryConfigsParams = {}) =>
    [...issueCategoryConfigKeys.lists(), params] as const,
};
```

### Step 4 — Create `packages/tasks/src/api/fetch-issue-category-configs.ts`

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
  return { issueConfigs: response.data.issue_category_configs };
}
```

### Step 5 — Create `packages/tasks/src/api/use-issue-category-configs-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchIssueCategoryConfigs } from "./fetch-issue-category-configs";
import { issueCategoryConfigKeys } from "./issue-category-config-keys";
import type { ListIssueCategoryConfigsParams } from "../types";

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

### Step 6 — Create `packages/tasks/src/api/create-item-issue.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const CreateItemIssueInputSchema = z.object({
  itemId: z.string(),
  issue_type_id: z.string(),
  issue_severity_id: z.string().optional(),
  base_time_seconds: z.number().int().optional(),
  time_multiplier: z.number().optional(),
  issue_name_snapshot: z.string().optional(),
  severity_name_snapshot: z.string().optional(),
});
export type CreateItemIssueInput = z.infer<typeof CreateItemIssueInputSchema>;

const CreateItemIssueResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export async function createItemIssue(input: CreateItemIssueInput) {
  const { itemId, ...body } = CreateItemIssueInputSchema.parse(input);
  return apiClient.post(
    `/api/v1/items/${itemId}/issues`,
    CreateItemIssueResponseSchema,
    body,
  );
}
```

### Step 7 — Create `packages/tasks/src/api/delete-item-issue.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteItemIssueInputSchema = z.object({
  itemId: z.string(),
  issueId: z.string(),
});
export type DeleteItemIssueInput = z.infer<typeof DeleteItemIssueInputSchema>;

const DeleteItemIssueResponseSchema = ApiEnvelopeSchema(z.object({})).extend({
  ok: z.literal(true),
});

export async function deleteItemIssue(input: DeleteItemIssueInput) {
  const { itemId, issueId } = DeleteItemIssueInputSchema.parse(input);
  return apiClient.delete(
    `/api/v1/items/${itemId}/issues/${issueId}`,
    DeleteItemIssueResponseSchema,
  );
}
```

### Step 8 — Create `packages/tasks/src/api/use-create-item-issue.ts`

No `taskId` param. Invalidates only `itemIssueKeys.byItem` — `item_issues` is no longer in the task detail response.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createItemIssue } from "./create-item-issue";
import { itemIssueKeys } from "./item-issues-keys";

export function useCreateItemIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItemIssue,
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(variables.itemId),
      });
    },
  });
}
```

### Step 9 — Create `packages/tasks/src/api/use-delete-item-issue.ts`

Same pattern as create — no `taskId` param.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteItemIssue } from "./delete-item-issue";
import { itemIssueKeys } from "./item-issues-keys";

export function useDeleteItemIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteItemIssue,
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(variables.itemId),
      });
    },
  });
}
```

### Step 10 — Create `packages/tasks/src/store/issue-category-config-selection.store.ts`

```ts
import { create } from "zustand";
import type { IssueCategoryConfig } from "../types";

type IssueCategoryConfigSelectionState = {
  configsByCategory: Record<string, IssueCategoryConfig[]>;
  setConfigsForCategory: (categoryId: string, configs: IssueCategoryConfig[]) => void;
  clear: () => void;
};

export const useIssueCategoryConfigSelectionStore =
  create<IssueCategoryConfigSelectionState>()((set) => ({
    configsByCategory: {},
    setConfigsForCategory: (categoryId, configs) =>
      set((state) => ({
        configsByCategory: { ...state.configsByCategory, [categoryId]: configs },
      })),
    clear: () => set({ configsByCategory: {} }),
  }));
```

### Step 11 — Create `packages/tasks/src/flows/use-item-issues-picker.flow.ts`

```ts
import { useEffect } from "react";
import { useIssueCategoryConfigsQuery } from "../api/use-issue-category-configs-query";
import { useIssueCategoryConfigSelectionStore } from "../store/issue-category-config-selection.store";
import type { IssueCategoryConfig } from "../types";

export function useItemIssuesPickerFlow(itemCategoryId: string | null) {
  const configsByCategory = useIssueCategoryConfigSelectionStore(
    (state) => state.configsByCategory,
  );
  const setConfigsForCategory = useIssueCategoryConfigSelectionStore(
    (state) => state.setConfigsForCategory,
  );

  const alreadyCached = itemCategoryId
    ? (configsByCategory[itemCategoryId] ?? null)
    : null;

  const { data, isPending } = useIssueCategoryConfigsQuery(
    { item_category_id: itemCategoryId ?? undefined },
    { enabled: itemCategoryId !== null && alreadyCached === null },
  );

  useEffect(() => {
    if (data?.issueConfigs && itemCategoryId && alreadyCached === null) {
      setConfigsForCategory(itemCategoryId, data.issueConfigs);
    }
  }, [alreadyCached, data, itemCategoryId, setConfigsForCategory]);

  if (itemCategoryId === null) {
    return { options: [] as IssueCategoryConfig[], isLoading: false, isDisabled: true };
  }

  const options = alreadyCached !== null ? alreadyCached : (data?.issueConfigs ?? []);
  return { options, isLoading: isPending && alreadyCached === null, isDisabled: false };
}
```

### Step 12 — Create `packages/tasks/src/components/fields/ItemIssuesField.tsx`

Import `BoxPicker`, `FieldLabelRow` from `@beyo/ui` (not `@/components/primitives`). Keep severity selection disabled (same as current). Remove `@/` alias imports entirely.

```tsx
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useController, useFormContext } from "react-hook-form";
import { BoxPicker, FieldLabelRow } from "@beyo/ui";
import type { BoxPickerOptionType } from "@beyo/ui";
import { useItemIssuesPickerFlow } from "../../flows/use-item-issues-picker.flow";
import type { ItemIssueFieldEntry } from "../../types";

export function ItemIssuesField() {
  const { control, watch } = useFormContext();
  const itemCategoryId = watch("item.item_category_id") as string | undefined;
  const flow = useItemIssuesPickerFlow(itemCategoryId ?? null);
  const { field, fieldState } = useController({
    name: "item_issues",
    control,
    defaultValue: [],
  });

  const currentPairs: ItemIssueFieldEntry[] = field.value ?? [];
  const selectedIssueIds = currentPairs.map((p) => p.issue_id);
  const previousCategoryRef = useRef<string | undefined>(itemCategoryId);
  const allSelected =
    flow.options.length > 0 &&
    flow.options.every((issue) => selectedIssueIds.includes(issue.issue_type_id));

  useEffect(() => {
    if (previousCategoryRef.current === itemCategoryId) return;
    const prev = previousCategoryRef.current;
    previousCategoryRef.current = itemCategoryId;
    if (prev !== undefined) {
      field.onChange([]);
    }
  }, [field, itemCategoryId]);

  const options: BoxPickerOptionType[] = flow.options.map((issue) => ({
    value: issue.issue_type_id,
    label: issue.issue_type_name,
    testId: `item-issue-${issue.issue_type_id}-option`,
  }));

  function removeIssue(issueId: string) {
    field.onChange(currentPairs.filter((p) => p.issue_id !== issueId));
  }

  function selectAllIssues() {
    if (allSelected) { field.onChange([]); return; }
    field.onChange(
      flow.options.map((issue) => ({ issue_id: issue.issue_type_id, issue_severity_id: "" })),
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="item-issues-field">
      <FieldLabelRow label="Issues Found">
        <button
          type="button"
          className="text-sm font-light text-[var(--color-muted))]"
          data-testid="item-issues-select-all-button"
          disabled={flow.isDisabled || flow.isLoading || flow.options.length === 0}
          onClick={selectAllIssues}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </FieldLabelRow>
      {flow.isDisabled ? (
        <p className="text-sm text-muted-foreground" data-testid="item-issues-disabled-state">
          Select a category first
        </p>
      ) : flow.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading issues…</p>
      ) : (
        <BoxPicker
          mode="multiple"
          value={selectedIssueIds}
          options={options}
          onValueChange={(ids) => {
            const added = ids.find((id) => !selectedIssueIds.includes(id));
            const removed = selectedIssueIds.find((id) => !ids.includes(id));
            if (added) field.onChange([...currentPairs, { issue_id: added, issue_severity_id: "" }]);
            if (removed) removeIssue(removed);
          }}
          layout="grid"
          columns={2}
          visualVariant="pill"
          showIcon={false}
          data-testid="item-issues-picker"
          renderSelectedAction={(option) => (
            <button
              type="button"
              aria-label={`Remove ${option.label} issue`}
              data-testid={`item-issue-${option.value}-remove-button`}
              className="ml-1 flex size-6 shrink-0 items-center justify-center rounded-full p-1 text-xs opacity-70 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); removeIssue(option.value); }}
            >
              <X className="size-3" />
            </button>
          )}
        />
      )}
      {fieldState.error?.message ? (
        <p className="text-xs text-destructive" data-testid="item-issues-error" role="alert">
          {fieldState.error.message}
        </p>
      ) : null}
    </div>
  );
}
```

### Step 13 — Create `packages/tasks/src/pages/ItemFastIssueSheetPage.tsx`

Receives `itemCategoryId` from surface props — no `useGetTaskQuery` dependency. The `item.item_category_id` is passed by the app when opening the sheet.

```tsx
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useItemIssuesQuery } from "../api/use-item-issues-query";
import { useCreateItemIssue } from "../api/use-create-item-issue";
import { useDeleteItemIssue } from "../api/use-delete-item-issue";
import { ItemIssuesField } from "./fields/ItemIssuesField";
import type { ItemIssue, ItemIssueFieldEntry } from "../types";
import type { ItemFastIssueSheetSurfaceProps } from "../surface-ids";

type IssueFormValues = {
  item: { item_category_id: string | undefined };
  item_issues: ItemIssueFieldEntry[];
};

export function ItemFastIssueSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId: _taskId, itemId, itemCategoryId } =
    useSurfaceProps<ItemFastIssueSheetSurfaceProps>();

  const itemIssuesQuery = useItemIssuesQuery(itemId);
  const createItemIssue = useCreateItemIssue();
  const deleteItemIssue = useDeleteItemIssue();

  const form = useForm<IssueFormValues>({
    defaultValues: {
      item: { item_category_id: undefined },
      item_issues: [],
    },
  });

  const initialIssuesRef = useRef<ItemIssue[]>([]);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    header?.setTitle("Edit issues");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (!itemIssuesQuery.data || hasInitializedRef.current) return;
    const issues = itemIssuesQuery.data.issues;
    initialIssuesRef.current = issues;
    form.reset({
      item: { item_category_id: itemCategoryId ?? undefined },
      item_issues: issues.map((issue) => ({
        issue_id: issue.issue_type_id,
        issue_severity_id: issue.issue_severity_id ?? "",
      })),
    });
    hasInitializedRef.current = true;
  }, [form, itemIssuesQuery.data, itemCategoryId]);

  async function handleSave(values: IssueFormValues) {
    if (!itemId) return;

    const initialIssueTypeIds = new Set(
      initialIssuesRef.current.map((issue) => issue.issue_type_id),
    );
    const nextIssueTypeIds = new Set(values.item_issues.map((issue) => issue.issue_id));
    const issuesToRemove = initialIssuesRef.current.filter(
      (issue) => !nextIssueTypeIds.has(issue.issue_type_id),
    );
    const issuesToAdd = values.item_issues.filter(
      (issue) => !initialIssueTypeIds.has(issue.issue_id),
    );

    if (issuesToRemove.length === 0 && issuesToAdd.length === 0) {
      header?.requestClose();
      return;
    }

    for (const issue of issuesToRemove) {
      await deleteItemIssue.mutateAsync({ itemId, issueId: issue.client_id });
    }

    for (const issue of issuesToAdd) {
      await createItemIssue.mutateAsync({
        itemId,
        issue_type_id: issue.issue_id,
      });
    }

    header?.requestClose();
  }

  if (itemIssuesQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading issues…</div>;
  }

  if (itemIssuesQuery.isError || !itemId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Item issues could not be loaded.
      </div>
    );
  }

  const isPending = createItemIssue.isPending || deleteItemIssue.isPending;

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6" data-testid="item-fast-issue-sheet">
        <ItemIssuesField />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={isPending || !itemId}
          onClick={() => { void form.handleSubmit(handleSave)(); }}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
```

Note: `_taskId` is prefixed with underscore since it is received in props but not used by the page itself (it was used previously only for task-cache invalidation, which was removed). Remove the prefix if TypeScript `noUnusedParameters` flags it — in that case, destructure without capturing it: `const { itemId, itemCategoryId } = useSurfaceProps<...>()`.

### Step 14 — Update `packages/tasks/src/components/TaskIssuesSection.tsx`

Replace `onAddIssue?: () => void` with `surfaceOpeners?: TaskIssueSurfaceOpeners`. The component calls `surfaceOpeners?.openFastIssueSheet?.()` instead of `onAddIssue?.()`. The visibility guard changes from `!onAddIssue` to `!surfaceOpeners?.openFastIssueSheet`.

Before:
```ts
type TaskIssuesSectionProps = {
  itemId: string | null | undefined;
  onAddIssue?: () => void;
  "data-testid"?: string;
};
```

After:
```ts
import type { TaskIssueSurfaceOpeners } from "../surface-ids";

type TaskIssuesSectionProps = {
  itemId: string | null | undefined;
  surfaceOpeners?: TaskIssueSurfaceOpeners;
  "data-testid"?: string;
};
```

Change guard on line 24:
```ts
if (!issues.length && !surfaceOpeners?.openFastIssueSheet) {
  return null;
}
```

Change button at line 37–46:
```tsx
{surfaceOpeners?.openFastIssueSheet ? (
  <button
    aria-label="Add issue"
    type="button"
    className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
    onClick={surfaceOpeners.openFastIssueSheet}
  >
    <Plus aria-hidden="true" className="size-3.5" />
  </button>
) : null}
```

### Step 15 — Update `packages/tasks/package.json`

Add `zustand` and `react-hook-form` to peer deps:

```json
"peerDependencies": {
  "@beyo/api-client": "*",
  "@beyo/lib": "*",
  "@beyo/ui": "*",
  "@tanstack/react-query": ">=5.0.0",
  "lucide-react": ">=1.0.0",
  "react": ">=19.0.0",
  "react-hook-form": ">=7.0.0",
  "zod": ">=4.0.0",
  "zustand": ">=5.0.0"
}
```

### Step 16 — Update `packages/tasks/src/index.ts`

Append all new public exports. Do not remove any existing exports.

New exports to add:

```ts
// Surface IDs and openers
export { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from "./surface-ids";
export type { ItemFastIssueSheetSurfaceProps, TaskIssueSurfaceOpeners } from "./surface-ids";

// Issue category config
export { IssueCategoryConfigSchema, ItemIssueFieldEntrySchema, ListIssueCategoryConfigsParams } from "./types";
export type { IssueCategoryConfig, ItemIssueFieldEntry } from "./types";

export { issueCategoryConfigKeys } from "./api/issue-category-config-keys";
export { fetchIssueCategoryConfigs } from "./api/fetch-issue-category-configs";
export { useIssueCategoryConfigsQuery } from "./api/use-issue-category-configs-query";

// Issue mutations
export { createItemIssue } from "./api/create-item-issue";
export { deleteItemIssue } from "./api/delete-item-issue";
export type { CreateItemIssueInput, DeleteItemIssueInput } from "./api/create-item-issue";
export { useCreateItemIssue } from "./api/use-create-item-issue";
export { useDeleteItemIssue } from "./api/use-delete-item-issue";

// Store and flow
export { useIssueCategoryConfigSelectionStore } from "./store/issue-category-config-selection.store";
export { useItemIssuesPickerFlow } from "./flows/use-item-issues-picker.flow";

// Components
export { ItemIssuesField } from "./components/fields/ItemIssuesField";
export { ItemFastIssueSheetPage } from "./pages/ItemFastIssueSheetPage";
```

Note on `ListIssueCategoryConfigsParams`: it is a plain `type`, not a schema. Export it with `export type`.

Note on `DeleteItemIssueInput`: it is defined in `delete-item-issue.ts`, not `create-item-issue.ts`. Adjust the export source accordingly.

---

### Step 17 — Delete 12 files from the managers app

The following files are fully superseded by their package equivalents. Delete them:

```
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/create-item-issue.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/delete-item-issue.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/fetch-issue-category-configs.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/issue-category-config-keys.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/use-issue-category-configs.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-create-item-issue.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-delete-item-issue.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/store/issue-category-config-selection.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/flows/use-item-issues-picker.flow.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemFastIssueActionField.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemIssuesField.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/ItemFastIssueSheetPage.tsx
```

### Step 18 — Update `apps/managers-app/.../features/items/surfaces.ts`

Import `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` and `ItemFastIssueSheetPage` from `@beyo/tasks`. Remove the local `loadItemFastIssueSheetPage` loader and `itemFastIssuePage` lazy. Update the registration key:

```ts
// Before
"item-fast-issue-page": {
  surface: "sheet",
  component: itemFastIssuePage.Component,
},

// After — key comes from package constant
[ITEM_FAST_ISSUE_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: lazyWithPreload(() =>
    import("@beyo/tasks").then((m) => ({ default: m.ItemFastIssueSheetPage }))
  ).Component,
},
```

Also remove `preloadItemFastIssueSurface` export from this file since it is no longer needed (the sheet is preloaded by callers that now use the standard `openSurface` pattern).

### Step 19 — Update `apps/managers-app/.../features/items/index.ts`

- Remove exports for deleted files:
  - `ItemFastIssueActionField`
  - `ItemIssuesField`
  - `useCreateItemIssue`
  - `useDeleteItemIssue`
  - `useItemIssuesPickerFlow`
  - `useIssueCategoryConfigSelectionStore`
  - `IssueCategoryConfigSchema`
  - `ItemIssueFieldEntry` / `ItemIssuesFieldSchema` / `ItemIssuesFieldsSchema`
  - `ListIssueCategoryConfigsParams`
  - `itemSurfaces`, `preloadItemFastIssueSurface`

- Keep or update remaining exports that are still app-local.
- Re-export from `@beyo/tasks` whatever the rest of the app still needs that has moved to the package (check what callers outside `features/items/` import from here).

### Step 20 — Update `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts`

Add `itemCategoryId: string | null` as the third parameter. Replace `openIssueSheet` with `issuesSurfaceOpeners: TaskIssueSurfaceOpeners`. Import `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` and `TaskIssueSurfaceOpeners` from `@beyo/tasks`.

```ts
import {
  ITEM_FAST_ISSUE_SHEET_SURFACE_ID,
  type TaskIssueSurfaceOpeners,
} from "@beyo/tasks";

export function useTaskDetailFlow(
  taskId: string,
  itemId: string | null,
  itemCategoryId: string | null,
) {
  const surface = useSurface();

  const issuesSurfaceOpeners: TaskIssueSurfaceOpeners = itemId
    ? {
        openFastIssueSheet: () =>
          surface.open(ITEM_FAST_ISSUE_SHEET_SURFACE_ID, {
            taskId,
            itemId,
            itemCategoryId,
          }),
      }
    : {};

  return {
    // ... all existing openers unchanged ...
    issuesSurfaceOpeners,
  };
}
```

Remove the old `openIssueSheet` key entirely.

### Step 21 — Update `apps/managers-app/.../features/tasks/controllers/use-task-detail.controller.ts`

- Derive `itemCategoryId` from `taskQuery.data?.item?.item_category_id ?? null`.
- Pass it as the third argument to `useTaskDetailFlow(taskId, itemId, itemCategoryId)`.
- Remove local calls to `useDeleteItemIssue(taskId)` and `useCreateItemIssue(...)` if they appear in the controller and are no longer needed (the sheet now calls its own hooks directly).

### Step 22 — Update `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx`

Replace `onAddIssue={controller.openIssueSheet}` with `surfaceOpeners={controller.issuesSurfaceOpeners}`.

```tsx
// Before
<TaskIssuesSection
  itemId={controller.taskDetail.item?.client_id}
  onAddIssue={controller.openIssueSheet}
/>

// After
<TaskIssuesSection
  itemId={controller.taskDetail.item?.client_id}
  surfaceOpeners={controller.issuesSurfaceOpeners}
/>
```

---

### Step 23 — Workers app: update `features/task_steps/surfaces.ts`

Register the new surface. Import `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` from `@beyo/tasks`:

```ts
import { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from "@beyo/tasks";

function loadItemFastIssueSheetPage() {
  return import("@beyo/tasks").then((m) => ({
    default: m.ItemFastIssueSheetPage,
  }));
}

const itemFastIssueSheet = lazyWithPreload(loadItemFastIssueSheetPage);

export const preloadItemFastIssueSheetSurface = itemFastIssueSheet.preload;

export const taskStepSurfaces: SurfaceRegistrations = {
  // ... existing entries unchanged ...
  [ITEM_FAST_ISSUE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemFastIssueSheet.Component,
  },
};
```

### Step 24 — Workers app: update `use-task-step-detail.controller.ts`

Import `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` and `TaskIssueSurfaceOpeners` from `@beyo/tasks`. Add `issuesSurfaceOpeners` to the return value.

```ts
import {
  ITEM_FAST_ISSUE_SHEET_SURFACE_ID,
  type TaskIssueSurfaceOpeners,
} from "@beyo/tasks";

// Inside the controller function, after step and openSurface are available:
const issuesSurfaceOpeners = useMemo<TaskIssueSurfaceOpeners>(() => {
  const itemId = step?.item?.client_id;
  const itemCategoryId = step?.item?.item_category_id ?? null;
  if (!itemId) return {};
  return {
    openFastIssueSheet: () =>
      openSurface(ITEM_FAST_ISSUE_SHEET_SURFACE_ID, {
        taskId: resolvedTaskId,
        itemId,
        itemCategoryId,
      }),
  };
}, [step, resolvedTaskId, openSurface]);

// Add to the return object:
return {
  // ... existing fields ...
  issuesSurfaceOpeners,
};
```

Add `issuesSurfaceOpeners: TaskIssueSurfaceOpeners` to the `TaskStepDetailController` type definition.

### Step 25 — Workers app: update `TaskStepItemDetailsSection.tsx`

Destructure `issuesSurfaceOpeners` from `useTaskStepDetailContext()`. Pass it to both `TaskIssuesSection` usages.

```tsx
const {
  step,
  itemCategory,
  isItemCategoryPending,
  isItemCategoryError,
  isSeatCategory,
  issuesSurfaceOpeners,
} = useTaskStepDetailContext();

// Both TaskIssuesSection calls:
<TaskIssuesSection
  itemId={step.item.client_id}
  surfaceOpeners={issuesSurfaceOpeners}
  data-testid="task-step-item-issues-section"
/>
```

### Step 26 — Typecheck both apps

```bash
cd apps/managers-app/ManagerBeyo-app-managers && npm run typecheck
cd apps/workers-app/ManagerBeyo-app-workers && npm run typecheck
```

Zero errors expected. Fix any errors before marking complete.

## Risks and mitigations

- Risk: `BoxPickerOptionType` import name in `ItemIssuesField` — confirm the type is exported from `@beyo/ui` under this exact name before writing the import.
  Mitigation: Read `packages/ui/src/index.ts` to verify the export.

- Risk: `_taskId` causes `noUnusedParameters` TypeScript error in `ItemFastIssueSheetPage`.
  Mitigation: Destructure without capturing: `const { itemId, itemCategoryId } = useSurfaceProps<ItemFastIssueSheetSurfaceProps>()`. The `taskId` field is retained in the props type for future use (e.g. if the sheet later needs to invalidate a task badge).

- Risk: Managers app `items/index.ts` re-exports types that downstream files rely on (e.g. `IssueCategoryConfig`, `ItemIssueFieldEntry`). Removing the local source without adding a re-export from `@beyo/tasks` would break callers.
  Mitigation: For every type/value removed from managers app, confirm there are no outstanding imports before deleting. If any file outside `features/items/` imports the type, add a re-export `export type { X } from "@beyo/tasks"` in `items/index.ts`.

- Risk: `zustand` version mismatch — the workers app may have a different version than the managers app.
  Mitigation: Use `">=5.0.0"` as the peer requirement. The store is simple (no middleware), so any Zustand v5 version is compatible.

- Risk: `useTaskDetailFlow` signature change (new `itemCategoryId` param) breaks the existing controller call site.
  Mitigation: Step 21 updates the controller call in the same diff. Codex must apply Steps 20 and 21 together.

## Validation plan

- `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors.
- `npm run typecheck` in `apps/workers-app/ManagerBeyo-app-workers`: zero TypeScript errors.
- Manual smoke test — managers app: task detail page shows "+" button on issues section; tapping opens the sheet with correct category pre-loaded.
- Manual smoke test — workers app: same as above.
- `npx playwright test --grep upholstery --project=mobile`: no regressions (unrelated change but verifies no surface registration conflict).

## Review log

(empty — awaiting approval)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
