# PLAN_task_notes_sheet_page_20260626

## Metadata

- Plan ID: `PLAN_task_notes_sheet_page_20260626`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-26T14:48:11Z`
- Related issue/ticket: —
- Intention plan: —

---

## Goal and intent

- **Goal:** Add a full note management sheet to `@beyo/task-notes`: list notes, view note detail, edit a note, create a note, delete a note. Wire a self-contained `TaskNotePill` trigger into both the managers-app and workers-app task detail pages.
- **Business/user intent:** Managers need to read, add, and correct task notes without leaving the task detail surface. Notes include formatted rich text content and linked images.
- **Non-goals:** Pagination of notes. Realtime/WebSocket read-receipt events. Marking notes as read (`POST .../read-by`). Annotating note images.

---

## Scope

- **In scope:**
  - API layer for list / create / update / delete task notes (in `@beyo/task-notes` package).
  - Three-container sliding sheet page (`TaskNotesSheetPage`) with list, detail (read + edit mode), and create containers.
  - `TaskNotePill` — self-contained button that fetches note count and accepts an `onPress` handler.
  - `TaskNoteCardRow` — card with truncated preview + confirm-delete button.
  - `TaskNoteContentView` — renders `TaskNoteContentBlock[]` as styled text.
  - `surface-ids.ts` in `@beyo/task-notes` (surface ID constant + props type + preload function).
  - `notesPillSlot` prop slot in `TaskScheduledDeliverySection` (`@beyo/tasks`).
  - Surface registration + `TaskNotePill` placement in the managers-app task detail page.
  - Surface registration + `TaskNotePill` placement in the workers-app task detail page (`TaskStepItemDetailsSection`). The pill is hidden entirely when there are no notes (`hideWhenEmpty` behavior) — no `"--"` placeholder shown.
  - Role gating for create/edit/delete using `RoleGuard` / `useRole` from `@beyo/auth`.

- **Out of scope:** Push notification deep linking. Any changes to the existing `TaskNoteComposer` beyond what was already implemented. Animation beyond CSS `transition-transform`.

- **Assumptions:**
  - Backend supports `DELETE /api/v1/tasks/{task_id}/notes/{note_id}` even though it is not listed in the handoff (the schema has `is_deleted` / `deleted_at`, so a delete endpoint almost certainly exists). See clarification below.
  - `@beyo/images`'s `EntityImagesProvider` with `entityType="note"` and `entityClientId=<noteClientId>` correctly scopes image uploads and queries for notes.
  - `ApiEnvelopeSchema` from `@beyo/lib` wraps all API responses.
  - `generateClientId("TaskNote")` from `@beyo/lib` produces IDs with the `tno_` prefix required by the backend.
  - The `CaseMessageContent` type from `@beyo/cases` has shape `{ parts: Array<{ text: string }> }` (this is what `EMPTY_CONTENT = { parts: [] }` shows). `plainTextToComposerContent` creates an initial content from a plain text string.
  - `@beyo/task-notes` is already registered in the managers-app `package.json` dependencies and in `src/index.css` with an `@source` directive.
  - `@beyo/task-notes` is **not** yet in the workers-app `package.json` or `index.css`. Both must be added (Steps 22 and 23).
  - The workers-app `surfaces.ts` is at `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`. Surface registrations use `{ surface: "sheet", component: ... }` shape.

---

## Clarifications required

_(none — all resolved)_

- [x] **Does `DELETE /api/v1/tasks/{task_id}/notes/{note_id}` exist?** — Confirmed. The handoff was updated to include this endpoint. Use `apiClient.delete(...)` as specified in Step 10.

---

## Acceptance criteria

1. `npm run typecheck` — zero TypeScript errors.
2. Opening the notes sheet with no notes: shows empty list container with "No notes yet" placeholder and "+" button (role-gated).
3. Opening the notes sheet with exactly one note: navigates directly to the detail container (no list flash after first data load).
4. Opening the notes sheet with multiple notes: shows list container with note cards.
5. Tapping a note card: list slides right, detail slides in from left.
6. Tapping "+" on list header (role-gated): list slides left, create container slides in from right.
7. Back arrow on detail/create: returns to list with correct reverse animation.
8. Detail container shows note content (plain text with whitespace-pre-wrap), note images (max 3, overflow count on tile 3, tapping opens `ImageFullscreenViewerPage`).
9. Edit icon on detail header is hidden when `hideEditCapability=true` or role check fails. When visible, tapping it switches the detail body to `TaskNoteComposer` (pre-filled with note `plain_text` as initial content) + note images in edit mode.
10. Tapping the composer check button in edit mode: calls `PATCH /api/v1/tasks/{task_id}/notes/{note_id}`, then closes the entire sheet.
11. Create container: `TaskNoteComposer` (no `onCheckDone`) + `TaskNoteImagesSection` + "Save note" full-width button. Tapping "Save note": calls `POST /api/v1/tasks/{task_id}/notes` with `users_read_list: [currentUserId]`, closes sheet optimistically.
12. Delete button on a note card (confirm action primitive) deletes the note via `DELETE .../notes/{noteId}`, invalidates the list query. If the deleted note is currently shown in the detail container, navigates back to the list.
13. **Managers-app:** `TaskNotePill` always renders — shows `"{N} notes"` or `"--"` when count is 0. Tapping opens `TASK_NOTES_SHEET_SURFACE_ID` in `TaskScheduledDeliverySection`.
14. `TaskNotesSheetPage` is lazily loaded; both apps call `usePreloadSurface(preloadTaskNotesSheetSurface)` in their respective `TaskDetailSlidePage`.
15. **Workers-app:** `TaskNotePill` with `hideWhenEmpty` renders to the left of `TaskScheduledDeliveryDatePill` inside `TaskStepItemDetailsSection`. When there are zero notes the pill does **not render at all** (returns `null`). When notes exist it shows `"{N} note(s)"` and tapping opens `TASK_NOTES_SHEET_SURFACE_ID`.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: Package boundary rules — packages never call `openSurface`; surface openers are injected by the app via `surfaceOpeners` map or plain callbacks. `TaskNotePill` accepts `onPress: () => void` and the app passes the `surface.open(...)` call.
- `architecture/19_permissions_local.md` + `architecture/19_permissions.md`: Use `useRole()` and `RoleGuard` from `@beyo/auth`, not `usePermissions()`, because `backend_permissions` are scaffold-empty. Gate note create/edit/delete when `hasRole(AuthRole.Admin) || workspaceRoleName !== null`.

### File read intent — pattern vs. relational

Permitted relational reads (check if unclear):
- `packages/task-notes/src/types.ts` — exact existing type shapes before adding to them.
- `packages/task-notes/src/lib/task-note-serialization.ts` — existing functions before extending.
- `packages/task-notes/src/index.ts` — what is already exported before adding.
- `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` — existing props before adding `notesPillSlot`.
- `apps/managers-app/.../features/tasks/surfaces.ts` — existing surface registrations before adding.
- `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — existing usage before adding pill.
- `packages/api-client/src/api-client.ts` — verify method names (`.post()`, `.patch()`, `.delete()` all exist).

---

## File manifest

### New files to create

| Path (in `packages/task-notes/src/`) | Purpose |
|---|---|
| `api/task-note-keys.ts` | TanStack Query key factory for task notes |
| `api/fetch-task-notes.ts` | `GET /api/v1/tasks/{taskId}/notes` API function |
| `api/use-task-notes-query.ts` | `useQuery` hook for task notes list |
| `api/create-task-note.ts` | `POST /api/v1/tasks/{taskId}/notes` API function |
| `api/use-create-task-note.ts` | `useMutation` hook — creates note + invalidates list |
| `api/update-task-note.ts` | `PATCH /api/v1/tasks/{taskId}/notes/{noteId}` API function |
| `api/use-update-task-note.ts` | `useMutation` hook — updates note + invalidates list |
| `api/delete-task-note.ts` | `DELETE /api/v1/tasks/{taskId}/notes/{noteId}` API function |
| `api/use-delete-task-note.ts` | `useMutation` hook — deletes note + invalidates list |
| `components/TaskNotePill.tsx` | Self-contained pill: fetches count, calls `onPress` on tap |
| `components/TaskNoteCardRow.tsx` | Note card: truncated preview + confirm-delete button |
| `components/TaskNoteContentView.tsx` | Renders `TaskNoteContentBlock[]` as styled paragraphs |
| `pages/TaskNotesSheetPage.tsx` | Main sheet page with three sliding containers |
| `surface-ids.ts` | `TASK_NOTES_SHEET_SURFACE_ID`, `TaskNotesSheetSurfaceProps`, `preloadTaskNotesSheetSurface` |

### Existing files to edit

| Path | Change summary |
|---|---|
| `packages/task-notes/src/types.ts` | Add Zod schemas + TS types for API note response |
| `packages/task-notes/src/lib/task-note-serialization.ts` | Add `plainTextToComposerContent` helper |
| `packages/task-notes/src/index.ts` | Export all new public symbols |
| `packages/task-notes/package.json` | Add peerDependencies: `@beyo/api-client`, `@beyo/auth`, `@beyo/hooks`, `@tanstack/react-query`, `zod`, `react-hook-form` |
| `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx` | Add `notesPillSlot?: React.ReactNode` prop |
| `apps/managers-app/.../src/features/tasks/surfaces.ts` | Register `TASK_NOTES_SHEET_SURFACE_ID` with `lazyWithPreload` |
| `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx` | Preload surface + render `TaskNotePill` + pass `notesPillSlot` |
| `apps/workers-app/ManagerBeyo-app-workers/package.json` | Add `@beyo/task-notes` to `dependencies` |
| `apps/workers-app/ManagerBeyo-app-workers/src/index.css` | Add `@source` for `@beyo/task-notes` |
| `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts` | Register `TASK_NOTES_SHEET_SURFACE_ID`; export `preloadTaskNotesSheetSurface` |
| `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx` | Add `notesPillSlot?: React.ReactNode` prop + render left of delivery date pill |
| `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` | Preload notes sheet + render `TaskNotePill hideWhenEmpty` + pass `notesPillSlot` |

---

## Implementation plan

### Step 1 — Add Zod schemas and TS types to `packages/task-notes/src/types.ts`

Append to the existing file (do NOT replace existing types):

```ts
import { z } from "zod";

// --- API response types (from GET /api/v1/tasks/{task_id}/notes) ---

export const TaskNoteApiUserSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: z.object({ client_id: z.string(), name: z.string() }).nullable(),
  workspace_role: z.object({ client_id: z.string(), name: z.string() }).nullable(),
});

export const TaskNoteApiNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  note_type: z.string(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  plain_text: z.string(),
  users_read_list: z.array(z.string()),
  created_at: z.string(),
  created_by: TaskNoteApiUserSchema.nullable(),
  updated_at: z.string(),
  updated_by: TaskNoteApiUserSchema.nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
});

export const TaskNoteApiImageSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().nullable().optional(),
  height_px: z.number().nullable().optional(),
}).passthrough();

export const TaskNoteApiEntrySchema = z.object({
  note: TaskNoteApiNoteSchema,
  note_images: z.array(TaskNoteApiImageSchema),
});

export type TaskNoteApiUser = z.infer<typeof TaskNoteApiUserSchema>;
export type TaskNoteApiNote = z.infer<typeof TaskNoteApiNoteSchema>;
export type TaskNoteApiImage = z.infer<typeof TaskNoteApiImageSchema>;
export type TaskNoteApiEntry = z.infer<typeof TaskNoteApiEntrySchema>;
```

Also add `z` import at the top of the file.

---

### Step 2 — Add `plainTextToComposerContent` to `packages/task-notes/src/lib/task-note-serialization.ts`

Append to existing file (do NOT replace existing functions):

```ts
import type { CaseMessageContent } from "@beyo/cases";

// Converts a stored plain_text string back to CaseMessageContent for
// pre-populating the Lexical composer in edit mode. Round-trips losslessly
// because toTaskNoteContentBlocks already reduces to plain text.
export function plainTextToComposerContent(text: string): CaseMessageContent {
  return {
    parts: text.trim() ? [{ text }] : [],
  };
}
```

Note: `CaseMessageContent` is already imported by the file (check and re-use existing import rather than duplicating).

---

### Step 3 — Create `packages/task-notes/src/api/task-note-keys.ts`

```ts
export const taskNoteKeys = {
  all: ["task-notes"] as const,
  lists: () => [...taskNoteKeys.all, "list"] as const,
  list: (taskId: string) => [...taskNoteKeys.lists(), taskId] as const,
};
```

---

### Step 4 — Create `packages/task-notes/src/api/fetch-task-notes.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { TaskNoteApiEntrySchema, type TaskNoteApiEntry } from "../types";

const ListTaskNotesResponseSchema = ApiEnvelopeSchema(
  z.object({ task_notes: z.array(TaskNoteApiEntrySchema) }),
).extend({ ok: z.literal(true) });

export async function fetchTaskNotes(taskId: string): Promise<TaskNoteApiEntry[]> {
  const parsed = await apiClient.get(
    `/api/v1/tasks/${taskId}/notes`,
    ListTaskNotesResponseSchema,
  );
  return parsed.data.task_notes;
}
```

---

### Step 5 — Create `packages/task-notes/src/api/use-task-notes-query.ts`

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchTaskNotes } from "./fetch-task-notes";
import { taskNoteKeys } from "./task-note-keys";

export function useTaskNotesQuery(taskId: string | null | undefined) {
  return useQuery({
    queryKey: taskId
      ? taskNoteKeys.list(taskId)
      : [...taskNoteKeys.lists(), "missing"],
    queryFn: () => {
      if (!taskId) {
        throw new Error("Task id is required.");
      }
      return fetchTaskNotes(taskId);
    },
    enabled: Boolean(taskId),
  });
}
```

---

### Step 6 — Create `packages/task-notes/src/api/create-task-note.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskNoteContentBlock } from "../types";

const CreateTaskNoteResponseSchema = ApiEnvelopeSchema(
  z.object({ client_ids: z.array(z.string()) }),
).extend({ ok: z.literal(true) });

export type CreateTaskNoteInput = {
  taskId: string;
  clientId: string;
  content: TaskNoteContentBlock[];
  plainText: string;
  usersReadList: string[];
};

export async function createTaskNote({
  taskId,
  clientId,
  content,
  plainText,
  usersReadList,
}: CreateTaskNoteInput): Promise<{ clientIds: string[] }> {
  const parsed = await apiClient.post(
    `/api/v1/tasks/${taskId}/notes`,
    CreateTaskNoteResponseSchema,
    [
      {
        client_id: clientId,
        note_type: "user_note",
        content,
        plain_text: plainText,
        users_read_list: usersReadList,
      },
    ],
  );
  return { clientIds: parsed.data.client_ids };
}
```

---

### Step 7 — Create `packages/task-notes/src/api/use-create-task-note.ts`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTaskNote, type CreateTaskNoteInput } from "./create-task-note";
import { taskNoteKeys } from "./task-note-keys";

export function useCreateTaskNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskNoteInput) => createTaskNote(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(variables.taskId),
      });
    },
  });
}
```

---

### Step 8 — Create `packages/task-notes/src/api/update-task-note.ts`

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { TaskNoteContentBlock } from "../types";

const UpdateTaskNoteResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export type UpdateTaskNoteInput = {
  taskId: string;
  noteId: string;
  content?: TaskNoteContentBlock[];
  plainText?: string;
};

export async function updateTaskNote({
  taskId,
  noteId,
  content,
  plainText,
}: UpdateTaskNoteInput): Promise<{ clientId: string }> {
  const body: Record<string, unknown> = {};
  if (content !== undefined) body["content"] = content;
  if (plainText !== undefined) body["plain_text"] = plainText;

  const parsed = await apiClient.patch(
    `/api/v1/tasks/${taskId}/notes/${noteId}`,
    UpdateTaskNoteResponseSchema,
    body,
  );
  return { clientId: parsed.data.client_id };
}
```

---

### Step 9 — Create `packages/task-notes/src/api/use-update-task-note.ts`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTaskNote, type UpdateTaskNoteInput } from "./update-task-note";
import { taskNoteKeys } from "./task-note-keys";

export function useUpdateTaskNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskNoteInput) => updateTaskNote(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(variables.taskId),
      });
    },
  });
}
```

---

### Step 10 — Create `packages/task-notes/src/api/delete-task-note.ts`

> `DELETE /api/v1/tasks/{task_id}/notes/{note_id}` is confirmed in the handoff. Use `apiClient.delete(...)` directly.

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const DeleteTaskNoteResponseSchema = ApiEnvelopeSchema(
  z.object({ client_id: z.string() }),
).extend({ ok: z.literal(true) });

export type DeleteTaskNoteInput = {
  taskId: string;
  noteId: string;
};

export async function deleteTaskNote({
  taskId,
  noteId,
}: DeleteTaskNoteInput): Promise<void> {
  await apiClient.delete(
    `/api/v1/tasks/${taskId}/notes/${noteId}`,
    DeleteTaskNoteResponseSchema,
  );
}
```

---

### Step 11 — Create `packages/task-notes/src/api/use-delete-task-note.ts`

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTaskNote, type DeleteTaskNoteInput } from "./delete-task-note";
import { taskNoteKeys } from "./task-note-keys";

export function useDeleteTaskNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteTaskNoteInput) => deleteTaskNote(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(variables.taskId),
      });
    },
  });
}
```

---

### Step 12 — Create `packages/task-notes/src/surface-ids.ts`

```ts
export const TASK_NOTES_SHEET_SURFACE_ID = "task-notes-sheet";

export type TaskNotesSheetSurfaceProps = {
  taskId: string;
  /**
   * When true, the edit icon and create "+" button are hidden regardless of role.
   * Use this when embedding the sheet in read-only contexts.
   */
  hideEditCapability?: boolean;
};

export async function preloadTaskNotesSheetSurface(): Promise<void> {
  await import("./pages/TaskNotesSheetPage");
}
```

---

### Step 13 — Create `packages/task-notes/src/components/TaskNoteContentView.tsx`

Renders stored `TaskNoteContentBlock[]` as styled text paragraphs. No Lexical dependency — pure HTML.

```tsx
import type { TaskNoteContentBlock } from "../types";

type TaskNoteContentViewProps = {
  content: TaskNoteContentBlock[];
  plainText: string;
  testId?: string;
};

export function TaskNoteContentView({
  content,
  plainText,
  testId = "task-note-content-view",
}: TaskNoteContentViewProps): React.JSX.Element {
  const displayText =
    content.length > 0
      ? content.map((b) => b.text ?? "").join("")
      : plainText;

  if (!displayText.trim()) {
    return (
      <p
        className="text-sm italic text-muted-foreground"
        data-testid={`${testId}-empty`}
      >
        No content
      </p>
    );
  }

  return (
    <p
      className="whitespace-pre-wrap text-sm text-foreground"
      data-testid={testId}
    >
      {displayText}
    </p>
  );
}
```

---

### Step 14 — Create `packages/task-notes/src/components/TaskNoteCardRow.tsx`

Used in the list container. Shows truncated preview (2-line clamp) on the left and a confirm-delete button on the right.

```tsx
import { ConfirmActionButton } from "@beyo/ui";
import type { TaskNoteApiEntry } from "../types";

type TaskNoteCardRowProps = {
  entry: TaskNoteApiEntry;
  onPress: () => void;
  onDelete: () => void;
  testId?: string;
};

export function TaskNoteCardRow({
  entry,
  onPress,
  onDelete,
  testId = "task-note-card-row",
}: TaskNoteCardRowProps): React.JSX.Element {
  const { note } = entry;
  // Use plain_text for the preview; fall back to first content block text.
  const previewText =
    note.plain_text ||
    (note.content[0]?.text ?? "");

  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <button
        className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 text-left"
        data-testid={`${testId}-press`}
        type="button"
        onClick={onPress}
      >
        <p className="line-clamp-2 text-sm text-foreground">{previewText}</p>
        {note.created_by ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {note.created_by.username}
          </p>
        ) : null}
      </button>
      <ConfirmActionButton
        className="shrink-0"
        confirmLabel="Sure?"
        data-testid={`${testId}-delete`}
        label="Delete"
        onConfirm={onDelete}
      />
    </div>
  );
}
```

---

### Step 15 — Create `packages/task-notes/src/components/TaskNotePill.tsx`

Self-contained: fetches note count internally, calls `onPress` on tap. Parent is responsible for opening the surface.

The `hideWhenEmpty` prop controls whether to render at all when count is zero:
- `hideWhenEmpty={false}` (default): always renders, shows `"--"` when count is 0 (managers-app behavior).
- `hideWhenEmpty={true}`: returns `null` when count is 0 (workers-app behavior).

```tsx
import { InfoPill } from "@beyo/ui";
import { useTaskNotesQuery } from "../api/use-task-notes-query";

type TaskNotePillProps = {
  hideWhenEmpty?: boolean;
  taskId: string;
  onPress: () => void;
  testId?: string;
};

export function TaskNotePill({
  hideWhenEmpty = false,
  taskId,
  onPress,
  testId = "task-note-pill",
}: TaskNotePillProps): React.JSX.Element | null {
  const { data: notes } = useTaskNotesQuery(taskId);
  const count = notes?.length ?? 0;

  if (hideWhenEmpty && count === 0) {
    return null;
  }

  const label = count === 0 ? "--" : `${count} note${count !== 1 ? "s" : ""}`;

  return (
    <button
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid={testId}
      type="button"
      onClick={onPress}
    >
      <InfoPill>{label}</InfoPill>
    </button>
  );
}
```

---

### Step 16 — Create `packages/task-notes/src/pages/TaskNotesSheetPage.tsx`

This is the most complex file. Read this step in full before writing any code.

#### Architecture: Three-panel slide system

Three panels are laid out side by side in a 300%-wide flex strip. The strip slides left/right to reveal each panel via CSS `transition-transform`. The outer container is `overflow-hidden`.

Strip panel order (left to right): **[Detail]** · **[List]** · **[Create]**

| Active container | `translateX` on strip | Visual result |
|---|---|---|
| `"list"` (default) | `-33.333%` | Center panel (List) is visible |
| `"detail"` | `0%` | Left panel (Detail) slides in; List exits right |
| `"create"` | `-66.666%` | Right panel (Create) slides in; List exits left |

This satisfies the directional requirements:
- List → Detail: list exits right, detail enters from left ✓
- List → Create: list exits left, create enters from right ✓
- Back from either: animations reverse ✓

#### Permission gating

```ts
const { hasRole, workspaceRoleName } = useRole();
const canEditNotes =
  !hideEditCapability &&
  (hasRole(AuthRole.Admin) || workspaceRoleName !== null);
```

`canEditNotes` gates: "+" (create), edit icon (detail), delete button (list cards).

#### Single-note auto-route

A `useEffect` that runs once after the first successful data load. If `notes.length === 1`, set `selectedNoteIndex = 0` and `activeContainer = "detail"`. This avoids a flash because the `useEffect` fires synchronously before the browser paints if the query result comes from cache; if not, there is a brief list view — acceptable.

#### In-page headers (surface header is hidden)

Call `header?.setHeaderHidden(true)` in a `useEffect([])`. Each panel renders its own inline header row.

#### Edit mode in detail panel

- `isEditMode` state (boolean). Default `false`.
- When `false`: shows `TaskNoteContentView` + read-only `ImagePreviewGrid hideAddButton maxImages={3}`.
- When `true`: shows `TaskNoteComposer initialContent={...} onChange={setEditComposerValue} onCheckDone={handleUpdateNote}` + `TaskNoteImagesSection` (uses `EntityImagesProvider` context from the panel wrapper).
- `handleUpdateNote`: calls `updateNote.mutateAsync(...)` (fire-and-forget, catch errors), then calls `header?.requestClose()` to close the entire sheet.
- `onCheckDone` on the composer = edit-mode save + close. The check button blurs the editor first (already handled internally by the composer), so the panel animates down cleanly.

#### Create container

- Generates a fresh `createNoteClientId` (via `generateClientId("TaskNote")`) each time the user enters the create panel (call `setCreateNoteClientId(generateClientId("TaskNote"))` inside `handleOpenCreate`).
- Wraps everything in `EntityImagesProvider entityClientId={createNoteClientId} entityType="note"`.
- `TaskNoteComposer` with no `onCheckDone` — the check button only dismisses the keyboard.
- `TaskNoteImagesSection` below the composer.
- "Save note" footer button (full width, `bg-primary`, `text-card`, `py-3.5`) calls `handleCreateNote`.
- `handleCreateNote`: fire-and-forget `createNote.mutateAsync(...)`, then `header?.requestClose()` immediately (optimistic close).

#### Full component skeleton (Codex must fill in all JSX details):

```tsx
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CirclePlus, SquarePen } from "lucide-react";

import { AuthRole, RoleGuard, useAuthStore, useRole, selectUser } from "@beyo/auth";
import {
  EntityImagesProvider,
  ImagePreviewGrid,
} from "@beyo/images";
import { generateClientId } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useTaskNotesQuery } from "../api/use-task-notes-query";
import { useCreateTaskNote } from "../api/use-create-task-note";
import { useUpdateTaskNote } from "../api/use-update-task-note";
import { useDeleteTaskNote } from "../api/use-delete-task-note";
import { TaskNoteComposer } from "../components/TaskNoteComposer";
import { TaskNoteContentView } from "../components/TaskNoteContentView";
import { TaskNoteCardRow } from "../components/TaskNoteCardRow";
import { TaskNoteImagesSection } from "../components/TaskNoteImagesSection";
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
  plainTextToComposerContent,
} from "../lib/task-note-serialization";
import type { TaskNoteComposerValue } from "../types";
import type { TaskNotesSheetSurfaceProps } from "../surface-ids";

type Container = "list" | "detail" | "create";

const STRIP_OFFSET: Record<Container, string> = {
  detail: "0%",
  list: "-33.333%",
  create: "-66.666%",
};

export function TaskNotesSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, hideEditCapability = false } =
    useSurfaceProps<TaskNotesSheetSurfaceProps>();

  const { data: notes, isPending } = useTaskNotesQuery(taskId ?? "");

  const [activeContainer, setActiveContainer] = useState<Container>("list");
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editComposerValue, setEditComposerValue] =
    useState<TaskNoteComposerValue | null>(null);
  const [createComposerValue, setCreateComposerValue] =
    useState<TaskNoteComposerValue | null>(null);
  const [createNoteClientId, setCreateNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );

  const { hasRole, workspaceRoleName } = useRole();
  const currentUser = useAuthStore(selectUser);
  const currentUserId = currentUser?.id ? String(currentUser.id) : "";

  const canEditNotes =
    !hideEditCapability &&
    (hasRole(AuthRole.Admin) || workspaceRoleName !== null);

  const createNote = useCreateTaskNote();
  const updateNote = useUpdateTaskNote();
  const deleteNote = useDeleteTaskNote();

  const selectedNote = notes?.[selectedNoteIndex] ?? null;

  // Hide surface header — each panel has its own inline header.
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  // Auto-route to detail when exactly one note exists.
  useEffect(() => {
    if (!isPending && notes && notes.length === 1) {
      setSelectedNoteIndex(0);
      setActiveContainer("detail");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, notes?.length]);

  const handleSelectNote = useCallback((index: number) => {
    setSelectedNoteIndex(index);
    setIsEditMode(false);
    setEditComposerValue(null);
    setActiveContainer("detail");
  }, []);

  const handleBackToList = useCallback(() => {
    setIsEditMode(false);
    setEditComposerValue(null);
    setActiveContainer("list");
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateNoteClientId(generateClientId("TaskNote"));
    setCreateComposerValue(null);
    setActiveContainer("create");
  }, []);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      if (!taskId) return;
      deleteNote.mutate(
        { taskId, noteId },
        {
          onSuccess: () => {
            if (activeContainer === "detail") {
              setActiveContainer("list");
            }
          },
        },
      );
    },
    [taskId, deleteNote, activeContainer],
  );

  const handleUpdateNote = useCallback(() => {
    if (!taskId || !selectedNote) return;
    const content = editComposerValue
      ? toTaskNoteContentBlocks(editComposerValue.content)
      : selectedNote.note.content;
    const plainText =
      editComposerValue?.plainText ?? selectedNote.note.plain_text;

    void updateNote
      .mutateAsync({ taskId, noteId: selectedNote.note.client_id, content, plainText })
      .catch(() => {});

    header?.requestClose();
  }, [taskId, selectedNote, editComposerValue, updateNote, header]);

  const handleCreateNote = useCallback(() => {
    if (!taskId || !hasMeaningfulNoteContent(createComposerValue)) return;

    void createNote
      .mutateAsync({
        taskId,
        clientId: createNoteClientId,
        content: toTaskNoteContentBlocks(createComposerValue.content),
        plainText: createComposerValue.plainText,
        usersReadList: currentUserId ? [currentUserId] : [],
      })
      .catch(() => {});

    header?.requestClose();
  }, [taskId, createComposerValue, createNote, createNoteClientId, currentUserId, header]);

  // Strip CSS transform
  const stripStyle: React.CSSProperties = {
    width: "300%",
    display: "flex",
    transform: `translateX(${STRIP_OFFSET[activeContainer]})`,
    transition: "transform 300ms ease-in-out",
  };

  const panelStyle: React.CSSProperties = {
    width: "33.333%",
    flexShrink: 0,
    overflowY: "auto",
    height: "100%",
  };

  return (
    <div
      className="h-full overflow-hidden"
      data-testid="task-notes-sheet"
    >
      <div style={stripStyle}>

        {/* ── Panel 1: Detail ───────────────────────────────────────────── */}
        <div style={panelStyle} data-testid="task-notes-detail-panel">
          {/* Inline header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              aria-label="Back to notes list"
              className="flex size-9 items-center justify-center rounded-full text-foreground"
              type="button"
              onClick={handleBackToList}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <span className="text-base font-semibold text-foreground">Note</span>
            {canEditNotes && !isEditMode ? (
              <button
                aria-label="Edit note"
                className="flex size-9 items-center justify-center rounded-full text-foreground"
                data-testid="task-notes-edit-button"
                type="button"
                onClick={() => setIsEditMode(true)}
              >
                <SquarePen aria-hidden="true" className="size-5" />
              </button>
            ) : (
              <div aria-hidden="true" className="size-9" />
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-4 px-4 pb-8">
            {selectedNote ? (
              isEditMode ? (
                /* Edit mode: composer + note images */
                <EntityImagesProvider
                  captureFlow="camera-to-editor"
                  deleteMode="hard-delete"
                  entityClientId={selectedNote.note.client_id}
                  entityType="note"
                >
                  <TaskNoteComposer
                    initialContent={plainTextToComposerContent(
                      selectedNote.note.plain_text,
                    )}
                    onChange={setEditComposerValue}
                    onCheckDone={handleUpdateNote}
                    testId="task-notes-edit-composer"
                  />
                  <TaskNoteImagesSection testId="task-notes-edit-images" />
                </EntityImagesProvider>
              ) : (
                /* Read mode: content view + read-only image grid */
                <>
                  <TaskNoteContentView
                    content={selectedNote.note.content}
                    plainText={selectedNote.note.plain_text}
                    testId="task-notes-content-view"
                  />
                  <EntityImagesProvider
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityClientId={selectedNote.note.client_id}
                    entityType="note"
                  >
                    <ImagePreviewGrid
                      hideAddButton
                      maxImages={3}
                      testId="task-notes-detail-images"
                    />
                  </EntityImagesProvider>
                </>
              )
            ) : null}
          </div>
        </div>

        {/* ── Panel 2: List (center / home) ─────────────────────────────── */}
        <div style={panelStyle} data-testid="task-notes-list-panel">
          {/* Inline header */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-base font-semibold text-foreground">Notes</span>
            {canEditNotes ? (
              <button
                aria-label="Add note"
                className="flex size-9 items-center justify-center rounded-full text-foreground"
                data-testid="task-notes-add-button"
                type="button"
                onClick={handleOpenCreate}
              >
                <CirclePlus aria-hidden="true" className="size-5" />
              </button>
            ) : null}
          </div>

          {/* List body */}
          <div className="flex flex-col gap-3 px-4 pb-8">
            {isPending ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading notes…
              </div>
            ) : notes && notes.length > 0 ? (
              notes.map((entry, index) => (
                <TaskNoteCardRow
                  key={entry.note.client_id}
                  entry={entry}
                  testId={`task-note-card-${entry.note.client_id}`}
                  onDelete={() => handleDeleteNote(entry.note.client_id)}
                  onPress={() => handleSelectNote(index)}
                />
              ))
            ) : (
              <div
                className="rounded-3xl border border-dashed border-border px-6 py-10 text-center"
                data-testid="task-notes-empty"
              >
                <p className="text-sm font-medium text-foreground">No notes yet</p>
                {canEditNotes ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tap + to add a note.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel 3: Create ───────────────────────────────────────────── */}
        <div style={panelStyle} data-testid="task-notes-create-panel">
          {/* Inline header */}
          <div className="flex items-center justify-between px-4 py-3">
            <button
              aria-label="Back to notes list"
              className="flex size-9 items-center justify-center rounded-full text-foreground"
              type="button"
              onClick={handleBackToList}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <span className="text-base font-semibold text-foreground">New note</span>
            <div aria-hidden="true" className="size-9" />
          </div>

          {/* Create body */}
          <EntityImagesProvider
            captureFlow="camera-to-editor"
            deleteMode="hard-delete"
            entityClientId={createNoteClientId}
            entityType="note"
          >
            <div className="flex flex-col gap-4 px-4 pb-8">
              <TaskNoteComposer
                onChange={setCreateComposerValue}
                testId="task-notes-create-composer"
              />
              <TaskNoteImagesSection testId="task-notes-create-images" />
              <button
                className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-card transition-opacity disabled:opacity-50"
                data-testid="task-notes-save-button"
                disabled={!hasMeaningfulNoteContent(createComposerValue)}
                type="button"
                onClick={handleCreateNote}
              >
                Save note
              </button>
            </div>
          </EntityImagesProvider>
        </div>

      </div>
    </div>
  );
}
```

---

### Step 17 — Edit `packages/task-notes/src/index.ts`

Add the following exports (append; do not remove existing exports):

```ts
// API
export { taskNoteKeys } from "./api/task-note-keys";
export { fetchTaskNotes } from "./api/fetch-task-notes";
export { useTaskNotesQuery } from "./api/use-task-notes-query";
export { createTaskNote } from "./api/create-task-note";
export type { CreateTaskNoteInput } from "./api/create-task-note";
export { useCreateTaskNote } from "./api/use-create-task-note";
export { updateTaskNote } from "./api/update-task-note";
export type { UpdateTaskNoteInput } from "./api/update-task-note";
export { useUpdateTaskNote } from "./api/use-update-task-note";
export { deleteTaskNote } from "./api/delete-task-note";
export type { DeleteTaskNoteInput } from "./api/delete-task-note";
export { useDeleteTaskNote } from "./api/use-delete-task-note";

// Components
export { TaskNotePill } from "./components/TaskNotePill";
export { TaskNoteCardRow } from "./components/TaskNoteCardRow";
export { TaskNoteContentView } from "./components/TaskNoteContentView";

// Pages
export { TaskNotesSheetPage } from "./pages/TaskNotesSheetPage";

// Surface IDs and preloaders
export {
  TASK_NOTES_SHEET_SURFACE_ID,
  preloadTaskNotesSheetSurface,
} from "./surface-ids";
export type { TaskNotesSheetSurfaceProps } from "./surface-ids";

// Types (add new)
export type {
  TaskNoteApiUser,
  TaskNoteApiNote,
  TaskNoteApiImage,
  TaskNoteApiEntry,
} from "./types";

// Serialization (add new helper)
export { plainTextToComposerContent } from "./lib/task-note-serialization";
```

---

### Step 18 — Edit `packages/task-notes/package.json`

Add the following entries to `"peerDependencies"`:

```json
"@beyo/api-client": "*",
"@beyo/auth": "*",
"@beyo/hooks": "*",
"@tanstack/react-query": ">=5.0.0",
"react-hook-form": ">=7.0.0",
"zod": ">=4.0.0"
```

The existing peers (`@beyo/cases`, `@beyo/images`, `@beyo/lib`, `@beyo/ui`, `lucide-react`, `react`) remain unchanged.

---

### Step 19 — Edit `packages/tasks/src/components/detail/TaskScheduledDeliverySection.tsx`

Add a `notesPillSlot?: React.ReactNode` prop. The slot is rendered to the left of the delivery date pill.

```tsx
type TaskScheduledDeliverySectionProps = {
  notesPillSlot?: React.ReactNode;  // ← ADD
  onOpenDeliveryDate: () => void;
  taskDetail: TaskDetailRaw | null;
};

export function TaskScheduledDeliverySection({
  notesPillSlot,              // ← ADD
  onOpenDeliveryDate,
  taskDetail,
}: TaskScheduledDeliverySectionProps): React.JSX.Element | null {
  if (!taskDetail) {
    return null;
  }

  const { task } = taskDetail;
  const isInternalTask = task.task_type === "internal";

  return (
    <DashedInfoSection data-testid="task-detail-schedule-section">
      <div className="flex items-start gap-6">
        {notesPillSlot}           {/* ← ADD */}
        {!isInternalTask ? (
          <TaskScheduledDeliveryDatePill
            scheduledEndAt={task.scheduled_end_at ?? null}
            scheduledStartAt={task.scheduled_start_at ?? null}
            onPress={onOpenDeliveryDate}
          />
        ) : null}
      </div>
    </DashedInfoSection>
  );
}
```

---

### Step 20 — Edit `apps/managers-app/.../src/features/tasks/surfaces.ts`

1. Add import at the top:
   ```ts
   import {
     TASK_NOTES_SHEET_SURFACE_ID,
     type TaskNotesSheetSurfaceProps,
   } from "@beyo/task-notes";
   ```

2. Add a lazy-loaded page constant (alongside other `lazyWithPreload` declarations in the file):
   ```ts
   const LazyTaskNotesSheetPage = lazyWithPreload(() =>
     import("@beyo/task-notes").then((m) => ({ default: m.TaskNotesSheetPage })),
   );
   ```

3. Add to the `SurfaceRegistrations` object exported from (or returned by) the file — wherever the existing sheets like `TASK_READY_BY_AT_SHEET_SURFACE_ID` are registered:
   ```ts
   [TASK_NOTES_SHEET_SURFACE_ID]: {
     type: "bottom-sheet",
     Component: LazyTaskNotesSheetPage,
   },
   ```

   Use whatever `SurfaceType` string is used for bottom sheets in this app. Check other note-like sheet surfaces (e.g., `TASK_READY_BY_AT_SHEET_SURFACE_ID`) and use the same type string.

4. Re-export the surface ID and props type so the app's controller can import them from this surfaces file (or keep them imported only where needed — check existing patterns in the app).

---

### Step 21 — Edit `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx`

1. Add imports:
   ```ts
   import {
     TaskNotePill,
     preloadTaskNotesSheetSurface,
   } from "@beyo/task-notes";
   import { TASK_NOTES_SHEET_SURFACE_ID } from "@/features/tasks/surfaces";
   import { usePreloadSurface } from "@beyo/hooks";
   ```

2. Inside `TaskDetailSlidePageContent`, add preload call (alongside other `usePreloadSurface` calls if any, otherwise add it near the top of the component body):
   ```ts
   usePreloadSurface(preloadTaskNotesSheetSurface);
   ```
   Note: `usePreloadSurface` is from `@beyo/hooks`.

3. In the JSX where `<TaskScheduledDeliverySection>` is rendered, pass the `notesPillSlot` prop:
   ```tsx
   <TaskScheduledDeliverySection
     notesPillSlot={
       controller.taskDetail?.task.client_id ? (
         <TaskNotePill
           taskId={controller.taskDetail.task.client_id}
           onPress={() =>
             surface.open(TASK_NOTES_SHEET_SURFACE_ID, {
               taskId: controller.taskDetail!.task.client_id,
             })
           }
           testId="task-detail-notes-pill"
         />
       ) : null
     }
     onOpenDeliveryDate={controller.openDeliveryDateSheet}
     taskDetail={controller.taskDetail}
   />
   ```

   The `surface` object comes from `useSurface()` — check whether it is already called in `TaskDetailSlidePageContent`. If not, add `const surface = useSurface();` and import `useSurface` from `@beyo/hooks`.

   The `taskId` on `controller.taskDetail.task.client_id` — verify the actual field name by reading `TaskDetailRaw` in `@beyo/tasks`. It may be `task_id` or `client_id`. Use whatever `taskId` is already passed to `TaskDetailProvider` in the page (`const { taskId } = useSurfaceProps<TaskDetailSurfaceProps>()`). Use that `taskId` directly:

   ```tsx
   notesPillSlot={
     <TaskNotePill
       taskId={taskId}
       onPress={() =>
         surface.open(TASK_NOTES_SHEET_SURFACE_ID, { taskId })
       }
       testId="task-detail-notes-pill"
     />
   }
   ```

   Place this in `TaskDetailSlidePageContent` and ensure `taskId` is accessible there (it's a prop or comes from a context). Check the existing component structure — `TaskDetailSlidePage` passes `taskId` to `TaskDetailProvider`, and `TaskDetailSlidePageContent` reads it via `controller.taskId`. Use `controller.taskId`.

---

### Step 22 — Edit `apps/workers-app/ManagerBeyo-app-workers/package.json`

Add `@beyo/task-notes` to the `"dependencies"` object (alphabetically alongside other `@beyo/*` packages):

```json
"@beyo/task-notes": "*",
```

---

### Step 23 — Edit `apps/workers-app/ManagerBeyo-app-workers/src/index.css`

Add the following `@source` line after the last existing `@source` directive (currently `@source "../../../../packages/working-sections/src"`):

```css
@source "../../../../packages/task-notes/src";
```

---

### Step 24 — Edit `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

This is the workers-app task-step surface registry at the path above. Follow the exact pattern used by existing entries (`lazyWithPreload` + named loader function + named const + export preload + register in `taskStepSurfaces`).

1. Add import at the top of the file:
   ```ts
   import {
     TASK_NOTES_SHEET_SURFACE_ID,
     type TaskNotesSheetSurfaceProps,
   } from "@beyo/task-notes";
   ```

2. Add a loader function (alongside the other `load*` functions):
   ```ts
   function loadTaskNotesSheetPage() {
     return import("@beyo/task-notes").then((module) => ({
       default: module.TaskNotesSheetPage,
     }));
   }
   ```

3. Add the `lazyWithPreload` constant (alongside the other `const` declarations):
   ```ts
   const taskNotesSheet = lazyWithPreload(loadTaskNotesSheetPage);
   ```

4. Export the preload function (alongside the other `export const preload*` lines):
   ```ts
   export const preloadTaskNotesSheetSurface = taskNotesSheet.preload;
   ```

5. Register inside `taskStepSurfaces` (alongside `[TASK_SCHEDULED_DELIVERY_SHEET_SURFACE_ID]` and similar sheet surfaces):
   ```ts
   [TASK_NOTES_SHEET_SURFACE_ID]: {
     surface: "sheet",
     component: taskNotesSheet.Component,
   },
   ```

The `type TaskNotesSheetSurfaceProps` import is not strictly required at this file but add it if the registration type needs it; otherwise just import the ID and the page component.

---

### Step 25 — Edit `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`

Add a `notesPillSlot?: React.ReactNode` prop and render it to the **left** of `TaskScheduledDeliveryDatePill` inside the horizontal flex div.

Current structure (simplified):
```tsx
<div className="flex items-start gap-4 overflow-x-auto">
  {shouldRenderDeliveryWindow ? (
    <TaskScheduledDeliveryDatePill ... />
  ) : null}
</div>
```

After change:
```tsx
type TaskStepItemDetailsSectionProps = {
  notesPillSlot?: React.ReactNode;
};

export function TaskStepItemDetailsSection({
  notesPillSlot,
}: TaskStepItemDetailsSectionProps): React.JSX.Element | null {
  const { step, workingSectionId, issuesSurfaceOpeners, openDeliveryDateSheet } =
    useTaskStepDetailContext();

  if (!step?.item) {
    return null;
  }

  const shouldRenderDeliveryWindow = step.task.task_type !== "internal";

  return (
    <DashedInfoGroup data-testid="task-step-item-details">
      <DashedInfoSection className="px-3 py-3">
        <div className="flex items-start gap-4 overflow-x-auto">
          {notesPillSlot}
          {shouldRenderDeliveryWindow ? (
            <TaskScheduledDeliveryDatePill
              scheduledEndAt={step.task.scheduled_end_at ?? null}
              scheduledStartAt={step.task.scheduled_start_at ?? null}
              onPress={openDeliveryDateSheet}
            />
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

---

### Step 26 — Edit `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`

1. Add imports:
   ```ts
   import {
     TaskNotePill,
     preloadTaskNotesSheetSurface,
   } from "@beyo/task-notes";
   import { useSurface } from "@beyo/hooks";
   import {
     preloadCompleteTaskStepConfirmationSlideSurface,
     preloadTaskScheduledDeliverySheetSurface,
     preloadTaskNotesSheetSurface as preloadTaskNotesSheetSurfaceFromSurfaces,
   } from "@/features/task_steps/surfaces";
   ```

   **Important:** `preloadTaskNotesSheetSurface` is imported from `@beyo/task-notes` for `usePreloadSurface`; and `TASK_NOTES_SHEET_SURFACE_ID` from the local surfaces file. The local surfaces file also exports `preloadTaskNotesSheetSurface` (Step 24). Use whichever import matches the pattern already used in this file for other preloads. Looking at the existing imports:
   ```ts
   import {
     preloadCompleteTaskStepConfirmationSlideSurface,
     preloadTaskScheduledDeliverySheetSurface,
   } from "@/features/task_steps/surfaces";
   ```
   So add `preloadTaskNotesSheetSurface` and `TASK_NOTES_SHEET_SURFACE_ID` to the same `@/features/task_steps/surfaces` import:
   ```ts
   import {
     preloadCompleteTaskStepConfirmationSlideSurface,
     preloadTaskScheduledDeliverySheetSurface,
     preloadTaskNotesSheetSurface,
     TASK_NOTES_SHEET_SURFACE_ID,
   } from "@/features/task_steps/surfaces";
   ```
   Do **not** add a separate import from `@beyo/task-notes` for the preload function; the local surfaces re-export is sufficient.

   Also add `TaskNotePill` import from `@beyo/task-notes`:
   ```ts
   import { TaskNotePill } from "@beyo/task-notes";
   ```

2. In `TaskDetailSlidePageContent`, add `useSurface`:
   ```ts
   const surface = useSurface();
   ```
   (`useSurface` is already imported in other pages — add to the existing `@beyo/hooks` import line if it's not already there.)

3. Add preload call alongside the existing two:
   ```ts
   usePreloadSurface(preloadCompleteTaskStepConfirmationSlideSurface);
   usePreloadSurface(preloadTaskScheduledDeliverySheetSurface);
   usePreloadSurface(preloadTaskNotesSheetSurface);   // ← ADD
   ```

4. In the JSX where `<TaskStepItemDetailsSection />` is rendered (currently line ~144 in the file, inside `ContentCard`), pass the `notesPillSlot` prop:
   ```tsx
   <TaskStepItemDetailsSection
     notesPillSlot={
       controller.taskId ? (
         <TaskNotePill
           hideWhenEmpty
           taskId={controller.taskId}
           onPress={() =>
             surface.open(TASK_NOTES_SHEET_SURFACE_ID, {
               taskId: controller.taskId,
               hideEditCapability: false,
             })
           }
           testId="task-step-notes-pill"
         />
       ) : null
     }
   />
   ```

   `controller.taskId` — verify this is exposed on the context object returned by `useTaskStepDetailContext()`. If only `controller.vm.taskId` exists, use that with a null guard:
   ```tsx
   notesPillSlot={
     controller.vm?.taskId ? (
       <TaskNotePill
         hideWhenEmpty
         taskId={controller.vm.taskId}
         onPress={() =>
           surface.open(TASK_NOTES_SHEET_SURFACE_ID, {
             taskId: controller.vm!.taskId,
             hideEditCapability: false,
           })
         }
         testId="task-step-notes-pill"
       />
     ) : null
   }
   ```

---

## Risks and mitigations

- **Risk:** `CaseMessageContent` parts shape may have additional required fields beyond `text`, causing `plainTextToComposerContent` to produce an invalid initial value for the Lexical editor.
  **Mitigation:** After implementing, test with a real device by navigating to edit mode on a note with existing content. If the editor crashes or shows nothing, verify the `CaseMessageContent` type definition in `@beyo/cases` and adjust the parts shape accordingly. The `content` prop on `LazyCaseComposerEditor` is initial-value-only (uncontrolled), so a minor mismatch may still work with a degraded initial state rather than a crash.

- **Risk:** `notes.length === 1` auto-route effect fires before the query data is available, causing a one-frame flash of the list panel.
  **Mitigation:** The `enabled: Boolean(taskId)` guard and `isPending` check in the effect minimize this. If the data is cache-warm (prefetched by the app on pill preload), the effect fires during the first render cycle and there is no visible flash.

- **Risk:** `TaskNotesSheetPage` imports from `@beyo/auth`, `@beyo/hooks`, and `@tanstack/react-query` which are new peer dependencies of `@beyo/task-notes`. If `npm install` is not re-run after editing `package.json`, the workspace symlinks will be stale.
  **Mitigation:** Run `npm install` from the `frontend/` root after editing `package.json`.

---

## Validation plan

- `npm run typecheck` from `frontend/`: zero TypeScript errors in both `@beyo/task-notes` and the managers app.
- Manual smoke test (mobile device or browser devtools mobile simulation):

  **Managers-app:**
  1. Open a task detail page. The `TaskNotePill` inside `TaskScheduledDeliverySection` renders with `"--"` if no notes, `"N notes"` if notes exist.
  2. Tap the pill → bottom sheet opens on the list container.
  3. Tap a note card → detail panel slides in (list slides right, detail from left).
  4. Back arrow → returns to list.
  5. Tap "+" → create panel slides in (list slides left, create from right).
  6. Type a note, tap "Save note" → sheet closes; re-open shows the new note.
  7. Enter edit mode on a note, modify text, tap check button → sheet closes; re-open shows updated text.
  8. Tap delete on a note card → confirm action, note disappears from list.
  9. Confirm role-gating: sign in as a user without `admin` role and no workspace role → "+" button, edit icon, and delete buttons are hidden.

  **Workers-app:**
  10. Open a task step detail with **no notes** → `TaskNotePill` is not visible at all in `TaskStepItemDetailsSection`.
  11. Open a task step detail with **notes** → pill renders to the left of the delivery date pill showing `"N note(s)"`. Tapping opens the notes sheet.
  12. Notes sheet works the same way (list, detail, create containers).

---

## Review log

- 2026-06-26: Added workers-app wiring (Steps 22–26): `TaskNotePill hideWhenEmpty`, `TaskStepItemDetailsSection notesPillSlot`, workers surfaces registration, package.json + index.css additions. Scope section updated accordingly.

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
