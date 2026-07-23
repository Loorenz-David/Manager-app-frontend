# Codex — Phase 6: preview, publish flow, versioning UX (single session, lean brief)

You are implementing Phase 6 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phases 1–5 are complete: the editor fully drafts compositions (timeline, playback clock, mapping, flush). Start coding early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase6_editor_preview_publish_20260722.md` (status `approved`) — all acceptance criteria. Both clarifications are **resolved in the plan**: V2 (text-only slides publish fine — **never** mirror composition text into `slide.title`; the mitigation must not exist) and the user picker (builder-owned wrapper of the compact `/users` endpoint — mirror `packages/cases/src/api/list-users.ts`'s shape; no `@beyo/cases` dependency, no injected fetch).

## Carried from the Phase 5 review (do this first — you edit these files anyway)

`EditorView.tsx` and the panel wiring re-implement mapping conversions inline (`wireAnimation`/`editorAnimation`, font-size ×390/264) instead of importing the converters already exported from `lib/composition-mapping.ts`. Consolidate — behavior-identical refactor; the master rule is one mapping module.

## Read (only this)

1. The phase plan, fully.
2. Master plan — decisions #4 (publish dialog), #5 (read-only + "Edit as new version"), #11 (Scheduled = published + future starts_at).
3. Backend `docs/presentation_capability/backend/04_admin_presentations.md` (publish validation causes, PATCH does NOT re-derive priority from category, new-version semantics, preview endpoint) + `06_admin_audience.md` (both modes, matching semantics, own-workspace 403 rule).
4. Relational only: the Phase 6 kit files below (READ-ONLY), `src/dev/PublishKitPreview.tsx` (**reference consumer** — shows dialog assembly, audience-mode composition, priority-hint pattern), Phase 1 lifecycle/audience hooks, the Phase 5 controller/store/mapping exports, `packages/cases/src/api/list-users.ts` (endpoint shape to mirror).

## Component kit — READ-ONLY (pre-built by Claude)

`PreviewOverlay` (phone frame `children` slot, progress fraction, dots), `PublishDialogShell`/`PublishDialogSection`, `ChipCheckboxGroup`, `UserPickerList`, `PublishSettingsFields` (priority as **string** value — parsing is yours), `SchedulePickers` (datetime-local strings — UTC ISO conversion is yours), `PublishErrorSummary` — plus everything from earlier kits (`EditorReadOnlyBanner` already has the `onEditAsNewVersion` slot). Never edit kit DOM/classes/styling; `git diff -- packages/presentation-builder/src/components` must show no non-additive change; additive optional props only, recorded in the plan Review log first.

## Deliver (per the plan's criteria)

1. **Preview**: multi-slide playback hook over runtime primitives (advance at each slide's `duration_ms`, stop on last frame, total-progress fraction); entry flushes dirty slides; dev-only parity assertion vs `GET /{id}/preview` (stripped from prod); wire `PreviewOverlay` + the runtime renderer; enable the top bar's Preview button.
2. **Users**: builder-owned `list-users` api fn + query hook (compact, `q`, pagination) + keys.
3. **Publish dialog assembly + form model**: audience (both modes; `selected_users_only` blocks with zero users client-side; no workspace field), category/type/dismissible, priority (string→int parse, explicit value always sent on publish-time PATCH — PATCH never re-derives), schedule (local→UTC ISO, expires>starts validation), 422 causes mapped into `PublishErrorSummary` items + field errors — never only a toast.
4. **Lifecycle orchestration**: `publish()` = flush → `PUT audience` → `PATCH` metadata → `POST publish` with stepwise error mapping; `archive()` (editor top bar + dashboard card menu); `editAsNewVersion()` → switch the editor to the new draft id seamlessly; raced 409 → friendly refetch state. Verify the `new-version`-from-archived rule against the backend early and record the outcome in the plan Review log.
5. **Read-only completion**: single `readOnly` flag disables every mutating control across Phases 4–5 surfaces; banner shows "Published — read-only · vN" with the Edit-as-new-version slot wired; Scheduled state reflected post-publish.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime` && `npm run test:presentation-builder` (audience mapping, priority derivation display, 422 mapping, preview playback advance/stop suites added)
- `npx playwright test --config apps/presentation-studio/ManagerBeyo-app-presentation-studio/playwright.config.ts --grep "presentation-publish" --project=desktop` — full lifecycle: 2-slide draft → preview plays through → publish role-targeted → dashboard shows Published → open read-only → Edit as new version → draft v2 editable → archive v1; console/page-error guards
- Existing `presentation-dashboard|presentation-editor` flows still green
- `git diff -- packages/presentation-builder/src/components` → no non-additive kit change
- `rg -n "slide.title" packages/presentation-builder/src/lib packages/presentation-builder/src/editor` → no composition-text mirroring anywhere

## Finish

Only after green validation, per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_presentation_phase6_editor_preview_publish_20260722.md` → archive the phase plan → dated master Review-log entry → never archive/move the master. If validation cannot go green: plan `Status: debugging`, defect in its Review log, stop with a report. If you run low on context, finish the current numbered deliverable cleanly and report exactly what remains — never stop before writing code.

## Report back

Lifecycle state, files created/modified, all validation outputs, the new-version-from-archived verification outcome, deviations with justification.
