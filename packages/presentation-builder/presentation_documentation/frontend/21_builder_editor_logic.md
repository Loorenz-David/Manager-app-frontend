# 21 — Builder editor logic (controllers, draft store, math)

The studio's brain. Components (doc 22) are props-only; **every behavior decision is
made here**. If your intention is "the editor should *do* something differently",
this is your zone.

## The central file

`src/controllers/use-presentation-editor.controller.ts` — the editor's single
controller. Owns:

- Data: `usePresentationDetail` → hydrates the draft store; read-only detection
  (published/archived); auto-creates the **first slide on an empty draft** (guarded
  by a ref — regression from the "inert empty editor" bug).
- Hybrid save: local edits land in the draft store instantly; autosave debounces to
  the backend — `TITLE_DEBOUNCE_MS = 450`, `COMPOSITION_AUTOSAVE_MS = 2000` — via
  `use-replace-composition` etc., then `reconcileAfterFlush` merges server truth back
  without clobbering newer local edits. A null-duration draft is flushed with the
  editor's 4,000 ms default; dirty compositions must never be reported saved without
  a composition PUT. Autosave pauses while inline text editing is active and resumes
  when that edit commits.
- Wires every action hook (doc 20) to UI intents: add text/media, the sequential
  multi-file upload queue, replace media source, delete, reorder, publish, archive,
  and new-version. Media has one model: every image/video is a timed composition
  element and timeline track; the first media merely receives full-bleed,
  full-duration defaults.
- Transport hotkey: `useEditorTransportHotkey` owns window-level Space play/pause,
  prevents scroll/native button re-trigger, and ignores inputs, textareas, selects,
  contentEditable ancestors, and the publish-dialog takeover. Preview uses the same
  typing guard.
- Text measurement adapter (`src/lib/text-measurement.ts`): the single DOM span
  measurement source with an approximation fallback. It feeds both persisted
  text-element sizing in `composition-mapping` and `EditorView` canvas hit-area
  heights, so wrapped-text selection geometry cannot drift from save geometry.
- **Text box sizing (`src/lib/text-box-layout.ts`)**: a text element's `layout.width` is
  the **wrap column the author dragged**, and its `layout.height` is the box height —
  both authored, both round-tripped. Height starts as **auto (hug)**: while the stored
  height still equals the measured wrapped height, `withMeasuredTextHeight` re-hugs the
  box on every edit through the controller's `updateElement` choke point (text, width,
  font size, padding). The moment the author drags a vertical handle the height stops
  matching the measurement, `isHuggingTextHeight` reads false, and the height is theirs —
  **no stored mode flag is needed, the box describes itself**. Hug detection reads the
  *pre-edit* element, or a font-size change would read as "the author fixed it". Dragging
  back onto the measured height returns the box to auto.
- Inline text editing: adding text selects it and enters canvas edit mode immediately;
  double-click enters the same mode for existing text. The view pauses playback,
  suppresses dragging for the active element, live-syncs content through
  `updateElement`, and commits on Escape or blur. **The textarea is styled only by the
  runtime's `compositionTextStyle`** so it breaks lines exactly where the render will;
  its focus ring is an `outline` (a border would eat content width and shift every wrap),
  and the wrap-parity regression is `CanvasTextEditOverlay.test.tsx`.
- Session-local properties-panel drawer state: separate open sets for slide, text,
  and media panels. Selection carries a `"canvas"` or `"timeline"` source so the
  controller can ensure-open the relevant concern without closing other drawers:
  canvas → text `content` / media `media`; timeline bar or label → `animations`.
  Deselecting or changing slides does not rewrite drawer arrangements; remounting
  the editor resets every set. CTA route validation ensure-opens slide `button`
  when the error first appears.
- Publish flow state: builds `PublishFormState`, runs `buildPublishPayloads`,
  maps failures via `mapPublishFailure` into `PublishIssueState`.
- Preview: gates it behind `assertPreviewCompositionParity` (dev safety that the
  editor's local composition and the mapped server payload render identically).

Its test (`.test.tsx`) is the main behavioral safety net — extend it for any
controller change.

## Files

| File | Role | Touch when… |
|---|---|---|
| `src/editor/draft-store.ts` | Hand-rolled external store (`useSyncExternalStore`): presentation snapshot, per-slide local compositions, dirty-slide set, selection (slide + element per slide), per-slide playback state, revisions. Exposes semantic mutators (`addTextElement`, `updateElement`, `setSlideDuration`, `setSlideBackgroundColor`, `appendMediaElement`, `replaceMediaElementSource`, …), `hydrate`/`reconcile`/`reconcileAfterFlush`/`refreshMediaUrls` | Editor state semantics: what's dirty, what survives a server reconcile, selection rules. Deep-clones on write — keep that; components rely on snapshot immutability. Two test files (incl. `.phase5` media cases). |
| `src/lib/composition-mapping.ts` | **The editor↔server translator.** Editor composition state includes nullable `backgroundColor` plus the element model (px on a 264×470 canvas, `EditorAnimationChoice` "fade"/"slide"/"none") ↔ runtime/server composition (`background_color`, 0..1 center-anchored fractions at reference width 390, `fade`/`fade_up`, ms). Owns `EDITOR_CANVAS_WIDTH/HEIGHT`, `EDITOR_ANIMATION_DURATION_MS = 450`, `editorCompositionToPutBody`, and `serverElementsToEditorComposition`. **It measures nothing** — text geometry is authored and translated as-is; auto-height is resolved upstream in `text-box-layout.ts` | Units, anchors, animation naming, slide composition fields, new element kinds. Errors here corrupt saved compositions **silently** — always extend `composition-mapping.test.ts` with a round-trip case. |
| `src/lib/timeline-geometry.ts` | Pure timeline and canvas math: `timeToX`/`xToTime`, scrub fractions, `clampWindowToDuration`, `MIN_TIMELINE_WINDOW_MS = 400`, timeline gesture → window resolution, `resizeElementLayout` for center-anchored media layout, and `resizeTextBox` for text | Bar drag/trim and resize feel. Media: corner resize preserves aspect ratio, edge resize is free-axis, box stays inside the canvas. Text: all eight handles, **never aspect-locked** (a wrap column must not scale with height), opposite edge held, and the box **may overhang the frame** (size ≤ 1, centre clamped 0..1). `clampCanvasPosition` allows the full 0..1 the backend accepts. **All arithmetic lives here**, tested in `timeline-geometry.test.ts`. |
| `src/lib/publish-form.ts` | Publish dialog logic: `PublishFormState`, `CATEGORY_DEFAULT_PRIORITY` (alert 300 / workflow 200 / improvement 100 / news 0), field validation, local-datetime ↔ ISO, `buildPublishPayloads` (metadata + audience + publish calls), `mapPublishFailure` (backend 422 keyword → per-field/summary errors) | Any publish-time field, audience rule, or error-message mapping. |
| `src/lib/presentation-dashboard.ts` + `src/controllers/use-presentation-dashboard.controller.ts` + `src/providers/PresentationDashboardProvider.tsx` | Dashboard logic: list → `AnnouncementCardData` derivation (display status, media kinds, cover), filter state (`DASHBOARD_FILTERS`), create-navigate flow, archive from card | Dashboard behavior/derivations (visuals → doc 22). |
| `src/preview/use-presentation-preview-playback.ts` | Multi-slide preview playback over the runtime clock (slide advancing, restart) | Preview overlay behavior. |
| `src/preview/preview-parity.ts` | `assertPreviewCompositionParity` + `rendering-parity.test.tsx` — proves editor preview output ≡ runtime renderer output for the shared fixture | Extending the parity guarantee. |
| `src/views/DashboardView.tsx` / `src/views/EditorView.tsx` / `src/publish/PublishDialog.tsx` | **Assembly seams**: bind controller state to kit component props. The only files where logic and kit meet | Wiring a new kit prop or controller capability through to the screen. |

## Upstream / downstream

- **Upstream:** data layer hooks (doc 20), runtime schemas/clock (doc 10), kit prop
  contracts (doc 22 — treat as fixed interfaces).
- **Downstream:** the views/PublishDialog are consumed by the studio shell's pages
  (doc 30). Preview parity ties this zone to the runtime renderer — renderer changes
  can fail `rendering-parity.test.tsx` here.

## Invariants

- **Never mirror composition text into `slide.title`** — text-only slides are valid;
  `title` is metadata only (V2 resolution; the backend once 422'd on this).
- Autosave writes must survive reconcile: server responses are merged through
  `reconcileAfterFlush`, not blind re-hydration — don't replace it with a refetch.
  A flush acknowledgement must preserve the live local composition and selected
  element so panels and gestures remain stable. It may clear a slide's dirty flag
  only when the acknowledged slide revision is still current; a response for an
  older revision leaves newer local edits dirty for the next autosave.
- Slide `background_color` is part of the same atomic composition aggregate as
  duration/elements. Color changes mark the slide dirty, increment its revision,
  and flush through the existing composition PUT; `null` explicitly clears it.
- Min timeline window 400 ms; shrinking a slide clamps bars (never deletes them).
- No untimed canvas elements: every text or media element is a timeline track.
- Editor canvas px are **not** reference px — everything crossing the wire goes
  through `composition-mapping`.
