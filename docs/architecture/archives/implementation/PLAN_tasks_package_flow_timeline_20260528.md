# PLAN_tasks_package_flow_timeline_20260528

## Metadata

- Plan ID: `PLAN_tasks_package_flow_timeline_20260528`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-28T18:00:00Z`
- Last updated at (UTC): `2026-05-28T16:43:58Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Extract the `TaskFlowTimeline` feature (types, API fn, query hook, formatting helpers, and component) from the managers app into a new shared `@beyo/tasks` package. Wire the package into the managers app as its first `@beyo/*` consumer, replacing the local files.
- Business/user intent: The flow timeline is a standalone, self-fetching UI unit. Moving it to a shared package makes it available to both apps, removes the context dependency (the component currently reads from `TaskDetailContext`), and establishes the pattern for progressively migrating all task-related shared logic.
- Non-goals: Workers app adoption (workers app has no `TaskFlowTimeline` usage yet — it gains access but doesn't render the component in this plan). Full migration of `task-detail.ts` lib. Any task mutations, create/update/delete flows.

## Scope

- In scope:
  - Create `packages/tasks/` — full scaffold: types, query key, API fn, query hook, formatting helpers, `TaskFlowTimeline` component
  - Pre-requisite: export `SectionLabel` from `@beyo/ui/src/index.ts` (currently in the primitive shared folder but not in the barrel)
  - Managers app: add `@beyo/tasks`, `@beyo/ui`, `@beyo/lib` dependencies; add `@source` directives; replace `<TaskFlowTimeline />` usage; delete local `TaskFlowTimeline.tsx`; clean up orphaned context fields (`flowRecords`, `isFlowPending`) from the controller and context
  - `npm install` from `frontend/` root after all `package.json` changes
- Out of scope:
  - Migrating the rest of `task-detail.ts` (date utilities, state/priority labels — those are used by many other managers app components and require a separate plan)
  - Workers app rendering `TaskFlowTimeline` (access is established, adoption is deferred)
  - `TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID` surface and its page — those stay in the managers app

## Clarifications required

- (none — scope is fully defined from relational reads)

## Acceptance criteria

1. `npm run typecheck` (managers app) reports zero TypeScript errors.
2. `npm run typecheck` (workers app) reports zero TypeScript errors.
3. The managers app task detail page renders the flow timeline identically to before migration.
4. Clicking a flow record row still opens the flow record sheet (surface navigation unchanged).
5. `apps/managers-app/.../features/tasks/components/detail/TaskFlowTimeline.tsx` no longer exists.
6. `TaskDetailController` no longer exposes `flowRecords` or `isFlowPending` (those fields are orphaned after the component becomes self-fetching).
7. `node_modules/@beyo/tasks` is a symlink to `packages/tasks`.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo and layer rules
- `architecture/02_types.md`: branded ID types, Zod conventions
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.get()`, `ApiEnvelopeSchema`, flat error shape
- `architecture/05_server_state.md`: TanStack Query hook structure
- `architecture/07_components.md`: component consumes props, not context (for shared packages — context belongs to apps)
- `architecture/08_hooks.md`: query hook pattern
- `architecture/15_feature_structure.md`: folder layout inside `src/`
- `architecture/24_dto.md`: response schema → typed output
- `architecture/35_shared_packages.md`: package scaffold, peer deps, `@source` directives, migration cycle

### Local extensions loaded

- `architecture/04_api_client_local.md`: `ApiEnvelopeSchema` wraps all responses; error is a flat string

### File read intent — pattern vs. relational

Permitted relational reads performed:
- `features/tasks/components/detail/TaskFlowTimeline.tsx` — component source being extracted
- `features/tasks/api/list-task-flow-records.ts` — API fn being extracted
- `features/tasks/api/use-task-flow-records-query.ts` — query hook being extracted
- `features/tasks/api/task-keys.ts` — confirmed existing key structure; package uses independent keys
- `features/tasks/lib/task-detail.ts` — identified `formatDateTime` and `getFlowActorLabel` as the two helpers used by the component
- `features/tasks/controllers/use-task-detail.controller.ts` — identified `flowRecords` and `isFlowPending` as orphaned fields after migration
- `features/tasks/flows/use-task-detail.flow.ts` — confirmed `openFlowRecord` wires to `useSurface`; safe to pass as a prop
- `pages/tasks/TaskDetailSlidePage.tsx` — the single render site of `TaskFlowTimeline`; confirmed `taskId` is accessible via `useTaskDetailContext()`
- `packages/ui/src/components/primitives/shared/index.ts` — confirmed `SectionLabel` exists in the package but is NOT in `packages/ui/src/index.ts` barrel
- `packages/cases/package.json` + `tsconfig.json` — confirmed package scaffold template
- `apps/managers-app/.../package.json` — confirmed zero `@beyo/*` deps; this plan establishes the first one
- `apps/managers-app/.../src/index.css` — confirmed no `@source` directives exist yet

### Skill selection

- Primary skill: none (data + component extraction, no new surfaces or forms)

---

## Implementation plan

### Phase 0 — Pre-requisite: export `SectionLabel` from `@beyo/ui`

**Step 1 — Add `SectionLabel` to `packages/ui/src/index.ts`**

`SectionLabel` is already implemented in `packages/ui/src/components/primitives/shared/SectionLabel.tsx` and exported from `packages/ui/src/components/primitives/shared/index.ts`. It is missing from the top-level barrel.

In `packages/ui/src/index.ts`, add:
```ts
export { SectionLabel } from "./components/primitives/shared/SectionLabel";
```

---

### Phase 1 — Create `packages/tasks/`

**Step 2 — Create `packages/tasks/package.json`**

```json
{
  "name": "@beyo/tasks",
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
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=19.0.0",
    "zod": ">=4.0.0"
  }
}
```

**Step 3 — Create `packages/tasks/tsconfig.json`**

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

**Step 4 — Create `packages/tasks/src/types.ts`**

Zod schemas and TypeScript types extracted from `features/tasks/types.ts` — only the flow record subset:

```ts
import { z } from "zod";

export const TaskFlowRecordActorSchema = z.object({
  client_id: z.string(),
  username: z.string().nullable(),
  profile_picture: z.string().nullable(),
});
export type TaskFlowRecordActor = z.infer<typeof TaskFlowRecordActorSchema>;

export const TaskFlowRecordSchema = z.object({
  type: z.string(),
  entity_type: z.string(),
  entity_client_id: z.string(),
  description: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  created_by: TaskFlowRecordActorSchema.nullable(),
});
export type TaskFlowRecord = z.infer<typeof TaskFlowRecordSchema>;

export const ListTaskFlowRecordsResponseSchema = z.object({
  flow_records: z.array(TaskFlowRecordSchema),
  flow_records_pagination: z.object({
    has_more: z.boolean(),
    limit: z.number().int(),
    offset: z.number().int(),
  }),
});
export type ListTaskFlowRecordsResponse = z.infer<
  typeof ListTaskFlowRecordsResponseSchema
>;
```

**Step 5 — Create `packages/tasks/src/api/task-flow-record-keys.ts`**

Independent key factory — not nested under `taskKeys.detail()` from the managers app. Packages must not depend on app-level query keys.

```ts
export const taskFlowRecordKeys = {
  all: ["task-flow-records"] as const,
  byTask: (taskId: string) =>
    [...taskFlowRecordKeys.all, taskId] as const,
};
```

**Step 6 — Create `packages/tasks/src/api/list-task-flow-records.ts`**

```ts
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { ListTaskFlowRecordsResponseSchema, type ListTaskFlowRecordsResponse } from "../types";

export async function listTaskFlowRecords(
  taskId: string,
): Promise<ListTaskFlowRecordsResponse> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records`,
    ApiEnvelopeSchema(ListTaskFlowRecordsResponseSchema),
  );
  return envelope.data;
}
```

**Step 7 — Create `packages/tasks/src/api/use-task-flow-records-query.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { taskFlowRecordKeys } from "./task-flow-record-keys";
import { listTaskFlowRecords } from "./list-task-flow-records";

export function useTaskFlowRecordsQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? taskFlowRecordKeys.byTask(taskId)
      : [...taskFlowRecordKeys.all, "missing"],
    queryFn: () => {
      if (!taskId) throw new Error("taskId is required");
      return listTaskFlowRecords(taskId);
    },
    enabled: Boolean(taskId),
  });
}
```

**Step 8 — Create `packages/tasks/src/lib/task-flow-record.ts`**

Only the two helpers used by `TaskFlowTimeline`. The rest of `task-detail.ts` stays in the managers app.

```ts
import type { TaskFlowRecord } from "../types";

export function getFlowActorLabel(record: TaskFlowRecord): string {
  return record.created_by?.username ?? "System";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
```

**Step 9 — Create `packages/tasks/src/components/TaskFlowTimeline.tsx`**

**Critical API change from the original:** the component no longer reads from `TaskDetailContext`. It is now self-contained: it owns its data fetching via `useTaskFlowRecordsQuery` and delegates action callbacks to the caller via props. This makes the component portable across both apps and any context structure.

```tsx
import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";
import { useTaskFlowRecordsQuery } from "../api/use-task-flow-records-query";
import { formatDateTime, getFlowActorLabel } from "../lib/task-flow-record";

type TaskFlowTimelineProps = {
  taskId: string;
  onRecordPress: (entityClientId: string) => void;
};

export function TaskFlowTimeline({
  taskId,
  onRecordPress,
}: TaskFlowTimelineProps): React.JSX.Element {
  const query = useTaskFlowRecordsQuery(taskId);

  const sorted = [...(query.data?.flow_records ?? [])].sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );

  return (
    <div
      className="mt-7 flex flex-col gap-3"
      data-testid="task-detail-flow-section"
    >
      <SectionLabel as="h3" tone="muted">
        Flow timeline
      </SectionLabel>

      {query.isPending ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          Loading timeline…
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          No flow records yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {sorted.map((record, index) => {
            const isMostRecent = index === 0;
            const isLast = index === sorted.length - 1;

            return (
              <button
                key={`${record.entity_client_id}-${record.created_at}`}
                className="flex w-full gap-0 text-left"
                type="button"
                onClick={() => onRecordPress(record.entity_client_id)}
              >
                <div className="relative mr-3 flex w-4 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "mt-0.5 h-3 w-3 shrink-0 rounded-full",
                      isMostRecent
                        ? "bg-primary"
                        : "bg-[color:var(--color-border)]",
                    )}
                  />
                  {!isLast ? (
                    <div className="mt-1 w-px flex-1 bg-[color:var(--color-border)]" />
                  ) : null}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                  <p
                    className={cn(
                      "text-sm",
                      isMostRecent
                        ? "text-foreground"
                        : "text-foreground/75",
                    )}
                  >
                    {record.description ?? record.type}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {getFlowActorLabel(record)} ·{" "}
                    {formatDateTime(record.created_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 10 — Create `packages/tasks/src/index.ts`**

```ts
export type {
  TaskFlowRecord,
  TaskFlowRecordActor,
  ListTaskFlowRecordsResponse,
} from "./types";
export {
  TaskFlowRecordSchema,
  TaskFlowRecordActorSchema,
  ListTaskFlowRecordsResponseSchema,
} from "./types";
export { taskFlowRecordKeys } from "./api/task-flow-record-keys";
export { listTaskFlowRecords } from "./api/list-task-flow-records";
export { useTaskFlowRecordsQuery } from "./api/use-task-flow-records-query";
export { formatDateTime, getFlowActorLabel } from "./lib/task-flow-record";
export { TaskFlowTimeline } from "./components/TaskFlowTimeline";
```

---

### Phase 2 — `npm install`

**Step 11 — Run `npm install` from `frontend/`**

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify: `node_modules/@beyo/tasks` is a symlink to `packages/tasks`.

---

### Phase 3 — Managers app adoption (Step 5 of migration cycle)

**Step 12 — Add dependencies to managers app `package.json`**

The managers app currently has zero `@beyo/*` dependencies. This step establishes the first three:

```json
"@beyo/lib": "*",
"@beyo/ui": "*",
"@beyo/tasks": "*"
```

Add all three under `"dependencies"`.

Then re-run:
```bash
npm install
```

**Step 13 — Add `@source` directives to managers app `index.css`**

`@beyo/ui` and `@beyo/tasks` both contain `.tsx` files with `className` strings. Tailwind v4 excludes `node_modules` (including workspace symlinks) from scanning. Add both `@source` lines:

```css
@source "../../../../packages/ui/src";
@source "../../../../packages/tasks/src";
```

Place them after the existing `@import "tailwindcss";` line. The exact relative path depends on the location of `index.css` relative to `packages/`. Adjust if the managers app `index.css` is at a different depth from `frontend/`.

**Step 14 — Replace `<TaskFlowTimeline />` in `TaskDetailSlidePage.tsx`**

Current:
```tsx
import { TaskFlowTimeline, ... } from "@/features/tasks/components/detail";
// ...
<TaskFlowTimeline />
```

Replace with:
```tsx
import { TaskFlowTimeline } from "@beyo/tasks";
// ...
const { taskId, openFlowRecord } = useTaskDetailContext();
// ...
<TaskFlowTimeline
  taskId={taskId}
  onRecordPress={openFlowRecord}
/>
```

`openFlowRecord` is already defined on the controller (calls `surface.open(TASK_DETAIL_FLOW_RECORD_SHEET_SURFACE_ID, ...)`). It satisfies `(entityClientId: string) => void` without modification.

**Step 15 — Delete local `TaskFlowTimeline.tsx` and clean its re-exports**

Remove:
- `apps/managers-app/.../features/tasks/components/detail/TaskFlowTimeline.tsx`
- Remove `TaskFlowTimeline` from `apps/managers-app/.../features/tasks/components/detail/index.ts`
- Remove `TaskFlowTimeline` from `apps/managers-app/.../features/tasks/index.ts`

**Step 16 — Remove orphaned fields from the controller and context**

`flowRecords` and `isFlowPending` in `use-task-detail.controller.ts` were only consumed by `TaskFlowTimeline`. After the component self-fetches, these fields are orphaned.

In `use-task-detail.controller.ts`:
- Remove `useTaskFlowRecordsQuery` import
- Remove `const flowRecordsQuery = useTaskFlowRecordsQuery(taskId);`
- Remove `flowRecords: flowRecordsQuery.data?.flow_records ?? []` from the return object
- Remove `isFlowPending: flowRecordsQuery.isPending` from the return object

`openFlowRecord` on the controller is still used — it is now passed as a prop to the component, so it stays.

After removing those two fields, also remove:
- `list-task-flow-records.ts` from the managers app `api/` folder (API fn is now in the package)
- `use-task-flow-records-query.ts` from the managers app `api/` folder (query hook is now in the package)
- Their imports from any managers app files

---

### Phase 4 — Validation

**Step 17 — Type-check both apps**

```bash
npx tsc --noEmit -p apps/managers-app/ManagerBeyo-app-managers/tsconfig.app.json
npx tsc --noEmit -p apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json
```

Zero errors expected in both.

**Step 18 — Manual smoke test (managers app)**

1. Open a task detail slide.
2. Flow timeline section renders with "Flow timeline" heading.
3. Records are sorted newest-first.
4. Tapping a record row opens the flow record sheet (surface unchanged).
5. No visual regression on the timeline layout or colours.

## Risks and mitigations

- Risk: `SectionLabel` not exported from `@beyo/ui` barrel → TypeScript error in package.
  Mitigation: Step 1 adds it. Must be done before Step 9.

- Risk: Managers app `@source` paths are wrong (wrong relative depth to `packages/`).
  Mitigation: Verify `index.css` location relative to `frontend/` root. Standard layout is `apps/managers-app/<app-name>/src/index.css` → relative path to `packages/` is `../../../../packages/`.

- Risk: `taskFlowRecordKeys.byTask(taskId)` is a different key shape from the old `[...taskKeys.detail(taskId), 'flow-records']`. Any managers app code that calls `queryClient.invalidateQueries({ queryKey: [...taskKeys.detail(taskId), 'flow-records'] })` will no longer invalidate the flow records cache after migration.
  Mitigation: Grep for `flow-records` in `queryClient.invalidateQueries` calls. If found, update to use `taskFlowRecordKeys.byTask(taskId)` from the package.

- Risk: `openFlowRecord` on the controller uses `surface.open(...)` from `useSurface`. The surface system is app-specific — correct. The package component takes it as a plain callback prop and has no knowledge of surfaces. This is the correct boundary.

## Validation plan

- `npx tsc --noEmit -p apps/managers-app/ManagerBeyo-app-managers/tsconfig.app.json`: zero errors
- `npx tsc --noEmit -p apps/workers-app/ManagerBeyo-app-workers/tsconfig.app.json`: zero errors
- Manual: task detail flow timeline renders and navigates correctly in the managers app

## Review log

- `2026-05-28` `claude-sonnet-4-6`: initial plan authored
- `2026-05-28` `GitHub Copilot`: implementation completed, summary and archive records written, plan archived

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `GitHub Copilot`
