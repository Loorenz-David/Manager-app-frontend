# PLAN_presentation_text_block_corrections_20260723

## Metadata

- Plan ID: `PLAN_presentation_text_block_corrections_20260723`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-23T07:00:00Z`
- Last updated at (UTC): `2026-07-23T10:31:00Z`
- Related issue/ticket: operator live-testing feedback (text blocks), 2026-07-23
- Intention plan: `docs/architecture/under_construction/intention/presentation_capability_improvments.md`
- Knowledge base (READ FIRST): `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`
  — route each stage via the intention router; doc 21 (editor logic), doc 22 (kits),
  doc 50 (invariants) are the load-bearing ones for this plan.

## Goal and intent

- Goal: fix four text-block defects found in live studio use — (A) publish
  incorrectly rejects a one-slide/one-text-block deck; (B) a newly created text
  block is not immediately typeable; (C) text blocks on the canvas are hard to
  drag (I-beam cursor, text selection fights the drag); (D) the text panel lacks
  styling tools (alignment, color, background, radius) even though the runtime
  renderer and backend schema already support them.
- Business/user intent: the editor should feel like a design tool (Figma-grade
  canvas interactions) and never block a legitimate publish.
- Non-goals: no backend changes (everything below fits the existing contract);
  no new animation types; no rich-text (per-character) styling — style applies
  per text block.

## Scope

- In scope: `packages/presentation-builder` (controller, draft store,
  composition mapping, panels kit, editor kit, EditorView), `packages/ui`
  (new reusable text-styling primitives), `packages/presentation-runtime`
  (parity test coverage only — renderer already supports the style fields).
- Out of scope: `packages/presentations` (player), phone apps, studio shell,
  backend.
- Assumptions: backend `TextStyleSchema` fields `text_align`, `text_color`,
  `background_color`, `border_radius`, `padding` round-trip as documented in
  `presentation_documentation/backend/09_slide_composition.md` (verified in
  runtime `schemas.ts`; renderer applies them at
  `SlideCompositionRenderer.tsx:85-89`).

## Root-cause findings (verified against source, 2026-07-23)

These are established facts, not hypotheses — do not re-litigate; do verify with
the regression tests you write.

- **(A) Publish rejection.** `addSlide` posts an empty body
  (`src/api/slides.ts`; controller `add()` sends only `presentationId`), so new
  slides have `duration_ms: null`. `flushSlide`
  (`use-presentation-editor.controller.ts`, the
  `if (!slide || !elements || slide.duration_ms === null) return true;` guard)
  **silently reports success without PUTting the composition** when duration is
  null. The backend therefore never receives the text element; publish 422s with
  the empty-slide message, mapped by `publish-form.ts:207` to "Every slide needs
  media or a text block." Any interaction that happens to set a duration (e.g. a
  second edit round) unblocks the flush — which is why two text blocks appeared
  to "fix" it. The composition PUT body already carries
  `duration_ms` (`editorCompositionToPutBody`), so defaulting is safe and also
  heals existing null-duration drafts.
- **(B) Not immediately typeable.** `onAddText` selects the new element and the
  panel shows its content textarea, but nothing moves keyboard focus; typing
  goes nowhere.
- **(C) Drag vs I-beam.** `EditorView` (TimelineCanvasWorkspace) renders the
  full-canvas `SlideCompositionRenderer` **under** the `CanvasDraggableBox`
  overlays, and each overlay contains only an empty spacer div sized from
  `layout.height`. The visible text is the renderer's — plain DOM text with
  default `user-select` and `cursor: text`, often extending beyond the overlay's
  hit area (layout height ≠ measured text height). So the pointer frequently
  lands on renderer text instead of the overlay → I-beam, text selection, failed
  drags. The overlay itself already has `select-none cursor-grab` — the fix is
  layering, not the overlay.
- **(D) Missing styling tools.** `TextBlockPanel` exposes only content /
  animations / size / role. The editor element model (`EditorTextElement` in
  `composition-mapping.ts`) already carries `textAlign` but drops color,
  background, radius, padding — the wire schema and renderer support all of
  them.

## Clarifications required

All resolved 2026-07-23 — operator approved the plan defaults as written below.

- [x] **"Text border" meaning** — backend `TextStyleSchema` has `border_radius`
  but **no border stroke** (color/width). Stage D ships alignment, text color,
  background color, corner radius, padding. If a visible border stroke is
  wanted, that is a backend schema extension (small handoff prompt available on
  request) — confirm whether to (a) ship without stroke, or (b) wait for the
  backend field. Plan assumes (a).
- [x] **Inline edit interaction model** — plan adopts the Figma model: click =
  select, drag = move (grab cursor), **double-click = inline edit** on the
  canvas (text cursor only in edit mode), Escape/outside-click commits; a newly
  created block enters inline edit with its placeholder text pre-selected so
  typing replaces it. Confirm this is the desired model (the panel textarea
  stays as a secondary editing path either way).

## Acceptance criteria

1. A brand-new presentation with one slide and one text block (content edited or
   default) publishes successfully; the composition PUT is observed (test) even
   when the slide was created with `duration_ms: null`.
2. Creating a text block lets the user type immediately — keystrokes land in the
   new block without any extra click; the placeholder is replaced by what they
   type.
3. Dragging a text block anywhere on its visible text moves it with a grab
   cursor; no text selection ever occurs during drag; double-click enters inline
   edit with a text cursor; Escape/outside-click commits and returns to select
   mode.
4. The text panel offers alignment (left/center/right), text color, background
   color (including "none"), corner radius, and padding; each renders
   identically in editor canvas, preview overlay, and (parity test) the runtime
   renderer; values round-trip through save → reload.
5. The styling controls are generic `@beyo/ui` primitives with zero
   presentation-specific imports, demonstrated reusable via the kit preview.
6. Root `npm run typecheck` green; presentation-builder, runtime, and ui vitest
   suites green; studio Playwright specs green (desktop project; editor spec
   extended for the new interactions).

## Contracts and skills

### Contracts loaded

- `packages/presentation-builder/presentation_documentation/frontend/21_builder_editor_logic.md`: controller/draft-store/mapping ownership and autosave-flush semantics
- `packages/presentation-builder/presentation_documentation/frontend/22_builder_component_kits.md`: props-only kit rule, gesture contract, kit showcase duty
- `packages/presentation-builder/presentation_documentation/frontend/50_invariants_and_pitfalls.md`: schema leniency, no-arithmetic-in-kits, height chain
- `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`: composition PUT contract (style fields, duration_ms)
- `task_system/frontend_contract_goal_mapping_guide.md`: file-read discipline

### Local extensions loaded

- none

### File read intent — pattern vs. relational

Standard rule applies (see template). Relational reads expected:
`use-presentation-editor.controller.ts`, `draft-store.ts`,
`composition-mapping.ts`, `EditorView.tsx`, `TextBlockPanel.tsx`,
`PanelPrimitives.tsx`, runtime `schemas.ts` + renderer (style application
lines). Do not pattern-read other features for hook/controller shapes.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
  (post-implementation processing)
- Trigger terms: plan lifecycle, summary, archive
- Excluded alternatives: none

## Implementation plan

Three Codex stages, sized to the session-stall lesson (narrow file touch per
stage). Stage C/D kit components are built by the builder agent (Claude)
**before** their Codex session and are read-only for Codex (division-of-labor
rule).

### Stage A — publish-blocking flush bug (Codex, no kit dependency)

1. `use-presentation-editor.controller.ts` `flushSlide`: stop bailing on
   `slide.duration_ms === null` — flush with an effective duration
   (`slide.duration_ms ?? 4_000`) so the PUT both saves the composition and
   persists a real duration. Keep the `!slide || !elements` guard.
2. Controller `add()` (and thereby the auto-first-slide effect): include
   `duration_ms: 4_000` and `playback_mode: "timed"` in the create-slide body so
   new slides are never null-duration (`CreateSlideInput` already passes body
   through; verify input type includes these fields, extend `types.ts` if not).
3. Regression tests (controller test file): (a) slide created with
   `duration_ms: null` + one text element → publish flow issues the composition
   PUT and proceeds (MSW asserts the PUT body has the element and
   `duration_ms: 4000`); (b) existing test suite stays green.
4. Manual check: reproduce the operator's exact scenario (new presentation → one
   text block → publish) against MSW; the "Every slide needs media or a text
   block" path must not trigger.

### Stage B+C — canvas interaction: drag reliability + type-to-edit (one Codex session; kit part pre-built)

Kit (builder agent, pre-session): `CanvasTextEditOverlay` in
`packages/presentation-builder/src/components/editor/` — a positioned,
styled-to-match inline editor (transparent textarea/contentEditable, props:
value, font size/weight/align/color px-scaled, onChange, onCommit, onCancel,
autoFocus+select-all). Kit preview updated.

5. `EditorView` TimelineCanvasWorkspace: wrap the canvas
   `SlideCompositionRenderer` in a `pointer-events-none select-none` container —
   in the editor, all pointer interaction belongs to the overlay boxes. (Do not
   modify the runtime renderer.)
6. `CanvasDraggableBox`: size the hit area from the same measured text box the
   mapping uses (pass measured height fraction from the view instead of the raw
   `layout.height ?? 0.1` spacer) so the grab target covers the visible text;
   add `onDoubleClick` prop. Keep all math in the view/logic layer.
7. Inline edit mode (controller + view state): double-click on a text box → edit
   mode for that element (render `CanvasTextEditOverlay` at the element's
   canvas position; suppress its drag while editing). Commit on Escape /
   outside-click / blur → `updateElement` with new content (existing draft-store
   path). While editing, playback pauses (reuse `onPlaybackCheckpoint`).
8. Type-to-edit on create: `onAddText` → after the store returns the new element
   id, enter the same inline edit mode with content pre-selected. Typing
   replaces "New text" immediately. Panel textarea remains a secondary path
   (keep `onContentChange` live-sync so panel and inline stay consistent).
9. Tests: view-level tests for (a) renderer container is pointer-inert,
   (b) double-click enters edit and Escape commits, (c) add-text focuses inline
   editor and typing updates the element; extend the studio editor Playwright
   spec: create text block → type "Hello" → assert canvas shows "Hello"; drag
   text block → assert layout x/y changed and no text selection exists.

### Stage D — reusable text styling toolkit (Codex wiring; kit pre-built)

Kit (builder agent, pre-session):
- `packages/ui/src/components/text-styling/` — **generic, reusable, zero
  presentation imports**: `AlignmentPicker` (left/center/right segmented,
  icon-based), `ColorSwatchPicker` (preset swatch row + hex input + optional
  "none" swatch), `SliderFieldRow` (labeled slider with value chip) — exported
  from `@beyo/ui`, covered by ui vitest + a kit showcase story.
- `TextStylingSection` in builder panels kit: composes those primitives into the
  panel section (props: align, textColor, backgroundColor, borderRadius,
  padding + onChange callbacks, readOnly).

10. Extend `EditorTextElement` + `composition-mapping.ts`: add `textColor`,
    `backgroundColor`, `borderRadius`, `padding` (all optional); map both
    directions (`serverElementsToEditorComposition` ⇄
    `editorElementToPutInput` style object — omit unset fields, hex format per
    `HexColorSchema`). `textAlign` already exists — wire it through the panel.
11. `TextBlockPanel`: add `TextStylingSection` with the new props; controller
    wires them via `updateElement` style patches (same pattern as size/role).
12. Round-trip + parity tests: mapping round-trip case with all style fields;
    runtime parity fixture gains a styled text element (color/bg/radius) so
    editor-canvas ≡ preview ≡ player rendering is pinned; panel interaction
    test; ui primitives tests.
13. Kit previews: builder panels showcase shows the styling section states; ui
    showcase demonstrates the primitives standalone (reuse proof).

### Close-out

14. Run the plan lifecycle skill: summary, archive, review-log entry. Update
    `presentation_documentation/frontend/21_builder_editor_logic.md` (flush
    default, inline edit mode), `22_builder_component_kits.md` (new kit pieces,
    ui primitives), and `50_invariants_and_pitfalls.md` (the silent-flush
    lesson: "flush must never silently no-op — a skipped save must surface").

## Risks and mitigations

- Risk: making the renderer layer pointer-inert breaks the empty-state upload
  button or media drop.
  Mitigation: the upload button/drop targets live on `EditorCanvas` itself, not
  the renderer; test (9a) plus the existing canvas upload spec cover it.
- Risk: inline editor styling drifts from renderer output (WYSIWYG mismatch).
  Mitigation: overlay receives the same px-scaled style values the renderer
  computes (single source: mapping constants); parity eyeballed in kit preview.
- Risk: defaulting duration to 4000 on flush surprises a slide that intended
  "auto" duration.
  Mitigation: backend contract has no auto-duration semantics for timed slides
  (`duration_ms` nullable only as "unset"); 4000 matches `addTextElement`'s and
  playback's existing fallback.
- Risk: stage B+C touches the controller broadly → session stall.
  Mitigation: stages are separately promptable; B+C's file list is 5 files; stop
  rule at clean boundaries per the lean-brief protocol.

## Validation plan

- `npm run typecheck`: zero errors (root, all workspaces)
- `npm run test:presentation-builder`: green, including new flush/publish
  regression, inline-edit, mapping round-trip tests
- `npm run test:presentation-runtime`: green, including styled-text parity case
- `npm run test:ui`: green, including new text-styling primitives
- Studio Playwright editor spec (desktop project; user starts servers): green,
  including type-immediately and drag assertions
- Manual matrix (operator): one-slide/one-text-block publish succeeds end-to-end
  against the live backend; styled text renders identically on a phone app

## Review log

- 2026-07-23 operator: clarification defaults approved as written (ship without
  border stroke; Figma interaction model); plan flipped to `approved`.
- 2026-07-23 codex: implemented stages A–D, including the component kits that
  were not pre-built in the repository.
- 2026-07-23 codex: root typecheck, UI/runtime/builder/player suites, and the
  studio desktop timeline Playwright flow passed.
- 2026-07-23 codex: summary/archive record written; presentation knowledge-base
  contracts and linked intention progress updated.
- 2026-07-23 Claude (Opus independent review): **PASS-WITH-NOTES.** Re-ran validation
  myself: root `npm run typecheck` exit 0; `test:presentation-builder` 107/107 (18
  files); `test:presentation-runtime` 19/19; `test:ui` 96/96 (18 files);
  `test:presentations` 18/18. Playwright not run (needs the operator's dev server —
  per protocol I ask rather than start one). All six acceptance criteria met with
  evidence. **(A)** `flushSlide` no longer bails on null duration; `effectiveDurationMs
  = slide.duration_ms ?? 4_000` flows into the PUT and `add()` sends
  `duration_ms: 4_000` + `playback_mode: "timed"`. The regression test asserts the
  **PUT body itself** — `expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({
  duration_ms: 4_000, elements: [expect.objectContaining({ element_type: "text" })] }))`
  plus a create-slide body assertion — not merely "publish succeeded". The retained
  `!slide || !elements` guard is safe in every reachable state: both branches mean
  "nothing to persist" (`!elements` is unreachable while the slide is dirty, since
  dirty is only ever set alongside a `localCompositions` write, and an empty array
  correctly passes the guard). **(B)** Create-text enters an auto-focused select-all
  inline editor; double-click opens it for existing text; commit-vs-cancel semantics
  are unambiguous and consistent — Escape and blur both call `onCommit`, there is no
  `onCancel` at all (correct, since live `onChange` already writes to the store), and
  the panel textarea remains a live secondary path because both surfaces are controlled
  off the same store value, so they cannot fight. Playback pauses on entry
  (`clock.pause()` + checkpoint), autosave is suppressed while editing, and the edited
  element is excluded from the renderer so it is not double-drawn. **(C)** The
  pointer-inert wrapper is editor-canvas scoped; the upload button and drop targets sit
  on `EditorCanvas` beneath the inert layer and still receive events, `onMediaError` is
  not a pointer event so it survives, and `PreviewOverlay` is untouched by the layering
  (its only diff is the sibling plan's space-hotkey) and remains interactive. **(D)**
  Style mapping omits unset fields in both directions via conditional spread, and
  because flush round-trips through the mapping, "no background" scrubs cleanly
  regardless of transient store state; the round-trip test covers all five fields
  including 8-digit alpha hex (`#DDEEFF88`); slider ranges 0–48 sit inside the backend's
  0–400 so out-of-range is impossible; the parity fixture pins `text_align`,
  `text_color`, `background_color`, `border_radius`, `padding` across runtime, builder
  preview, and player suites. `@beyo/ui` primitives import only `react`,
  `lucide-react`, and `@beyo/lib` — **zero presentation-specific imports** — with three
  domain-agnostic tests; `TextStylingSection` is props-only. **Kit styling scrutiny**
  (Codex-built, per the reviewer brief): `CanvasTextEditOverlay` uses the design
  README's accent `#3f78a8` with the documented `.30` tint, `lineHeight: 1.2` matching
  the measurement model, `backgroundColor ?? "transparent"` for correct "no background"
  WYSIWYG, and an `aria-label`; Tailwind preflight makes the textarea inherit the app
  font, so no font drift versus the renderer. No visual findings. **Step 14 KB
  close-out verified complete** — doc 21 carries the flush default + inline-edit mode,
  doc 22 the new kit pieces (`CanvasTextEditOverlay`, `TextStyling*`, `AlignmentPicker`),
  doc 50 the silent-flush lesson. Two notes, no corrections plan: (1) **Codex (logic),
  medium-low** — `canvasHitAreaHeightFraction` in `EditorView.tsx` is a *second
  measurement path*: it re-implements the adapter's fallback constants (`0.58`
  char-width, `1.2` line-height) plus its own wrap estimation, while the mapping sizes
  text via the `TextMeasurementAdapter` (`measureText`, controller:45) which uses DOM
  `getBoundingClientRect` with `white-space:pre` and models no wrapping — so the two
  genuinely disagree for wrapped text, and the math sits in the view rather than a
  `lib/` module. The `Math.max(layoutHeight, …)` floor means hit areas never shrink, so
  criterion 3 is still met and drag reliability is genuinely improved; the risk is
  latent drift. Remedy: hoist `measureText` into `lib/`, derive the hit-area height from
  it via a pure helper, and unit-test it. (2) **Codex (logic), low** — the omit-unset
  behaviour is implemented correctly but never asserted: the round-trip fixture sets all
  five style fields and `toEqual` ignores undefined-valued keys, so a regression
  emitting `background_color: undefined` would pass. Add a style-free element case and a
  "background → none" round-trip. Summary accuracy: complete and truthful except that it
  omits the doc 21/22/50 updates from its file list (the work was done).

## Lifecycle transition

- Current state: `archived`
- Next state: none — lifecycle complete
- Transition owner: `codex`
