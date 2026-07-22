# Codex — Phase 5: Timeline & composition editing (the core editor)

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–4 are implemented and archived (logic layer, shell, dashboard, runtime static renderer + editor structural shell with slides/media).

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase5_editor_timeline_composition_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component kit (pre-built by Claude — READ-ONLY for you)

Per the master's "Division of labor" section, this phase's presentational components already exist in `packages/presentation-builder/src/components/`, design-approved: timeline controls row, ruler, element track + bar (with resize handles), playhead, the three properties panels (text block / media element / slide), canvas text-block visuals.

- Kit components with pointer interaction (bars, handles, playhead, canvas blocks) call **injected callbacks only** (e.g. `onWindowChange(startMs, endMs)`, `onSeek(t)`, `onPositionChange(x, y)`). Your job is to supply those callbacks from the geometry module + store, plus everything else in the plan: clock, animation registry, geometry, mapping, persistence, assembly.
- **Never** restyle, restructure markup, or edit class lists. Purely additive optional props allowed; anything structural/visual → plan Review log + stop for Claude. Never improvise styled components.
- If the kit is missing, STOP and report — the kit session runs before this one.

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — the **"Design → backend mapping" table is the single conversion contract** for everything you build here (start/end ms, fade_up for "slide", 450ms, center-anchored layout, reference-width-390 font scaling); also decisions #6 (hybrid save), #7 (all slides timed), #8 (media as timeline tracks).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Design ground truth: `docs/presentation_capability/design/README.md` — "Interactions & behavior", "Text appear/disappear animation" (the exact `pIn`/`pOut` formulas), "State management" — plus both editor screenshots.
6. Backend: `docs/presentation_capability/backend/09_slide_composition.md` (PUT composition body, validation errors, element ordering).

## Hard rules

- Build order inside the phase is fixed: runtime clock + animation registry → pure geometry module → mapping module → store extension → timeline components → canvas interactivity → panels → persistence. Pure modules get tests **first**; components contain no arithmetic beyond calling them.
- The **round-trip criterion is non-negotiable**: editor state → PUT body → server response → hydrate → deep-equal editor state (fixture-tested).
- Timed media tracks and text tracks share ONE track/bar implementation (criterion 4). If the phase overruns, the master pre-approves splitting timed-media bars into a `5b` correction plan — text tracks + background media must still ship complete; record the split in the master Review log.
- Enforce: 0.4s min window, clamp `[0, duration]`, scrub pauses, dt clamp ≤0.1s, playback loops the current slide only.
- Flushes (`PUT composition`) fire on Save draft / slide switch / ~2s-idle autosave / `beforeunload` guard — and **never** for non-draft.
- Clarification defaults apply (confirmed): duration shrink **clamps** elements into the new duration; new text defaults to appear=Slide (`fade_up`), disappear=Fade.
- Undo/redo is explicitly deferred — do not build it; media deletion confirms, text deletion doesn't.
- Relational reads per the plan's whitelist only. `data-testid` on all feature-critical elements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors.
- `npm run test:presentation-runtime` + `npm run test:presentation-builder` — clock, registry, geometry, mapping round-trip, store suites green.
- `npx playwright test --grep presentation-editor-timeline --project=desktop` — add text at playhead → drag bar + handles → reposition on canvas → change animations/size → switch slide (flush) → reload → identical timeline state; play/pause/scrub smoke.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase5_editor_timeline_composition_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log. Never archive/move the master.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output (including the round-trip fixture result), deviations with justification.
