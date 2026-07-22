# PLAN_presentation_phase7_studio_validation_polish_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase7_studio_validation_polish_20260722`
- Status: `archived`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-23T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 7)

## Goal and intent

- Goal: Harden the creation side (Phases 1–6): complete every loading/empty/error/skeleton state, design-fidelity pass against the README tokens, accessibility pass, full Vitest coverage of remaining gaps, complete Playwright desktop suite, public-API audit of `presentation-runtime` + `presentation-builder`, and a frontend handoff document for future host apps of the builder.
- Business/user intent: the creation system is releasable and portable ("sellable") — a new host app can mount it from the handoff doc alone.
- Non-goals: new features; phone player work (Phases 8–9).

## Scope

- In scope: state/polish sweep (dashboard, editor, upload, preview, publish dialog — per design tokens: colors, radii, typography scale, shadows); error-boundary coverage for the editor route; 401-mid-session and 409-race behaviors exercised; a11y (focus order in dialogs/panels, keyboard on segmented controls + sliders, alt text passthrough, contrast); Vitest gap-fill to meaningful coverage of `lib/` modules (geometry, mapping, grouping, derivation at 100% branch); Playwright suite consolidation (auth, dashboard, editor-shell, timeline, publish specs stable + trace-on-retry per `34_runtime_validation.md`); `index.ts` audit (loader-function exports where surface-registered, no internal leaks, no default exports); root scripts final (`test:presentation-runtime`, `test:presentation-builder`, typecheck entries); handoff doc `docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md` (what a host app provides: auth, QueryClient, `@source`, navigation callbacks, user-picker injection if applicable; what the packages provide).
- Out of scope: `@beyo/presentations`; any new endpoint wrapping.
- Assumptions: Phases 1–6 implemented and individually validated.

- Division of labor (master): Codex runs the tests/coverage/bundle/public-API-audit half; the design-fidelity and a11y half of the checklist is executed by Claude in a paired session — Codex records but does not fix visual drift.

## Clarifications required

- [ ] None expected — this phase consolidates; any defect found that requires a design/backend decision is logged to the master review log instead.

## Acceptance criteria

1. Every async region has explicit loading/empty/error states; no unstyled flash; skeletons per `32_loading_skeletons.md`.
2. Design-fidelity checklist against the README's token tables (color/typography/radius/spacing/shadow/motion) passes on both screens.
3. Keyboard-only run-through: create → build slide with one text → publish, completable without a mouse (sliders/segmented controls/dialogs focusable and operable).
4. `npm run test:presentation-runtime` + `test:presentation-builder` green; pure-logic modules at 100% branch coverage.
5. Full desktop Playwright suite green twice consecutively (flake check).
6. Public-API audit passes: apps import only from package roots; runtime imports nothing from builder; no default exports.
7. Handoff document reviewed against a "cold host" thought-experiment: every mount step enumerated with no repo-tribal knowledge assumed.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/10_pages.md`, `architecture/32_loading_skeletons.md`: state completeness.
- `architecture/13_errors.md`: boundary + 401/409 behaviors.
- `architecture/17_testing.md`: coverage conventions.
- `architecture/34_runtime_validation.md`: Playwright consolidation, artifacts.
- `architecture/18_performance.md`: final memo/bundle pass (editor route lazy chunks per `30_dynamic_loading.md`).
- `architecture/30_dynamic_loading.md` (+ `_local`): chunk verification (no INEFFECTIVE_DYNAMIC_IMPORT).
- `architecture/35_shared_packages.md`: public-API + handoff conventions.
- `architecture/14_styling.md`: token application check.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: project names, artifacts, spec locations.
- `architecture/30_dynamic_loading_local.md`: preload utilities.

### File read intent — pattern vs. relational

Permitted relational reads: everything built in Phases 1–6 (it is the subject of this phase); `docs/handoff/` existing docs for handoff format precedent (relational: what a handoff here looks like). Prohibited: none new.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. State sweep with a written checklist per screen/region; fix gaps.
2. Design-token fidelity pass (README tables vs. implementation); fix drifts.
3. Error/edge pass: editor error boundary, 401 mid-session, 409 race, presigned-URL expiry re-render, `beforeunload` dirty guard re-verified.
4. A11y pass (criterion 3 flow).
5. Test gap-fill (Vitest), then Playwright consolidation + double-run.
6. Bundle/dynamic-loading verification for the two routes.
7. Public-API audit + fixes.
8. Write the hosting handoff doc; review against criterion 7.

## Risks and mitigations

- Risk: polish scope creeps into feature work.
  Mitigation: anything not expressible as "complete a missing state / fix drift from an already-approved spec" goes to the master review log as a proposal, not into this phase.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentation-runtime` && `npm run test:presentation-builder`: green, coverage thresholds met.
- `npx playwright test --grep presentation- --project=desktop`: full suite green ×2.

## Review log

- `2026-07-22` Claude: drafted from master Phase 7.
- `2026-07-23` User: approved — Phases 1–6 complete and reviewed; creation side functionally complete. Split execution per master "Division of labor": Codex half first (lean brief; carries four accumulated advisories: `ApiEnvelopeSchema` fold into `@beyo/lib`, notification-host assessment, dashboard `has_more` handling, hardcoded `workspaceName`), then the Claude-builder fidelity/a11y half, then lifecycle close.
- `2026-07-22` Codex (hardening/tests/audits half): completed all four carried advisories and the non-visual Phase 7 checklist. `@beyo/lib` is now `0.0.1`; its shared `ApiEnvelopeSchema` requires `ok: true`, builder consumes it, and the studio consumes the shared `NotificationHostProvider`. Dashboard truncation now emits an explicit once-per-filter overflow notice and the workspace label comes from the optional authenticated `workspace_name` claim (workspace ID/generic fallback only when absent). Added 401-mid-session and publish-409 Playwright cases, presigned-media error refetch while preserving dirty edits, and clean/dirty `beforeunload` coverage. Builder pure modules (`composition-mapping`, `presentation-dashboard`, `publish-form`, `timeline-geometry`) report 100% statements/branches/functions/lines with a persisted 100% branch threshold. Public roots were pruned of controller/store/mapping/geometry/publish internals; scans found no deep app package imports, runtime→builder dependency, package default exports, or `/history` wrapper. Production build emitted distinct dashboard/editor route entries, no `INEFFECTIVE_DYNAMIC_IMPORT`, and editor implementation only in the deferred builder chunk; the general >500 kB vendor/boot-chunk size warning remains outside this phase's acceptance gate. Hosting handoff written at `docs/handoff/from_frontend/HANDOFF_presentation_builder_hosting_20260722.md`. Validation: root typecheck exit 0; runtime 19/19, builder 94/94, Shopify 101/101; builder coverage 100% on all four named modules; desktop Playwright 10/10 green twice consecutively; presentation component-kit diff contains only additive optional media-error callbacks and no DOM/class changes. Master creation criteria 1–6 were re-audited against routes, dependency arrows, round-trip mapping tests, draft/read-only and 409 behavior, publish forms/errors, and renderer call sites. Plan intentionally remains `approved`; no archive or summary was written.

## For Claude

- No visual, token-fidelity, state-styling, contrast, or focus-order findings were identified during the behavior/test/audit half; this list is intentionally empty for handoff purposes.

- `2026-07-23` Claude (builder, fidelity/a11y half): **complete.** Kit purity verified by diff against baseline `8a1e0614` — only 3 component files changed since, all purely additive (zero removed className lines); Codex's added DOM (card menu, archive button) audited and accepted as token-consistent. Independent a11y pass on top of Codex's empty For-Claude list produced three kit improvements: PublishDialogShell gains Escape-to-close + focus-into-dialog on open; PreviewOverlay gains Escape-to-exit; PublishErrorSummary gains role="alert". Keyboard operability audit: every interactive is a native button/input/textarea/range (tabbable + operable); timeline bars are Enter/Space-selectable (drag remains pointer-only, acceptable for v1 — the criterion-3 create→text→publish flow needs no bar drag). Validation after edits: tsc exit 0; 94/94 builder tests; full desktop Playwright suite 10/10. Both halves complete — archiving.

## Lifecycle transition

- Current state: `approved`
- Next state: `archived` (after BOTH halves complete and validation is green; Codex writes summary/archives only then)
- Transition owner: `Codex session (Phase 7)` + `Claude-builder (fidelity/a11y half)`
