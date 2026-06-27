# PLAN_task_notes_content_fidelity_20260626

## Metadata

- Plan ID: `PLAN_task_notes_content_fidelity_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T21:00:00Z`
- Last updated at (UTC): `2026-06-26T18:23:46Z`
- Related issue/ticket: —
- Prerequisite plan: `PLAN_task_notes_ui_rework_20260626` — must be implemented first (creates `TaskNoteReadonlyImages.tsx` and `TaskNoteDetailPanel.tsx` which this plan modifies)
- Intention plan: —

## Goal and intent

- Goal: Two independent but related bugs in the task notes system: (1) **Image annotations not displayed** — the read-only image grid in note detail and unread viewer has no annotation overlay; `toNoteViewerImages` discards annotation data; fixing both makes annotations visible in thumbnails and in the full-screen viewer. (2) **Styled text lost on save** — `toTaskNoteContentBlocks` merges ALL composer parts into a single plain-text block, stripping bold/underline/color/size/animation marks. Fix by delegating to `toBackendMessageContent` from `@beyo/cases`. Also add `fromBackendNoteContent` so the edit flow loads structured content (with marks) instead of plain text.
- Business/user intent: Notes with bold/underline/big text or image annotations authored by users should survive a save-reload cycle and display with full fidelity.
- Non-goals: Adding new annotation types; changing image upload or annotation authoring flows; changing how cases serialize their content; any app-level wiring.

## Scope

- In scope:
  - `packages/task-notes/src/types.ts` — extend `TaskNoteApiImageSchema` with annotation fields
  - `packages/task-notes/src/lib/task-note-serialization.ts` — fix `toTaskNoteContentBlocks`, add `fromBackendNoteContent`
  - `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` — add `ImageAnnotationSvgLayer` overlay + update `toNoteViewerImages`
  - `packages/task-notes/src/components/TaskNoteDetailPanel.tsx` — `EditBodyInner` uses `fromBackendNoteContent` for initial content
- Out of scope:
  - `packages/images` — no changes needed; `readImageAnnotationItems` already returns ALL items
  - `packages/cases` — no changes; functions are consumed, not modified
  - Any app-level file
  - Any surface, surface-ids, controller, or API hook changes

## Clarifications required

None.

## Acceptance criteria

1. Saving a note that has styled text (bold, underline, big) sends multiple content blocks with `marks` instead of a single block with `marks: null`. Verified by inspecting the network request on note create/update.
2. When opening a note for editing, the composer re-renders the styled text with bold/underline/etc. formatting restored (not plain text).
3. The read-only image grid (bottom of detail panel, and inside unread viewer slides) shows annotation SVG overlays for images that have annotations.
4. Tapping a note image to open the full-screen viewer shows the same annotations.
5. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md` — component props patterns

### File read intent

Permitted relational reads:

- `packages/task-notes/src/types.ts` — read before edit; need current schema to extend it
- `packages/task-notes/src/lib/task-note-serialization.ts` — read before edit; need full current content
- `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` — this file is CREATED by `PLAN_task_notes_ui_rework_20260626`. Read it (after the prerequisite plan runs) to understand its current shape before modifying.
- `packages/task-notes/src/components/TaskNoteDetailPanel.tsx` — same; created by the prerequisite plan. Read it to locate `EditBodyInner` and its current `useState` initializer.
- `packages/images/src/types.ts` lines 60–90 — read for `ImageAnnotationSchema` shape; needed to correctly type the schema extension.

Permitted pattern reads:
- `packages/images/src/components/ImageAnnotationSvgLayer.tsx` — read to confirm prop signature (`annotations: ImageAnnotationViewModel[]`, `widthPx?`, `heightPx?`, `coverMode?`).

Prohibited reads:
- Do not read any files outside `packages/task-notes` or `packages/images` for implementation patterns; use contracts and this plan.

## Domain schemas consulted

- `TaskNoteApiImageSchema` (current): `{ client_id, image_url, width_px?, height_px? }.passthrough()`
- `ImageAnnotationSchema` (from `@beyo/images`): `{ client_id, annotation_type, data?, accuracy?, created_at }`
- `ImageAnnotationSvgLayer` props: `annotations: ImageAnnotationViewModel[]`, `widthPx?: number | null`, `heightPx?: number | null`, `coverMode?: boolean`
- `toImageAnnotationViewModels(annotation, annotations)` — exported from `@beyo/images`; takes `ImageAnnotation | null | undefined` + `ImageAnnotation[] | null | undefined` → `ImageAnnotationViewModel[]`
- `toBackendMessageContent(content: CaseMessageContent): MessageContentBlock[]` — exported from `@beyo/cases`; maps each part to a typed block preserving marks
- `fromBackendMessageContent(blocks: MessageContentBlock[] | null | undefined, mentionResolutions?): CaseMessageContent` — exported from `@beyo/cases`; reconstructs typed content from backend blocks (preserves marks)

## File manifest

| # | Action | Path |
|---|--------|------|
| 1 | MODIFIED | `packages/task-notes/src/types.ts` |
| 2 | MODIFIED | `packages/task-notes/src/lib/task-note-serialization.ts` |
| 3 | MODIFIED | `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` |
| 4 | MODIFIED | `packages/task-notes/src/components/TaskNoteDetailPanel.tsx` |

---

## Implementation plan

Read each file in full before editing it. Apply steps in order.

---

### Step 1 — Extend `TaskNoteApiImageSchema` with annotation fields

**File:** `packages/task-notes/src/types.ts`

Add `image_annotation` and `image_annotations` to `TaskNoteApiImageSchema`. The schema already uses `.passthrough()` which preserves unknown fields at runtime, but without explicit typing TypeScript consumers can't access annotation data. After this change, `TaskNoteApiImage` will expose both fields as typed optional values.

**Replace** `TaskNoteApiImageSchema`:

```ts
export const TaskNoteApiImageSchema = z
  .object({
    client_id: z.string(),
    image_url: z.string(),
    width_px: z.number().nullable().optional(),
    height_px: z.number().nullable().optional(),
    /**
     * Single annotation — legacy/first format from the backend.
     * Maps to `image_annotation` on the full Image schema.
     */
    image_annotation: z
      .object({
        client_id: z.string(),
        annotation_type: z.string(),
        data: z.record(z.string(), z.unknown()).nullable().optional(),
        accuracy: z.number().int().nullable().optional(),
        created_at: z.string(),
      })
      .nullable()
      .optional(),
    /**
     * All annotations — array format returned alongside image_annotation.
     */
    image_annotations: z
      .array(
        z.object({
          client_id: z.string(),
          annotation_type: z.string(),
          data: z.record(z.string(), z.unknown()).nullable().optional(),
          accuracy: z.number().int().nullable().optional(),
          created_at: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();
```

`TaskNoteApiImage` (the inferred type) will now include `image_annotation` and `image_annotations` as optional typed fields, while `.passthrough()` continues to preserve any other unknown fields.

---

### Step 2 — Fix serialization + add `fromBackendNoteContent`

**File:** `packages/task-notes/src/lib/task-note-serialization.ts`

**Problem A:** `toTaskNoteContentBlocks` merges all composer parts into one plain-text block, losing marks.

**Problem B:** `plainTextToComposerContent` is used to initialize the edit composer — it builds content from `plain_text`, which discards marks. After the serialization fix, the backend stores structured content with marks. The editor should be initialized from that content, not the plain-text fallback.

**Full replacement of the file:**

```ts
import {
  fromBackendMessageContent,
  toBackendMessageContent,
} from "@beyo/cases";
import type { CaseMessageContent } from "@beyo/cases";

import type { TaskNoteComposerValue, TaskNoteContentBlock } from "../types";

export function hasMeaningfulNoteContent(
  value: TaskNoteComposerValue | null | undefined,
): boolean {
  return Boolean(value && value.plainText.trim().length > 0);
}

/**
 * Converts composer content to the API payload format.
 * Each part becomes a separate content block, preserving marks (bold, underline,
 * size, color, animation). Previously collapsed all parts into a single plain block.
 */
export function toTaskNoteContentBlocks(
  content: CaseMessageContent,
): TaskNoteContentBlock[] {
  // toBackendMessageContent maps each CaseInlinePart to a MessageContentBlock
  // that carries type, text, mention, label_value, link, and marks.
  // Cast is safe: TaskNoteContentBlock = { type: string; text?: string; [key: string]: unknown }
  // which is a superset of MessageContentBlock's field set.
  return toBackendMessageContent(content) as unknown as TaskNoteContentBlock[];
}

/**
 * Converts API content blocks back to CaseMessageContent for the composer.
 * Use this when loading an existing note for editing so marks are preserved.
 * Fall back to fromPlainText when content is empty or absent.
 */
export function fromBackendNoteContent(
  blocks: TaskNoteContentBlock[] | null | undefined,
): CaseMessageContent {
  if (!blocks || blocks.length === 0) {
    return { parts: [] };
  }

  // fromBackendMessageContent expects MessageContentBlock[] — the shape is
  // identical to TaskNoteContentBlock (same fields), so the cast is safe.
  return fromBackendMessageContent(
    blocks as unknown as Parameters<typeof fromBackendMessageContent>[0],
  );
}

/**
 * Converts a plain string to a minimal CaseMessageContent with a single
 * unstyled text part. Used as a fallback when structured content is absent.
 */
export function plainTextToComposerContent(text: string): CaseMessageContent {
  return {
    parts: text.trim() ? [{ kind: "text", text }] : [],
  };
}
```

**Key change summary:**
- `toTaskNoteContentBlocks` now calls `toBackendMessageContent` instead of building a single block.
- `fromBackendNoteContent` is a new export; it calls `fromBackendMessageContent` to reconstruct the full CaseMessageContent with marks.
- `plainTextToComposerContent` is retained unchanged as a fallback (used when `note.content` is empty).

---

### Step 3 — Add annotation overlay to `TaskNoteReadonlyImages`

**File:** `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx`

This file was created by `PLAN_task_notes_ui_rework_20260626`. Read it first to understand its current shape, then apply these changes:

**Add new import:**
```ts
import { ImageAnnotationSvgLayer, toImageAnnotationViewModels } from "@beyo/images";
```

**Add `link_client_id` extraction to the image tile:**

Each thumbnail `<button>` renders a plain `<img>`. Add `ImageAnnotationSvgLayer` as an absolute overlay, computing annotations from `TaskNoteApiImage.image_annotation` and `TaskNoteApiImage.image_annotations`:

```tsx
// Inside the .map() callback, replace the <button> content:
<button
  key={image.client_id}
  className="relative aspect-square overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  type="button"
  onClick={() => onOpen(image.client_id)}
>
  <img alt="" className="size-full object-cover" src={image.image_url} />
  <ImageAnnotationSvgLayer
    annotations={toImageAnnotationViewModels(
      // image_annotation and image_annotations are optional typed fields
      // added to TaskNoteApiImage in Step 1.
      (image.image_annotation as Parameters<typeof toImageAnnotationViewModels>[0]) ?? null,
      (image.image_annotations as Parameters<typeof toImageAnnotationViewModels>[1]) ?? [],
    )}
    coverMode
    heightPx={image.height_px ?? null}
    widthPx={image.width_px ?? null}
  />
  {showOverlay ? (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
      +{overflow}
    </div>
  ) : null}
</button>
```

**Update `toNoteViewerImages`** to populate annotation data in the `ImageViewModel` it returns:

```ts
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
    // Populate from the typed fields added in Step 1.
    annotation: image.image_annotation
      ? (image.image_annotation as Parameters<typeof toImageAnnotationViewModels>[0])
      : null,
    annotations: toImageAnnotationViewModels(
      image.image_annotation as Parameters<typeof toImageAnnotationViewModels>[0] ?? null,
      image.image_annotations as Parameters<typeof toImageAnnotationViewModels>[1] ?? [],
    ),
  }));
}
```

**Important:** Do NOT change any other part of the file — only add the import, add `ImageAnnotationSvgLayer` inside the tile, and update `toNoteViewerImages`.

---

### Step 4 — Update `EditBodyInner` to load structured content

**File:** `packages/task-notes/src/components/TaskNoteDetailPanel.tsx`

This file was created by `PLAN_task_notes_ui_rework_20260626`. Read it first. Locate `EditBodyInner` (or `EditBody` depending on exact naming). Its `useState` initializer currently uses `plainTextToComposerContent(entry.note.plain_text)`. Change it to prefer structured content from `entry.note.content`.

**Update the import in this file:**

```ts
// Replace this import line:
import {
  hasMeaningfulNoteContent,
  plainTextToComposerContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";

// With:
import {
  fromBackendNoteContent,
  hasMeaningfulNoteContent,
  plainTextToComposerContent,
  toTaskNoteContentBlocks,
} from "../lib/task-note-serialization";
```

**Update the `useState` initializer in `EditBodyInner`:**

```tsx
// BEFORE:
const [value, setValue] = useState<TaskNoteComposerValue>(() => ({
  content: plainTextToComposerContent(entry.note.plain_text),
  plainText: entry.note.plain_text,
}));

// AFTER:
const [value, setValue] = useState<TaskNoteComposerValue>(() => {
  const hasStructuredContent =
    Array.isArray(entry.note.content) && entry.note.content.length > 0;

  return {
    content: hasStructuredContent
      ? fromBackendNoteContent(entry.note.content)
      : plainTextToComposerContent(entry.note.plain_text),
    plainText: entry.note.plain_text,
  };
});
```

**Also update the `useEffect` that resets value when `entry.note.client_id` changes:**

```tsx
// BEFORE:
useEffect(() => {
  setValue({
    content: plainTextToComposerContent(entry.note.plain_text),
    plainText: entry.note.plain_text,
  });
}, [entry.note.client_id, entry.note.plain_text]);

// AFTER:
useEffect(() => {
  const hasStructuredContent =
    Array.isArray(entry.note.content) && entry.note.content.length > 0;

  setValue({
    content: hasStructuredContent
      ? fromBackendNoteContent(entry.note.content)
      : plainTextToComposerContent(entry.note.plain_text),
    plainText: entry.note.plain_text,
  });
}, [entry.note.client_id, entry.note.content, entry.note.plain_text]);
```

**Do NOT change any other part of the file.**

Also update `TaskNoteComposer`'s `initialContent` prop in the `EditBodyInner` JSX:

```tsx
// BEFORE:
<LazyCaseComposerEditor
  className="min-h-16"
  content={initialContent ?? EMPTY_CONTENT}
  ...
/>

// There is an `initialContent` prop-pattern coming from the original EditPanelBodyInner.
// If the composer was initialized with plainTextToComposerContent there too, update it.
```

Actually — the `TaskNoteComposer` takes an `initialContent?: CaseMessageContent` prop. In the original code, `EditPanelBodyInner` set `initialContent={plainTextToComposerContent(entry.note.plain_text)}`. After the change, `EditBodyInner` passes `initialContent` from the `value.content` in `useState`. Verify that wherever `initialContent` is passed to `TaskNoteComposer` it uses the new structured content pattern.

Concretely: the `TaskNoteComposer` inside `EditBodyInner` should receive `initialContent={value.content}` (not a fresh `plainTextToComposerContent` call). Read the file to confirm this is already the case or update it if not.

---

## Risks and mitigations

- Risk: The `image_annotation` / `image_annotations` fields may not be returned by the notes API for all notes (backend omits them when empty). The Zod schema marks them `.nullable().optional()` and `.optional()` respectively, so missing fields parse as `undefined`. `toImageAnnotationViewModels(null, [])` returns `[]` — no annotations — which is safe. `ImageAnnotationSvgLayer` with `annotations={[]}` renders `null`. ✅

- Risk: `toBackendMessageContent` returns `MessageContentBlock[]` (from `@beyo/cases`). `TaskNoteContentBlock` is `{ type: string; text?: string; [key: string]: unknown }` — TypeScript may warn about index signature incompatibility. The double-cast `as unknown as TaskNoteContentBlock[]` resolves this without type safety risk since the shapes are semantically identical. ✅

- Risk: `fromBackendMessageContent` returns `CaseMessageContent` with `CaseInlinePart[]`. If the backend blocks have `type: "mention"` etc. but the task-notes composer doesn't support those kinds (mentions in notes don't exist), the editor will fall back to rendering them as plain text — acceptable. ✅

- Risk: Notes authored BEFORE this fix have `content` blocks with `marks: null` (the old format). `fromBackendNoteContent` calls `fromBackendMessageContent` which maps `marks: null` to `marks: undefined` (via `block.marks ?? undefined`). The editor renders them as plain text, which is correct. ✅

- Risk: The `useEffect` in `EditBodyInner` now depends on `entry.note.content` (an array). Object identity changes on every render if the parent re-renders. Depend on `entry.note.client_id` and `entry.note.plain_text` as before — keep `entry.note.content` in the dep array only to trigger a reset when the note actually changes. Since `entry` is stable as long as `client_id` is the same (same query result object), this is safe in practice. If needed, serialize content to string in the dep: `JSON.stringify(entry.note.content)`.

## Validation plan

- `npm run typecheck`: zero errors in `packages/task-notes`
- Manual note create test: type "Hello **world**" (bold the "world"), save note → inspect network payload: verify TWO content blocks, second has `marks: { bold: true }` (or equivalent structure sent by `toBackendMessageContent`)
- Manual note edit test: load the note saved above → open edit mode → verify the editor re-renders "Hello **world**" with bold formatting on "world"
- Manual annotation test: take a photo on a note, draw an annotation, save → open the note detail panel → verify the annotation SVG overlay appears on the thumbnail; tap the image → verify the annotation also shows in the full-screen viewer

## Review log

- `2026-06-26` `claude`: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
