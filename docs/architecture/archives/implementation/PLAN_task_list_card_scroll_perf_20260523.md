# PLAN_task_list_card_scroll_perf_20260523

## Metadata

- Plan ID: `PLAN_task_list_card_scroll_perf_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T12:31:45Z`

## Goal and intent

Fix scroll jank on the task list page caused by two independent issues:

1. **Image decode blocks the main thread.** `<img loading="lazy">` defers the network fetch but the browser still decodes synchronously on the main thread. Adding `decoding="async"` moves decode off the main thread, preventing frame drops when multiple images enter the viewport.

2. **Scroll-state changes re-render every card.** `TasksView` tracks `isScrolled` and `isCompact` in local state. When either toggles, `TasksView` re-renders and recreates the inline `() => controller.open*(card.taskId)` arrow functions, so `React.memo` cannot bail out. Because the provider boundary sits above `TasksView`, the `controller` object from context is the same reference during a scroll-only render. Changing the card prop signature to `(taskId: string) => void` and passing the controller methods directly lets `memo` skip every card re-render on scroll.

No layout or visual changes.

## Why no `useCallback` in the controller is needed

`isScrolled` / `isCompact` state lives exclusively in `TasksView`. When those toggle, only `TasksView` re-renders; `TasksViewProvider` does not. React context reads the same cached controller value — same object reference. The three `open*` methods are already stable across those re-renders. The problem is the inline arrows in `TasksView.tsx`, not the controller.

## Scope

- In scope:
  - `features/tasks/components/TaskListCard.tsx` — `decoding="async"` + `memo` + prop signature change
  - `features/tasks/components/TasksView.tsx` — pass controller methods directly instead of wrapping them

- Out of scope:
  - Virtual list / windowing (not needed at current pagination size of 25 items)
  - `useCallback` in the controller (unnecessary given the provider boundary analysis above)

## Acceptance criteria

1. Scroll on the task list page is visibly smoother; no frame drops when images enter the viewport.
2. `React.memo` bails out on every `TaskListCard` during scroll-state (`isScrolled` / `isCompact`) transitions — confirmed by React DevTools "why did this render" showing no re-renders for cards during scroll.
3. Tapping image, card body, and three-dot actions button each trigger the correct surface — same behaviour as before.
4. `npm run typecheck` passes with zero errors.

## Implementation plan

---

### Step 1 — Update `TaskListCard`

**File:** `features/tasks/components/TaskListCard.tsx`

**Change 1a — Add `memo` import.**

```ts
// Before:
import { Calendar, RotateCcw, ShoppingBag, Wrench } from 'lucide-react';

// After:
import { memo } from 'react';
import { Calendar, RotateCcw, ShoppingBag, Wrench } from 'lucide-react';
```

**Change 1b — Widen prop types to pass `taskId` to handlers.**

```ts
// Before:
type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: () => void;
  onTapActions: () => void;
  onTapCard: () => void;
};

// After:
type TaskListCardProps = {
  card: TaskCardViewModel;
  onTapImage: (taskId: string) => void;
  onTapActions: (taskId: string) => void;
  onTapCard: (taskId: string) => void;
};
```

**Change 1c — Add `decoding="async"` to `<img>` and update the three call sites.**

```tsx
// img tag — add decoding="async":
<img
  alt=""
  className="size-full object-cover"
  decoding="async"
  draggable={false}
  loading="lazy"
  src={imageUrl}
/>

// image button onClick:
// Before:  onClick={onTapImage}
// After:   onClick={() => onTapImage(taskId)}

// card body div onClick:
// Before:  onClick={onTapCard}
// After:   onClick={() => onTapCard(taskId)}

// card body div onKeyDown (Enter / Space):
// Before:  onTapCard()
// After:   onTapCard(taskId)

// actions button onClick:
// Before:  event.stopPropagation(); onTapActions();
// After:   event.stopPropagation(); onTapActions(taskId);
```

**Change 1d — Wrap export in `memo`.**

```ts
// Before:
export function TaskListCard({ ... }: TaskListCardProps): React.JSX.Element {

// After:
export const TaskListCard = memo(function TaskListCard({
  ...
}: TaskListCardProps): React.JSX.Element {
  // ... unchanged body ...
});
```

---

### Step 2 — Update `TasksView`

**File:** `features/tasks/components/TasksView.tsx`

Replace the three inline arrow callbacks with direct method references. The controller methods now receive `taskId` because `TaskListCard` passes it.

```tsx
// Before:
{controller.cards.map((card) => (
  <TaskListCard
    key={card.taskId}
    card={card}
    onTapActions={() => controller.openTaskActions(card.taskId)}
    onTapCard={() => controller.openTaskDetail(card.taskId)}
    onTapImage={() => controller.openImageViewer(card.taskId)}
  />
))}

// After:
{controller.cards.map((card) => (
  <TaskListCard
    key={card.taskId}
    card={card}
    onTapActions={controller.openTaskActions}
    onTapCard={controller.openTaskDetail}
    onTapImage={controller.openImageViewer}
  />
))}
```

No other changes to `TasksView.tsx`.

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/tasks/components/TaskListCard.tsx` | `decoding="async"`; prop types → `(taskId: string) => void`; call sites updated; wrapped in `memo()` |
| `features/tasks/components/TasksView.tsx` | Inline arrows replaced with direct controller method references |

### Files to create or delete

None.

## Validation plan

- `npm run typecheck`: zero errors
- Manual: scroll the task list and verify images load without visible frame drops
- Manual: tap image → image viewer opens; tap card body → task detail opens; tap three dots → actions sheet opens
- (Optional) React DevTools Profiler: record a scroll; confirm `TaskListCard` instances show "Did not render" during `isScrolled` toggle

## Review log

- `2026-05-23`: Implemented the `TaskListCard` memoization and async image decoding changes, updated `TasksView` to pass stable controller method references directly, and validated with `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `davidloorenz`
