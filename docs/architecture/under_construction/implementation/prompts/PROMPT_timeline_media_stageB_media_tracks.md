# Codex — Timeline/Media Stage B: media as timeline tracks + multiple media

You are implementing **Stage B only** of an approved corrections plan, working in
the `frontend/` monorepo root.

**Verify first — STOP and report if any fails:**
1. Sibling text-block plan's canvas stage has merged:
   `rg "CanvasTextEditOverlay" packages/presentation-builder/src` is non-empty.
2. The Stage-B kit is pre-built (kit files are READ-ONLY for you):
   `rg "onAddMedia" packages/presentation-builder/src/components/timeline/TimelineControls.tsx`
   is non-empty.
3. Stage A's Review-log line exists in the plan (space hotkey landed).

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_timeline_media_corrections_20260723.md`
— Root-cause finding (B/C/D), Stage B steps 5–8, acceptance criteria 2, 5, 6,
and the "Unified media model" clarification resolution.

Key facts (already verified — don't re-derive): the first upload becomes an
untimed layer-0 "background" element; `timedElements` in `EditorView` filters
`layer_index > 0`, hiding it from timeline AND canvas; `onFilesDropped` keeps
only `files[0]`; after the first upload there is no visible add-media
affordance. You are unifying the model: every media is a timed track.

## Read (only this)

1. The plan sections named above.
2. Knowledge base: `presentation_documentation/frontend/21_builder_editor_logic.md`
   (draft-store/mapping/geometry ownership) and
   `presentation_documentation/backend/09_slide_composition.md` (media element
   contract).
3. Relational: `src/editor/draft-store.ts` (media element helpers,
   `addTextElement` window policy), `src/lib/composition-mapping.ts` (media
   branches, both directions), `src/views/EditorView.tsx` (`timedElements`,
   dock wiring, upload wiring), controller `uploadFile`/`onFilesDropped`,
   `src/lib/timeline-geometry.ts` (`clampWindowToDuration`).

## Deliver

1. Unified model (draft-store + mapping): new media elements are always timed.
   First media on a slide → full-bleed layout (x .5 / y .5 / w 1 / h 1, fit
   cover) + `start_ms: 0`, `end_ms: null`; subsequent media → centered defaults
   with the window starting at the playhead (mirror `addTextElement`). Collapse
   `replaceBackgroundMediaElement`/`appendOverlayMediaElement` into
   `appendMediaElement` (+ `replaceMediaElementSource` for the panel's Replace
   file); drop the background/overlay role from the controller upload path.
2. `EditorView`: `timedElements` becomes all text + media (remove the
   `layer_index > 0` exclusion). `end_ms: null` bars render full-width; a trim
   gesture makes the window concrete (treat null end as slide duration;
   existing clamp applies). Wire the kit's "+ Media" button to a multi-select
   file picker.
3. Upload queue: `onFilesDropped` and "+ Media" feed ALL files sequentially
   through the existing single-upload pipeline (per-file progress via
   `uploadState`; a failure stops the queue with retry; abort cancels the rest).
4. Tests: mapping round-trips (first-media defaults; trimmed window); upload
   queue (3 files → 3 elements, order kept; failure at #2 stops with retry);
   single-media slide shows one full-width bar; regression — existing layer-0
   wire data (published decks) renders identically in editor and preview.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-builder`
- `npm run test:presentation-runtime` (must stay green untouched)
- Studio Playwright editor spec `--project=desktop` (operator starts servers)

## Finish

Append one dated line to the plan's Review log: "Stage B implemented —
<validation results, any deviations>". No archiving, no summary, no status
change. Clean-boundary rule: never stop before writing code.
