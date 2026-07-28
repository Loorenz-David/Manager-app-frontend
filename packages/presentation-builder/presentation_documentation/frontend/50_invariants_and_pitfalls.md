# 50 — Invariants & pitfalls (read before changing payloads or lifecycle)

Every rule here was either a deliberate architecture decision (V1–V3, master plan) or
a **real bug that cost a debugging session**. Check your intention against this list
before writing code.

## Contract invariants (violating these breaks prod behavior)

1. **Backend owns eligibility.** Audience matching, priority, seen-filtering,
   scheduling windows — all backend. The frontend never filters or ranks
   presentations. If a "why did/didn't it show" question comes up, the answer is in
   the backend contract or the view-state records, not in frontend logic.
2. **Consumer schemas must be exactly as lenient as the backend serves.** A Zod parse
   failure in the player is **silent** — the query errors, the player never opens, no
   user-visible signal. Two live incidents:
   - `category: z.string()` vs backend `null` → player dead until made `.nullable()`
     (regression: `packages/presentations/src/types.test.ts`).
   - `sequence_order: z.positive()` vs draft payloads carrying `0` → drafts with
     media 422'd/failed parse; backend normalizes to 1..N **only at publish**
     (`nonnegative()` now, in runtime `SlideMediaSchema` + builder `SlideSchema`).
   Rule of thumb: model **draft-state** leniency, not published-state neatness. When
   tightening any consumer schema, first parse a live payload (dev-tool: safeParse of
   the actual `/active` response).
3. **Never mirror composition text into `slide.title`.** Text lives in composition
   elements only; `title` is metadata. Text-only slides are valid and publish fine
   (V2 resolution).
4. **Envelopes:** admin + consumer endpoints wrap `{data, ok, warnings}`; consumer
   `GET /history` is deliberately **never wrapped**; socket payloads
   (`{client_id, logical_client_id, version}`) have **no envelope** (V3).
5. **Versioning, not mutation:** published presentations are read-only; "edit" =
   `new-version` (same `logical_client_id`, bumped `version`). The provider records
   view-state against `client_id` + `version`.
6. **Role gates authoring, not app scope.** Studio signs in `appScope="manager"`;
   admin + manager roles may author. Never hardcode `app_key` checks in the studio.
7. **Sockets only invalidate.** No payload-driven state changes in hosts; event →
   `invalidateActivePresentationQueries` → refetch → provider reacts (single code
   path for pull and push).

## Unit & mapping invariants

8. Times are **ms** everywhere in code; design docs speak seconds — conversion
   happens once, in builder `composition-mapping.ts` (design "slide" animation =
   `fade_up`; ANIM duration 0.45 s = `EDITOR_ANIMATION_DURATION_MS 450`).
9. Layout is 0..1 **center-anchored** fractions; font sizes mean "at reference width
   390" (`REFERENCE_CANVAS_WIDTH`). Editor canvas px (264×470) are internal to the
   editor — never persist them.
10. Minimum timeline window 400 ms (`MIN_TIMELINE_WINDOW_MS`); shrinking a slide
    clamps element windows instead of dropping them.
11. **No untimed elements — every canvas element is a timeline track.** Images and
    videos use the same timed media-element model; "background" and "overlay" are
    retired authoring concepts. Full-bleed is a first-media layout default, not a
    separate role.

## Architecture invariants

12. Dependency direction: `runtime ← builder`, `runtime ← presentations`; builder ⇄
    presentations never import each other; apps import package indexes only.
13. Kit components (builder `components/`, player `components/player/`) are
    props-only and styling-read-only for logic work; all arithmetic lives in `lib/`
    logic modules (gesture contracts: timeline bars emit raw pixels; canvas resize
    handles emit raw delta fractions).
14. One renderer. Any per-consumer rendering fork breaks the editor↔phone parity
    guarantee that the parity tests pin.
15. No default exports in `@beyo/presentations`; lazy hosts go through the
    `preload*Surface` named→default loaders.
16. **A dirty composition flush must never silently no-op.** Draft slides can arrive
    with `duration_ms: null`; use the editor's 4,000 ms effective duration and issue
    the composition PUT. Returning success without persisting leaves the backend
    slide empty and causes publish to reject an otherwise valid text-only deck.

## Process pitfalls (cheap to forget, expensive to relearn)

- **Dev servers are user-started.** Ask the user; never launch them yourself.
  Current local layout: studio 5176, managers 5173, workers 5174, sellers 5175.
- Dismiss-chrome matrix: modal=X, full_screen=Skip, slide_page=built-in
  slide-to-close; `is_dismissible:false` disables all of it
  (`setSwipeDismissDisabled(true)`) **until the deck has looped once**, which is
  when the footer Close button appears and the gesture unlocks (doc 40, "Loop &
  exit matrix").
- **The deck loops until the user quits.** `onComplete` records `completed` at the
  end of the first loop and must never close the surface — closing is `onClose`
  (records nothing, because `dismissed` after `completed` is a `409`). Every slide
  auto-advances: authored `manual` slides fall back to 4,000 ms, or the loop would
  stall on a tap and the exits would never unlock.
- Auto-show policy is **home-route-only in all three apps** — a product decision,
  not an accident; changing it means changing `is<App>PresentationHome` in every app
  deliberately.
- `EditorShell`/AppShell height chain (`h-screen` → `min-h-0 flex-1` → `h-full`):
  breaking it pushes the timeline dock off-viewport.
- Playwright mobile project: clicks inside gesture containers get swallowed
  (`filterTaps`); use `tap()` — see doc 60.
- If vitest dies repo-wide with `Cannot find module '@rolldown/binding-darwin-arm64'`:
  the optional binding got dropped — `npm install @rolldown/binding-darwin-arm64
  --save-optional` (root), or full `rm -rf node_modules package-lock.json && npm
  install` as fallback.

## Known open (optional) follow-ups

- Backend structured publish-validation causes to replace the keyword-regex 422
  mapping in `publish-form.ts` (`mapPublishFailure`).
- `item_zone`-style backend enrichments: none pending for presentations; the list
  card fields (`slide_count`, `media_kinds`, `cover_url`) already shipped.
