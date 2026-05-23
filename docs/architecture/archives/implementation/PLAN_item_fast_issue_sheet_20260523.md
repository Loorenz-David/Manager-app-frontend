# PLAN_item_fast_issue_sheet_20260523

## Metadata

- Plan ID: `PLAN_item_fast_issue_sheet_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T15:35:26Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- **Goal:** Replace the `ItemFastIssueSheetPage` stub with a working sheet that lets the user add and remove issues on the linked item using the existing `ItemIssuesField` primitive inside an RHF form, then commits the diff (adds and removes) to the API on Save.
- **Business/user intent:** The "+" pill in `TaskIssuesSection` already opens the `'item-fast-issue-page'` surface. That surface needs to render the issue picker so the user can toggle issues on/off for the item attached to the task.
- **Non-goals:**
  - No changes to `TaskIssuesSection`, the task detail controller, or the surface registration (already wired).
  - No changes to `ItemIssuesField`, `useCreateItemIssue`, `useDeleteItemIssue`, or any existing hook.
  - No Playwright spec (not in this plan's scope — can be added in a follow-on).

## Scope

- In scope:
  - `features/items/pages/ItemFastIssueSheetPage.tsx` — full replacement of the stub.

- Out of scope: everything else.

- Assumptions:
  - Surface `'item-fast-issue-page'` is already registered as a `sheet` in `itemSurfaces` — confirmed in `features/items/surfaces.ts`.
  - `openIssueSheet()` in `use-task-detail.flow.ts` opens this surface with `{ taskId, itemId }` — confirmed.
  - `useGetTaskQuery(taskId)` returns cached data immediately when called from the sheet (task detail was already loaded when the user tapped "+") — confirmed pattern.
  - `ItemIssuesField` requires a `FormProvider` context, watches `item.item_category_id` to scope the issue options, and controls `item_issues: ItemIssueFieldEntry[]`.
  - `ItemIssueFieldEntry = { issue_id: string, issue_severity_id: string }` where `issue_id` equals `issue_type_id` from the API.
  - `ItemIssue` (from task detail) has `client_id`, `issue_type_id`, `issue_severity_id`, `issue_name_snapshot`, `severity_name_snapshot` — confirmed in `items/types.ts`.
  - `IssueCategoryConfig` has `issue_type_id`, `issue_type_name`, `base_time_seconds` — needed for create snapshot fields.
  - `TEST_ISSUE_SEVERITIES` (temporary hardcoded data) provides `{ client_id, name, time_multiplier }` — used by `ItemIssueSeverityPickerSheetPage` for severity selection.
  - All item-feature exports used here (`ItemIssuesField`, `useCreateItemIssue`, `useDeleteItemIssue`, `useItemIssuesPickerFlow`, `ItemIssueFieldEntry`, `ItemIssuesFieldsSchema`) are already in `features/items/index.ts`.

## Contracts loaded

### Core contracts

- `architecture/08_hooks.md` — mutation (action hook) call pattern; `mutateAsync` usage
- `architecture/28_surfaces.md` + `architecture/28_surfaces_local.md` — sheet surface page shape; `useSurfaceProps`, `useSurfaceHeader`, `useSurface`
- `architecture/09_forms.md` — RHF `FormProvider` + `useForm` usage; no `zodResolver` needed for a simple wrapper sheet
- `architecture/15_feature_structure.md` — feature page layer; imports from feature's own scope and other features' public API

### File read intent

Permitted reads taken during plan authoring:
- `features/items/pages/ItemFastIssueSheetPage.tsx` — confirmed it is a stub ("Coming soon")
- `features/items/components/fields/ItemIssuesField.tsx` — confirmed `useFormContext`, `useController`, `watch('item.item_category_id')`, `field.name = 'item_issues'`
- `features/items/flows/use-item-issues-picker.flow.ts` — confirmed returns `{ options: IssueCategoryConfig[], isLoading, isDisabled }`
- `features/items/actions/use-create-item-issue.ts` — confirmed `mutationFn` input shape: `{ itemId, issue_type_id, issue_severity_id, base_time_seconds?, time_multiplier?, issue_name_snapshot?, severity_name_snapshot? }`
- `features/items/actions/use-delete-item-issue.ts` — confirmed input: `{ itemId, issueId }` (where `issueId` = `item_issue.client_id`)
- `features/items/types.ts` — confirmed `ItemIssueFieldEntry`, `ItemIssue`, `IssueCategoryConfig` shapes
- `features/items/item-test-data.ts` — confirmed `TEST_ISSUE_SEVERITIES: { client_id, name, time_multiplier }[]`
- `features/tasks/flows/use-task-detail.flow.ts` — confirmed `openIssueSheet` opens `'item-fast-issue-page'` with `{ taskId, itemId }`
- `features/items/surfaces.ts` — confirmed surface registration and preload function

---

## Acceptance criteria

1. Tapping "+" in `TaskIssuesSection` opens a sheet titled "Edit issues".
2. The sheet shows the `ItemIssuesField` picker pre-populated with the item's current issues (selected chips match `task.item_issues`).
3. The user can add new issues (chip toggles → severity picker → updates selection).
4. The user can remove existing issues (X button on chip removes it from selection).
5. Tapping "Save" with no changes closes the sheet without making any API call.
6. Tapping "Save" after adding an issue calls `POST /api/v1/items/{item_id}/issues` for each added issue.
7. Tapping "Save" after removing an issue calls `DELETE /api/v1/items/{item_id}/issues/{issue_id}` for each removed issue.
8. After save mutations complete, the sheet closes and the task detail invalidates (showing updated issue chips).
9. If `item_category_id` is null on the item, `ItemIssuesField` shows "Select a category first" (its built-in disabled state).
10. `npm run typecheck` passes with zero errors.

---

## Implementation plan

---

### Step 1 — Replace the stub in `ItemFastIssueSheetPage.tsx`

Full replacement:

```tsx
import { useEffect, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  ItemIssueFieldEntry,
  ItemIssuesField,
  useCreateItemIssue,
  useDeleteItemIssue,
  useItemIssuesPickerFlow,
} from '@/features/items';
import { TEST_ISSUE_SEVERITIES } from '@/features/items/item-test-data';
import { useGetTaskQuery } from '@/features/tasks/api/use-get-task-query';
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';

type ItemFastIssueSurfaceProps = {
  taskId: string;
  itemId: string;
};

type IssueForm = {
  item: { item_category_id: string | undefined };
  item_issues: ItemIssueFieldEntry[];
};

export function ItemFastIssueSheetPage() {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { taskId, itemId } = useSurfaceProps<ItemFastIssueSurfaceProps>();

  const taskQuery = useGetTaskQuery(taskId ?? '');
  const createItemIssue = useCreateItemIssue(taskId ?? '');
  const deleteItemIssue = useDeleteItemIssue(taskId ?? '');

  const item = taskQuery.data?.item;
  // Called here so the configs are cached before handleSave reads from the flow.
  const { options: issueOptions } = useItemIssuesPickerFlow(item?.item_category_id ?? null);

  const form = useForm<IssueForm>({
    defaultValues: {
      item: { item_category_id: undefined },
      item_issues: [],
    },
  });

  // Snapshot of issues at sheet-open time — used by handleSave to compute the diff.
  // Captured once when data first arrives so in-flight mutations don't shift the baseline.
  const initialIssuesRef = useRef(taskQuery.data?.item_issues ?? []);
  const hasResetRef = useRef(false);

  useEffect(() => {
    header?.setTitle('Edit issues');
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (taskQuery.isPending || hasResetRef.current) return;
    hasResetRef.current = true;
    const issues = taskQuery.data?.item_issues ?? [];
    initialIssuesRef.current = issues;
    form.reset({
      item: { item_category_id: taskQuery.data?.item?.item_category_id ?? undefined },
      item_issues: issues.map((issue) => ({
        issue_id: issue.issue_type_id,
        issue_severity_id: issue.issue_severity_id,
      })),
    });
  }, [form, taskQuery.isPending, taskQuery.data]);

  async function handleSave(values: IssueForm) {
    if (!itemId) return;

    const initialIssueTypeIds = new Set(initialIssuesRef.current.map((i) => i.issue_type_id));
    const finalIssueTypeIds = new Set(values.item_issues.map((i) => i.issue_id));

    // Issues removed by the user
    const toRemove = initialIssuesRef.current.filter(
      (i) => !finalIssueTypeIds.has(i.issue_type_id),
    );
    // Issues added by the user
    const toAdd = values.item_issues.filter((i) => !initialIssueTypeIds.has(i.issue_id));

    // Delete removed issues first, then create new ones.
    // Each mutation invalidates the task detail cache on settle.
    for (const issue of toRemove) {
      await deleteItemIssue.mutateAsync({ itemId, issueId: issue.client_id });
    }
    for (const entry of toAdd) {
      const config = issueOptions.find((c) => c.issue_type_id === entry.issue_id);
      const severity = TEST_ISSUE_SEVERITIES.find((s) => s.client_id === entry.issue_severity_id);
      await createItemIssue.mutateAsync({
        itemId,
        issue_type_id: entry.issue_id,
        issue_severity_id: entry.issue_severity_id,
        base_time_seconds: config?.base_time_seconds,
        time_multiplier: severity?.time_multiplier,
        issue_name_snapshot: config?.issue_type_name,
        severity_name_snapshot: severity?.name,
      });
    }

    surface.closeTop();
  }

  if (taskQuery.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  const isPending = createItemIssue.isPending || deleteItemIssue.isPending;

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-4 p-6" data-testid="item-fast-issue-sheet">
        <ItemIssuesField />
        <button
          type="button"
          className="rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background disabled:opacity-50"
          disabled={isPending}
          onClick={() => void form.handleSubmit(handleSave)()}
        >
          Save
        </button>
      </div>
    </FormProvider>
  );
}
```

#### Notes

- `hasResetRef` prevents the form from resetting back to server state after a mutation triggers a cache re-fetch while the sheet is still open.
- `initialIssuesRef` is set once and used in `handleSave` for the diff — it never changes during the session so adds/removes are relative to the state when the sheet opened, not the current cached state.
- `useItemIssuesPickerFlow` is called in the page (not just inside `ItemIssuesField`) so that `issueOptions` is available as a closure variable inside `handleSave`. The flow stores results in `useIssueCategoryConfigSelectionStore`, so the second call (inside `ItemIssuesField`) is free — no duplicate fetch.
- `TEST_ISSUE_SEVERITIES` is the same data source used by `ItemIssueSeverityPickerSheetPage`; this keeps severity snapshot data consistent.
- The `for...of` loops run mutations sequentially. Each mutation's `onSettled` invalidates the task detail cache, so the final result is correct regardless of how many mutations fire.
- `void form.handleSubmit(handleSave)()` discards the returned Promise from `onClick`; the async work runs to completion because `mutateAsync` awaits each call.

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/items/pages/ItemFastIssueSheetPage.tsx` | Full replacement of stub |

---

## Risks and mitigations

- **Risk:** `useGetTaskQuery` may not be exported from `@/features/tasks` public API (`index.ts`). The sheet page at `features/items/pages/` is a feature-layer page, not a top-level page, so the strict `pages/ → features/*/index` rule does not apply — but `useGetTaskQuery` should still be verified in `features/tasks/index.ts` before Codex writes the import.
  **Mitigation:** Check `features/tasks/index.ts`; if `useGetTaskQuery` is not exported, add it or import it directly from `@/features/tasks/api/use-get-task-query` (already used this way in `ItemQuantitySheetPage`).

- **Risk:** `mutateAsync` on a shared `useMutation` hook instance while another call is pending (e.g., rapid sequential calls in a `for…of` loop). React Query v5 supports multiple concurrent `mutateAsync` calls on the same hook — each is tracked independently internally.
  **Mitigation:** None needed; the sequential `for…of await` pattern serializes the calls so at most one is in-flight at a time per hook.

- **Risk:** `form.reset()` triggering after `handleSave` completes if the cache update causes `taskQuery.isPending` to transition. The `hasResetRef` guard prevents this.
  **Mitigation:** Already handled by `hasResetRef.current` check.

- **Risk:** `item_category_id` is `null` on the item. `ItemIssuesField` handles this gracefully by rendering "Select a category first" when `isDisabled` is true. No crash occurs.
  **Mitigation:** None needed — `ItemIssuesField` already handles the disabled state.

- **Risk:** `TEST_ISSUE_SEVERITIES` is hardcoded test data. When a real severities API exists, `severity_name_snapshot` and `time_multiplier` will need to come from that API instead.
  **Mitigation:** The current behavior matches what `ItemIssueSeverityPickerSheetPage` already does, so this is consistent with the existing pattern. Flag for follow-up when severity data is served from the backend.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open a task → tap "+" in Issues Found section → sheet opens titled "Edit issues" → existing issue chips are pre-selected → select a new issue + severity → tap Save → sheet closes → Issues Found section shows the new issue chip → repeat for remove (tap X on chip → Save → chip disappears)
