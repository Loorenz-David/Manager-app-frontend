# PLAN_issue_mode_and_client_id_20260603

## Metadata

- Plan ID: `PLAN_issue_mode_and_client_id_20260603`
- Status: `archived`
- Owner agent: `Copilot`
- Created at (UTC): `2026-06-03T14:00:00Z`
- Last updated at (UTC): `2026-06-03T13:12:00Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/building_workers_app.md`

## Goal and intent

- Goal: (1) Promote `generateClientId` / `CLIENT_ID_PREFIXES` from the managers-app local copy to the canonical `@beyo/lib` package and clean up the duplicate. (2) Implement `issue_mode` (`"graded" | "switch"`) on issue-type display and selection. (3) Send a frontend-generated `client_id` per issue on `POST /api/v1/items/{id}/issues` for stable optimistic IDs.
- Business/user intent: Workers see the correct interactive widget for each issue type — intensity boxes for graded issues, binary toggle for switch issues. Optimistic updates for issue saves use the same ID that the server will confirm, removing the `optimistic-xxx` hack.
- Non-goals: Creating or editing issue types (admin-only, deferred). Changing the issue listing page or the preview pill section. Adding `issue_mode_snapshot` display logic to `ItemIssuePreviewSection` (deferred).

## Scope

- In scope:
  - `packages/lib/src/client-id.ts` — fix `ItemIssue` prefix from `'iis'` to `'iti'`
  - Delete `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts` (duplicate)
  - 11 managers-app import sites: re-point from `@/lib/client-id` to `@beyo/lib`
  - `packages/item-issues/src/types.ts` — add `issue_mode`, `issue_mode_snapshot`, `client_id` fields
  - `packages/item-issues/src/index.ts` — export new `IssueMode` type
  - `packages/item-issues/src/actions/use-save-item-issues.ts` — pre-generate `client_id` before mutate; update `CreateItemIssueInput` usage
  - `packages/item-issues/src/pages/ItemIssueSelectionSheet.tsx` — branch box rendering and tap logic on `issue_mode`
- Out of scope:
  - `ItemIssuePreviewSection` — no `issue_mode_snapshot` rendering added here
  - Workers-app files outside `@beyo/item-issues` — no changes required
  - Managers-app issue UI — not built in this plan
- Assumptions:
  - `@beyo/lib` is already a peer dependency of `@beyo/item-issues` (confirmed in `package.json`)
  - The managers-app `@/lib/client-id` alias resolves to `src/lib/client-id.ts` (confirmed by import paths found)
  - Both `client-id.ts` files are byte-for-byte identical except for the import source; no logic divergence to reconcile

## Clarifications required

*(none — all ambiguities resolved before plan authoring)*

## Acceptance criteria

1. `npm run typecheck` passes with zero errors in both `apps/managers-app` and `apps/workers-app` after the migration.
2. `packages/lib/src/client-id.ts` has `ItemIssue: 'iti'` (not `'iis'`).
3. `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts` does not exist.
4. All 11 managers-app files import `ClientIdSchema` / `generateClientId` from `@beyo/lib` with no remaining `@/lib/client-id` references.
5. `IssueTypeSchema` includes `issue_mode: z.enum(["graded","switch"]).catch("graded")` — parsing never throws on unknown future values.
6. `ItemIssueSchema` includes `issue_mode_snapshot: z.enum(["graded","switch"]).nullable().catch(null)`.
7. `CreateItemIssueInputSchema` includes `client_id: z.string().optional()`.
8. `useSaveItemIssues` generates a `client_id` via `generateClientId("ItemIssue")` for each new issue before `mutateAsync` is called; that same ID appears in the optimistic cache record and in the API request body.
9. In `ItemIssueSelectionSheet`, tapping a `switch`-mode box toggles `intensity` between `0` and `1` only (no cycling to 2 or 3).
10. In `ItemIssueSelectionSheet`, `switch`-mode boxes render as a full-fill / no-fill toggle (no partial fill, no clip-path dual-text); `graded`-mode boxes retain existing fill-animation behavior.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query mutation structure, `onMutate` / `mutationFn` / `onSettled` responsibilities
- `architecture/08_hooks.md`: action-hook shape, optimistic update pattern (cache snapshot → rollback)
- `architecture/35_shared_packages.md`: package peer-dep rules, barrel export discipline
- `architecture/15_feature_structure.md`: layer import rules (no cross-feature logic reads)

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat error shape (`error: string`), response envelope (`ok`, `data`, `warnings`)

### File read intent — pattern vs. relational

Permitted reads already done before this plan:
- `packages/lib/src/client-id.ts` — confirmed identical content and prefix bug
- `packages/item-issues/src/types.ts` — confirmed current schema shapes
- `packages/item-issues/src/actions/use-save-item-issues.ts` — confirmed current diff + optimistic logic
- `packages/item-issues/src/pages/ItemIssueSelectionSheet.tsx` — confirmed current box render
- `packages/item-issues/src/lib/issue-selection.ts` — confirmed `groupIssueTypesByPlacement` returns full `IssueType[]` objects (so `issue_mode` will flow through automatically once added to the type)
- `apps/managers-app/.../src/lib/client-id.ts` — confirmed byte-for-byte copy

Prohibited during implementation (pattern reads — contracts cover these):
- Reading another action hook for cache snapshot shape → `08_hooks.md`
- Reading another query hook for TanStack setup → `05_server_state.md`

### Skill selection

- Primary skill: none (direct code edits, no skill wrapper needed)

## Implementation plan

### Phase 1 — Fix `ItemIssue` prefix in `@beyo/lib` (1 file)

**File: `packages/lib/src/client-id.ts`**

Change line:
```ts
ItemIssue: 'iis',
```
to:
```ts
ItemIssue: 'iti',
```

Rationale: backend IDs use the `iti_` prefix (confirmed in both handoffs). The managers-app copy has the same bug but will be deleted in Phase 2.

---

### Phase 2 — Migrate managers app to `@beyo/lib` client-id (12 files)

**Step 2.1 — Delete the duplicate file**

Delete: `apps/managers-app/ManagerBeyo-app-managers/src/lib/client-id.ts`

**Step 2.2 — Update all 11 import sites**

In each file below, replace:
```ts
import { ... } from '@/lib/client-id';
// or
import { ... } from "@/lib/client-id";
```
with:
```ts
import { ... } from '@beyo/lib';
```

Keep the imported names identical — `ClientIdSchema`, `generateClientId`, `CLIENT_ID_PREFIXES`, `ClientIdEntity`, `ClientIdPrefix` are all exported from `@beyo/lib` with the same names.

Files to update (exact paths):
1. `apps/managers-app/ManagerBeyo-app-managers/src/features/customers/types.ts`
2. `apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/create-item-upholstery.ts`
3. `apps/managers-app/ManagerBeyo-app-managers/src/features/items/subfeatures/item_images/types.ts`
4. `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`
5. `apps/managers-app/ManagerBeyo-app-managers/src/features/task-creation/providers/TaskCreationFormProvider.tsx`
6. `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/detail/TaskUpholsterySection.tsx`
7. `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-task-working-sections.controller.ts`
8. `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`
9. `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/types.ts`
10. `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery_requirements/types.ts`
11. `apps/managers-app/ManagerBeyo-app-managers/src/features/working_sections/types.ts`

After these edits, run `npm run typecheck --workspace=apps/managers-app/ManagerBeyo-app-managers` to confirm zero errors before continuing.

---

### Phase 3 — Update `@beyo/item-issues` schemas (2 files)

**File: `packages/item-issues/src/types.ts`**

**3.1 — Add `IssueMode` schema above `IssueTypeSchema`:**
```ts
export const IssueModeSchema = z.enum(["graded", "switch"]).catch("graded");
export type IssueMode = "graded" | "switch";
```
Use `.catch("graded")` so that unknown future values received from the backend default to graded behavior and never throw a parse error.

**3.2 — Update `IssueTypeSchema`** — add `issue_mode` field:
```ts
export const IssueTypeSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  source: z.string(),
  issue_mode: IssueModeSchema,          // ← add this line
  linked_working_section_ids: z.array(z.string()),
  linked_item_category_ids: z.array(IssueTypeLinkSchema),
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().nullable(),
});
```

**3.3 — Update `ItemIssueSchema`** — add `issue_mode_snapshot` field after `issue_type_snapshot`:
```ts
  issue_type_snapshot: z.string(),
  issue_mode_snapshot: z.enum(["graded", "switch"]).nullable().catch(null),  // ← add this line
  placement_of_issue_snapshot: z.string(),
```
Use `.catch(null)` so that legacy rows (which have `null` in this column) parse successfully.

**3.4 — Update `CreateItemIssueInputSchema`** — add optional `client_id`:
```ts
export const CreateItemIssueInputSchema = z.object({
  client_id: z.string().optional(),           // ← add this line
  issue_type_id: z.string().nullable(),
  step_id: z.string().nullable(),
  // ... rest unchanged
});
```

**File: `packages/item-issues/src/index.ts`**

Add exports for the new types at the top of the type-export block:
```ts
export { IssueModeSchema } from "./types";
export type { IssueMode } from "./types";
```

---

### Phase 4 — Restructure `useSaveItemIssues` to pre-generate client IDs (1 file)

**File: `packages/item-issues/src/actions/use-save-item-issues.ts`**

**Goal:** Generate a `client_id` for each `toCreate` entry ONCE — before `mutateAsync` is called — so that both `onMutate` (optimistic update) and `mutationFn` (API request) use the same ID.

**Step 4.1 — Add imports:**
```ts
import { generateClientId } from "@beyo/lib";
```

**Step 4.2 — Define internal resolved args type.** Add this type inside the file (not exported):
```ts
type ResolvedCreateIssue = CreateItemIssueInput & { client_id: string };

type ResolvedSaveArgs = {
  resolvedCreate: ResolvedCreateIssue[];
  resolvedDelete: string[];
  context: SaveItemIssuesContext;
  existingIssues: ItemIssue[];
  issueTypes: IssueType[];
};
```

**Step 4.3 — Change `mutation` to use `ResolvedSaveArgs` as its `TVariables` type.** The public `SaveItemIssuesArgs` type (accepted by the exported `saveIssues` wrapper) stays unchanged — it still receives `{ draft, existingIssues, issueTypes, context }`. Only the internal `mutation.mutateAsync` call changes.

**Step 4.4 — Move diff computation and ID generation into the `saveIssues` wrapper.** Replace the current `saveIssues: mutation.mutateAsync` export with a wrapper function:

```ts
return {
  saveIssues: async (args: SaveItemIssuesArgs) => {
    const { draft, existingIssues, issueTypes, context } = args;
    const { itemId, workingSectionId, itemCategoryId, stepId, workerId } = context;

    const existingByTypeId = new Map(
      existingIssues.map((issue) => [issue.issue_type_id ?? "", issue]),
    );

    const resolvedDelete: string[] = [];
    const resolvedCreate: ResolvedCreateIssue[] = [];

    for (const existingIssue of existingIssues) {
      const issueTypeId = existingIssue.issue_type_id ?? "";
      const draftIntensity = draft[issueTypeId] ?? 0;
      if (draftIntensity === 0 || draftIntensity !== existingIssue.intensity) {
        resolvedDelete.push(existingIssue.client_id);
      }
    }

    for (const [issueTypeId, intensity] of Object.entries(draft)) {
      if (intensity === 0) continue;

      const issueType = issueTypes.find((t) => t.client_id === issueTypeId);
      if (!issueType) continue;

      const existingIssue = existingByTypeId.get(issueTypeId);
      if (existingIssue && existingIssue.intensity === intensity) continue;

      resolvedCreate.push({
        client_id: generateClientId("ItemIssue"),
        issue_type_id: issueTypeId,
        step_id: stepId,
        worker_id: workerId,
        working_section_id: workingSectionId,
        item_category_id: itemCategoryId,
        issue_type_snapshot: issueType.name,
        placement_of_issue_snapshot: resolvePlacement(issueType, itemCategoryId),
        intensity: intensity as 1 | 2 | 3,
      });
    }

    return mutation.mutateAsync({
      resolvedCreate,
      resolvedDelete,
      context,
      existingIssues,
      issueTypes,
    });
  },
  isPending: mutation.isPending,
  error: mutation.error,
};
```

**Step 4.5 — Rewrite `mutationFn` to use `ResolvedSaveArgs`:**

```ts
mutationFn: async ({ resolvedCreate, resolvedDelete, context }) => {
  const { itemId } = context;
  if (resolvedDelete.length > 0) {
    await deleteItemIssues(itemId, resolvedDelete);
  }
  if (resolvedCreate.length > 0) {
    await createItemIssues(itemId, resolvedCreate);
  }
},
```

Remove the entire diff-computation block that was previously inside `mutationFn`.

**Step 4.6 — Rewrite `onMutate` to use `ResolvedSaveArgs`:**

The optimistic issues are now built from `resolvedCreate` using the pre-generated `client_id`:

```ts
onMutate: async ({ resolvedCreate, resolvedDelete, context, existingIssues, issueTypes }) => {
  const { itemId } = context;
  const queryKey = itemIssueKeys.byItem(itemId, {
    working_section_id: context.workingSectionId ?? undefined,
    item_category_id: context.itemCategoryId ?? undefined,
  });

  await queryClient.cancelQueries({ queryKey });
  const previousData = queryClient.getQueryData<ListItemIssuesResponse>(queryKey);

  const now = new Date().toISOString();
  const workspaceId =
    existingIssues[0]?.workspace_id ??
    previousData?.item_issues_pagination.items[0]?.workspace_id ??
    "";

  // Keep existing issues that are NOT being deleted, then add the new ones.
  const deletedIds = new Set(resolvedDelete);
  const keptExisting = (previousData?.item_issues_pagination.items ?? []).filter(
    (issue) => !deletedIds.has(issue.client_id),
  );

  const optimisticNew: ItemIssue[] = resolvedCreate.map((issue) => ({
    client_id: issue.client_id,         // ← pre-generated, matches what server will echo back
    workspace_id: workspaceId,
    item_id: itemId,
    step_id: issue.step_id,
    worker_id: issue.worker_id,
    working_section_id: issue.working_section_id,
    item_category_id: issue.item_category_id,
    issue_type_id: issue.issue_type_id,
    issue_type_snapshot: issue.issue_type_snapshot,
    issue_mode_snapshot: issueTypes.find((t) => t.client_id === issue.issue_type_id)?.issue_mode ?? null,
    placement_of_issue_snapshot: issue.placement_of_issue_snapshot,
    intensity: issue.intensity,
    created_at: now,
    updated_at: null,
  }));

  queryClient.setQueryData<ListItemIssuesResponse>(queryKey, {
    item_issues_pagination: {
      items: [...keptExisting, ...optimisticNew],
      limit: 200,
      offset: 0,
      has_more: false,
    },
  });

  return { previousData, queryKey };
},
```

Note: the previous optimistic logic built the full list from `draft`; the new logic keeps non-deleted existing issues and appends new ones. This is more accurate because it no longer rebuilds issues that were unchanged.

**Step 4.7 — `onError` and `onSettled` are unchanged** (they already use `context.queryKey` and the prefix invalidation applied in the previous fix session).

**Step 4.8 — Update `createItemIssues` API function** to include `client_id` in the request body per issue.

File: `packages/item-issues/src/api/create-item-issues.ts`

The function currently sends:
```ts
issues: issues.map((issue) => ({ issue_type_id, step_id, ... intensity }))
```

Update to spread the full `CreateItemIssueInput` including `client_id`:
```ts
issues: issues.map((issue) => ({
  client_id: issue.client_id,           // ← include when present
  issue_type_id: issue.issue_type_id,
  step_id: issue.step_id,
  worker_id: issue.worker_id,
  working_section_id: issue.working_section_id,
  item_category_id: issue.item_category_id,
  issue_type_snapshot: issue.issue_type_snapshot,
  placement_of_issue_snapshot: issue.placement_of_issue_snapshot,
  intensity: issue.intensity,
}))
```

First read the current `create-item-issues.ts` to confirm the exact shape before editing.

---

### Phase 5 — Update `ItemIssueSelectionSheet` for `switch` mode (1 file)

**File: `packages/item-issues/src/pages/ItemIssueSelectionSheet.tsx`**

**Step 5.1 — Update `handleBoxTap`** to accept the full `IssueType` and branch on `issue_mode`:

Replace current `handleBoxTap(issueTypeId: string)` with:
```ts
function handleBoxTap(issueType: IssueType) {
  setDraft((previousDraft) => {
    const current = (previousDraft[issueType.client_id] ?? 0) as IssueIntensity;
    const next: IssueIntensity =
      issueType.issue_mode === "switch"
        ? current > 0 ? 0 : 1
        : cycleIntensity(current);
    return { ...previousDraft, [issueType.client_id]: next };
  });
}
```

Update all `onClick={() => handleBoxTap(issueType.client_id)}` call sites to `onClick={() => handleBoxTap(issueType)}`.

**Step 5.2 — Update box rendering** to branch on `issue_mode`.

Replace the current single box JSX with a conditional:

```tsx
{issueType.issue_mode === "switch" ? (
  // --- SWITCH MODE ---
  <button
    key={issueType.client_id}
    className={cn(
      "relative min-h-24 overflow-hidden rounded-2xl border border-border p-4 text-left transition-colors duration-200",
      intensity > 0 ? "bg-primary" : "bg-card",
    )}
    data-intensity={intensity}
    data-issue-type-id={issueType.client_id}
    data-testid="issue-type-box"
    type="button"
    onClick={() => handleBoxTap(issueType)}
  >
    <span
      aria-hidden="true"
      className={cn(
        "text-sm font-medium",
        intensity > 0 ? "text-card" : "text-card-foreground",
      )}
    >
      {issueType.name}
    </span>
    <span className="sr-only">
      {issueType.name}
      {intensity > 0 ? ", selected" : ""}
    </span>
  </button>
) : (
  // --- GRADED MODE (existing) ---
  <button
    key={issueType.client_id}
    className="relative min-h-24 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left"
    data-intensity={intensity}
    data-issue-type-id={issueType.client_id}
    data-testid="issue-type-box"
    type="button"
    onClick={() => handleBoxTap(issueType)}
  >
    <div
      aria-hidden="true"
      className="absolute inset-y-0 left-0 bg-primary transition-all duration-200 ease-out"
      style={{ width: `${fillPercent}%` }}
    />
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center p-4 text-sm font-medium text-card-foreground"
      style={{ clipPath: `inset(0 0 0 ${fillPercent}%)` }}
    >
      {issueType.name}
    </span>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center p-4 text-sm font-medium text-card"
      style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
    >
      {issueType.name}
    </span>
    <span className="sr-only">
      {issueType.name}
      {intensity > 0 ? `, intensity ${intensity}` : ""}
    </span>
  </button>
)}
```

`fillPercent` is only used by graded mode; `intensity` and `issueType` are already in scope inside the `.map()`.

**Important:** For `switch` mode boxes, no `<div>` fill element, no clip-path spans. Background is controlled directly by the `className` conditional. This avoids the two-text rendering issue seen in graded boxes.

---

## Risks and mitigations

- Risk: Prefix change from `'iis'` to `'iti'` on `ItemIssue` in `@beyo/lib` could break managers-app code that calls `generateClientId('ItemIssue')`.
  Mitigation: Grep confirms no managers-app file calls `generateClientId('ItemIssue')` — the prefix is only consumed by the new workers-app issue save flow (Phase 4). No managers-app breakage.

- Risk: Removing the managers-app local `client-id.ts` breaks a TypeScript path alias that other local modules depend on.
  Mitigation: All 11 import sites are listed explicitly. Typecheck in Phase 2 step before continuing to Phase 3.

- Risk: Pre-generating `client_id` in `saveIssues` wrapper and re-computing in `mutationFn` divergence (e.g., if `mutationFn` still computes its own IDs).
  Mitigation: Phase 4.5 removes the diff computation from `mutationFn` entirely. The mutation uses only `ResolvedSaveArgs`.

- Risk: `issue_mode_snapshot` being null on older item-issue records causes the preview or selection UI to crash.
  Mitigation: `ItemIssueSchema` uses `.catch(null)` so null and unknown values parse cleanly. The selection sheet reads `issue_mode` from `IssueType` (always present, never null), not from the snapshot.

## Validation plan

- `npm run typecheck --workspace=apps/managers-app/ManagerBeyo-app-managers`: zero errors after Phase 2
- `npm run typecheck --workspace=apps/workers-app/ManagerBeyo-app-workers`: zero errors after Phase 5
- Manual: Open workers app, navigate to a step with issue types. Confirm:
  - Graded issue types: tapping cycles 0→1→2→3→0, fill animates left-to-right
  - Switch issue types: tapping toggles full-fill ↔ no-fill, no partial fill possible
  - Saving: confirm network request body includes `client_id` matching `iti_` prefix
  - Optimistic update: issue appears immediately with correct ID without flicker on settlement

## Review log

*(empty — awaiting Copilot execution)*

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
