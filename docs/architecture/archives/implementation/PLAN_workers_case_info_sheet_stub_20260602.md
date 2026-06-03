# PLAN_workers_case_info_sheet_stub_20260602

## Metadata

- Plan ID: `PLAN_workers_case_info_sheet_stub_20260602`
- Status: `archived`
- Owner agent: `github-copilot`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T07:35:53Z`
- Related issue/ticket: `-`
- Intention plan: `-`

## Goal and intent

- Goal: In the workers app, register the `CASE_TASK_INFO_SHEET_SURFACE_ID` surface and render a "Coming soon" placeholder page when the info button in the case conversation header is tapped.
- Business/user intent: The info button is already enabled when a case has a linked task. Without a registered surface the tap silently does nothing. The placeholder unblocks UX validation while the proper task-fetch API is built.
- Non-goals: Fetching real task data. Rendering a task card. Any change to the manager app.

## Scope

- In scope:
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts` — import and register `CASE_TASK_INFO_SHEET_SURFACE_ID`
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseTaskInfoSheetPage.tsx` — new page, "coming soon" UI only
- Out of scope:
  - `@beyo/cases` package changes
  - `@beyo/tasks` package changes
  - Manager app changes
  - Workers `CasesPage` / `CaseConversationSlidePage` wiring (not needed — the sheet page ignores `renderTaskCard` entirely)
- Assumptions:
  - `CASE_TASK_INFO_SHEET_SURFACE_ID` is already exported from `@beyo/cases` — confirmed in `packages/cases/src/surface-ids.ts`
  - `CaseTaskInfoSheetSurfaceProps` is already exported from `@beyo/cases` — confirmed, `renderTaskCard` is optional so omitting it is safe
  - The info button already exists in `CaseConversationHeader` and calls `controller.openInfo()`, which calls `surface.open(CASE_TASK_INFO_SHEET_SURFACE_ID, ...)` — the surface just wasn't registered, causing a silent no-op

## Clarifications required

_(none — scope is fully bounded)_

## Acceptance criteria

1. Tapping the info button in the workers case conversation header opens a bottom sheet.
2. The sheet header reads "Task info".
3. The sheet body shows a "Coming soon" placeholder message.
4. No TypeScript errors introduced.

## Contracts and skills

### Contracts loaded

_(none required — this is a stub page with no data fetching)_

### File read intent — pattern vs. relational

Permitted reads for Copilot during implementation:
- `apps/workers-app/.../src/features/cases/surfaces.ts` — to insert the new registration
- `apps/workers-app/.../src/pages/cases/CaseMessageActionsSheetPage.tsx` — reference for import shape (`useSurfaceHeader` from `@beyo/hooks`)

### Skill selection

- Primary skill: none — this is a stub with no controller, no query, no action

## Implementation plan

### Step 1 — Register the surface in workers `caseSurfaces`

File: `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts`

Add `CASE_TASK_INFO_SHEET_SURFACE_ID` to the existing `@beyo/cases` named import:

```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  PARTICIPANT_PICKER_SLIDE_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  CASE_FILTER_SHEET_SURFACE_ID,
  CASE_TASK_INFO_SHEET_SURFACE_ID,   // ← add
  type CaseConversationSurfaceProps,
} from "@beyo/cases";
```

Add the lazy loader function (after the other loaders):

```ts
function loadCaseTaskInfoSheetPage() {
  return import("@/pages/cases/CaseTaskInfoSheetPage").then((module) => ({
    default: module.CaseTaskInfoSheetPage,
  }));
}
```

Add the lazy component (after the other lazy components):

```ts
const caseTaskInfoSheet = lazyWithPreload(loadCaseTaskInfoSheetPage);
```

Add the registration entry to `caseSurfaces`:

```ts
[CASE_TASK_INFO_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: caseTaskInfoSheet.Component,
},
```

### Step 2 — Create the stub page

File: `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseTaskInfoSheetPage.tsx`

```tsx
import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

export function CaseTaskInfoSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Task info");
    header?.setActions(null);
  }, [header]);

  return (
    <div
      className="flex flex-col items-center gap-3 px-6 py-10 text-center"
      data-testid="case-task-info-sheet"
    >
      <p className="text-sm font-medium text-foreground">Coming soon</p>
      <p className="text-xs text-muted-foreground">
        Task details will be available here once the feature is ready.
      </p>
    </div>
  );
}
```

## Risks and mitigations

- Risk: `CASE_TASK_INFO_SHEET_SURFACE_ID` not exported from `@beyo/cases` index.
  Mitigation: Confirmed in `packages/cases/src/index.ts` — it is exported. TypeScript will error on import if it ever changes.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open a case conversation that has a linked task in the workers app, tap the info button, verify the sheet opens with "Task info" header and "Coming soon" body.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `github-copilot`
