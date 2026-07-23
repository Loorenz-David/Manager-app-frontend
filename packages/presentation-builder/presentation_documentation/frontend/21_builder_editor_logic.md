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
- Inline text editing: adding text selects it and enters canvas edit mode immediately;
  double-click enters the same mode for existing text. The view pauses playback,
  suppresses dragging for the active element, live-syncs content through
  `updateElement`, and commits on Escape or blur.
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
| `src/lib/composition-mapping.ts` | **The editor↔server translator.** Editor composition state includes nullable `backgroundColor` plus the element model (px on a 264×470 canvas, `EditorAnimationChoice` "fade"/"slide"/"none") ↔ runtime/server composition (`background_color`, 0..1 center-anchored fractions at reference width 390, `fade`/`fade_up`, ms). Owns `EDITOR_CANVAS_WIDTH/HEIGHT`, `EDITOR_ANIMATION_DURATION_MS = 450`, `editorCompositionToPutBody`, and `serverElementsToEditorComposition`; text sizing comes from `text-measurement.ts` | Units, anchors, animation naming, slide composition fields, new element kinds. Errors here corrupt saved compositions **silently** — always extend `composition-mapping.test.ts` with a round-trip case. |
| `src/lib/timeline-geometry.ts` | Pure timeline and canvas math: `timeToX`/`xToTime`, scrub fractions, `clampWindowToDuration`, `MIN_TIMELINE_WINDOW_MS = 400`, timeline gesture → window resolution, and `resizeElementLayout` for center-anchored media layout | Bar drag/trim and media resize feel. Corner resize preserves aspect ratio; edge resize is free-axis; minimum size and 0..1 canvas bounds are resolved here from raw kit deltas. **All arithmetic lives here**, tested in `timeline-geometry.test.ts`. |
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
- Slide `background_color` is part of the same atomic composition aggregate as
  duration/elements. Color changes mark the slide dirty, increment its revision,
  and flush through the existing composition PUT; `null` explicitly clears it.
- Min timeline window 400 ms; shrinking a slide clamps bars (never deletes them).
- No untimed canvas elements: every text or media element is a timeline track.
- Editor canvas px are **not** reference px — everything crossing the wire goes
  through `composition-mapping`.
