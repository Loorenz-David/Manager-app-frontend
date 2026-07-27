# PLAN_presentation_slide_background_color_20260723

## Metadata

- Plan ID: `PLAN_presentation_slide_background_color_20260723`
- Status: `archived`
- Owner agent: `codex` (logic) + `claude-builder` (panel kit field, pre-built)
- Created at (UTC): `2026-07-23T11:30:00Z`
- Last updated at (UTC): `2026-07-23T14:30:00Z`
- Related issue/ticket: operator intention (slide background color), 2026-07-23
- Intention plan: `docs/architecture/under_construction/intention/presentation_capability_improvments.md`
- Knowledge base (READ FIRST): `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`
  — docs 10 (runtime), 21 (editor logic), 40 (player), 50 (invariants)
- **Sequencing**: `PLAN_presentation_timeline_media_corrections_20260723` (in
  flight) edits `draft-store.ts`, `composition-mapping.ts`, `EditorView.tsx`,
  and the controller. This plan starts only after that plan is **archived**
  (its Stage C close-out). The panel kit field may be pre-built anytime —
  `SlidePropertiesPanel` is untouched by the media stages.

## Goal and intent

- Goal: full-stack wiring of the backend's new nullable slide
  `background_color` — typed schemas, a background color picker on the slide
  editor panel, and faithful rendering everywhere a slide is drawn (editor
  canvas, rail thumbnails, preview overlay, phone player).
- Business/user intent: authors can design text-only or trimmed-media slides on
  a deliberate solid color instead of the hardcoded dark canvas.
- Non-goals: gradients/images-as-background (backend supports a single solid
  hex only); per-element background changes (already shipped in the text-block
  plan); backend changes.

## Scope

- In scope: `packages/presentation-runtime` (renderer prop + parity),
  `packages/presentation-builder` (types, draft-store, composition-mapping,
  controller, EditorView, SlidePropertiesPanel kit), `packages/presentations`
  (consumer schema + player pass-through), studio editor Playwright spec.
- Out of scope: phone apps (player package renders it — no glue changes),
  studio shell, backend.
- Assumptions: backend serves `background_color` on every slide object and
  accepts it via slide create/update AND the composition PUT (verified:
  `presentation_documentation/backend/05_admin_slides_media.md` lines 10–32,
  `09_slide_composition.md` lines 155–179; hex `#RRGGBB`/`#RRGGBBAA`, `null` =
  no background).

## Contract facts (verified against source, 2026-07-23)

- Builder `SlideSchema` (`src/types.ts:87`) is a loose `z.object` — the new
  field currently flows through untyped; nothing breaks today, but nothing can
  read it. The composition PUT input schemas are `strictObject` — the field
  CANNOT be sent until it is added there explicitly.
- Consumer `ConsumerPresentationSlideSchema` is `.passthrough()` — same
  situation.
- Runtime `SlideCompositionRendererProps` has no background prop; the canvas
  behind elements is whatever the host paints (editor: dark `#474d56`; player:
  surface frame).
- `TextStyleSchema` already has a `HexColorSchema` (`#RRGGBB(AA)`) — reuse it
  for the slide-level field.
- The editor's write path of least resistance is the composition PUT: the
  autosave/flush pipeline (`editorCompositionToPutBody`) already performs the
  atomic aggregate replace this field belongs to.

## Clarifications required

None — design note: the background paints BEHIND all composition elements; a
full-bleed media element covers it entirely (visible only where media is
trimmed, transparent, contained, or absent). "No background" (null) keeps
today's dark editor canvas / player frame showing through.

## Acceptance criteria

1. Setting a background color on a slide paints it identically in: editor
   canvas, slide-rail thumbnail, preview overlay, and the phone player (parity
   fixture extended with a background-colored slide; all three parity suites
   pin it).
2. The slide panel offers a background color field (reused `@beyo/ui`
   `ColorSwatchPicker`, including a "none" choice mapping to `null`); the value
   round-trips: edit → autosave flush → reload shows the same color; publish
   carries it to the consumer payload.
3. Schemas: builder `SlideSchema` and composition PUT body carry
   `background_color` (hex-validated outbound); consumer slide schema types it
   **leniently** (`.nullable().optional()` — an omitted field must not kill the
   player; doc 50 rule).
4. Editor behavior: changing the color marks the slide dirty and flushes
   through the existing composition autosave (450 ms/2 s debounce paths
   untouched); read-only mode disables the field.
5. Root `npm run typecheck` green; runtime + builder + presentations vitest
   suites green with new coverage; studio editor Playwright spec extended
   (set color → canvas asserts → reload asserts) green on desktop.

## Contracts and skills

### Contracts loaded

- `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`: composition PUT with `background_color`
- `packages/presentation-builder/presentation_documentation/backend/05_admin_slides_media.md`: slide object shape
- `packages/presentation-builder/presentation_documentation/frontend/10_runtime_package.md`: renderer two-sided contract, parity duty
- `packages/presentation-builder/presentation_documentation/frontend/21_builder_editor_logic.md`: flush/reconcile ownership
- `packages/presentation-builder/presentation_documentation/frontend/50_invariants_and_pitfalls.md`: consumer-schema leniency (silent parse death)
- `task_system/frontend_contract_goal_mapping_guide.md`: file-read discipline

### Local extensions loaded

- none

### File read intent — pattern vs. relational

Standard rule applies. Relational reads: runtime `schemas.ts` +
`SlideCompositionRenderer.tsx` + `rendering-parity-fixture.ts`; builder
`types.ts`, `draft-store.ts`, `composition-mapping.ts`, controller flush path,
`EditorView.tsx`, `SlidePropertiesPanel.tsx` (kit — read-only);
`packages/presentations` `types.ts` + `PresentationPlayer.tsx`.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: plan lifecycle, summary, archive
- Excluded alternatives: none

## Implementation plan

Single Codex session (narrow, ordered bottom-up). The panel kit field is
pre-built by the builder agent and read-only for Codex.

1. **Runtime**: add `backgroundColor?: string | null` to
   `SlideCompositionRendererProps`; paint it as the renderer container's
   background (behind all sorted elements, inside the rounded canvas). Extend
   `rendering-parity-fixture.ts` with a background-colored slide case; runtime
   renderer tests assert the style.
2. **Builder schemas** (`types.ts`): `SlideSchema.background_color:
   HexColor.nullable()` (import/re-declare the hex regex consistently);
   composition PUT body + `CompositionPutBody` type gain optional
   `background_color: string | null`; `UpdateSlideInputSchema` gains it too
   (secondary path, kept in sync with the backend contract).
3. **Editor state**: `EditorComposition` (composition-mapping) gains
   `backgroundColor: string | null`; `serverElementsToEditorComposition` reads
   it from the slide, `editorCompositionToPutBody` sends it. Draft-store: new
   `setSlideBackgroundColor(slideId, color | null)` marking the slide dirty
   (same revision/dirty mechanics as `setSlideDuration`); reconcile paths
   preserve it.
4. **Wiring** (`EditorView` + controller): slide panel props → store setter;
   renderer `backgroundColor` passed at all four render sites in the builder
   (canvas workspace, rail thumbnail, preview overlay) from the
   slide/local-composition state.
5. **Consumer + player**: `ConsumerPresentationSlideSchema.background_color:
   z.string().nullable().optional()`; `PresentationPlayer` passes it to the
   renderer. Regression test mirroring the null-category pattern: a payload
   WITHOUT the field parses; with null parses; with a hex renders.
6. **Tests**: mapping round-trip (set / null / omitted); flush test asserting
   the PUT body carries the color; panel wiring test; player parity case;
   Playwright: pick a color → canvas background asserted → reload → still set
   → clear to none → dark canvas returns.
7. **Hardening (carried notes from the text-block review, PASS-WITH-NOTES
   2026-07-23 — same files, folded here instead of a micro-plan):**
   - Hoist `measureText` from the controller into a `lib/` module as the single
     text-measurement source; derive `EditorView`'s `canvasHitAreaHeightFraction`
     from it (deleting the view's re-implemented fallback constants
     0.58/1.2 + wrap estimation); unit-test the module. (Reviewer:
     medium-low — latent drift between two measurement paths for wrapped text.)
   - Style serialization tests: a style-free text element round-trips with NO
     style keys emitted (assert absent, not `undefined` — `toEqual` masks
     this), and a "background → none" round-trip. (Reviewer: low — omit-unset
     implemented correctly but never asserted.)
8. **Close-out**: plan lifecycle skill; KB updates — doc 10 (renderer prop),
   doc 21 (background color in composition state/flush + measureText's new
   home), doc 40 (consumer field), doc 50 only if a new pitfall emerged.

## Risks and mitigations

- Risk: consumer schema tightening kills the player on older cached payloads
  missing the field.
  Mitigation: `.nullable().optional()` + the explicit omitted-field regression
  test (criterion 3) — this is the doc-50 lesson applied proactively.
- Risk: renderer background double-paints against surface/frame backgrounds in
  the player (visual seam at rounded corners).
  Mitigation: paint inside the renderer container only; parity tests + kit
  preview eyeball; player frames already clip content.
- Risk: merge collision with the in-flight timeline/media plan (same editor
  files).
  Mitigation: hard sequencing gate — this plan starts only after that plan is
  archived; the prompt verifies it.

## Validation plan

- `npm run typecheck`: zero errors
- `npm run test:presentation-runtime`: green incl. background parity case
- `npm run test:presentation-builder`: green incl. round-trip/flush/panel tests
- `npm run test:presentations`: green incl. lenient-schema regression
- Studio editor Playwright spec `--project=desktop` (operator starts servers)
- Manual (operator): colored slide authored → published → phone player shows it

## Review log

- 2026-07-23 claude-builder: panel kit field pre-built (read-only for Codex) —
  `SlidePropertiesPanel` gained optional `backgroundColor` /
  `onBackgroundColorChange` rendering a `@beyo/ui` `ColorSwatchPicker`
  (`allowNone`, null = none); `TimelineKitPreview` demos it. Builder typecheck
  green (the one red draft-store test at this timestamp is the timeline/media
  Stage B session mid-flight in the shared tree — unrelated). Prompt:
  `prompts/PROMPT_slide_background_color.md`.
- 2026-07-23 claude-builder: text-block Opus review returned PASS-WITH-NOTES;
  its two Codex-tagged notes (measureText single-source for canvas hit areas;
  omit-unset / background→none serialization assertions) folded into this
  plan's step 7 — same files, next session, no separate corrections plan
  (reviewer's own disposition).
- 2026-07-23 claude-builder (close-out on behalf of the implementing session,
  which validated but skipped lifecycle): implementation verified complete —
  steps 1–7 delivered incl. both hardening remedies and KB docs 10/21/40;
  independently re-ran validation: typecheck exit 0, runtime 20/20, builder
  150/150, presentations 20/20 (the three mid-flight red items from the
  timeline/media review's operator notes are all fixed). Summary + archive
  record written; plan archived. Studio Playwright deferred to the next
  operator-hosted batch.
- 2026-07-23 claude-builder: operator-hosted Playwright batch run — studio
  desktop suite 10/10 green (dashboard, editor shell, editor timeline incl.
  background color scenario, publish, auth). One stale spec repaired in the
  process: presentation-dashboard's create-navigation mock predated the
  empty-draft auto-first-slide behavior; its catch-all trapped the editor's
  `POST /slides` and failed a limit assertion. Added a slides-POST branch that
  also asserts the timed create defaults (`duration_ms: 4000`,
  `playback_mode: "timed"`). Validation for this plan is now complete.

- 2026-07-23 Claude (Opus independent review): **PASS-WITH-NOTES.** Acceptance
  criteria 1–5 all met with evidence; no defects; no corrections plan. Re-ran
  validation myself: `npm run typecheck` exit 0; `test:presentation-runtime`
  20/20; `test:presentation-builder` **155/155** (higher than the summary's 150
  because the sibling parity-fixes plan landed after close-out — not a
  discrepancy); `test:presentations` 20/20. Playwright not re-run (10/10 already
  evidenced above). **Renderer**: `backgroundColor` is painted on the renderer's
  own container div (`SlideCompositionRenderer.tsx`), behind all
  `sortCompositionElements` output and inside the clipped canvas — not on a host
  frame, so no double-paint or rounded-corner seam; `backgroundColor ?? undefined`
  means null/omitted correctly lets the editor's dark canvas or the player frame
  show through. The background-coloured slide is pinned in **all three** parity
  suites (runtime asserts `rgb(16, 42, 67)`, builder preview and
  `PresentationPlayer.parity.test.tsx` both assert
  `renderingParityBackgroundColorFixture`). **All four builder render sites plus
  the player pass it** — preview overlay (`EditorView.tsx:91`), rail thumbnail
  (`:116`, with the value supplied at the call site `:543`), canvas workspace
  (`:233`), and `PresentationPlayer.tsx:110`; the classic missed-thumbnail
  partial wiring did not occur. The canvas render guard was also widened to
  `elements.length > 0 || backgroundColor !== null`, so a background-only slide
  still renders — a good catch. **Write path**: both `strictObject` inputs gained
  the field (`types.ts:246` update-slide, `:391` composition PUT) so it can
  finally be SENT, `SlideSchema` types it hex-validated (`:99`),
  `editorCompositionToPutBody` emits `background_color`
  (`composition-mapping.ts:180`) through the untouched autosave/flush.
  `setSlideBackgroundColor` mirrors `setSlideDuration` exactly — writes the store
  presentation slide, marks dirty, bumps both `slideRevisions` (so the memoised
  `RailThumbnail` actually refreshes) and the global revision, and no-ops when
  unchanged. Reconcile is correct **including the subtle cross-slide case**:
  `reconcileAfterFlush` preserves `background_color` for other still-dirty slides
  alongside `playback_mode`/`duration_ms` (`draft-store.ts:333`), so flushing one
  slide cannot clobber another's unsaved colour. **Consumer leniency**: schema is
  `z.string().nullable().optional()` (`presentations/src/types.ts:41`, correctly
  NOT hex-validated inbound), and the regression test genuinely asserts the
  **omitted** case — `types.test.ts:25` does `delete slide.background_color` so
  the key is truly absent, not `undefined`, then asserts `parsed.success`. That
  is the doc-50 rule properly applied. **Kit purity**: `SlidePropertiesPanel`
  imports only `@beyo/ui`'s `ColorSwatchPicker` plus local panel primitives, is
  props-only (`backgroundColor?` / `onBackgroundColorChange?`), renders the
  picker conditionally so omitting the prop leaves DOM unchanged, and honours
  `readOnly` — criterion 4's read-only requirement included. **Step 7 hardening
  (my carried text-block notes) is properly closed**: `lib/text-measurement.ts`
  is now the single source consumed by both the controller/mapping
  (`controller:31`) and the canvas hit area (`EditorView:49`), the view's
  re-implemented `0.58`/`1.2`/wrap constants are gone, and — importantly — the
  module models wrapping via `maxWidthPx` + `white-space: pre-wrap` (with a
  matching wrap model in the approximate fallback), which is exactly the trap I
  flagged: a naive reuse of the old adapter would have shrunk hit areas back to
  one line. The serialization gap is closed too: `composition-mapping.test.ts:353`
  asserts a style-free element emits **no** style keys via
  `not.toHaveProperty(...)` (absence, not `undefined` — the thing `toEqual`
  masked) and round-trips background→none. **KB docs 10/21/40 accurate** against
  the code (renderer prop + transparency semantics; store mutator +
  text-measurement's new home + composition state; consumer leniency with the
  silent-parse warning and player pass-through). Two **notes, neither a defect of
  this plan**: (1) **Codex (logic), low — carried residue, out of this plan's
  scope.** The mapping still calls `measureText` without `maxWidthPx`
  (`composition-mapping.ts:135`), so the persisted `layout.height` measures text
  as one unwrapped line, while the view's hit area now models wrapping. The
  plumbing divergence I originally reported is fixed; what remains is a semantic
  divergence by parameterisation, and it is a genuine design constraint —
  `editorElementToPutInput` derives `layout.width` *from* the measurement, so it
  cannot pass a max width on the first pass. Remedy when it matters: two-pass
  measure (intrinsic → clamp width → re-measure height at the clamped width).
  Consequence, as traced in the text-block review: element-level
  `background_color` behind wrapping text under-covers. Step 7 asked only for
  single-source plus the serialization assertions, and both were delivered. (2)
  **Bookkeeping, trivial** — this plan's Lifecycle transition block below still
  reads `approved` while Metadata reads `archived`; the close-out updated the
  latter only.

## Lifecycle transition

- Current state: `approved` (operator approved 2026-07-23 — no open
  clarifications; flip recorded retroactively, implementation already underway)
- Next state: `debugging` → archive via close-out (plan lifecycle skill)
- Transition owner: codex / operator
