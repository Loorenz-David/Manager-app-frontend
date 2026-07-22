# Codex — Phase 4: `@beyo/presentation-runtime` + editor shell, slides, media

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–3 are implemented and archived (builder logic layer, studio shell, dashboard).

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase4_editor_shell_slides_media_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Component kit (pre-built by Claude — READ-ONLY for you)

Per the master's "Division of labor" section, this phase's presentational components already exist in `packages/presentation-builder/src/components/`, design-approved: editor top bar, slide rail + rail card, canvas bezel/placeholder, media upload overlay (progress/cancel/error states).

- **Never** restyle, restructure markup, or edit class lists in kit components. Your job: the runtime package (renderer is logic/layout math — yours), the draft store, upload orchestration, slide ops, and assembly — feeding state through the kit's typed prop contracts.
- Purely additive optional props allowed without touching DOM/classes; anything structural/visual → plan Review log + stop for Claude. Never improvise styled components.
- If the kit is missing, STOP and report — the kit session runs before this one.

## Read before writing any code, in this order

1. The child plan, fully — this phase has **two deliverables**: the new runtime package (static renderer) and the editor structural shell.
2. The master plan — "Package boundaries" (runtime has ZERO network/auth imports; dependency arrows point inward only), "Design → backend mapping" (background media = layer 0 full-bleed; `REFERENCE_CANVAS_WIDTH = 390`), decisions #6 (hybrid save), #8 (multiple media).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second).
5. Design ground truth: `docs/presentation_capability/design/README.md` §1b (layout regions, tokens) + both editor screenshots.
6. Backend: `docs/presentation_capability/backend/05_admin_slides_media.md` (slide CRUD, 2-step S3 upload, MIME/size caps) + `09_slide_composition.md` (element shape, ordering, legacy synthesized elements with `client_id: null`).

## Hard rules

- **No timeline, no playback, no text editing, no properties panels beyond the media-replace affordance** — Phase 5 owns those. The canvas renders the selected slide statically at t=0.
- Schema ownership moves composition schemas to `@beyo/presentation-runtime` with builder re-exports (planned move — do it cleanly, no duplicated schema definitions anywhere).
- Slide ops are eager with write-through-from-response (never blind invalidation); deleting the last slide is blocked; upload failures at the S3 step must never call the confirm endpoint.
- Non-draft presentations: read-only banner + every mutating affordance disabled; this screen must never trigger a 409.
- Clarification default applies: video thumbnails use `poster_url` or the stripe placeholder — no poster generation UX.
- Relational reads per the plan's whitelist only. `data-testid` on all feature-critical elements.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors (runtime package registered).
- `npm run test:presentation-runtime` + `npm run test:presentation-builder` — green (renderer recipe fixtures, scaling, store hydration/reconciliation, upload guards).
- `npx playwright test --grep presentation-editor-shell --project=desktop` — open draft → add slide → upload image → reorder → delete → title edit persists across reload.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Validation green → write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase4_editor_shell_slides_media_20260722.md`.
2. Archive record in `docs/architecture/archives/`.
3. Plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify.
4. Dated entry in the master plan's Review log (note the S3-CORS check outcome from the plan's risk section). Never archive/move the master.
5. Validation not green → plan stays, `Status: debugging`, defect logged, stop with a report.

## Report back

End with: lifecycle state, files created/modified, validation output, deviations with justification.
