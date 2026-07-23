# Review — Text-block corrections: publish flush bug, inline canvas editing, drag reliability, reusable styling toolkit

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for the presentation text-block
corrections in the ManagerBeyo `frontend/` monorepo root. The capability itself
(9 phases) is complete and archived; this is the first post-capability
correction cycle. The implementation was done by a Codex session from an
approved plan. Your job: verify it against the plan and the shared rules, then
bless it or produce a corrections plan. You change no code.

## What was implemented

- Plan (archived after validation):
  `docs/architecture/archives/implementation/PLAN_presentation_text_block_corrections_20260723.md`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_presentation_text_block_corrections_20260723.md`
- Knowledge base (the project's navigation docs — also part of what you audit):
  `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`

## Read in this order

1. The archived plan — Root-cause findings, Clarifications (both resolved to
   the stated defaults), Acceptance criteria 1–6, stage steps, close-out
   step 14.
2. The summary.
3. The implementation (diff of the correction commits if available, else the
   files the summary lists).
4. Ground truth when checking payloads:
   `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`
   (note: the documentation set moved here from `docs/presentation_capability/`
   — the new location is correct, do not report the move).

## Specific review focus

- **(A) Publish flush fix**: `flushSlide` must no longer silently no-op on
  `duration_ms: null` — the PUT must carry an effective 4000 ms duration (which
  heals existing null-duration drafts); slide creation must send timed defaults.
  Verify the regression test actually asserts the PUT body (element present +
  duration), not just "publish succeeded". This bug's essence was a *silent
  false success* — confirm no other early-return in `flushSlide` can still
  report success without persisting (`!slide || !elements` guard remains: is
  that safe in every reachable state?).
- **(B) Inline editing**: create-text → auto-focused select-all inline editor;
  double-click opens it for existing text; Escape/blur/outside-click commits;
  playback pauses while editing. Check commit-vs-cancel semantics (does Escape
  discard or commit? plan says commit — either is defensible but code, tests,
  and panel sync must agree) and that the panel textarea stays a live secondary
  path without fighting the inline editor.
- **(C) Pointer layering**: the canvas renderer wrapper must be
  `pointer-events-none select-none` WITHOUT breaking: empty-state upload
  button, drag-drop upload onto the phone, media error handling, or the
  preview overlay (which must remain interactive — the change is editor-canvas
  scoped). Overlay hit areas now use measured text height — verify the measured
  value comes from the same adapter the mapping uses (single source), not a
  second measurement path.
- **(D) Styling toolkit**: `EditorTextElement` ⇄ wire round-trip for
  `text_align`, `text_color`, `background_color`, `border_radius`, `padding` —
  runtime `TextStyleSchema` is `strictObject` with `HexColorSchema`
  (#RRGGBB[AA]): unset values must be OMITTED (not null/undefined-serialized),
  "no background" must round-trip cleanly, and out-of-range slider values must
  be impossible. Parity fixture: styled text pinned across runtime + builder
  preview + player suites. `@beyo/ui` primitives must have ZERO
  presentation-specific imports (grep their imports) and their own tests.
- **KB close-out (step 14)**: the plan required updating
  `presentation_documentation/frontend/21_builder_editor_logic.md` (flush
  default, inline edit mode), `22_builder_component_kits.md` (new kit pieces +
  ui primitives), and `50_invariants_and_pitfalls.md` (silent-flush lesson).
  The summary does not mention this — verify it happened; if not, it is a
  finding (docs, not code).

> **Known-context — do not re-report:**
> - The division-of-labor rule says kit components are built by the Claude
>   builder session; here Codex built them (`CanvasTextEditOverlay`,
>   `packages/ui/src/components/text-styling/*`, `TextStylingSection`) with the
>   operator's knowledge. Do NOT flag this as a process violation — but DO
>   scrutinize those components' styling fidelity extra hard (design tokens,
>   states, a11y), since kit styling is exactly Codex's known weak spot. Tag
>   visual findings **Claude-builder (visual)**.
> - A sibling plan `PLAN_presentation_timeline_media_corrections_20260723.md`
>   (approved, in flight) covers space-hotkey + media timeline work — its scope
>   is not missing work from THIS plan.
> - Border stroke was deliberately excluded (backend has no stroke fields) —
>   recorded in the plan's resolved clarifications.
> - The intention file `presentation_capability_improvments.md` is empty by
>   design (the operator briefed verbally); not a finding.

## General checklist

1. Every acceptance criterion (1–6): met, with file/test evidence.
2. Layer rules: kits stay props-only (no hooks/api imports); all arithmetic in
   `lib/` logic modules; controller/view ownership per KB doc 21.
3. Scope: nothing from the sibling media plan built early; nothing silently
   dropped (criterion 5's "reusable, demonstrated via kit preview" included).
4. Validation: re-run yourself — `npm run typecheck`,
   `npm run test:presentation-builder`, `npm run test:presentation-runtime`,
   `npm run test:ui`, `npm run test:presentations`. Do not trust the summary's
   claims. (Playwright needs the operator's dev server — ask, never start one.)
5. Lifecycle bookkeeping: plan archived with archive record, summary complete
   and accurate (spot-check its claims against the diff).

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity, each with file:line and the criterion/rule
  violated, tagged **Codex (logic)** or **Claude-builder (visual)**.
- If defects: create
  `docs/architecture/under_construction/implementation/PLAN_presentation_text_block_review_corrections_<YYYYMMDD>.md`
  from `TEMPLATE_PLAN.md`, scoped to fixes only, status `under_construction`.
- Append a dated review entry to the archived plan's Review log (historical
  ledger — the file stays in `archives/implementation/`).
- Do not modify implementation code, kit components, or the summary.
