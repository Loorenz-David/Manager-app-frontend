# PLAN_32_case_initial_message_composer_20260529

## Metadata

- Plan ID: `PLAN_32_case_initial_message_composer_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T12:49:10Z`
- Related issue/ticket: `N/A`
- Intention plan: `N/A`

## Goal and intent

- Goal: Build `CaseInitialMessageComposer` — a placement-agnostic rich-text field for the case creation form that reuses the existing `CaseComposerEditor` + `CaseComposerToolbar` stack, stores its content in `CaseCreationFormProvider`, and transmits it as `initial_message` in the create-case request. Initial placement: **Option B — inline in the scrollable form body of `CaseCreationFormContent`**.
- Business/user intent: When creating a case the user can write a rich-text description (first conversation message) using the same composer UX as the case chat. Tapping the field opens the keyboard; the editor and toolbar float above it; a "Done" button dismisses the keyboard without submitting the form. On case creation the description becomes the first message in the case conversation.
- Non-goals:
  - Option A (pinned `absolute bottom-0` layout) — architecture supports it later by passing `className` to the component.
  - Option C (dedicated bottom-sheet surface) — the component is designed to work there too; surface wiring is deferred.
  - Mention autocomplete/resolution in the creation context — the mention toolbar button inserts `@` as plain text only; full resolution is a later concern.
  - Updating the create-case response schema to surface `initial_message` data — not needed until post-creation navigation is implemented.
  - Attachment strip / camera button — the creation context has no draft-message entity to attach images to; the toolbar has no camera button.

## Scope

- In scope:
  - `InitialMessageInputSchema` and `InitialMessageInput` type added to `types.ts`.
  - `CreateCaseInputSchema` updated with `initial_message` field.
  - `CaseCreationFormProvider` extended with `composerContent`, `composerPlainText`, and `setComposerContent`.
  - New `CaseInitialMessageComposer` component (placement-agnostic, no hardcoded position CSS).
  - `CaseCreationFormContent` updated: field added to form body, submit handler assembles `initial_message`.
  - `CaseInitialMessageComposer` exported from `packages/cases/src/index.ts` so it can be moved to Option A/C placements without changing import paths.
- Out of scope:
  - Any changes to the `composer/` subdirectory primitives (`CaseComposerEditor`, `CaseComposerToolbar`, etc.).
  - Any changes to `create-case.ts` API function response schema.
  - Playwright spec — added in a future validation pass.
- Assumptions:
  - `CaseComposerEditor` lazy-loads Lexical correctly when instantiated outside `CaseConversationProvider`; no Lexical nodes require the conversation context.
  - The backend accepts `initial_message.client_id` with a `ccm_` prefix (`generateClientId("CaseConversationMessage")`).
  - A 409 on creation retries safely: the same `initial_message.client_id` is used (generated once at submit time, cleared only on success).

## Clarifications required

_None — all decisions are resolved by existing architecture and the accepted Option B proposal._

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors across all workspaces.
2. `CaseInitialMessageComposer` renders below `CaseTypePickerTriggerField` in the creation form's scrollable body.
3. Tapping the editor focuses it: the toolbar card appears above the input card, and a "Done" button appears on the right of the input row.
4. Tapping "Done" dismisses the keyboard and collapses the toolbar.
5. Scrolling while the keyboard is up (mobile) triggers the `visualViewport.resize` blur guard and collapses the toolbar.
6. Entering text and submitting the form sends `initial_message: { client_id, content, plain_text }` in the create-case request body.
7. Submitting without entering any text (or whitespace only) omits `initial_message` entirely from the request.
8. After successful case creation, the composer content is cleared to `{ parts: [] }` alongside `form.reset()`.
9. After a failed submission (caught in `catch`), the composer content is preserved for retry.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, package boundary rules
- `architecture/02_types.md`: Zod schema conventions, `z.infer<>` pattern
- `architecture/04_api_client.md`: `apiClient.post` shape, `ApiEnvelopeSchema`
- `architecture/07_components.md`: component authoring, `data-testid` placement
- `architecture/08_hooks.md`: `useCallback` memoization rules
- `architecture/09_forms.md`: `react-hook-form` integration, submit handler shape
- `architecture/13_errors.md`: error toast ownership (stays in `useCreateCase.onError`)
- `architecture/15_feature_structure.md`: package component layer conventions
- `architecture/23_providers.md`: context + provider shell pattern
- `architecture/24_dto.md`: backend input DTO shape, `z.infer<>` for input types
- `architecture/35_shared_packages.md §13`: package boundary rule — packages never call `openSurface`; this plan adds no surface openers so §13 is read-only context

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path, `usePreloadSurface`; this plan uses the same `lazy()` + `Suspense` pattern from `CaseRichComposer` — no `lazyWithPreload` because the editor is already split at the `CaseRichComposer` chunk boundary when the creation slide mounts

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache shape → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`
- Reading another DTO to understand view model shape → `24_dto.md`

Permitted (relational reads — understanding what exists):
- `packages/cases/src/types.ts` — exact field names in `CreateCaseInputSchema`, `MessageContentBlockSchema`
- `packages/cases/src/message-content.ts` — `CaseMessageContent` shape
- `packages/cases/src/lib/case-lexical-serialization.ts` — `hasMeaningfulCaseMessageContent`, `trimCaseMessageContent`, `CaseComposerToolbarState`
- `packages/cases/src/lib/message-content-adapter.ts` — `toBackendMessageContent`, `toBackendPlainText`
- `packages/cases/src/providers/CaseCreationFormProvider.tsx` — current context value shape
- `packages/cases/src/components/CaseCreationFormContent.tsx` — current submit handler and form body
- `packages/cases/src/components/composer/CaseRichComposer.tsx` — existing composition pattern to mirror
- `packages/cases/src/components/composer/CaseComposerEditor.tsx` — exact prop interface
- `packages/cases/src/components/composer/CaseComposerToolbar.tsx` — exact prop interface
- `packages/cases/src/components/composer/CaseColorPalette.tsx` — `getCaseComposerColorToken` import path
- `packages/cases/src/components/composer/blur-active-composer-element.ts` — export name
- `packages/cases/src/index.ts` — current exports to extend

### Skill selection

- Primary skill: N/A — standard feature component following established package patterns
- Trigger terms: N/A
- Excluded alternatives: N/A

## Implementation plan

### Touch point summary (5 files modified, 1 file created)

| # | File | Change |
|---|---|---|
| 1 | `packages/cases/src/types.ts` | Add `InitialMessageInputSchema`; update `CreateCaseInputSchema` |
| 2 | `packages/cases/src/providers/CaseCreationFormProvider.tsx` | Add composer state to context |
| 3 | `packages/cases/src/components/CaseInitialMessageComposer.tsx` | **New file** — placement-agnostic composer field |
| 4 | `packages/cases/src/components/CaseCreationFormContent.tsx` | Add field to form body; update submit handler |
| 5 | `packages/cases/src/index.ts` | Export `CaseInitialMessageComposer` |

> **Side-effect note (not a code change):** The comment `// add openParticipantPicker here when that field is introduced (PLAN_32)` in `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts` referenced PLAN_32 as a forward placeholder. Since this plan uses that number, the participant picker plan will be PLAN_33. Update that comment when authoring PLAN_33 — no code change needed here.

---

### Step 1 — `packages/cases/src/types.ts`

**Goal:** Define the `initial_message` wire shape and wire it into `CreateCaseInputSchema`.

**Insert immediately after `MessageContentBlockSchema` / `MessageContentBlock` type block** (before `MessageImageSnapshotSchema`):

```ts
export const InitialMessageInputSchema = z.object({
  client_id: z.string().nullable().optional(),
  content: z.array(MessageContentBlockSchema),
  plain_text: z.string().optional(),
});
export type InitialMessageInput = z.infer<typeof InitialMessageInputSchema>;
```

**Update `CreateCaseInputSchema`** — add one field at the end:

```ts
export const CreateCaseInputSchema = z.object({
  client_id: ClientIdSchema,
  case_type_id: z.string().min(1).optional(),
  type_label: z.string().max(128).optional(),
  participants: z.array(z.string()).optional(),
  selected_all: z.boolean().optional(),
  skip_participants: z.array(z.string()).optional(),
  initial_message: InitialMessageInputSchema.nullable().optional(),   // ← ADD
});
export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;
```

No other changes. `CaseCreationFormValues` / `CaseCreationFormSchema` are **not** changed — the composer content bypasses the Zod form schema and lives in provider state (see Step 2 rationale below).

---

### Step 2 — `packages/cases/src/providers/CaseCreationFormProvider.tsx`

**Goal:** Hold `composerContent: CaseMessageContent` and `composerPlainText: string` in provider state so any component inside the provider tree can read and write them.

**Rationale for keeping this in provider state (not form schema):** `CaseMessageContent` is a Lexical-specific serialization format (`{ parts: CaseInlinePart[] }`). Encoding it as a `z.custom<CaseMessageContent>()` field in a Zod form schema adds validation complexity for no gain — the backend DTO shape (`InitialMessageInput`) is derived at submit time via `toBackendMessageContent`. Provider state is the same pattern used for `selectedCaseType`.

**Add import:**
```ts
import type { CaseMessageContent } from "../message-content";
```

**Extend context type:**
```ts
type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
  entityTypes?: string[];
  selectedCaseType: CaseTypeSelectedDisplay | null;
  setSelectedCaseType: (ct: CaseTypeSelectedDisplay | null) => void;
  surfaceOpeners: CaseCreationSurfaceOpeners;
  composerContent: CaseMessageContent;                                    // ← ADD
  composerPlainText: string;                                              // ← ADD
  setComposerContent: (                                                   // ← ADD
    content: CaseMessageContent,                                         // ← ADD
    plainText: string,                                                    // ← ADD
  ) => void;                                                              // ← ADD
};
```

**Add state inside `CaseCreationFormProvider`:**
```ts
const [composerContent, setComposerContentState] = useState<CaseMessageContent>(
  () => ({ parts: [] }),
);
const [composerPlainText, setComposerPlainText] = useState<string>("");

function setComposerContent(
  content: CaseMessageContent,
  plainText: string,
): void {
  setComposerContentState(content);
  setComposerPlainText(plainText);
}
```

**Extend context value object:**
```ts
<CaseCreationFormContext.Provider
  value={{
    caseClientId,
    regenerateId,
    entityTypes,
    selectedCaseType,
    setSelectedCaseType,
    surfaceOpeners: surfaceOpeners ?? {},
    composerContent,          // ← ADD
    composerPlainText,        // ← ADD
    setComposerContent,       // ← ADD
  }}
>
```

---

### Step 3 — `packages/cases/src/components/CaseInitialMessageComposer.tsx` (new file)

**Goal:** Standalone, placement-agnostic rich-text field that reads/writes `composerContent` from `CaseCreationFormProvider`. Mirrors `CaseRichComposer`'s composition pattern but has no dependency on `CaseConversationProvider`.

**Design decisions:**
- Props: `className?: string` (outer div positioning is delegated to the parent) and `placeholder?: string` (default `"Add a description…"`).
- No `disabled` prop — the form-level `isPending` state is not surfaced to this field; a future pass can add it if needed.
- The editor is lazy-loaded with the same `lazy()` + `Suspense` pattern as `CaseRichComposer`. Vite will merge the dynamic-import chunk since the module path is identical.
- The toolbar card and the input card use the same border/shadow/corner-radius tokens as `CaseRichComposer` (`rounded-[1.9rem]`, `border border-border`, `bg-card`, `shadow-[0_10px_24px_rgba(0,0,0,0.08)]`).
- No `CaseComposerDraftImagesProvider` / `CaseComposerAttachmentStrip` — attachments are out of scope for the creation composer.
- No camera button — `CaseComposerInlineCameraButton` is out of scope.
- The mobile keyboard-dismiss guard (`visualViewport.resize`) is included verbatim from `CaseRichComposer` — it prevents the toolbar/Done button from staying visible after the user swipes to dismiss the keyboard.

**Full file:**

```tsx
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import {
  getCaseComposerColorToken,
  type CaseComposerColorToken,
} from "./composer/CaseColorPalette";
import type { CaseComposerEditorToolbarActions } from "./composer/CaseComposerEditor";
import { CaseComposerToolbar } from "./composer/CaseComposerToolbar";
import { blurActiveComposerElement } from "./composer/blur-active-composer-element";
import {
  type CaseComposerToolbarState,
} from "../lib/case-lexical-serialization";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";

const LazyCaseComposerEditor = lazy(() =>
  import("./composer/CaseComposerEditor").then((module) => ({
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

type CaseInitialMessageComposerProps = {
  className?: string;
  placeholder?: string;
};

export function CaseInitialMessageComposer({
  className,
  placeholder = "Add a description…",
}: CaseInitialMessageComposerProps): React.JSX.Element {
  const { composerContent, setComposerContent } =
    useCaseCreationFormContext();

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

  const handleDone = useCallback(() => {
    blurActiveComposerElement();
  }, []);

  // On mobile, scrolling dismisses the keyboard but never fires a blur event
  // on the contenteditable. Detect keyboard dismissal via visualViewport height
  // growing and treat it as a blur.
  useEffect(() => {
    if (!isEditorFocused || !window.visualViewport) {
      return;
    }

    let lastHeight = window.visualViewport.height;

    const handleViewportResize = () => {
      const currentHeight = window.visualViewport!.height;

      if (currentHeight > lastHeight) {
        (document.activeElement as HTMLElement | null)?.blur();
      }

      lastHeight = currentHeight;
    };

    window.visualViewport.addEventListener("resize", handleViewportResize);

    return () => {
      window.visualViewport!.removeEventListener(
        "resize",
        handleViewportResize,
      );
    };
  }, [isEditorFocused]);

  const toolbarButtonActions = {
    big: () => {
      toolbarActions?.toggleBig();
    },
    bold: () => {
      toolbarActions?.toggleBold();
    },
    color: () => {
      setExpandedTool("color");
    },
    mention: () => {
      toolbarActions?.openMentionPicker();
    },
    pulse: () => {
      toolbarActions?.togglePulse();
      setPulsePreviewTick((v) => v + 1);
    },
    shake: () => {
      toolbarActions?.toggleShake();
      setShakePreviewTick((v) => v + 1);
    },
    underline: () => {
      toolbarActions?.toggleUnderline();
    },
  } satisfies Record<
    "big" | "bold" | "color" | "mention" | "pulse" | "shake" | "underline",
    () => void
  >;

  return (
    <div className={className} data-testid="case-initial-message-composer">
      {isEditorFocused ? (
        <div className="mb-2 rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <CaseComposerToolbar
            actions={toolbarButtonActions}
            disabled={toolbarActions === null}
            expandedColorToken={getCaseComposerColorToken(
              toolbarState.activeColor,
            )}
            expandedTool={expandedTool}
            onCollapseExpandedTool={handleExpandedToolCollapse}
            onSelectExpandedColor={handleExpandedColorSelect}
            pulsePreviewTick={pulsePreviewTick}
            shakePreviewTick={shakePreviewTick}
            state={toolbarState}
          />
        </div>
      ) : null}

      <div className="rounded-[1.9rem] border border-border bg-card px-2 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
            <Suspense
              fallback={
                <div className="min-h-9 px-3 py-2 text-base text-muted-foreground">
                  Loading composer…
                </div>
              }
            >
              <LazyCaseComposerEditor
                content={composerContent}
                onBlur={handleEditorBlur}
                onChange={({ content, plainText }) => {
                  setComposerContent(content, plainText);
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
              className="mr-0.5 self-end rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-muted"
              data-testid="case-initial-message-composer-done"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleDone}
              type="button"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

**Key authoring notes:**
- `onMouseDown={(e) => e.preventDefault()}` on the Done button prevents the tap from stealing focus from the editor before `handleDone` fires — same guard used by send/save buttons in `CaseRichComposer`.
- `type="button"` is required — the component is rendered inside a `<form>` tag; without it the button defaults to `type="submit"`.
- The toolbar renders above the input card (in DOM order), so it is also above the keyboard when the editor is focused and the scroll container has scrolled the field into view.
- No `animated` wrapper around the toolbar card — `CaseRichComposer` uses plain conditional render; match that pattern.

---

### Step 4 — `packages/cases/src/components/CaseCreationFormContent.tsx`

**Goal:** Add `CaseInitialMessageComposer` to the form body and send `initial_message` on submit.

**Add imports:**

```ts
import { generateClientId } from "@beyo/lib";
import {
  hasMeaningfulCaseMessageContent,
  trimCaseMessageContent,
} from "../lib/case-lexical-serialization";
import {
  toBackendMessageContent,
  toBackendPlainText,
} from "../lib/message-content-adapter";
import { CaseInitialMessageComposer } from "./CaseInitialMessageComposer";
```

**Extend context destructure:**

```ts
const {
  caseClientId,
  regenerateId,
  entityTypes,
  setSelectedCaseType,
  composerContent,        // ← ADD
  setComposerContent,     // ← ADD
} = useCaseCreationFormContext();
```

(`composerPlainText` is not needed here — plain text is re-derived from the trimmed content at submit time.)

**Replace `handleSubmit`:**

```ts
const handleSubmit = form.handleSubmit(async (values) => {
  try {
    const trimmedContent = trimCaseMessageContent(composerContent);
    const hasInitialMessage = hasMeaningfulCaseMessageContent(trimmedContent);

    await createCaseAsync({
      client_id: caseClientId as CaseId,
      ...values,
      ...(hasInitialMessage
        ? {
            initial_message: {
              client_id: generateClientId("CaseConversationMessage"),
              content: toBackendMessageContent(trimmedContent),
              plain_text: toBackendPlainText(trimmedContent),
            },
          }
        : {}),
    });

    form.reset();
    setSelectedCaseType(null);
    setComposerContent({ parts: [] }, "");   // ← clear composer on success
    regenerateId();
  } catch {
    // Error toast is handled by useCreateCase onError
    // composerContent is intentionally NOT reset on failure (preserved for retry)
  }
});
```

**Key details:**
- `generateClientId("CaseConversationMessage")` is called inside the try block (at submit time, not on mount). A new `ccm_` ID is generated per attempt. On retry after failure, a fresh ID is generated — this avoids a 409 on the message if the first request partially succeeded on the backend.
- `trimCaseMessageContent` strips leading/trailing whitespace parts before serialization; `plain_text` is derived from the trimmed content, not from `composerPlainText` in state, to guarantee they stay in sync.
- `setComposerContent({ parts: [] }, "")` is called only in the success branch. The error branch leaves content intact for retry.

**Add field to form body:**

```tsx
<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
  <CaseTypePickerTriggerField />
  <CaseInitialMessageComposer />   {/* ← ADD — must be last for keyboard UX */}
</div>
```

The `CaseInitialMessageComposer` is placed last in the scrollable field list. When the keyboard appears, the browser's native "scroll to focused element" behavior brings the editor to the bottom of the visible viewport. The toolbar card (above the input in DOM order) is therefore also visible and accessible.

---

### Step 5 — `packages/cases/src/index.ts`

**Goal:** Export `CaseInitialMessageComposer` so app layers can place it outside `CaseCreationFormContent` (Option A pinned layout) without needing to reach into package internals.

Add after `CaseCreationFormContent` export line:

```ts
export { CaseInitialMessageComposer } from "./components/CaseInitialMessageComposer";
```

Note: `CaseTypePickerTriggerField` is **not** exported (tightly coupled to provider, no placement flexibility). `CaseInitialMessageComposer` **is** exported because it may be moved to Option A/C layouts where it sits outside the `<form>` DOM element but still inside `CaseCreationFormProvider`.

---

## Risks and mitigations

- **Risk:** `LazyCaseComposerEditor` triggers a Suspense fallback flash on first tap if the Lexical bundle has not loaded yet.
  **Mitigation:** The creation slide already uses `CaseCreationRouteEntry` → `CaseCreationFormContent`. If the creation slide is opened via `CASE_CREATION_SLIDE_SURFACE_ID`, the `usePreloadSurface` hook in `CaseCreationSlidePage.tsx` can be extended to also preload the composer editor. Deferred to a polish pass; the Suspense fallback shows "Loading composer…" which is acceptable.

- **Risk:** `type="button"` omission on the Done button causes unintended form submission.
  **Mitigation:** Explicitly specified in Step 3 with rationale; Codex must not omit it.

- **Risk:** Mobile browser does not scroll the focused editor into view correctly, hiding the toolbar under the keyboard.
  **Mitigation:** `CaseInitialMessageComposer` is placed last in the form field list (Step 4 note). This positions the field near the bottom of the scroll container, minimising the scroll distance needed. Full resolution requires Option A (pinned layout) which is deferred.

- **Risk:** `generateClientId("CaseConversationMessage")` called inside the submit handler means each retry attempt uses a different `client_id`. If the first request succeeded on the backend but the response was lost (network error), retrying would create a duplicate message (409 is not guaranteed).
  **Mitigation:** Acceptable risk for the initial implementation. Idempotent retry with a stable message `client_id` (generated once on form mount, cleared on success) is a future hardening concern consistent with how `caseClientId` is managed.

- **Risk:** `expandedTool` color picker stays open when the user scrolls away from the field.
  **Mitigation:** The `handleEditorBlur` callback resets `expandedTool` to `null`. If the user scrolls (mobile keyboard dismiss), the `visualViewport.resize` guard triggers a blur which fires `handleEditorBlur`. Handled.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in all workspaces.
- `npm run test -- --grep "CaseInitialMessageComposer"`: component renders, focuses, shows toolbar, shows Done button, blurs on Done.
- Manual smoke test (mobile viewport):
  1. Open case creation slide.
  2. Tap description field → keyboard opens, toolbar appears above input, Done button appears.
  3. Type rich text (bold a word, apply color).
  4. Tap Done → keyboard dismisses, toolbar hides, content preserved.
  5. Tap "Create case" → network request includes `initial_message.content` with formatted blocks.
  6. Tap "Create case" with no description → request body has no `initial_message` key.
  7. Create case without description → success toast, form resets, composer clears.

## Review log

_No reviews yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
