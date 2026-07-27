# PLAN_presentation_timeline_media_review_corrections_20260723

## Metadata

- Plan ID: `PLAN_presentation_timeline_media_review_corrections_20260723`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-07-23T11:10:00Z`
- Last updated at (UTC): `2026-07-23T11:30:00Z`
- Related issue/ticket: Opus review of `PLAN_presentation_timeline_media_corrections_20260723`
- Intention plan: `docs/architecture/under_construction/intention/presentation_capability_improvments.md`
- Reviewed plan (archived): `docs/architecture/archives/implementation/PLAN_presentation_timeline_media_corrections_20260723.md`
- Knowledge base: `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`

## Goal and intent

- Goal: replace the vacuous layer-0 back-compat "parity" test with a real
  three-way pin (runtime + builder preview + player), and stop it leaking DOM
  into sibling tests. Fixes only — no behavior change.
- Business/user intent: the plan's own highest-risk item (existing published
  decks with layer-0 wire data must render identically after the unified media
  model) must actually be protected by a test that can fail.
- Non-goals: any timeline/media behavior change; the unified media model itself
  (reviewed and correct); the unrelated red items listed under "Operator note".

## Scope

- In scope: `packages/presentation-runtime/src/rendering-parity-fixture.ts`
  (add a legacy layer-0 media element), `packages/presentation-builder/src/preview/rendering-parity.test.tsx`
  (delete the self-comparison test, assert concrete output, add cleanup),
  `packages/presentations/src/PresentationPlayer.parity.test.tsx` (cover the new
  fixture element).
- Out of scope: controller, draft-store, composition-mapping, timeline-geometry,
  EditorView, kits — all reviewed and passing.
- Assumptions: `rendering-parity-fixture.ts` remains the single shared source
  consumed by the runtime, builder-preview, and player parity suites (verified:
  it is imported by `presentation-builder/src/preview/rendering-parity.test.tsx`
  and `presentations/src/PresentationPlayer.parity.test.tsx`, and documented in
  KB docs 10 and 60).

## Clarifications required

- [ ] None. The remedy is mechanical and the reviewed plan's criterion already
      states the required outcome.

## Acceptance criteria

1. `rendering-parity-fixture.ts` contains a legacy-shaped media element
   (`layer_index: 0`, `start_ms: 0`, `end_ms: null`, `layout {x:0,y:0,width:1,height:1,fit:"cover"}`,
   i.e. pre-unification wire data) alongside the existing text element.
2. The builder preview parity test asserts **concrete** rendered values for that
   element (position/size/object-fit at reference scale), in the same style as
   the existing `renders the shared composition recipe at reference scale` case —
   not a comparison of one render against another render.
3. The runtime suite and `PresentationPlayer.parity.test.tsx` both exercise the
   same fixture element, so editor, preview, and player are pinned by one source.
4. The self-comparing test at `rendering-parity.test.tsx` (two
   `SlideCompositionRenderer` instances asserted equal to each other) is deleted.
5. `rendering-parity.test.tsx` registers `afterEach(cleanup)` so no test in the
   file leaks mounted renderers into sibling tests.
6. `npm run test:presentation-builder`, `npm run test:presentation-runtime`, and
   `npm run test:presentations` are green, and the
   `Found multiple elements by: [data-testid="slide-composition-renderer"]`
   failure is gone.

## Contracts and skills

### Contracts loaded

- `packages/presentation-builder/presentation_documentation/frontend/10_runtime_package.md`: shared parity fixture ownership
- `packages/presentation-builder/presentation_documentation/frontend/60_testing_playbook.md`: parity-suite conventions
- `architecture/17_testing.md`: test hygiene (cleanup, meaningful assertions)

### Local extensions loaded

- none

### File read intent — pattern vs. relational

Relational reads only: the three parity test files and the shared fixture. Do
not pattern-read other suites for structure — the existing
`renders the shared composition recipe at reference scale` case in
`rendering-parity.test.tsx` is the in-file reference for assertion style.

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`
- Trigger terms: plan lifecycle, summary, archive
- Excluded alternatives: none

## Implementation plan

1. Add the legacy layer-0 media element to `rendering-parity-fixture.ts`
   (export it as part of the shared composition, or as a named sibling export if
   adding it to the main array would disturb existing assertions).
2. Delete the self-comparing layer-0 test from `rendering-parity.test.tsx`;
   replace it with concrete-value assertions against the fixture element.
3. Add `afterEach(cleanup)` to `rendering-parity.test.tsx`.
4. Extend the runtime and player parity suites to assert the same element.
5. Run the three suites; confirm green and that the multiple-elements failure is
   resolved.

## Risks and mitigations

- Risk: adding an element to the shared fixture breaks existing parity
  assertions that index into the array.
  Mitigation: check index-based assertions first; prefer a named sibling export
  if any assertion is positional.
- Risk: concrete pixel assertions are brittle across environments.
  Mitigation: mirror the existing case, which already asserts exact px values at
  a fixed 390×690 reference size and uses `toBeCloseTo` for float positions.

## Validation plan

- `npm run test:presentation-builder`: green
- `npm run test:presentation-runtime`: green
- `npm run test:presentations`: green
- `npm run typecheck`: no new errors introduced by this plan

## Operator note — pre-existing red items NOT in this plan's scope

The working tree is currently red for reasons unrelated to the timeline/media
work. These belong to the adjacent in-flight sessions, not here:

- `npm run typecheck` fails with two `TS6196` errors in
  `packages/presentation-builder/src/lib/composition-mapping.ts` (lines 13, 15):
  `TextMeasurement` / `TextMeasurementInput` are imported but only re-exported,
  so the import binding is unused. Introduced by the `lib/text-measurement.ts`
  extraction. One-line fix: drop the two names from the `import type`, keep the
  `export type … from "./text-measurement"`.
- `packages/presentation-builder/src/lib/text-measurement.test.ts` fails on
  float precision (`115.99999999999999` vs `116`) — use `toBeCloseTo`.
- `packages/presentation-runtime/src/SlideCompositionRenderer.test.tsx` fails
  with `Invalid Chai property: toHaveStyle` on the new
  "paints the slide background" case — the runtime package's vitest setup does
  not register `@testing-library/jest-dom`. Belongs to
  `PLAN_presentation_slide_background_color_20260723`.

## Review log

- 2026-07-23 Claude (Opus review of the timeline/media plan): created this
  fixes-only plan for the single defect found (finding 1 of that review).
- 2026-07-23 Codex: defect closed. Added old-wire layer-0 media to the shared
  runtime fixture; runtime, builder preview, and phone player now pin its
  `0px` position, `390px × 690px` size, and `object-fit: cover`. Removed the
  identical-render self-comparison and added builder `afterEach(cleanup)`.
  The three package suites and root typecheck are green. Non-vacuity was
  verified by temporarily changing the builder width expectation from
  `390px` to `391px`: the targeted parity test failed with actual `390px`,
  then passed after restoration.
- 2026-07-23 Claude (Opus review — closes the finding I raised): **PASS.** All six
  review-focus items verified. **(1) The pin is real.** The shared
  `rendering-parity-fixture.ts` now leads with a legacy layer-0 media element in
  genuine old wire shape — `layer_index: 0`, `start_ms: 0`, `end_ms: null`,
  `layout {x:0, y:0, width:1, height:1, fit:"cover"}` — which matches backend
  `09_slide_composition.md`'s own full-bleed media example exactly (x/y are
  top-left, untimed via `end_ms: null`) and reproduces what the retired
  `replaceBackgroundMediaElement` used to emit. The self-comparison test is
  **gone**, replaced by `renders legacy layer-0 media at reference scale`
  asserting concrete output (`left 0px`, `top 0px`, `width 390px`,
  `height 690px`, `objectFit cover`). All **three** suites pin the same element
  from the one fixture: runtime `SlideCompositionRenderer.test.tsx:82-87` (raw
  `.style` reads), builder `rendering-parity.test.tsx` (`toHaveStyle`), and
  player `PresentationPlayer.parity.test.tsx:35-42` (`toHaveStyle`) — so editor,
  preview, and player are now genuinely covered, which is what the original
  criterion required and the old test never delivered. **(2) It can fail.** The
  implementing entry documents the required non-vacuity check (`390px` → `391px`
  flipped, targeted test failed with actual `390px`, restored), so I did not
  repeat the mutation; independently, the assertions are concrete literals
  against a real render and `getByAltText` throws if the element is absent, so
  they are falsifiable by construction — the defining difference from the
  tautological version. **(3) No leak.** `afterEach(cleanup)` is registered in
  the builder parity file, and the sibling test additionally scopes its query via
  `view.container.querySelector` instead of a global `getByTestId`; the
  `Found multiple elements by: [data-testid="slide-composition-renderer"]`
  failure is gone. **(4) Scope discipline holds** — changes are the shared
  fixture plus test files only; the sole non-test edit is type-only (the
  `import type` in `composition-mapping.ts` now pulls just
  `TextMeasurementAdapter`, leaving the independent `export type … from
  "./text-measurement"` intact), with zero runtime behavior. Per-plan diff
  isolation is not possible while the tree is uncommitted, but no behavior diff
  exists in the parity surface. **(5) Validation re-run by me:**
  `npm run typecheck` exit 0; `test:presentation-builder` 19 files / **150
  passed**; `test:presentation-runtime` 4 files / **20 passed**;
  `test:presentations` 7 files / **20 passed**. **(6) Bookkeeping complete** —
  plan archived, summary and archive record present, and a closing entry landed
  on the archived timeline/media plan's Review log. Note (no action): the three
  pre-existing red items I had recorded as operator notes in this plan
  (`TS6196` unused imports, the `text-measurement` float assertion, and the
  runtime `toHaveStyle` matcher) are all resolved in the current tree as well —
  test-only or type-only fixes, so no behavior risk, though I cannot attribute
  them to this session versus an adjacent one. The defect is closed.

## Lifecycle transition

- Current state: `archived`
- Next state: none; create a nested debug plan only if another defect is found
- Transition owner: complete
