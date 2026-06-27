# PLAN_task_note_composer_corrections_20260626

## Metadata

- Plan ID: `PLAN_task_note_composer_corrections_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-26T13:10:58Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_note_composer_and_creation_form_integration_20260626.md`

## Goal and intent

- Goal: Fix four bugs and one ordering drift found during post-implementation audit of `PLAN_task_note_composer_and_creation_form_integration_20260626`, and add the keyboard-aware done button UX to `TaskNoteComposer`.
- Non-goals: Any task note serialization, API, or feature changes beyond what is listed below.

## Scope

- In scope:
  1. Remove unplanned `value` prop from `TaskNoteComposer` — it creates a controlled/uncontrolled conflict with the Lexical editor.
  2. Remove `value={field.value ?? null}` from all three `Controller` render props in the form contents.
  3. Add `blurActiveComposerElement()` call before `openCamera()` in the camera button — prevents the mobile keyboard remaining visible behind the camera UI.
  4. Add `form.reset({...})` in `PreOrderFormContent` and `ReturnFormContent` after a successful submit — `note_content` (and all other fields) must clear when the slide is reused without full unmount.
  5. Fix image grid ordering in all three form contents — note grid currently renders above item grid; swap so item images (primary) appear first, note images (secondary) appear below.
  6. Add keyboard-aware done button to `TaskNoteComposer` — when the Lexical editor is focused (mobile keyboard up), the camera button hides and a filled circular check button (`bg-primary`, Lucide `Check`) appears at the bottom-right of the composer; tapping it blurs the editor (dismisses keyboard) and calls the optional `onCheckDone` callback (the hook for edit mode to save + close).
- Out of scope: Any task note serialization, API, or feature changes.

## Acceptance criteria

1. `TaskNoteComposer` has no `value` prop in its type definition or function signature.
2. No `value={...}` prop is passed to `TaskNoteComposer` in any `Controller` render prop.
3. Clicking the camera button in `TaskNoteComposer` calls `blurActiveComposerElement()` before `openCamera()`.
4. After a successful task creation via `PreOrderFormContent` or `ReturnFormContent`, `form.getValues("note_content")` is `null`.
5. In all three form contents, the item `ImagePreviewGrid` (inside the item `EntityImagesProvider`) renders first (top of the ContentCard), and the note `ImagePreviewGrid` renders second (below the item grid).
6. `npm run typecheck` passes with zero errors.
7. When the Lexical editor inside `TaskNoteComposer` is focused, the camera button is not rendered and a filled circular check button (bg-primary) is rendered at the right end of the inner row. When the editor is not focused the check button is not rendered and the camera button is rendered at the left end.

---

## Implementation plan

### Fix 1 — Remove `value` prop from `TaskNoteComposer` and add `blurActiveComposerElement` on camera click

**File:** `packages/task-notes/src/components/TaskNoteComposer.tsx`

**Four exact changes in this file:**

#### 1a. Add `blurActiveComposerElement` to the `@beyo/cases` import block (lines 4–11)

Before:
```ts
import {
  CaseComposerToolbar,
  getCaseComposerColorToken,
  type CaseComposerColorToken,
  type CaseComposerEditorToolbarActions,
  type CaseComposerToolbarState,
  type CaseMessageContent,
} from "@beyo/cases";
```

After:
```ts
import {
  CaseComposerToolbar,
  blurActiveComposerElement,
  getCaseComposerColorToken,
  type CaseComposerColorToken,
  type CaseComposerEditorToolbarActions,
  type CaseComposerToolbarState,
  type CaseMessageContent,
} from "@beyo/cases";
```

`blurActiveComposerElement` is confirmed exported from `packages/cases/src/index.ts` line 133.

#### 1b. Remove `value` from `TaskNoteComposerProps` type (line 50)

Before:
```ts
type TaskNoteComposerProps = {
  disabled?: boolean;
  initialContent?: CaseMessageContent;
  onChange: (value: TaskNoteComposerValue) => void;
  placeholder?: string;
  testId?: string;
  value?: TaskNoteComposerValue | null;
};
```

After:
```ts
type TaskNoteComposerProps = {
  disabled?: boolean;
  initialContent?: CaseMessageContent;
  onChange: (value: TaskNoteComposerValue) => void;
  placeholder?: string;
  testId?: string;
};
```

#### 1c. Remove `value = null` from the function destructuring (line 59)

Before:
```ts
export function TaskNoteComposer({
  disabled = false,
  initialContent,
  onChange,
  placeholder = "Add a note…",
  testId = "task-note-composer",
  value = null,
}: TaskNoteComposerProps): React.JSX.Element {
```

After:
```ts
export function TaskNoteComposer({
  disabled = false,
  initialContent,
  onChange,
  placeholder = "Add a note…",
  testId = "task-note-composer",
}: TaskNoteComposerProps): React.JSX.Element {
```

#### 1d. Fix the camera button `onClick` and fix `content` prop on `LazyCaseComposerEditor`

Two changes in the same JSX block (lines 193–233):

Camera button `onClick` (line 198) — add blur before open:

Before:
```tsx
            onClick={openCamera}
```

After:
```tsx
            onClick={() => {
              blurActiveComposerElement();
              openCamera();
            }}
```

`LazyCaseComposerEditor` `content` prop (line 223) — remove `value?.content ??`:

Before:
```tsx
                content={value?.content ?? initialContent ?? EMPTY_CONTENT}
```

After:
```tsx
                content={initialContent ?? EMPTY_CONTENT}
```

`EMPTY_CONTENT` is already defined at lines 35–37. Do not remove it — it is still needed as the fallback when `initialContent` is not provided.

---

### Fix 2 — Remove `value` prop from `InternalFormContent` `Controller` render prop and fix image grid ordering

**File:** `packages/task-creation/src/components/InternalFormContent.tsx`

**Two changes in this file:**

#### 2a. Remove `value={field.value ?? null}` from the `TaskNoteComposer` inside the `Controller` render prop (line 407)

Before:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="internal-form-note-composer"
                        value={field.value ?? null}
                      />
                    )}
                  />
```

After:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="internal-form-note-composer"
                      />
                    )}
                  />
```

#### 2b. Swap image grid ordering in the `task` step `ContentCard` (lines 376–391)

Currently note grid is first, item grid is second. Swap them.

Before:
```tsx
                <ContentCard data-testid="internal-form-images-section">
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="internal-form-note-images-grid"
                  />
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
```

After:
```tsx
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
```

The outer `EntityImagesProvider` for `entityType="note"` (which wraps the entire step div) remains unchanged — only the order of the two grids inside `ContentCard` changes. `ImagePreviewGrid` without an inner provider reads from the nearest ancestor provider, which is the outer note provider. This is correct.

---

### Fix 3 — Remove `value` prop, add `form.reset()`, and fix image grid ordering in `PreOrderFormContent`

**File:** `packages/task-creation/src/components/PreOrderFormContent.tsx`

**Three changes in this file:**

#### 3a. Add `form.reset()` in the submit handler after `createTask.mutateAsync` (lines 285–295)

Before:
```ts
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "pre_order",
        );

        await createTask.mutateAsync(payload);
        surface.close(TASK_CREATION_PRE_ORDER_SURFACE_ID);
      })(),
```

After:
```ts
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "pre_order",
        );

        await createTask.mutateAsync(payload);
        form.reset({
          item: {
            designer: "",
            article_number: "",
            sku: "",
            quantity: 1,
            item_position: undefined,
            item_currency: undefined,
            item_category_id: undefined,
            major_category: undefined,
          },
          item_upholstery: {
            upholstery_client_id: null,
            upholstery_amount_meters: null,
          },
          item_issues: [],
          customer: {
            display_name: "",
            customer_type: undefined,
            primary_email: "",
            primary_phone_number: "",
            address: {
              street: "",
              city: "",
              postal_code: "",
              country: "",
            },
          },
          return_source: undefined,
          fulfillment_method: undefined,
          scheduled_start_at: null,
          scheduled_end_at: null,
          working_section_assignments: [],
          ready_by_at: null,
          note_content: null,
        });
        surface.close(TASK_CREATION_PRE_ORDER_SURFACE_ID);
      })(),
```

The reset object must exactly match the `defaultValues` object at lines 134–169. Verify each field against the `useForm` call before applying.

#### 3b. Remove `value={field.value ?? null}` from `TaskNoteComposer` inside `Controller` (line 417)

Before:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="pre-order-form-note-composer"
                        value={field.value ?? null}
                      />
                    )}
                  />
```

After:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="pre-order-form-note-composer"
                      />
                    )}
                  />
```

#### 3c. Swap image grid ordering in the `details` step `ContentCard` (lines 391–407)

Currently note grid is first, item grid is second. Swap them.

Before:
```tsx
                <ContentCard data-testid="pre-order-form-images-section">
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="pre-order-form-note-images-grid"
                  />
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="pre-order-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
```

After:
```tsx
                <ContentCard data-testid="pre-order-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="pre-order-form-images-grid"
                    />
                  </EntityImagesProvider>
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="pre-order-form-note-images-grid"
                  />
                </ContentCard>
```

---

### Fix 4 — Remove `value` prop, add `form.reset()`, and fix image grid ordering in `ReturnFormContent`

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

**Three changes in this file:**

#### 4a. Add `form.reset()` in the submit handler after `createTask.mutateAsync` (lines 289–299)

Before:
```ts
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "return",
        );

        await createTask.mutateAsync(payload);
        surface.close(TASK_CREATION_RETURN_SURFACE_ID);
      })(),
```

After:
```ts
    onSubmit: () =>
      form.handleSubmit(async (values) => {
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "return",
        );

        await createTask.mutateAsync(payload);
        form.reset({
          item: {
            designer: "",
            article_number: "",
            sku: "",
            quantity: 1,
            item_position: undefined,
            item_currency: undefined,
            item_category_id: undefined,
            major_category: undefined,
          },
          item_upholstery: {
            upholstery_client_id: null,
            upholstery_amount_meters: null,
          },
          item_issues: [],
          customer: {
            display_name: "",
            customer_type: undefined,
            primary_email: "",
            primary_phone_number: "",
            address: {
              street: "",
              city: "",
              postal_code: "",
              country: "",
            },
          },
          return_source: undefined,
          fulfillment_method: undefined,
          scheduled_start_at: null,
          scheduled_end_at: null,
          working_section_assignments: [],
          ready_by_at: null,
          note_content: null,
        });
        surface.close(TASK_CREATION_RETURN_SURFACE_ID);
      })(),
```

The reset object must exactly match the `defaultValues` object at lines 129–165. Verify each field against the `useForm` call before applying.

#### 4b. Remove `value={field.value ?? null}` from `TaskNoteComposer` inside `Controller` (line 427)

Before:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="return-form-note-composer"
                        value={field.value ?? null}
                      />
                    )}
                  />
```

After:
```tsx
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="return-form-note-composer"
                      />
                    )}
                  />
```

#### 4c. Swap image grid ordering in the `details` step `ContentCard` (lines 401–416)

Currently note grid is first, item grid is second. Swap them.

Before:
```tsx
                <ContentCard data-testid="return-form-images-section">
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="return-form-note-images-grid"
                  />
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="return-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
```

After:
```tsx
                <ContentCard data-testid="return-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="return-form-images-grid"
                    />
                  </EntityImagesProvider>
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="return-form-note-images-grid"
                  />
                </ContentCard>
```

---

### Fix 5 — Keyboard-aware done button in `TaskNoteComposer`

**File:** `packages/task-notes/src/components/TaskNoteComposer.tsx`

This fix adds to the same file as Fix 1. Apply all sub-steps within the same edit pass.

#### 5a. Add `Check` to the `lucide-react` import (line 2)

Before:
```ts
import { Camera } from "lucide-react";
```

After:
```ts
import { Camera, Check } from "lucide-react";
```

#### 5b. Add `onCheckDone` to `TaskNoteComposerProps` (immediately after Fix 1b which removes the `value` prop)

Before (result of Fix 1b):
```ts
type TaskNoteComposerProps = {
  disabled?: boolean;
  initialContent?: CaseMessageContent;
  onChange: (value: TaskNoteComposerValue) => void;
  placeholder?: string;
  testId?: string;
};
```

After:
```ts
type TaskNoteComposerProps = {
  disabled?: boolean;
  initialContent?: CaseMessageContent;
  onChange: (value: TaskNoteComposerValue) => void;
  onCheckDone?: () => void;
  placeholder?: string;
  testId?: string;
};
```

#### 5c. Destructure `onCheckDone` in the function signature (immediately after Fix 1c which removes `value = null`)

Before (result of Fix 1c):
```ts
export function TaskNoteComposer({
  disabled = false,
  initialContent,
  onChange,
  placeholder = "Add a note…",
  testId = "task-note-composer",
}: TaskNoteComposerProps): React.JSX.Element {
```

After:
```ts
export function TaskNoteComposer({
  disabled = false,
  initialContent,
  onChange,
  onCheckDone,
  placeholder = "Add a note…",
  testId = "task-note-composer",
}: TaskNoteComposerProps): React.JSX.Element {
```

#### 5d. Restructure the camera + editor row to add keyboard-aware button toggling (lines 191–236)

`isEditorFocused` is already tracked as state. Use it to conditionally render the camera button and the new check button.

**Layout contract:**
- Not focused: `[camera button][flex-1 editor]`
- Focused:     `[flex-1 editor][check button]`

The camera button moves off-DOM when the editor is focused (not just hidden) — this prevents any tab-index or pointer issues.

Before:
```tsx
      <div className="rounded-2xl border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          <button
            aria-label="Take picture"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
            data-testid="task-note-composer-camera-button"
            disabled={disabled}
            onClick={() => {
              blurActiveComposerElement();
              openCamera();
            }}
            onFocus={() => {
              void preloadImageCameraSurface();
            }}
            onPointerEnter={() => {
              void preloadImageCameraSurface();
            }}
            onTouchStart={() => {
              void preloadImageCameraSurface();
            }}
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
                content={initialContent ?? EMPTY_CONTENT}
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
```

After:
```tsx
      <div className="rounded-2xl border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          {!isEditorFocused ? (
            <button
              aria-label="Take picture"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-camera-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                openCamera();
              }}
              onFocus={() => {
                void preloadImageCameraSurface();
              }}
              onPointerEnter={() => {
                void preloadImageCameraSurface();
              }}
              onTouchStart={() => {
                void preloadImageCameraSurface();
              }}
              type="button"
            >
              <Camera aria-hidden="true" className="size-5" />
            </button>
          ) : null}

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
                content={initialContent ?? EMPTY_CONTENT}
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

          {isEditorFocused ? (
            <button
              aria-label="Done"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-done-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                onCheckDone?.();
              }}
              type="button"
            >
              <Check aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>
      </div>
```

**Notes for Codex:**
- The camera button is wrapped in `{!isEditorFocused ? (...) : null}` — it is fully removed from the DOM when the editor is focused, preventing ghost pointer events.
- The check button is added after the `<div className="relative min-w-0 flex-1 ...">` block, so it renders to the RIGHT of the editor (bottom-right of the composer).
- `blurActiveComposerElement()` is already imported from `@beyo/cases` (Fix 1a). No new import needed here.
- `onCheckDone?.()` is called after blur so the parent callback runs with the keyboard already dismissed.
- There is no `mousedown` / `preventDefault` trick needed — `blurActiveComposerElement()` handles dismissal explicitly.

**Edit mode usage pattern (for reference — not implemented here):**
```tsx
<TaskNoteComposer
  initialContent={existingNote.content}
  onChange={setDraftValue}
  onCheckDone={async () => {
    await updateNote(draftValue);
    closeSheet();
  }}
/>
```

---

## File inventory

| # | File | Action | Fixes |
|---|------|--------|-------|
| 1 | `packages/task-notes/src/components/TaskNoteComposer.tsx` | MODIFY | Add `blurActiveComposerElement` + `Check` imports; remove `value` prop + destructure; fix `content` prop; add `onCheckDone` prop; keyboard-aware camera↔check button toggle |
| 2 | `packages/task-creation/src/components/InternalFormContent.tsx` | MODIFY | Remove `value` from Controller, swap image grid ordering |
| 3 | `packages/task-creation/src/components/PreOrderFormContent.tsx` | MODIFY | Add `form.reset()`, remove `value` from Controller, swap image grid ordering |
| 4 | `packages/task-creation/src/components/ReturnFormContent.tsx` | MODIFY | Add `form.reset()`, remove `value` from Controller, swap image grid ordering |

Total: 4 files, no new files.

---

## Risks and mitigations

- Risk: After removing the `value` prop, TypeScript may flag call sites that still pass `value={...}`. All three call sites are in files 2–4 of this plan and are explicitly fixed in the same pass.
  Mitigation: Apply all four files atomically. Run typecheck after all edits.

- Risk: `form.reset()` in PreOrder and Return uses `undefined` for optional enum fields. RHF's `reset()` treats `undefined` as "use the schema default". This matches the `useForm` `defaultValues` exactly.
  Mitigation: Copy the reset object verbatim from the `defaultValues` block in each file (confirmed lines 134–169 for PreOrder, lines 129–165 for Return).

- Risk: Swapping the grid order changes the React key / reconciliation order. There are no keys on these elements — React will diff by position. The context wiring (outer note provider → note grid; inner item provider → item grid) is not affected by the position swap.
  Mitigation: No action needed. Context nesting is structural, not positional.

---

## Validation plan

- `npm run typecheck` from `frontend/`: zero errors
- Confirm `TaskNoteComposerProps` has no `value` field (grep `value.*TaskNoteComposerValue` in `TaskNoteComposer.tsx` returns nothing)
- Manual test on mobile: tap camera button in note composer → keyboard dismisses before camera opens
- Manual test: tap inside note composer → keyboard rises → camera button disappears, check button appears at bottom-right → tap check button → keyboard dismisses, camera button reappears
- Manual test: submit a PreOrder form → reopen it → note composer is empty

## Review log

- `2026-06-26` post-implementation audit: 4 bugs and 1 ordering drift found, all addressed in this plan

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
