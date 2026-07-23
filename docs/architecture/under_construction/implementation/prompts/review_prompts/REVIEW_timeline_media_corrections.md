# Review — Timeline/media corrections: space hotkey, unified media tracks, canvas resize, media transitions

Paste this whole prompt into a fresh Claude (Opus) review session.

---

You are the **implementation reviewer** for the presentation timeline/media
corrections in the ManagerBeyo `frontend/` monorepo root. Implementation was
done by three staged Codex sessions (A: space hotkey · B: unified media
tracks + multi-upload · C: canvas resize + media transitions) from an approved
plan; component kits were pre-built by the Claude builder session and were
read-only for Codex. The operator has already confirmed the behavior manually
in a live session. Your job: verify the implementation against the plan and the
shared rules, then bless it or produce a corrections plan. You change no code.

## What was implemented

- Plan (archived after Stage C close-out):
  `docs/architecture/archives/implementation/PLAN_presentation_timeline_media_corrections_20260723.md`
  — read its Review log for the three per-stage evidence lines + the
  kit-prebuild line.
- Summary:
  `docs/architecture/implemented_summaries/SUMMARY_PLAN_presentation_timeline_media_corrections_20260723.md`
  (note: filename carries a stray `PLAN_` prefix — known cosmetic deviation,
  report it only as a note).
- Knowledge base:
  `packages/presentation-builder/presentation_documentation/frontend/INDEX.md`
  (docs 21, 22, 50 were required to be updated by the close-out — audit them).

## Read in this order

1. The archived plan — Root-cause findings, resolved Clarifications (unified
   media model / aspect-locked corners / preview-overlay space), Acceptance
   criteria 1–7, stage steps, close-out step 12.
2. The summary.
3. The implementation diff (or the files the summary lists).
4. Backend ground truth:
   `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`
   and `05_admin_slides_media.md`.

## Specific review focus

- **(A) Space hotkey** — the guard must be structural (closest
  input/textarea/select/contenteditable), not an allowlist; `preventDefault`
  must kill both page scroll AND the focused-play-button double-toggle;
  suppressed while the publish dialog is open; active in read-only; preview
  overlay space support included. Check the hook was NOT mounted in a way that
  leaks listeners across slide changes or editor unmount.
- **(B) Unified media model** — first media defaults full-bleed +
  `start_ms: 0, end_ms: null`; later media default at the playhead;
  `replaceBackgroundMediaElement`/`appendOverlayMediaElement` fully collapsed
  (grep for stragglers — including in tests and the KB); `timedElements` no
  longer excludes layer 0. **Back-compat is the highest-risk item**: existing
  published decks with layer-0 wire data must render identically in editor,
  preview, AND player — verify the regression test actually pins rendering
  output, not just parsing.
- **Upload queue** — strictly sequential (no parallel uploads interleaving
  flush/reconcile); failure stops the queue with retry of the failed file, not
  the whole batch restarted with duplicates; abort cancels the remainder;
  `files[0]`-only behavior gone from both drop and picker paths.
- **(C) Resize geometry** — pure module, exhaustively tested (all 8 handles,
  aspect-locked corners per the resolved clarification, free edges, minimum
  size, canvas clamping); the kit's `CanvasResizeGesture` raw fractions are the
  ONLY input (no DOM math in the view beyond delta capture); center-anchored
  math (each moved edge shifts center by half its travel) matches the kit
  preview's reference implementation.
- **Media transitions** — panel appears/disappears flow through the SAME
  `editorAnimationToWire` path text uses (no forked mapping); wire output is
  `fade`/`fade_up` + 450 ms; renders in canvas, preview, player (parity).
- **Division of labor** — diff the kit files (`TimelineControls`,
  `TimelineBar`, `TimelineTrack`, `CanvasDraggableBox`, `MediaElementPanel`,
  `SlidePropertiesPanel`, `panels/animation-options.ts`, kit previews): Codex
  must not have changed their DOM/classes/styling. Any restyle is a finding.
- **KB close-out audit** — docs 21 (transport hotkey, unified model, upload
  queue, resize geometry), 22 (resize-handle gesture contract, new kit
  pieces), 50 ("no untimed elements" invariant added; background/overlay
  terminology retired). Shallow greps confirm edits exist; you audit accuracy.

> **Known-context — do not re-report:**
> - Kit components were pre-built by the Claude builder session (logged in the
>   plan's Review log) — the division-of-labor rule was followed here.
> - `SlidePropertiesPanel` also gained an unwired optional
>   `backgroundColor`/`onBackgroundColorChange` field and the package index
>   exports `CanvasResizeGesture`/`AnimationChoice` types — these belong to the
>   NEXT plan (`PLAN_presentation_slide_background_color_20260723.md`,
>   under_construction) and are intentionally dormant; not scope creep.
> - The sibling text-block corrections plan was implemented and separately
>   reviewed; its inline-edit/styling changes in the same files are not this
>   plan's scope.
> - The summary filename's stray `PLAN_` prefix: note-level only.

## General checklist

1. Every acceptance criterion (1–7): met, with file/test evidence.
2. Layer rules: kits props-only; ALL arithmetic in `lib/` pure modules;
   controller/view ownership per KB doc 21.
3. Scope: media plan only — nothing from the slide-background plan built
   early (beyond the declared dormant kit field); nothing silently dropped
   (e.g. multi-select on the "+ Media" picker, per-file progress).
4. Validation: re-run yourself — `npm run typecheck`,
   `npm run test:presentation-builder` (expect ≥141 tests),
   `npm run test:presentation-runtime`, `npm run test:presentations`.
   (Playwright needs the operator's dev server — ask, never start one.)
5. Lifecycle bookkeeping: plan archived with archive record; summary complete
   and accurate against the diff; Review log carries all three stage lines.

## Output

- **Verdict**: pass / pass-with-notes / defects found.
- Findings ranked by severity, each with file:line and the criterion/rule
  violated, tagged **Codex (logic)** or **Claude-builder (visual)**.
- If defects: create
  `docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_review_corrections_<YYYYMMDD>.md`
  from `TEMPLATE_PLAN.md`, scoped to fixes only, status `under_construction`.
- Append a dated review entry to the archived plan's Review log.
- Do not modify implementation code, kit components, or the summary.
