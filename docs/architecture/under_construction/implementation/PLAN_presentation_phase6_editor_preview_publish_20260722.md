# PLAN_presentation_phase6_editor_preview_publish_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase6_editor_preview_publish_20260722`
- Status: `approved`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T22:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 6)
- Design reference: design README "Preview overlay"; backend `04_admin_presentations.md`, `06_admin_audience.md`

## Goal and intent

- Goal: Complete the authoring lifecycle: full-deck preview overlay, the publish dialog (audience + metadata, master decision #4), publish/archive/new-version actions with 409/422 UX, and the read-only + "Edit as new version" mode (decision #5). (**V2 resolved** — see clarifications.)
- Business/user intent: a manager can check the announcement end-to-end, choose exactly who sees it and when, and publish/correct/retire it safely.
- Non-goals: phone player (Phases 8–9); What's New; version-history browsing UI beyond what read-only mode needs.

## Scope

- In scope: preview overlay (dark `#161616`, centered 300×533 phone, plays all slides in order via runtime clock/renderer, per-slide durations, stop on last frame, ✕ Exit, play/pause, total-progress bar, slide dots with active-dot widening; fed from local draft state after flushing dirty slides — with a `GET /{id}/preview` parity check, see step 2); publish dialog (modal per `28_surfaces.md`: audience mode toggle, app targets manager/worker/seller/admin, role targets, user picker, `selected_users_only` requires ≥1 user; category, presentation_type, is_dismissible, display_priority with category-derived default + explicit override, starts_at/expires_at pickers with expires>starts validation); publish action (flush → `PUT audience` → `PATCH` metadata → `POST publish`, surfacing each 422 cause on its field/dialog area); archive action (dashboard card menu + editor top bar, confirm); new-version action + full read-only mode (banner, disabled editing, prominent "Edit as new version" → `POST new-version` → editor switches to the new draft id); Scheduled state reflected post-publish ("sends <date>").
- Out of scope: non-goals; push/socket notification on publish (backend-side; Phase 9 consumes the socket).
- Assumptions: Phases 1–5 complete; `useReplaceAudience`, lifecycle hooks exist since Phase 1.

- Division of labor (master): the preview-overlay/publish-dialog/read-only-banner kit is built by Claude before the Codex session; Codex owns audience mapping, lifecycle orchestration, error-cause mapping, and assembly; kit components are read-only for Codex.

## Clarifications required

- [x] **V2 — RESOLVED (backend team, 2026-07-22)**: yes — publish accepts a slide whose only content is composition elements (elements OR media OR title/description); text-only timed slides are first-class with a passing backend test. **Mitigation dropped: never mirror composition text into `slide.title`** — title is legacy metadata; the composition is the source of truth. (`04_admin_presentations.md` corrected backend-side.)
- [x] **User picker data source — RESOLVED (user decision, 2026-07-22)**: `@beyo/presentation-builder` owns a tiny `list-users` api function + query hook against the same compact `/users` endpoint that `packages/cases/src/api/list-users.ts` wraps (mirror its request/response shape — `compact: true`, `q`, pagination; relational read only). No dependency on `@beyo/cases`; no injected fetch. Keeps the builder self-contained/sellable.

## Acceptance criteria

1. Preview overlay matches the design section: advances at each slide's duration, total progress = elapsed/total, dots widen active, stops on final frame; rendering is pixel-consistent with the editor canvas (same renderer, different scale).
2. Publish dialog expresses every audience form in `06_admin_audience.md` (both modes, four dimensions, own-workspace-only implied — no workspace field shown, per backend 403 rule) and blocks `selected_users_only` with zero users client-side.
3. `display_priority` shows the category-derived default live (alert 300 / workflow 200 / improvement 100 / news-none 0) and an explicit override wins; PATCH-vs-create derivation asymmetry (`04_admin_presentations.md`) is handled by always sending explicit `display_priority` on publish-time PATCH.
4. Publish 422s map to visible causes (no slides, empty slide, media invalid, schedule inverted, selected-users empty, unknown keys) — never a generic toast alone; 409 (raced non-draft) lands in a friendly refetch state.
5. Read-only mode: no mutating control enabled anywhere (top bar, rail, canvas, timeline, panels); "Edit as new version" creates v+1 and seamlessly re-enters edit mode on the new id; dashboard reflects both versions per Phase 3 grouping.
6. Archive works from draft and published; archived opens read-only without "Edit as new version"? — no: backend allows `new-version` from any status? (`new-version` copies content; allowed regardless of archived — verify; default: offer it) → recorded in review log after verification.
7. No code anywhere writes `slide.title` from composition text (V2 resolved — the mitigation must NOT exist).

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/07_components.md`, `architecture/10_pages.md`.
- `architecture/09_forms.md`: publish dialog fields, server-error mapping.
- `architecture/28_surfaces.md` (+ `_local`): modal surface for the dialog + full-screen overlay pattern for preview.
- `architecture/31_animations.md`: overlay enter/exit, dot transitions.
- `architecture/24_dto.md`: audience form model ↔ `PUT audience` body.
- `architecture/20_notifications.md`: success toasts (published/archived/new version).
- `architecture/32_loading_skeletons.md`: dialog pending states.
- `architecture/35_shared_packages.md` §13: injected user-picker fetch (if clarification 2 resolves to injection).
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md`.

### Local extensions loaded

- `architecture/28_surfaces_local.md`: modal is a valid surface type.
- `architecture/34_runtime_validation_local.md`.

### File read intent — pattern vs. relational

Permitted relational reads: existing users/members feature (`src/features/users/types.ts` in an app, or a package) to resolve clarification 2 — what exists, exact endpoint/fields; Phase 1 lifecycle hooks. Prohibited: reading other publish-like dialogs for structure.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Verify the `new-version`-from-archived rule against the backend (dev request); record the outcome in the Review log. (V2 already resolved — no verification, no mitigation.)
2. Preview: `usePresentationPreviewPlayback` (multi-slide clock over runtime primitives), `PreviewOverlay` components; entry flushes dirty slides first; dev-only parity assertion comparing local composition against `GET /{id}/preview` elements (catches mapping drift; stripped from prod).
3. Publish dialog: audience form model + zod validation, user picker (per clarification 2 resolution), metadata fields, priority derivation display, schedule pickers; `PublishDialog` composed per `09_forms.md` + `28_surfaces.md`.
4. Lifecycle orchestration in the editor controller: `publish()` (flush → audience → metadata → publish, stepwise error mapping), `archive()` (+ dashboard card menu wiring from Phase 3's deferred clarification), `editAsNewVersion()`.
5. Read-only mode completion: disable matrix across all Phase 4–5 components (single `readOnly` from controller), banner + CTA.
6. Vitest: audience mapping, priority derivation, 422 cause mapping, preview playback advance/stop logic.
7. Playwright (desktop): full lifecycle — build 2-slide draft → preview plays through → publish with role-targeted audience → dashboard shows Published → open read-only → Edit as new version → draft v2 editable → archive v1.

## Risks and mitigations

- Risk: publish is 3 sequential calls; a mid-sequence failure leaves audience/metadata saved but unpublished.
  Mitigation: acceptable (draft state is consistent); dialog reopens with saved values and a "not yet published" notice; retry republishes idempotently.
- Risk: user picker source doesn't exist package-side.
  Mitigation: injection fallback pre-designed (clarification 2), keeping the builder sellable.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-builder`: new suites green.
- `npx playwright test --grep presentation-publish --project=desktop`: step 7 lifecycle passes.

## Review log

- `2026-07-22` Claude: drafted from master Phase 6.
- `2026-07-22` User: approved — Phases 1–5 complete; both clarifications resolved (V2: no mitigation; user picker: builder-owned `/users` wrapper). Claude-builder preview/publish kit session precedes the Codex session (lean brief). Carried into the session: consolidate EditorView/panel inline mapping into `composition-mapping.ts` (Phase 5 review advisory).

## Lifecycle transition

- Current state: `approved`
- Next state: `archived` (by the Codex session via `plan_lifecycle_orchestrator` after green validation; `debugging` if validation fails)
- Transition owner: `Codex session (Phase 6)`, after the Claude-builder kit session
