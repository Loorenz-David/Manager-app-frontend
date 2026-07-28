# 10 — `@beyo/presentation-runtime` (shared schemas + renderer)

`packages/presentation-runtime/` — the neutral core both the studio and the phone
player stand on. **Pure**: no network calls, no auth, no app state, no `@beyo/api`.
If a change here is correct, editor preview and phone playback change identically;
if it's wrong, both break — treat every edit as a two-sided contract change.

## Files

| File | Role | Touch when… |
|---|---|---|
| `src/schemas.ts` | Zod schemas + types for the composition model: `CompositionElementSchema`, `ElementLayoutSchema` (0..1 fractions, center-anchored), `ElementAnimationSchema` (`fade`/`fade_up`, ms, easing), `SlideMediaSchema`, `PlaybackModeSchema`, text style enums, `COMPOSITION_SCHEMA_VERSION` | The backend composition contract changes (check `../backend/` first). Both builder and player parse with these — keep them lenient exactly as the backend serves (see doc 50). |
| `src/SlideCompositionRenderer.tsx` | **The one true renderer**, and via `compositionTextStyle` + `TEXT_LINE_HEIGHT` the single definition of where text wraps (line-height, `pre-wrap`, `break-word`, `border-box`, and font/padding/radius scaled from 390). The studio's inline text editor applies that style verbatim — anything styled differently there is a wrap the author edits against but never gets. Takes elements + `timeMs` + container dimensions and optional nullable `backgroundColor`, paints the background inside the clipped canvas behind every element, scales everything from `REFERENCE_CANVAS_WIDTH = 390` (font sizes, layout fractions → px), applies enter/exit animation styles from the registry, and renders text + media elements in `sortCompositionElements` order. Videos render through the internal `CompositionVideo`, which drives them from the slide clock when the optional `videoPlayback` prop is supplied — scrubbing seeks frame-accurately, playing runs the clip and only corrects it past `VIDEO_SEEK_TOLERANCE_MS` (seeking every frame stutters), and `preload` becomes `auto`. Omit the prop for a still frame | Any visual change to how a slide looks *anywhere* (canvas, preview overlay, phone). Never fork per-consumer rendering — parity is the whole point. |
| `src/composition-video.ts` | **The trim seam.** `compositionMediaTimeMs(element, slideTimeMs)` is the one place that says where a clip's own playhead belongs, plus `compositionMediaEndMs` / `isBeyondCompositionMediaEnd` (both no-ops today) and `VIDEO_SEEK_TOLERANCE_MS` | Adding an in/out point. A backend `media_start_ms` / `media_end_ms` lands **here only** — every consumer already reads video position through these. |
| `src/animation-registry.ts` | Maps `AnimationType` → CSS style computation over animation progress (opacity/translate for `fade`, `fade_up`) | Adding a new animation type: add enum in `schemas.ts`, entry here, editor choice in builder `composition-mapping.ts`/panels. |
| `src/usePlaybackClock.ts` | rAF-driven clock: `timeMs`, `play`/`pause`/`seek`, `MAX_PLAYBACK_DELTA_MS` frame clamp, `advancePlaybackTime` pure helper | Timing feel, background-tab behavior, loop semantics. Used by editor preview playback AND phone playback. |
| `src/ordering.ts` | `compareCompositionElements` / `sortCompositionElements`: deterministic z/paint order — `layer_index` → `sequence_order` → `start_ms` → `client_id`, stable | Elements paint/stack in the wrong order. Change ripples to editor canvas, preview, and player simultaneously. |
| `src/rendering-parity-fixture.ts` | Canonical composition fixture used by builder and player parity tests | Adding features the parity suite should cover. |
| `src/index.ts` | Public export surface | Adding exports. Keep it explicit — this is the contract line for two dependents. |

Tests: `SlideCompositionRenderer.test.tsx` (+ `.phase5` media cases),
`animation-registry.test.ts`, `usePlaybackClock.test.tsx`.

## Upstream / downstream

- **Upstream (feeds this):** backend composition contract
  (`../backend/` — element shape, enums doc `07_enums.md`, ms units, 0..1 layout).
- **Downstream (this affects):**
  - `presentation-builder`: `composition-mapping.ts` (translates editor model to these
    schemas), `EditorCanvas` (renders via the renderer), `PreviewOverlay`/preview
    playback (renderer + clock), draft-store (stores `CompositionElement[]`).
  - `presentations`: `types.ts` (consumer slide schema embeds `SlideMediaSchema`,
    `CompositionElementSchema`), `PresentationPlayer` (renderer),
    `usePresentationPlayback` (clock).
  - Parity tests in **both** packages pin renderer output against
    `rendering-parity-fixture.ts` — a renderer change that alters output will fail
    them; update fixture + both suites together.

## Invariants

- `REFERENCE_CANVAS_WIDTH = 390`: authored `font_size` and layout mean "at 390 px
  wide". Every consumer renders at `containerWidth / 390` scale. Never hardcode
  pixel sizes in the renderer.
- Layout fractions are **center-anchored** 0..1 of the canvas.
- Everything authored scales from 390, not just `font_size`: text `padding` and
  `border_radius` do too, or the 264-wide editor canvas and the 390-wide phone would
  wrap the same text at different columns.
- **Text wrapping is defined once**, by `compositionTextStyle` (line-height,
  `pre-wrap`, `break-word`, `border-box`). Builder `text-measurement` mirrors it and the
  studio's inline editor spreads it verbatim — the measured height *is* the box height,
  so any drift mis-sizes every text box. Regression: builder
  `CanvasTextEditOverlay.test.tsx`.
- **Video position is defined once**, by `compositionMediaTimeMs`. Consumers drive clips
  only through the renderer's `videoPlayback` prop; the sole exception is the phone's
  `media_driven` slide, where the video is the clock and the player owns it.
- `backgroundColor: null`/omitted means transparent: the host canvas/frame remains
  visible. A supplied backend hex color paints only inside the renderer's clipped
  bounds, behind all composition elements.
- All times are **ms** end-to-end here (design docs speak in seconds; the s→ms
  conversion happens in builder mapping, never in runtime).
- Schema leniency: draft payloads may carry `sequence_order: 0` (publish-time
  normalization only) — `SlideMediaSchema` deliberately uses `nonnegative()`.
  Regression history in doc 50.
