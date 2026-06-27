# PLAN_task_note_unread_viewer_20260626

## Metadata

- Plan ID: `PLAN_task_note_unread_viewer_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T18:00:00Z`
- Last updated at (UTC): `2026-06-26T16:25:19Z`
- Related issue/ticket: —
- Intention plan: —
- Source summary: `docs/architecture/implemented_summaries/SUMMARY_task_note_unread_viewer_20260626.md`

## Goal and intent

- Goal: Create a `TaskNoteUnreadViewerPage` sheet that presents unread task notes as a horizontal carousel, allowing users to swipe through them and mark each one as read with a "Got it" button. A package-owned controller (`useTaskNotesUnreadController`) mounts on both app task detail pages and fires the surface automatically whenever the current user has at least one unread note.
- Business/user intent: Workers and managers should be notified of new notes on the tasks they open, and should be able to dismiss them one by one with an explicit acknowledgment.
- Non-goals: Pagination of notes; real-time receipt events; editing or deleting notes from within the unread viewer.

## Scope

- In scope:
  - `POST /api/v1/tasks/{task_id}/notes/{note_id}/read-by` API function and optimistic action hook
  - `useTaskNotesUnreadController` hook in `@beyo/task-notes` that detects unread notes and calls an `onOpen` callback (one-shot per mount, per contract 35 §13)
  - `TaskNoteUnreadViewerPage` sheet page with embla carousel, fixed-height container (tallest note), dot indicator, and "Got it" button
  - Surface ID + props type added to `@beyo/task-notes/surface-ids.ts`
  - Surface registration in both apps' surfaces files + `preloadTaskNoteUnreadViewerSurface` export
  - Controller mounting in both apps' `TaskDetailSlidePage.tsx` with `useCallback`-wrapped `onOpen`
  - `embla-carousel-react` added to `@beyo/task-notes` peer dependencies
- Out of scope:
  - Any modification to `TaskNotesSheetPage.tsx` or `TaskNotePill.tsx`
  - Auth-role gating of the viewer (all roles can read notes)
  - Removing slides from the carousel after acknowledgment mid-session
- Assumptions:
  - `useTaskNotesQuery(taskId)` is already implemented and shares a cache key with the pill, so the controller and viewer page hit the cache (no extra network requests on warm page loads)
  - `user.id` (type `UserId`, which is a string) is the correct value to place in `users_read_list` and in the `user_ids` body of the read-by endpoint
  - Both apps already have `embla-carousel-react` in their `dependencies` (confirmed: `^8.6.0` in both)
  - The surface type is `"sheet"` for `TASK_NOTE_UNREAD_VIEWER_SURFACE_ID`

## Clarifications required

None. All unknowns were resolved during planning.

## Acceptance criteria

1. When a task detail slide page opens and the notes query settles with at least one note whose `users_read_list` does not include `user.id`, the unread viewer sheet opens automatically (no second tap required).
2. The unread viewer shows only notes the current user has not read, presented as a horizontal swipeable carousel using embla-carousel.
3. Tapping "Got it" on a note calls `POST /api/v1/tasks/{task_id}/notes/{note_id}/read-by` with `{ user_ids: [user.id] }`, optimistically adds `user.id` to the note's `users_read_list` in the TanStack Query cache, invalidates `taskNoteKeys.list(taskId)` on settled, and advances the carousel to the next slide. When the last note is acknowledged the surface closes.
4. The sheet container height is fixed to the tallest unread note body (measured via a hidden measurement layer after the notes lock in) so the sheet does not resize between slides.
5. A dot indicator at the bottom shows the current position within the total unread note count.
6. The controller fires only once per page mount (guarded by a `useRef` flag). It does not call `surface.open` directly — it calls an `onOpen` prop supplied by the app (contract 35 §13).
7. `npm run typecheck` passes with zero TypeScript errors in both apps and in `packages/task-notes`.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query optimistic update + invalidation pattern for the `useMarkTaskNoteReadBy` action hook
- `architecture/08_hooks.md`: action hook shape (snapshot → rollback → invalidate on settled)
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface registration (`lazyWithPreload`), `useSurfaceProps`, `useSurfaceHeader`, surface type `"sheet"`
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` pattern, `preloadXxx` export, `usePreloadSurface`
- `architecture/35_shared_packages.md §13`: packages never call `openSurface` directly — callback injection via `onOpen` prop; app controller provides the implementation

### File read intent — pattern vs. relational

Permitted relational reads (existing behavior or field names):

- `packages/task-notes/src/types.ts` — exact Zod schema and field names (`users_read_list`, `client_id`)
- `packages/task-notes/src/api/task-note-keys.ts` — query key shape: `taskNoteKeys.list(taskId)`
- `packages/task-notes/src/api/use-task-notes-query.ts` — return shape and how to read `isPending` / `data`
- `packages/task-notes/src/surface-ids.ts` — current exports to extend
- `packages/task-notes/src/index.ts` — current exports to extend
- `packages/task-notes/src/pages/TaskNotesSheetPage.tsx` — `ReadonlyImageGrid`, `toViewerImages` shapes to replicate in the viewer page (file-local private helpers — do NOT import from this file, replicate inline)
- `packages/auth/src/store/auth.store.ts` — `AuthUser.id: UserId` is the string to put in `users_read_list`
- `packages/images/src/pages/ImageFullscreenViewerPage.tsx` — embla wiring pattern (`useEmblaCarousel`, `emblaApi.on("select", ...)`, `emblaApi.scrollTo`)
- `apps/managers-app/.../src/features/tasks/surfaces.ts` — where to add new surface registration
- `apps/managers-app/.../src/pages/tasks/TaskDetailSlidePage.tsx` — where to mount controller
- `apps/workers-app/.../src/features/task_steps/surfaces.ts` — where to add new surface registration
- `apps/workers-app/.../src/pages/task_steps/TaskDetailSlidePage.tsx` — where to mount controller

Prohibited pattern reads — contract already covers:
- Do not read another action hook to understand optimistic update shape → use `08_hooks.md`
- Do not read another controller hook to understand `useRef` guard pattern → use `08_hooks.md`

### Skill selection

- Primary skill: not applicable (no matching skill for this task type)

## Domain schemas consulted

- `packages/task-notes/src/types.ts`:
  - `TaskNoteApiEntry = { note: TaskNoteApiNote; note_images: TaskNoteApiImage[] }`
  - `TaskNoteApiNote.users_read_list: string[]`
  - `TaskNoteApiNote.client_id: string`
  - `TaskNoteApiNote.content: TaskNoteContentBlock[]`
  - `TaskNoteApiNote.plain_text: string`
  - `TaskNoteApiImage.client_id: string`, `image_url: string`, `width_px`, `height_px`, `file_size_bytes`, `created_at`
  - `TaskNoteApiNote.created_at: string`, `is_deleted: boolean`

## File manifest

| # | Action | Path |
|---|--------|------|
| 1 | NEW | `packages/task-notes/src/api/mark-task-note-read-by.ts` |
| 2 | NEW | `packages/task-notes/src/api/use-mark-task-note-read-by.ts` |
| 3 | NEW | `packages/task-notes/src/controllers/use-task-notes-unread.controller.ts` |
| 4 | NEW | `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` |
| 5 | MODIFIED | `packages/task-notes/src/surface-ids.ts` |
| 6 | MODIFIED | `packages/task-notes/src/index.ts` |
| 7 | MODIFIED | `packages/task-notes/package.json` |
| 8 | MODIFIED | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts` |
| 9 | MODIFIED | `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx` |
| 10 | MODIFIED | `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts` |
| 11 | MODIFIED | `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx` |

---

## Implementation plan

### Step 1 — API function: `mark-task-note-read-by.ts`

Create `packages/task-notes/src/api/mark-task-note-read-by.ts`:

```ts
import { apiClient } from "@beyo/api-client";

export type MarkTaskNoteReadByInput = {
  taskId: string;
  noteId: string;
  userIds: string[];
};

export type MarkTaskNoteReadByResult = {
  client_id: string;
};

export async function markTaskNoteReadBy(
  input: MarkTaskNoteReadByInput,
): Promise<MarkTaskNoteReadByResult> {
  const response = await apiClient.post<MarkTaskNoteReadByResult>(
    `/api/v1/tasks/${input.taskId}/notes/${input.noteId}/read-by`,
    { user_ids: input.userIds },
  );
  return response.data;
}
```

No Zod validation needed on the response — only the `client_id` is returned and we do not display it.

---

### Step 2 — Action hook: `use-mark-task-note-read-by.ts`

Create `packages/task-notes/src/api/use-mark-task-note-read-by.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { taskNoteKeys } from "./task-note-keys";
import type { TaskNoteApiEntry } from "../types";
import {
  markTaskNoteReadBy,
  type MarkTaskNoteReadByInput,
} from "./mark-task-note-read-by";

export function useMarkTaskNoteReadBy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTaskNoteReadBy,
    onMutate: async (input: MarkTaskNoteReadByInput) => {
      const queryKey = taskNoteKeys.list(input.taskId);
      await queryClient.cancelQueries({ queryKey });

      const snapshot = queryClient.getQueryData<TaskNoteApiEntry[]>(queryKey);

      queryClient.setQueryData<TaskNoteApiEntry[]>(queryKey, (old) =>
        old?.map((entry) => {
          if (entry.note.client_id !== input.noteId) return entry;
          const existing = new Set(entry.note.users_read_list);
          for (const id of input.userIds) existing.add(id);
          return {
            ...entry,
            note: {
              ...entry.note,
              users_read_list: Array.from(existing),
            },
          };
        }) ?? [],
      );

      return { snapshot };
    },
    onError: (_err, input, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(
          taskNoteKeys.list(input.taskId),
          context.snapshot,
        );
      }
    },
    onSettled: (_data, _err, input) => {
      void queryClient.invalidateQueries({
        queryKey: taskNoteKeys.list(input.taskId),
      });
    },
  });
}
```

---

### Step 3 — Controller: `use-task-notes-unread.controller.ts`

Create the `controllers/` directory under `packages/task-notes/src/` and add:

```ts
// packages/task-notes/src/controllers/use-task-notes-unread.controller.ts
import { useEffect, useRef } from "react";
import { useAuth } from "@beyo/auth";
import { useTaskNotesQuery } from "../api/use-task-notes-query";
import type { TaskNoteUnreadViewerSurfaceProps } from "../surface-ids";

export type UseTaskNotesUnreadControllerOptions = {
  taskId: string;
  onOpen: (props: TaskNoteUnreadViewerSurfaceProps) => void;
};

export function useTaskNotesUnreadController({
  taskId,
  onOpen,
}: UseTaskNotesUnreadControllerOptions): void {
  const { user } = useAuth();
  const notesQuery = useTaskNotesQuery(taskId);
  const hasFiredRef = useRef(false);

  // Keep a stable ref so the effect never re-runs due to onOpen identity changes.
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen; // updated every render, safe to do outside useEffect

  useEffect(() => {
    if (hasFiredRef.current || notesQuery.isPending || !user?.id) {
      return;
    }

    const userId: string = user.id;
    const entries = notesQuery.data ?? [];
    const hasUnread = entries.some(
      (entry) => !entry.note.users_read_list.includes(userId),
    );

    // Mark as fired regardless of result — no retry on subsequent data updates.
    hasFiredRef.current = true;

    if (!hasUnread) return;

    onOpenRef.current({ taskId });
  }, [notesQuery.isPending, notesQuery.data, taskId, user?.id]);
}
```

**Critical rules:**
- `hasFiredRef.current = true` is set BEFORE calling `onOpenRef.current(...)` so if the callback throws, the ref is already set (no double-fire).
- Dependency array does NOT include `onOpen` or `onOpenRef`. The ref pattern handles that.
- `user?.id` in deps: if user changes (logout/login), the effect re-runs but `hasFiredRef.current` is true so it no-ops. This is correct — the ref is mounted once per page mount.

---

### Step 4 — Surface IDs: extend `surface-ids.ts`

In `packages/task-notes/src/surface-ids.ts`, add below the existing exports:

```ts
export const TASK_NOTE_UNREAD_VIEWER_SURFACE_ID = "task-note-unread-viewer";

export type TaskNoteUnreadViewerSurfaceProps = {
  taskId: string;
};

export function preloadTaskNoteUnreadViewerSurface(): Promise<unknown> {
  return import("./pages/TaskNoteUnreadViewerPage");
}
```

Do NOT remove or modify any existing exports in this file.

---

### Step 5 — Page: `TaskNoteUnreadViewerPage.tsx`

Create `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx`.

Full implementation contract:

#### Imports
```ts
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useAuth } from "@beyo/auth";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  IMAGE_VIEWER_SURFACE_ID,
  type ImageLinkEntityType,
  type ImageViewModel,
} from "@beyo/images";
import { cn } from "@beyo/lib";
import { useTaskNotesQuery } from "../api/use-task-notes-query";
import { useMarkTaskNoteReadBy } from "../api/use-mark-task-note-read-by";
import { TaskNoteContentView } from "../components/TaskNoteContentView";
import type {
  TaskNoteApiEntry,
  TaskNoteApiImage,
} from "../types";
import type { TaskNoteUnreadViewerSurfaceProps } from "../surface-ids";
```

#### State and hooks
```ts
export function TaskNoteUnreadViewerPage(): React.JSX.Element | null {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { user } = useAuth();
  const { taskId } = useSurfaceProps<TaskNoteUnreadViewerSurfaceProps>();
  const notesQuery = useTaskNotesQuery(taskId);
  const markReadBy = useMarkTaskNoteReadBy();

  // Locked list: the unread entries as seen on first query resolution.
  // This list never changes for the lifetime of this page — slides are stable.
  const [lockedEntries, setLockedEntries] = useState<TaskNoteApiEntry[]>([]);
  const hasLockedRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Embla carousel (horizontal, no loop)
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", loop: false });

  // Height measurement: hidden layer node refs keyed by note client_id
  const measureRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
```

#### Lock unread entries on first query resolution
```ts
  useEffect(() => {
    if (hasLockedRef.current || notesQuery.isPending || !user?.id) return;
    const userId: string = user.id;
    const unread = (notesQuery.data ?? []).filter(
      (entry) => !entry.note.users_read_list.includes(userId),
    );
    hasLockedRef.current = true;
    setLockedEntries(unread);
  }, [notesQuery.isPending, notesQuery.data, user?.id]);
```

#### Sync activeIndex from embla select event
```ts
  useEffect(() => {
    if (!emblaApi) return;
    const syncIndex = () => setActiveIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", syncIndex);
    return () => { emblaApi.off("select", syncIndex); };
  }, [emblaApi]);
```

#### Hide the native surface header (page owns its layout)
```ts
  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);
```

#### Close when all entries acknowledged
```ts
  useEffect(() => {
    if (
      lockedEntries.length > 0 &&
      acknowledgedIds.size >= lockedEntries.length
    ) {
      header?.requestClose();
    }
  }, [acknowledgedIds.size, lockedEntries.length, header]);
```

#### Measure container height from hidden measurement layer
After `lockedEntries` is populated, a hidden measurement layer renders all note bodies (see JSX below). Use `useLayoutEffect` to read their `scrollHeight` after the DOM paints:

```ts
  useLayoutEffect(() => {
    if (containerHeight !== null || lockedEntries.length === 0) return;
    let maxHeight = 0;
    for (const [, el] of measureRefs.current) {
      if (el) maxHeight = Math.max(maxHeight, el.scrollHeight);
    }
    if (maxHeight > 0) {
      // Add bottom area height: dot indicator (~1.5rem) + button (~3.5rem) + padding (~2rem) = ~7rem ≈ 112px
      setContainerHeight(maxHeight + 112);
    }
  }, [lockedEntries, containerHeight]);
```

#### "Got it" handler
```ts
  const handleGotIt = useCallback(() => {
    if (!user?.id) return;
    const current = lockedEntries[activeIndex];
    if (!current) return;
    if (markReadBy.isPending) return;

    const noteId = current.note.client_id;
    markReadBy.mutate({ taskId, noteId, userIds: [user.id] });
    setAcknowledgedIds((prev) => new Set([...prev, noteId]));

    if (activeIndex < lockedEntries.length - 1) {
      emblaApi?.scrollTo(activeIndex + 1);
    }
    // If last note: the acknowledgedIds effect will call header?.requestClose()
  }, [user?.id, lockedEntries, activeIndex, markReadBy, taskId, emblaApi]);
```

#### Image viewer handler
```ts
  const handleOpenImageViewer = useCallback(
    (entry: TaskNoteApiEntry, imageClientId: string) => {
      const images = toViewerImages(entry);
      surface.open(IMAGE_VIEWER_SURFACE_ID, {
        images,
        initialImageClientId: imageClientId,
        entityType: "note" as ImageLinkEntityType,
        entityClientId: entry.note.client_id,
        mode: "preview-only",
        enableOnDemandImageLoad: false,
      });
    },
    [surface],
  );
```

#### Early returns for loading / no-data states
```ts
  if (!taskId) {
    return (
      <div className="p-4 text-sm text-muted-foreground" data-testid="task-note-unread-viewer">
        Task id is missing.
      </div>
    );
  }

  if (notesQuery.isPending || lockedEntries.length === 0) {
    return (
      <div
        className="flex min-h-[20rem] items-center justify-center p-4 text-sm text-muted-foreground"
        data-testid="task-note-unread-viewer"
      >
        {notesQuery.isPending ? "Loading notes..." : null}
      </div>
    );
  }
```

#### JSX (outer container + hidden measurement layer + carousel + bottom)
```tsx
  return (
    <div
      className="relative flex flex-col overflow-hidden bg-background"
      data-testid="task-note-unread-viewer"
      style={containerHeight != null ? { height: containerHeight } : { minHeight: "20rem" }}
    >
      {/* ─── Hidden measurement layer ───────────────────────────────────── */}
      {/* Renders all note bodies invisible so useLayoutEffect can read their scrollHeight. */}
      <div
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-x-0 top-0"
      >
        {lockedEntries.map((entry) => (
          <div
            key={`measure-${entry.note.client_id}`}
            ref={(el) => {
              measureRefs.current.set(entry.note.client_id, el);
            }}
            className="p-4"
          >
            <TaskNoteContentView
              content={entry.note.content}
              plainText={entry.note.plain_text}
            />
            {entry.note_images.length > 0 ? (
              <NoteReadonlyImageGrid
                images={entry.note_images}
                onOpen={() => {/* no-op in measurement layer */}}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* ─── Embla carousel ─────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {lockedEntries.map((entry) => (
            <div
              key={entry.note.client_id}
              className="min-w-0 flex-[0_0_100%] overflow-y-auto p-4"
              data-testid={`task-note-unread-slide-${entry.note.client_id}`}
            >
              <TaskNoteContentView
                content={entry.note.content}
                plainText={entry.note.plain_text}
              />
              {entry.note_images.length > 0 ? (
                <NoteReadonlyImageGrid
                  images={entry.note_images}
                  onOpen={(imageClientId) => handleOpenImageViewer(entry, imageClientId)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Bottom: indicator + button ─────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-3 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
        {lockedEntries.length > 1 ? (
          <div
            className="flex items-center justify-center gap-1.5"
            data-testid="task-note-unread-indicators"
          >
            {lockedEntries.map((entry, index) => (
              <div
                key={entry.note.client_id}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>
        ) : null}

        <button
          className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="task-note-got-it-button"
          disabled={markReadBy.isPending}
          type="button"
          onClick={handleGotIt}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

#### File-local helper components

These replicate the private helpers from `TaskNotesSheetPage.tsx`. Do NOT import them from that file — they are not exported. Write them fresh here:

```tsx
type NoteReadonlyImageGridProps = {
  images: TaskNoteApiImage[];
  onOpen: (imageClientId: string) => void;
};

function NoteReadonlyImageGrid({
  images,
  onOpen,
}: NoteReadonlyImageGridProps): React.JSX.Element | null {
  if (images.length === 0) return null;
  const visible = images.slice(0, 3);
  const overflow = Math.max(images.length - visible.length, 0);

  return (
    <div className="mt-3 flex flex-col gap-2" data-testid="task-note-unread-images">
      <p className="text-xs font-medium text-muted-foreground">Note images</p>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((image, index) => {
          const showOverlay = index === 2 && overflow > 0;
          return (
            <button
              key={image.client_id}
              className="relative aspect-square overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              type="button"
              onClick={() => onOpen(image.client_id)}
            >
              <img alt="" className="size-full object-cover" src={image.image_url} />
              {showOverlay ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                  +{overflow}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

#### File-local `toViewerImages` helper

Same logic as in `TaskNotesSheetPage.tsx` — do NOT import from there, write fresh:

```ts
function toViewerImages(entry: TaskNoteApiEntry): ImageViewModel[] {
  return entry.note_images.map((image, index) => ({
    clientId: image.client_id,
    linkClientId:
      typeof image.link_client_id === "string" ? image.link_client_id : null,
    entityType: "note" as ImageLinkEntityType,
    entityClientId: entry.note.client_id,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder:
      typeof image.display_order === "number" ? image.display_order : index,
    widthPx: typeof image.width_px === "number" ? image.width_px : null,
    heightPx: typeof image.height_px === "number" ? image.height_px : null,
    fileSizeBytes:
      typeof image.file_size_bytes === "number" ? image.file_size_bytes : null,
    createdAt:
      typeof image.created_at === "string"
        ? image.created_at
        : entry.note.created_at,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: null,
    annotations: [],
  }));
}
```

---

### Step 6 — Add peer dependency for embla-carousel

In `packages/task-notes/package.json`, add to `peerDependencies`:

```json
"embla-carousel-react": ">=8.0.0"
```

---

### Step 7 — Update `index.ts`

Append to `packages/task-notes/src/index.ts` (add after existing exports, do not remove any existing line):

```ts
export { markTaskNoteReadBy } from "./api/mark-task-note-read-by";
export type { MarkTaskNoteReadByInput, MarkTaskNoteReadByResult } from "./api/mark-task-note-read-by";
export { useMarkTaskNoteReadBy } from "./api/use-mark-task-note-read-by";
export { useTaskNotesUnreadController } from "./controllers/use-task-notes-unread.controller";
export type { UseTaskNotesUnreadControllerOptions } from "./controllers/use-task-notes-unread.controller";
export {
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  preloadTaskNoteUnreadViewerSurface,
} from "./surface-ids";
export type { TaskNoteUnreadViewerSurfaceProps } from "./surface-ids";
export { TaskNoteUnreadViewerPage } from "./pages/TaskNoteUnreadViewerPage";
```

---

### Step 8 — Managers app `surfaces.ts`

In `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`:

1. Add import:
```ts
import {
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
} from "@beyo/task-notes";
```
(replace or extend the existing `import { TASK_NOTES_SHEET_SURFACE_ID } from "@beyo/task-notes"`)

2. Add lazy component after the `taskNotesSheet` declaration:
```ts
const taskNoteUnreadViewer = lazyWithPreload(() =>
  import("@beyo/task-notes").then((module) => ({
    default: module.TaskNoteUnreadViewerPage,
  })),
);
```

3. Add preload export after `preloadTaskNotesSheetSurface`:
```ts
export const preloadTaskNoteUnreadViewerSurface = taskNoteUnreadViewer.preload;
```

4. Add to `taskSurfaces` object (after the `TASK_NOTES_SHEET_SURFACE_ID` entry):
```ts
[TASK_NOTE_UNREAD_VIEWER_SURFACE_ID]: {
  surface: "sheet",
  component: taskNoteUnreadViewer.Component,
},
```

5. Add re-export near the bottom:
```ts
export type { TaskNoteUnreadViewerSurfaceProps } from "@beyo/task-notes";
```

---

### Step 9 — Managers app `TaskDetailSlidePage.tsx`

In `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx`:

1. Extend the `@beyo/task-notes` import to include:
```ts
import {
  TaskNotePill,
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  useTaskNotesUnreadController,
  type TaskNoteUnreadViewerSurfaceProps,
} from "@beyo/task-notes";
```

2. Extend the `@/features/tasks/surfaces` import to include `preloadTaskNoteUnreadViewerSurface`:
```ts
import {
  preloadTaskNotesSheetSurface,
  preloadTaskNoteUnreadViewerSurface,
  type TaskDetailSurfaceProps,
} from "@/features/tasks/surfaces";
```

3. Inside `TaskDetailSlidePageContent`, after the existing `usePreloadSurface(preloadTaskNotesSheetSurface)` call, add:
```ts
usePreloadSurface(preloadTaskNoteUnreadViewerSurface);

const handleOpenUnreadViewer = useCallback(
  (props: TaskNoteUnreadViewerSurfaceProps) => {
    surface.open(TASK_NOTE_UNREAD_VIEWER_SURFACE_ID, props);
  },
  [surface],
);

useTaskNotesUnreadController({
  taskId: controller.taskId,
  onOpen: handleOpenUnreadViewer,
});
```

`surface` is already declared above via `const surface = useSurface()`. `useCallback` requires adding `useCallback` to the `react` import if not already present.

---

### Step 10 — Workers app `surfaces.ts`

In `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`:

1. Extend the `@beyo/task-notes` import:
```ts
import {
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
} from "@beyo/task-notes";
```

2. Add lazy component after `taskNotesSheet`:
```ts
const taskNoteUnreadViewer = lazyWithPreload(() =>
  import("@beyo/task-notes").then((module) => ({
    default: module.TaskNoteUnreadViewerPage,
  })),
);
```

3. Add preload export after `preloadTaskNotesSheetSurface`:
```ts
export const preloadTaskNoteUnreadViewerSurface = taskNoteUnreadViewer.preload;
```

4. Add to `taskStepSurfaces` object (after `TASK_NOTES_SHEET_SURFACE_ID` entry):
```ts
[TASK_NOTE_UNREAD_VIEWER_SURFACE_ID]: {
  surface: "sheet",
  component: taskNoteUnreadViewer.Component,
},
```

---

### Step 11 — Workers app `TaskDetailSlidePage.tsx`

In `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`:

1. Extend the `@beyo/task-notes` import:
```ts
import {
  TaskNotePill,
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  useTaskNotesUnreadController,
  type TaskNoteUnreadViewerSurfaceProps,
} from "@beyo/task-notes";
```

2. Extend the `@/features/task_steps/surfaces` import:
```ts
import {
  preloadCompleteTaskStepConfirmationSlideSurface,
  preloadTaskNotesSheetSurface,
  preloadTaskNoteUnreadViewerSurface,
  preloadTaskScheduledDeliverySheetSurface,
} from "@/features/task_steps/surfaces";
```

3. Inside `TaskDetailSlidePageContent`, after `usePreloadSurface(preloadTaskNotesSheetSurface)`, add:
```ts
usePreloadSurface(preloadTaskNoteUnreadViewerSurface);

const handleOpenUnreadViewer = useCallback(
  (props: TaskNoteUnreadViewerSurfaceProps) => {
    surface.open(TASK_NOTE_UNREAD_VIEWER_SURFACE_ID, props);
  },
  [surface],
);

useTaskNotesUnreadController({
  taskId: controller.taskId,
  onOpen: handleOpenUnreadViewer,
});
```

`surface` is already declared via `const surface = useSurface()`. Add `useCallback` to the `react` import if not already present.

---

## Risks and mitigations

- Risk: Height measurement reads `scrollHeight` as 0 if the hidden layer renders before styles apply.
  Mitigation: `useLayoutEffect` fires after paint, so Tailwind classes are applied. If `maxHeight` is 0 on first layout, the state stays `null` and measurement re-runs on next `lockedEntries` change (via the guard `if (containerHeight !== null || lockedEntries.length === 0) return`). No infinite loop because once a non-zero height is set, `containerHeight !== null` prevents re-entry.

- Risk: Embla loses sync if the page closes before embla is fully initialized.
  Mitigation: `emblaApi?.scrollTo` uses optional chaining; all embla calls are guarded.

- Risk: Controller fires before the query returns data (stale cache miss scenario).
  Mitigation: `notesQuery.isPending` check prevents firing. Once data arrives the effect runs again.

- Risk: `user.id` (type `UserId`) may be an opaque branded type that doesn't serialize to a plain string for the `includes` check.
  Mitigation: In the existing codebase, `users_read_list: currentUserId ? [currentUserId] : []` in `TaskNotesSheetPage` already passes `user?.id` as a string to the array — this confirms `UserId` is assignable to `string` at runtime. Use the same pattern here.

- Risk: The `lockedEntries` state snapshot may differ from what the server currently considers unread if notes were marked read by another device between page open and query resolution.
  Mitigation: Acceptable — the controller fires based on the first settled query state. If another device already read all notes, the first query returns empty `unread` and the viewer never opens. No retry loop.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in both apps and in `packages/task-notes`
- Manual smoke test — managers app:
  1. Open a task that has at least one unread note (check `users_read_list` does not include current user id)
  2. Slide open the task detail — unread viewer sheet must appear automatically without any tap
  3. Verify the carousel slides are shown, dot indicators match note count, "Got it" button is visible
  4. Tap "Got it" — verify network call to `POST /api/v1/tasks/{id}/notes/{id}/read-by`, verify slide advances (or sheet closes if only one note)
  5. Open the same task again — unread viewer must NOT appear (note is now read)
  6. Open the standard notes sheet via the pill — notes still load correctly (query still works)
- Manual smoke test — workers app:
  1. Same flow as above from the worker task detail slide
  2. When there are zero unread notes, the viewer must not open

## Review log

- `2026-06-26` `claude`: Plan authored, all files specified, code contracts verified against existing implementation.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
