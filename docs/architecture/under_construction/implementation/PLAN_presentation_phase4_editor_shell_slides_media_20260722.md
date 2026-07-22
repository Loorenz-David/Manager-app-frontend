# PLAN_presentation_phase4_editor_shell_slides_media_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase4_editor_shell_slides_media_20260722`
- Status: `under_construction`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 4)
- Design reference: design README §1b (layout regions) + both editor screenshots

## Goal and intent

- Goal: Two deliverables. (a) Create `@beyo/presentation-runtime` with the composition schemas, reference-scale constants, and a **static** `SlideCompositionRenderer` (renders elements at a fixed time with no animation engine yet). (b) Build the editor screen's structural shell in `@beyo/presentation-builder`: top bar, slide rail with eager slide CRUD/reorder, phone canvas rendering the selected slide statically, media upload (background + overlay media assets), and the editor draft store that Phase 5 will fill with composition editing.
- Business/user intent: after this phase a manager can open an announcement, manage slides, and put media on them — everything except timing/text/animation.
- Non-goals: timeline, playhead, playback, text blocks, drag-positioning, properties panels beyond the slide's media-replace affordance (Phase 5); preview overlay, publish, read-only *actions* (Phase 6 — this phase only detects non-draft and shows a read-only banner + disables mutations).

## Scope

- In scope: runtime package skeleton + schemas (imported/re-exported by builder types where sensible to avoid duplication — builder `types.ts` composes runtime's element schemas), `REFERENCE_CANVAS_WIDTH`, static renderer (normalized layout → absolute positioning, `fit` handling, font scaling, `layer_index` stacking, deterministic element ordering per `09_slide_composition.md`); editor route load (`usePresentationDetail`), editor controller + Zustand draft store (`06_client_state.md`-justified: cross-cutting editor state — selected slide, dirty map, local compositions), top bar (back, editable title → debounced `PATCH`, status pill, disabled Preview/Publish placeholders), slide rail (add/delete/reorder via eager mutations, selection, thumbnails via static renderer at t=0, "N texts" footer count from elements, drag-reorder), canvas (264×470, bezel, background media or placeholder, static elements at t=0), media upload UX (drop/upload affordance per design; 2-step flow via Phase 1's `useUploadSlideMedia`; progress; MIME/size caps client-side; replace background; delete), presigned-URL-expiry refetch behavior.
- Out of scope: everything listed under non-goals; slide CTA fields (Phase 5's slide properties panel).
- Assumptions: Phases 1–3 complete; master mapping table governs which media is "background" (layer 0 full-bleed) vs overlay.

- Division of labor (master): the editor chrome kit (top bar, slide rail + card, canvas bezel/placeholder, upload overlay) is built by Claude before the Codex session; Codex owns the runtime package, store, upload orchestration, slide ops, and assembly; kit components are read-only for Codex.

## Clarifications required

- [ ] Video thumbnails in the rail/canvas: static poster only in this phase (backend `poster_url` if present, else stripe placeholder) — poster generation/upload UX ships with video handling polish in Phase 5/7. Confirm acceptable.

## Acceptance criteria

1. `@beyo/presentation-runtime` exists, has zero network/auth imports, and `SlideCompositionRenderer` reproduces the three `09_slide_composition.md` recipes statically (fixture test: given elements + t, correct visibility/position/size/stacking).
2. Renderer scales: the same slide renders consistently at 58×104 (rail thumb), 264×470 (canvas), and an arbitrary size (test) — fonts via `containerWidth / REFERENCE_CANVAS_WIDTH`.
3. Slide ops are eager and write-through: add appends+selects; delete blocked on last slide (design rule), reselects neighbor; drag-reorder calls `/slides/reorder` with the full id list and reconciles from the returned presentation.
4. Media: upload progress visible; wrong MIME/oversize rejected client-side with the backend's exact caps (`05_admin_slides_media.md`); S3 step failure never calls confirm; new background replaces layer-0 semantics without orphaning overlay elements; deletion cascades per backend (reconciled from response).
5. Editable title persists via debounced metadata PATCH (draft only).
6. Non-draft presentations: banner ("Published — read-only · v<N>"), all mutating affordances disabled; no 409 is ever triggered from this screen.
7. Draft store holds per-slide local composition state hydrated from the server shape (including legacy synthesized elements with `client_id: null`) — Phase 5 plugs editing into it without restructure.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/16_feature_workflow.md`: store/controller before components.
- `architecture/06_client_state.md`: Zustand store justification + shape (the one store this capability owns).
- `architecture/07_components.md`, `architecture/10_pages.md`: editor page/component composition.
- `architecture/22_file_handling.md`: upload UX, progress, cancel.
- `architecture/24_dto.md`: server slide → editor draft model mapping boundary.
- `architecture/31_animations.md`: rail drag/selection micro-interactions only (no timeline animation yet).
- `architecture/32_loading_skeletons.md`: editor loading state.
- `architecture/20_notifications.md`: mutation failure toasts.
- `architecture/35_shared_packages.md`: runtime package scaffolding; builder↔runtime dependency direction.
- `architecture/18_performance.md`: thumbnail memoization (rail re-renders on every store change otherwise).
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md`.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: desktop spec conventions.

### File read intent — pattern vs. relational

Permitted relational reads: Phase 1 hooks/types (what exists), `packages/ui` `BackendImage` (presigned rendering), `packages/stats/src/lib/time-line-calendar/geometry.ts` + its test (how this repo factors pure geometry — relational precedent only). Prohibited: reading phone-app editors/forms for structure.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Scaffold `packages/presentation-runtime` (schemas moved/composed from Phase 1 where they belong runtime-side; builder re-exports to avoid breaking Phase 1 consumers), `REFERENCE_CANVAS_WIDTH = 390`, element ordering comparator, static `SlideCompositionRenderer` + fixture tests. Root typecheck + `test:presentation-runtime`.
2. Editor draft store (`src/store/` in builder): normalized slides map, selected slide id, per-slide local composition + dirty flags, hydration from `Presentation`, reconcile-from-server action (used after every eager mutation).
3. `use-presentation-editor.controller.ts`: detail query, hydration, slide ops (add/delete/reorder/select), title PATCH debounce, media upload orchestration state, read-only derivation (`status !== 'draft'`).
4. Components: `EditorTopBar`, `SlideRail` (+ `SlideRailCard` with thumbnail renderer + drag handle), `EditorCanvas` (bezel, background, static elements, media placeholder + drop/upload), `MediaUploadOverlay` (progress/cancel/error). `data-testid` throughout.
5. `EditorView` assembly; package export; studio `EditorPage` renders it with `navigateBack` callback.
6. Vitest: store hydration/reconciliation, controller slide ops (MSW), renderer scaling (criterion 2), upload guard rails (criterion 4).
7. Playwright (desktop): open draft from dashboard → add slide → upload image (mock/presign fixture per `34_runtime_validation_local.md` mocking pattern) → reorder → delete → title edit persists across reload.

## Risks and mitigations

- Risk: schema ownership split (Phase 1 put element schemas in builder; runtime now owns them).
  Mitigation: step 1 moves them with builder re-exports; Phase 1's plan is written knowing this move comes (composition wire shapes only); no app imports break because only packages consume them so far.
- Risk: S3 PUT from the studio origin hits CORS in dev.
  Mitigation: verify one real presigned PUT against the dev bucket early in step 4; if blocked, backend CORS config is a deployment prerequisite documented in the review log (not a frontend workaround).
- Risk: rail thumbnails re-render the full composition every keystroke in Phase 5.
  Mitigation: memoized thumbnail keyed on slide composition revision counter, established now (criterion via step 4 + `18_performance.md`).

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-runtime` + `npm run test:presentation-builder`: green.
- `npx playwright test --grep presentation-editor-shell --project=desktop`: flow in step 7 passes.

## Review log

- `2026-07-22` Claude: drafted from master Phase 4.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
