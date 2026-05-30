# PLAN_38_case_task_info_to_cases_package_20260530

## Metadata

- Plan ID: `PLAN_38_case_task_info_to_cases_package_20260530`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-05-30T00:00:00Z`
- Last updated at (UTC): `2026-05-30T09:22:49Z`
- Related issue/ticket: `user-brief-2026-05-30`
- Intention plan: `user-defined directly — prerequisite for PLAN_37`

---

## Goal and intent

- **Goal:** Add a render slot to `@beyo/cases` so that each consuming app can inject its own task card renderer into the `CASE_TASK_INFO_SHEET` surface. The package threads a `renderTaskCard?: (taskId: string) => ReactNode` function from `CaseConversationSurfaceProps.surfaceOpeners` all the way down to `surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, ...)`.
- **Business/user intent:** Each app defines what card renders in the task info sheet and controls what happens on tap (e.g., the managers app shows a `CaseTaskInfoCard` with images and navigation; a future app might show something simpler). The package never needs to know about tasks, images, or navigation — it only holds the slot.
- **Non-goals:**
  - Moving `CaseTaskInfoCard` or `CaseTaskInfoSheetContent` into the package — they remain app-local in the managers app.
  - Any changes to the workers app (the new props are optional; the workers app is backward compatible without modification).
  - Any visual or rendering changes.

---

## Scope

- **In scope (package only):**
  - `packages/cases/src/surface-ids.ts` — add `CaseConversationSurfaceOpeners`, update `CaseConversationSurfaceProps`, update `CaseTaskInfoSheetSurfaceProps`
  - `packages/cases/src/components/CaseConversationRouteEntry.tsx` — accept and forward `surfaceOpeners?`
  - `packages/cases/src/providers/CaseConversationProvider.tsx` — accept and forward `surfaceOpeners?`
  - `packages/cases/src/controllers/use-case-conversation.controller.ts` — accept `surfaceOpeners?` in options; pass `renderTaskCard` in `surface.open` call inside `openInfo()`
  - `packages/cases/src/index.ts` — export `CaseConversationSurfaceOpeners` type

- **Out of scope (handled in Plan 37):**
  - Wiring `renderLinkedTaskCard` in the managers app's `CaseConversationSlidePage.tsx`
  - Updating the managers app's `CaseTaskInfoSheetPage.tsx` to call `renderTaskCard`
  - Deleting or modifying `CaseTaskInfoCard` or `CaseTaskInfoSheetContent` in the managers app
  - Any change to the workers app

- **Assumptions:**
  - The workers app does not register `CASE_TASK_INFO_SHEET_SURFACE_ID` in its surface registry — so `openInfo()` with `renderTaskCard: undefined` in the workers app context is a no-op (unchanged behaviour).
  - `CaseCreationSurfaceOpeners` in `surface-ids.ts` is the naming precedent — follow the same pattern.

---

## Design: render slot threading chain

The `CASE_TASK_INFO_SHEET_SURFACE_ID` is opened from inside the package (in `use-case-conversation.controller.ts`). For an app to inject a custom renderer, the function must travel this chain:

```
App caller
  → surface.open(CASE_CONVERSATION_SURFACE_ID, { caseClientId, surfaceOpeners: { renderLinkedTaskCard } })
    → CaseConversationSlidePage reads surfaceProps.surfaceOpeners
      → CaseConversationRouteEntry receives surfaceOpeners prop
        → CaseConversationProvider receives surfaceOpeners prop
          → useCaseConversationController receives options.surfaceOpeners
            → openInfo() calls surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, {
                caseClientId,
                taskId,
                renderTaskCard: options.surfaceOpeners?.renderLinkedTaskCard,
              })
              → CaseTaskInfoSheetPage reads renderTaskCard from surface props
                → {renderTaskCard ? renderTaskCard(taskId) : null}
```

All new props are optional — no existing call site breaks.

---

## §13 Compliance

The package never calls `surface.open` on a non-own surface for external data. `CASE_TASK_INFO_SHEET_SURFACE_ID` is the package's own surface (defined in `surface-ids.ts`). The `renderTaskCard` slot lets each app inject its own renderer without the package knowing anything about task, image, or navigation domains. No §13 violation.

---

## Clarifications required

*(none — all information confirmed from source files)*

---

## Acceptance criteria

1. `npx tsc --noEmit` exits 0 in `packages/cases/`.
2. Workers app typecheck exits 0 (no regressions — no source changes required).
3. `CaseConversationSurfaceOpeners` is exported from `@beyo/cases` public API.
4. `CaseTaskInfoSheetSurfaceProps` includes `renderTaskCard?: (taskId: string) => ReactNode`.
5. `CaseConversationSurfaceProps` includes `surfaceOpeners?: CaseConversationSurfaceOpeners`.
6. `useCaseConversationController` passes `renderTaskCard: options.surfaceOpeners?.renderLinkedTaskCard` inside `openInfo()`.
7. Neither the workers app nor any other existing consumer requires source changes.

---

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: §13 (surface opener injection pattern), §8 (package directory structure), §11 (naming and export conventions).

### File read intent

All reads are relational:
- `packages/cases/src/surface-ids.ts` — current types, insertion points.
- `packages/cases/src/components/CaseConversationRouteEntry.tsx` — current props, what to add.
- `packages/cases/src/providers/CaseConversationProvider.tsx` — current props, what to add.
- `packages/cases/src/controllers/use-case-conversation.controller.ts` — `openInfo()` location, `UseCaseConversationControllerOptions` type.
- `packages/cases/src/index.ts` — where to add new export.

---

## Implementation plan

Execute steps **in order**.

---

### Phase 0 — Update surface types

**Step 1 — Add `CaseConversationSurfaceOpeners` and update surface prop types in `packages/cases/src/surface-ids.ts`**

Add `import type { ReactNode } from "react"` at the top of the file (after the existing imports).

Add the new `CaseConversationSurfaceOpeners` type **before** `CaseConversationSurfaceProps`:

```ts
import type { ReactNode } from "react";
```

Insert after the existing `import type { CaseTypeSelectedDisplay, ParticipantSelectionResult }` block:

```ts
export type CaseConversationSurfaceOpeners = {
  renderLinkedTaskCard?: (taskId: string) => ReactNode;
};
```

Update `CaseConversationSurfaceProps` — add `surfaceOpeners?`:

```ts
// Before:
export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
};

// After:
export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};
```

Update `CaseTaskInfoSheetSurfaceProps` — add `renderTaskCard?`:

```ts
// Before:
export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
};

// After:
export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
  renderTaskCard?: (taskId: string) => ReactNode;
};
```

**Full resulting file** (write exactly this):

```ts
import type { ReactNode } from "react";
import type { CaseId } from "@beyo/lib";
import type {
  CaseTypeSelectedDisplay,
  ParticipantSelectionResult,
} from "./types";

export const CASE_CONVERSATION_SURFACE_ID = "case-conversation-slide";
export const CASE_CREATION_SLIDE_SURFACE_ID = "case-creation-slide";
export const CASE_TYPE_PICKER_SHEET_SURFACE_ID = "case-type-picker-sheet";
export const PARTICIPANT_PICKER_SLIDE_SURFACE_ID = "participant-picker-slide";
export const CASE_TASK_INFO_SHEET_SURFACE_ID = "case-task-info-sheet";
export const CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID =
  "case-message-actions-sheet";

export type CaseConversationSurfaceOpeners = {
  renderLinkedTaskCard?: (taskId: string) => ReactNode;
};

export type CaseConversationSurfaceProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};

export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  currentCaseTypeId?: string | null;
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};

export type ParticipantPickerSlideSurfaceProps = {
  currentParticipants: string[];
  currentSelectedAll: boolean;
  currentSkipParticipants: string[];
  onSave: (result: ParticipantSelectionResult) => void;
};

export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
  openParticipantPicker?: (props: ParticipantPickerSlideSurfaceProps) => void;
};

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  entityClientId?: string;
  title?: string;
  surfaceOpeners: CaseCreationSurfaceOpeners;
};

export type CaseTaskInfoSheetSurfaceProps = {
  caseClientId: CaseId;
  taskId: string;
  renderTaskCard?: (taskId: string) => ReactNode;
};

export type CaseMessageActionsSheetSurfaceProps = {
  caseClientId: string;
  messageClientId: string;
  messageSeq: number;
  messageText: string;
  canEdit: boolean;
  canDelete: boolean;
  onRequestDelete?: () => Promise<void>;
};
```

---

### Phase 1 — Thread `surfaceOpeners` through the conversation stack

**Step 2 — Update `packages/cases/src/components/CaseConversationRouteEntry.tsx`**

Add `surfaceOpeners?` prop and forward it to the provider.

```tsx
// Before:
import type { CaseId } from '@beyo/lib';

import { CaseConversationProvider } from '../providers/CaseConversationProvider';
import { CaseConversationSlideView } from './CaseConversationSlideView';

type CaseConversationRouteEntryProps = {
  caseClientId: CaseId;
};

export function CaseConversationRouteEntry({
  caseClientId,
}: CaseConversationRouteEntryProps): React.JSX.Element {
  return (
    <CaseConversationProvider caseClientId={caseClientId}>
      <CaseConversationSlideView />
    </CaseConversationProvider>
  );
}

// After:
import type { CaseId } from '@beyo/lib';

import { CaseConversationProvider } from '../providers/CaseConversationProvider';
import { CaseConversationSlideView } from './CaseConversationSlideView';
import type { CaseConversationSurfaceOpeners } from '../surface-ids';

type CaseConversationRouteEntryProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};

export function CaseConversationRouteEntry({
  caseClientId,
  surfaceOpeners,
}: CaseConversationRouteEntryProps): React.JSX.Element {
  return (
    <CaseConversationProvider caseClientId={caseClientId} surfaceOpeners={surfaceOpeners}>
      <CaseConversationSlideView />
    </CaseConversationProvider>
  );
}
```

---

**Step 3 — Update `packages/cases/src/providers/CaseConversationProvider.tsx`**

Add `surfaceOpeners?` to `CaseConversationProviderProps` and pass to the controller options.

```tsx
// Change 1: add import for CaseConversationSurfaceOpeners
import type { CaseConversationSurfaceOpeners } from '../surface-ids';

// Change 2: update CaseConversationProviderProps
type CaseConversationProviderProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  children: ReactNode;
};

// Change 3: destructure surfaceOpeners and pass to controller
export function CaseConversationProvider({
  caseClientId,
  surfaceOpeners,
  children,
}: CaseConversationProviderProps): React.JSX.Element {
  const scrollToBottomRef = useRef<() => void>(() => undefined);
  const controller = useCaseConversationController(caseClientId, {
    scrollToBottom: () => {
      scrollToBottomRef.current();
    },
    surfaceOpeners,
  });
  // rest of the component is unchanged
```

**Full resulting file** (write exactly this):

```tsx
import { createContext, useContext, useRef, type ReactNode } from 'react';

import type { CaseId } from '@beyo/lib';

import {
  useCaseConversationController,
  type CaseConversationController,
} from '../controllers/use-case-conversation.controller';
import {
  useCaseConversationMessagesController,
  type CaseConversationMessagesController,
} from '../controllers/use-case-conversation-messages.controller';
import type { CaseConversationSurfaceOpeners } from '../surface-ids';

const CaseConversationContext = createContext<CaseConversationController | null>(null);
const CaseConversationMessagesContext = createContext<CaseConversationMessagesController | null>(null);

type CaseConversationProviderProps = {
  caseClientId: CaseId;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
  children: ReactNode;
};

export function CaseConversationProvider({
  caseClientId,
  surfaceOpeners,
  children,
}: CaseConversationProviderProps): React.JSX.Element {
  const scrollToBottomRef = useRef<() => void>(() => undefined);
  const controller = useCaseConversationController(caseClientId, {
    scrollToBottom: () => {
      scrollToBottomRef.current();
    },
    surfaceOpeners,
  });
  const messagesController = useCaseConversationMessagesController({
    caseClientId,
    lastReadMessageSeq: controller.lastReadMessageSeq,
    requestMarkRead: controller.requestMarkRead,
  });
  scrollToBottomRef.current = messagesController.scrollToBottom;

  return (
    <CaseConversationContext.Provider value={controller}>
      <CaseConversationMessagesContext.Provider value={messagesController}>
        {children}
      </CaseConversationMessagesContext.Provider>
    </CaseConversationContext.Provider>
  );
}

export function useCaseConversationContext(): CaseConversationController {
  const context = useContext(CaseConversationContext);

  if (context === null) {
    throw new Error('useCaseConversationContext must be used inside CaseConversationProvider');
  }

  return context;
}

export function useCaseConversationMessagesContext(): CaseConversationMessagesController {
  const context = useContext(CaseConversationMessagesContext);

  if (context === null) {
    throw new Error(
      'useCaseConversationMessagesContext must be used inside CaseConversationProvider',
    );
  }

  return context;
}
```

---

**Step 4 — Update `packages/cases/src/controllers/use-case-conversation.controller.ts`**

Two targeted changes:

**Change A — add `surfaceOpeners?` to `UseCaseConversationControllerOptions`**

```ts
// Before:
type UseCaseConversationControllerOptions = {
  scrollToBottom?: () => void;
};

// After:
type UseCaseConversationControllerOptions = {
  scrollToBottom?: () => void;
  surfaceOpeners?: CaseConversationSurfaceOpeners;
};
```

Add import for `CaseConversationSurfaceOpeners`. It is already available in `../surface-ids` (imported indirectly via the surface ID constants). Add a direct type import at the top with the other `surface-ids` imports:

```ts
// Before (existing import block):
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from "../surface-ids";

// After:
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,
} from "../surface-ids";
import type { CaseConversationSurfaceOpeners } from "../surface-ids";
```

**Change B — pass `renderTaskCard` in `openInfo()`**

Locate the `openInfo` function inside the returned object of `useCaseConversationController` (currently around line 723):

```ts
// Before:
openInfo: () => {
  if (!taskClientId || !isTaskContextAvailable) {
    return;
  }

  surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, {
    caseClientId,
    taskId: taskClientId,
  });
},

// After:
openInfo: () => {
  if (!taskClientId || !isTaskContextAvailable) {
    return;
  }

  surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, {
    caseClientId,
    taskId: taskClientId,
    renderTaskCard: options.surfaceOpeners?.renderLinkedTaskCard,
  });
},
```

No other changes to this file.

---

### Phase 2 — Export from the cases package public API

**Step 5 — Add `CaseConversationSurfaceOpeners` export to `packages/cases/src/index.ts`**

In the existing surface-ids export block (lines 26–41), add `CaseConversationSurfaceOpeners` to the type exports:

```ts
// Before:
export type {
  CaseCreationSurfaceOpeners,
  CaseConversationSurfaceProps,
  CaseCreationSlideSurfaceProps,
  CaseTypePickerSheetSurfaceProps,
  ParticipantPickerSlideSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
} from "./surface-ids";

// After:
export type {
  CaseConversationSurfaceOpeners,
  CaseCreationSurfaceOpeners,
  CaseConversationSurfaceProps,
  CaseCreationSlideSurfaceProps,
  CaseTypePickerSheetSurfaceProps,
  ParticipantPickerSlideSurfaceProps,
  CaseTaskInfoSheetSurfaceProps,
  CaseMessageActionsSheetSurfaceProps,
} from "./surface-ids";
```

---

### Phase 3 — Validation

**Step 6 — Typecheck `@beyo/cases`**

```bash
cd packages/cases
npx tsc --noEmit
```

Expected: zero errors. Confirm the five changed files all resolve their new imports.

**Step 7 — Typecheck the workers app (regression check)**

```bash
cd apps/workers-app/ManagerBeyo-app-workers
npm run typecheck
```

Expected: zero errors. No source changes were made to the workers app — this is a pure regression check. The new optional fields on `CaseConversationSurfaceProps` and `CaseTaskInfoSheetSurfaceProps` are backward compatible.

---

## Import change reference table

### `packages/cases/src/surface-ids.ts`

| Change | Detail |
|---|---|
| Add import | `import type { ReactNode } from "react"` |
| New type | `CaseConversationSurfaceOpeners` |
| Updated type | `CaseConversationSurfaceProps` — added `surfaceOpeners?: CaseConversationSurfaceOpeners` |
| Updated type | `CaseTaskInfoSheetSurfaceProps` — added `renderTaskCard?: (taskId: string) => ReactNode` |

### `packages/cases/src/components/CaseConversationRouteEntry.tsx`

| Change | Detail |
|---|---|
| Add import | `import type { CaseConversationSurfaceOpeners } from '../surface-ids'` |
| Updated props | `CaseConversationRouteEntryProps` — added `surfaceOpeners?: CaseConversationSurfaceOpeners` |
| Updated render | `<CaseConversationProvider ... surfaceOpeners={surfaceOpeners}>` |

### `packages/cases/src/providers/CaseConversationProvider.tsx`

| Change | Detail |
|---|---|
| Add import | `import type { CaseConversationSurfaceOpeners } from '../surface-ids'` |
| Updated props | `CaseConversationProviderProps` — added `surfaceOpeners?: CaseConversationSurfaceOpeners` |
| Updated controller call | `useCaseConversationController(caseClientId, { scrollToBottom: ..., surfaceOpeners })` |

### `packages/cases/src/controllers/use-case-conversation.controller.ts`

| Change | Detail |
|---|---|
| Add import | `import type { CaseConversationSurfaceOpeners } from "../surface-ids"` |
| Updated options type | `UseCaseConversationControllerOptions` — added `surfaceOpeners?: CaseConversationSurfaceOpeners` |
| Updated `openInfo()` | `surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, { ..., renderTaskCard: options.surfaceOpeners?.renderLinkedTaskCard })` |

### `packages/cases/src/index.ts`

| Change | Detail |
|---|---|
| Add type export | `CaseConversationSurfaceOpeners` added to the surface-ids type export block |

---

## Impact on Plan 37

After Plan 38 is complete, **update Plan 37** before executing it. The following additions are needed in the managers app:

### Addition A — Wire `renderLinkedTaskCard` in `CaseConversationSlidePage.tsx`

After Plan 37 migrates `CaseConversationSlidePage.tsx` to use `CaseConversationRouteEntry` from `@beyo/cases`, the page must also read `surfaceOpeners` from surface props and forward it:

```tsx
// CaseConversationSlidePage.tsx — after Plan 37 migration
import { CaseConversationRouteEntry } from '@beyo/cases';
import type { CaseConversationSurfaceProps } from '@beyo/cases';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useParams } from 'react-router-dom';

export function CaseConversationSlidePage(): React.JSX.Element {
  const params = useParams<{ caseId: string }>();
  const surfaceProps = useSurfaceProps<CaseConversationSurfaceProps>();
  const caseClientId = (params.caseId ?? surfaceProps.caseClientId) as
    | CaseConversationSurfaceProps['caseClientId']
    | undefined;

  if (!caseClientId) {
    return <div className="bg-background p-6 text-sm text-muted-foreground">Case id is missing.</div>;
  }

  return (
    <CaseConversationRouteEntry
      caseClientId={caseClientId}
      surfaceOpeners={surfaceProps.surfaceOpeners}   // ← add this line
    />
  );
}
```

### Addition B — Update `CaseTaskInfoSheetPage.tsx` to call the render slot

The page currently renders `CaseTaskInfoSheetContent` directly. After Plan 37, it reads `renderTaskCard` from surface props and calls it. `CaseTaskInfoSheetContent` moves to `src/components/cases/` (Plan 37 steps 12-13) and is the component that `renderLinkedTaskCard` renders:

```tsx
// CaseTaskInfoSheetPage.tsx — after Plan 37 migration
import type { CaseTaskInfoSheetSurfaceProps } from '@beyo/cases';
import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useEffect } from 'react';

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, renderTaskCard } = useSurfaceProps<CaseTaskInfoSheetSurfaceProps>();

  useEffect(() => {
    header?.setTitle('Task info');
    header?.setActions(null);
  }, [header]);

  if (!taskId) {
    return (
      <div className="bg-background p-4 text-sm text-muted-foreground" data-testid="case-task-info-sheet">
        Task id is missing.
      </div>
    );
  }

  return (
    <div className="bg-background" data-testid="case-task-info-sheet">
      {renderTaskCard ? renderTaskCard(taskId) : null}
    </div>
  );
}
```

### Addition C — Caller of `surface.open(CASE_CONVERSATION_SURFACE_ID, ...)` must pass `surfaceOpeners`

Wherever the managers app opens the conversation slide (typically in `features/cases/controllers/` or a view controller), include `surfaceOpeners`:

```ts
surface.open(CASE_CONVERSATION_SURFACE_ID, {
  caseClientId,
  surfaceOpeners: {
    renderLinkedTaskCard: (taskId: string) => (
      <CaseTaskInfoSheetContent taskId={taskId} />
      // CaseTaskInfoSheetContent is the app-local component from src/components/cases/
      // It handles useGetTaskQuery and renders CaseTaskInfoCard internally
    ),
  },
});
```

`CaseTaskInfoSheetContent` (preserved in `src/components/cases/` by Plan 37 steps 12-13) must be made self-contained: it should call `useGetTaskQuery(taskId)` internally rather than receiving `taskDetail` as a prop from the parent page. This is a small refactor — move the `taskQuery` fetch from `CaseTaskInfoSheetPage` into `CaseTaskInfoSheetContent`.

### Steps 12-13 of Plan 37 remain correct

`CaseTaskInfoCard` and `CaseTaskInfoSheetContent` stay as app-local components in `src/components/cases/`. No changes to Plan 37 steps 12-13 are needed.

---

## Risks and mitigations

- **Risk:** The workers app has cases with task links. If a worker opens a conversation and taps "Info", `openInfo()` fires with `renderTaskCard: undefined`. The `CASE_TASK_INFO_SHEET_SURFACE_ID` is not registered in the workers app surface registry, so `surface.open` silently no-ops. This is **identical to current behaviour** (the workers app already had this gap).
  **Mitigation:** No regression. The workers app can register `CASE_TASK_INFO_SHEET_SURFACE_ID` independently if it ever needs task info — it would then provide its own `renderLinkedTaskCard` via surfaceOpeners.

- **Risk:** `CaseTaskInfoSheetPage.tsx` (managers app) renders `{renderTaskCard ? renderTaskCard(taskId) : null}`. If the caller of `surface.open(CASE_CONVERSATION_SURFACE_ID, ...)` forgets to provide `surfaceOpeners`, the sheet renders blank.
  **Mitigation:** The blank render is a visible failure during development. Plan 37 addition C above documents the required wiring.

- **Risk:** `renderLinkedTaskCard` is a React render function stored in surface props (a plain JS object). Surfaces pass props through the surface registry mechanism. If the surface system serialises or deep-clones props (e.g., for persistence or devtools), function props will be lost.
  **Mitigation:** Review the `useSurface().open` implementation to confirm it passes props by reference. If serialisation occurs, the render slot approach cannot be used and the plan must be revised.

---

## Validation plan

- `npx tsc --noEmit` in `packages/cases/`: zero errors
- `npm run typecheck` in `apps/workers-app/ManagerBeyo-app-workers`: zero errors (regression)

---

## Review log

*(to be filled by reviewer)*

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user (David)`
