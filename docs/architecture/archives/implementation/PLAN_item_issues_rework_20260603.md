# PLAN_item_issues_rework_20260603

## Metadata

- Plan ID: `PLAN_item_issues_rework_20260603`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-03T00:00:00Z`
- Last updated at (UTC): `2026-06-03T10:16:55Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_issue_system_rework_contract_20260603`
- Handoff doc: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_issue_system_rework_contract_20260603.md`

---

## Goal and intent

- **Goal:** Replace the old issue-category-config / severity based item issue system with the new backend `issue-types` + batch create/delete system. Build a self-sufficient `@beyo/item-issues` package that exposes a preview component (pill list + add button) and a selection sheet (tab pill nav, box grid, intensity cycling). Integrate the selection sheet into the workers app task step detail view and into the `pending → working` state transition guard.
- **Business/user intent:** Workers must be able to record which issues (scratches, tears, etc.) and their severity (intensity 1–3) an item has before they start working on it. Managers can configure which issues apply per working section and item category. The UI should be instant and optimistic.
- **Non-goals:**
  - Issue type create/update/delete endpoints (manager-side configuration).
  - Managers app integration of the new issue UI (deferred — managers app old issue pages are removed for build safety but the new UI is not added).
  - Real-time event binding (noted as a follow-up — invalidation hook location TBD; the cache structure is set up correctly for it).

---

## Scope

- **In scope:**
  - New `packages/item-issues/` package with types, API layer, actions, surface IDs, and two components.
  - Workers app: replace `TaskIssuesSection` with `ItemIssuePreviewSection` in `TaskStepItemDetailsSection`.
  - Workers app: add issue selection sheet to `pending → working` guard in both `use-task-step-detail.controller` and `use-working-section-steps.controller`.
  - Workers app: thread `onConfirm` through `StepDependencyWarningSheetPage` so "Start anyway" still hits the issue check.
  - Workers app: prefetch issue types at home page load via `useWorkingSectionsHomeController`.
  - `@beyo/tasks` package: remove all old issue-related files (old types, API, components, store, flows, surface ID, sheet page).
  - Managers app: remove references to old `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` surface so the build stays clean.
- **Out of scope:**
  - Managers app new issue UI.
  - Real-time socket binding for issue type cache invalidation.
  - Edit-in-place of existing issues (intensity change is handled as delete + create).
- **Assumptions:**
  - `@beyo/item-categories` is already a working package — `itemCategoryId` values come from it.
  - The workers app surface type `"sheet"` is what the issue selection should use.
  - Workers typically belong to one or a small number of working sections, making per-section prefetch queries cheap.
  - `workingSectionId` is always available in step context (it is — it comes from `TaskStepDetailSurfaceProps` and from the `sectionId` prop in the list controller).

---

## Clarifications required

All clarifications resolved on 2026-06-03:

- [x] **`itemCategoryId` is null** → **skip the sheet entirely.** `hasIssueTypesForContext` returns `false` when `itemCategoryId` is null. `buildProceedToStart` does not open the sheet. The sheet itself also early-returns if `itemCategoryId` is null. `groupIssueTypesByPlacement` is never called with a null categoryId.
- [x] **Intensity fill direction** → **left to right.** The fill div uses `width: {fillPercent}%` anchored to the left (`left: 0; top: 0; bottom: 0`). The dual-text clip-path uses `inset(0 ${100 - fillPercent}% 0 0)` (clipping from the right).
- [x] **Upholstery warning** → **no change needed.** Upholstery warning is a hard blocker — closing abandons the start entirely, there is no "Start anyway". The `onConfirm` pattern applies only to the dependency warning sheet.
- [x] **`workerId` source** → **`useAuth().user?.id` from `@beyo/auth`.** `AuthUser.id` is typed as `UserId`. Controllers call `const { user } = useAuth()` and pass `user?.id ?? null` as `workerId` to `buildProceedToStart` and into `issuesSurfaceOpeners`.
- [x] **`preloadItemIssueSelectionSheetSurface`** → **yes, add to home controller prefetch** alongside `preloadTaskDetailSlideSurface`.

---

## Acceptance criteria

1. `npm run typecheck` passes with zero errors across workers app, managers app, and all packages.
2. `ItemIssuePreviewSection` renders current item issues (name + intensity) as pills on the workers task detail page, filtered by `workingSectionId`.
3. Tapping "+" on `ItemIssuePreviewSection` opens the `ItemIssueSelectionSheet` as a bottom sheet.
4. Inside the sheet, pill nav tabs group issues by `placement_of_issue`; tapping a tab slides the body based on index direction.
5. Tapping an issue box cycles intensity 0→1→2→3→0 with visual fill increasing per step.
6. Tapping "Save" batch-deletes removed issues and batch-creates new/changed issues, then closes the sheet with the preview updated immediately (optimistic).
7. Tapping "Cancel" closes the sheet with no changes.
8. When a worker starts a `pending → working` transition on a step whose item has issue types configured for that working section + item category, the issue selection sheet opens before the transition fires.
9. After saving issues in the pre-start sheet, the state transition fires and the step moves to `working`.
10. Tapping "Start anyway" in the dependency warning sheet still triggers the issue check (does not bypass it).
11. If the working section has no issue types configured (for the item's category), the pre-start issue sheet is skipped and the transition fires directly.
12. Issue types for all worker working sections are prefetched at home page load; the pre-start check is synchronous (no loading spinner).

---

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, app boundaries
- `architecture/01_architecture_local.md`: route-entry pattern
- `architecture/02_types.md`: Zod schema conventions
- `architecture/04_api_client.md`: `apiClient` usage
- `architecture/04_api_client_local.md`: flat error shape, token refresh envelope
- `architecture/05_server_state.md`: TanStack Query setup, staleTime, enabled guards
- `architecture/06_client_state.md`: Zustand patterns (for draft state if needed)
- `architecture/08_hooks.md`: action hook shape (useMutation, onMutate/onError/onSettled, optimistic updates)
- `architecture/13_errors.md`: error handling
- `architecture/15_feature_structure.md`: file layout within a feature
- `architecture/16_feature_workflow.md`: build order (types → keys → api → actions → controllers → components)
- `architecture/07_components.md`: component conventions, context-only reads
- `architecture/14_styling.md`: Tailwind class conventions, CSS variable tokens
- `architecture/23_providers.md`: provider shell
- `architecture/24_dto.md`: view model / DTO patterns
- `architecture/28_surfaces.md`: surface system
- `architecture/28_surfaces_local.md`: slide / sheet / modal active types
- `architecture/30_dynamic_loading.md`: lazyWithPreload
- `architecture/30_dynamic_loading_local.md`: lazyWithPreload utility path
- `architecture/31_animations.md`: Framer Motion, AnimatePresence — for tab slide animation
- `architecture/35_shared_packages.md`: package creation, peerDependencies, migration cycle, surfaceOpeners pattern

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat error string, access token refresh path
- `architecture/01_architecture_local.md`: route-entry component pattern for surfaces
- `architecture/28_surfaces_local.md`: no `drawer` type; only `slide`, `sheet`, `modal`
- `architecture/30_dynamic_loading_local.md`: `@beyo/ui/src/lib/lazy-with-preload.ts` path

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what already exists):
- `packages/tasks/src/types.ts` — old issue schema to understand what to remove
- `packages/tasks/src/surface-ids.ts` — old `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` to remove
- `packages/tasks/src/api/*` — old issue API files to delete
- `apps/workers-app/.../surface-ids.ts` — existing warning sheet surface prop types to extend
- `apps/workers-app/.../controllers/use-task-step-detail.controller.ts` — existing `handleTransition` to modify
- `apps/workers-app/.../controllers/use-working-sections-home.controller.ts` — existing prefetch pattern to extend
- `apps/workers-app/.../pages/task_steps/UpholsteryWarningSheetPage.tsx` — existing sheet structure
- `apps/workers-app/.../pages/task_steps/StepDependencyWarningSheetPage.tsx` — "Start anyway" button to modify

Prohibited (pattern reads — contract covers these):
- Reading another action hook to understand optimistic update shape → `08_hooks.md`
- Reading another query hook to understand TanStack setup → `05_server_state.md`
- Reading another package's `package.json` to understand peer deps format → `35_shared_packages.md §3`

### Skill selection

- Primary skill: `skills/feature-crud/SKILL.md` (new CRUD feature with UI)
- Trigger terms: `issue-types`, `item-issues`, `intensity`, `placement_of_issue`, `batch create`, `batch delete`, `surfaceOpeners`
- Excluded alternatives: none applicable

---

## Domain schemas consulted

- `packages/tasks/src/types.ts`: existing `ItemIssue` (old — uses `issue_type_id`, `issue_severity_id`, `state`, `base_time_seconds`, `time_multiplier`, `issue_name_snapshot`, `severity_name_snapshot`). **All of these are the old schema and will be deleted.**
- Handoff doc establishes new schemas (see Implementation Plan §Types step).
- `apps/workers-app/.../features/task_steps/types.ts`: `TaskStep`, `StepState`, `STEP_TERMINAL_STATES`, etc. — unchanged.
- `apps/workers-app/.../features/working_sections/types.ts`: `WorkingSectionViewModel` — has `client_id` used for prefetch.

---

## Implementation plan

Follow build order strictly: Types → Query Keys → API Functions → Query Hooks → Actions → Surface IDs → Lib utilities → Components/Pages → Package wiring → Workers app integration → @beyo/tasks cleanup → Managers app cleanup → Validation.

---

### Phase 1 — New `@beyo/item-issues` package

#### Step 1.1 — Package scaffold

Create `packages/item-issues/package.json`:
```json
{
  "name": "@beyo/item-issues",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@beyo/hooks": "*",
    "@tanstack/react-query": ">=5.0.0",
    "framer-motion": ">=12.0.0",
    "react": ">=19.0.0",
    "zod": ">=4.0.0"
  }
}
```

Create `packages/item-issues/tsconfig.json` — copy the standard package tsconfig from `35_shared_packages.md §5` exactly (target es2023, moduleResolution bundler, noEmit true, jsx react-jsx, strict, noUnusedLocals, noUnusedParameters, erasableSyntaxOnly).

Create `packages/item-issues/src/` directory.

---

#### Step 1.2 — Types (`packages/item-issues/src/types.ts`)

All schemas are derived from the handoff doc. Use Zod, export both schema and inferred type.

```ts
// IssueTypeLink — one entry per linked item category
export const IssueTypeLinkSchema = z.object({
  item_category_id: z.string(),
  placement_of_issue: z.string(),
});
export type IssueTypeLink = z.infer<typeof IssueTypeLinkSchema>;

// IssueType — returned by GET /api/v1/issue-types
export const IssueTypeSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  source: z.string(),
  linked_working_section_ids: z.array(z.string()),
  linked_item_category_ids: z.array(IssueTypeLinkSchema),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string(),
});
export type IssueType = z.infer<typeof IssueTypeSchema>;

// Pagination for issue types list
export const IssueTypesPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number().int(),
  offset: z.number().int(),
});

// Response schema for list issue types
export const ListIssueTypesResponseSchema = z.object({
  issue_types: z.array(IssueTypeSchema),
  issue_types_pagination: IssueTypesPaginationSchema,
});
export type ListIssueTypesResponse = z.infer<typeof ListIssueTypesResponseSchema>;

// ItemIssue — returned by GET /api/v1/items/{id}/issues
export const ItemIssueSchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  item_id: z.string(),
  step_id: z.string().nullable(),
  worker_id: z.string().nullable(),
  working_section_id: z.string().nullable(),
  item_category_id: z.string().nullable(),
  issue_type_id: z.string().nullable(),
  issue_type_snapshot: z.string(),
  placement_of_issue_snapshot: z.string(),
  intensity: z.number().int().min(1),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
});
export type ItemIssue = z.infer<typeof ItemIssueSchema>;

// Pagination for item issues list
export const ItemIssuesPaginationSchema = z.object({
  items: z.array(ItemIssueSchema),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
});

// Response schema for list item issues
export const ListItemIssuesResponseSchema = z.object({
  item_issues_pagination: ItemIssuesPaginationSchema,
});
export type ListItemIssuesResponse = z.infer<typeof ListItemIssuesResponseSchema>;

// Input for creating a single issue inside the batch
export const CreateItemIssueInputSchema = z.object({
  issue_type_id: z.string().nullable(),
  step_id: z.string().nullable(),
  worker_id: z.string().nullable(),
  working_section_id: z.string().nullable(),
  item_category_id: z.string().nullable(),
  issue_type_snapshot: z.string(),
  placement_of_issue_snapshot: z.string(),
  intensity: z.number().int().min(1).max(3),
});
export type CreateItemIssueInput = z.infer<typeof CreateItemIssueInputSchema>;

// Response schema for batch create
export const CreateItemIssuesResponseSchema = z.object({
  item_issue_ids: z.array(z.string()),
});
export type CreateItemIssuesResponse = z.infer<typeof CreateItemIssuesResponseSchema>;

// Input for deleting a single issue inside the batch
export type DeleteItemIssueInput = { item_issue_id: string };

// Query params for list issue types
export type ListIssueTypesParams = {
  working_section_ids?: string[];   // joined as CSV on the wire
  item_category_ids?: string[];     // joined as CSV on the wire
  q?: string;
  limit?: number;
  offset?: number;
};

// Query params for list item issues
export type ListItemIssuesParams = {
  working_section_id?: string;
  item_category_id?: string;
  issue_type_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

// Draft intensity value: 0 = not selected, 1-3 = selected
export type IssueIntensity = 0 | 1 | 2 | 3;

// Draft state keyed by issue_type client_id
export type IssueSelectionDraft = Record<string, IssueIntensity>;

// Grouped issue types by placement_of_issue (for display)
export type IssueTypeGroup = {
  placement: string;
  issueTypes: IssueType[];
};
```

---

#### Step 1.3 — Query keys

**`packages/item-issues/src/api/issue-type-keys.ts`**

```ts
// working_section_ids and item_category_ids arrays are sorted before use
// to produce stable, deduplicated cache keys.
export const issueTypeKeys = {
  all: () => ["issue-types"] as const,
  list: (params: {
    working_section_ids?: string[];
    item_category_ids?: string[];
  }) => [
    "issue-types",
    "list",
    {
      working_section_ids: [...(params.working_section_ids ?? [])].sort(),
      item_category_ids: [...(params.item_category_ids ?? [])].sort(),
    },
  ] as const,
};
```

**`packages/item-issues/src/api/item-issue-keys.ts`**

```ts
export const itemIssueKeys = {
  all: () => ["item-issues"] as const,
  byItem: (
    itemId: string,
    params?: { working_section_id?: string; item_category_id?: string },
  ) =>
    ["item-issues", "by-item", itemId, params ?? {}] as const,
};
```

---

#### Step 1.4 — API functions

**`packages/item-issues/src/api/fetch-issue-types.ts`**

```ts
import { apiClient } from "@beyo/api-client";
import { z } from "zod";
import { ListIssueTypesResponseSchema } from "../types";
import type { ListIssueTypesParams } from "../types";

export async function fetchIssueTypes(
  params: ListIssueTypesParams,
): Promise<ListIssueTypesResponse> {
  const searchParams = new URLSearchParams();
  if (params.working_section_ids?.length) {
    searchParams.set("working_section_id", params.working_section_ids.join(","));
  }
  if (params.item_category_ids?.length) {
    searchParams.set("item_category_id", params.item_category_ids.join(","));
  }
  if (params.q) searchParams.set("q", params.q);
  searchParams.set("limit", String(params.limit ?? 200));
  searchParams.set("offset", String(params.offset ?? 0));

  const raw = await apiClient.get(`/api/v1/issue-types?${searchParams.toString()}`);
  return ListIssueTypesResponseSchema.parse(raw);
}
```

**`packages/item-issues/src/api/fetch-item-issues.ts`**

```ts
import { apiClient } from "@beyo/api-client";
import { ListItemIssuesResponseSchema } from "../types";
import type { ListItemIssuesParams } from "../types";

export async function fetchItemIssues(
  itemId: string,
  params: ListItemIssuesParams = {},
): Promise<ListItemIssuesResponse> {
  const searchParams = new URLSearchParams();
  if (params.working_section_id) searchParams.set("working_section_id", params.working_section_id);
  if (params.item_category_id) searchParams.set("item_category_id", params.item_category_id);
  if (params.issue_type_id) searchParams.set("issue_type_id", params.issue_type_id);
  if (params.q) searchParams.set("q", params.q);
  searchParams.set("limit", String(params.limit ?? 200));
  searchParams.set("offset", String(params.offset ?? 0));

  const raw = await apiClient.get(`/api/v1/items/${itemId}/issues?${searchParams.toString()}`);
  return ListItemIssuesResponseSchema.parse(raw);
}
```

**`packages/item-issues/src/api/create-item-issues.ts`**

```ts
import { apiClient } from "@beyo/api-client";
import { z } from "zod";
import { CreateItemIssuesResponseSchema } from "../types";
import type { CreateItemIssueInput } from "../types";

export async function createItemIssues(
  itemId: string,
  issues: CreateItemIssueInput[],
): Promise<CreateItemIssuesResponse> {
  const raw = await apiClient.post(`/api/v1/items/${itemId}/issues`, { issues });
  return CreateItemIssuesResponseSchema.parse(raw);
}
```

**`packages/item-issues/src/api/delete-item-issues.ts`**

```ts
import { apiClient } from "@beyo/api-client";

export async function deleteItemIssues(
  itemId: string,
  issueIds: string[],
): Promise<void> {
  await apiClient.delete(`/api/v1/items/${itemId}/issues`, {
    issues: issueIds.map((id) => ({ item_issue_id: id })),
  });
}
```

---

#### Step 1.5 — Query hooks

**`packages/item-issues/src/api/use-issue-types-query.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchIssueTypes } from "./fetch-issue-types";
import { issueTypeKeys } from "./issue-type-keys";
import type { ListIssueTypesParams } from "../types";

export function useIssueTypesQuery(params: ListIssueTypesParams) {
  const { working_section_ids = [], item_category_ids = [] } = params;
  const enabled = working_section_ids.length > 0 || item_category_ids.length > 0;

  return useQuery({
    queryKey: issueTypeKeys.list({
      working_section_ids,
      item_category_ids,
    }),
    queryFn: () => fetchIssueTypes(params),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
```

**`packages/item-issues/src/api/use-item-issues-query.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchItemIssues } from "./fetch-item-issues";
import { itemIssueKeys } from "./item-issue-keys";
import type { ListItemIssuesParams } from "../types";

export function useItemIssuesQuery(
  itemId: string | null | undefined,
  params: ListItemIssuesParams = {},
) {
  return useQuery({
    queryKey: itemIssueKeys.byItem(itemId ?? "", {
      working_section_id: params.working_section_id,
      item_category_id: params.item_category_id,
    }),
    queryFn: () => fetchItemIssues(itemId!, params),
    staleTime: 60 * 1000,
    enabled: Boolean(itemId),
  });
}
```

---

#### Step 1.6 — Actions

**`packages/item-issues/src/actions/use-save-item-issues.ts`**

This action computes the diff between the current server state and the draft, batch-deletes removed issues, batch-creates new or intensity-changed issues, and applies optimistic updates.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@beyo/lib";
import { createItemIssues } from "../api/create-item-issues";
import { deleteItemIssues } from "../api/delete-item-issues";
import { itemIssueKeys } from "../api/item-issue-keys";
import type {
  CreateItemIssueInput,
  IssueSelectionDraft,
  IssueType,
  IssueTypeLink,
  ItemIssue,
} from "../types";

export type SaveItemIssuesContext = {
  itemId: string;
  workingSectionId: string | null;
  itemCategoryId: string | null;
  stepId: string | null;
  workerId: string | null;
};

export type SaveItemIssuesArgs = {
  draft: IssueSelectionDraft;
  existingIssues: ItemIssue[];
  issueTypes: IssueType[];
  context: SaveItemIssuesContext;
};

// Finds placement_of_issue for a given issue type + item category combination.
function resolvePlacement(
  issueType: IssueType,
  itemCategoryId: string | null,
): string {
  if (!itemCategoryId) return "";
  const link = issueType.linked_item_category_ids.find(
    (l: IssueTypeLink) => l.item_category_id === itemCategoryId,
  );
  return link?.placement_of_issue ?? "";
}

export function useSaveItemIssues() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ draft, existingIssues, issueTypes, context }: SaveItemIssuesArgs) => {
      const { itemId, workingSectionId, itemCategoryId, stepId, workerId } = context;

      // Compute diff
      const existingByTypeId = new Map(
        existingIssues.map((i) => [i.issue_type_id ?? "", i]),
      );

      const toDelete: string[] = [];
      const toCreate: CreateItemIssueInput[] = [];

      // Issues to delete: server has it but draft removes or changes intensity
      for (const existing of existingIssues) {
        const typeId = existing.issue_type_id ?? "";
        const draftIntensity = draft[typeId] ?? 0;
        if (draftIntensity === 0 || draftIntensity !== existing.intensity) {
          toDelete.push(existing.client_id);
        }
      }

      // Issues to create: draft selects it and it's new or intensity changed
      for (const [typeId, intensity] of Object.entries(draft)) {
        if (intensity === 0) continue;
        const issueType = issueTypes.find((it) => it.client_id === typeId);
        if (!issueType) continue;
        const existing = existingByTypeId.get(typeId);
        if (existing && existing.intensity === intensity) continue; // unchanged
        toCreate.push({
          issue_type_id: typeId,
          step_id: stepId,
          worker_id: workerId,
          working_section_id: workingSectionId,
          item_category_id: itemCategoryId,
          issue_type_snapshot: issueType.name,
          placement_of_issue_snapshot: resolvePlacement(issueType, itemCategoryId),
          intensity: intensity as 1 | 2 | 3,
        });
      }

      // Sequential: delete first, then create
      if (toDelete.length > 0) {
        await deleteItemIssues(itemId, toDelete);
      }
      if (toCreate.length > 0) {
        await createItemIssues(itemId, toCreate);
      }
    },

    onMutate: async ({ draft, existingIssues, issueTypes, context }) => {
      const { itemId, workingSectionId, itemCategoryId } = context;
      const queryKey = itemIssueKeys.byItem(itemId, {
        working_section_id: workingSectionId ?? undefined,
        item_category_id: itemCategoryId ?? undefined,
      });

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Build the optimistic item issues list from the draft
      const now = new Date().toISOString();
      const optimisticIssues: ItemIssue[] = Object.entries(draft)
        .filter(([, intensity]) => intensity > 0)
        .map(([typeId, intensity]) => {
          const issueType = issueTypes.find((it) => it.client_id === typeId);
          const existing = existingIssues.find((i) => (i.issue_type_id ?? "") === typeId);
          return {
            client_id: existing?.client_id ?? `optimistic-${typeId}`,
            workspace_id: existing?.workspace_id ?? "",
            item_id: itemId,
            step_id: context.stepId,
            worker_id: context.workerId,
            working_section_id: workingSectionId,
            item_category_id: itemCategoryId,
            issue_type_id: typeId,
            issue_type_snapshot: issueType?.name ?? "",
            placement_of_issue_snapshot: resolvePlacement(issueType ?? { linked_item_category_ids: [] } as any, itemCategoryId),
            intensity: intensity as 1 | 2 | 3,
            created_at: existing?.created_at ?? now,
            updated_at: now,
          };
        });

      queryClient.setQueryData(queryKey, {
        item_issues_pagination: {
          items: optimisticIssues,
          limit: 200,
          offset: 0,
          has_more: false,
        },
      });

      return { previousData, queryKey };
    },

    onError: (_error, _vars, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      notify.error("Save failed", "Could not save issues. Please try again.");
    },

    onSettled: (_data, _error, { context }) => {
      const { itemId, workingSectionId, itemCategoryId } = context;
      void queryClient.invalidateQueries({
        queryKey: itemIssueKeys.byItem(itemId, {
          working_section_id: workingSectionId ?? undefined,
          item_category_id: itemCategoryId ?? undefined,
        }),
      });
    },
  });

  return {
    saveIssues: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
```

**Note for Codex:** The `IssueType` type in the `onMutate` optimistic builder references `linked_item_category_ids`. Use the actual resolved type from `types.ts` — do not use `any`. Cast the `issueType` lookup result carefully.

---

#### Step 1.7 — Surface IDs (`packages/item-issues/src/surface-ids.ts`)

```ts
export const ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID = "item-issue-selection-sheet";

// Props passed when opening the issue selection sheet from an app controller
export type ItemIssueSelectionSheetSurfaceProps = {
  itemId: string;
  workingSectionId: string;
  itemCategoryId: string | null;
  stepId?: string | null;
  workerId?: string | null;
  // Called after issues are saved; use for triggering the state transition in the pre-start flow.
  onSaved?: () => void;
};

// Openers map injected into ItemIssuePreviewSection from the app controller
export type ItemIssueSurfaceOpeners = {
  openIssueSelection?: () => void;
};
```

---

#### Step 1.8 — Lib utilities (`packages/item-issues/src/lib/issue-selection.ts`)

Pure functions with no hooks. Safe to call inside `useCallback` / `useEffect`.

```ts
import type { IssueIntensity, IssueSelectionDraft, IssueType, IssueTypeGroup, ItemIssue } from "../types";

// Build initial draft from server-side item issues (for a specific working section / category context).
export function buildInitialDraft(existingIssues: ItemIssue[]): IssueSelectionDraft {
  const draft: IssueSelectionDraft = {};
  for (const issue of existingIssues) {
    if (issue.issue_type_id) {
      draft[issue.issue_type_id] = issue.intensity as IssueIntensity;
    }
  }
  return draft;
}

// Cycle intensity: 0→1→2→3→0
export function cycleIntensity(current: IssueIntensity): IssueIntensity {
  if (current >= 3) return 0;
  return (current + 1) as IssueIntensity;
}

// Group issue types by placement_of_issue for a given itemCategoryId.
// itemCategoryId is always non-null here — callers must not call this with null.
// Issue types with no matching link for this category are skipped (they belong to a different category).
export function groupIssueTypesByPlacement(
  issueTypes: IssueType[],
  itemCategoryId: string,
): IssueTypeGroup[] {
  const groupMap = new Map<string, IssueType[]>();

  for (const issueType of issueTypes) {
    const link = issueType.linked_item_category_ids.find(
      (l) => l.item_category_id === itemCategoryId,
    );
    if (!link) continue; // not linked to this category
    const list = groupMap.get(link.placement_of_issue) ?? [];
    list.push(issueType);
    groupMap.set(link.placement_of_issue, list);
  }

  return Array.from(groupMap.entries()).map(([placement, types]) => ({
    placement,
    issueTypes: types,
  }));
}

// Synchronous check: does the prefetched issue types cache contain any issue
// types relevant to the given workingSectionId + itemCategoryId?
// Returns false when itemCategoryId is null — sheet is skipped for uncategorised items.
// Call via queryClient.getQueryData — no hook needed.
export function hasIssueTypesForContext(
  issueTypes: IssueType[] | undefined,
  workingSectionId: string,
  itemCategoryId: string | null,
): boolean {
  if (!issueTypes || issueTypes.length === 0) return false;
  if (!itemCategoryId) return false; // skip sheet for items with no category
  return issueTypes.some(
    (it) =>
      it.linked_working_section_ids.includes(workingSectionId) &&
      it.linked_item_category_ids.some(
        (l) => l.item_category_id === itemCategoryId,
      ),
  );
}
```

---

#### Step 1.9 — `ItemIssuePreviewSection` component

**`packages/item-issues/src/components/ItemIssuePreviewSection.tsx`**

This component shows the current item issues and a "+" pill to open the selection sheet. It makes the same query as the selection sheet — TanStack deduplicates the fetch.

```tsx
import { Plus } from "lucide-react";
import { DashedInfoSection, EyebrowLabel, InfoPill } from "@beyo/ui";
import { useItemIssuesQuery } from "../api/use-item-issues-query";
import type { ItemIssueSurfaceOpeners } from "../surface-ids";

type Props = {
  itemId: string | null | undefined;
  workingSectionId: string | null | undefined;
  surfaceOpeners?: ItemIssueSurfaceOpeners;
  "data-testid"?: string;
};

export function ItemIssuePreviewSection({
  itemId,
  workingSectionId,
  surfaceOpeners,
  "data-testid": testId = "item-issue-preview-section",
}: Props): React.JSX.Element | null {
  const issuesQuery = useItemIssuesQuery(itemId, {
    working_section_id: workingSectionId ?? undefined,
  });
  const issues = issuesQuery.data?.item_issues_pagination.items ?? [];

  if (!itemId) return null;
  if (!issues.length && !surfaceOpeners?.openIssueSelection) return null;

  return (
    <DashedInfoSection data-testid={testId}>
      <EyebrowLabel>Issues Found</EyebrowLabel>
      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => (
          <InfoPill
            key={issue.client_id}
            data-testid="item-issue-pill"
          >
            <span>{issue.issue_type_snapshot}</span>
            {issue.intensity > 1 ? (
              <span className="ml-1 text-xs opacity-70">×{issue.intensity}</span>
            ) : null}
          </InfoPill>
        ))}
        {surfaceOpeners?.openIssueSelection ? (
          <button
            aria-label="Add issue"
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-medium text-muted-foreground"
            data-testid="add-issue-button"
            onClick={surfaceOpeners.openIssueSelection}
          >
            <Plus aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

---

#### Step 1.10 — `ItemIssueSelectionSheet` page

**`packages/item-issues/src/pages/ItemIssueSelectionSheet.tsx`**

This is the full-screen sheet rendered via the surface system. It reads props from `useSurfaceProps`, fetches issue types and existing issues, manages draft state, renders tab pill nav with slide animation, and handles save/cancel.

**Structure:**
- `useSurfaceProps<ItemIssueSelectionSheetSurfaceProps>()` → resolve all props with fallback values
- Two queries: `useIssueTypesQuery` and `useItemIssuesQuery`
- Local state: `draft: IssueSelectionDraft`, `activeTabIndex: number`, `prevTabIndex: number`
- `useSaveItemIssues()` action
- Groups computed via `groupIssueTypesByPlacement(issueTypes, itemCategoryId)`

**Early return guard (two cases):**
1. If `resolvedItemCategoryId` is null → `return null` immediately (no fetch, no render — uncategorised items skip the sheet).
2. If `issueTypesQuery.isSuccess && groups.length === 0` → `return null` (section has no configured issue types). Do not render a loading skeleton for this case to avoid flash; wait for `isSuccess` before deciding.

**Draft initialization:** Use `useEffect` on `existingIssues` change (query settled) to call `buildInitialDraft` and set draft only when the draft is still at its initial empty state (first load).

**Tab slide animation:** Wrap the body in `AnimatePresence` with `mode="wait"`. The `motion.div` receives `initial={{ x: direction * 100 + "%" }}`, `animate={{ x: 0 }}`, `exit={{ x: -direction * 100 + "%" }}`. Direction is `+1` when `activeTabIndex > prevTabIndex`, `-1` otherwise. Store `prevTabIndex` in a ref.

**Box visual:** Each issue box is a `<button>` with `position: relative` and `overflow: hidden`. An inner `<div>` sits at `absolute inset-y-0 left-0` with `bg-primary` and `width: {fillPercent}%` (0 / 33 / 66 / 100) anchored to the left edge. The issue name uses two text layers: a base `<span>` in `text-card-foreground` (shows in the unfilled right portion), and an absolutely positioned overlay `<span>` in `text-primary-foreground` clipped to the filled left portion using `clip-path: inset(0 ${100 - fillPercent}% 0 0)`. Transition the width with `transition-all duration-200 ease-out`. Fill is **left to right**: intensity 1 = 33% width, intensity 2 = 66%, intensity 3 = 100%.

**Save handler:**
```ts
async function handleSave(): Promise<void> {
  await saveIssues({
    draft,
    existingIssues: issuesQuery.data?.item_issues_pagination.items ?? [],
    issueTypes: issueTypesQuery.data?.issue_types ?? [],
    context: {
      itemId: resolvedItemId,
      workingSectionId: resolvedWorkingSectionId,
      itemCategoryId: resolvedItemCategoryId,
      stepId: resolvedStepId ?? null,
      workerId: resolvedWorkerId ?? null,
    },
  });
  onSaved?.();
  closeTop();
}
```

**Cancel handler:** call `closeTop()` (or `header.requestClose()` if surface header is present).

**`data-testid` attributes to add:**
- Root div: `data-testid="item-issue-selection-sheet"`
- Each tab pill button: `data-testid="issue-placement-tab"` + `data-active={String(index === activeTabIndex)}`
- Body container: `data-testid="issue-type-box-group"`
- Each issue box button: `data-testid="issue-type-box"` + `data-intensity={intensity}` + `data-issue-type-id={issueType.client_id}`
- Save button: `data-testid="save-issues-button"`
- Cancel button: `data-testid="cancel-issues-button"`

**Full component skeleton:**

```tsx
export function ItemIssueSelectionSheet(): React.JSX.Element | null {
  const { closeTop } = useSurface();
  const {
    itemId,
    workingSectionId,
    itemCategoryId,
    stepId,
    workerId,
    onSaved,
  } = useSurfaceProps<ItemIssueSelectionSheetSurfaceProps>();

  const resolvedItemId = itemId ?? "";
  const resolvedWorkingSectionId = workingSectionId ?? "";
  const resolvedItemCategoryId = itemCategoryId ?? null;
  const resolvedStepId = stepId ?? null;
  const resolvedWorkerId = workerId ?? null;

  const issueTypesQuery = useIssueTypesQuery({
    working_section_ids: resolvedWorkingSectionId ? [resolvedWorkingSectionId] : [],
    item_category_ids: resolvedItemCategoryId ? [resolvedItemCategoryId] : [],
  });

  const issuesQuery = useItemIssuesQuery(resolvedItemId, {
    working_section_id: resolvedWorkingSectionId || undefined,
  });

  const [draft, setDraft] = useState<IssueSelectionDraft>({});
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const prevTabIndexRef = useRef(0);
  const draftInitialisedRef = useRef(false);

  // Initialize draft from existing issues (first time only)
  useEffect(() => {
    if (draftInitialisedRef.current) return;
    const existing = issuesQuery.data?.item_issues_pagination.items ?? [];
    if (issuesQuery.isSuccess || existing.length > 0) {
      setDraft(buildInitialDraft(existing));
      draftInitialisedRef.current = true;
    }
  }, [issuesQuery.data, issuesQuery.isSuccess]);

  const groups = useMemo(
    () => groupIssueTypesByPlacement(
      issueTypesQuery.data?.issue_types ?? [],
      resolvedItemCategoryId,
    ),
    [issueTypesQuery.data?.issue_types, resolvedItemCategoryId],
  );

  // If issue types loaded and empty — nothing to show
  if (issueTypesQuery.isSuccess && groups.length === 0) return null;

  const currentGroup = groups[activeTabIndex];
  const direction = activeTabIndex >= prevTabIndexRef.current ? 1 : -1;

  function handleTabChange(index: number): void {
    prevTabIndexRef.current = activeTabIndex;
    setActiveTabIndex(index);
  }

  function handleBoxTap(issueTypeId: string): void {
    setDraft((prev) => ({
      ...prev,
      [issueTypeId]: cycleIntensity((prev[issueTypeId] ?? 0) as IssueIntensity),
    }));
  }

  const { saveIssues, isPending } = useSaveItemIssues();

  async function handleSave(): Promise<void> {
    await saveIssues({ draft, existingIssues: ..., issueTypes: ..., context: { ... } });
    onSaved?.();
    closeTop();
  }

  return (
    <div data-testid="item-issue-selection-sheet" className="flex flex-col">
      {/* Tab pill nav */}
      {groups.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {groups.map((group, index) => (
            <button
              key={group.placement}
              type="button"
              data-testid="issue-placement-tab"
              data-active={String(index === activeTabIndex)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                index === activeTabIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
              onClick={() => handleTabChange(index)}
            >
              {group.placement}
            </button>
          ))}
        </div>
      ) : null}

      {/* Box grid with slide animation */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {currentGroup ? (
            <motion.div
              key={currentGroup.placement}
              initial={{ x: `${direction * 100}%` }}
              animate={{ x: 0 }}
              exit={{ x: `${-direction * 100}%` }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="grid grid-cols-2 gap-3 p-4"
              data-testid="issue-type-box-group"
            >
              {currentGroup.issueTypes.map((issueType) => {
                const intensity = (draft[issueType.client_id] ?? 0) as IssueIntensity;
                const fillPercent = intensity === 0 ? 0 : intensity === 1 ? 33 : intensity === 2 ? 66 : 100;
                return (
                  <button
                    key={issueType.client_id}
                    type="button"
                    data-testid="issue-type-box"
                    data-intensity={intensity}
                    data-issue-type-id={issueType.client_id}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-left"
                    onClick={() => handleBoxTap(issueType.client_id)}
                  >
                    {/* Fill overlay — left to right */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-primary transition-all duration-200 ease-out"
                      style={{ width: `${fillPercent}%` }}
                    />
                    {/* Issue name — base layer (card foreground, visible in unfilled area) */}
                    <span
                      className="relative z-10 text-sm font-medium text-card-foreground"
                      aria-hidden="true"
                    >
                      {issueType.name}
                    </span>
                    {/* Issue name — overlay layer (primary foreground) clipped to filled left area */}
                    <span
                      className="absolute inset-0 flex items-center p-4 text-sm font-medium text-primary-foreground"
                      style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
                    >
                      {issueType.name}
                    </span>
                    <span className="sr-only">
                      {issueType.name}{intensity > 0 ? `, intensity ${intensity}` : ""}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
        <button
          type="button"
          data-testid="cancel-issues-button"
          className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground"
          onClick={closeTop}
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="save-issues-button"
          disabled={isPending}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          onClick={() => { void handleSave(); }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
```

---

#### Step 1.11 — Barrel export (`packages/item-issues/src/index.ts`)

```ts
// Types
export type {
  IssueType,
  IssueTypeLink,
  ItemIssue,
  IssueIntensity,
  IssueSelectionDraft,
  IssueTypeGroup,
  ListIssueTypesParams,
  ListItemIssuesParams,
  CreateItemIssueInput,
} from "./types";

// Query keys
export { issueTypeKeys } from "./api/issue-type-keys";
export { itemIssueKeys } from "./api/item-issue-keys";

// API functions (for prefetchQuery in controllers)
export { fetchIssueTypes } from "./api/fetch-issue-types";

// Query hooks
export { useIssueTypesQuery } from "./api/use-issue-types-query";
export { useItemIssuesQuery } from "./api/use-item-issues-query";

// Actions
export { useSaveItemIssues } from "./actions/use-save-item-issues";

// Lib utilities
export {
  buildInitialDraft,
  cycleIntensity,
  groupIssueTypesByPlacement,
  hasIssueTypesForContext,
} from "./lib/issue-selection";

// Surface IDs
export {
  ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
  type ItemIssueSelectionSheetSurfaceProps,
  type ItemIssueSurfaceOpeners,
} from "./surface-ids";

// Components
export { ItemIssuePreviewSection } from "./components/ItemIssuePreviewSection";

// Pages (lazy-loaded by apps via lazyWithPreload — not imported directly by apps)
export { ItemIssueSelectionSheet } from "./pages/ItemIssueSelectionSheet";
```

---

### Phase 2 — Workers app integration

#### Step 2.1 — Package wiring

1. Add to `apps/workers-app/ManagerBeyo-app-workers/package.json` `"dependencies"`:
   ```json
   "@beyo/item-issues": "*"
   ```
2. Run `npm install` from `frontend/` root.
3. Add to `apps/workers-app/ManagerBeyo-app-workers/src/index.css` (after existing `@source` lines):
   ```css
   @source "../../../../packages/item-issues/src";
   ```

---

#### Step 2.2 — Surface registration update

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

- Remove: `import { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from "@beyo/tasks";`
- Remove: the `loadItemFastIssueSheetPage` loader, the `itemFastIssueSheet` lazy component, and the `[ITEM_FAST_ISSUE_SHEET_SURFACE_ID]` entry from `taskStepSurfaces`.
- Add:
  ```ts
  import { ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID } from "@beyo/item-issues";

  function loadItemIssueSelectionSheet() {
    return import("@beyo/item-issues").then((module) => ({
      default: module.ItemIssueSelectionSheet,
    }));
  }

  const itemIssueSelectionSheet = lazyWithPreload(loadItemIssueSelectionSheet);
  export const preloadItemIssueSelectionSheetSurface = itemIssueSelectionSheet.preload;
  ```
- Add to `taskStepSurfaces`:
  ```ts
  [ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemIssueSelectionSheet.Component,
  },
  ```

---

#### Step 2.3 — Warning sheet surface props update

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surface-ids.ts`

Add `onConfirm?: () => void` to `StepDependencyWarningSheetSurfaceProps`:
```ts
export type StepDependencyWarningSheetSurfaceProps = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  incompleteDependencies: IncompleteDependencyViewModel[];
  onConfirm?: () => void;  // called by "Start anyway" instead of direct transition
};
```

Do NOT change `UpholsteryWarningSheetSurfaceProps` — it has no "Start anyway" button.

---

#### Step 2.4 — `StepDependencyWarningSheetPage` update

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/StepDependencyWarningSheetPage.tsx`

Update `handleStartAnyway`:
```ts
const { onConfirm, stepId, taskId, workingSectionId, ... } =
  useSurfaceProps<StepDependencyWarningSheetSurfaceProps>();

function handleStartAnyway() {
  if (isPending) return;

  if (onConfirm) {
    onConfirm();
    closeSheet();
    return;
  }

  // Fallback: direct transition (backward compat, should not be reached in normal flow)
  transitionStepState({
    task_id: resolvedTaskId,
    step_id: resolvedStepId,
    new_state: "working",
    working_section_id: resolvedWorkingSectionId,
  });
  closeSheet();
}
```

Remove `useTransitionStepState` import if `onConfirm` is always provided (keep it as fallback for safety).

---

#### Step 2.5 — Controller updates

Both controllers share the same guard logic. Introduce a helper at `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/lib/build-proceed-to-start.ts` to avoid duplication:

**`apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/lib/build-proceed-to-start.ts`**

```ts
import type { QueryClient } from "@tanstack/react-query";
import {
  ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
  fetchIssueTypes,
  hasIssueTypesForContext,
  issueTypeKeys,
  type IssueType,
  type ItemIssueSelectionSheetSurfaceProps,
} from "@beyo/item-issues";
import type { TaskId, TaskStepId, WorkingSectionId } from "@beyo/lib";
import type { TransitionStepStateAction } from "../actions/use-transition-step-state";

type OpenSurface = (id: string, props: unknown) => void;

type ProceedToStartArgs = {
  stepId: TaskStepId;
  taskId: TaskId;
  workingSectionId: WorkingSectionId;
  itemId: string | null | undefined;
  itemCategoryId: string | null | undefined;
  workerId: string | null | undefined;
  queryClient: QueryClient;
  openSurface: OpenSurface;
  transitionStepState: TransitionStepStateAction["transitionStepState"];
};

// Returns a callback that: checks if issue types apply → opens issue sheet OR transitions directly.
// Safe to call inside useCallback (no hooks inside the returned function).
export function buildProceedToStart(args: ProceedToStartArgs): () => void {
  return () => {
    const {
      stepId,
      taskId,
      workingSectionId,
      itemId,
      itemCategoryId,
      workerId,
      queryClient,
      openSurface,
      transitionStepState,
    } = args;

    const cachedData = queryClient.getQueryData<{ issue_types: IssueType[] }>(
      issueTypeKeys.list({ working_section_ids: [workingSectionId] }),
    );

    const hasIssues = hasIssueTypesForContext(
      cachedData?.issue_types,
      workingSectionId,
      itemCategoryId ?? null,
    );

    if (itemId && hasIssues) {
      openSurface(ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID, {
        itemId,
        workingSectionId,
        itemCategoryId: itemCategoryId ?? null,
        stepId,
        workerId: workerId ?? null,
        onSaved: () => {
          transitionStepState({
            task_id: taskId,
            step_id: stepId,
            new_state: "working",
            working_section_id: workingSectionId,
          });
        },
      } satisfies ItemIssueSelectionSheetSurfaceProps);
      return;
    }

    transitionStepState({
      task_id: taskId,
      step_id: stepId,
      new_state: "working",
      working_section_id: workingSectionId,
    });
  };
}
```

---

**Update `use-task-step-detail.controller.ts`**

1. Remove import of `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` and `TaskIssueSurfaceOpeners` from `@beyo/tasks`.
2. Add imports from `@beyo/item-issues`:
   ```ts
   import {
     ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID,
     type ItemIssueSurfaceOpeners,
     type ItemIssueSelectionSheetSurfaceProps,
   } from "@beyo/item-issues";
   ```
3. Add import of `buildProceedToStart` from the new lib file.
4. In `handleTransition` for the `pending → working` guard, after the dependency check, call `buildProceedToStart` and invoke the result instead of calling `transitionStepState` directly:
   ```ts
   if (step && step.client_id === targetStepId && step.state === "pending" && nextState === "working") {
     // Upholstery check (unchanged)
     if (...upholstery...) { openSurface(UPHOLSTERY_WARNING...); return; }

     // Dependency check — pass onConfirm so "Start anyway" still hits issue check
     if (...dependencies...) {
       const proceedToStart = buildProceedToStart({ ... });
       openSurface(STEP_DEPENDENCY_WARNING_SHEET_SURFACE_ID, {
         ...,
         onConfirm: proceedToStart,
       } as StepDependencyWarningSheetSurfaceProps);
       return;
     }

     // Issue check — direct path (no warnings triggered)
     const proceedToStart = buildProceedToStart({
       stepId: targetStepId,
       taskId: targetTaskId,
       workingSectionId: resolvedWorkingSectionId,
       itemId: step.item?.client_id,
       itemCategoryId: step.item?.item_category_id ?? null,
       workerId: user?.id ?? null,
       queryClient,
       openSurface,
       transitionStepState,
     });
     proceedToStart();
     return;
   }
   ```
5. Add `const { user } = useAuth()` (imported from `@beyo/auth`) to the controller. `user?.id` is the `UserId` for the current worker. Pass `user?.id ?? null` as `workerId` to `buildProceedToStart`.
6. Update `issuesSurfaceOpeners` to use the new type and surface ID:
   ```ts
   const issuesSurfaceOpeners = useMemo<ItemIssueSurfaceOpeners>(() => {
     const itemId = step?.item?.client_id;
     if (!itemId) return {};
     return {
       openIssueSelection: () =>
         openSurface(ITEM_ISSUE_SELECTION_SHEET_SURFACE_ID, {
           itemId,
           workingSectionId: resolvedWorkingSectionId,
           itemCategoryId: step?.item?.item_category_id ?? null,
           stepId: resolvedStepId,
           workerId: user?.id ?? null,
         } satisfies ItemIssueSelectionSheetSurfaceProps),
     };
   }, [step, openSurface, resolvedTaskId, resolvedWorkingSectionId, resolvedStepId, user?.id]);
   ```
7. Update `TaskStepDetailController` type: change `issuesSurfaceOpeners: TaskIssueSurfaceOpeners` to `issuesSurfaceOpeners: ItemIssueSurfaceOpeners`.

---

**Update `use-working-section-steps.controller.ts`**

Apply the same `handleTransition` pattern as the detail controller:
1. Import `buildProceedToStart` from the new lib.
2. Add `const { user } = useAuth()` from `@beyo/auth`.
3. In the `pending → working` guard path — after dependency check — call `buildProceedToStart` and use its result. Pass `onConfirm` to the dependency warning surface props.
4. Pass `workerId: user?.id ?? null` to `buildProceedToStart`. The list controller does not expose `issuesSurfaceOpeners` (that's only for the detail view), so no `issuesSurfaceOpeners` update is needed here.

---

#### Step 2.6 — `TaskStepItemDetailsSection` update

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`

- Remove: `import { TaskIssuesSection } from "@beyo/tasks";`
- Add: `import { ItemIssuePreviewSection } from "@beyo/item-issues";`
- Replace all usages of `<TaskIssuesSection ... />` with `<ItemIssuePreviewSection ... />`.
- The `workingSectionId` prop comes from context: `const { ..., workingSectionId } = useTaskStepDetailContext();` — confirm the controller exposes `workingSectionId` (it does, via `TaskStepDetailController`).
- Updated render:
  ```tsx
  <ItemIssuePreviewSection
    itemId={step.item.client_id}
    workingSectionId={workingSectionId}
    surfaceOpeners={issuesSurfaceOpeners}
    data-testid="task-step-item-issues-section"
  />
  ```

---

#### Step 2.7 — Home controller prefetch update

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/working_sections/controllers/use-working-sections-home.controller.ts`

Add prefetch for issue types per section inside the `usePrefetchOnCondition` call. Issue types are prefetched per-section (not batched) to produce stable per-section cache keys that the `buildProceedToStart` check can read synchronously.

```ts
import {
  fetchIssueTypes,
  issueTypeKeys,
} from "@beyo/item-issues";
import {
  preloadTaskDetailSlideSurface,
  preloadItemIssueSelectionSheetSurface,  // NEW
} from "../../task_steps/surfaces";

// All sections from the query (not just active) — issue check applies to pending steps too
const allSections = query.data ?? [];

usePrefetchOnCondition(allSections.length > 0, () =>
  Promise.all([
    preloadTaskDetailSlideSurface(),
    preloadItemIssueSelectionSheetSurface(), // NEW
    ...activeSections.map((section) =>
      queryClient.prefetchQuery({
        queryKey: taskStepKeys.sectionList({
          working_section_id: section.client_id,
          limit: 50,
          offset: 0,
        }),
        queryFn: () =>
          fetchWorkingSectionSteps({
            working_section_id: section.client_id,
            limit: 50,
            offset: 0,
          }),
        staleTime: 30_000,
      }),
    ),
    // NEW: prefetch issue types per section (all sections, not just active)
    ...allSections.map((section) =>
      queryClient.prefetchQuery({
        queryKey: issueTypeKeys.list({ working_section_ids: [section.client_id] }),
        queryFn: () =>
          fetchIssueTypes({ working_section_ids: [section.client_id], limit: 200 }),
        staleTime: 5 * 60 * 1000,
      }),
    ),
  ]),
);
```

Note: `usePrefetchOnCondition` is called with `allSections.length > 0` (was `activeSections.length > 0`). This is correct because issue types must be prefetched for all sections, even those with only pending steps. The existing task steps prefetch keeps its `activeSections` scope unchanged.

---

#### Step 2.8 — Real-time invalidation (placeholder)

When the workers app's real-time socket connection is established (find the socket event binding file — search for `addEventListener` or `useEffect` with socket subscriptions), add:

```ts
// On receiving issue type change events (created / updated / deleted):
void queryClient.invalidateQueries({ queryKey: issueTypeKeys.all() });
```

This invalidates all cached issue type queries, triggering a background refetch. The location of this call is TBD based on the actual socket integration file (not found in current codebase scan). Mark this as a follow-up item in the plan review log.

---

### Phase 3 — `@beyo/tasks` cleanup

Remove all old issue-related code from `@beyo/tasks`. After these deletions the tasks package must still build and type-check.

**Files to delete from `packages/tasks/src/`:**
- `api/create-item-issue.ts`
- `api/delete-item-issue.ts`
- `api/delete-item-issues.ts`
- `api/fetch-issue-category-configs.ts`
- `api/fetch-item-issues.ts`
- `api/issue-category-config-keys.ts`
- `api/item-issues-keys.ts`
- `api/use-create-item-issue.ts`
- `api/use-delete-item-issue.ts`
- `api/use-delete-item-issues.ts`
- `api/use-issue-category-configs-query.ts`
- `api/use-item-issues-query.ts`
- `components/TaskIssuesSection.tsx`
- `components/fields/ItemIssuesField.tsx`
- `flows/use-item-issues-picker.flow.ts`
- `pages/ItemFastIssueSheetPage.tsx`
- `store/issue-category-config-selection.store.ts`

**Files to modify:**

`packages/tasks/src/types.ts`:
- Remove: `ItemIssueSchema`, `ItemIssue`, `IssueCategoryConfigSchema`, `IssueCategoryConfig`, `ListIssueCategoryConfigsParams`, `ItemIssueFieldEntrySchema`, `ItemIssueFieldEntry`.
- Keep: everything else (flow records, upholstery types).

`packages/tasks/src/surface-ids.ts`:
- Remove: `ITEM_FAST_ISSUE_SHEET_SURFACE_ID`, `ItemFastIssueSheetSurfaceProps`, `TaskIssueSurfaceOpeners`.
- Keep: any other surface IDs in this file (verify: currently it only has these three).

`packages/tasks/src/index.ts`:
- Remove all exports of deleted types, hooks, components, and the surface ID.
- Keep exports for: upholstery, flow records, `step-state-variants`, `task-flow-record` lib — everything unrelated to issues.

---

### Phase 4 — Managers app cleanup

The managers app references `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` (from `@beyo/tasks`) and `ItemIssueSeverityPickerSheetPage`. Both are now obsolete.

**Files to modify:**

`apps/managers-app/ManagerBeyo-app-managers/src/features/items/surfaces.ts`:
- Remove the `ITEM_FAST_ISSUE_SHEET_SURFACE_ID` import and its surface registration entry.
- Remove the `ItemIssueSeverityPickerSheetPage` surface registration entry and its lazy loader.
- Remove the corresponding surface ID constants (e.g., `ITEM_ISSUE_SEVERITY_PICKER_SHEET_SURFACE_ID`) if they live in this file.

`apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/ItemIssueSeverityPickerSheetPage.tsx`:
- Delete this file.

Any other manager-app files that import from deleted `@beyo/tasks` issue exports:
- Search for `from "@beyo/tasks"` in the managers app and remove or update imports that reference deleted exports.
- The new `@beyo/item-issues` package is NOT wired into the managers app in this plan — the managers app will have no issue UI until a future ticket.

After all changes: run `npm run typecheck` across both apps to confirm zero errors.

---

## Risks and mitigations

- **Risk:** `buildProceedToStart` uses `queryClient.getQueryData` synchronously — if the prefetch hasn't completed (e.g., slow network or user navigates to a step before home has finished loading), `cachedData` is `undefined` and `hasIssueTypesForContext` returns `false`, skipping the issue sheet.
  **Mitigation:** This is acceptable for v1. The prefetch fires at home load; by the time a user navigates to a working section and taps "Start", the prefetch should be complete. If not, the transition fires without the issue check. Add a follow-up to handle this edge case (e.g., show the issue sheet regardless when no prefetch data and the step has an item with a category).

- **Risk:** Optimistic update in `useSaveItemIssues` uses a placeholder `client_id` (`optimistic-${typeId}`) for new issues. If the optimistic ID leaks into a downstream comparison, it may cause bugs.
  **Mitigation:** After `onSettled` the query is invalidated and replaced with server data. The placeholder IDs are transient.

- **Risk:** Deleting old `@beyo/tasks` issue exports may break an undiscovered managers app import not found in the static scan.
  **Mitigation:** Run `npm run typecheck` for the managers app immediately after Phase 3. Fix any import errors before proceeding.

- **Risk:** The `clip-path` text overlay technique for the intensity fill may not render identically in all mobile browsers.
  **Mitigation:** The user confirmed this UI detail can change. If `clip-path` behaves poorly, fall back to a simpler approach: two stacked text elements where the upper one has `opacity: 0` and the fill div covers the bottom portion without the dual-text trick.

---

## Validation plan

- `npm run typecheck` (from `frontend/` root): zero errors across all packages and apps.
- Workers app manual validation:
  - Task step detail page shows existing item issues as pills with intensity indicator.
  - "+" pill opens issue selection sheet as a bottom sheet.
  - Tab pills slide body left/right based on index direction.
  - Box taps cycle 0→1→2→3→0 with fill increasing.
  - "Save" closes sheet; preview pills update immediately (optimistic).
  - "Cancel" closes sheet; no changes.
  - Starting a step whose item has issue types configured → issue selection sheet appears before transition.
  - Saving issues in pre-start sheet → step transitions to working.
  - Starting a step whose item has no issue types → transition fires without sheet.
  - "Start anyway" in dependency warning → issue sheet still appears (not skipped).
  - Working section with no issue config → no sheet at all.

---

## Review log

- `2026-06-03` planning agent: initial plan authored from handoff + codebase exploration.
- `2026-06-03` David: resolved all 5 clarifications — null category skips sheet, fill is left-to-right, upholstery warning unchanged, workerId via `useAuth().user?.id`, preload yes. Plan updated accordingly.

---

## Lifecycle transition

- Current state: `approved`
- Next state: `debugging`
- Transition owner: `codex`
