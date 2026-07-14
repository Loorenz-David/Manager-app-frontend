# PLAN_task_working_sections_reassign_note_staged_form_20260714

## Metadata

- Plan ID: `PLAN_task_working_sections_reassign_note_staged_form_20260714`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-14T00:00:00Z`
- Last updated at (UTC): `2026-07-14T06:49:59Z`
- Related issue/ticket: `n/a`
- Intention plan: `—` (implementation-only plan)

## Goal and intent

- Goal: Convert `TaskWorkingSectionsReassignSlidePage` from a single-screen working-section picker into a two-step `StagedForm`. Step 1 keeps today's working-section reassignment UI unchanged. Step 2 adds task-note authoring (text + images) reusing `TaskNoteComposer` / `TaskNoteImagesSection` exactly as `InternalFormContent` wires them. Saving fires the task-step mutation(s) and the task-note-creation mutation in parallel, closes the slide optimistically (before the network settles), and reopens the slide with full recovered state (sections **and** note) on failure.
- Business/user intent: Let a user reassign a task's working sections and leave a note about the reassignment in one flow, without a second trip into the notes sheet. The save must feel instant — the slide closes immediately and the user lands back where they came from, matching the optimistic-close pattern this page already uses for section changes.
- Non-goals:
  - No change to `TaskWorkingSectionsSlidePage` (the other consumer of the shared working-sections state) beyond what falls out of extending shared types with new optional fields.
  - No change to worker reassignment (`pendingReassignments`) — it is already dead/unused in `handleSaveAndClose` today (see Risks) and stays out of scope.
  - No change to the task-note creation API, task-step API, or backend contracts.
  - No new task-note editing/deleting capability on this page — creation only.

## Scope

- In scope:
  - `frontend/packages/task-working-sections/src/pages/TaskWorkingSectionsReassignSlidePage.tsx` — rebuild as a `StagedForm` host with two steps.
  - `frontend/packages/task-working-sections/src/controllers/use-task-working-sections.controller.ts` — extend with optional note-draft state, note client id, and a save path that runs the section-step save and the note-create call in parallel.
  - `frontend/packages/task-working-sections/src/surface-ids.ts` — extend `TaskWorkingSectionsSurfaceProps` and `TaskWorkingSectionsReassignSlideSurfaceProps` with recovered-note fields.
  - `frontend/packages/task-working-sections/package.json` — add `@beyo/task-notes`, `@beyo/images`, `@beyo/auth` as peer dependencies (already present in the consuming app, `workers-app`, so no app-level change needed).
  - A small new step-2 component (note authoring section) inside `task-working-sections/src/components/`, composed from `@beyo/task-notes` primitives — mirrors the "task" step block in `InternalFormContent.tsx`.
  - `frontend/packages/task-working-sections/src/index.ts` — no new export names expected (extended types re-use existing export statements), but verify after implementation.
- Out of scope:
  - `TaskWorkingSectionsSlidePage.tsx` internals (its "Live Flow" / "Stats" steps stay untouched).
  - `TaskStepActionsSheetPage.tsx` (workers-app) — it already passes `taskId` and `surfaceOpeners`; no new props are required from the caller.
  - Backend `/api/v1/tasks/{taskId}/notes` and task-step endpoints.
- Assumptions:
  - Extending the shared `useTaskWorkingSectionsController` with note capabilities is acceptable even though `TaskWorkingSectionsSlidePage` also consumes it, because that page never sets note state (stays `null`), so `hasUnsavedChanges` and `handleSaveAndClose` behavior there is unchanged. This is flagged below as a clarification, since the alternative (a second, page-specific controller) is also defensible — see Clarifications.
  - The note step, on this page, does not require React Hook Form. `InternalFormContent` uses RHF because its whole multi-field form is RHF-driven; this page's step 1 is controller-driven (no RHF today), so the note draft is plain component/controller state (`useState<TaskNoteComposerValue | null>`), matching how `TaskNoteComposer`'s `onChange` prop is a plain callback with no RHF dependency.
  - `currentUserClientId` for `users_read_list` on the note payload is sourced the same way `TaskCreationFormProvider` does: `useAuthStore(selectUser)` from `@beyo/auth`.

## Clarifications required

Both open questions were resolved with the user before implementation (see Review log):

- Note-taking state lives inside the shared `useTaskWorkingSectionsController` (in-place extension), not a new page-specific controller. `TaskWorkingSectionsSlidePage` is unaffected since it never sets note state (stays `null`).
- Partial failure of the parallel save (task-step succeeds/note fails or vice versa) reopens the slide with **both** the section changes and the note draft restored — matches today's "any failure reopens everything" behavior for section-only saves. The pre-existing double-submission risk this implies (see Risks) is accepted, not solved, by this plan.

## Acceptance criteria

1. Opening `TaskWorkingSectionsReassignSlidePage` shows a 2-step `StagedForm`: step 1 (`sections`) renders the existing `TaskWorkingSectionsStepList` + shortcut bar exactly as today; step 2 (`note`) renders `TaskNoteComposer` + `TaskNoteImagesSection` inside an `EntityImagesProvider` keyed by a generated note `client_id`.
2. Navigating between steps preserves both the section selection and the note draft (text + captured images) — nothing resets on back/forward navigation.
3. Tapping "Save" on step 2 fires the task-step save (add/remove, as today) and — only if the note has meaningful content (`hasMeaningfulNoteContent`) — the `createTaskNote` call, concurrently via `Promise.all`, not sequentially.
4. The slide closes immediately when Save is tapped (before either network call resolves), returning the user to the screen that opened it — matching the existing optimistic-close behavior for section-only saves.
5. On mutation failure (either task-step or note, per the resolved Clarification), the slide reopens via `surfaceOpeners.reopenSlideAfterError` with the pending section changes and the note draft (text + note `client_id`, so previously-captured images still resolve) intact, so the user can retry without re-entering data.
6. Closing the slide without saving when either section changes or a non-empty note draft exists triggers the existing discard-changes sheet (`TaskWorkingSectionsDiscardChangesSheetPage`); "Save & Close" from that sheet performs the same parallel save as the primary Save button.
7. `TaskWorkingSectionsSlidePage` (the sibling surface sharing the controller) is behaviorally unchanged — no note UI, no new required props, existing tests/flows pass.
8. Camera-captured note images use the polymorphic entity-link pattern (`entity_type: "note"`, `entity_client_id: <generated note client_id>`) exactly as `InternalFormContent` does, so images created before the note exists are correctly linked once `createTaskNote` persists a note with the same `client_id`.
9. `npm run typecheck` passes with zero errors in `task-working-sections` and any consuming app (`workers-app`).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: baseline app/package structure rules.
- `architecture/02_types.md`: type conventions for extending `surface-ids.ts` props.
- `architecture/04_api_client.md` (+ `_local.md`): confirms the existing `createTaskNote` / `addTaskStep` API call shape needs no changes.
- `architecture/05_server_state.md`: TanStack Query mutation conventions backing `useCreateTaskNote`, `useAddTaskStep`, `useRemoveTaskStep` (all pre-existing, reused as-is).
- `architecture/06_client_state.md`: where the note-draft local state belongs (controller-owned client state, not a store).
- `architecture/08_hooks.md`: controller/action taxonomy; **"Mutation failure recovery — Case 2: Optimistic page navigation (create → navigate → fail → back)"** is the exact pattern already implemented in `handleSaveAndClose` (close first, mutate after, reopen with recovered state on error) — this plan extends that same case to two parallel mutations instead of one sequential block.
- `architecture/13_errors.md`: error handling/reporting on mutation failure.
- `architecture/15_feature_structure.md`: file placement (`controllers/`, `components/`, `pages/`, `surface-ids.ts`).

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: **StagedForm hoisting rule** — "Any form that uses `StagedForm` must hoist `usePreloadSurface` for all calendar, picker, and sheet surfaces that appear on any step" and "`StagedForm` only renders the active step's children — non-active steps are unmounted." This directly affects the note step: the note draft (plain text/content) must be lifted to state that lives above `StagedFormStep` (controller- or page-level), not local to the step's component, or it will be lost when the user navigates back to step 1. Captured images do **not** need lifting — they are persisted via the entity-images query cache keyed by `entityClientId`, which survives step unmount/remount (confirmed by reading `EntityImagesProvider`/`useEntityImagesController`, which query rather than hold local-only state).
- `architecture/28_surfaces_local.md`: confirms `slide` is a valid surface type for this page (already true — no change).

### File read intent — pattern vs. relational

All implementation-file reads performed for this plan were relational ("what does this existing code do / return / export"), not pattern reads:
- `TaskWorkingSectionsReassignSlidePage.tsx`, `TaskWorkingSectionsSlidePage.tsx`, `TaskWorkingSectionsProvider.tsx`, `use-task-working-sections.controller.ts`, `surface-ids.ts` — establishes current behavior being modified, and confirms the controller/provider is shared between two pages.
- `InternalFormContent.tsx`, `TaskCreationFormProvider.tsx`, `normalize-task-form-payload.ts` — the user explicitly named this as the reference implementation for the note-composer + polymorphic image pattern; read to extract the exact wiring (`EntityImagesProvider entityType="note" entityClientId={noteClientId}`, `generateClientId("TaskNote")`, `hasMeaningfulNoteContent`/`toTaskNoteContentBlocks` usage, `currentUserClientId` sourcing).
- `create-task-note.ts`, `use-create-task-note.ts`, `task-notes/types.ts`, `task-note-serialization.ts`, `task-notes/index.ts` — establishes the exact `CreateTaskNoteInput` shape, the public API surface available for import, and that `note_type: "user_note"` / `users_read_list` are required fields.
- `use-add-task-step.ts`, `add-task-step.ts` — confirms `AddTaskStepVariables` shape and that this mutation has no optimistic cache write today (only `cancelQueries` on mutate), so no optimistic-cache-rollback logic is being removed or duplicated.
- `use-staged-form.ts`, `staged-form.types.ts` — confirms `StagedFormReturn` shape (`activeStepId`, `navigateTo`, `advance`, `stepStatusMap`, etc.) already used correctly by the existing `TaskWorkingSectionsSlidePage`, which is the in-repo reference for wiring `useStagedForm` + `StagedForm` in this same package.
- `EntityImagesProvider.tsx`, `images/types.ts` (`IMAGE_LINK_ENTITY_TYPE`) — confirms `"note"` is a valid `entity_type` and the provider's prop shape.
- `TaskNoteImagesSection.tsx`, `TaskNoteComposer.tsx` — confirms both are prop-driven, RHF-agnostic components safe to use outside a `FormProvider`.
- `TaskWorkingSectionsDiscardChangesSheetPage.tsx` — confirms the discard-sheet contract (`onDiscardAndClose`/`onSaveAndClose` callbacks) needs no change.
- `TaskStepActionsSheetPage.tsx` (workers-app) — confirms the surface is opened with only `taskId`, `hideShortcuts`, and `surfaceOpeners`; no caller-side change required.
- `task-working-sections/package.json`, `task-notes/index.ts` — confirms which packages must be added as peer dependencies and which names are already publicly exported (no new export needed from `@beyo/task-notes`).

No pattern reads (e.g. reading an unrelated feature's action hook to learn optimistic-update structure) were performed; `08_hooks.md` already covers that, and the one mutation-orchestration pattern needed (Case 2) is documented there directly.

### Skill selection

- Primary skill: none (implementation plan only; no dedicated skill matched task-note/staged-form composition work).
- Trigger terms: `staged form`, `optimistic`, `client_id`, `note images` → mapped to `08_hooks.md`, `24_dto.md`, `30_dynamic_loading_local.md` via the trigger expansion map.
- Excluded alternatives: `33_vaul_drawer.md` — this page is a `slide` surface, not a `drawer`; no gesture/snap-point work involved.

## Implementation plan

1. **`surface-ids.ts`** — extend types (no new exported names, so `index.ts` re-exports stay valid):
   - `TaskWorkingSectionsSurfaceProps` (the recovery-snapshot shape passed to `reopenSlideAfterError`): add `recoveredNoteClientId?: string` and `recoveredNoteContent?: TaskNoteComposerValue | null` (import `TaskNoteComposerValue` from `@beyo/task-notes`).
   - `TaskWorkingSectionsReassignSlideSurfaceProps`: add the same two optional fields, mirroring how `recoveredPendingAdds` etc. are already threaded through.

2. **`task-working-sections/package.json`** — add `@beyo/task-notes`, `@beyo/images`, `@beyo/auth` to `peerDependencies` (all three already exist in `workers-app`'s dependency tree; this only makes the package-level dependency explicit).

3. **`use-task-working-sections.controller.ts`** — extend `ControllerInit` and the controller:
   - Add `initialNoteClientId?: string` and `initialNoteContent?: TaskNoteComposerValue | null` to `ControllerInit`.
   - Add local state: `noteClientId` (via `useState(() => init.initialNoteClientId ?? generateClientId("TaskNote"))`) and `noteDraft` (via `useState<TaskNoteComposerValue | null>(() => init.initialNoteContent ?? null)`), plus a `handleNoteChange` setter.
   - Source `currentUserClientId` via `useAuthStore(selectUser)` from `@beyo/auth` (same as `TaskCreationFormProvider`).
   - Extend `hasUnsavedChanges` to `... || hasMeaningfulNoteContent(noteDraft)` (import from `@beyo/task-notes`).
   - Extend `buildRecoverySnapshot` to include `recoveredNoteClientId: noteClientId` and `recoveredNoteContent: noteDraft`.
   - Extract the existing task-step save body (the `removeTaskStep`/`addTaskStep` loop currently inside `handleSaveAndClose`'s `try` block) into a small internal async function, e.g. `persistPendingSectionChanges(recoverySnapshot)`, so it can be run as one arm of a `Promise.all`.
   - Add a `useCreateTaskNote()` instance; build the note payload with `hasMeaningfulNoteContent` + `toTaskNoteContentBlocks`, mirroring `buildNotePayload` in `task-creation/lib/normalize-task-form-payload.ts` (that helper is package-local/unexported, so re-implement the same four fields inline here — `client_id`, `note_type: "user_note"`, `content`, `plain_text`, `users_read_list`).
   - Rewrite `handleSaveAndClose` to: bail out early if nothing changed (existing behavior), else close the slide first (existing behavior), then `await Promise.all([persistPendingSectionChanges(recoverySnapshot), notePayload ? createTaskNote.mutateAsync({ taskId, notes: [notePayload] }) : Promise.resolve(null)])`, then on success reset `noteDraft` to `null` and regenerate `noteClientId` (mirroring `TaskCreationFormProvider.regenerateIds`) before calling `surfaceOpeners?.onSaveComplete`, and on any rejection call `surfaceOpeners?.reopenSlideAfterError(recoverySnapshot)` (recoverySnapshot now carries the note fields per step 1).
   - Return `noteClientId`, `noteDraft`, `handleNoteChange` from the controller.

4. **`TaskWorkingSectionsProvider.tsx`** — thread `initialNoteClientId`/`initialNoteContent` from new provider props into the controller call (mirrors existing `initialPendingAdds` wiring). The `TaskWorkingSectionsReassignSlidePage` passes `recoveredNoteClientId`/`recoveredNoteContent` from its surface props here; `TaskWorkingSectionsSlidePage` simply never passes them (defaults apply).

5. **New component** — `task-working-sections/src/components/TaskWorkingSectionsNoteStep.tsx` (or similar name), composed the same way as the `"task"` step block in `InternalFormContent.tsx`:
   ```tsx
   <EntityImagesProvider entityClientId={noteClientId} captureFlow="camera-to-editor" deleteMode="hard-delete" entityType="note">
     <ContentCard>
       <TaskNoteComposer onChange={onNoteChange} placeholder="Add a note…" testId="task-working-sections-reassign-note-composer" />
       <TaskNoteImagesSection testId="task-working-sections-reassign-note-images" />
     </ContentCard>
   </EntityImagesProvider>
   ```
   Add `data-testid` per `34_runtime_validation_local.md` convention on the wrapping element for Playwright targeting.

6. **`TaskWorkingSectionsReassignSlidePage.tsx`** — rebuild `TaskWorkingSectionsReassignSlidePageContent`:
   - Call `useStagedForm({ steps: [{ id: "sections", title: "Sections" }, { id: "note", title: "Note" }], mode: "free" })`.
   - Wrap the existing step-1 body (`TaskWorkingSectionsStepList` + `ScrollVisibilityProvider`/scroll wiring — unchanged) in `<StagedFormStep id="sections">`.
   - Add `<StagedFormStep id="note">` rendering the new note-step component, wired to `controller.noteDraft` / `controller.handleNoteChange` / `controller.noteClientId`.
   - Replace the current always-visible footer with a `StagedForm`-driven footer: keep the existing "Close & Back" / shortcut-bar behavior on step 1 (footer already close to `TaskCreationAssignmentFooter`'s shape); on step 2, the primary button reads "Save" and calls `controller.handleSaveAndClose` directly (not `staged.advance`, since there is no step 3 to advance to — this mirrors how `TaskWorkingSectionsReassignFooter`'s existing Save button already calls `onSaveAndClose` directly rather than going through `useStagedForm`'s `onSubmit`).
   - Keep `header?.setCloseInterceptor(controller.hasUnsavedChanges ? controller.handleCloseWithGuard : null)` — now guards on the combined (sections + note) `hasUnsavedChanges`.
   - Per the StagedForm hoisting rule, this page has no calendar/picker surfaces reachable from either step, so no new `usePreloadSurface` hoisting is required (the working-section picker flow is already handled at the provider/controller level, not via a lazily-loaded surface from this page).

7. **`TaskStepActionsSheetPage.tsx`** (workers-app) — no change expected; verify after implementation that `TaskWorkingSectionsReassignSlideSurfaceProps` widening (new optional fields) does not require updates at the call site (optional fields are additive).

8. **Typecheck and lint** the touched packages; fix any fallout in `TaskWorkingSectionsSlidePage.tsx` from the controller's widened return type (should be none, since new fields are additive and unused there).

## Risks and mitigations

- Risk: Extending the shared controller adds note-related state to `TaskWorkingSectionsSlidePage`, which never uses it.
  Mitigation: All additions are optional/default-null; `hasUnsavedChanges` and `handleSaveAndClose` are behaviorally identical there since `noteDraft` stays `null`. Confirmed acceptable by the user (see Clarifications).
- Risk: Partial failure (one of the two parallel mutations succeeds, the other fails) currently has no defined recovery semantics in this codebase for a *combined* save.
  Mitigation: Confirmed with the user — default to the existing "any failure reopens everything" behavior (matches today's single-block try/catch for section changes). A retry could double-submit an already-succeeded task-step add; this is a pre-existing risk class for `addTaskStep` (it has no idempotency key beyond `client_id`, which the reassign flow does not currently set — see `AddTaskStepVariables.client_id` optionality) and is not introduced by this change.
  Mitigation, secondary: consider passing a stable `client_id` on the `AddTaskStepVariables` payload (currently omitted — `buildPendingStep`/`stageStepStart` generate a `_pendingId` client id but `handleSaveAndClose` does not forward it as `client_id` in `AddTaskStepVariables`) so a retried add is idempotent server-side, if the backend honors `client_id` for this endpoint. Out of scope unless the user confirms this is desired — call out during implementation review.
- Risk: `noteDraft` (plain text/content) is unmounted when the user is on step 1, but if it were kept as local `useState` inside the note-step component rather than the controller/page, it would reset every time the user leaves and returns to step 2.
  Mitigation: Per the StagedForm hoisting-rule reasoning above, `noteDraft` is controller-owned (or page-owned, per Clarification #1), never step-component-owned.
- Risk: `createTaskNote` has no optimistic cache write (only `onSettled` invalidation) — the note will not visibly appear anywhere until the query refetches, whereas the slide is already closed by then.
  Mitigation: This matches the existing task-step save UX (also no optimistic cache write, only `cancelQueries` + invalidate on settle) and the note list surface (`TaskNotesSheetPage`) already re-fetches on mount/focus; no additional work needed unless the user wants a toast/confirmation, which is not in the current ask.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `task-working-sections`, `task-notes`, `task-creation` (untouched but transitively type-checked), and `workers-app`.
- `npm run test -- --grep "task-working-sections"`: existing unit/component tests for the reassign page and controller pass; add/update coverage for `hasUnsavedChanges` now considering `noteDraft`, and for `handleSaveAndClose` running both mutations via `Promise.all`.
- `npx playwright test --grep "task-working-sections-reassign" --project=mobile`: golden path — select a section, add a note with an image, tap Save, confirm the slide closes and both the task step and the note appear after navigating to the task detail / notes sheet.
- `npx playwright test --grep "task-working-sections-reassign" --project=desktop`: same flow, desktop viewport.
- Manual/Playwright edge case: trigger a network failure (mock 500 on `/notes` or task-step endpoint) and confirm the slide reopens with both the section selection and the note draft (text + image) intact.

## Review log

- `2026-07-14` `claude`: initial plan drafted from user's staged-form + parallel-save intention, grounded in `TaskWorkingSectionsReassignSlidePage.tsx`, `InternalFormContent.tsx`, and the shared `useTaskWorkingSectionsController`.
- `2026-07-14` `user`: confirmed both clarifications — extend the shared controller in place (do not fork a page-specific controller); on partial mutation failure, reopen the full recovery snapshot (sections + note) rather than granular per-mutation recovery.

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
