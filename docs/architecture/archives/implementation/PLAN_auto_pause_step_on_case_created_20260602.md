# PLAN_auto_pause_step_on_case_created_20260602

## Metadata

- Plan ID: `PLAN_auto_pause_step_on_case_created_20260602`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-02T00:00:00Z`
- Last updated at (UTC): `2026-06-02T13:16:42Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: When a worker creates a case for a task step that is currently in `"working"` state, automatically transition that step to `"paused"` with reason `"pause_case_created"` and the initial message plain text as the description.
- Business/user intent: A worker who opens a case is blocking on something — pausing the step reflects that reality without requiring a separate manual action.
- Non-goals: Pausing from any other case creation context (manager app, cases list unrelated to a step). Prompting the worker for a pause reason when the pause is triggered by case creation.

## Scope

- In scope:
  - Add `"pause_case_created"` to `StepTransitionReasonSchema` (frontend enum)
  - Extend `CaseCreationSlideSurfaceProps` with `onCaseCreated?: (plainText: string | undefined) => void`
  - Thread `onCaseCreated` from surface props → `CaseCreationFormProvider` props → context → `CaseCreationFormContent` call site
  - Wire the auto-pause in `use-task-step-detail.controller.ts` `handleOpenCasesForTask`, guarded by `step?.state === "working"`
- Out of scope:
  - Backend enum validation change — must be coordinated separately (see Risks)
  - Pausing from the workers home list (only task step detail surface)
  - Any UI for the auto-pause (no confirmation sheet, no toast beyond what `useTransitionStepState` already shows on error)
- Assumptions:
  - The backend already accepts an unknown `reason` value gracefully, OR the backend enum will be updated in parallel before this ships
  - `composerPlainText` in `CaseCreationFormContext` always reflects the current editor state at submit time (confirmed: `setComposerContent` sets both content and plainText together)

## Clarifications required

- [x] Should the auto-pause skip the pause-reason sheet? **Yes — system-triggered pause, call `transitionStepState` directly**
- [x] Which step state guard? **`"working"` only — other states are no-ops**
- [x] Pause reason enum value? **`"pause_case_created"`**
- [x] What to pass as `description`? **The initial message plain text; `undefined` when no message was written**

## Acceptance criteria

1. Creating a case from the task step detail surface (workers app), when the step is `"working"`, transitions the step to `"paused"` with `reason: "pause_case_created"` and `description` equal to the message plain text (or omitted when no message).
2. Creating a case when the step is already `"paused"`, `"pending"`, or any other non-`"working"` state does NOT trigger a transition.
3. The `@beyo/cases` package has no direct import of any step-transition code — the callback is injected entirely by the app controller.
4. Both apps pass `npm run typecheck` with zero errors after the change.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: package boundary rules — §13 surface openers injection pattern

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Permitted reads already done:
- `packages/cases/src/surface-ids.ts` — exact shape of `CaseCreationSlideSurfaceProps` and `CaseCreationSurfaceOpeners`
- `packages/cases/src/providers/CaseCreationFormProvider.tsx` — context shape, `composerPlainText` is already in context
- `packages/cases/src/components/CaseCreationFormContent.tsx` — `handleSubmit` call site, `toBackendPlainText` usage, `composerPlainText` access pattern
- `packages/cases/src/components/CaseCreationRouteEntry.tsx` — how surface props are read and forwarded to the provider
- `apps/workers-app/.../controllers/use-task-step-detail.controller.ts` — `handleOpenCasesForTask` assembly, `transitionStepState` already in scope
- `apps/workers-app/.../actions/use-transition-step-state.ts` — `TransitionInput` shape, `working_section_id` required
- `apps/workers-app/.../types.ts` — `StepTransitionReasonSchema` values, `TransitionStepStateInput.reason` is optional

## Implementation plan

### Step 1 — Add `"pause_case_created"` to `StepTransitionReasonSchema`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`

Add `"pause_case_created"` to `StepTransitionReasonSchema`:

```ts
export const StepTransitionReasonSchema = z.enum([
  "waiting_for_upholstery",
  "pause_lunch_break",
  "pause_coffee_break",
  "pause_ended_shift",
  "pause_meeting",
  "pause_other_task_priority",
  "pause_case_created",   // ← add
]);
```

---

### Step 2 — Extend `CaseCreationSlideSurfaceProps`

**File:** `packages/cases/src/surface-ids.ts`

Add the optional callback to the existing type:

```ts
export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  entityClientId?: string;
  title?: string;
  surfaceOpeners: CaseCreationSurfaceOpeners;
  onCaseCreated?: (plainText: string | undefined) => void;  // ← add
};
```

No new exports needed — `CaseCreationSlideSurfaceProps` is already exported from `packages/cases/src/index.ts`.

---

### Step 3 — Thread `onCaseCreated` through `CaseCreationFormProvider`

**File:** `packages/cases/src/providers/CaseCreationFormProvider.tsx`

**3a.** Add `onCaseCreated` to the context value type:

```ts
type CaseCreationFormContextValue = {
  // ...existing fields...
  onCaseCreated: ((plainText: string | undefined) => void) | undefined;
};
```

**3b.** Add it as an optional prop on the provider component:

```ts
export function CaseCreationFormProvider({
  children,
  entityTypes,
  entityClientId,
  surfaceOpeners,
  onCaseCreated,
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  entityClientId?: string;
  surfaceOpeners?: CaseCreationSurfaceOpeners;
  onCaseCreated?: (plainText: string | undefined) => void;
}): React.JSX.Element {
```

**3c.** Include it in the context value object (no state needed — it's a stable callback ref):

```ts
value={{
  // ...existing fields...
  onCaseCreated,
}}
```

---

### Step 4 — Forward `onCaseCreated` from surface props in `CaseCreationRouteEntry`

**File:** `packages/cases/src/components/CaseCreationRouteEntry.tsx`

Read `onCaseCreated` from surface props and pass it to the provider:

```tsx
const { entityTypes, entityClientId, title, surfaceOpeners, onCaseCreated } =
  useSurfaceProps<CaseCreationSlideSurfaceProps>();

return (
  <CaseCreationFormProvider
    entityTypes={entityTypes}
    entityClientId={entityClientId}
    surfaceOpeners={surfaceOpeners}
    onCaseCreated={onCaseCreated}
  >
    <CaseCreationFormContent />
  </CaseCreationFormProvider>
);
```

---

### Step 5 — Call `onCaseCreated` in `CaseCreationFormContent` after success

**File:** `packages/cases/src/components/CaseCreationFormContent.tsx`

**5a.** Destructure `onCaseCreated` from context:

```ts
const {
  // ...existing destructures...
  onCaseCreated,
} = useCaseCreationFormContext();
```

**5b.** In `handleSubmit`, after `await createCaseAsync(...)` resolves and before the form reset, call the callback:

```ts
await createCaseAsync({ ... });

onCaseCreated?.(hasInitialMessage ? toBackendPlainText(trimmedContent) : undefined);

form.reset();
// ...rest of reset logic
```

The plain text is already computed at this point in the function body (`trimmedContent` and `hasInitialMessage` are both in scope).

---

### Step 6 — Inject the auto-pause callback in the app controller

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

`transitionStepState` is already in scope via `useTransitionStepState()`. The `resolvedStepId`, `resolvedTaskId`, and `resolvedWorkingSectionId` are already resolved at the top of the controller.

In `handleOpenCasesForTask`, add `onCaseCreated` to the surface props when opening `CASE_CREATION_SLIDE_SURFACE_ID`:

```ts
openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
  entityTypes: ["task"],
  entityClientId: resolvedTaskId,
  title: vm?.articleLabel,
  surfaceOpeners,
  onCaseCreated: (plainText) => {
    if (step?.state !== "working") return;
    transitionStepState({
      task_id: resolvedTaskId,
      step_id: resolvedStepId,
      new_state: "paused",
      working_section_id: resolvedWorkingSectionId,
      reason: "pause_case_created",
      ...(plainText ? { description: plainText } : {}),
    });
  },
});
```

`step` is already in scope as `useMemo(...)` derived from the query. The guard `step?.state !== "working"` prevents a transition when the step is already paused, pending, etc.

Note: `handleOpenCasesForTask` is a `useCallback` — add `step` to its dependency array since it is now read inside the callback:

```ts
}, [liveCasesSummary, openSurface, resolvedTaskId, vm, step, transitionStepState,
    resolvedStepId, resolvedWorkingSectionId]);
```

---

## Risks and mitigations

- Risk: Backend rejects `"pause_case_created"` as an unknown `reason` enum value.
  Mitigation: Coordinate backend enum addition before shipping. As a temporary measure, the `reason` field can be omitted until the backend is updated — the pause still fires, just without the semantic label.

- Risk: `step` captured in the `onCaseCreated` closure is stale (from render when the surface was opened, not at time of case submission).
  Mitigation: Acceptable — the step state at the time the user pressed "Open case" is the relevant guard. If the step transitioned after the surface opened (unlikely), the worst case is a no-op (step already paused) or a slightly stale pause attempt that `transitionStepState` will handle via optimistic update and server rollback.

- Risk: `handleOpenCasesForTask` dependency array grows from adding `step`, `transitionStepState`, `resolvedStepId`, `resolvedWorkingSectionId`.
  Mitigation: All four are already stable within the controller's render cycle — `step` is a `useMemo` result derived from the query, the resolved IDs are constants within the surface's lifetime.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in both `apps/managers-app` and `apps/workers-app`
- Manual: Open a task step in `"working"` state → tap the case button → create a case with a message → confirm step transitions to `"paused"` and the last active step card updates
- Manual: Open a task step in `"paused"` state → create a case → confirm no additional transition fires
- Manual: Open a task step in `"working"` state → create a case with **no** message → confirm step pauses (description omitted from transition payload)

## Review log

- `2026-06-02` David: approved approach — `onCaseCreated` callback, `"pause_case_created"` reason, plain text as description

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `GitHub Copilot`
