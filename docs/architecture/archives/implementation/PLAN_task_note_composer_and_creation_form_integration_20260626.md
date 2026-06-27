# PLAN_task_note_composer_and_creation_form_integration_20260626

## Metadata

- Plan ID: `PLAN_task_note_composer_and_creation_form_integration_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-26T12:51:17Z`
- Related handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_note_system_improvement_20260626.md`

## Goal and intent

- Goal: Implement the `TaskNoteComposer` as a reusable package component, wire it into the three task creation forms (Internal, PreOrder, Return), and migrate task schemas to match the new backend API contract (task notes removed from `GET /tasks/:id`; content is now an array of blocks).
- Business/user intent: Allow managers to author a styled note with optional photos while creating a task. The note is submitted inline as part of the task creation payload (`notes` array).
- Non-goals:
  - Task note list / note card rendering on the task detail screen (future plan)
  - `POST /api/v1/tasks/:id/notes` standalone note creation (future plan)
  - `PATCH /api/v1/tasks/:id/notes/:note_id` note editing (future plan)
  - `POST /api/v1/tasks/:id/notes/:note_id/read-by` read receipts (future plan)
  - Worker app integration (future plan — same package will be consumed once built)

## Scope

- In scope:
  - New `@beyo/task-notes` package with `TaskNoteComposer` component
  - Exporting necessary Lexical composer primitives from `@beyo/cases`
  - Schema migration in managers-app `features/tasks/types.ts`: `TaskNoteSchema` content → array, `task_notes` removed from `TaskDetailRawSchema` (made optional with default `[]`)
  - Schema migration in `packages/tasks/src/types.ts`: same `task_notes` change
  - `TaskCreationFormProvider` gains a `noteClientId`
  - Task-creation form schemas: replace `additional_details: string` with `note_content: TaskNoteComposerValue | null`
  - `normalize-task-form-payload.ts`: add `buildNotePayload` helper; include `notes` array in payload when note has content
  - `InternalFormContent`, `PreOrderFormContent`, `ReturnFormContent`: swap `TaskAdditionalDetailsField` for `TaskNoteComposer` + add note image grid
  - Package dependency declarations and `@source` CSS directive
- Out of scope: See Non-goals above
- Assumptions:
  - The `@beyo/cases` Lexical editor (`CaseComposerEditor`, `CaseComposerToolbar`, color palette, blur util, `hasMeaningfulCaseMessageContent`) is the editor foundation for task notes. A dedicated shared Lexical package is not in scope here.
  - Task note images are uploaded through the existing `@beyo/images` `EntityImagesProvider` system with `entityType: "note"`.
  - The managers-app does not currently render `task_notes` from the task detail response anywhere outside `TaskDetailRawSchema` parsing (grep confirmed no component reads `task_notes` from the parsed detail).

## Clarifications required

None — intent and scope are fully defined.

## Acceptance criteria

1. Managers app builds with zero TypeScript errors (`npm run typecheck`).
2. On the task creation forms (Internal, PreOrder, Return), the `TaskAdditionalDetailsField` textarea is replaced by the `TaskNoteComposer` rich-text editor with an inline camera button.
3. A camera button in the composer opens the camera; captured images appear in a note image grid above the form's image card (same ContentCard as item images, rendered as a second `ImagePreviewGrid`).
4. On form submit, if the note composer has at least one non-whitespace character, the payload includes a `notes` array with one entry containing `client_id`, `note_type: "user_note"`, `content`, `plain_text`, and `users_read_list: []`.
5. If the composer is empty, no `notes` key is included in the payload.
6. Task detail parsing (`TaskDetailRawSchema`) no longer throws when `task_notes` is absent from the response.
7. `TaskNoteSchema.content` parses as an array of blocks (not a dict).

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package structure, peer deps, `@source` directives, surface openers pattern

### File read intent — pattern vs. relational

Permitted relational reads for Codex during implementation:
- `packages/cases/src/components/composer/CaseComposerEditor.tsx` — understand exact prop surface and `onChange` shape before cloning usage in `TaskNoteComposer`
- `packages/cases/src/components/composer/CaseComposerToolbar.tsx` — understand prop surface before using it in `TaskNoteComposer`
- `packages/cases/src/components/composer/CaseColorPalette.tsx` — understand `getCaseComposerColorToken` + `CaseComposerColorToken` shape
- `packages/cases/src/components/composer/blur-active-composer-element.ts` — copy import path exactly
- `packages/cases/src/lib/case-lexical-serialization.ts` — understand `hasMeaningfulCaseMessageContent` + `CaseComposerToolbarState` type before exporting
- `packages/cases/src/message-content.ts` — understand `CaseMessageContent` type shape
- `packages/task-creation/src/providers/TaskCreationFormProvider.tsx` — understand context shape before adding `noteClientId`

Prohibited (pattern reads):
- Reading another action hook to understand cache shape → use `architecture/08_hooks.md`
- Reading another query hook for TanStack Query shape → use `architecture/05_server_state.md`

### Skill selection

- Primary skill: direct implementation (no specialized Codex skill required — straightforward multi-file edit)

---

## Implementation plan

Steps are ordered by dependency. Do not reorder.

---

### Step 1 — Export composer primitives from `@beyo/cases`

**File:** `packages/cases/src/index.ts`

Append the following named exports to the bottom of the file. Do NOT restructure existing exports.

```ts
// Composer primitives — consumed by @beyo/task-notes
export { CaseComposerEditor } from "./components/composer/CaseComposerEditor";
export type { CaseComposerEditorToolbarActions } from "./components/composer/CaseComposerEditor";
export { CaseComposerToolbar } from "./components/composer/CaseComposerToolbar";
export { getCaseComposerColorToken } from "./components/composer/CaseColorPalette";
export type { CaseComposerColorToken } from "./components/composer/CaseColorPalette";
export { blurActiveComposerElement } from "./components/composer/blur-active-composer-element";
export { hasMeaningfulCaseMessageContent } from "./lib/case-lexical-serialization";
export type { CaseComposerToolbarState } from "./lib/case-lexical-serialization";
export type { CaseMessageContent } from "./message-content";
```

Verify the names:
- `CaseComposerEditor` — named export from `CaseComposerEditor.tsx` (confirmed via lazy import pattern in `CaseInitialMessageComposer`)
- `CaseComposerEditorToolbarActions` — type exported from `CaseComposerEditor.tsx` (confirmed at line 37)
- `CaseComposerToolbar` — named export (confirmed via import in `CaseInitialMessageComposer`)
- `getCaseComposerColorToken`, `CaseComposerColorToken` — from `CaseColorPalette.tsx` (confirmed via import in `CaseInitialMessageComposer`)
- `blurActiveComposerElement` — from `blur-active-composer-element.ts` (confirmed via import in `CaseInitialMessageComposer`)
- `hasMeaningfulCaseMessageContent` — from `case-lexical-serialization.ts` (confirmed via import in `CaseRichComposer`)
- `CaseComposerToolbarState` — type from `case-lexical-serialization.ts` (confirmed via import in both composers)
- `CaseMessageContent` — type from `message-content.ts` (confirmed at line 51)

---

### Step 2 — Schema migration: managers-app task types

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts`

#### 2a. Add `TaskNoteContentBlockSchema` before `TaskNoteSchema` (around line 89)

```ts
export const TaskNoteContentBlockSchema = z.object({
  type: z.string(),
}).passthrough();
export type TaskNoteContentBlock = z.infer<typeof TaskNoteContentBlockSchema>;
```

#### 2b. Add user role snapshot schemas before `TaskNoteSchema`

```ts
const TaskNoteUserRoleSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});

const TaskNoteCreatorSchema = z.object({
  client_id: z.string(),
  username: z.string().nullable(),
  profile_picture: z.string().nullable(),
  role: TaskNoteUserRoleSchema.nullable(),
  workspace_role: TaskNoteUserRoleSchema.nullable(),
});
```

#### 2c. Replace the body of `TaskNoteSchema` (lines 89–98)

Before:
```ts
export const TaskNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string().transform((value) => value as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE),
  content: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});
```

After:
```ts
export const TaskNoteSchema = z.object({
  client_id: z.string(),
  task_id: z.string().transform((value) => value as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE),
  content: z.array(TaskNoteContentBlockSchema),
  plain_text: z.string().nullable(),
  users_read_list: z.array(z.string()),
  created_at: z.string().datetime({ offset: true }),
  created_by: TaskNoteCreatorSchema.nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by: TaskNoteCreatorSchema.nullable(),
  is_deleted: z.boolean(),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});
```

#### 2d. Update `TaskDetailRawSchema.task_notes` (line 202)

Before:
```ts
  task_notes: z.array(TaskNoteSchema),
```

After:
```ts
  task_notes: z.array(TaskNoteSchema).optional().default([]),
```

This handles the new backend contract where `GET /api/v1/tasks/{task_id}` no longer returns `task_notes`.

#### 2e. Replace `CreateTaskNoteInputSchema` (lines 267–272)

Before:
```ts
export const CreateTaskNoteInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE, { message: "Note type is required." }),
  content: z.record(z.string(), z.unknown()),
});
```

After:
```ts
export const CreateTaskNoteInputSchema = z.object({
  client_id: z.string().optional(),
  task_id: z.string().transform((v) => v as TaskId),
  note_type: z.enum(TASK_NOTE_TYPE, { message: "Note type is required." }),
  content: z.array(TaskNoteContentBlockSchema),
  plain_text: z.string().optional(),
  users_read_list: z.array(z.string()).optional(),
});
```

#### 2f. Add `notes` field to `CreateTaskInputSchema` (after `additional_details` field, around line 234)

Add to `CreateTaskInputSchema`:
```ts
  notes: z.array(z.object({
    client_id: z.string().optional(),
    note_type: z.enum(TASK_NOTE_TYPE),
    content: z.array(TaskNoteContentBlockSchema),
    plain_text: z.string().optional(),
    users_read_list: z.array(z.string()).optional(),
  })).optional(),
```

#### 2g. Also export `TaskNoteContentBlock` from `apps/managers-app/.../features/tasks/index.ts`

Find the `index.ts` that re-exports from types (it already exports `TaskNote`, `CreateTaskNoteInput`). Add:
```ts
export type { TaskNoteContentBlock } from "./types";
export { TaskNoteContentBlockSchema } from "./types";
```

---

### Step 3 — Schema migration: `@beyo/tasks` package types

**File:** `packages/tasks/src/types.ts`

#### 3a. Change `task_notes` in `TaskDetailRawSchema` (line 196)

Before:
```ts
  task_notes: z.array(z.unknown()),
```

After:
```ts
  task_notes: z.array(z.unknown()).optional().default([]),
```

No other changes needed in this file — the package uses `z.unknown()` for note content already (looser schema), which is fine for the package's use case.

---

### Step 4 — Create `@beyo/task-notes` package

#### 4a. `packages/task-notes/package.json`

```json
{
  "name": "@beyo/task-notes",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/cases": "*",
    "@beyo/images": "*",
    "@beyo/lib": "*",
    "lucide-react": ">=1.0.0",
    "react": ">=19.0.0"
  }
}
```

#### 4b. `packages/task-notes/tsconfig.json`

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

#### 4c. `packages/task-notes/src/types.ts`

```ts
import type { CaseMessageContent } from "@beyo/cases";

export type TaskNoteContentBlock = {
  type: string;
  text?: string;
  [key: string]: unknown;
};

export type TaskNoteComposerValue = {
  content: CaseMessageContent;
  plainText: string;
};

export type TaskNoteInlinePayload = {
  client_id: string;
  note_type: "user_note";
  content: TaskNoteContentBlock[];
  plain_text: string;
  users_read_list: [];
};
```

#### 4d. `packages/task-notes/src/lib/task-note-serialization.ts`

```ts
import type { CaseMessageContent } from "@beyo/cases";

import type { TaskNoteContentBlock, TaskNoteComposerValue } from "../types";

export function hasMeaningfulNoteContent(
  value: TaskNoteComposerValue | null | undefined,
): boolean {
  return Boolean(value && value.plainText.trim().length > 0);
}

export function toTaskNoteContentBlocks(
  content: CaseMessageContent,
): TaskNoteContentBlock[] {
  const text = content.parts.map((part) => part.text).join("");
  if (!text) return [];
  return [{ type: "text", text }];
}
```

Notes for Codex:
- `CaseMessageContent` has shape `{ parts: CaseInlinePart[] }` where each `CaseInlinePart` has a `text: string` field.
- This serialization deliberately flattens rich formatting to a plain text block for v1. Do not add complexity here.

#### 4e. `packages/task-notes/src/components/TaskNoteComposer.tsx`

This component is modeled on `CaseInitialMessageComposer` in `packages/cases/src/components/CaseInitialMessageComposer.tsx`. Read that file before implementing. Key differences from `CaseInitialMessageComposer`:

1. **Controlled, not context-coupled**: accepts `value`, `onChange`, `initialContent` props instead of reading from a context.
2. **Camera button**: renders an inline camera button (like `CaseComposerInlineCameraButton` in `CaseRichComposer`) that calls `useEntityImagesContext().openCamera()`. The parent is responsible for providing an `EntityImagesProvider` context for note images.
3. **No Done button**: the task creation form handles submission — remove the "Done" button from `CaseInitialMessageComposer`.
4. **Mobile keyboard detection**: copy the `visualViewport` resize logic verbatim from `CaseInitialMessageComposer`.

```tsx
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Camera } from "lucide-react";

import {
  getCaseComposerColorToken,
  blurActiveComposerElement,
  hasMeaningfulCaseMessageContent,
  CaseComposerToolbar,
  type CaseComposerColorToken,
  type CaseComposerEditorToolbarActions,
  type CaseComposerToolbarState,
  type CaseMessageContent,
} from "@beyo/cases";
import { useEntityImagesContext, preloadImageCameraSurface } from "@beyo/images";

import type { TaskNoteComposerValue } from "../types";

const LazyCaseComposerEditor = lazy(() =>
  import("@beyo/cases").then((module) => ({
    default: module.CaseComposerEditor,
  })),
);

const EMPTY_TOOLBAR_STATE: CaseComposerToolbarState = {
  activeColor: null,
  big: false,
  bold: false,
  color: false,
  pulse: false,
  shake: false,
  underline: false,
};

type CaseComposerExpandedTool = "color";

const KEYBOARD_OPEN_THRESHOLD_PX = 80;
const KEYBOARD_CLOSE_SNAP_THRESHOLD_PX = 32;

type TaskNoteComposerProps = {
  initialContent?: CaseMessageContent;
  onChange: (value: TaskNoteComposerValue) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
};

export function TaskNoteComposer({
  initialContent,
  onChange,
  placeholder = "Add a note…",
  disabled = false,
  testId = "task-note-composer",
}: TaskNoteComposerProps): React.JSX.Element {
  const { openCamera } = useEntityImagesContext();

  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [toolbarActions, setToolbarActions] =
    useState<CaseComposerEditorToolbarActions | null>(null);
  const [toolbarState, setToolbarState] =
    useState<CaseComposerToolbarState>(EMPTY_TOOLBAR_STATE);
  const [expandedTool, setExpandedTool] =
    useState<CaseComposerExpandedTool | null>(null);
  const [pulsePreviewTick, setPulsePreviewTick] = useState(0);
  const [shakePreviewTick, setShakePreviewTick] = useState(0);

  const handleToolbarActionsReady = useCallback(
    (nextActions: CaseComposerEditorToolbarActions | null) => {
      setToolbarActions(nextActions);
      if (nextActions === null) {
        setExpandedTool(null);
        setToolbarState(EMPTY_TOOLBAR_STATE);
      }
    },
    [],
  );

  const handleExpandedColorSelect = useCallback(
    (colorToken: CaseComposerColorToken) => {
      toolbarActions?.applyColor(colorToken);
    },
    [toolbarActions],
  );

  const handleExpandedToolCollapse = useCallback(() => {
    toolbarActions?.applyColor("default");
    setExpandedTool(null);
  }, [toolbarActions]);

  const handleEditorFocus = useCallback(() => {
    setIsEditorFocused(true);
  }, []);

  const handleEditorBlur = useCallback(() => {
    setIsEditorFocused(false);
    setExpandedTool(null);
  }, []);

  // Mobile: detect keyboard dismissal via visualViewport height growing
  useEffect(() => {
    if (!isEditorFocused || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    const initialHeight = viewport.height;
    let minHeightSeen = initialHeight;
    let keyboardOpened = false;

    const handleViewportResize = () => {
      const currentHeight = viewport.height;
      if (currentHeight < minHeightSeen) {
        minHeightSeen = currentHeight;
      }
      if (!keyboardOpened) {
        keyboardOpened =
          initialHeight - minHeightSeen >= KEYBOARD_OPEN_THRESHOLD_PX;
      }
      if (
        keyboardOpened &&
        currentHeight >= initialHeight - KEYBOARD_CLOSE_SNAP_THRESHOLD_PX
      ) {
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };

    viewport.addEventListener("resize", handleViewportResize);
    return () => {
      viewport.removeEventListener("resize", handleViewportResize);
    };
  }, [isEditorFocused]);

  const toolbarButtonActions = {
    big: () => { toolbarActions?.toggleBig(); },
    bold: () => { toolbarActions?.toggleBold(); },
    color: () => { setExpandedTool("color"); },
    mention: () => { toolbarActions?.openMentionPicker(); },
    pulse: () => {
      toolbarActions?.togglePulse();
      setPulsePreviewTick((v) => v + 1);
    },
    shake: () => {
      toolbarActions?.toggleShake();
      setShakePreviewTick((v) => v + 1);
    },
    underline: () => { toolbarActions?.toggleUnderline(); },
  } satisfies Record<
    "big" | "bold" | "color" | "mention" | "pulse" | "shake" | "underline",
    () => void
  >;

  return (
    <div data-testid={testId}>
      {isEditorFocused ? (
        <div className="mb-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <CaseComposerToolbar
            actions={toolbarButtonActions}
            disabled={disabled || toolbarActions === null}
            expandedColorToken={getCaseComposerColorToken(toolbarState.activeColor)}
            expandedTool={expandedTool}
            onCollapseExpandedTool={handleExpandedToolCollapse}
            onSelectExpandedColor={handleExpandedColorSelect}
            pulsePreviewTick={pulsePreviewTick}
            shakePreviewTick={shakePreviewTick}
            state={toolbarState}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          <button
            aria-label="Take picture"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid="task-note-composer-camera-button"
            disabled={disabled}
            onClick={openCamera}
            onFocus={() => { void preloadImageCameraSurface(); }}
            onPointerEnter={() => { void preloadImageCameraSurface(); }}
            onTouchStart={() => { void preloadImageCameraSurface(); }}
            type="button"
          >
            <Camera aria-hidden="true" className="size-5" />
          </button>

          <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
            <Suspense
              fallback={
                <div className="min-h-16 px-3 py-2 text-base text-muted-foreground">
                  Loading composer...
                </div>
              }
            >
              <LazyCaseComposerEditor
                className="min-h-16"
                content={initialContent}
                disabled={disabled}
                onBlur={handleEditorBlur}
                onChange={({ content, plainText }) => {
                  onChange({ content, plainText });
                }}
                onFocus={handleEditorFocus}
                onToolbarActionsReady={handleToolbarActionsReady}
                onToolbarStateChange={setToolbarState}
                placeholder={placeholder}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Important notes for Codex implementing this file:**
- The `CaseComposerEditor` is NOT lazy-imported via dynamic `import()` in this file — it is lazy-imported from `@beyo/cases` directly via `React.lazy`. This matches how `CaseInitialMessageComposer` does it internally (it calls `import("./composer/CaseComposerEditor")`). Since `CaseComposerEditor` is now exported from `@beyo/cases`, use `import("@beyo/cases")` and extract `.CaseComposerEditor` from the module.
- The `content` prop on `CaseComposerEditor` accepts `CaseMessageContent | undefined`. Pass `initialContent` directly; when `undefined` the editor starts empty.
- The `CaseComposerEditor` `onChange` fires with `{ content: CaseMessageContent, plainText: string }`. Pass both to `onChange` prop.
- `useEntityImagesContext` is from `@beyo/images` — the parent wraps this component in `EntityImagesProvider` for `entityType="note"`.
- `preloadImageCameraSurface` is from `@beyo/images` — same import as `CaseComposerInlineCameraButton`.
- Do not import `useSurface` or call `openSurface` anywhere in this component.

#### 4f. `packages/task-notes/src/index.ts`

```ts
export type { TaskNoteComposerValue, TaskNoteContentBlock, TaskNoteInlinePayload } from "./types";
export { hasMeaningfulNoteContent, toTaskNoteContentBlocks } from "./lib/task-note-serialization";
export { TaskNoteComposer } from "./components/TaskNoteComposer";
```

---

### Step 5 — Update `TaskCreationFormProvider`

**File:** `packages/task-creation/src/providers/TaskCreationFormProvider.tsx`

Add `noteClientId` to the context. The prefix for task notes is `tno_` (from `CLIENT_ID_PREFIXES.TaskNote = 'tno'`). Use entity name `"TaskNote"`.

Before:
```ts
type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  regenerateIds: () => void;
};
```

After:
```ts
type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  regenerateIds: () => void;
};
```

In the provider function body, add:
```ts
const [noteClientId, setNoteClientId] = useState(() =>
  generateClientId("TaskNote"),
);
```

In `regenerateIds`:
```ts
function regenerateIds(): void {
  setTaskClientId(generateClientId("ExecutionTask"));
  setItemClientId(generateClientId("Item"));
  setCustomerClientId(generateClientId("Customer"));
  setNoteClientId(generateClientId("TaskNote"));
}
```

In the context value:
```ts
value={{ taskClientId, itemClientId, customerClientId, noteClientId, regenerateIds }}
```

`generateClientId("TaskNote")` will produce a `tno_` prefixed ULID, matching the backend's `tno_` client_id prefix requirement.

---

### Step 6 — Update task-creation form types

**File:** `packages/task-creation/src/types.ts`

#### 6a. Add import for `TaskNoteComposerValue`

At the top with other imports:
```ts
import type { TaskNoteComposerValue } from "@beyo/task-notes";
```

#### 6b. Remove `TaskAdditionalDetailsFieldsSchema` import

Remove from the `@beyo/tasks` import:
```ts
// Remove:
  TaskAdditionalDetailsFieldsSchema,
```

#### 6c. Replace `additional_details` with `note_content` in `ReturnFormSchema`

Before (lines 48–49):
```ts
  additional_details:
    TaskAdditionalDetailsFieldsSchema.shape.additional_details,
```

After:
```ts
  note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
```

#### 6d. Replace `additional_details` with `note_content` in `InternalFormSchema`

Before (lines 71–72):
```ts
    additional_details:
      TaskAdditionalDetailsFieldsSchema.shape.additional_details,
```

After:
```ts
    note_content: z.custom<TaskNoteComposerValue>().nullable().optional(),
```

Note: `PreOrderFormSchema = ReturnFormSchema` (alias), so this change covers PreOrder automatically.

#### 6e. Re-export `TaskNoteComposerValue` for consumers

At the bottom of `types.ts`, add:
```ts
export type { TaskNoteComposerValue };
```

---

### Step 7 — Update `normalize-task-form-payload.ts`

**File:** `packages/task-creation/src/lib/normalize-task-form-payload.ts`

#### 7a. Add import

```ts
import {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
  type TaskNoteComposerValue,
} from "@beyo/task-notes";
```

#### 7b. Add `buildNotePayload` helper (add before `normalizeReturnFormPayload`)

```ts
function buildNotePayload(
  noteContent: TaskNoteComposerValue | null | undefined,
  noteClientId: string,
): object | undefined {
  if (!hasMeaningfulNoteContent(noteContent)) {
    return undefined;
  }

  return {
    client_id: noteClientId,
    note_type: "user_note",
    content: toTaskNoteContentBlocks(noteContent!.content),
    plain_text: noteContent!.plainText,
    users_read_list: [],
  };
}
```

#### 7c. Update `BaseIds` type

```ts
type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
};
```

#### 7d. Update `normalizeReturnFormPayload`

Remove the `additional_details` field from the returned object. Add `notes` array when note has content.

The function currently ends with:
```ts
  return {
    client_id: ids.taskClientId,
    ...
    additional_details: buildAdditionalDetails(values.additional_details),
    ...
  };
```

After (remove `additional_details`, add `notes`):
```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId);

  return {
    client_id: ids.taskClientId,
    task_type: taskType,
    state: "pending",
    priority: "normal",
    return_source: values.return_source || undefined,
    fulfillment_method: values.fulfillment_method || undefined,
    scheduled_start_at: values.scheduled_start_at || undefined,
    scheduled_end_at: values.scheduled_end_at || undefined,
    ready_by_at: values.ready_by_at || undefined,
    ...buildCustomerFields(values.customer),
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    ...(notePayload ? { notes: [notePayload] } : {}),
  };
```

#### 7e. Update `normalizeInternalFormPayload`

Same removal of `additional_details`, same addition of `notes`:

```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId);

  return {
    client_id: ids.taskClientId,
    task_type: "internal",
    state: "pending",
    priority: "normal",
    ready_by_at: values.ready_by_at || undefined,
    ...(itemFields ? { item: itemFields } : {}),
    ...(issueFields ? { item_issues: issueFields } : {}),
    ...(upholsteryFields ? { item_upholstery: upholsteryFields } : {}),
    ...(steps.length > 0 ? { steps } : {}),
    ...(notePayload ? { notes: [notePayload] } : {}),
  };
```

#### 7f. Remove `buildAdditionalDetails` helper

The `buildAdditionalDetails` function is now unused. Delete it entirely:
```ts
// DELETE this function:
function buildAdditionalDetails(additionalDetails: string | undefined) {
  const trimmed = additionalDetails?.trim();
  return trimmed ? { text: trimmed } : undefined;
}
```

---

### Step 8 — Update `InternalFormContent.tsx`

**File:** `packages/task-creation/src/components/InternalFormContent.tsx`

#### 8a. Update imports

Remove:
```ts
import {
  TaskAdditionalDetailsField,
  ...
} from "@beyo/tasks";
```
→ Keep other `@beyo/tasks` imports, just remove `TaskAdditionalDetailsField` from the import list.

Add:
```ts
import {
  EntityImagesProvider,
  ImagePreviewGrid,
  useCreateImagesFromUrl,
} from "@beyo/images";
```
(The `EntityImagesProvider` and `ImagePreviewGrid` imports are already present — confirm the existing import and just verify `ImagePreviewGrid` is included.)

Add:
```ts
import { TaskNoteComposer } from "@beyo/task-notes";
```

#### 8b. Consume `noteClientId` from form context

Change:
```ts
const { taskClientId, itemClientId, customerClientId, regenerateIds } =
  useTaskCreationFormContext();
```

To:
```ts
const { taskClientId, itemClientId, customerClientId, noteClientId, regenerateIds } =
  useTaskCreationFormContext();
```

#### 8c. Update `INTERNAL_STEP_FIELDS_MAP`

Before:
```ts
  task: ["item_issues", "ready_by_at", "additional_details"],
```

After:
```ts
  task: ["item_issues", "ready_by_at", "note_content"],
```

#### 8d. Update form `defaultValues`

Before:
```ts
      additional_details: "",
```

After:
```ts
      note_content: null,
```

This appears twice in InternalFormContent: in the initial `useForm` call and in the `form.reset()` call after successful submission. Update BOTH occurrences.

#### 8e. Update error tracking in `onBeforeAdvance`

Before:
```ts
          if (
            errors.item_issues ??
            errors.additional_details ??
            errors.ready_by_at
          ) {
            setStatus("task", "error");
          }
```

After:
```ts
          if (
            errors.item_issues ??
            errors.note_content ??
            errors.ready_by_at
          ) {
            setStatus("task", "error");
          }
```

#### 8f. Update `onSubmit` — pass `noteClientId` to normalize

Before:
```ts
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
        });
```

After:
```ts
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
          noteClientId,
        });
```

#### 8g. Update the `task` StagedFormStep JSX

The current `task` step contains:
```tsx
<StagedFormStep id="task" className="px-0">
  <div className="flex flex-col gap-4">
    <ContentCard data-testid="internal-form-images-section">
      <EntityImagesProvider
        entityClientId={itemClientId}
        captureFlow="camera-to-editor"
        deleteMode="hard-delete"
        entityType="item"
      >
        <ImagePreviewGrid
          maxImages={6}
          testId="internal-form-images-grid"
        />
      </EntityImagesProvider>
    </ContentCard>
    <ContentCard>
      <TaskReadyByDateField
        onOpenCalendarSinglePicker={(props) =>
          surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
        }
      />
      <TaskAdditionalDetailsField />
    </ContentCard>
  </div>
</StagedFormStep>
```

Replace with:
```tsx
<StagedFormStep id="task" className="px-0">
  <EntityImagesProvider
    entityClientId={noteClientId}
    captureFlow="camera-to-editor"
    deleteMode="hard-delete"
    entityType="note"
  >
    <div className="flex flex-col gap-4">
      <ContentCard data-testid="internal-form-images-section">
        <EntityImagesProvider
          entityClientId={itemClientId}
          captureFlow="camera-to-editor"
          deleteMode="hard-delete"
          entityType="item"
        >
          <ImagePreviewGrid
            maxImages={6}
            testId="internal-form-images-grid"
          />
        </EntityImagesProvider>
        <ImagePreviewGrid
          maxImages={3}
          testId="internal-form-note-images-grid"
        />
      </ContentCard>
      <ContentCard>
        <TaskReadyByDateField
          onOpenCalendarSinglePicker={(props) =>
            surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
          }
        />
        <Controller
          name="note_content"
          control={form.control}
          render={({ field }) => (
            <TaskNoteComposer
              onChange={field.onChange}
              placeholder="Add a note…"
              testId="internal-form-note-composer"
            />
          )}
        />
      </ContentCard>
    </div>
  </EntityImagesProvider>
</StagedFormStep>
```

**Notes for Codex:**
- The outer `EntityImagesProvider` for `entityType="note"` wraps the entire step content div. This is required because `TaskNoteComposer`'s camera button calls `useEntityImagesContext()`, which must find the note-scoped provider.
- The note `ImagePreviewGrid` sits OUTSIDE the item `EntityImagesProvider` so it reads from the outer note provider. The item `ImagePreviewGrid` sits INSIDE the item `EntityImagesProvider` so it reads from that context. React context nesting ensures each grid uses the correct provider.
- `ImagePreviewGrid` with `maxImages={3}` — the third slot shows the "+N" overlay when more than 3 images exist; this is handled internally by `ImagePreviewGrid` (check its implementation if needed).
- The `Controller` wrapper is used because `note_content` is not a simple scalar field — it holds a `TaskNoteComposerValue` object. The `field.onChange` from `Controller` calls `form.setValue("note_content", value)`.
- Import `Controller` from `react-hook-form` (already imported in this file).

---

### Step 9 — Update `PreOrderFormContent.tsx`

**File:** `packages/task-creation/src/components/PreOrderFormContent.tsx`

Apply the same changes as Step 8. Differences from InternalFormContent:
- The step is called `details` (not `task`)
- The `STEP_FIELDS_MAP` key is `details`
- The `data-testid` values use `pre-order-form-*` prefix
- The `normalizeReturnFormPayload` function is called (not `normalizeInternalFormPayload`)

#### 9a. Remove `TaskAdditionalDetailsField` from `@beyo/tasks` import
#### 9b. Add `import { TaskNoteComposer } from "@beyo/task-notes";`
#### 9c. Add `noteClientId` from `useTaskCreationFormContext()`
#### 9d. Update `PRE_ORDER_STEP_FIELDS_MAP`:
```ts
  details: ["item_issues", "note_content", "ready_by_at"],
```

#### 9e. Update `defaultValues`: `additional_details: ""` → `note_content: null`
#### 9f. Update error tracking for `details` step:
```ts
          if (
            errors.item_issues ??
            errors.note_content ??
            errors.ready_by_at
          ) {
            setStatus("details", "error");
          }
```

#### 9g. Update `onSubmit` to pass `noteClientId`:
```ts
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "pre_order",
        );
```

#### 9h. Update `details` StagedFormStep JSX

Apply the same structural pattern as Step 8g, using:
- `data-testid="pre-order-form-images-section"`
- `testId="pre-order-form-images-grid"` (item images)
- `testId="pre-order-form-note-images-grid"` (note images)
- `testId="pre-order-form-note-composer"` (composer)

---

### Step 10 — Update `ReturnFormContent.tsx`

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

Apply the same changes as Step 9. Differences:
- The `data-testid` values use `return-form-*` prefix
- `normalizeReturnFormPayload` is called with `"return"` task type

#### 10a–10g: Identical to 9a–9g, with `return` naming.

#### 10h. Update `details` StagedFormStep JSX

Apply the same structural pattern as Step 8g, using:
- `data-testid="return-form-images-section"`
- `testId="return-form-images-grid"` (item images)
- `testId="return-form-note-images-grid"` (note images)
- `testId="return-form-note-composer"` (composer)

---

### Step 11 — Update package dependencies

#### 11a. `packages/task-creation/package.json`

Add `@beyo/task-notes` to `peerDependencies`:
```json
"@beyo/task-notes": "*",
```

#### 11b. `apps/managers-app/ManagerBeyo-app-managers/package.json`

Add `@beyo/task-notes` to `dependencies`:
```json
"@beyo/task-notes": "*",
```

#### 11c. `apps/managers-app/ManagerBeyo-app-managers/src/index.css`

Add `@source` directive for the new package (after the existing `@source "../../../../packages/task-creation/src";` line):
```css
@source "../../../../packages/task-notes/src";
```

#### 11d. Run npm install

After updating the package.json files:
```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

Verify `node_modules/@beyo/task-notes` is a symlink to `packages/task-notes`.

---

## File inventory

| # | File | Action |
|---|------|--------|
| 1 | `packages/cases/src/index.ts` | MODIFY — add 9 composer primitive exports |
| 2 | `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/types.ts` | MODIFY — TaskNoteSchema, TaskDetailRawSchema, CreateTaskNoteInputSchema, CreateTaskInputSchema |
| 3 | `packages/tasks/src/types.ts` | MODIFY — task_notes optional |
| 4 | `packages/task-notes/package.json` | CREATE |
| 5 | `packages/task-notes/tsconfig.json` | CREATE |
| 6 | `packages/task-notes/src/types.ts` | CREATE |
| 7 | `packages/task-notes/src/lib/task-note-serialization.ts` | CREATE |
| 8 | `packages/task-notes/src/components/TaskNoteComposer.tsx` | CREATE |
| 9 | `packages/task-notes/src/index.ts` | CREATE |
| 10 | `packages/task-creation/src/providers/TaskCreationFormProvider.tsx` | MODIFY — add noteClientId |
| 11 | `packages/task-creation/src/types.ts` | MODIFY — replace additional_details with note_content |
| 12 | `packages/task-creation/src/lib/normalize-task-form-payload.ts` | MODIFY — add buildNotePayload, remove buildAdditionalDetails |
| 13 | `packages/task-creation/src/components/InternalFormContent.tsx` | MODIFY — swap field + add note images |
| 14 | `packages/task-creation/src/components/PreOrderFormContent.tsx` | MODIFY — same |
| 15 | `packages/task-creation/src/components/ReturnFormContent.tsx` | MODIFY — same |
| 16 | `packages/task-creation/package.json` | MODIFY — add @beyo/task-notes peer dep |
| 17 | `apps/managers-app/ManagerBeyo-app-managers/package.json` | MODIFY — add @beyo/task-notes dep |
| 18 | `apps/managers-app/ManagerBeyo-app-managers/src/index.css` | MODIFY — add @source |

Total: 18 files.

---

## Risks and mitigations

- Risk: `CaseComposerEditor` lazy-import from `@beyo/cases` may not resolve correctly if the export is not a default-compatible named export.
  Mitigation: The lazy import pattern `import("@beyo/cases").then(m => ({ default: m.CaseComposerEditor }))` bridges named → default. Codex must use this exact pattern (matching how `CaseInitialMessageComposer` does `import("./composer/CaseComposerEditor").then(m => ({ default: m.CaseComposerEditor }))`).

- Risk: `ImagePreviewGrid` with `maxImages={3}` — if the `maxImages` prop controls both the max images AND the overlay threshold, this is correct. If the overlay threshold is a separate prop, Codex must check `packages/images/src/components/ImagePreviewGrid.tsx` before assuming.
  Mitigation: Read `ImagePreviewGrid.tsx` prop types before writing the JSX. If a separate `overlayThreshold` prop exists, use `maxImages={6}` and `overlayThreshold={3}` instead.

- Risk: `TaskNoteComposer` won't compile if `CaseComposerEditor`'s `content` prop is required (not optional). If `initialContent` is `undefined`, passing it as `content={undefined}` should be fine if the prop is `CaseMessageContent | undefined`. Verify from `CaseComposerEditor.tsx` line 50: `content: CaseMessageContent;` — if it is required, make the `TaskNoteComposer`'s lazy fallback initialize an empty `CaseMessageContent` instead of passing `undefined`.
  Mitigation: Read `CaseComposerEditor.tsx` lines 48–65 before implementing; if `content` is required (not optional), pass a guaranteed-safe default: `initialContent ?? { parts: [] }`.

- Risk: `z.custom<TaskNoteComposerValue>()` in the form schema may not give RHF proper type inference.
  Mitigation: This pattern is acceptable for complex object fields in RHF. The `Controller` wrapper provides type safety at the component level. No runtime validation needed since the composer manages its own content validity.

- Risk: The `buildAdditionalDetails` removal may break `normalizeWorkerInternalFormPayload` if that function also uses it.
  Mitigation: Read `normalizeWorkerInternalFormPayload` before deleting — it does NOT call `buildAdditionalDetails` (confirmed from the file read). Safe to delete.

---

## Validation plan

- `npm run typecheck` from `frontend/`: zero TypeScript errors across all packages and apps
- Manual test in managers app: open a task creation form (Internal, PreOrder, Return) → navigate to last step → verify `TaskNoteComposer` renders (no textarea, rich editor instead)
- Manual test: type text in note composer → tap camera button → take a photo → verify photo appears in the note image grid in the ContentCard
- Manual test: submit form with note content → inspect network payload → verify `notes: [{ client_id: "tno_...", note_type: "user_note", content: [...], plain_text: "...", users_read_list: [] }]` present
- Manual test: submit form WITHOUT typing anything in note composer → verify `notes` key is ABSENT from payload
- Manual test: submit form with note → task is created successfully without 4xx error

---

## Review log

- `2026-06-26` plan author: Initial version

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
