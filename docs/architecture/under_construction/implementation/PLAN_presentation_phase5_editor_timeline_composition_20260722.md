# PLAN_presentation_phase5_editor_timeline_composition_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase5_editor_timeline_composition_20260722`
- Status: `under_construction`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 5)
- Design reference: design README §1b "Interactions & behavior" + "State management" + both editor screenshots (timeline framing)

## Goal and intent

- Goal: The core creative tool. Add to the runtime package the playback clock and animation engine; build in the builder the mini-video-editor timeline (tracks/bars/handles/playhead/scrub/play), canvas text blocks (add, drag-position, animated rendering at playhead time), timed media tracks (master decision #8), the three properties panels (text block / media element / slide), and the full design↔backend composition mapping with hybrid persistence (save/slide-switch/autosave flush via `PUT composition`).
- Business/user intent: a manager times and animates text and media over each slide exactly like the mockup's phone-video-editor interaction.
- Non-goals: multi-slide preview overlay + publish flow (Phase 6); undo/redo (explicitly deferred; note in risks); text weight UI beyond body/heading toggle if the design panel lacks it (weight is set per master mapping: 400 body / 700 heading via a role toggle in the panel).

## Scope

- In scope:
  - Runtime: `usePlaybackClock` (rAF, dt clamp ≤0.1s, play/pause/seek/loop-one-slide), animation registry mapping all 8 backend `animation.type`s + easings to the renderer (enter progress `pIn`, exit `pOut`, opacity `min(pIn,pOut)` per design formulas, 450ms default), upgrade `SlideCompositionRenderer` from static to time-driven.
  - Builder timeline: controls row (play/pause, mono timecode `t / duration`, `+ Text`, helper text), ruler with second ticks, one track per timed element (text and overlay media; background media has no track), bar with left/right resize handles (min window 0.4s, clamp `[0, duration]`), bar-body drag preserving length, red playhead line, click/drag-to-scrub (scrub pauses), selection sync (bar ↔ canvas ↔ panel).
  - Canvas: text blocks draggable (center-anchored %, clamp ~5–95/6–94), outside-window selected block faint + dashed, `+ Text` inserts ~2.5s block at playhead with default animIn.
  - Properties panels: TEXT BLOCK (content textarea, Appears/Disappears segmented Fade/Slide/None, size slider 12–52, role toggle body/heading, read-only window label, delete); MEDIA ELEMENT (timing shown, fit, delete; replace file); SLIDE (no selection: replace media affordance, duration slider 2–12s step 0.5, CTA label + route fields with `/` validation → slide PATCH, hint text).
  - Mapping + persistence: pure mapping module (editor model ↔ composition PUT body ↔ server elements, per master table), measured text bounding boxes → normalized layout at save, per-slide dirty tracking, flush on Save draft / slide switch / debounced autosave (~2s idle), `beforeunload` guard, Save button dirty indicator.
  - Pure geometry module: time↔px, clamping, min-window, snap (if any) — unit-tested, React-free.
- Out of scope: non-goals above; audience/publish metadata.
- Assumptions: Phase 4's store/renderer landed as specified.

- Division of labor (master): the timeline/panel kit (controls, ruler, tracks/bars/handles, playhead, three properties panels, canvas text-block visuals) is built by Claude before the Codex session; kit pointer interactions call injected callbacks only; Codex supplies callbacks from geometry + store and owns clock/registry/mapping/persistence/assembly; kit components are read-only for Codex.

## Clarifications required

- [ ] Slide duration shrink below an element's `end_ms`: clamp elements into the new duration on save (recommended, matches backend 422 avoidance) vs. block the slider. Default: clamp, with bars visually compressing.
- [ ] Should `+ Text` default `animIn` be `slide` (mock shows Slide active on appear) and `animOut` `fade`? Default: yes (`fade_up` in / `fade` out on the wire).

## Acceptance criteria

1. Playback: play loops current slide 0→duration; scrub pauses; background-tab return doesn't jump (dt clamp) — matches design "Playback" section.
2. Bars: handle drag changes start/end with 0.4s min + clamping; body drag preserves length; label shows "{animIn} · {animOut}"; selected bar accent state; track label selects too.
3. Canvas animation at time t implements the design's formulas via the runtime registry (fade/slide/none in both directions, 0.45s, 20px offset) and renders identically in Phase 6's preview (same renderer).
4. Timed media elements get tracks/bars identical in behavior to text tracks (shared track/bar components — one implementation).
5. Round-trip: editor state → PUT body → server response → hydrate → deep-equal editor state (master criterion 3; fixture-tested including anchor-center layout conversion and reference-width font scaling).
6. Persistence: dirty flags per slide; flush on save/slide-switch/autosave; composition PUT failures keep local state + toast + retry affordance; no flush ever fires for non-draft.
7. CTA fields persist via slide PATCH with backend's `/`-route validation mirrored client-side.
8. All geometry math lives in tested pure modules; components contain no arithmetic beyond calling them.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/07_components.md`, `architecture/10_pages.md`: panel/timeline component structure.
- `architecture/09_forms.md`: CTA fields + content textarea validation/server-error surfacing.
- `architecture/24_dto.md`: the mapping module is this feature's DTO layer — bidirectional transformers.
- `architecture/31_animations.md`: animation implementation conventions (registry lives runtime-side; contract governs how).
- `architecture/18_performance.md`: 60fps playback — store slicing so the clock tick doesn't re-render rail/panels; rAF-driven canvas updates.
- `architecture/20_notifications.md`: save-failure toasts.
- `architecture/35_shared_packages.md`: runtime/builder boundary for the clock + registry.
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md`.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: desktop drag interactions in Playwright (mouse-based; no mobile project for studio).

### File read intent — pattern vs. relational

Permitted relational reads: Phase 4 store/controller/renderer (what exists — this phase extends them), `packages/stats` timeline geometry test file (relational precedent for geometry test style). Prohibited: any other timeline/drag implementation read "for style" (e.g. stats calendar components) — design README + contracts govern; drag uses the repo's established gesture lib only if `31_animations.md` prescribes one, else plain pointer events.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Runtime: `usePlaybackClock` + tests (fake rAF: dt clamp, loop, seek); animation registry (8 types × easings, enter/exit progress) + tests; time-driven renderer upgrade + recipe fixtures at multiple t.
2. Builder geometry module (`src/lib/timeline-geometry.ts`): timeToX/xToTime with the label-gutter offset, clampWindow, minWindow, moveWindow; tests first.
3. Mapping module (`src/lib/composition-mapping.ts`): editor↔wire per master table (incl. text measurement adapter injected so it's testable); round-trip fixtures (criterion 5).
4. Store extension: element CRUD (add text at playhead, delete, update timing/position/style/animation), selection state, playhead/playing per slide, dirty/revision counters.
5. Timeline components: `TimelineControls`, `TimelineRuler`, `ElementTrack` + `ElementBar` (shared text/media), `Playhead`; wire drag via pointer events + geometry module.
6. Canvas interactivity: draggable text blocks (and positioned overlay media), out-of-window faint/dashed state, selection sync.
7. Properties panels: `TextBlockPanel`, `MediaElementPanel`, `SlidePanel` (duration slider + CTA form per `09_forms.md`).
8. Persistence: flush orchestration in the controller (save/slide-switch/autosave/`beforeunload`), Save-draft dirty indicator, failure retry.
9. Vitest across steps 1–4, 8; component tests for bar drag logic (jsdom pointer events) where stable.
10. Playwright (desktop): add text at playhead → drag bar + handles → reposition on canvas → change animations/size → switch slide (flush) → reload → identical timeline state; play/pause/scrub smoke.

## Risks and mitigations

- Risk: this is the largest phase; timed-media tracks could overrun it.
  Mitigation: master's pre-approved fallback — if overrun, text tracks + background media ship and timed media bars split into a `5b` correction plan; shared track components (criterion 4) make the split cheap.
- Risk: text measurement (bounding box → normalized layout) differs across fonts/zoom, breaking round-trip.
  Mitigation: measurement adapter is injected + mocked in tests; real measurement validated in Playwright by reload-compare (step 10).
- Risk: no undo/redo frustrates users after destructive timing edits.
  Mitigation: explicitly deferred; store revisions structured so an undo stack can attach later; deletion asks no confirmation only for text blocks (recreatable), media deletion confirms.
- Risk: 60fps clock re-renders the whole editor.
  Mitigation: clock state kept out of the global store (local to canvas/timeline subscription), per `18_performance.md`; measured in step 10 via smoke perf check.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-runtime` / `test:presentation-builder`: clock, registry, geometry, mapping round-trip, store suites green.
- `npx playwright test --grep presentation-editor-timeline --project=desktop`: step 10 flow passes.

## Review log

- `2026-07-22` Claude: drafted from master Phase 5.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
