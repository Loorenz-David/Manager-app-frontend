# PLAN_presentation_phase4_corrections_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase4_corrections_20260722`
- Status: `archived`
- Owner agent: `Codex (logic)`
- Created at (UTC): `2026-07-22T13:48:10Z`
- Last updated at (UTC): `2026-07-22T13:48:10Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`
- Phase plan: `docs/architecture/under_construction/implementation/PLAN_presentation_phase4_editor_shell_slides_media_20260722.md`

## Goal and intent

- Goal: Complete the missing Phase 4 runtime and editor-shell logic, assembly, tests, and lifecycle bookkeeping without changing the approved Claude-builder editor kit's DOM, classes, or styling.
- Business/user intent: Deliver the approved point at which a manager can open a presentation, manage slides, render their static compositions, upload/delete media, edit a draft title, and see immutable versions in a fully non-mutating read-only state.
- Non-goals: Timeline/playback, text creation/editing, animation rendering, drag-positioning, slide properties/CTA, preview, publish, audience, archive, or new-version orchestration from Phases 5–6; visual restyling of the editor kit.

## Scope

- In scope: the missing `@beyo/presentation-runtime` package; composition schema ownership migration with builder re-exports; static renderer and scaling; editor draft store/controller/view; eager slide and media orchestration; title debounce; read-only gating; thin studio route assembly; Phase 4 unit/integration/Playwright coverage; summary/archive/master bookkeeping after all validation is green.
- Out of scope: Any implementation assigned to Phases 5–9 and any Claude-builder visual-lane change.
- Assumptions: The existing Phase 1 API/action hooks and the approved editor kit are the starting point. Backend docs `05_admin_slides_media.md` and `09_slide_composition.md` remain authoritative.

## Clarifications required

- None. The original Phase 4 plan and its user-approved clarification resolve the required behavior.

## Acceptance criteria

1. **F1 — Codex (logic):** `@beyo/presentation-runtime` exists with package/TypeScript/test configuration, is included in root validation, and has zero network/auth or builder/presentations/app imports. Composition/layout/style/animation/playback schemas have exactly one definition in runtime; builder imports and re-exports them without duplication.
2. **F1 — Codex (logic):** `SlideCompositionRenderer` renders the three recipes from backend `09` at a fixed time, applies deterministic ordering (`layer_index`, `sequence_order`, `start_ms`, `client_id`), normalized geometry/fit, and visibility semantics, with fixture tests.
3. **F1 — Codex (logic):** Renderer tests prove consistent output at 58×104, 264×470, and an arbitrary size, including `font_size * containerWidth / REFERENCE_CANVAS_WIDTH` with `REFERENCE_CANVAS_WIDTH = 390`.
4. **F2 — Codex (logic):** A builder-owned editor draft store hydrates all server slides/elements, including synthesized elements whose `client_id` is `null`; tracks selected slide, local per-slide compositions, dirty state/revision; and reconciles the full presentation returned by every eager mutation.
5. **F2 — Codex (logic):** A controller owns detail loading, hydration, slide selection/add/delete/reorder, title debounce, media upload/delete/replace orchestration, read-only derivation, notifications, and controller/store cleanup. Components consume only injected props/context, and controllers import no components.
6. **F2 — Codex (logic):** Slide add appends and selects the server-returned slide; last-slide deletion is blocked; deleting the selected slide selects a surviving neighbor; reorder sends the complete ordered id list and reconciles the response. Tests cover all four behaviors.
7. **F2 — Codex (logic):** Upload UI is wired for background and overlay assets with progress and cancel. Client checks use the exact documented MIME allowlists and byte caps; S3 failure/cancel cannot call confirm. Background replacement establishes one layer-0 full-bleed element without orphaning overlays, and media deletion reconciles the backend cascade. The carried embedded-media serialization concern has a round-trip fixture.
8. **F2 — Codex (logic):** Draft title edits issue a debounced metadata PATCH only when the value changed and the presentation remains a draft. Non-drafts render the exact read-only banner and disable or omit every mutation path, making a 409 unreachable from this screen.
9. **F2 — Codex (logic):** `EditorView` composes the existing kit without editing its DOM/classes/styling, is exported by builder, and the studio `EditorPage` is only a route-param/navigation adapter. The static runtime renderer is used for both rail thumbnails and the 264×470 canvas.
10. **F3 — Codex (logic):** No Phase 5+ timeline/text/playback/publish behavior is introduced. `GET /history` remains unwrapped; runtime imports nothing from network/auth/builder/presentations; packages import no app-specific route/navigation/surface identifiers.
11. **F3 — Codex (logic):** Root typecheck, runtime tests, builder tests, and the desktop `presentation-editor-shell` Playwright flow all pass using commands that resolve the studio Playwright config. The flow covers load, add, mocked upload/presign/S3/confirm, reorder, delete, title persistence, and read-only no-mutation behavior, with console/page-error guards.
12. **F3 — Codex (logic):** After green validation, write `SUMMARY_presentation_phase4_editor_shell_slides_media_20260722.md`, archive the original approved phase plan without modifying its content, append the implementation result to the master review log, and leave the master itself under construction.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md`, `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`, `15_feature_structure.md`: core layer and contract discipline.
- `architecture/07_components.md`, `10_pages.md`, `16_feature_workflow.md`, `23_providers.md`, `24_dto.md`: component/controller/store/view and DTO boundaries.
- `architecture/18_performance.md`, `22_file_handling.md`, `32_loading_skeletons.md`: thumbnail rendering, upload UX, and loading state.
- `architecture/17_testing.md`, `34_runtime_validation.md`, `35_shared_packages.md`: validation and package dependency boundaries.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: desktop Playwright project/config conventions.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead.
- **What exists** → relational reads are limited to the Phase 1 hooks/types, the approved editor kit prop contracts, `BackendImage`, and the existing studio route/provider signatures named by the original phase plan.
- The editor kit files under `packages/presentation-builder/src/components/editor/` remain read-only: no DOM/class/styling edits. Only a strictly additive optional prop may be proposed and must be recorded before use.

### Skill selection

- Primary skill: none.
- Trigger terms: n/a.
- Excluded alternatives: n/a.

## Implementation plan

1. Create the runtime package, move composition-domain schema ownership into it, re-export through builder, register root typecheck/test scripts, and add recipe/scaling/purity tests.
2. Implement and test the builder editor draft store and pure reconciliation/selection/order/background-element helpers.
3. Implement and test the editor controller around existing detail/action hooks, enforcing draft-only guards before every mutation and exact eager response reconciliation.
4. Assemble `EditorView` from the untouched kit and runtime renderer; wire the studio editor route as a thin adapter.
5. Add upload validation/flow/background-overlay/delete tests plus the embedded-media fixture, then add the complete desktop Playwright flow.
6. Run all validation; only after green results, write the Phase 4 summary and perform the specified archive/master bookkeeping.

## Risks and mitigations

- Risk: Moving schemas breaks Phase 1 consumers or introduces circular dependencies.
  Mitigation: Runtime owns only pure composition-domain contracts; builder imports/re-exports them and retains presentation/admin DTO composition. Add import-purity and builder type tests.
- Risk: Eager mutations race local selection/composition state.
  Mitigation: Treat every returned full presentation as authoritative, reconcile atomically, and unit-test neighbor selection and reorder response differences.
- Risk: Background upload semantics accidentally delete or overwrite overlay elements.
  Mitigation: Isolate a pure background replacement helper and test mixed background/overlay compositions before wiring mutations.
- Risk: Read-only rendering still leaves an event path to a draft-only endpoint.
  Mitigation: Gate in both view props and controller callbacks, and assert zero mutation requests in read-only integration/Playwright tests.

## Validation plan

- `npm run typecheck`: zero TypeScript errors, including runtime and builder.
- `npm run test:presentation-runtime`: recipe, ordering, visibility, purity, and scaling suites pass.
- `npm run test:presentation-builder`: existing suites plus store/controller/upload/view suites pass.
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-editor-shell --project=desktop`: Phase 4 production flow passes.
- `rg -n '(@beyo/api-client|@beyo/auth|presentation-builder|@beyo/presentations|apps/)' packages/presentation-runtime`: no forbidden runtime imports.
- `rg -n 'GET /history|/history' packages/presentation-runtime packages/presentation-builder apps/presentation-studio`: no history wrapper/scaffolding.
- `git diff -- packages/presentation-builder/src/components/editor`: no non-additive kit changes.

## Review log

- `2026-07-22` Claude (builder): reviewed and **approved**, with one execution directive: this plan runs as **two consecutive Codex sessions** to avoid the session-stall pattern seen on Phases 3–4 — **4a** implements F1 only (criteria 1–3: runtime package, schema migration + builder re-exports, renderer + tests, root scripts; no lifecycle bookkeeping), **4b** implements F2+F3 (criteria 4–12, including the summary/archive/master bookkeeping). Prompts: `prompts/PROMPT_phase4a_corrections_runtime.md`, `prompts/PROMPT_phase4b_corrections_editor.md`. 4b must verify 4a's deliverables exist before starting.
- `2026-07-22` Codex review: **DEFECTS FOUND.** Phase 4 logic/assembly is absent; runtime and production editor validation do not exist. The Claude-builder kit is present and no visual correction is requested. Created this fixes-only plan.
- `2026-07-22` Codex: **4a (F1) implemented** — `npm run typecheck` PASS; `npm run test:presentation-runtime` PASS (1 file / 9 tests); `npm run test:presentation-builder` PASS (8 files / 29 tests); runtime forbidden-import scan returned no matches; moved-schema definition scan found each schema only in runtime.
- `2026-07-22` Codex: **4b (F2+F3) implemented** — editor draft store/controller/view, eager slide CRUD/reorder, debounced draft title PATCH, background + overlay upload orchestration with exact caps, embedded-media round-trip fixture, read-only gating, and desktop `presentation-editor-shell` flow delivered. Validation: root typecheck PASS; runtime 9/9 PASS; builder 38/38 PASS; explicit studio-config desktop Playwright 1/1 PASS; `/history` scan empty; editor-kit diff empty. Original Phase 4 plan archived; this corrections plan remains `approved` for independent re-review.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude reviewer / user`
