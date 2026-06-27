# PLAN_task_notes_sheet_corrections_20260626

## Metadata

- Plan ID: `PLAN_task_notes_sheet_corrections_20260626`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-26T15:00:00Z`
- Last updated at (UTC): `2026-06-26T15:48:05Z`
- Related issue/ticket: —
- Intention plan: —
- Source review: post-implementation code review of `PLAN_task_notes_sheet_page_20260626`

---

## Goal and intent

- **Goal:** Fix seven post-implementation defects and gaps found in the code review of the task notes sheet page plan. No new features.
- **Business/user intent:** `hideEditCapability` must fully lock down write actions (create, edit, delete) for read-only contexts; the surface header must not double-render alongside inline panel headers; the Create→Detail back animation must reverse correctly; per-card delete loading must not bleed across all cards.
- **Non-goals:** Any new functionality. Changing the three-panel absolute-position architecture. Any change to the API layer or workers/managers app wiring.

---

## Scope

- **In scope:**
  - **Fix 1** — `hideEditCapability` must gate create and delete in addition to the edit button. `canManageNotes` must include the `!hideEditCapability` check.
  - **Fix 2** — `TaskNoteContentView` must accept `plainText?: string` as a fallback when the `content` block array is empty.
  - **Fix 3** — Surface header must be hidden via `setHeaderHidden(true)`; the current `setTitle("Task notes")` + `setActions(null)` leaves a native sheet header above the panel-owned inline headers.
  - **Fix 4** — `captureFlow` in both `CreatePanel` and `EditPanelBody`'s `EntityImagesProvider` must be `"camera-to-editor"`, not `"camera-to-viewer"`.
  - **Fix 5** — `TaskNoteCardRow` must show `created_by?.username` below the 2-line preview (as specified in the plan).
  - **Fix 6** — Delete loading state must be tracked per note-id, not globally. All delete buttons must not disable at once when one deletion is in-flight.
  - **Fix 7** — Create→List back animation must reverse correctly. Currently the list panel is parked at `-translate-x-full` (off-screen left) while on Create, so returning to List makes the list enter from the left — the wrong direction. Fix by tracking which offscreen side the list occupies and swapping it to the right before triggering the back transition.

- **Out of scope:**
  - Any change to `TaskNoteComposer`, the API hooks, surface registration, or app-level wiring.
  - Any change to `TaskNotePill` or `TaskNoteContentView`'s rendering beyond the fallback addition.
  - Refactoring the three-panel absolute-position system to the 300%-strip approach. Fix 7 patches the existing system without a full rewrite.

- **Assumptions:**
  - `header?.setHeaderHidden(true)` is the correct API call to fully suppress the native sheet header. This is already used in the managers-app `TaskDetailSlidePage.tsx`.
  - `EntityImagesProvider`'s `captureFlow="camera-to-editor"` routes captured images through the Lexical composer before persisting them to the image grid. This is the intended behavior for note creation and editing.
  - `controller.taskId` and `task.vm.taskId` are available in workers-app context — already confirmed in the existing implementation.
  - `created_by` on `TaskNoteApiNote` is `TaskNoteApiUser | null`. The fallback when null is to render nothing (no author row).

---

## Clarifications required

_(none)_

---

## Acceptance criteria

1. Opening the notes sheet with `hideEditCapability: true` — the "+" create button is hidden, delete buttons are hidden, and the edit icon is hidden. No write action is available.
2. A note with an empty `content` array but non-empty `plain_text` renders its text content, not "No note content."
3. The notes sheet opens with no visible native sheet header above the panels. Only the inline panel header row (back arrow / title / edit icon) is visible.
4. Tapping the camera button in the compose (create or edit) flow routes the capture through the composer editor before it appears in the image grid.
5. Each note card in the list shows a 2-line preview and, when `created_by` is not null, shows `created_by.username` below the preview text.
6. When note A's delete is in-flight, note B's delete button remains enabled and interactive.
7. Tapping "Back" inside the Create panel slides the Create panel out to the right and the List panel enters from the right (correct reverse of the forward List→Create direction).
8. Notes load correctly when the backend returns `"updated_at": null` (no error state, list renders).
9. `npm run typecheck` — zero TypeScript errors.

---

## Contracts and skills

### Contracts loaded

- `architecture/19_permissions_local.md`: role gating — `useRole()` + `hideEditCapability` together control write access.
- `architecture/35_shared_packages.md`: surface header API — packages call `header?.setHeaderHidden(true)` to suppress native headers when a component owns its own inline header chrome.

### File read intent — pattern vs. relational

Permitted (relational reads — understanding what exists):
- `packages/task-notes/src/pages/TaskNotesSheetPage.tsx` — current state of the three panels and state variables, before editing.
- `packages/task-notes/src/components/TaskNoteContentView.tsx` — current props before adding `plainText`.
- `packages/task-notes/src/components/TaskNoteCardRow.tsx` — current props before adding author row.

Prohibited (pattern reads — contracts already cover these):
- Reading other sheet pages to understand surface header usage → `architecture/35_shared_packages.md`.
- Reading other role-gated components to understand `useRole` usage → `architecture/19_permissions_local.md`.

---

## Implementation plan

### Fix 1 — `hideEditCapability` must gate all write actions (`TaskNotesSheetPage.tsx`)

**Current (incorrect):**
```ts
const canManageNotes =
  hasRole(AuthRole.Admin) || workspaceRoleName !== null;
```
`canManageNotes` is then used as `canCreate` on `ListPanel` (controls the "+" button and `canDelete` on each card), while `hideEditCapability` is only forwarded to `DetailPanel` as `canEdit={canManageNotes && !hideEditCapability}`.

**Fix:**
```ts
const canManageNotes =
  !hideEditCapability &&
  (hasRole(AuthRole.Admin) || hasRole(AuthRole.Manager) || workspaceRoleName !== null);
```

`AuthRole.Manager` must be included. `WorkspaceRoleName` is typed as `"wood_worker" | null` — a manager with no workspace role assignment gets `workspaceRoleName = null` and `hasRole(AuthRole.Admin) = false`, locking them out entirely. The gate should allow admins, managers, or users with any workspace role.

Remove the separate `!hideEditCapability` from `DetailPanel`'s `canEdit` prop — it is now redundant:
```tsx
// BEFORE
<DetailPanel
  canEdit={canManageNotes && !hideEditCapability}
  ...
/>

// AFTER
<DetailPanel
  canEdit={canManageNotes}
  ...
/>
```

No other changes needed. `canCreate={canManageNotes}` on `ListPanel` now also blocks create and delete when `hideEditCapability` is true.

---

### Fix 2 — `TaskNoteContentView` must fall back to `plainText` when content is empty (`TaskNoteContentView.tsx`)

**Add `plainText?: string` prop.** When `content` is empty, render from `plainText` instead of showing "No note content."

```tsx
type TaskNoteContentViewProps = {
  content: TaskNoteContentBlock[];
  plainText?: string;    // ← ADD
  testId?: string;
};

export function TaskNoteContentView({
  content,
  plainText = "",        // ← ADD
  testId = "task-note-content-view",
}: TaskNoteContentViewProps): React.JSX.Element {
  const fallbackText = plainText.trim();

  if (content.length === 0 && !fallbackText) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground"
        data-testid={testId}
      >
        No note content.
      </div>
    );
  }

  if (content.length === 0 && fallbackText) {
    return (
      <p
        className="whitespace-pre-wrap text-sm leading-6 text-foreground"
        data-testid={testId}
      >
        {fallbackText}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {content.map((block, index) => (
        <p
          key={`${block.type}-${index}`}
          className="whitespace-pre-wrap text-sm leading-6 text-foreground"
        >
          {block.text ?? ""}
        </p>
      ))}
    </div>
  );
}
```

**Update the call site in `TaskNotesSheetPage.tsx`** (inside `DetailPanel` read-mode body):

```tsx
// BEFORE
<TaskNoteContentView content={entry.note.content} />

// AFTER
<TaskNoteContentView
  content={entry.note.content}
  plainText={entry.note.plain_text}
/>
```

---

### Fix 3 — Surface header must be hidden (`TaskNotesSheetPage.tsx`)

The notes sheet owns three inline panel headers. The native surface header must be suppressed.

```ts
// BEFORE
useEffect(() => {
  header?.setTitle("Task notes");
  header?.setActions(null);
}, [header]);

// AFTER
useEffect(() => {
  header?.setHeaderHidden(true);
}, [header]);
```

---

### Fix 4 — `captureFlow` must be `"camera-to-editor"` in both create and edit panels (`TaskNotesSheetPage.tsx`)

There are two `EntityImagesProvider` instances that need updating:

**In `CreatePanel`:**
```tsx
// BEFORE
<EntityImagesProvider
  captureFlow="camera-to-viewer"
  ...
>

// AFTER
<EntityImagesProvider
  captureFlow="camera-to-editor"
  ...
>
```

**In `EditPanelBody`:**
```tsx
// BEFORE
<EntityImagesProvider
  captureFlow="camera-to-viewer"
  ...
>

// AFTER
<EntityImagesProvider
  captureFlow="camera-to-editor"
  ...
>
```

---

### Fix 5 — `TaskNoteCardRow` must show author username (`TaskNoteCardRow.tsx`)

Add an author line below the 2-line preview. The `created_by` field is on `entry.note.created_by` (type `TaskNoteApiUser | null`).

```tsx
export function TaskNoteCardRow({
  entry,
  canDelete = false,
  isDeleting = false,
  onDelete,
  onPress,
  testId = "task-note-card-row",
}: TaskNoteCardRowProps): React.JSX.Element {
  const preview = entry.note.plain_text.trim() || "Empty note";
  const author = entry.note.created_by?.username ?? null;  // ← ADD

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
      data-testid={`${testId}-${entry.note.client_id}`}
    >
      <button
        className={cn(
          "min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        type="button"
        onClick={onPress}
      >
        <p
          className="text-sm text-foreground"
          style={{
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {preview}
        </p>
        {author ? (                                   {/* ← ADD */}
          <p className="mt-0.5 text-xs text-muted-foreground">{author}</p>
        ) : null}
      </button>

      {canDelete && onDelete ? (
        <ConfirmActionButton
          className="px-3 py-2"
          confirmLabel="Delete?"
          disabled={isDeleting}
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          label="Delete"
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
```

No type changes needed — `entry.note.created_by` is already typed as `TaskNoteApiUser | null` via `TaskNoteApiEntry`.

---

### Fix 6 — Track deleting note ID per-card, not globally (`TaskNotesSheetPage.tsx`)

**Step 6a** — Add `deletingNoteId` state:

```ts
// ADD after existing useState declarations
const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
```

**Step 6b** — Update `handleDelete` to set/clear the per-note id:

```ts
function handleDelete(noteId: string): void {
  if (!taskId) {
    return;
  }

  if (selectedNoteId === noteId) {
    setSelectedNoteId(null);
    setActivePanel("list");
  }

  setDeletingNoteId(noteId);       // ← ADD

  deleteNote.mutate(
    { taskId, noteId },
    {
      onSettled: () => {            // ← ADD
        setDeletingNoteId(null);
      },
    },
  );
}
```

**Step 6c** — Update the `ListPanel` call to pass `deletingNoteId` instead of the global `isDeletingNote`:

```tsx
// BEFORE
<ListPanel
  ...
  isDeletingNote={deleteNote.isPending}
  ...
/>

// AFTER
<ListPanel
  ...
  deletingNoteId={deletingNoteId}
  ...
/>
```

**Step 6d** — Update `ListPanelProps` type and `ListPanel` component to accept `deletingNoteId: string | null` instead of `isDeletingNote: boolean`:

```tsx
// BEFORE in type
isDeletingNote: boolean;

// AFTER in type
deletingNoteId: string | null;
```

```tsx
// BEFORE in component body
{entries.map((entry) => (
  <TaskNoteCardRow
    key={entry.note.client_id}
    canDelete={canCreate}
    entry={entry}
    isDeleting={isDeletingNote}
    onDelete={() => onDelete(entry.note.client_id)}
    onPress={() => onOpenDetail(entry.note.client_id)}
  />
))}

// AFTER
{entries.map((entry) => (
  <TaskNoteCardRow
    key={entry.note.client_id}
    canDelete={canCreate}
    entry={entry}
    isDeleting={deletingNoteId === entry.note.client_id}
    onDelete={() => onDelete(entry.note.client_id)}
    onPress={() => onOpenDetail(entry.note.client_id)}
  />
))}
```

Remove the unused `deleteNote` from the `ListPanel` dependency (it was never passed; only `isDeletingNote` was, which was derived from `deleteNote.isPending`).

---

### Fix 7 — Create→List back animation: list must enter from the right (`TaskNotesSheetPage.tsx`)

**Root cause:** When the active panel is `"create"`, the list panel is positioned at `-translate-x-full` (off-screen left). On back navigation, `activePanel` transitions to `"list"`, and the list animates in from the left. The correct direction for a "back from create" transition is right-to-left (list enters from the right).

**Fix:** Introduce a `listSide` state variable that controls which offscreen side the list occupies. It defaults to `"left"` (used for the Detail case). When the user opens Create, swap it to `"left"`. Before returning from Create to List, flip it to `"right"` so the list teleports to the right side (while invisible) and then animates in from there.

**Step 7a** — Add `listSide` state:

```ts
// ADD after other useState declarations
const [listSide, setListSide] = useState<"left" | "right">("left");
```

**Step 7b** — Update `handleOpenCreate` to set `listSide` to `"left"` (list exits left):

```ts
// in ListPanel: the create button calls onCreate
// Inside TaskNotesSheetPage, onCreate is: () => setActivePanel("create")
// Change it to a named handler:
function handleOpenCreate(): void {
  setListSide("left");         // ← list will exit to the left when create opens
  setActivePanel("create");
}
```

Pass `onCreate={handleOpenCreate}` to `ListPanel`.

**Step 7c** — Add `handleBackFromCreate`:

```ts
function handleBackFromCreate(): void {
  setListSide("right");        // ← list must enter from the right on back
  setActivePanel("list");
}
```

**Step 7d** — Pass `handleBackFromCreate` to `CreatePanel` instead of `() => setActivePanel("list")`:

```tsx
// BEFORE
<CreatePanel
  ...
  onBack={() => setActivePanel("list")}
  ...
/>

// AFTER
<CreatePanel
  ...
  onBack={handleBackFromCreate}
  ...
/>
```

**Step 7e** — Update the list panel's `translateX` class to use `listSide`:

```tsx
// BEFORE (list panel className)
className={cn(
  "absolute inset-0 overflow-y-auto p-4 transition-transform duration-300",
  activePanel === "list"
    ? "translate-x-0"
    : activePanel === "detail"
      ? "translate-x-full"
      : "-translate-x-full",
)}

// AFTER
className={cn(
  "absolute inset-0 overflow-y-auto p-4 transition-transform duration-300",
  activePanel === "list"
    ? "translate-x-0"
    : activePanel === "detail"
      ? "translate-x-full"
      : listSide === "left"
        ? "-translate-x-full"
        : "translate-x-full",
)}
```

When `handleBackFromCreate` fires, `listSide` is set to `"right"` and `activePanel` to `"list"` in the same render cycle. React batches both state updates, so the list jumps from `-translate-x-full` (left) to `translate-x-0` (center) in a single frame — no intermediate state at `translate-x-full` is rendered. This means the teleport to the right side and the animation in from the right happen correctly without a visible jump.

> **Note:** React 18+ batches state updates in event handlers, so both `setListSide` and `setActivePanel` are applied in the same commit. The CSS transition on the list panel will transition from `translate-x-full` → `translate-x-0` (entering from right), which is the correct direction. Verify with a real device.

---

### Fix 8 — `updated_at` Zod schema must be nullable (`packages/task-notes/src/types.ts`)

> **Already applied** — this fix was deployed directly before the Codex session because it is blocking (notes do not load at all without it). Codex must **not revert** this change.

The backend sends `"updated_at": null` for notes that have never been edited. The schema had `updated_at: z.string()` (non-nullable), causing Zod to throw a parse error. The parse error propagated as a query error, making `notesQuery.isError` true and showing "Notes could not be loaded." instead of the list.

**Applied fix in `TaskNoteApiNoteSchema`:**
```ts
// BEFORE (wrong — rejects null from backend)
updated_at: z.string(),

// AFTER (correct — matches actual backend shape)
updated_at: z.string().nullable(),
```

No other type changes needed. `updated_by` was already `.nullable()`. `deleted_at` was already `.nullable()`.

---

## Risks and mitigations

- **Risk:** Fix 7 relies on React 18 automatic batching. If the surface runs in a context that somehow wraps state updates in `flushSync`, the two calls may not batch, causing a one-frame visual jump.
  **Mitigation:** This codebase targets React 19 (`"react": ">=19.0.0"`), which batches even more aggressively. The risk is negligible.

- **Risk:** Fix 3 (`setHeaderHidden(true)`) may leave the sheet with no visible close affordance if the surface does not provide its own close gesture.
  **Mitigation:** The `CreatePanel` and `DetailPanel` both have "Back" buttons that call `onBack` → navigate to list. The list panel has no back button. The sheet is dismissible via swipe-down (standard sheet behavior) and the footer close button if present. Confirm swipe-to-close works without a header.

- **Risk:** Fix 6 (`deletingNoteId`) leaks state if `deleteNote.mutate` throws synchronously before `onSettled` fires.
  **Mitigation:** TanStack Query always calls `onSettled` even on error, so `setDeletingNoteId(null)` is guaranteed to fire. Verified by the `onSettled` contract in `@tanstack/react-query`.

---

## Validation plan

- `npm run typecheck` from `frontend/`: zero TypeScript errors.
- Manual smoke test:
  1. Open notes sheet with `hideEditCapability: true` → no "+" button, no edit icon, no delete buttons visible.
  2. Open notes sheet with `hideEditCapability: false` (or omitted) as a role-gated user → all controls appear normally.
  3. Open a note where `content` is empty but `plain_text` is non-empty → note text renders correctly.
  4. Open the notes sheet → no native "Task notes" header visible; only the inline "Notes" row with "+" button.
  5. Navigate List → Create → Back → confirm the list slides in from the right (not the left).
  6. Delete a note while another is visible → the other card's delete button remains enabled.
  7. Note cards show the author username when `created_by` is non-null.
  8. Take a photo inside create or edit mode → camera capture appears in the composer editor before the image grid.

---

## Review log

- `2026-06-26` Claude: corrections plan authored from post-implementation code review of `PLAN_task_notes_sheet_page_20260626`

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
