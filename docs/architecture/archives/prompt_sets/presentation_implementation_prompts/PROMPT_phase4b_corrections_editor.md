# Codex — Phase 4b: editor shell, slides, media (F2+F3 of the Phase 4 corrections plan)

You are implementing **parts F2 and F3** of an approved corrections plan, working in the `frontend/` monorepo root. Session 4a already delivered `@beyo/presentation-runtime` (static renderer + schema ownership). **Verify first:** `packages/presentation-runtime/src` exists and `npm run test:presentation-runtime` is green — if not, STOP and report.

Start coding early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase4_corrections_20260722.md` — **acceptance criteria 4–12, implementation steps 2–6.**

## Read (only this)

1. The corrections plan, fully.
2. Master plan — decisions #5 (read-only + new-version UX; only the banner this phase), #6 (hybrid save: structural ops eager, composition local — Phase 4 only does the structural side), "Design → backend mapping" (background = layer 0 full-bleed).
3. Backend `docs/presentation_capability/backend/05_admin_slides_media.md` (slide CRUD, 2-step S3 upload, exact MIME/size caps) and `09_slide_composition.md` §"Backward compatibility" + the element-embedded media shape (for the carried round-trip fixture).
4. Relational only: Phase 1 hooks/actions in `packages/presentation-builder/src/{api,actions}` (what exists), the editor kit prop contracts in `packages/presentation-builder/src/components/editor/` (READ-ONLY — see below), runtime's public exports, the studio's `EditorPage.tsx`/`router.tsx`/`DashboardPage.tsx` (adapter precedent).

## Component kit — READ-ONLY

The approved editor kit (`EditorShell`, `EditorTopBar`, `EditorReadOnlyBanner`, `SlideRail`, `SlideRailCard`, `EditorCanvas`, `MediaUploadOverlay`) is Claude-owned. Never edit its DOM/classes/styling. `git diff -- packages/presentation-builder/src/components/editor` must show no non-additive change. A strictly additive optional prop must be recorded in the corrections plan Review log before use. Wire everything through the existing props (`onTitleCommit`, `onReorder(id, targetIndex)`, `onFilesDropped`, `thumbnail` ReactNode slot, etc.).

## Deliver

Per the plan's criteria 4–12: editor draft store (hydration incl. `client_id: null` synthesized elements, dirty/revision tracking, atomic reconcile-from-response), controller (detail load, slide select/add/delete/reorder with the four tested behaviors, debounced changed-only title PATCH, upload orchestration for background + overlay with the documented caps, read-only derivation making 409 unreachable), `EditorView` assembling the untouched kit with runtime-rendered thumbnails + canvas, thin studio `EditorPage` adapter, the embedded-media round-trip fixture, and the full desktop Playwright `presentation-editor-shell` flow with console/page-error guards.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime` && `npm run test:presentation-builder`
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep presentation-editor-shell --project=desktop`
- `rg -n "/history" packages/presentation-runtime packages/presentation-builder apps/presentation-studio` → no wrapper/scaffolding
- `git diff -- packages/presentation-builder/src/components/editor` → no non-additive kit change

## Finish (criterion 12)

Only after green validation, per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: write `SUMMARY_presentation_phase4_editor_shell_slides_media_20260722.md` in `docs/architecture/implemented_summaries/`; archive the **original** Phase 4 plan (status `archived`, `mv` to `docs/architecture/archives/implementation/`, verify); append the implementation entry to the master Review log; **leave the corrections plan `approved` in place** for independent re-review. Never archive/move the master.

If validation cannot go green: corrections plan → `Status: debugging`, defect in its Review log, stop with a report. If you run low on context, finish the current step cleanly and report exactly what remains — never stop before writing code.

## Report back

Lifecycle state, files created/modified, all validation outputs, embedded-media fixture outcome, deviations with justification.
