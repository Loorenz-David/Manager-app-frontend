# Codex — Phase 5: timeline & composition editing (single session, lean brief)

You are implementing Phase 5 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–4 are complete: `@beyo/presentation-runtime` (static renderer, schemas, `REFERENCE_CANVAS_WIDTH = 390`) and the editor shell (store, controller, `EditorView`, slide/media orchestration) are live. Start coding early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase5_editor_timeline_composition_20260722.md` (status `approved`) — all acceptance criteria. Both clarifications are **resolved**: duration shrink **clamps** elements (never blocks the slider); `+ Text` defaults to appear=`slide` / disappear=`fade` (`fade_up` in / `fade` out on the wire).

## Read (only this)

1. The phase plan, fully.
2. Master plan `PLAN_presentation_capability_master_20260722.md` — the **"Design → backend mapping" table** (your mapping module's contract: ms conversions, `fade_up` for "slide", 450ms, `end_ms ≥ start_ms + 400`, center-anchored layout, font_size at reference width 390) and decision #6 (flush on save/slide-switch/autosave, never for non-draft).
3. `docs/presentation_capability/design/README.md` — "Interactions & behavior" + "Text appear/disappear animation" (the exact `pIn`/`pOut` formulas, ANIM=0.45s, 20px offset) + "Playback".
4. Backend `docs/presentation_capability/backend/09_slide_composition.md` — `PUT composition` body, validation errors.
5. Relational only: the Phase 5 kit files listed below (prop contracts — READ-ONLY), `packages/presentation-builder/src/dev/TimelineKitPreview.tsx` (**the reference consumer**: it demonstrates the gesture contract end-to-end, including a model px→ms conversion), the Phase 4 store/controller (`src/editor/draft-store.ts`, `src/controllers/use-presentation-editor.controller.ts`), runtime's public exports.

## Component kit — READ-ONLY (pre-built by Claude, design-approved)

`TimelineDock`, `TimelineControls`, `TimelineRuler`, `TimelineTrack`, `TimelineBar`, `CanvasDraggableBox`, `TextBlockPanel`, `MediaElementPanel`, `SlidePropertiesPanel`, panel primitives — plus the Phase 4 editor kit. Never edit their DOM/classes/styling; `git diff` on `components/{timeline,panels,editor,dashboard}` must show no non-additive change; additive optional props only, recorded in the plan Review log first.

**The gesture contract** (how the kit talks to your logic): kit components report **raw pointer geometry only** — `TimelineBar.onGesture({kind: move|resize-start|resize-end, deltaPx, laneWidthPx})`, ruler/playhead `onScrub(fraction 0..1)`, `CanvasDraggableBox.onDrag(centerXFraction, centerYFraction)` unclamped. Your pure geometry module converts px/fractions → time/positions, clamps (min window 400ms, `[0, duration]`, canvas 5–95%/6–94%), and feeds results back down as props (`leftFraction`/`widthFraction`, positions, labels). All arithmetic lives in tested pure modules — components never compute time.

## Deliver (per the plan's criteria; build order fixed)

1. Runtime: `usePlaybackClock` (rAF, dt clamp ≤0.1s, play/pause/seek/loop-one-slide) + animation registry (8 types × easings; enter `pIn`/exit `pOut`, opacity `min(pIn,pOut)`, 450ms default) + time-driven renderer upgrade. Tests with fake rAF + recipe fixtures at multiple t.
2. Builder pure modules, tests first: `timeline-geometry` (gesture→time, clamping, min-window, tick generation) and `composition-mapping` (editor model ↔ PUT body ↔ server elements per the master table; injected text-measurement adapter). **The round-trip fixture is non-negotiable**: editor state → PUT body → server response → hydrate → deep-equal.
3. Store/controller extension: element CRUD (`+ Text` at playhead ~2.5s long with the confirmed defaults), selection sync (bar ↔ canvas ↔ panel), per-slide playhead/playing, dirty/revision; flush orchestration (`PUT composition` on Save draft / slide switch / ~2s idle autosave / `beforeunload` guard; never for non-draft; failure keeps local state + one notify + retry); slide duration clamp rule; CTA fields → slide PATCH with `/` validation.
4. Assembly: wire the timeline dock, panels, and canvas boxes into `EditorView` through the kit's props; text/media tracks share the same bar components; media deletion confirms, text deletion doesn't; no undo/redo (deferred).
5. **Carried Phase 4 advisories (do these too):** memoize rail thumbnails (revision-keyed) so the clock/keystrokes don't re-render the rail; clear the title-PATCH debounce timer when `presentationId` changes.
6. Perf: clock state must not re-render rail/panels (store slicing; rAF-driven canvas/timeline subscriptions only).

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime` && `npm run test:presentation-builder` (clock, registry, geometry, mapping round-trip, store suites)
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-editor-timeline --project=desktop` — add text at playhead → drag bar + handles → reposition on canvas → change animations/size → switch slide (flush) → reload → identical timeline state; play/pause/scrub smoke; console/page-error guards
- `git diff -- packages/presentation-builder/src/components` → no non-additive kit change

## Finish

Only after green validation, per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_presentation_phase5_editor_timeline_composition_20260722.md` → archive the phase plan → dated master Review-log entry → never archive/move the master. If validation cannot go green: plan `Status: debugging`, defect in its Review log, stop with a report. If you run low on context, finish the current numbered deliverable cleanly and report exactly what remains — never stop before writing code.

## Report back

Lifecycle state, files created/modified, all validation outputs (round-trip fixture result explicitly), deviations with justification.
