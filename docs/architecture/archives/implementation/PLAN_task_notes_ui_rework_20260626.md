# PLAN_task_notes_ui_rework_20260626

## Metadata

- Plan ID: `PLAN_task_notes_ui_rework_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T20:00:00Z`
- Last updated at (UTC): `2026-06-26T17:54:49Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: (1) Extract the three inline panels of `TaskNotesSheetPage` into standalone component files. (2) Give both note pages a fixed height (constant at the top of each file) instead of deriving height from content. (3) Make note content scrollable with `VerticalScrollArea`. (4) In the list panel, replace the `CirclePlus` header button with a full-width absolute "Add note" button at the bottom that hides on scroll. (5) In the detail panel, make the image grid absolute at the bottom and hide it on scroll-down, with the note content scroll area compensating with bottom padding. (6) In the unread viewer, make the "Got it" button absolute + scroll-responsive per slide, remove the now-unnecessary dynamic height measurement system.
- Business/user intent: Consistent, stable sheet height across all note surfaces; better content discoverability via scroll-responsive floating elements; independent panel components that can be composed and modified independently.
- Non-goals: Any change to note API logic, query hooks, controller, or app wiring; any change to the managers or workers app surfaces files; changing which panels exist.

## Scope

- In scope:
  - `packages/ui` — add optional `scrollRef` prop to `VerticalScrollArea`
  - `packages/task-notes/src/components/` — 4 new component files
  - `packages/task-notes/src/pages/TaskNotesSheetPage.tsx` — replace inline panels with imported components, apply fixed height
  - `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` — remove measurement system, fixed height, scroll-responsive "Got it" button
  - `packages/task-notes/src/index.ts` — export new components
- Out of scope:
  - Any app-level file (`apps/managers-app`, `apps/workers-app`)
  - Any API, action hook, controller, or surface-ids change
  - Changing the three-panel slide animation logic in `TaskNotesSheetPage`
- Assumptions:
  - `VerticalScrollArea` is exported from `@beyo/ui` — already confirmed via `export * from "./components/primitives/vertical-scroll-area"` in `packages/ui/src/index.ts`
  - `useScrollVisibility` and `ScrollVisibilityProvider` are exported from `@beyo/ui` — already confirmed via `export * from "./components/primitives/scroll-visibility"`
  - The `scrollRef` prop added to `VerticalScrollArea` is backward-compatible (optional); existing callers require no changes
  - Both pages live in `@beyo/task-notes` and can import directly from `@beyo/ui` (already a peer dep)

## Clarifications required

None.

## Acceptance criteria

1. `TaskNoteListPanel`, `TaskNoteDetailPanel`, `TaskNoteCreatePanel`, and `TaskNoteReadonlyImages` exist as standalone files in `packages/task-notes/src/components/` and are exported from `index.ts`.
2. `TaskNotesSheetPage` imports the new panel components; its file no longer defines `ListPanel`, `DetailPanel`, `CreatePanel`, `CreatePanelBody`, `EditPanelBody`, `EditPanelBodyInner`, `ReadonlyImageGrid`, or `toViewerImages` locally.
3. Both pages have `const NOTES_PANEL_HEIGHT = 400` at the top of their files and apply it as `style={{ height: NOTES_PANEL_HEIGHT }}` on their root containers.
4. In `TaskNoteListPanel`, the `CirclePlus` header button is gone. When `canCreate = true`, a full-width "Add note" button (`bg-primary text-card`) is absolutely positioned at the bottom and hides via `translate-y-full` when `isHidden = true` from `useScrollVisibility`. The list's `VerticalScrollArea` has `pb-[72px]` (sufficient to scroll past the button) when `canCreate = true`.
5. In `TaskNoteDetailPanel` view mode (not editing), the `ReadonlyImageGrid` is absolutely positioned at the bottom and hides when the user scrolls down. The note content `VerticalScrollArea` adds `pb-[200px]` (enough to scroll past the image overlay) when images are present.
6. In `TaskNoteUnreadViewerPage`, the dynamic height measurement system (`measureRefs`, `containerHeight`, `useLayoutEffect`, hidden measurement layer) is fully removed. Each slide is a plain `overflow-y-auto` div. A `ScrollVisibilityProvider` wraps the page, driven by the active slide's DOM element. The "Got it" + indicator bar is absolute at the bottom and responds to `useScrollVisibilityContext`.
7. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md` — component props pattern, no internal context reads from panel components
- `architecture/28_surfaces.md` + `28_surfaces_local.md` — sheet surface layout, `useSurfaceHeader`
- `architecture/31_animations.md` — `transition-transform duration-300` for hide/show
- `architecture/36_scroll_visibility.md` — `useScrollVisibility` (relative mode), `ScrollVisibilityProvider`, `useScrollVisibilityContext`

### File read intent — pattern vs. relational

Permitted relational reads:

- `packages/task-notes/src/pages/TaskNotesSheetPage.tsx` — read in full: source of truth for all panel props, internal sub-components, and `EntityImagesProvider` wiring to replicate in new component files
- `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` — read in full: current state to understand what to remove (measurement system) and what to keep (locking logic, embla wiring, `acknowledgedIds`)
- `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx` — read in full before modifying to add `scrollRef` prop
- `packages/task-notes/src/index.ts` — read before editing to know what to append

Prohibited pattern reads:
- Do not read other panel/page components to understand component structure → use `07_components.md`
- Do not read other hooks to understand `useScrollVisibility` usage → the type definitions read above are sufficient

### Skill selection

None applicable.

## Domain schemas consulted

- `packages/task-notes/src/types.ts` (read in prior session):
  - `TaskNoteApiEntry = { note: TaskNoteApiNote; note_images: TaskNoteApiImage[] }`
  - `TaskNoteApiNote.client_id`, `.content`, `.plain_text`, `.users_read_list`
  - `TaskNoteApiImage.client_id`, `.image_url`

## File manifest

| # | Action | Path |
|---|--------|------|
| 1 | MODIFIED | `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx` |
| 2 | NEW | `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` |
| 3 | NEW | `packages/task-notes/src/components/TaskNoteListPanel.tsx` |
| 4 | NEW | `packages/task-notes/src/components/TaskNoteDetailPanel.tsx` |
| 5 | NEW | `packages/task-notes/src/components/TaskNoteCreatePanel.tsx` |
| 6 | MODIFIED | `packages/task-notes/src/pages/TaskNotesSheetPage.tsx` |
| 7 | MODIFIED | `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx` |
| 8 | MODIFIED | `packages/task-notes/src/index.ts` |

---

## Implementation plan

Read each source file fully before editing it. Apply steps in order.

---

### Step 1 — Extend `VerticalScrollArea` with optional `scrollRef` prop

**File:** `packages/ui/src/components/primitives/vertical-scroll-area/VerticalScrollArea.tsx`

Add `scrollRef?: React.RefObject<HTMLDivElement | null>` to `VerticalScrollAreaProps`. When provided, the external ref is used in place of the internal ref for the scrollable div — allowing `useScrollVisibility` to observe the same element.

Full modified file:

```tsx
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@beyo/lib";

export type VerticalScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  style?: React.CSSProperties;
  /**
   * When provided, replaces the internal scrollRef.
   * Lets callers pass in useScrollVisibility's scrollRef so that
   * a single DOM element drives both the custom scrollbar and scroll-visibility.
   */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  "data-testid"?: string;
};

export function VerticalScrollArea({
  children,
  className,
  trackClassName,
  thumbClassName,
  style,
  scrollRef: externalScrollRef,
  "data-testid": testId,
}: VerticalScrollAreaProps): React.JSX.Element {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateThumb = useCallback(() => {
    const element = scrollRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!element || !thumb || !track) {
      return;
    }

    const { clientHeight, scrollHeight, scrollTop } = element;
    const ratio = clientHeight / scrollHeight;

    if (ratio >= 1) {
      track.style.visibility = "hidden";
      return;
    }

    track.style.visibility = "visible";
    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(ratio * trackHeight, 24);
    const maxScroll = scrollHeight - clientHeight;
    const thumbTop =
      maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }, [scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    updateThumb();
    element.addEventListener("scroll", updateThumb, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        element.removeEventListener("scroll", updateThumb);
      };
    }

    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(element);
    if (element.firstElementChild) {
      resizeObserver.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener("scroll", updateThumb);
      resizeObserver.disconnect();
    };
  }, [scrollRef, updateThumb]);

  return (
    <div className="flex flex-row" data-testid={testId} style={style}>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-w-0 overflow-x-hidden overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>

      <div
        ref={trackRef}
        className={cn(
          "relative my-2 mr-0.5 w-px flex-shrink-0 rounded-full bg-muted/30",
          trackClassName,
        )}
      >
        <div
          ref={thumbRef}
          className={cn(
            "absolute left-0 top-0 w-full rounded-full bg-muted-foreground/30",
            thumbClassName,
          )}
        />
      </div>
    </div>
  );
}
```

**Key changes:**
- Added `scrollRef?: React.RefObject<HTMLDivElement | null>` to props type
- `const scrollRef = externalScrollRef ?? internalScrollRef` — uses external ref when provided
- `updateThumb` `useCallback` dep now includes `scrollRef` (instead of implicit capture)
- `useEffect` dep array includes `scrollRef` so it re-runs if the ref object changes

---

### Step 2 — Create `TaskNoteReadonlyImages.tsx`

**File:** `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx`

Extracts the read-only image grid and `toViewerImages` helper that were duplicated in both page files. After this step, both pages import from here instead of defining locally.

```tsx
import type {
  ImageLinkEntityType,
  ImageViewModel,
} from "@beyo/images";

import type { TaskNoteApiEntry, TaskNoteApiImage } from "../types";

export type TaskNoteReadonlyImagesProps = {
  images: TaskNoteApiImage[];
  onOpen: (imageClientId: string) => void;
};

export function TaskNoteReadonlyImages({
  images,
  onOpen,
}: TaskNoteReadonlyImagesProps): React.JSX.Element | null {
  if (images.length === 0) {
    return null;
  }

  const visible = images.slice(0, 3);
  const overflow = Math.max(images.length - visible.length, 0);

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="task-note-readonly-images">
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
  );
}

export function toNoteViewerImages(entry: TaskNoteApiEntry): ImageViewModel[] {
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

**Note:** The exported helper is renamed from `toViewerImages` → `toNoteViewerImages` to be self-describing when imported in context.

---

### Step 3 — Create `TaskNoteListPanel.tsx`

**File:** `packages/task-notes/src/components/TaskNoteListPanel.tsx`

Extracted from `ListPanel` in `TaskNotesSheetPage.tsx`. Key changes vs. original:
- Accepts `height: number` prop; applies `style={{ height }}` to root container
- Uses `VerticalScrollArea` with `scrollRef` from `useScrollVisibility` for the note list
- Removes `CirclePlus` button from the header
- When `canCreate = true`: adds an absolute full-width "Add note" button at the bottom, scroll-responsive. The `VerticalScrollArea` gets `pb-[72px]` to allow scrolling enough to trigger `isHidden`.
- When `canCreate = false`: no button, no padding offset

```tsx
import { ChevronLeft } from "lucide-react";
import { cn } from "@beyo/lib";
import { VerticalScrollArea, useScrollVisibility } from "@beyo/ui";

import { TaskNoteCardRow } from "./TaskNoteCardRow";
import type { TaskNoteApiEntry } from "../types";

export type TaskNoteListPanelProps = {
  canCreate: boolean;
  deletingNoteId: string | null;
  entries: TaskNoteApiEntry[];
  height: number;
  isError: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onDelete: (noteId: string) => void;
  onOpenDetail: (noteId: string) => void;
  onRetry: () => void;
};

export function TaskNoteListPanel({
  canCreate,
  deletingNoteId,
  entries,
  height,
  isError,
  isLoading,
  onCreate,
  onDelete,
  onOpenDetail,
  onRetry,
}: TaskNoteListPanelProps): React.JSX.Element {
  const { scrollRef, isHidden } = useScrollVisibility({ mode: "relative" });

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      data-testid="task-note-list-panel"
      style={{ height }}
    >
      {/* ─── Fixed header ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
        <div>
          <p className="text-base font-semibold text-foreground">Notes</p>
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? "No notes yet"
              : `${entries.length} note${entries.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* ─── Scrollable note list ──────────────────────────────────── */}
      <VerticalScrollArea
        scrollRef={scrollRef}
        className={cn("flex-1 px-4 pb-2", canCreate && "pb-[72px]")}
      >
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            Loading notes...
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            <p>Notes could not be loaded.</p>
            <button
              className="mt-3 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground"
              type="button"
              onClick={onRetry}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            No notes yet
          </div>
        ) : null}

        {!isLoading && !isError && entries.length > 0 ? (
          <div className="flex flex-col gap-3">
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
          </div>
        ) : null}
      </VerticalScrollArea>

      {/* ─── Absolute "Add note" button — scroll responsive ───────── */}
      {canCreate ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-4 pb-4 transition-transform duration-300",
            isHidden ? "translate-y-full" : "translate-y-0",
          )}
        >
          <button
            className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card"
            data-testid="task-notes-create-button"
            type="button"
            onClick={onCreate}
          >
            + add note
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

---

### Step 4 — Create `TaskNoteDetailPanel.tsx`

**File:** `packages/task-notes/src/components/TaskNoteDetailPanel.tsx`

Extracted from `DetailPanel`, `EditPanelBody`, and `EditPanelBodyInner` in `TaskNotesSheetPage.tsx`. Key changes:
- `height` prop drives fixed-height root container
- View mode: `VerticalScrollArea` with `scrollRef` from `useScrollVisibility`; image grid is absolute at bottom, hidden on scroll. The scroll area has `pb-[200px]` when images are present (≈ label + 3-column grid row + paddings).
- Edit mode: plain `VerticalScrollArea` (no scroll-responsive images — images are managed inline by `EntityImagesProvider`/`TaskNoteImagesSection`)
- All private sub-components (`EditPanelBody`, `EditPanelBodyInner`) stay inside this file

```tsx
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, SquarePen } from "lucide-react";
import { EntityImagesProvider, useEntityImagesContext } from "@beyo/images";
import { cn, generateClientId } from "@beyo/lib";
import { VerticalScrollArea, useScrollVisibility } from "@beyo/ui";

import { useUpdateTaskNote } from "../api/use-update-task-note";
import {
  hasMeaningfulNoteContent,
  plainTextToComposerContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";
import type { TaskNoteApiEntry, TaskNoteComposerValue } from "../types";
import { TaskNoteComposer } from "./TaskNoteComposer";
import { TaskNoteContentView } from "./TaskNoteContentView";
import { TaskNoteImagesSection } from "./TaskNoteImagesSection";
import { TaskNoteReadonlyImages } from "./TaskNoteReadonlyImages";

export type TaskNoteDetailPanelProps = {
  canEdit: boolean;
  entry: TaskNoteApiEntry;
  height: number;
  taskId: string;
  onBack: () => void;
  onOpenViewer: (imageClientId: string) => void;
  onRequestClose: () => void;
};

export function TaskNoteDetailPanel({
  canEdit,
  entry,
  height,
  taskId,
  onBack,
  onOpenViewer,
  onRequestClose,
}: TaskNoteDetailPanelProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const { scrollRef, isHidden } = useScrollVisibility({ mode: "relative" });
  const hasImages = entry.note_images.length > 0;

  // Reset edit mode when note changes
  useEffect(() => {
    setIsEditing(false);
  }, [entry.note.client_id]);

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      data-testid="task-note-detail-panel"
      style={{ height }}
    >
      {/* ─── Fixed header ─────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-between-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-notes-detail-back-button"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back
        </button>

        {canEdit && !isEditing ? (
          <button
            className="rounded-full border border-border bg-card p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid="task-notes-edit-button"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <SquarePen aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </div>

      {/* ─── View mode ────────────────────────────────────────────── */}
      {!isEditing ? (
        <>
          <VerticalScrollArea
            scrollRef={scrollRef}
            className={cn(
              "flex-1 px-4 pb-2",
              hasImages && "pb-[200px]",
            )}
          >
            <TaskNoteContentView
              content={entry.note.content}
              plainText={entry.note.plain_text}
            />
          </VerticalScrollArea>

          {/* Absolute image grid — scroll responsive */}
          {hasImages ? (
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-background px-4 pb-4 pt-2 transition-transform duration-300",
                isHidden ? "translate-y-full" : "translate-y-0",
              )}
              data-testid="task-note-detail-images"
            >
              <TaskNoteReadonlyImages
                images={entry.note_images}
                onOpen={onOpenViewer}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {/* ─── Edit mode ────────────────────────────────────────────── */}
      {isEditing ? (
        <VerticalScrollArea className="flex-1 px-4 pb-2">
          <EditBody
            entry={entry}
            taskId={taskId}
            onRequestClose={onRequestClose}
          />
        </VerticalScrollArea>
      ) : null}
    </div>
  );
}

// ─── Private: edit body ─────────────────────────────────────────────────────

type EditBodyProps = {
  entry: TaskNoteApiEntry;
  taskId: string;
  onRequestClose: () => void;
};

function EditBody({ entry, taskId, onRequestClose }: EditBodyProps): React.JSX.Element {
  return (
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={entry.note.client_id}
      entityType="note"
    >
      <EditBodyInner entry={entry} taskId={taskId} onRequestClose={onRequestClose} />
    </EntityImagesProvider>
  );
}

type EditBodyInnerProps = {
  entry: TaskNoteApiEntry;
  taskId: string;
  onRequestClose: () => void;
};

function EditBodyInner({ entry, taskId, onRequestClose }: EditBodyInnerProps): React.JSX.Element {
  const updateNote = useUpdateTaskNote();
  const { images } = useEntityImagesContext();
  const [value, setValue] = useState<TaskNoteComposerValue>(() => ({
    content: plainTextToComposerContent(entry.note.plain_text),
    plainText: entry.note.plain_text,
  }));
  const canSave = hasMeaningfulNoteContent(value) || images.length > 0;

  useEffect(() => {
    setValue({
      content: plainTextToComposerContent(entry.note.plain_text),
      plainText: entry.note.plain_text,
    });
  }, [entry.note.client_id, entry.note.plain_text]);

  function handleSubmit(): void {
    if (!canSave) return;
    updateNote.mutate({
      taskId,
      noteId: entry.note.client_id,
      content: toTaskNoteContentBlocks(value.content),
      plain_text: value.plainText,
    });
    onRequestClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskNoteComposer
        initialContent={plainTextToComposerContent(entry.note.plain_text)}
        onChange={setValue}
        onCheckDone={handleSubmit}
        placeholder="Edit note..."
        testId="task-note-edit-composer"
      />
      <TaskNoteImagesSection />
      {!canSave ? (
        <p className="text-sm text-muted-foreground">
          Add text or note images to save this note.
        </p>
      ) : null}
    </div>
  );
}
```

---

### Step 5 — Create `TaskNoteCreatePanel.tsx`

**File:** `packages/task-notes/src/components/TaskNoteCreatePanel.tsx`

Extracted from `CreatePanel` + `CreatePanelBody` in `TaskNotesSheetPage.tsx`. Accepts `height` prop; applies fixed height on root. No scroll-responsive behavior (create flow does not require it).

```tsx
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { EntityImagesProvider, useEntityImagesContext } from "@beyo/images";
import { generateClientId } from "@beyo/lib";
import { VerticalScrollArea } from "@beyo/ui";

import { useCreateTaskNote } from "../api/use-create-task-note";
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";
import type { TaskNoteComposerValue } from "../types";
import { TaskNoteComposer } from "./TaskNoteComposer";
import { TaskNoteImagesSection } from "./TaskNoteImagesSection";

export type TaskNoteCreatePanelProps = {
  currentUserId: string | null;
  height: number;
  taskId: string;
  onBack: () => void;
  onRequestClose: () => void;
};

export function TaskNoteCreatePanel({
  currentUserId,
  height,
  taskId,
  onBack,
  onRequestClose,
}: TaskNoteCreatePanelProps): React.JSX.Element {
  const [draftNoteId] = useState(() => generateClientId("TaskNote"));

  return (
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={draftNoteId}
      entityType="note"
    >
      <CreatePanelBody
        currentUserId={currentUserId}
        draftNoteId={draftNoteId}
        height={height}
        taskId={taskId}
        onBack={onBack}
        onRequestClose={onRequestClose}
      />
    </EntityImagesProvider>
  );
}

// ─── Private ────────────────────────────────────────────────────────────────

type CreatePanelBodyProps = {
  currentUserId: string | null;
  draftNoteId: string;
  height: number;
  taskId: string;
  onBack: () => void;
  onRequestClose: () => void;
};

function CreatePanelBody({
  currentUserId,
  draftNoteId,
  height,
  taskId,
  onBack,
  onRequestClose,
}: CreatePanelBodyProps): React.JSX.Element {
  const createNote = useCreateTaskNote();
  const { images } = useEntityImagesContext();
  const [value, setValue] = useState<TaskNoteComposerValue>({
    content: { parts: [] },
    plainText: "",
  });
  const canSave = hasMeaningfulNoteContent(value) || images.length > 0;

  function handleSave(): void {
    if (!canSave) return;
    createNote.mutate({
      taskId,
      notes: [
        {
          client_id: draftNoteId,
          note_type: "user_note",
          content: toTaskNoteContentBlocks(value.content),
          plain_text: value.plainText,
          users_read_list: currentUserId ? [currentUserId] : [],
        },
      ],
    });
    onRequestClose();
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      data-testid="task-note-create-panel"
      style={{ height }}
    >
      {/* ─── Fixed header ───────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          data-testid="task-notes-create-back-button"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </button>
      </div>

      {/* ─── Scrollable composer ────────────────────────────────── */}
      <VerticalScrollArea className="flex-1 px-4 pb-4">
        <div className="flex flex-col gap-4">
          <TaskNoteComposer
            onChange={setValue}
            placeholder="Write a note..."
            testId="task-note-create-composer"
          />
          <TaskNoteImagesSection />
          <button
            className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card disabled:opacity-50"
            data-testid="task-note-save-button"
            disabled={!canSave || createNote.isPending}
            type="button"
            onClick={handleSave}
          >
            Save note
          </button>
        </div>
      </VerticalScrollArea>
    </div>
  );
}
```

---

### Step 6 — Rework `TaskNotesSheetPage.tsx`

**File:** `packages/task-notes/src/pages/TaskNotesSheetPage.tsx`

**Goal:** Remove all local panel/helper definitions; import the new panel components; apply fixed height via `NOTES_PANEL_HEIGHT` constant.

**Critical instruction:** Read the current file in full before editing. Preserve:
- The three-panel slide animation logic (`activePanel` state, `translate-x` classes)
- All existing state and handler functions (`handleOpenDetail`, `handleDelete`, `handleOpenCreate`, etc.)
- The `EntityImagesProvider` logic (now moved into `TaskNoteDetailPanel` and `TaskNoteCreatePanel`)
- The `useSurfaceHeader`, `useAuth`, `useRole`, `useSurface` hook calls
- The `canManageNotes` permission gate
- The IMAGE_VIEWER_SURFACE_ID open call (now delegated via `onOpenViewer` prop to `TaskNoteDetailPanel`)

**Remove entirely:**
- `ListPanel` function and its `ListPanelProps` type
- `DetailPanel` function and its `DetailPanelProps` type
- `CreatePanel` function and its `CreatePanelProps` type
- `CreatePanelBody` function and its `CreatePanelBodyProps` type
- `EditPanelBody` function and its `EditPanelBodyProps` type
- `EditPanelBodyInner` function and its `EditPanelBodyInnerProps` type
- `ReadonlyImageGrid` function and its type
- `toViewerImages` function
- All imports that were only used by the above

**Add at the top of the file (after imports):**

```ts
const NOTES_PANEL_HEIGHT = 400; // px — adjust to taste
```

**New imports to add:**

```ts
import { TaskNoteCreatePanel } from "../components/TaskNoteCreatePanel";
import { TaskNoteDetailPanel } from "../components/TaskNoteDetailPanel";
import { TaskNoteListPanel } from "../components/TaskNoteListPanel";
import { toNoteViewerImages } from "../components/TaskNoteReadonlyImages";
```

**Root container change:**

```tsx
// BEFORE
<div
  className="relative min-h-[30rem] overflow-hidden bg-background"
  data-testid="task-notes-sheet-page"
>

// AFTER
<div
  className="relative overflow-hidden bg-background"
  data-testid="task-notes-sheet-page"
  style={{ height: NOTES_PANEL_HEIGHT }}
>
```

**Panel slot contents — replace the three absolute panel divs as follows:**

List panel slot:
```tsx
<div
  className={cn(
    "absolute inset-0 transition-transform duration-300",
    activePanel === "list" ? "translate-x-0" : "-translate-x-full",
  )}
>
  <TaskNoteListPanel
    canCreate={canManageNotes}
    deletingNoteId={deletingNoteId}
    entries={entries}
    height={NOTES_PANEL_HEIGHT}
    isError={notesQuery.isError}
    isLoading={notesQuery.isPending}
    onCreate={handleOpenCreate}
    onDelete={handleDelete}
    onOpenDetail={handleOpenDetail}
    onRetry={() => { void notesQuery.refetch(); }}
  />
</div>
```

Detail panel slot:
```tsx
<div
  className={cn(
    "absolute inset-0 transition-transform duration-300",
    activePanel === "detail" ? "translate-x-0" : "translate-x-full",
  )}
>
  {selectedEntry ? (
    <TaskNoteDetailPanel
      canEdit={canManageNotes}
      entry={selectedEntry}
      height={NOTES_PANEL_HEIGHT}
      taskId={taskId}
      onBack={handleBackFromDetail}
      onOpenViewer={(imageClientId) => {
        surface.open(IMAGE_VIEWER_SURFACE_ID, {
          images: toNoteViewerImages(selectedEntry),
          initialImageClientId: imageClientId,
          entityType: "note" as ImageLinkEntityType,
          entityClientId: selectedEntry.note.client_id,
          mode: "preview-only",
          enableOnDemandImageLoad: false,
        });
      }}
      onRequestClose={() => header?.requestClose()}
    />
  ) : null}
</div>
```

Create panel slot:
```tsx
<div
  className={cn(
    "absolute inset-0 transition-transform duration-300",
    activePanel === "create" ? "translate-x-0" : "translate-x-full",
  )}
>
  <TaskNoteCreatePanel
    currentUserId={user?.id ?? null}
    height={NOTES_PANEL_HEIGHT}
    taskId={taskId}
    onBack={handleBackFromCreate}
    onRequestClose={() => header?.requestClose()}
  />
</div>
```

**Clean up imports:** After removing the local definitions, remove any import that is now unused in this file (`ArrowLeft`, `SquarePen`, `EntityImagesProvider`, `useEntityImagesContext`, `useCreateTaskNote`, `useUpdateTaskNote`, `hasMeaningfulNoteContent`, `plainTextToComposerContent`, `toTaskNoteContentBlocks`, `TaskNoteComposer`, `TaskNoteImagesSection`, `ImageLinkEntityType` if no longer used directly, etc.). Keep imports still used by the page itself (`useEffect`, `useMemo`, `useState`, `ChevronLeft`, `CirclePlus`, `AuthRole`, `useAuth`, `useRole`, `useSurface`, `useSurfaceHeader`, `useSurfaceProps`, `IMAGE_VIEWER_SURFACE_ID`, `ImageLinkEntityType`, `cn`, `generateClientId`, `useDeleteTaskNote`, `useTaskNotesQuery`, `TaskNoteCardRow`, `TaskNoteContentView`, `TaskNotesSheetSurfaceProps`, etc.).

Wait — after extraction, some of those ARE still used:
- `IMAGE_VIEWER_SURFACE_ID` and `ImageLinkEntityType` — still needed for the `onOpenViewer` inline callback in the detail slot
- `toNoteViewerImages` — newly imported from `TaskNoteReadonlyImages`
- `generateClientId` — moved into `TaskNoteCreatePanel`, no longer needed in page
- `cn` — still needed for the panel slide transitions

Carefully audit each import against what remains in the page after the panel functions are removed.

---

### Step 7 — Rework `TaskNoteUnreadViewerPage.tsx`

**File:** `packages/task-notes/src/pages/TaskNoteUnreadViewerPage.tsx`

**Goal:** Remove the dynamic height measurement system entirely; apply fixed height constant; make each slide a plain scrollable div; use `ScrollVisibilityProvider` + `useScrollVisibilityContext` to drive the absolute "Got it" + indicator bar.

**Critical instruction:** Read the current file in full before editing.

**Remove entirely:**
- `measureRefs` ref
- `containerHeight` state and `setContainerHeight`
- The `useLayoutEffect` that measured heights
- The hidden measurement layer JSX (`<div aria-hidden="true" className="pointer-events-none invisible absolute ...">`)
- The inline `toViewerImages` function (now use `toNoteViewerImages` from `TaskNoteReadonlyImages`)
- The inline `NoteReadonlyImageGrid` component (now use `TaskNoteReadonlyImages`)
- The `style` prop on the root div (replaced by constant below)

**Remove imports no longer needed after above removal:** `useLayoutEffect` (if no other usage); local `NoteReadonlyImageGrid`; local `toViewerImages`.

**Add at the top (after imports):**

```ts
const NOTES_PANEL_HEIGHT = 400; // px — adjust to taste
```

**Add new imports:**

```ts
import { ScrollVisibilityProvider, useScrollVisibilityContext } from "@beyo/ui";
import { TaskNoteReadonlyImages, toNoteViewerImages } from "../components/TaskNoteReadonlyImages";
```

**New state/refs for active slide scroll element:**

```tsx
// Tracks each slide's scroll div by index so we can feed the active one to ScrollVisibilityProvider
const slideElemRefs = useRef<(HTMLDivElement | null)[]>([]);
const [activeScrollElement, setActiveScrollElement] = useState<HTMLElement | null>(null);

// When active slide changes, update the element reference for ScrollVisibilityProvider.
// This causes ScrollVisibilityProvider to re-initialize scroll tracking on the new element,
// which resets isHidden to false — "Got it" button re-appears on each new slide.
useEffect(() => {
  setActiveScrollElement(slideElemRefs.current[activeIndex] ?? null);
}, [activeIndex]);
```

**New root structure:**

```tsx
return (
  <div
    className="relative flex flex-col overflow-hidden bg-background"
    data-testid="task-note-unread-viewer"
    style={{ height: NOTES_PANEL_HEIGHT }}
  >
    <ScrollVisibilityProvider
      scrollElement={activeScrollElement}
      mode="relative"
      threshold={56}
    >
      {/* ─── Embla carousel ─────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {lockedEntries.map((entry, index) => (
            <div
              key={entry.note.client_id}
              ref={(el) => { slideElemRefs.current[index] = el; }}
              className="min-w-0 flex-[0_0_100%] overflow-y-auto p-4 pb-[80px]"
              data-testid={`task-note-unread-slide-${entry.note.client_id}`}
            >
              <TaskNoteContentView
                content={entry.note.content}
                plainText={entry.note.plain_text}
              />
              {entry.note_images.length > 0 ? (
                <TaskNoteReadonlyImages
                  images={entry.note_images}
                  onOpen={(imageClientId) => handleOpenImageViewer(entry, imageClientId)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Absolute bottom bar: indicators + "Got it" button ──── */}
      <UnreadViewerBottomBar
        activeIndex={activeIndex}
        acknowledgedIds={acknowledgedIds}
        lockedEntries={lockedEntries}
        isPending={markReadBy.isPending}
        onGotIt={handleGotIt}
      />
    </ScrollVisibilityProvider>
  </div>
);
```

**`UnreadViewerBottomBar` — file-private component:**

This component calls `useScrollVisibilityContext()` to get `isHidden`, so it must be rendered inside `ScrollVisibilityProvider`.

```tsx
type UnreadViewerBottomBarProps = {
  activeIndex: number;
  acknowledgedIds: Set<string>;
  lockedEntries: TaskNoteApiEntry[];
  isPending: boolean;
  onGotIt: () => void;
};

function UnreadViewerBottomBar({
  activeIndex,
  acknowledgedIds,
  lockedEntries,
  isPending,
  onGotIt,
}: UnreadViewerBottomBarProps): React.JSX.Element {
  const { isHidden } = useScrollVisibilityContext();

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 bg-background/80 backdrop-blur-sm transition-transform duration-300",
        isHidden ? "translate-y-full" : "translate-y-0",
      )}
    >
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
                  : acknowledgedIds.has(entry.note.client_id)
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      ) : null}

      <button
        className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="task-note-got-it-button"
        disabled={isPending}
        type="button"
        onClick={onGotIt}
      >
        Got it
      </button>
    </div>
  );
}
```

**Also update `handleOpenImageViewer`** to use `toNoteViewerImages` instead of the local `toViewerImages`:

```tsx
const handleOpenImageViewer = useCallback(
  (entry: TaskNoteApiEntry, imageClientId: string) => {
    surface.open(IMAGE_VIEWER_SURFACE_ID, {
      images: toNoteViewerImages(entry),
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

**Early-return states remain unchanged** (taskId guard, `notesQuery.isPending`, `lockedEntries === null`, `lockedEntries.length === 0`). These render outside the `ScrollVisibilityProvider` — that is correct since they render before the main carousel structure.

**Note on `pb-[80px]` for slide content:** The `pb-[80px]` on each slide div provides enough scroll distance to trigger `isHidden` for the bottom bar (approximately button height ~56px + padding ~24px). Adjust if the bottom bar height changes.

---

### Step 8 — Update `packages/task-notes/src/index.ts`

Append the following exports (add after `TaskNoteImagesSection` and `TaskNotePill` exports, before the surface-ids exports):

```ts
export { TaskNoteReadonlyImages, toNoteViewerImages } from "./components/TaskNoteReadonlyImages";
export type { TaskNoteReadonlyImagesProps } from "./components/TaskNoteReadonlyImages";
export { TaskNoteListPanel } from "./components/TaskNoteListPanel";
export type { TaskNoteListPanelProps } from "./components/TaskNoteListPanel";
export { TaskNoteDetailPanel } from "./components/TaskNoteDetailPanel";
export type { TaskNoteDetailPanelProps } from "./components/TaskNoteDetailPanel";
export { TaskNoteCreatePanel } from "./components/TaskNoteCreatePanel";
export type { TaskNoteCreatePanelProps } from "./components/TaskNoteCreatePanel";
```

---

## Risks and mitigations

- Risk: `VerticalScrollArea` with external `scrollRef` — `updateThumb`'s `useCallback` now depends on `scrollRef` (a ref object). Ref objects are stable references, so `updateThumb` will not be recreated on re-renders. But if the caller passes a different `RefObject` instance on each render, `updateThumb` recreates unnecessarily.
  Mitigation: Callers should store the ref from `useScrollVisibility` in a stable variable — which `useScrollVisibility` already does (it returns `useRef(null)`). No caller-side change needed.

- Risk: `ScrollVisibilityProvider` receives `null` as `scrollElement` while `lockedEntries` is loading in `TaskNoteUnreadViewerPage`. With a `null` element, `ScrollVisibilityProvider`'s `useEffect` returns early (guarded by `if (!scrollElement) return`). `isHidden` stays `false`, so the "Got it" button stays visible. ✅ No action needed.

- Risk: Slide refs array `slideElemRefs.current` may be stale if `lockedEntries` changes after initial lock. Since `lockedEntries` never changes after locking (`hasLockedRef` prevents re-locking), the array stays consistent. ✅

- Risk: `TaskNoteDetailPanel`'s `useScrollVisibility` fires in edit mode where `scrollRef` is not attached (the `VerticalScrollArea` in edit mode doesn't receive the scroll ref). `isHidden` stays `false` in edit mode. The absolute image container only renders when `!isEditing`, so this is safe — no element reads the stale scroll state. ✅

- Risk: The `pb-[200px]` offset in `TaskNoteDetailPanel` is a fixed approximation for the image grid height. Notes with no images correctly omit this padding.
  Mitigation: 200px covers the label (20px) + image grid row (≈120px on 375px device) + gap + outer padding. If the image grid is taller on very wide screens, the note content would still be accessible — it just might not scroll as far as intended. Acceptable approximation; refine in a follow-up if needed.

- Risk: `TaskNotesSheetPage` imports `toNoteViewerImages` (renamed from `toViewerImages`). If any other consumer imported the local `toViewerImages` (e.g., tests), it will break.
  Mitigation: `toViewerImages` was a file-local private function — it was never exported from `index.ts`. No external consumer can reference it. ✅

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `packages/ui` and `packages/task-notes`
- Manual smoke test — `TaskNotesSheetPage`:
  1. Open the notes sheet — verify sheet opens at fixed 400px height (no content-driven expansion)
  2. List panel: scroll down the note list — verify "Add note" button hides; scroll up — verify it reappears
  3. List panel: tap "Add note" — verify create panel slides in
  4. Detail panel: open a note with images — verify images float at the bottom; scroll down content — verify images hide; scroll back up — verify images reappear
  5. Detail panel: edit mode — verify images are NOT floating; the inline image section from `TaskNoteImagesSection` is present inside the scroll area
  6. All three panels slide correctly (left/right transitions unchanged)
- Manual smoke test — `TaskNoteUnreadViewerPage`:
  1. Open with an unread note — verify viewer opens at fixed 400px height (no measurement flash)
  2. Scroll down within the note — verify "Got it" button and indicators hide; scroll back up — verify they reappear
  3. With 2+ notes: tap "Got it" — verify embla advances to next slide; "Got it" reappears (new slide initializes visibility to visible)
  4. Indicator dots: active = wide primary, acknowledged = narrow primary/40, unread = narrow muted/30

## Review log

- `2026-06-26` `claude`: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
