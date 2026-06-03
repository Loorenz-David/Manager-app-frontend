# PLAN_tasks_pkg_flow_timeline_styled_descriptions_20260602

## Metadata

- Plan ID: `PLAN_tasks_pkg_flow_timeline_styled_descriptions_20260602`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T12:39:28Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Replace the raw `description` string currently rendered in `TaskFlowTimeline` with styled, parsed descriptions dispatched per `type` (and optionally `entity_type`). Three record variants are wired in this plan: `task_step`, `task_step_group`, and `history_record:item_upholstery`. Move `STEP_STATE_VARIANT` from the workers-app into `@beyo/tasks` (packages must not import from apps). Add server-driven pagination with a "Show more" pill that loads 10 records at a time; the parent controls the initial load count via a prop. The renderer registry is designed so future types and entity-type combinations require only a new component + one registry entry — no changes to `TaskFlowTimeline`.
- Business/user intent: The flow timeline is a key audit trail used by both the workers app and the manager app. Styled descriptions make the timeline scannable at a glance. Pagination prevents heavy initial loads on tasks with long histories.
- Non-goals: Styling record types other than the three listed above — infrastructure is set up for extension, others wired later. Real-time live-updates to the timeline (websocket push for new flow records). Infinite scroll — this is a manual load-more button.

## Scope

- In scope:
  - `packages/tasks/src/lib/step-state-variants.ts` (new): `StepState` union type, `STEP_STATE_VARIANT` map, `humanizeStepState` utility.
  - `packages/tasks/src/api/list-task-flow-records.ts` (modify): add `limit` + `offset` query params.
  - `packages/tasks/src/api/task-flow-record-keys.ts` (modify): add `byTaskInfinite` key.
  - `packages/tasks/src/api/use-task-flow-records-infinite-query.ts` (new): `useInfiniteQuery` hook.
  - `packages/tasks/src/components/flow-descriptions/TaskStepFlowDescription.tsx` (new): `type: "task_step"` renderer — username bold, `StatePill` for state, section name bold.
  - `packages/tasks/src/components/flow-descriptions/TaskStepGroupFlowDescription.tsx` (new): `type: "task_step_group"` renderer — username bold, each section name in the list bold.
  - `packages/tasks/src/components/flow-descriptions/ItemUpholsteryHistoryFlowDescription.tsx` (new): `type: "history_record"` + `entity_type: "item_upholstery"` renderer — three sub-patterns (create/update/delete), upholstery name bold + muted, fields bold.
  - `packages/tasks/src/components/flow-descriptions/FlowRecordDescription.tsx` (new): compound-key registry dispatcher — resolves `"type:entity_type"` first, then `"type"`, then plain-text fallback.
  - `packages/tasks/src/components/TaskFlowTimeline.tsx` (modify): `initialLimit` prop, infinite query, `FlowRecordDescription`, show-more pill.
  - `packages/tasks/src/index.ts` (modify): export new lib symbols and new query hook.
  - `apps/workers-app/…/components/detail/TaskStepDetailHeader.tsx` (modify): remove local `STEP_STATE_VARIANT`, import from `@beyo/tasks`.
- Out of scope:
  - Styling other `type`/`entity_type` combinations — infrastructure ready, wiring deferred.
  - Changes to manager-app files — it consumes `TaskFlowTimeline` from the package as-is.
  - Moving `StepStateSchema` (Zod) out of the workers app — only the TypeScript type and variant map move to the package.
- Assumptions:
  - `@beyo/ui` is accessible as a dependency from the tasks package. Verify `packages/tasks/package.json` before Step 5; if missing, add `"@beyo/ui": "workspace:*"`.
  - `apiClient.get` accepts the URL with query string appended as a template literal; `limit` and `offset` are always integers so no encoding is required.
  - All three description formats for `history_record:item_upholstery` match the exact regex patterns defined in Step 6c. If a match fails, the renderer falls back to the raw string.
  - The workers-app `StepState` Zod-derived type is structurally identical to the plain union in the tasks package; TypeScript structural typing makes them compatible.

## Clarifications required

_(none — all details confirmed from source files and user description)_

## Acceptance criteria

1. `type: "task_step"` records render: `username` bold + capitalize, `StatePill` for state with correct variant color, section name bold + capitalize.
2. `type: "task_step_group"` records render: `username` bold + capitalize, each section name in the comma-separated list bold + capitalize.
3. `type: "history_record"` + `entity_type: "item_upholstery"` records render three variants:
   - Create: `username` bold + capitalize, upholstery name bold + capitalize + muted foreground.
   - Update: `username` bold + capitalize, `fields` bold, upholstery name bold + capitalize + muted foreground.
   - Delete: `username` bold + capitalize, upholstery name bold + capitalize + muted foreground.
4. All three renderers fall back to plain raw text when their description string does not match the expected pattern — no crash, no blank output.
5. "Show more" pill appears at the bottom when `flow_records_pagination.has_more === true` and is absent when all records are loaded.
6. Tapping "Show more" appends 10 more records below the existing list without replacing them.
7. `initialLimit` prop on `TaskFlowTimeline` controls the first-page fetch size (default `10`); existing callers that pass no prop continue to work.
8. `STEP_STATE_VARIANT` is removed from `TaskStepDetailHeader.tsx` in the workers app and imported from `@beyo/tasks`; runtime behavior is identical.
9. Adding a renderer for a new `type` or `type:entity_type` combination requires only: (a) a new component in `flow-descriptions/` and (b) one entry in `FLOW_DESCRIPTION_RENDERERS`. No changes to `TaskFlowTimeline` or `FlowRecordDescription`.
10. `npm run typecheck` passes with zero errors across both apps and the tasks package.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: feature component authoring, no logic in components.
- `architecture/05_server_state.md`: `useInfiniteQuery` pattern, `getNextPageParam`, page param shape.
- `architecture/15_feature_structure.md`: file placement inside a package (`api/`, `lib/`, `components/`).

### Local extensions loaded

- `architecture/35_shared_packages.md §13` — packages must not import from apps; package-level exports via `index.ts`.

### File read intent — pattern vs. relational

Permitted relational reads already done:
- `packages/tasks/src/types.ts` — `TaskFlowRecord` has `{ type, entity_type, entity_client_id, description, created_at, created_by }`. Both `type` and `entity_type` are present and string-typed.
- `packages/tasks/src/api/use-task-flow-records-query.ts` — current `useQuery`, no pagination.
- `packages/tasks/src/api/list-task-flow-records.ts` — current API call, no pagination params.
- `packages/tasks/src/api/task-flow-record-keys.ts` — `byTask`, `missing` key shapes.
- `packages/tasks/src/components/TaskFlowTimeline.tsx` — current rendering loop, `onRecordPress`.
- `packages/tasks/src/lib/task-flow-record.ts` — `getFlowActorLabel`, `formatDateTime`.
- `apps/workers-app/…/TaskStepDetailHeader.tsx` — `STEP_STATE_VARIANT` map (lines 27–37) and `StepState` usage.
- `packages/ui/src/…/StatePill.tsx` — `StatePillVariant` type, `StatePill` component.

## Domain schemas consulted

- `packages/tasks/src/types.ts`:
  - `TaskFlowRecord`: `{ type: string, entity_type: string, entity_client_id: string, description: string | null, created_at: string, created_by: … }`
  - Both `type` and `entity_type` are plain strings — no enum constraint at the schema level, so the dispatcher uses string keys.
  - `TaskFlowRecordsPaginationSchema`: `{ has_more, limit, offset }` — already modelled, already parsed.

## Implementation plan

### Step 1 — New `packages/tasks/src/lib/step-state-variants.ts`

Plain TypeScript union type (no Zod — packages do not run runtime validation on their own constants). Defines `STEP_STATE_VARIANT` and `humanizeStepState`.

```ts
import type { StatePillVariant } from "@beyo/ui";

export type StepState =
  | "pending"
  | "working"
  | "paused"
  | "ended_shift"
  | "blocked"
  | "completed"
  | "skipped"
  | "failed"
  | "cancelled";

export const STEP_STATE_VARIANT: Record<StepState, StatePillVariant> = {
  pending: "neutral",
  working: "active",
  paused: "warning",
  ended_shift: "warning",
  blocked: "danger",
  completed: "success",
  skipped: "neutral",
  failed: "danger",
  cancelled: "neutral",
};

export function humanizeStepState(state: StepState | string): string {
  return state.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
```

### Step 2 — Modify `packages/tasks/src/api/list-task-flow-records.ts`

Add `params` with `limit` and `offset`. Default keeps existing callers working.

```ts
export async function listTaskFlowRecords(
  taskId: string,
  params: { limit: number; offset: number } = { limit: 10, offset: 0 },
): Promise<ListTaskFlowRecordsResponse> {
  const { limit, offset } = params;
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records?limit=${limit}&offset=${offset}`,
    ApiEnvelopeSchema(ListTaskFlowRecordsResponseSchema),
  );
  return envelope.data;
}
```

### Step 3 — Modify `packages/tasks/src/api/task-flow-record-keys.ts`

Add `byTaskInfinite` to avoid cache collision between the existing regular `useQuery` and the new `useInfiniteQuery`.

```ts
export const taskFlowRecordKeys = {
  all: ["task-flow-records"] as const,
  byTask: (taskId: string) => [...taskFlowRecordKeys.all, taskId] as const,
  byTaskInfinite: (taskId: string) =>
    [...taskFlowRecordKeys.all, taskId, "infinite"] as const,
  missing: () => [...taskFlowRecordKeys.all, "missing"] as const,
};
```

### Step 4 — New `packages/tasks/src/api/use-task-flow-records-infinite-query.ts`

`useInfiniteQuery` with `pageParam` as an integer offset.

```ts
import { useInfiniteQuery } from "@tanstack/react-query";
import { listTaskFlowRecords } from "./list-task-flow-records";
import { taskFlowRecordKeys } from "./task-flow-record-keys";

type Params = {
  taskId: string | null | undefined;
  pageSize?: number;
};

export function useTaskFlowRecordsInfiniteQuery({ taskId, pageSize = 10 }: Params) {
  return useInfiniteQuery({
    queryKey: taskId
      ? taskFlowRecordKeys.byTaskInfinite(taskId)
      : taskFlowRecordKeys.missing(),
    queryFn: ({ pageParam }) => {
      if (!taskId) throw new Error("taskId is required");
      return listTaskFlowRecords(taskId, {
        limit: pageSize,
        offset: pageParam as number,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.flow_records_pagination.has_more
        ? lastPage.flow_records_pagination.offset +
          lastPage.flow_records_pagination.limit
        : undefined,
    enabled: Boolean(taskId),
  });
}
```

### Step 5a — New `packages/tasks/src/components/flow-descriptions/TaskStepFlowDescription.tsx`

Handles `type: "task_step"`.

Description pattern: `"{username} marked {state} on working section {section_name}"`

```tsx
import { StatePill } from "@beyo/ui";
import {
  STEP_STATE_VARIANT,
  humanizeStepState,
  type StepState,
} from "../../lib/step-state-variants";

const RE = /^(.+?) marked (.+?) on working section (.+)$/;

export function TaskStepFlowDescription({
  description,
}: {
  description: string;
}): React.JSX.Element {
  const match = RE.exec(description);

  if (!match) return <span>{description}</span>;

  const [, username, rawState, sectionName] = match;
  const variant = STEP_STATE_VARIANT[rawState as StepState] ?? "neutral";

  return (
    <span>
      <span className="font-bold capitalize">{username}</span>
      {" marked "}
      <StatePill label={humanizeStepState(rawState)} variant={variant} />
      {" on working section "}
      <span className="font-bold capitalize">{sectionName}</span>
    </span>
  );
}
```

### Step 5b — New `packages/tasks/src/components/flow-descriptions/TaskStepGroupFlowDescription.tsx`

Handles `type: "task_step_group"`.

Description pattern: `"{username} assigned to working sections {section1, section2, …}"`

Sections are comma-separated. Each is rendered bold + capitalize. They are joined back with `", "` as plain text between the bold spans.

```tsx
const RE = /^(.+?) assigned to working sections (.+)$/;

export function TaskStepGroupFlowDescription({
  description,
}: {
  description: string;
}): React.JSX.Element {
  const match = RE.exec(description);

  if (!match) return <span>{description}</span>;

  const [, username, sectionsPart] = match;
  const sections = sectionsPart.split(/,\s*/);

  return (
    <span>
      <span className="font-bold capitalize">{username}</span>
      {" assigned to working sections "}
      {sections.map((section, index) => (
        <span key={index}>
          <span className="font-bold capitalize">{section.trim()}</span>
          {index < sections.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  );
}
```

### Step 5c — New `packages/tasks/src/components/flow-descriptions/ItemUpholsteryHistoryFlowDescription.tsx`

Handles `type: "history_record"` + `entity_type: "item_upholstery"`.

Three sub-patterns tried in order; first match wins; unmatched falls back to plain text.

The upholstery name is wrapped in single quotes by the backend (`'Velvet Blue'`). The quotes are matched by the regex but excluded from the capture group, so the rendered text contains no quotes.

Styling rules:
- `username`: `font-bold capitalize` (foreground, same as other renderers)
- `upholsteryName`: `font-bold capitalize text-muted-foreground` (muted tone as specified)
- `fields`: `font-bold` (foreground, no special tone)

```tsx
const CREATE_RE = /^(.+?) added a upholstery '(.+?)' to item$/;
const UPDATE_RE = /^(.+?) updated (.+?) on upholstery '(.+?)'$/;
const DELETE_RE = /^(.+?) deleted a upholstery '(.+?)' from item$/;

function BoldName({ children }: { children: React.ReactNode }) {
  return <span className="font-bold capitalize">{children}</span>;
}

function MutedBoldName({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold capitalize text-muted-foreground">
      {children}
    </span>
  );
}

function BoldFields({ children }: { children: React.ReactNode }) {
  return <span className="font-bold">{children}</span>;
}

export function ItemUpholsteryHistoryFlowDescription({
  description,
}: {
  description: string;
}): React.JSX.Element {
  const createMatch = CREATE_RE.exec(description);
  if (createMatch) {
    const [, username, upholsteryName] = createMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" added a upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
        {" to item"}
      </span>
    );
  }

  const updateMatch = UPDATE_RE.exec(description);
  if (updateMatch) {
    const [, username, fields, upholsteryName] = updateMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" updated "}
        <BoldFields>{fields}</BoldFields>
        {" on upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
      </span>
    );
  }

  const deleteMatch = DELETE_RE.exec(description);
  if (deleteMatch) {
    const [, username, upholsteryName] = deleteMatch;
    return (
      <span>
        <BoldName>{username}</BoldName>
        {" deleted a upholstery "}
        <MutedBoldName>{upholsteryName}</MutedBoldName>
        {" from item"}
      </span>
    );
  }

  return <span>{description}</span>;
}
```

The three small sub-components (`BoldName`, `MutedBoldName`, `BoldFields`) live in the same file — they are rendering helpers, not exported components.

### Step 6 — New `packages/tasks/src/components/flow-descriptions/FlowRecordDescription.tsx`

**Compound-key dispatch**: the registry is keyed by `"type"` or `"type:entity_type"`. When resolving, the dispatcher tries the compound key first (most specific), then falls back to the type-only key, then to plain text.

This covers both cases:
- `task_step` and `task_step_group` — keyed by `type` alone (their `entity_type` is not significant for styling).
- `history_record:item_upholstery` — keyed by the compound because `history_record` alone has no style; the `entity_type` is the meaningful discriminant.

Adding a new renderer for any future `type` or `type:entity_type` pair is a one-line addition to `FLOW_DESCRIPTION_RENDERERS`. No other file changes needed.

```tsx
import type { TaskFlowRecord } from "../../types";
import { TaskStepFlowDescription } from "./TaskStepFlowDescription";
import { TaskStepGroupFlowDescription } from "./TaskStepGroupFlowDescription";
import { ItemUpholsteryHistoryFlowDescription } from "./ItemUpholsteryHistoryFlowDescription";

type DescriptionRenderer = (description: string) => React.ReactNode;

const FLOW_DESCRIPTION_RENDERERS: Partial<Record<string, DescriptionRenderer>> =
  {
    // type-only keys
    task_step: (d) => <TaskStepFlowDescription description={d} />,
    task_step_group: (d) => <TaskStepGroupFlowDescription description={d} />,
    // compound type:entity_type keys
    "history_record:item_upholstery": (d) => (
      <ItemUpholsteryHistoryFlowDescription description={d} />
    ),
    // future entries follow the same pattern:
    // "history_record:task_step_group": (d) => <…>,
    // "task_state": (d) => <…>,
  };

type Props = { record: TaskFlowRecord };

export function FlowRecordDescription({ record }: Props): React.JSX.Element {
  if (record.description == null) {
    return <span>{record.type}</span>;
  }

  const compoundKey = `${record.type}:${record.entity_type}`;
  const renderer =
    FLOW_DESCRIPTION_RENDERERS[compoundKey] ??
    FLOW_DESCRIPTION_RENDERERS[record.type];

  if (renderer) {
    return <>{renderer(record.description)}</>;
  }

  return <span>{record.description}</span>;
}
```

### Step 7 — Modify `packages/tasks/src/components/TaskFlowTimeline.tsx`

Changes:
1. Add `initialLimit?: number` prop (default `10`).
2. Replace `useTaskFlowRecordsQuery` → `useTaskFlowRecordsInfiniteQuery`.
3. Flatten `data.pages` to derive the sorted list.
4. Replace `{record.description ?? record.type}` → `<FlowRecordDescription record={record} />`.
5. Add "Show more" pill below the list when `query.hasNextPage`.

```tsx
import { cn } from "@beyo/lib";
import { SectionLabel } from "@beyo/ui";

import { useTaskFlowRecordsInfiniteQuery } from "../api/use-task-flow-records-infinite-query";
import { formatDateTime, getFlowActorLabel } from "../lib/task-flow-record";
import { FlowRecordDescription } from "./flow-descriptions/FlowRecordDescription";

type TaskFlowTimelineProps = {
  taskId: string;
  onRecordPress: (entityClientId: string) => void;
  initialLimit?: number;
};

export function TaskFlowTimeline({
  taskId,
  onRecordPress,
  initialLimit = 10,
}: TaskFlowTimelineProps): React.JSX.Element {
  const query = useTaskFlowRecordsInfiniteQuery({
    taskId,
    pageSize: initialLimit,
  });

  const allRecords = (query.data?.pages ?? []).flatMap(
    (page) => page.flow_records,
  );

  const sorted = [...allRecords].sort(
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
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : query.isError ? (
        <p className="text-sm text-muted-foreground">
          Could not load timeline.
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No flow records yet.</p>
      ) : (
        <>
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
                        isMostRecent ? "bg-primary" : "bg-(--color-border)",
                      )}
                    />
                    {!isLast ? (
                      <div className="mt-1 w-px flex-1 bg-(--color-border)" />
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
                      <FlowRecordDescription record={record} />
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

          {query.hasNextPage ? (
            <div className="flex justify-center">
              <button
                type="button"
                className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm disabled:opacity-50"
                data-testid="task-flow-timeline-show-more"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage ? "Loading…" : "Show more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
```

### Step 8 — Modify `packages/tasks/src/index.ts`

Add to existing exports (keep all existing exports unchanged):

```ts
export type { StepState } from "./lib/step-state-variants";
export { STEP_STATE_VARIANT, humanizeStepState } from "./lib/step-state-variants";
export { useTaskFlowRecordsInfiniteQuery } from "./api/use-task-flow-records-infinite-query";
```

### Step 9 — Modify `apps/workers-app/…/components/detail/TaskStepDetailHeader.tsx`

Remove the local `STEP_STATE_VARIANT` block (current lines 27–37) and add an import from `@beyo/tasks`.

```ts
// Remove:
const STEP_STATE_VARIANT: Record<StepState, StatePillVariant> = {
  pending: "neutral",
  working: "active",
  paused: "warning",
  ended_shift: "warning",
  blocked: "danger",
  completed: "success",
  skipped: "neutral",
  failed: "danger",
  cancelled: "neutral",
};

// Add to imports:
import { STEP_STATE_VARIANT } from "@beyo/tasks";
```

The local `StepState` import (`from "../../types"`) is kept — the workers app still derives it from Zod for runtime validation. The package's `STEP_STATE_VARIANT` is `Record<tasks.StepState, StatePillVariant>` and the workers-app `vm.state` is typed as `workers.StepState`. The two types are structurally identical, so TypeScript accepts the key lookup without a cast.

If TypeScript raises a type error due to nominal incompatibility (unlikely), use:
```ts
STEP_STATE_VARIANT[vm.state as import("@beyo/tasks").StepState]
```

## Renderer extension guide (for future types)

To add styling for a new record type or entity-type combination:

1. Create `packages/tasks/src/components/flow-descriptions/<Name>FlowDescription.tsx`.
2. Add one entry to `FLOW_DESCRIPTION_RENDERERS` in `FlowRecordDescription.tsx`:
   - Type-only: `"my_type": (d) => <MyTypeFlowDescription description={d} />`
   - Compound: `"history_record:my_entity": (d) => <MyEntityHistoryFlowDescription description={d} />`
3. No other files need to change.

## Risks and mitigations

- Risk: `@beyo/ui` is not in `packages/tasks/package.json`, causing the `StatePill` import to fail.
  Mitigation: Check before Step 5a. If missing, add `"@beyo/ui": "workspace:*"` to `dependencies`.

- Risk: `apiClient.get` does not accept query-string params appended to the URL.
  Mitigation: Verify against `@beyo/api-client` exports. If a `params` object is supported, prefer it. The template-literal fallback is safe since both values are integers.

- Risk: `UPDATE_RE` could capture the wrong group if the field list contains the substring ` on upholstery '`.
  Mitigation: The lazy `(.+?)` for the fields group stops at the first occurrence of ` on upholstery '`. Because the upholstery name is now delimited by single quotes, the boundary ` on upholstery '` is unambiguous — a field name cannot contain that exact sequence. If the backend ever sends a malformed string the fallback renders raw text.

- Risk: Sorting the full flattened list on every render as records accumulate is O(n log n).
  Mitigation: Acceptable — timelines are bounded by task lifespan, rarely exceed 50 records. If profiling shows it matters, use a merge-sorted accumulator inside `useMemo`.

- Risk: Workers-app `StepState` and tasks-package `StepState` drift if a new state is added to the Zod schema without updating the package.
  Mitigation: Add a `satisfies` constraint in the workers app: `StepStateSchema satisfies z.ZodType<import("@beyo/tasks").StepState>` to catch drift at typecheck time.

## Validation plan

- `npm run typecheck` (workers app + managers app + tasks package): zero errors.
- Visual — `task_step`: bold username, `StatePill` with correct variant color, bold section name.
- Visual — `task_step_group`: bold username, each section name bold and comma-separated.
- Visual — `history_record:item_upholstery`: all three sub-patterns (create/update/delete) render with muted bold upholstery name and bold fields.
- Visual — unknown type: raw description string rendered without crash.
- Visual — "Show more" pill: appears when `has_more: true`, shows "Loading…" while fetching, disappears after last page.
- Visual — `TaskStepDetailHeader`: state pill colors unchanged after `STEP_STATE_VARIANT` moves to the package.

## Review log

- (empty)

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
