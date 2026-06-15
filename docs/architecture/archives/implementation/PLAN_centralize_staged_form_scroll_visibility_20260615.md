# PLAN_centralize_staged_form_scroll_visibility_20260615

## Metadata

- Plan ID: `PLAN_centralize_staged_form_scroll_visibility_20260615`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-15T00:00:00Z`
- Last updated at (UTC): `2026-06-15T14:47:43Z`
- Related issue/ticket: `n/a`
- Intention plan: `docs/architecture/implemented_summaries/SUMMARY_PLAN_staged_form_keyboard_accessory_20260615.md`

## Goal and intent

- Goal: Make `@beyo/ui` the single source of truth for the **staged-form** and **scroll-visibility**
  primitive subtrees, deleting the manager-local implementations and replacing them with thin
  re-export barrels so existing manager import paths keep working. After this, a correction to
  either system is one edit in `@beyo/ui`, not two.
- Business/user intent: The local/shared copies have already diverged (a `useLayoutEffect`, a whole
  different timeline strategy, a close-button feature on one side). Every keyboard/staged-form fix
  currently requires editing both copies — fragile and error-prone. Converge them.
- Non-goals:
  - No repository-wide primitive migration. Scope is strictly the staged-form + scroll-visibility
    dependency subtree (and the trivial `cn` / staged-form-types alignment they require).
  - No behavior change for the manager app — convergence must be visually and behaviorally
    invisible to users.
  - No query/action/domain contract changes.

## Scope

- In scope: converge the two subtrees, audit and preserve every consumer's import path and React
  context identity, align local types/utilities to the shared packages, and delete the local copies
  after verification.
- Out of scope: workers/sellers apps (they do not consume either subtree from `@beyo/ui` today;
  see consumer analysis), other duplicated primitives, the `KeyboardAccessoryBar` (already
  single-sourced in `@beyo/ui`).

## Canonical-behavior decision (the load-bearing reconciliation)

The two subtrees diverged in **opposite directions**, so the canonical source differs per subtree:

- **scroll-visibility → canonical = the SHARED `@beyo/ui` version.** It is a strict **superset** of
  local: it adds an optional `mode: "absolute" | "relative"` (defaulting to `"absolute"`, which is
  exactly the local behavior) and a `ScrollElementRegistrationContext`. Adopting it changes no
  manager behavior (manager always used absolute mode and does not use registration).
- **staged-form → canonical = the manager-LOCAL version's behavior.** The shared `@beyo/ui`
  staged-form is **unused by any app** (verified: nothing imports it), while the manager-local copy
  is what actually ships. The local behaviors must be **ported into** the shared files so the shared
  version becomes behaviorally equal to today's shipped manager UX, then re-exported.

## Exact files involved

### scroll-visibility

Local (`apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/scroll-visibility/`):
`ScrollVisibilityContext.tsx`, `ScrollVisibilityProvider.tsx`, `index.ts`,
`scroll-visibility.types.ts`, `use-scroll-state.ts`, `use-scroll-visibility.ts`.

Shared (`packages/ui/src/components/primitives/scroll-visibility/`): same six files **plus**
`ScrollElementRegistrationContext.tsx`.

### staged-form

Local (`apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/staged-form/`):
`StagedForm.tsx`, `StagedFormContext.tsx`, `StagedFormNavigation.tsx`, `StagedFormStep.tsx`,
`StagedFormTimeline.tsx`, `index.ts`, `staged-form.types.ts`, `staged-form.variants.ts`.

Shared (`packages/ui/src/components/primitives/staged-form/`): same eight files.

### Supporting

- Local `apps/.../src/types/staged-form.ts` (identical to `@beyo/lib` staged-form types).
- `apps/.../src/lib/animation.ts` vs `packages/lib/src/animation.ts` (**verified identical** — the
  `transitions` used by `StagedFormStep` are the same).
- Manager barrel `apps/.../src/components/primitives/index.ts` (re-exports both subtrees).

## Comparison of current implementation differences

### scroll-visibility (shared = superset of local)

- `ScrollVisibilityContext.tsx`: **identical**.
- `ScrollVisibilityProvider.tsx` / `use-scroll-visibility.ts`: shared adds a defaulted
  `mode = "absolute"` parameter; otherwise identical.
- `scroll-visibility.types.ts`: shared adds the optional `mode?: "absolute" | "relative"` field.
- `use-scroll-state.ts`: shared adds full `"relative"` mode logic (direction-anchor tracking);
  the `"absolute"` branch equals the local implementation.
- `index.ts`: shared additionally exports `ScrollElementRegistrationContext` /
  `useScrollElementRegistration`.
- No manager consumer uses `mode` or the registration context (verified) → adopting shared is
  behavior-preserving.

### staged-form (bidirectional divergence — local is canonical)

- `StagedForm.tsx`: **different timeline strategy.** Local keeps the timeline in flow and runs a
  `ResizeObserver` that compensates `scrollTop` frame-by-frame as the timeline height animates.
  Shared instead absolutely-positions the timeline (`absolute inset-x-0 top-0`), measures its
  height via `useLayoutEffect`, and pads content with `paddingTop`. **Keep the local strategy.**
- `StagedFormNavigation.tsx`: local has a `closeLabel` / `onClose` close-button feature on the
  first step and uses `text-md`; shared lacks the feature and uses `text-sm`. **Keep the local
  superset (close button + `text-md`).**
- `StagedFormTimeline.tsx`: local animates height with `grid-template-rows: 0fr→1fr` and a
  `mt-0→mt-3` progress-bar margin transition; shared uses a `-translate-y-full` transform and a
  fixed `mt-3`. **Keep the local grid-rows animation.**
- `StagedFormStep.tsx`: only the `transitions` import source differs (`@/lib/animation` vs
  `@beyo/lib`); the `transitions` value is **identical**.
- `staged-form.types.ts`: only the types import source differs; `StepConfig` / `StepStatus` /
  `StepStatusMap` are **identical** between `@/types/staged-form` and `@beyo/lib`.
- `StagedFormContext.tsx`, `index.ts`, `staged-form.variants.ts`: **identical**.
- Both copies already have the `enableKeyboardAccessory` prop + `KeyboardAccessoryBar` wrap from the
  prior plan.

## Canonical behavior that must remain in `@beyo/ui` after convergence

1. scroll-visibility: the shared superset, unchanged (absolute default + relative mode +
   registration context). Manager keeps absolute-mode behavior.
2. staged-form, ported from local:
   - Timeline-height scroll compensation via `ResizeObserver` (no content "push" on
     timeline collapse/expand).
   - `StagedFormNavigation` close-button feature (`onClose` / `closeLabel`) and `text-md` sizing.
   - `StagedFormTimeline` grid-rows height animation + `mt-0→mt-3` progress bar.
   - The `enableKeyboardAccessory` + `KeyboardAccessoryBar` wrap (already present).
   - Step transitions sourced from `@beyo/lib` (identical values).

## Clarifications required

- [x] Confirm the manager-local staged-form behavior (ResizeObserver timeline strategy, grid-rows
  animation, close-button nav) is the intended canonical UX to preserve — i.e. the shared
  `@beyo/ui` staged-form's alternative strategy was experimental/unused and should be replaced, not
  kept. (Verified unused; this confirms intent, since it is the one decision that changes shipped
  behavior if wrong.)

## Acceptance criteria

1. The manager-local `scroll-visibility/` and `staged-form/` directories contain only re-export
   barrels pointing at `@beyo/ui`; no local implementation logic remains.
2. Every existing manager import path (deep paths like
   `@/components/primitives/scroll-visibility/ScrollVisibilityContext` and the
   `@/components/primitives` barrel names) still resolves and compiles unchanged.
3. All scroll-visibility consumers resolve to the **same** shared `ScrollVisibilityContext`
   instance — no local/shared context-identity split (scroll-hide still works on every consumer).
4. Manager staged forms (pre-order, return, internal, testing) render and behave identically to
   today: timeline animation, scroll-hide of header/timeline, footer, keyboard accessory, and step
   transitions are visually unchanged.
5. `@beyo/ui` staged-form behavior equals the previously-shipped manager-local behavior (close
   button, grid-rows timeline, ResizeObserver compensation present).
6. Local `@/types/staged-form` and the local `cn` usages are aligned to `@beyo/lib`; no duplicate
   type definitions remain for the converged subtree.
7. `npm run typecheck` and `npm run build` pass for managers and `@beyo/ui`; existing Vitest specs
   (including `WorkingSectionPickerField.test.tsx`) pass.

## Consumer impact analysis

- **Shared `@beyo/ui` staged-form: no external consumer** (verified — nothing in `apps/` or
  `packages/` imports `StagedForm` from `@beyo/ui`). Porting local behavior into it has zero blast
  radius outside managers.
- **scroll-visibility consumers (manager, import path preserved):** `features/tasks/components/TasksView.tsx`,
  `features/task-creation/components/TaskCreationAssignmentFooter.tsx`,
  `features/working-sections/components/fields/WorkingSectionPickerField.tsx` (+ its `.test.tsx`),
  `features/upholstery/pages/UpholsteryPickerSlidePage.tsx`,
  `components/primitives/working-section-shortcut-bar/WorkingSectionShortcutBar.tsx`,
  `pages/tasks/TaskWorkingSectionsSlidePage.tsx`, and the primitives barrel. Audit each one's exact
  imported symbol (raw `ScrollVisibilityContext` vs `useScrollVisibility` / `useScrollVisibilityContext`
  / `ScrollVisibilityProvider`) and ensure the re-export surface exposes all of them from `@beyo/ui`.
- **staged-form consumers (manager):** `PreOrderFormContent.tsx`, `ReturnFormContent.tsx`,
  `InternalFormContent.tsx`, `TestingFormsContent.tsx`, and `use-staged-form.ts`. All use
  `StagedForm` / `StagedFormStep` / `StagedFormProps` via the barrel; all pass `showNavigation={false}`
  with a custom footer (so `StagedFormNavigation` is not rendered by these forms — but keep its
  feature surface intact for any other use).
- **Export-surface gap to close:** the shared `scroll-visibility/index.ts` currently exports
  `ScrollVisibilityProvider`, `useScrollVisibilityContext`, `useScrollVisibility`, the registration
  context, and the types — but **not** the raw `ScrollVisibilityContext`. If the audit finds a
  manager file importing the raw context directly, add `ScrollVisibilityContext` to the shared
  scroll-visibility `index.ts` (and `@beyo/ui` root) so the re-export can provide the one shared
  instance.

## Implementation plan (migration order)

1. **Audit (no code change).** Record, per consumer file above, the exact symbols imported and
   from which path (barrel vs deep file). Produce the definitive list of names the re-export
   barrels must expose. Confirm again (grep) that nothing imports `StagedForm`/staged-form internals
   from `@beyo/ui`.

2. **Reconcile scroll-visibility (canonical = shared).** No shared code change expected (it is the
   superset). If the audit found a direct raw-`ScrollVisibilityContext` import, add that export to
   the shared `scroll-visibility/index.ts` and the `@beyo/ui` root index.

3. **Reconcile staged-form (port local → shared).** In `packages/ui/.../staged-form/`:
   - `StagedForm.tsx`: replace the shared timeline strategy with the local ResizeObserver
     scroll-compensation implementation; keep the `enableKeyboardAccessory` wrap; import
     `transitions`/`cn`/types from `@beyo/lib`, scroll-visibility from `../scroll-visibility`,
     `KeyboardAccessoryBar` from `../keyboard-accessory-bar`.
   - `StagedFormNavigation.tsx`: port the local close-button feature (`onClose` / `closeLabel`) and
     `text-md` sizing.
   - `StagedFormTimeline.tsx`: port the local grid-rows animation + `mt-0→mt-3` progress bar.
   - `StagedFormStep.tsx`: keep behavior; source `transitions` from `@beyo/lib`.
   - Leave `StagedFormContext.tsx`, `index.ts`, `staged-form.variants.ts` (identical). If
     `StagedFormNavigation`/`Timeline`/`Context` need to be importable by the manager, add them to
     the shared `staged-form/index.ts`.

4. **Convert manager-local subtrees to re-export barrels.** Replace each manager-local
   `scroll-visibility/*` and `staged-form/*` file that is imported by a deep path with a thin
   `export ... from "@beyo/ui"` (or the appropriate `@beyo/ui` deep export), and repoint the
   `scroll-visibility/index.ts` and `staged-form/index.ts` barrels to `@beyo/ui`. Preserve every
   currently-exported name. Repoint the manager primitives `index.ts` only if a name moved.

5. **Align supporting types/utils.** Make `@/types/staged-form` re-export from `@beyo/lib` (or
   delete and repoint the few importers) so there is one `StepConfig`/`StepStatus`/`StepStatusMap`.
   Confirm no remaining manager use of a local `cn` for these files.

6. **Delete local implementations.** Once steps 3–5 compile and the app runs, remove the local
   implementation bodies, leaving only the re-export barrels (or delete the directories entirely and
   repoint the manager primitives barrel directly at `@beyo/ui`, whichever keeps import paths
   intact with least surface).

7. **Verify** (see validation + checkpoints).

## Automated tests

- `WorkingSectionPickerField.test.tsx` (existing) must still pass — it touches scroll-visibility.
- Add/extend a Vitest component test for `StagedForm` asserting: renders the active step only, the
  `enableKeyboardAccessory` path wraps content, and `StagedFormNavigation` renders the close button
  when `onClose` is provided on the first step (guards the ported feature).
- A render test that mounts a scroll-visibility consumer inside the shared provider and asserts the
  context resolves (guards against an identity split).

## Validation commands

- `npm run typecheck` (root — now covers managers, workers, sellers, `@beyo/ui`, `@beyo/hooks`).
- `npm run build` for managers and `@beyo/ui` (catches barrel/circular/export regressions).
- `npm run test` (Vitest) for the managers workspace (scroll-visibility + new staged-form specs).
- `npx playwright test --grep "pre-order|staged" --project=desktop` — no regression to form
  open/navigate/submit (headless cannot exercise the soft keyboard; documented limitation).

## Manual mobile / on-device validation (iOS Safari PWA + Android Chrome)

- Pre-order creation: timeline collapses/expands on scroll without content jump; step transitions
  animate as before; footer stays correct; keyboard accessory (Clear/Next/Done) works on the
  Customer step; no scroll "push" when the timeline height changes.
- A scroll-hide consumer outside staged forms (e.g. `TasksView`, `WorkingSectionShortcutBar`,
  `TaskWorkingSectionsSlidePage`): header/shortcut bar still hides/shows on scroll (confirms shared
  context identity and absolute-mode parity).
- Return and Internal creation forms: behave identically to today.

## Rollback / verification checkpoints

- **Checkpoint A (after step 3):** shared staged-form behavior verified equal to local on desktop +
  one mobile pass, with the manager app still pointing at its local copies. If parity fails, fix the
  shared port before touching the app — nothing shipped yet.
- **Checkpoint B (after step 4, before step 6):** manager app runs against the re-export barrels with
  local implementations **still present but unused**. Run typecheck/build/tests + a mobile smoke. If
  anything regresses (context split, animation, scroll-hide), revert the barrels to the local
  implementations — a one-file rollback, no deletions yet.
- **Step 6 (deletion) only after Checkpoint B passes**, so removal of local code is the last,
  reversible-by-git action.

## Risks and mitigations

- Risk: Context-identity split — a consumer keeps importing a local raw context.
  Mitigation: step-1 audit enumerates every import; the re-export surface (incl. raw
  `ScrollVisibilityContext` if needed) covers all; Checkpoint B mobile smoke confirms scroll-hide.
- Risk: Losing the local-only staged-form behaviors (close button, ResizeObserver, grid animation).
  Mitigation: canonical = local; step 3 ports them explicitly; Checkpoint A verifies parity.
- Risk: The shared staged-form's alternative strategy was intended as an upgrade we'd be discarding.
  Mitigation: gated by the clarification; it is currently unused, so keeping local loses nothing
  shipped.
- Risk: Hidden consumer of the shared staged-form discovered later.
  Mitigation: step-1 grep is repo-wide; canonical port preserves the local (and thus the only
  shipped) behavior anyway.
- Risk: On-device keyboard/scroll behavior cannot be exercised headlessly.
  Mitigation: manual mobile validation gates acceptance; typecheck/build/Vitest are the automated
  gates.

## Review log

- `2026-06-15` `Claude`: Authored from a full local-vs-shared diff of both subtrees. Established
  scroll-visibility shared = superset (canonical shared) and staged-form shared = unused (canonical
  local, port into shared). Confirmed identical types and `transitions`.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
