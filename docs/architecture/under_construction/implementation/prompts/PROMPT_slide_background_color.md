# Codex — Slide background color (full-stack: schemas → editor → player)

You are implementing an approved plan, working in the `frontend/` monorepo root.
Single session, ordered bottom-up (runtime → builder → presentations).

**Verify first — STOP and report if any fails:**
1. The timeline/media corrections plan is ARCHIVED (not merely implemented):
   `PLAN_presentation_timeline_media_corrections_20260723.md` exists in
   `docs/architecture/archives/implementation/`. This plan edits the same
   editor files — starting early causes merge damage.
2. The panel kit field is pre-built (kit files are READ-ONLY for you):
   `rg "onBackgroundColorChange" packages/presentation-builder/src/components/panels/SlidePropertiesPanel.tsx`
   is non-empty.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_slide_background_color_20260723.md`
— Contract facts, implementation steps 1–7, acceptance criteria 1–5.

Key facts (already verified — don't re-derive): backend serves nullable
`background_color` (hex `#RRGGBB(AA)`) on every slide and accepts it on the
composition PUT (the editor's natural write path — the autosave flush already
does the atomic aggregate replace). Builder `SlideSchema` is a loose object
(field flows untyped today); the composition PUT input is `strictObject` — the
field cannot be SENT until added there. The runtime renderer has no background
prop. Consumer slide schema is passthrough.

## Read (only this)

1. The plan (sections above).
2. Backend contract: `packages/presentation-builder/presentation_documentation/backend/09_slide_composition.md`
   (PUT body + hex/null rules) and `05_admin_slides_media.md` (slide object).
3. Knowledge base doc 50 (consumer-schema leniency — the silent-parse-death
   rule governs step 5).
4. Relational: runtime `schemas.ts` (HexColorSchema) +
   `SlideCompositionRenderer.tsx` + `rendering-parity-fixture.ts`; builder
   `types.ts` (SlideSchema:87, PUT input schemas), `draft-store.ts`
   (`setSlideDuration` as the pattern), `composition-mapping.ts`
   (`EditorComposition`, both directions), controller flush path,
   `EditorView.tsx` (four renderer sites), `SlidePropertiesPanel.tsx`
   (read-only — the field's props are `backgroundColor` /
   `onBackgroundColorChange`, null = none); presentations `types.ts` +
   `PresentationPlayer.tsx`.

## Deliver

Follow plan steps 1–7 exactly. Step 7 carries two small hardening remedies
from the text-block Opus review (PASS-WITH-NOTES) — hoist `measureText` to
`lib/` as the single measurement source feeding both the mapping and the
canvas hit areas (+ unit tests), and add the omit-unset / background→none
style serialization assertions. Same files as this plan; in scope here.

1. Runtime: `backgroundColor?: string | null` renderer prop painted behind all
   elements; parity fixture gains a background-colored slide; renderer test.
2. Builder schemas: `SlideSchema.background_color` (hex, nullable);
   composition PUT body + `UpdateSlideInputSchema` gain it.
3. Editor state: `EditorComposition.backgroundColor`; both mapping directions;
   draft-store `setSlideBackgroundColor` (dirty + revision mechanics mirroring
   `setSlideDuration`); reconcile preserves it.
4. Wiring: panel props → store setter; renderer `backgroundColor` at ALL FOUR
   builder render sites (canvas workspace, rail thumbnail, preview overlay —
   find the fourth: the parity test render).
5. Consumer + player: `background_color: z.string().nullable().optional()`
   (LENIENT — omitted field must parse; mirror the null-category regression
   pattern) and player pass-through.
6. Tests per the plan's validation section, including the Playwright
   set-color → assert → reload → clear-to-none scenario.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime`
- `npm run test:presentation-builder`
- `npm run test:presentations`
- Studio editor Playwright spec `--project=desktop` (ask the operator to start
  the studio server — NEVER start it yourself)

## Finish

Run `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` for this plan
(summary → archive → review-log). KB updates per plan step 8: doc 10 (renderer
prop), doc 21 (background color in composition state/flush), doc 40 (consumer
field). Clean-boundary rule: never stop before writing code; if blocked, report
precisely where.
