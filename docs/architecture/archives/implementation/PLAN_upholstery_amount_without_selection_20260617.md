# PLAN_upholstery_amount_without_selection_20260617

## Metadata

- Plan ID: `PLAN_upholstery_amount_without_selection_20260617`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-17T00:00:00Z`
- Last updated at (UTC): `2026-06-17T13:08:17Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Allow `upholstery_amount_meters` to be included in the task-creation payload even when no upholstery item (`upholstery_client_id`) has been selected; and guard the workers app from starting an upholstery-relevant step when no upholstery has been selected.
- Business/user intent: A manager may know the fabric quantity needed before deciding which upholstery to assign. Silently dropping the quantity loses entered information. A worker cannot start upholstery work without knowing which fabric to use, so a hard block with a clear message is required.
- Non-goals: Changing what upholstery fields the backend accepts; changing validation rules on the form fields themselves.

## Scope

- In scope:
  - **Managers app — payload:** `buildUpholsteryFields` in `normalize-task-form-payload.ts` — relax the early-return guard so a quantity-only state still produces an `item_upholstery` object. Both `normalizeReturnFormPayload` and `normalizeInternalFormPayload` consume the same helper.
  - **Shared package — schema:** `ItemUpholsteryEntrySchema` in `packages/tasks/src/types.ts` — make `upholstery_id` nullable so the detail-page query does not crash when the backend returns a record with `upholstery_id: null`.
  - **Workers app — start guard:** new `hasNoUpholsterySelected` guard function and a new warning sheet that blocks starting an upholstery-relevant step (section name in `UPHOLSTERY_SECTION_NAMES`) when no upholstery has been selected (i.e. `upholstery_requirement.length === 0`). Covers both scenarios: no `ItemUpholstery` record created at all, and a record exists but `upholstery_id` is null.
  - Guard check and sheet registration must be added to both workers-app controllers: `use-working-section-steps.controller.ts` and `use-task-step-detail.controller.ts`.
- Out of scope:
  - UI changes to the upholstery picker fields or `TaskUpholsterySection` — the existing `updateItemUpholstery` path already handles selecting an upholstery for a null-upholstery record.
  - Backend contract changes.
  - Validation schema changes (`ItemUpholsteryFieldsSchema`).
- Assumptions:
  - The backend accepts `item_upholstery` with `upholstery_id` omitted and only `amount_meters` + `source` supplied. Confirmed.
  - When the backend returns an `ItemUpholstery` record with `upholstery_id: null`, `TaskUpholsterySection` will land in the "entries exist" branch and render the picker with `value={null}` (shows placeholder). The manager selects an upholstery and `updateItemUpholstery` patches the existing record. No UI changes are needed for this flow.
  - A task created with `amount_meters` only (no `upholstery_id`) produces **no** `upholstery_requirement` entries on the step. Confirmed by user: "no upholstery requirement exists either." Therefore `requirements.length === 0` is a reliable signal for "no upholstery selected" from the step's perspective.
  - The new "no upholstery selected" guard runs **before** the existing "no available upholstery" guard so the two remain mutually exclusive (when requirements.length === 0 the existing guard already returns false anyway, but ordering makes intent explicit).

## Clarifications required

- [x] Does the backend accept `item_upholstery` when `upholstery_id` is absent/null (only `amount_meters` supplied)? — **Yes. Omit `upholstery_id` from the payload; backend handles it.**
- [x] Should the `source` field (`"internal"`) still be sent when no upholstery is selected? — **Yes. Always send `source: "internal"` regardless of whether `upholstery_client_id` is present.**

## Acceptance criteria

1. When `upholstery_amount_meters` is set and `upholstery_client_id` is null/undefined, the serialized payload contains an `item_upholstery` object with `amount_meters` populated.
2. When both `upholstery_amount_meters` and `upholstery_client_id` are null/undefined, `item_upholstery` is absent from the payload (existing behavior preserved).
3. When both fields are set, the payload is unchanged from the current behavior.
4. On the task detail page, a task created with only `amount_meters` (no upholstery) renders the upholstery section with the picker showing the placeholder — not empty/missing — and selecting an upholstery successfully patches the record.
5. In the workers app, pressing "Start" on a pending step in an upholstery-relevant section when no upholstery has been selected opens the new "No upholstery assigned" warning sheet instead of proceeding.
6. The warning sheet shows the reserved `amount_meters` when a null-upholstery record exists, and a plain message when no record exists at all.
7. The existing "Fabric not available" warning sheet behaviour is unchanged (only fires when requirements exist but none are `available`).
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/16_feature_workflow.md`
- `architecture/28_surfaces.md`
- `architecture/28_surfaces_local.md`
- `task_system/frontend_contract_goal_mapping_guide.md`

### Local extensions loaded

- `architecture/28_surfaces_local.md` (app-specific `sheet` surface behavior)

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Permitted relational reads:
- `features/task-creation/lib/normalize-task-form-payload.ts` — the file being changed
- `features/items/types.ts` — to confirm `ItemUpholsteryFields` exact field names
- `packages/tasks/src/types.ts` — to locate `ItemUpholsteryEntrySchema` and confirm current `upholstery_id` field shape
- `features/task_steps/lib/step-transition-guards.ts` (workers app) — to understand the existing guard shape before extending it
- `features/task_steps/surface-ids.ts` (workers app) — to confirm existing surface ID and props patterns before adding new ones
- `features/task_steps/surfaces.ts` (workers app) — to confirm lazy-load and registration pattern
- `pages/task_steps/UpholsteryWarningSheetPage.tsx` (workers app) — to understand existing sheet structure, query usage, and button layout pattern before creating the new sheet

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`

## Implementation summary

- Updated `buildUpholsteryFields` so amount-only upholstery state emits `item_upholstery` with `source: "internal"` and `amount_meters`, while omitting `upholstery_id`.
- Updated `ItemUpholsteryEntrySchema` so task upholstery queries accept `upholstery_id: null`.
- Added `hasNoUpholsterySelected` plus a dedicated workers "No upholstery assigned" sheet and registered it as a lazy sheet surface.
- Added the new missing-selection guard to both workers start-transition controllers before the existing unavailable-fabric guard.
- Validation: `npm run typecheck` passed.

## Implementation plan

### Managers app — payload change

1. **Edit `buildUpholsteryFields`** in `features/task-creation/lib/normalize-task-form-payload.ts` (managers app):
   - Change the guard from `if (!upholstery.upholstery_client_id)` to `if (!upholstery.upholstery_client_id && upholstery.upholstery_amount_meters == null)`.
   - When only quantity is present (no `upholstery_client_id`), return `{ source: "internal", amount_meters: upholstery.upholstery_amount_meters }` — omit `upholstery_id` entirely from the object.
   - When both are present (existing case), return the full object unchanged: `{ upholstery_id, source: "internal", amount_meters }`.

### Shared package — schema fix

2. **Edit `ItemUpholsteryEntrySchema`** in `packages/tasks/src/types.ts`:
   - Change `upholstery_id: z.string()` → `upholstery_id: z.string().nullable()`.
   - This prevents a Zod parse crash on the detail-page query when the backend returns a record with `upholstery_id: null` (the state created in step 1).
   - No downstream UI changes are required: `ItemUpholsteryField` already accepts `value={null}` (renders placeholder), and `TaskUpholsterySection` already calls `updateItemUpholstery` for existing entries regardless of their current `upholstery_id`.

### Workers app — start guard

3. **Edit `step-transition-guards.ts`** (workers app) — add new guard function:
   ```typescript
   export function hasNoUpholsterySelected(step: TaskStep): boolean {
     const requirements = step.item?.upholstery_requirement ?? [];
     return requirements.length === 0;
   }
   ```
   This returns `true` for both scenarios: no `ItemUpholstery` record exists, and a record exists but `upholstery_id` is null (neither produces any requirement entries).

4. **Edit `surface-ids.ts`** (workers app) — add new surface constant and props type:
   - New constant: `UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID = "task-step-upholstery-selection-missing-sheet"`
   - New props type: `UpholsterySelectionMissingSheetSurfaceProps` with fields `{ stepId: TaskStepId; taskId: TaskId; workingSectionId: WorkingSectionId; itemId: string }`

5. **Create `UpholsterySelectionMissingSheetPage.tsx`** in `pages/task_steps/` (workers app):
   - Set header title to `"No upholstery assigned"`.
   - Call `useItemUpholsteryQuery(itemId)` and find any entry where `upholstery_id` is `null` to read `amount_meters`.
   - Message: "No upholstery has been assigned to this step yet. Contact your manager before starting."
   - If an `amount_meters` value is found on the null-upholstery record, surface it as additional context: e.g. "Reserved amount: {X} m."
   - Single "Close" button only — no case creation needed (this is a manager-action blocker, not a fabric-availability issue).

6. **Edit `surfaces.ts`** (workers app) — register the new sheet:
   - Add lazy-load function for `UpholsterySelectionMissingSheetPage`.
   - Add `lazyWithPreload` entry.
   - Export `preloadUpholsterySelectionMissingSheetSurface`.
   - Register under `UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID` as `surface: "sheet"`.

7. **Edit both controllers** (workers app) — add the new guard check **before** the existing `hasNoAvailableUpholstery` check in `handleTransition`:
   - `use-working-section-steps.controller.ts`
   - `use-task-step-detail.controller.ts`

   In both, add immediately before the existing upholstery warning block:
   ```typescript
   if (
     step.item?.client_id &&
     isUpholsteryWarningSection(step.working_section_name_snapshot) &&
     hasNoUpholsterySelected(step)
   ) {
     openSurface(UPHOLSTERY_SELECTION_MISSING_SHEET_SURFACE_ID, {
       stepId,
       taskId,
       workingSectionId: sectionId, // or resolvedWorkingSectionId in detail controller
       itemId: step.item.client_id,
     } as UpholsterySelectionMissingSheetSurfaceProps);
     return;
   }
   ```

## Risks and mitigations

- Risk: Backend rejects a payload where `upholstery_id` is absent.
  Mitigation: Confirmed accepted — omit the key entirely (Clarification #1 resolved).

- Risk: Making `upholstery_id` nullable in `ItemUpholsteryEntrySchema` causes TypeScript errors in downstream consumers that treat the field as `string`.
  Mitigation: `typecheck` will catch all such sites. The only known consumer that passes `upholstery_id` to a strict string field is `updateItemUpholstery`, which is already guarded by `ItemUpholsteryField.onChange` typed as `(value: string) => void`.

- Risk: `hasNoUpholsterySelected` (`requirements.length === 0`) fires for tasks that legitimately have no upholstery context (e.g. non-seat items routed to an upholstery section by mistake).
  Mitigation: The outer `isUpholsteryWarningSection` check already gates both guards on the section name. A task with no item linked (`step.item` is null) is also excluded by the `step.item?.client_id` check that wraps the entire block in both controllers.

- Risk: The new sheet is shown even when an upholstery IS selected and requirements exist but are in an intermediate state (no longer `requirements.length === 0`).
  Mitigation: Not possible — if requirements exist, `hasNoUpholsterySelected` returns `false` and the new sheet is skipped; the existing `hasNoAvailableUpholstery` guard handles that case.

## Validation plan

- `npm run typecheck`: zero TypeScript errors

**Managers app:**
- Manual: submit a task-creation form with quantity set but no upholstery selected; inspect the network payload to confirm `item_upholstery.amount_meters` is present and `upholstery_id` key is absent.
- Manual: submit with neither field set; confirm `item_upholstery` is absent from the payload entirely.
- Manual: open the task detail page for a task created with quantity-only; confirm the upholstery section renders (not blank/error) with the picker showing the placeholder text and the amount visible.
- Manual: from that detail page, select an upholstery; confirm `updateItemUpholstery` PATCH fires and the section updates with the selected upholstery.

**Workers app:**
- Manual: tap "Start" on a pending step in an upholstery-relevant section where no upholstery has ever been assigned; confirm the "No upholstery assigned" sheet appears instead of starting the step.
- Manual: same scenario but the task was created with an amount-only (null upholstery_id); confirm the sheet displays the reserved amount.
- Manual: tap "Start" on a step that has upholstery selected but requirements not yet `available`; confirm the existing "Fabric not available" sheet still appears (regression check).
- Manual: tap "Start" on a step with upholstery selected and requirements `available`; confirm the step starts normally (regression check).

## Review log

*(empty)*

## Lifecycle transition

- Current state: `archived`
- Next state: —
- Transition owner: Codex
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_upholstery_amount_without_selection_20260617.md`
- Archive record: `docs/architecture/archives/ARCHIVE_upholstery_amount_without_selection_20260617_1308.md`
