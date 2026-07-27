# PLAN_presentation_timeline_media_corrections_20260723

## Metadata

- Plan ID: `PLAN_presentation_timeline_media_corrections_20260723`
- Status: `archived`
- Owner agent: `codex` (logic) + `claude-builder` (component kits, pre-built per stage)
- Created at (UTC): `2026-07-23T09:00:00Z`
- Last updated at (UTC): `2026-07-23T11:30:00Z`
- Related issue/ticket: operator live-testing feedback (timeline + media), 2026-07-23
- Intention plan: `docs/architecture/under_construction/intention/presentation_capability_improvments.md`
- Knowledge base (READ FIRST): `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`
  — docs 21 (editor logic), 22 (kits), 10 (runtime), 50 (invariants)
- **Sequencing**: sibling plan `PLAN_presentation_text_block_corrections_20260723`
  (in flight with Codex) touches `EditorView.tsx`, `CanvasDraggableBox.tsx`, and
  the editor controller. Stages B and C below MUST start only after that plan's
  stage B+C has merged; Stage A here is file-disjoint and can run anytime.

## Goal and intent

- Goal: make the timeline a real multi-track media editor — (A) space bar
  reliably toggles play/pause regardless of focus, except while typing; (B)
  uploaded images/videos become timeline tracks that can be moved, trimmed, and
  given in/out transitions; (C) media is editable on the canvas (move, resize)
  and through its panel; (D) a slide can hold multiple images and videos with a
  visible affordance for adding them.
- Business/user intent: media should behave like text blocks already do —
  first-class timed, animated, placeable composition elements; transport control
  should feel like a video editor (space = play/pause, always).
- Non-goals: audio tracks; video trimming of the source file (windows control
  presentation timing only); per-media volume; z-order reordering UI (layering
  stays implicit); backend changes.

## Scope

- In scope: `packages/presentation-builder` (EditorView, controller,
  draft-store, composition-mapping, timeline-geometry, timeline/panels/editor
  kits, kit previews), studio editor Playwright spec.
- Out of scope: `packages/presentation-runtime` (renderer already applies
  enter/exit animations and layout to media elements; parity coverage may be
  extended, no behavior change), `packages/presentations`, backend, studio shell.
- Assumptions: backend supports N media per slide (contract
  `presentation_documentation/backend/05_admin_slides_media.md` documents
  per-file type/size limits only — no per-slide count limit); media composition
  elements already round-trip `layout`, `enter_animation`, `exit_animation`
  (verified in `composition-mapping.ts` media branches, both directions).

## Root-cause findings (verified against source, 2026-07-23)

- **(A) Space is not wired at all.** No global keydown handler exists in the
  editor; the only space handling is native browser behavior — after clicking
  the play button (`TimelineControls`), the focused `<button>` re-triggers on
  space. Focus anything else and space does nothing (or scrolls the page).
  That's the entire "sometimes works" mystery.
- **(B/C/D) The background/overlay split hides media from the timeline.** The
  first upload takes role `background` → element at `layer_index: 0`, untimed,
  full-bleed (`uploadFile` in the controller,
  `role = requestedRole ?? (slideHasBackground(elements) ? "overlay" : "background")`).
  `EditorView`'s `timedElements` filter
  (`element_type === "text" || layer_index > 0`) feeds BOTH the timeline tracks
  and the canvas drag boxes — so layer-0 media gets no bar and no drag box.
  Subsequent uploads DO become timed overlay elements, but:
  - `onFilesDropped` uploads only `files[0]` (multi-drop silently discards),
  - after the first upload the canvas placeholder (the only visible upload
    affordance) disappears — more media is reachable only by knowing drag-drop
    still works,
  - `CanvasDraggableBox` supports move only (no resize handles),
  - `MediaElementPanel` exposes fit/replace/delete only — no appears/disappears
    animations, though the wire format and renderer already support them.

## Clarifications required

All resolved 2026-07-23 — operator approved the plan defaults as written below.

- [x] **Unified media model** — plan removes the background/overlay dichotomy:
  every media element becomes a timed track. The FIRST media on a slide defaults
  to full-bleed layout (x .5 / y .5 / w 1 / h 1, fit cover) and full-duration
  window (`start_ms: 0`, `end_ms: null`), so today's look is preserved; trimming
  its bar reveals the dark canvas outside the window, like any video editor.
  Existing decks keep parsing (layer 0 remains valid wire data; the editor
  simply starts treating it as timed). Confirm this model.
- [x] **Resize behavior** — corner handles resize media proportionally
  (aspect-locked); edge handles resize freely (fit mode governs letterboxing).
- [x] **Space in preview overlay** — space also toggles play inside the
  full-screen preview overlay (currently Escape-only).

## Acceptance criteria

1. With the editor open, pressing space toggles play/pause when focus is on the
   canvas, timeline, panels, buttons, document body, or nothing — and does NOT
   fire while an `input`, `textarea`, `select`, or contentEditable has focus
   (typing spaces works normally). After bluring such an input (Escape/click
   away), space works again with no timeline interaction required. The page
   never scrolls on space; play state never double-toggles when the play button
   itself is focused.
2. Every uploaded image/video appears as a timeline bar that can be moved and
   resized (trimmed) under the existing gesture contract, respecting
   `MIN_TIMELINE_WINDOW_MS`.
3. Media elements accept Appears/Disappears transitions (fade / slide / none)
   from their panel and animate accordingly in canvas, preview, and player
   (wire: `fade`/`fade_up` + 450 ms, same mapping as text).
4. Media elements can be moved AND resized on the canvas via drag handles;
   layout round-trips through save → reload.
5. Multiple media on one slide: a visible "+ Media" affordance exists alongside
   "+ Text"; dropping several files uploads all of them (sequentially, with
   progress); each becomes its own timed element.
6. One-media slides look unchanged by default (full-bleed, full-duration).
7. Root `npm run typecheck` green; `npm run test:presentation-builder` green
   with new coverage (hotkey guard, unified mapping, resize geometry, multi-
   upload queue); studio editor Playwright spec extended (space toggle, media
   bar drag, canvas resize) green on desktop project.

## Contracts and skills

### Contracts loaded

- `packages/presentation-builder/presentation_documentation/frontend/21_builder_editor_logic.md`: controller/draft-store/mapping/geometry ownership
- `packages/presentation-builder/presentation_documentation/frontend/22_builder_component_kits.md`: props-only kits, gesture contract (`{kind, deltaPx, laneWidthPx}`), no arithmetic in kits
- `packages/presentation-builder/presentation_documentation/frontend/10_runtime_package.md`: element ordering, animation registry (no renderer changes)
- `packages/presentation-builder/presentation_documentation/frontend/50_invariants_and_pitfalls.md`: min window 400 ms, clamp-on-shrink, schema leniency
- `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`: media element composition contract
- `task_system/frontend_contract_goal_mapping_guide.md`: file-read discipline

### Local extensions loaded

- none

### File read intent — pattern vs. relational

Standard rule applies. Expected relational reads: `EditorView.tsx`,
`use-presentation-editor.controller.ts`, `draft-store.ts` (media element
helpers), `composition-mapping.ts` (media branches), `timeline-geometry.ts`,
`TimelineControls.tsx`, `MediaElementPanel.tsx`, `CanvasDraggableBox.tsx`.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: plan lifecycle, summary, archive
- Excluded alternatives: none

## Implementation plan

Three Codex stages. Stage A is file-disjoint from the sibling text-block plan
and can run in parallel; stages B and C wait for the sibling's canvas stage to
merge. Kit pieces are pre-built by the builder agent and read-only for Codex.

### Stage A — reliable space play/pause (Codex, independent, small)

1. New `useEditorTransportHotkey` hook (builder `src/lib/` or `src/editor/`):
   window-level `keydown` for `" "`; ignore when `event.defaultPrevented`, when
   the event target (or its closest ancestor) is `input`, `textarea`, `select`,
   or `[contenteditable]`, or when a takeover that owns keys is open where
   space shouldn't apply (publish dialog). Otherwise `event.preventDefault()`
   (kills page scroll AND native button re-trigger — this is what prevents
   double-toggle on a focused play button) and call the toggle callback.
2. Mount it in `TimelineCanvasWorkspace` bound to the same toggle path as the
   play button (`clock` + `onPlaybackCheckpoint`), active only when a slide is
   selected and not read-only… read-only may still preview: keep hotkey active
   in read-only (playback is allowed there).
3. Preview overlay (pending clarification): extend its existing keydown handler
   with space → `onTogglePlay`, same typing-guard rules.
4. Tests: hook unit tests (fires on body focus; suppressed inside
   textarea/contentEditable; works again after blur; preventDefault called;
   no double-toggle with button focused) + a Playwright assertion in the editor
   spec (click canvas → space plays; focus panel textarea → space types a
   space, playback unchanged; blur → space pauses).

### Stage B — media as timeline tracks + multiple media (Codex; kit pre-built)

Kit (builder agent, pre-session): `TimelineControls` gains a "+ Media" button
(mirrors "+ Text", `onAddMedia`, `addMediaDisabled`); `TimelineTrack`/bar
visual variant for media bars (thumbnail/label treatment per design tokens);
kit preview updated.

5. Unify the model in `draft-store.ts` + `composition-mapping.ts`: new media
   elements are always timed. First media on a slide → default full-bleed
   layout + `start_ms: 0`, `end_ms: null`; subsequent media → centered box
   defaults with a window starting at the playhead (same policy as
   `addTextElement`). Remove the `background`/`overlay` role dichotomy from the
   controller upload path (`slideHasBackground` retained only to decide
   first-media defaults); `replaceBackgroundMediaElement` /
   `appendOverlayMediaElement` collapse into one `appendMediaElement` (+
   `replaceMediaElementSource` for the panel's Replace file).
6. `EditorView`: drop the `layer_index > 0` exclusion — `timedElements` becomes
   all text + media elements; layer-0 media therefore gains a timeline bar and
   a canvas box. Bars for `end_ms: null` render full-width and become concrete
   (`start/end`) once trimmed (geometry: treat null end as slide duration,
   existing `clampWindowToDuration` applies on gesture).
7. Multiple media: `onFilesDropped` queues ALL dropped files through the
   existing single-upload pipeline sequentially (reuse `uploadState` for
   per-file progress, abort cancels the queue); "+ Media" button opens the file
   picker (multi-select) into the same queue; canvas placeholder unchanged for
   the empty state.
8. Tests: mapping round-trip for first-media defaults and trimmed windows;
   upload-queue test (3 files → 3 media elements, order preserved, failure of
   file 2 stops queue with retry); view test that a single-media slide shows
   one full-width bar; regression: existing published decks (layer-0 wire data)
   still render identically in editor and preview.

### Stage C — media canvas editing + transitions (Codex; kit pre-built)

Kit (builder agent, pre-session): resize handles on `CanvasDraggableBox`
(corner + edge handles shown when selected; emits
`onResize({handle, deltaXFraction, deltaYFraction})` raw and unclamped — all
math stays logic-side, per the gesture contract); `MediaElementPanel` gains
Appears/Disappears segmented sections (reusing the shared animation options)
and a read-only size/position line; kit previews updated.

9. New `resizeElementLayout` in `timeline-geometry.ts` (or a sibling
   `canvas-geometry.ts`): pure handle+delta → next `{x, y, width, height}`
   with aspect lock on corners (per clarification), minimum size, and canvas
   clamping; unit-tested exhaustively.
10. Wire in `EditorView`: resize gestures → `controller.onUpdateElement` layout
    patches (media elements; text resize stays out of scope); panel
    appears/disappears → animation patches via the same `updateElement` path
    text uses (`editorAnimationToWire` already handles media elements).
11. Tests: geometry unit tests (each handle, aspect lock, clamps); view test
    resize round-trip; panel interaction test; Playwright: select media →
    drag corner → assert layout width changed and persisted after reload.

### Close-out

12. Plan lifecycle skill (summary, archive, review log). Update the knowledge
    base: doc 21 (transport hotkey, unified media model, upload queue), doc 22
    (resize-handle gesture contract, new kit pieces), doc 50 (add: "no untimed
    elements — every canvas element is a timeline track"; retire the
    background/overlay terminology).

## Risks and mitigations

- Risk: unifying layer-0 media changes how existing published decks play.
  Mitigation: published decks are read-only; unification changes editor
  behavior and *defaults* only — wire data of existing decks is untouched, and
  the regression test in step 8 pins their rendering.
- Risk: space hotkey swallows spaces in some future input we forgot.
  Mitigation: the guard is structural (closest input/textarea/select/
  contenteditable), not an allowlist of known fields; unit tests encode it.
- Risk: upload queue + autosave flush interleaving corrupts local composition.
  Mitigation: uploads already `flushAll()` first and reconcile per file; the
  queue serializes strictly (await each) — no parallel uploads.
- Risk: merge conflicts with the in-flight text-block plan.
  Mitigation: explicit sequencing gate (stages B/C wait); stage A touches only
  new files + one mount point.

## Validation plan

- `npm run typecheck`: zero errors
- `npm run test:presentation-builder`: green incl. new hotkey/mapping/queue/
  geometry suites
- `npm run test:presentation-runtime`: green (unchanged; optional animated-
  media parity case)
- Studio editor Playwright spec (desktop; user starts servers): green incl.
  space-toggle, media-bar trim, canvas-resize scenarios
- Manual (operator): upload 2 images + 1 video to one slide, arrange on
  timeline with transitions, publish, verify on a phone app

## Review log

- 2026-07-23 operator: clarification defaults approved as written (unified media
  model, aspect-locked corner resize, space in preview overlay); plan flipped to
  `approved`. Stage prompts live in `prompts/PROMPT_timeline_media_stage{A,B,C}_*.md`.
- 2026-07-23 claude-builder: Stage B + C kits pre-built (read-only for Codex):
  `TimelineControls` "+ Media" (`onAddMedia`/`addMediaDisabled`), `TimelineBar`
  media variant (violet palette), `CanvasDraggableBox` 8-point resize handles
  emitting raw `CanvasResizeGesture` fractions (types in `editor/types.ts`),
  `MediaElementPanel` Appears/Disappears + `geometryLabel`, shared
  `panels/animation-options.ts` (`AnimationChoice`; `TextAnimationChoice` aliased),
  `TimelineKitPreview` extended as reference consumer (incl. reference
  aspect-locked resize math). Builder typecheck + 18 files/107 tests green.
  Stage B verification gate now passes.
- 2026-07-23 Stage A implemented — `npm run typecheck` green;
  `npm run test:presentation-builder` green (18 files, 107 tests); studio editor
  Playwright desktop green (1 passed against the operator server on port 5176);
  preview overlay uses the approved same typing-guard assumption; no
  implementation deviations.
- 2026-07-23 Stage B implemented — `npm run typecheck` green;
  `npm run test:presentation-builder` green (18 files, 114 tests);
  `npm run test:presentation-runtime` green (4 files, 19 tests); studio editor
  Playwright desktop green (1 passed); no implementation deviations.
- 2026-07-23 Stage C implemented — `npm run typecheck` green;
  `npm run test:presentation-builder` green (18 files, 141 tests);
  `npm run test:presentation-runtime` green (4 files, 19 tests); studio editor
  Playwright desktop green (1 passed); media corner resize persists through
  composition save and reload; no runtime-package behavior changes.

- 2026-07-23 Claude (Opus independent review): **DEFECTS FOUND (one, medium).**
  Criteria 1–6 verified met; criterion 7 validation could not be reproduced green
  (see below). **(A) Space hotkey — passes.** `useEditorTransportHotkey` guards
  structurally via `closest("input, textarea, select, [contenteditable]")` (not an
  allowlist), ignores `defaultPrevented`, and `preventDefault()`s before toggling —
  killing both page scroll and the focused-play-button re-trigger. Tests prove it:
  an `it.each` over body/button/canvas focus asserts `defaultPrevented === true`
  **and** `toHaveBeenCalledTimes(1)` (that pair is the no-double-toggle proof), plus
  ancestor-based suppression via an `editable-child` span, post-blur recovery, and
  publish-dialog suppression. No listener leak: the callback is held in a ref so the
  effect resubscribes only on `enabled`/`publishDialogOpen`, cleanup removes the
  listener, and the mount point is keyed by `selectedSlideId` so slide changes
  remount cleanly. Hotkey stays active in read-only and is disabled while the
  preview overlay is open (`transportHotkeyEnabled={previewSlides === null}`), so
  the overlay's own space handler cannot double-fire. **(B) Unified media — passes.**
  `replaceBackgroundMediaElement`/`appendOverlayMediaElement` are **fully collapsed**
  — zero references anywhere in src, tests, or the KB; `slideHasBackground` survives
  only inside `draft-store.ts` to pick first-media defaults, exactly as the plan
  allowed. `appendMediaElement` gives the first media `layer_index: 0`,
  `{start_ms: 0, end_ms: null}` and full-bleed `x.5/y.5/w1/h1 cover`, later media
  `windowStartingAtPlayhead` — matching the resolved clarification and criterion 6.
  `timedElements` no longer excludes layer 0. **Upload queue — passes.** Strictly
  sequential `for` + `await` with a generation guard; failure stores
  `queue.slice(index)` and returns, so retry resumes **from the failed file** (no
  duplicate re-upload of earlier files); `cancelUpload` bumps the generation and
  aborts the remainder; `flushAll()` runs once before the queue, not interleaved.
  `files[0]`-only is gone from both paths — the picker is `multiple` and passes the
  full array, and the single remaining `files[0]` is the semantically-correct
  replace-one-source path. **(C) Resize — passes.** `resizeElementLayout` is pure in
  `lib/timeline-geometry.ts`, center-anchored (each moved edge shifts the centre by
  half its travel), corners aspect-locked via a single dominant-axis scale applied
  to both dimensions with the opposite corner anchored, edges free, minimum size and
  0..1 clamping resolved there; tests are exhaustive (`it.each` tables for free
  edges, per-edge minimum, per-edge canvas clamp, aspect-locked corner clamp, plus
  normalize). The view supplies only the raw kit `CanvasResizeGesture` plus a
  captured base layout — no DOM math. **Transitions — passes.** The media panel uses
  the *same* `wireAnimationToEditor`/`editorAnimationToWire` functions as text (no
  fork). **Kits — props-only** (imports limited to React types, `lucide-react`,
  `cn`, and local `./types`/`./animation-options`); attribution between the builder
  pre-build and Codex is not diff-separable because the tree is uncommitted, but the
  substantive layer rule holds. **KB close-out accurate**: doc 21 documents the
  transport hotkey, upload queue, `appendMediaElement`/`replaceMediaElementSource`,
  and `resizeElementLayout` (with "**All arithmetic lives here**"); doc 22 carries
  the eight-handle raw `onResize({handle, deltaXFraction, deltaYFraction})` contract
  and the base-capture/`onResizeEnd` pattern; doc 50 adds invariant 11 "No untimed
  elements — every canvas element is a timeline track" and retires the
  background/overlay terminology. **DEFECT (medium) — Codex (logic):**
  `packages/presentation-builder/src/preview/rendering-parity.test.tsx:11-67`, the
  regression test claimed as the mitigation for this plan's own highest-risk item
  (step 8 / risk 1: "existing published decks with layer-0 wire data still render
  identically"), is **tautological** — it renders `SlideCompositionRenderer` twice
  with identical props and asserts the two outputs equal each other, so it cannot
  fail and pins no rendering output. It also never reaches the player: the real
  three-way mechanism is the shared `rendering-parity-fixture.ts` (consumed by the
  runtime suite, the builder preview suite, and
  `packages/presentations/src/PresentationPlayer.parity.test.tsx`), and the legacy
  layer-0 element was never added to it — the fixture contains only
  `layer_index: 10`. The same file's other test shows the correct pattern, pinning
  concrete values (`left: "31.2px"`, `fontSize: "32px"`, colours, `top ≈ 496.8`).
  Compounding it, the double render plus a missing `afterEach(cleanup)` leaks two
  mounted renderers into sibling tests, which is now producing a hard failure
  (`Found multiple elements by: [data-testid="slide-composition-renderer"]`). Fixes
  plan created: `docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_review_corrections_20260723.md`.
  **Validation (re-run by me, current tree):** `test:presentations` 7 files/20 tests
  green; `test:presentation-builder` **2 failed | 148 passed (150)**;
  `test:presentation-runtime` 1 failed | 3 passed; `npm run typecheck` exit 2.
  Attribution checked — none of the red is timeline/media logic: the builder
  parity failure is the defect above (triggered by the next plan's new
  slide-background case landing in the leaked DOM); `lib/text-measurement.test.ts`
  fails on float precision (`115.99999999999999` vs `116`); typecheck fails with two
  `TS6196` unused-import errors in `composition-mapping.ts` left by the
  `lib/text-measurement.ts` extraction; and the runtime failure is
  `Invalid Chai property: toHaveStyle` on the next plan's "paints the slide
  background" case (jest-dom matchers not registered in the runtime package). Those
  three are recorded as operator notes in the fixes plan, not charged to this plan.
  Note-level: the summary is thin (no file list, omits Stage A/B deliverables and
  the KB updates) and its filename carries the known stray `PLAN_` prefix.

- 2026-07-23 Codex corrections close-out: **DEFECT CLOSED.** The shared
  `rendering-parity-fixture.ts` now includes an old-wire layer-0 image
  (`start_ms: 0`, `end_ms: null`, full-bleed cover layout), and runtime,
  builder preview, and phone player assert its concrete 390×690 output. The
  tautological two-render comparison was removed and builder cleanup added.
  Root typecheck plus all three presentation package suites are green. A
  deliberate `390px` → `391px` expectation flip failed the targeted builder
  parity test before restoration. Corrections plan:
  `docs/architecture/archives/implementation/PLAN_presentation_timeline_media_review_corrections_20260723.md`;
  summary:
  `docs/architecture/implemented_summaries/SUMMARY_presentation_timeline_media_review_corrections_20260723.md`.

## Lifecycle transition

- Current state: `archived`
- Next state: none; create a nested debug plan only if a defect is found
- Transition owner: complete
