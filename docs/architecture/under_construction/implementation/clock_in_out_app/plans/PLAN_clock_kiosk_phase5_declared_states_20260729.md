# PLAN_clock_kiosk_phase5_declared_states_20260729

> **SHELVED — NOT PART OF v1** (user decision 2026-07-29, master decision #10).
> The kiosk ships clock in/out only; declared states will be delivered later as
> separate pages. This plan and its prompts (`prompts/execution/PROMPT_phase5_*`,
> `prompts/review/PROMPT_review_phase5.md`) stay on file for that future
> capability and must NOT be executed in the current sequence. Before reviving:
> re-validate against the then-current master, the backend handoff's liveness
> table, and the surface model (the kit described here predates the `rise`
> surface decision and must be redesigned around it).

## Metadata

- Plan ID: `PLAN_clock_kiosk_phase5_declared_states_20260729`
- Status: `set_aside`
- Owner agent: Codex (implementer) / Claude Fable (kit + author) / Opus (reviewer)
- Created at (UTC): `2026-07-29T13:30:00Z`
- Last updated at (UTC): `2026-07-29T13:30:00Z`
- Master plan: `../PLAN_clock_kiosk_master_20260729.md`
- Depends on: Phase 4 archived.
- Backend contract: handoff §6 (declared states) + §7 (pause reasons catalog).
- Design ground truth: **none exists** — the images predate this flow (design readme: "leave room in the confirm/summary layouts for it"). The Claude kit is designed net-new inside the kiosk visual system and is **user-approved before the Codex session runs** (master decision #10).

## Goal and intent

- Goal: let a clocked-in worker declare an off-task state (lunch, cleaning, meeting…) and close an open declaration, from the same code-entry flow.
- Intent: declared states are the worker's own explanation of off-task time; they render as `in_pause` with a catalog reason across the manager stats surfaces automatically.
- Non-goals: no BLOCKER-type reasons (task-step blockers — not declarable, handoff §7); no reason-catalog CRUD (manager feature, `@beyo/pause-reasons` already owns it); no resume-of-paused-steps (workers resume tasks from the worker app — handoff §6 note).

## Scope

- In scope: `@beyo/clock-kiosk` additions — declare entry point on the confirm step, reason picker pane, description pane, declare/close result states, flow-store extensions; `@beyo/pause-reasons` consumption (query + types; client-side `pause_type === "personal"` filter until the backend query param ships).
- Out of scope: `@beyo/worker-shifts` action hooks (exist since Phase 1); any Phase 6 surface.
- Assumptions: Phase 1 mocks already cover §6 semantics (switch, close, 409s).

## Kit contract (Claude-owned; Codex read-only) — components delivered with the approved design

| Component | Key props |
|---|---|
| Confirm-step declare affordances | secondary action(s) rendered under the primary button when `clocked_in`: `onDeclare()`; when a declaration is open: current-state chip (`reason name + image + since`) + `onCloseDeclaration()` |
| `ReasonPickerPane` | `reasons: {id, name, imageUrl, requiresDescription}[]`, `pending`, `onPick(id)`, `onBack()` — circle-imagery grid in the keypad's visual language, ≥44px targets |
| `DescriptionPane` | `reasonName`, `value`, `error`, `onChange`, `onSubmit()`, `onBack()` — only shown when the picked reason `requires_description` |
| `DeclareResultState` | `reasonName`, `pausedStepsNotice: string \| null` ("1 task was paused"), countdown/Done (reuses `AutoReturnFooter`) |
| `CloseResultState` | `landedState: "idle" \| "in_pause"`, explanatory line when a blocker pause remains, countdown/Done |

## Clarifications required

- [ ] Kit approval gate: the user approves the declare UI design before Codex runs — this is the phase's only gate; flow logic below is fully specified by the handoff.

## Acceptance criteria

1. Entry point: on the confirm step (fresh `/current` already in hand from Phase 4), a clocked-in worker sees, besides the primary clock-out action, the declare affordance; if `declared_state` is non-null, its chip (reason name/image + entered-at time) and a close affordance render instead/additionally per the approved kit. A clocked-out worker sees no declare UI (handoff: must be clocked in).
2. Reason picker: catalog via `@beyo/pause-reasons` `usePauseReasonsQuery`, filtered client-side to `pause_type === "personal"`; renders name + image; loading/error/empty states per `32`; picking a `requires_description` reason routes through `DescriptionPane` (submit blocked on empty; server 422 surfaced inline).
3. Declare action: `use-declare-state` (Phase 1) with `{user_id, pause_reason_id, description?}`; success → `DeclareResultState` with "N task(s) were paused" from `paused_steps` (hidden at 0) → auto-return. Declaring over an open declaration simply switches (no pre-close call) — verified against the mock.
4. Close action: `use-close-declared-state`; success → `CloseResultState` reflecting the response `shift_state` (`idle`, or `in_pause` when a step-blocker pause remains — explain it, don't hide it); "no open declaration" 409 → refetch `/current`, re-render confirm (normal-flow rule).
5. Not-clocked-in 409 on declare → refetch `/current`, re-render confirm (which now offers clock-in first, per handoff §6). After every await, state renders from a fresh `/current`, never from cache.
6. Flow store extended with the declare panes as SlideStack steps; session-id rule and every-path-returns-to-keypad invariant (Phase 4 criteria 2/7) hold across the new states — tests extended accordingly.
7. Tests: vitest — reason filtering, requires_description gating, switch semantics, both 409 paths, store transitions; Playwright (mocked, mobile then desktop): declare-with-description journey, declare-switch journey, close journey landing `idle`, declare-while-clocked-out redirect.
8. Root typecheck green; no `@beyo/pause-reasons` type redefined anywhere (import-only).

## Contracts and skills

### Contracts loaded

- Core set (guide) + `07_components.md`, `09_forms.md` (description input validation), `23_providers.md`, `24_dto.md`, `27_responsive.md`, `31_animations.md`, `32_loading_skeletons.md`, `35_shared_packages.md`, `38_slide_stack.md`, `17_testing.md`, `34_runtime_validation.md` (+`_local`), `37_keyboard_aware_inputs.md` **only if** the description input is found to collide with the software keyboard on tablet (re-evaluate trigger, master contracts section).

### File read intent — pattern vs. relational

Permitted relational reads: `packages/pause-reasons/src/{index.ts, types.ts}` and its query hook signature (what exists — compose, don't duplicate); Phase 4's flow store/controller exports; the new kit components' prop types.
Prohibited: pattern reads (structure comes from `08`/`23`/`38`).

### Skill selection

- Lifecycle: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`.

## Implementation plan

1. Extend flow store/controller with declare states + panes (criterion 6).
2. Confirm-step affordances wiring (criterion 1).
3. Reason picker + description panes wiring (criterion 2).
4. Declare/close actions + result states + 409 paths (criteria 3–5).
5. Tests (criterion 7); typecheck + API audit (criterion 8).

## Risks and mitigations

- Risk: no design ground truth → drift. Mitigation: user-approved kit gate before Codex.
- Risk: declare UI clutters the one-button confirm screen. Mitigation: kit keeps the primary action visually dominant; declare is secondary by hierarchy (validated at kit approval).

## Validation plan

- `npm run typecheck`: zero errors.
- `npm run test:clock-kiosk`: green.
- `npx playwright test --grep kiosk-declare --project=mobile` then `--project=desktop`: green (mocked).

## Review log

- (append here)

## Lifecycle transition

- Current state: `under_construction` → kit designed → user approval → implement → validate → summary + archive
- Transition owner: Codex session
