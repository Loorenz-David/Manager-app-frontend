# PLAN_presentation_phase1_builder_foundation_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase1_builder_foundation_20260722`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T11:02:40Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 1)
- Backend contract: `docs/presentation_capability/backend/` `02`–`09`

## Goal and intent

- Goal: Create `@beyo/presentation-builder` (`packages/presentation-builder`) with the full logic layer for every admin route: `types.ts`, query keys, API functions, query hooks, action hooks, and the permission helper. Zero UI.
- Business/user intent: give Phases 3–6 a complete, typed, tested data layer so all later work is UI assembly.
- Non-goals: any component/page/controller/surface-ids; consumer endpoints (`/active`, `/history`, `view-state`); the runtime package (Phase 4); composition *mapping* helpers (Phase 5 — this phase only types the wire shapes).

## Scope

- In scope: package skeleton (`package.json`, `tsconfig.json`, `src/index.ts`), `src/types.ts`, `src/api/` (functions + `presentation-keys.ts` + query hooks), `src/actions/` (mutation hooks), `src/lib/use-presentation-builder-permissions.ts`, Vitest config + unit tests for hooks/schemas, root-script registration (`test:presentation-builder`, typecheck entry).
- Out of scope: everything visual; `GET /history` (never wrapped, per master); optimistic-update flows beyond what `08_hooks.md` prescribes for these mutation shapes.
- Assumptions: master's decisions #1–#11 stand; backend docs are ground truth.

## Clarifications required

- [ ] None — all Phase-1-relevant questions were resolved in the master (decisions table + V1/V2/V3 owned by later phases).

## Acceptance criteria

1. Every admin route in the master's route-ownership table (Phases 3–6 rows) has: one API function, one query or action hook, and Zod-validated response parsing via the standard envelope.
2. `types.ts` models exactly the fields/enums in backend docs `04`–`09` — including `logical_client_id`/`version`, `starts_at`/`expires_at`, slide `playback_mode`/`duration_ms`/`composition_schema_version`, `elements[]` (with `client_id: string | null` for synthesized legacy elements), media upload shapes (`pu_` pending upload, `storage_key`), audience shapes, and all `07_enums.md` unions. No invented fields.
3. The 2-step S3 upload is modeled as three API functions (`createMediaUploadUrl`, `uploadToS3` via XHR with progress callback per `22_file_handling.md`, `confirmSlideMedia`) plus one orchestrating action hook `useUploadSlideMedia` exposing progress + cancel.
4. Query keys follow `05_server_state.md`: `presentationKeys.list(filters)`, `.detail(id)`, `.preview(id)`; every mutation invalidates precisely the affected keys (all slide/media/composition/audience mutations return the full presentation → they set the detail cache from the response instead of blind invalidation, and invalidate the list only when list-visible fields change: title, status, timestamps, slide count).
5. `usePresentationBuilderPermissions()` returns `{ canManagePresentations }` per the master's permission table.
6. `npm run typecheck` (extended) zero errors; `npm run test:presentation-builder` green.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: package/layer baseline.
- `architecture/02_types.md`: Zod schema + inferred type conventions for `types.ts`.
- `architecture/04_api_client.md`: envelope + error handling.
- `architecture/05_server_state.md`: query key/hook structure.
- `architecture/06_client_state.md`: confirms no store belongs in this phase.
- `architecture/08_hooks.md`: action-hook structure, cache set/invalidation discipline.
- `architecture/13_errors.md`: the two backend error shapes (`error` vs `detail`), 409/422 propagation to callers.
- `architecture/15_feature_structure.md`: `src/` folder layout.
- `architecture/16_feature_workflow.md`: build order (Types → Keys → API/Query hooks → Actions).
- `architecture/22_file_handling.md`: XHR upload with progress for the S3 step.
- `architecture/19_permissions.md`: capability-boolean pattern.
- `architecture/24_dto.md`: response schema → view-model boundaries (kept minimal; heavy view models belong to consuming phases).
- `architecture/35_shared_packages.md`: package.json/tsconfig templates, peer-dependency rules.
- `architecture/17_testing.md`: Vitest/MSW conventions.

### Local extensions loaded

- `architecture/04_api_client_local.md`: flat-string domain error, refresh envelope — confirms no new parsing.
- `architecture/19_permissions_local.md`: `useRole()` return shape used by the permission helper.

### File read intent — pattern vs. relational

Apply the test from `task_system/frontend_contract_goal_mapping_guide.md`. Permitted relational reads for this phase: `packages/shopify/package.json` + `tsconfig.json` (newest package scaffold, versions), `packages/auth/src` public exports (`useRole` signature). Prohibited: reading any package's `api/`/`actions/` for structure — `05`/`08` define it.

### Skill selection

- Primary skill: none (standard workflow).
- Trigger terms: n/a.
- Excluded alternatives: n/a.

## Implementation plan

1. Scaffold `packages/presentation-builder` (`package.json` `@beyo/presentation-builder` with peers per `35_shared_packages.md`; `tsconfig.json` per template; empty `src/index.ts`). Register in root `typecheck` script.
2. Write `src/types.ts`: enums from `07_enums.md`; entity schemas (`PresentationSchema` full + `PresentationListItemSchema` compact, `SlideSchema`, `SlideMediaSchema`, `CompositionElementSchema`, `ElementLayoutSchema`, `TextStyleSchema`, `ElementAnimationSchema`, `AudienceSchema`, pagination wrapper, upload-url response, view-state — admin needs it for the preview shape); request-body types (create/patch metadata, slide create/patch, composition PUT body, audience PUT body, media upload/confirm bodies).
3. Write `src/api/presentation-keys.ts` (list with filter params object, detail, preview).
4. Write `src/api/` functions + query hooks: `usePresentationsList(filters)` (maps dashboard filters → `status`/`q`/pagination params), `usePresentationDetail(id)`, `usePresentationPreview(id, {enabled})`.
5. Write `src/actions/` hooks: `useCreatePresentation`, `useUpdatePresentationMetadata`, `usePublishPresentation`, `useArchivePresentation`, `useCreateNewVersion`, `useAddSlide`, `useUpdateSlide`, `useDeleteSlide`, `useReorderSlides`, `useUploadSlideMedia` (3-step orchestration, progress, cancel), `useUpdateSlideMedia`, `useDeleteSlideMedia`, `useReorderSlideMedia`, `useReplaceComposition`, `useReplaceAudience`. All full-presentation responses write-through to `presentationKeys.detail(id)`.
6. Write `src/lib/use-presentation-builder-permissions.ts`.
7. Vitest: schema fixtures round-trip (one full presentation JSON from the backend docs parses), MSW-backed hook tests for list/detail/create/publish/upload orchestration (incl. S3 step failure → no confirm call), key-invalidation assertions.
8. Export the public API from `src/index.ts` (hooks, types, keys — no internals). Add root `test:presentation-builder` script.

## Risks and mitigations

- Risk: composition element schema too strict (backend synthesizes legacy elements with `client_id: null`).
  Mitigation: acceptance criterion 2 explicitly nullable; fixture test includes a legacy-synthesized slide from `09_slide_composition.md`.
- Risk: blind invalidation causes editor-visible refetch flicker later.
  Mitigation: write-through-from-response discipline (criterion 4) decided now, tested in step 7.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-builder`: all suites green (schemas, keys, hooks, upload orchestration).
- No Playwright in this phase (no UI).

## Review log

- `2026-07-22` Claude: drafted from master Phase 1.
- `2026-07-22` User: approved for implementation (no open clarifications; V1–V3 resolved at master level; no kit session needed — logic-only phase). Handed to Codex.
- `2026-07-22` Codex: implemented the complete builder logic foundation; `npm run typecheck` passed with zero errors and `npm run test:presentation-builder` passed 5 files / 16 tests. No scope deviations; lifecycle artifacts written and plan archived.

## Lifecycle transition

- Current state: `archived`
- Next state: Phase 2 may proceed under its own approved child plan.
- Transition owner: `Codex session (Phase 1)`
