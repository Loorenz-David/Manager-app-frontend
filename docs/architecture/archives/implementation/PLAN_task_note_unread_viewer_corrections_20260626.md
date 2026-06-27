# PLAN_task_note_unread_viewer_corrections_20260626

## Metadata

- Plan ID: `PLAN_task_note_unread_viewer_corrections_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T19:00:00Z`
- Last updated at (UTC): `2026-06-26T17:06:38Z`
- Related issue/ticket: —
- Source plan: `docs/architecture/archives/implementation/PLAN_task_note_unread_viewer_20260626.md`
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_task_note_unread_viewer_corrections_20260626.md`

## Goal and intent

- Goal: Apply 3 targeted corrections to `TaskNoteUnreadViewerPage.tsx` found during the post-implementation audit. No other files are modified.
- Business/user intent: Eliminate a "No unread notes." flash that every user hits on a warm cache, prevent redundant API calls on back-swipe re-taps, and give the dot indicator a third visual state for already-acknowledged notes.
- Non-goals: Any change outside `TaskNoteUnreadViewerPage.tsx`; changes to the controller, API hooks, or app wiring.

## Scope

- In scope: `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` — 3 surgical edits
- Out of scope: All other files
- Assumptions:
  - Typecheck is currently passing; these changes must keep it passing
  - `lockedEntries` is consumed only inside this file — changing its type from `TaskNoteApiEntry[]` to `TaskNoteApiEntry[] | null` has no external impact

## Clarifications required

None.

## Acceptance criteria

1. Opening a task detail with notes in cache never shows "No unread notes." before the carousel appears — the placeholder shows "Loading notes..." only.
2. Pressing "Got it" on an already-acknowledged note (after swiping back) advances the carousel without firing a network call.
3. Acknowledged dot indicators render at `bg-primary/40` width `w-1.5`; active indicator stays `bg-primary` width `w-4`; unread indicators stay `bg-muted-foreground/30` width `w-1.5`.
4. `npm run typecheck` passes with zero errors.

## Contracts and skills

No new contracts needed — all edits are confined to a single existing file.

### File read intent

Read `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` in full before making any edit. Do not read any other file.

## File manifest

| # | Action | Path |
|---|--------|------|
| 1 | MODIFIED | `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` |

---

## Implementation plan

Read the full file first. Then apply the 3 fixes in order within a single edit pass.

---

### Fix 1 — Change `lockedEntries` initial state from `[]` to `null`

**Why:** `lockedEntries` starts as `[]`. On the first render, when `notesQuery.data` is already cached (`isPending = false`), the early-return guard `lockedEntries.length === 0` fires before the `useEffect` has run to populate the list — showing "No unread notes." for one frame even when there ARE unread notes.

`null` distinguishes "not yet evaluated" from "evaluated and genuinely empty".

**Changes:**

1a. Change the `useState` declaration:

```tsx
// BEFORE
const [lockedEntries, setLockedEntries] = useState<TaskNoteApiEntry[]>([]);

// AFTER
const [lockedEntries, setLockedEntries] = useState<TaskNoteApiEntry[] | null>(null);
```

1b. Replace the single `lockedEntries.length === 0` early return with two separate guards:

```tsx
// BEFORE
if (lockedEntries.length === 0) {
  return (
    <div
      className="flex min-h-[20rem] items-center justify-center p-4 text-sm text-muted-foreground"
      data-testid="task-note-unread-viewer"
    >
      No unread notes.
    </div>
  );
}

// AFTER — insert BEFORE the existing carousel JSX, after the `notesQuery.isPending` guard
if (lockedEntries === null) {
  return (
    <div
      className="flex min-h-[20rem] items-center justify-center p-4 text-sm text-muted-foreground"
      data-testid="task-note-unread-viewer"
    >
      Loading notes...
    </div>
  );
}

if (lockedEntries.length === 0) {
  return (
    <div
      className="flex min-h-[20rem] items-center justify-center p-4 text-sm text-muted-foreground"
      data-testid="task-note-unread-viewer"
    >
      No unread notes.
    </div>
  );
}
```

The new early-return order is:
1. `if (!taskId)` → "Task id is missing."
2. `if (notesQuery.isPending)` → "Loading notes..."
3. `if (lockedEntries === null)` → "Loading notes..." (pre-lock, effect not yet fired)
4. `if (lockedEntries.length === 0)` → "No unread notes." (locked and genuinely empty)
5. Main carousel JSX

**TypeScript note:** After the `lockedEntries === null` guard at step 3, TypeScript narrows `lockedEntries` to `TaskNoteApiEntry[]` for all code below — no casts needed. All existing uses of `lockedEntries` in handlers (`handleGotIt`, the close effect, the `useLayoutEffect`, the measurement layer, and the carousel JSX) all live after the guard and will type-check without modification.

---

### Fix 2 — Add already-acknowledged guard in `handleGotIt`

**Why:** If the user swipes back to a slide they already acknowledged and taps "Got it" again, `markReadBy.mutate` fires an unnecessary network request. The backend is idempotent, but the call is wasteful. Adding a guard also makes the carousel advance correctly if the user re-taps a finished slide.

**Change:** Replace the `handleGotIt` callback body:

```tsx
// BEFORE
const handleGotIt = useCallback(() => {
  if (!taskId || !user?.id || markReadBy.isPending) {
    return;
  }

  const current = lockedEntries[activeIndex];
  if (!current) {
    return;
  }

  const noteId = current.note.client_id;
  markReadBy.mutate({ taskId, noteId, userIds: [user.id] });
  setAcknowledgedIds((previous) => new Set([...previous, noteId]));

  if (activeIndex < lockedEntries.length - 1) {
    emblaApi?.scrollTo(activeIndex + 1);
  }
}, [activeIndex, emblaApi, lockedEntries, markReadBy, taskId, user?.id]);

// AFTER
const handleGotIt = useCallback(() => {
  if (!taskId || !user?.id || markReadBy.isPending) {
    return;
  }

  const current = lockedEntries[activeIndex];
  if (!current) {
    return;
  }

  const noteId = current.note.client_id;

  if (acknowledgedIds.has(noteId)) {
    if (activeIndex < lockedEntries.length - 1) {
      emblaApi?.scrollTo(activeIndex + 1);
    }
    return;
  }

  markReadBy.mutate({ taskId, noteId, userIds: [user.id] });
  setAcknowledgedIds((previous) => new Set([...previous, noteId]));

  if (activeIndex < lockedEntries.length - 1) {
    emblaApi?.scrollTo(activeIndex + 1);
  }
}, [acknowledgedIds, activeIndex, emblaApi, lockedEntries, markReadBy, taskId, user?.id]);
```

**Important:** Add `acknowledgedIds` to the `useCallback` dependency array (it was not there before).

---

### Fix 3 — Third dot state for acknowledged notes

**Why:** The indicator dots currently only show two states: active (`bg-primary w-4`) and inactive (`bg-muted-foreground/30 w-1.5`). After acknowledging a note and swiping back, there is no visual feedback that the note is already read.

**Change:** Replace the dot `className` expression inside the indicator `map`:

```tsx
// BEFORE
className={cn(
  "h-1.5 rounded-full transition-all duration-200",
  index === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30",
)}

// AFTER
className={cn(
  "h-1.5 rounded-full transition-all duration-200",
  index === activeIndex
    ? "w-4 bg-primary"
    : acknowledgedIds.has(entry.note.client_id)
      ? "w-1.5 bg-primary/40"
      : "w-1.5 bg-muted-foreground/30",
)}
```

Three states:
- `w-4 bg-primary` — currently active slide
- `w-1.5 bg-primary/40` — acknowledged (read) but not active
- `w-1.5 bg-muted-foreground/30` — not yet acknowledged

No new imports needed. `acknowledgedIds` is already in scope.

---

## Risks and mitigations

- Risk: After Fix 1, handlers that reference `lockedEntries` will have type `TaskNoteApiEntry[] | null` outside the early-return scope — causing TypeScript errors.
  Mitigation: The `lockedEntries === null` guard (Fix 1b) narrows the type to `TaskNoteApiEntry[]` for all code below it, including `handleGotIt`, the close `useEffect`, the `useLayoutEffect`, and the carousel JSX. No casts are needed. Verify typecheck passes.

- Risk: Fix 2 adds `acknowledgedIds` to the `useCallback` deps — `handleGotIt` may now be recreated on every acknowledgment (since `acknowledgedIds` is a new `Set` on each update).
  Mitigation: This is correct behavior — `acknowledgedIds` changing means the guard condition changes, so the callback must update. The recreation is cheap. The `onClick` on the "Got it" button will re-bind but causes no visual issue.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `packages/task-notes`
- Manual smoke test:
  1. Open a task with at least one cached unread note — verify the viewer sheet opens directly on the carousel (no "No unread notes." flash).
  2. Tap "Got it" on the last note — verify the sheet closes.
  3. Open a task with two unread notes — tap "Got it" on note 1, swipe back to note 1, tap "Got it" again — verify no network call fires (check network tab) and the carousel advances.
  4. With two notes, acknowledge note 1 — verify its dot turns `bg-primary/40`, while note 2 stays `bg-muted-foreground/30`, and the active note shows `bg-primary w-4`.

## Review log

- `2026-06-26` `claude`: Plan authored from post-implementation audit findings.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
