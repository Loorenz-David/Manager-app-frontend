# PLAN_worker_task_detail_ui_rework_20260626

## Metadata

- Plan ID: `PLAN_worker_task_detail_ui_rework_20260626`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-25T22:50:17Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Two connected UI improvements across the `@beyo/tasks` package and the workers app.
  1. `TaskScheduledDeliverySection` (shared package, used in manager app) must hide the delivery window pill when `task.task_type === "internal"`.
  2. Worker app `TaskDetailSlidePage`: add a new plain category+position row (no bg, no border) directly after `TaskStepImagesPreview`.
  3. Worker app `TaskStepItemDetailsSection`: remove position and category pills; replace with read-only ready-by and delivery-window date pills. Delivery window pill hidden for internal tasks.

- **Business/user intent:** Workers see task schedule context inline without needing to open a nested sheet. Internal tasks don't have a scheduled delivery window — showing the pill for them is confusing and must be suppressed in all apps. Item category and position move to a dedicated row above the dates to keep spatial separation clear.

- **Non-goals:**
  - Workers do not edit dates — no mutation, no sheet open on pill tap.
  - No change to manager app flow or manager date sheet pages (those are covered by `PLAN_task_date_direct_calendar_20260626`).
  - No new API endpoints or backend changes.

## Scope

- In scope:
  - `packages/tasks/src/components/detail/TaskReadyByAtPill.tsx` — make `onPress` optional
  - `packages/tasks/src/components/detail/TaskScheduledDeliveryDatePill.tsx` — make `onPress` optional
  - `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` — hide delivery pill for internal tasks
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts` — extend `TaskSnapshotSchema`
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` — add category+position row
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx` — replace position/category with date pills

- Out of scope:
  - Manager app controller, flow, sheet pages
  - `packages/tasks/src/index.ts` — `TaskReadyByAtPill` and `TaskScheduledDeliveryDatePill` are already exported (lines 85–86); do not change the index

- Assumptions:
  - The backend already returns `scheduled_start_at` and `scheduled_end_at` inside the task snapshot embedded in working-section step responses — they just haven't been added to the Zod schema yet.
  - `TaskReadyByAtPill` and `TaskScheduledDeliveryDatePill` are already exported from `@beyo/tasks` — verified at lines 85–86 of `packages/tasks/src/index.ts`.

## Clarifications required

None — all decisions are made.

## Acceptance criteria

1. `TaskScheduledDeliverySection` renders the delivery window pill only when `task.task_type !== "internal"`.
2. `TaskReadyByAtPill` and `TaskScheduledDeliveryDatePill` render non-interactive (`<span>`) when `onPress` is not provided.
3. Workers app `TaskDetailSlidePage` shows a plain row (no border, no background) between `TaskStepImagesPreview` and `TaskStepItemDetailsSection` containing item category on the left and item position on the right. Position is tappable and opens the position sheet for seat items.
4. Workers app `TaskStepItemDetailsSection` shows ready-by and delivery-window date pills (read-only). Delivery window pill is hidden when `step.task.task_type === "internal"`.
5. Workers app `TaskStepItemDetailsSection` no longer renders the item position pill or the item category pill.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- Architecture contracts apply as normal.

### File read intent — pattern vs. relational

Permitted reads (understanding what exists):
- Reading `TaskReadyByAtPill.tsx` and `TaskScheduledDeliveryDatePill.tsx` to understand current `onPress` prop shape before making it optional.
- Reading `TaskScheduledDeliverySection.tsx` to see where `TaskScheduledDeliveryDatePill` is rendered.
- Reading workers app `types.ts` to find `TaskSnapshotSchema` and add the missing date fields.
- Reading `TaskStepItemDetailsSection.tsx` to see exact structure before rewriting.
- Reading `TaskDetailSlidePage.tsx` (workers) to find the insertion point for the new row.
- Reading `TaskBodyCategoryRow.tsx` in `@beyo/tasks` as reference for the category+position row pattern.

Prohibited reads (pattern reads — contract already covers):
- Reading another action hook to understand optimistic update shape → `08_hooks.md`
- Reading another query hook for TanStack Query setup → `05_server_state.md`

### Skill selection

- Primary skill: general implementation
- No special skill required

## Implementation plan

### Step 1 — Make `onPress` optional in `TaskReadyByAtPill`

File: `packages/tasks/src/components/detail/TaskReadyByAtPill.tsx`

Current type:
```ts
type TaskReadyByAtPillProps = {
  readyByAt: string | null;
  onPress: () => void;
};
```

Change to:
```ts
type TaskReadyByAtPillProps = {
  readyByAt: string | null;
  onPress?: () => void;
};
```

Current implementation always renders a `<button>`. Change so that when `onPress` is undefined, render a `<span>` wrapper instead:

```tsx
export function TaskReadyByAtPill({
  readyByAt,
  onPress,
}: TaskReadyByAtPillProps): React.JSX.Element {
  const label = formatShortDate(readyByAt) ?? "—";

  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Ready by</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-ready-by-pill"
          type="button"
          onClick={onPress}
        >
          {pill}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Ready by</EyebrowLabel>
      <span data-testid="task-ready-by-pill">{pill}</span>
    </div>
  );
}
```

Existing callers in manager app pass `onPress` — behaviour is unchanged for them.

---

### Step 2 — Make `onPress` optional in `TaskScheduledDeliveryDatePill`

File: `packages/tasks/src/components/detail/TaskScheduledDeliveryDatePill.tsx`

Current type:
```ts
type TaskScheduledDeliveryDatePillProps = {
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  onPress: () => void;
};
```

Change to:
```ts
type TaskScheduledDeliveryDatePillProps = {
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  onPress?: () => void;
};
```

Apply the same interactive/non-interactive split as in Step 1. When `onPress` is undefined, render a `<span>` around the `InfoPill` instead of a `<button>`.

```tsx
export function TaskScheduledDeliveryDatePill({
  scheduledStartAt,
  scheduledEndAt: _scheduledEndAt,
  onPress,
}: TaskScheduledDeliveryDatePillProps): React.JSX.Element {
  const week = isoWeek(scheduledStartAt);
  const label = week === null ? "—" : `Week ${week}`;

  const pill = <InfoPill>{label}</InfoPill>;

  if (onPress) {
    return (
      <div className="flex flex-col gap-1.5">
        <EyebrowLabel>Delivery window</EyebrowLabel>
        <button
          className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-delivery-window-pill"
          type="button"
          onClick={onPress}
        >
          {pill}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <EyebrowLabel>Delivery window</EyebrowLabel>
      <span data-testid="task-delivery-window-pill">{pill}</span>
    </div>
  );
}
```

> **PRESERVE:** `isoWeek` must be imported from `@beyo/lib` — NOT from `../../lib/task-detail`. This correction was already applied to the working tree; Codex must NOT revert it.

---

### Step 3 — Hide delivery window pill for internal tasks in `TaskScheduledDeliverySection`

File: `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx`

`taskDetail.task.task_type` is already available on the existing `taskDetail: TaskDetailRaw` prop (`TaskDetailRawSchema.task.task_type` is typed as `z.enum(TASK_TYPE)` where `TASK_TYPE = ["return", "pre_order", "internal"]`).

Add a local `isInternalTask` check and wrap `TaskScheduledDeliveryDatePill` in it:

```tsx
const isInternalTask = task.task_type === "internal";
```

Then wrap `TaskScheduledDeliveryDatePill` in a conditional:
```tsx
{!isInternalTask ? (
  <TaskScheduledDeliveryDatePill
    scheduledEndAt={task.scheduled_end_at ?? null}
    scheduledStartAt={task.scheduled_start_at ?? null}
    onPress={onOpenDeliveryDate}
  />
) : null}
```

No new prop needed — the data is already on `taskDetail.task`.

---

### Step 4 — Extend `TaskSnapshotSchema` with scheduled date fields

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

`TaskSnapshotSchema` currently (lines 76–88):
```ts
export const TaskSnapshotSchema = z.object({
  client_id: TaskIdSchema,
  task_type: z.enum(["return", "pre_order", "internal"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  state: z.string(),
  return_source: z.enum(["after_purchase", "before_purchase", "store_return"]).nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
```

Add two fields:
```ts
export const TaskSnapshotSchema = z.object({
  client_id: TaskIdSchema,
  task_type: z.enum(["return", "pre_order", "internal"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  state: z.string(),
  return_source: z.enum(["after_purchase", "before_purchase", "store_return"]).nullable(),
  item_location: z.string().nullable(),
  ready_by_at: z.string().nullable(),
  scheduled_start_at: z.string().nullable(),
  scheduled_end_at: z.string().nullable(),
  return_method: z.string().nullable(),
});
```

After this change, `step.task.scheduled_start_at` and `step.task.scheduled_end_at` are typed and available throughout the workers app.

---

### Step 5 — Add category+position row to `TaskDetailSlidePage` (workers app)

File: `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

Add two imports at the top:
```ts
import { ItemCategoryDetailLabel } from "@beyo/item-categories";
import { ItemPositionPill } from "@beyo/items";
```

Inside `TaskDetailSlidePageContent`, the controller already exposes `step`, `isSeatCategory`, and `openPositionSheet` via `useTaskStepDetailContext()`.

After `<TaskStepImagesPreview />` and before `<TaskStepItemDetailsSection />`, insert:

```tsx
{controller.step?.item &&
  (controller.step.item.item_category_id ||
    controller.isSeatCategory ||
    controller.step.item.item_position) ? (
  <div className="flex items-center justify-between gap-2 px-1 py-0.5">
    <ItemCategoryDetailLabel
      categoryId={controller.step.item.item_category_id}
    />
    <ItemPositionPill
      isSeat={controller.isSeatCategory}
      position={controller.step.item.item_position}
      onPress={
        controller.isSeatCategory ? controller.openPositionSheet : undefined
      }
    />
  </div>
) : null}
```

The row has no background and no border — it renders as a plain flex row inside the existing `ContentCard`. This mirrors `TaskBodyCategoryRow` in the manager app (same Tailwind classes).

---

### Step 6 — Rework `TaskStepItemDetailsSection` to show date pills

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`

**Remove:**
- The local `ItemCategoryPill` component (entire function)
- Imports: `ItemCategoryViewModel` from `@beyo/item-categories`, `ItemPositionPill` from `@beyo/items`
- Context destructures: `itemCategory`, `isItemCategoryPending`, `isItemCategoryError` (no longer needed)
- Variables: `hasPosition`, `hasCategory`, `shouldRenderPosition`, `shouldRenderDetails`
- The position pill block (`shouldRenderPosition ? ...`)
- The category pill block (`hasCategory ? ...`)
- The `!shouldRenderDetails` early branch (now redundant — always render DashedInfoGroup when step.item exists)

**Keep:**
- `isSeatCategory`, `workingSectionId`, `issuesSurfaceOpeners` from context
- `shouldRenderQuantity = isSeatCategory`
- The quantity pill
- `ItemIssuePreviewSection`
- `DashedInfoGroup`, `DashedInfoSection` from `@beyo/ui`
- `EyebrowLabel`, `InfoPill` from `@beyo/ui` (still needed for quantity)

**Add:**
- Imports: `TaskReadyByAtPill`, `TaskScheduledDeliveryDatePill` from `@beyo/tasks`
- `step` destructure from context (already destructured — keep it)

**New component body:**
```tsx
export function TaskStepItemDetailsSection(): React.JSX.Element | null {
  const {
    step,
    isSeatCategory,
    workingSectionId,
    issuesSurfaceOpeners,
  } = useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  const shouldRenderQuantity = isSeatCategory;
  const isInternalTask = step.task.task_type === "internal";

  return (
    <DashedInfoGroup data-testid="task-step-item-details">
      <DashedInfoSection className="px-3 py-3">
        <div className="flex items-start gap-4 overflow-x-auto">
          <TaskReadyByAtPill readyByAt={step.task.ready_by_at ?? null} />

          {!isInternalTask ? (
            <TaskScheduledDeliveryDatePill
              scheduledEndAt={step.task.scheduled_end_at ?? null}
              scheduledStartAt={step.task.scheduled_start_at ?? null}
            />
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
        </div>
      </DashedInfoSection>

      <ItemIssuePreviewSection
        itemId={step.item.client_id}
        itemCategoryId={step.item.item_category_id ?? null}
        workingSectionId={workingSectionId}
        surfaceOpeners={issuesSurfaceOpeners}
        data-testid="task-step-item-issues-section"
      />
    </DashedInfoGroup>
  );
}
```

Note: `TaskReadyByAtPill` and `TaskScheduledDeliveryDatePill` are called without `onPress` — after Steps 1 and 2, this renders them as non-interactive `<span>` elements.

---

## Risks and mitigations

- **Risk:** Backend may not include `scheduled_start_at`/`scheduled_end_at` in the working-section steps response's task snapshot.
  **Mitigation:** The Zod schema uses `.nullable()` — if the field is absent, Zod will still parse successfully and the value will be `undefined` (treated as null by `?? null`). The pills will show "—". No runtime crash.

- **Risk:** Making `onPress` optional on shared pill components could silently break manager app calls if a manager caller forgets `onPress`.
  **Mitigation:** TypeScript strict mode will flag this at build time. The manager app always passes `onPress` — no change in behaviour there. `npm run typecheck` is the verification gate.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test — manager app: tap a task detail pill to confirm it still opens the calendar sheet page.
- Manual smoke test — worker app: open a task detail, confirm:
  - Category and position row appears above the date section.
  - Position is tappable for seat items; opens position sheet.
  - Ready-by pill and delivery window pill render as non-interactive.
  - Internal tasks: delivery window pill is absent.

## Review log

- `2026-06-26` David: initial plan authored

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
