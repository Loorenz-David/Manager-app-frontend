# Review — Slide background color: schemas, editor picker, renderer, player

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for the slide background color feature
in the ManagerBeyo `frontend/` monorepo root. Implementation by a single Codex
session from an approved plan; the panel kit field was pre-built by the Claude
builder session (read-only for Codex). Your job: verify against the plan and
shared rules, then bless or produce a corrections plan. You change no code.

## What was implemented

- Plan (archived):
  `docs/architecture/archives/implementation/PLAN_presentation_slide_background_color_20260723.md`
- Summary:
  `docs/architecture/implemented_summaries/SUMMARY_presentation_slide_background_color_20260723.md`
- Backend ground truth:
  `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`
  (composition PUT with `background_color`) and `05_admin_slides_media.md`
  (slide object; hex `#RRGGBB(AA)`, null = none).

## Read in this order

1. The archived plan — Contract facts, steps 1–8 (step 7 = hardening carried
   from the text-block review), acceptance criteria 1–5, Review log (both
   close-out entries).
2. The summary.
3. The diff / listed files.

## Specific review focus

- **Renderer prop**: `backgroundColor` painted behind ALL sorted elements
  inside the renderer container (not on a host frame — no double-paint/seam in
  player surfaces); parity fixture carries a background-colored slide pinned in
  all three parity suites (runtime, builder preview, player).
- **Write path**: the field flows through the composition PUT
  (`editorCompositionToPutBody`) and the existing autosave/flush; the
  strictObject PUT input schema gained the field (it could not be SENT before);
  `setSlideBackgroundColor` mirrors `setSlideDuration` dirty/revision
  mechanics; reconcile paths preserve the value.
- **All four builder render sites** pass it: canvas workspace, rail thumbnail,
  preview overlay, parity render. A missed thumbnail is the classic partial
  wiring.
- **Consumer leniency (doc 50)**: `z.string().nullable().optional()` and a
  regression test where the field is entirely OMITTED (old cached payloads) —
  parse must succeed. Verify the test asserts the omitted case, not just null.
- **Kit purity**: `SlidePropertiesPanel` field was pre-built (props
  `backgroundColor`/`onBackgroundColorChange`, `@beyo/ui` `ColorSwatchPicker`
  with `allowNone`); Codex must not have altered its DOM/styling.
- **Step 7 hardening (carried review notes)**:
  `packages/presentation-builder/src/lib/text-measurement.ts` is now the
  SINGLE measurement source — verify the controller and the canvas hit-area
  path both consume it and the old view-side fallback constants (0.58 / 1.2 /
  wrap estimation) are gone; style serialization tests assert a style-free
  element emits NO style keys (absence, not `undefined`) and background→none
  round-trips.

> **Known-context — do not re-report:**
> - **Lifecycle deviation, already handled**: the implementing Codex session
>   validated packages but stopped before the lifecycle close-out (it was
>   waiting on an operator-hosted server for Playwright and the reply was
>   missed). The Claude builder session executed the close-out after
>   independently re-verifying the tree, and later completed the deferred
>   Playwright run: studio desktop 10/10 green (2026-07-23, operator-hosted).
>   Both entries are in the archived plan's Review log. Audit the close-out's
>   accuracy; do not report the deviation itself as a defect.
> - The dashboard spec's create-navigation mock was repaired in that Playwright
>   pass (it predated the auto-first-slide behavior); the repair also asserts
>   the timed create defaults. Part of this plan's validation record.
> - A separate fixes plan (`PLAN_presentation_timeline_media_review_corrections_20260723`)
>   may be implemented/archived by the time you review — its parity-fixture
>   edits (legacy layer-0 element) are its own scope, not this plan's.

## General checklist

1. Acceptance criteria 1–5: met, with file/test evidence.
2. Layer rules: kit props-only; hex validation at the schema boundary; no
   app/glue changes (player package renders it — phone apps untouched).
3. Validation: re-run yourself — `npm run typecheck`,
   `npm run test:presentation-runtime`, `npm run test:presentation-builder`,
   `npm run test:presentations`. (Playwright already evidenced 10/10 in the
   Review log; re-run only if the operator offers a server.)
4. Lifecycle bookkeeping: summary accurate against the diff; archive record;
   KB docs 10/21/40 updated and accurate.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity with file:line, tagged **Codex (logic)** or
  **Claude-builder (visual)**.
- If defects: create
  `docs/architecture/under_construction/implementation/PLAN_presentation_slide_background_review_corrections_<YYYYMMDD>.md`
  from `TEMPLATE_PLAN.md`, status `under_construction`.
- Append a dated review entry to the archived plan's Review log.
- Do not modify implementation code, kit components, or the summary.
