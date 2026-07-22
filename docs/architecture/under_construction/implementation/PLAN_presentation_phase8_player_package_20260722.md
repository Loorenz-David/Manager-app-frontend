# PLAN_presentation_phase8_player_package_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase8_player_package_20260722`
- Status: `approved`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 8)
- Backend contract: `docs/presentation_capability/backend/03_consumer_endpoints.md` (+ `09` for rendering)
- Note: Re-validated against the shipped runtime on 2026-07-23 — its public API (`SlideCompositionRenderer`+props, `usePlaybackClock`/`advancePlaybackTime`, `REFERENCE_CANVAS_WIDTH`, composition schemas incl. draft-lenient `sequence_order`) matches this plan's assumptions. Consumer schemas compose runtime schemas exactly as Phase 1's builder types now do.

## Goal and intent

- Goal: Create `@beyo/presentations` (`packages/presentations`): the phone player. Consumer API layer (`/active`, `view-state`), the active-presentation orchestration (fetch → show → record → refetch loop), and player surfaces for the three `presentation_type`s, all rendering through `@beyo/presentation-runtime`.
- Business/user intent: users in the manager/seller/worker phone apps see the one announcement targeted at them, watch it with the authored timing/animations, and never see it again once completed/dismissed.
- Non-goals: What's New history (master non-goal; `GET /history` never wrapped); app wiring (Phase 9); realtime subscription itself (Phase 9 wires it; this package exposes the invalidation hook point).

## Scope

- In scope: package skeleton; consumer `types.ts` (composing runtime schemas; consumer presentation shape incl. `view_state`); `api/` (`useActivePresentation(appKey)`, keys) + `actions/` (`useRecordViewState` — shown/progressed/dismissed/completed with `version` guard); orchestration provider `ActivePresentationProvider` (single owner of "currently presenting": marks shown on display, progressed per slide advance monotonic, completed at end, dismissed via close when `is_dismissible`, then refetches `/active` for the next; dedupe so one presentation never double-opens); player UI: `PresentationPlayer` (portrait deck: timed auto-advance per slide `duration_ms` via runtime clock, manual-advance fallback for `manual` slides, progress bar + dots per design preview overlay, dismiss affordance gated on `is_dismissible`, CTA button per slide `action` navigating via injected callback); three surface wrappers per `presentation_type` (`modal`, `full_screen`, `slide_page`) + `surface-ids.ts` with `PresentationsSurfaceOpeners` (surface opening + navigation injected per `35_shared_packages.md` §13); loader functions per §14.
- Out of scope: history feed; push notifications; app registration.
- Assumptions: runtime renderer/clock are stable (Phase 7 done); master decision #10.

- Division of labor (master): the player chrome kit (progress, dots, CTA, dismiss affordances, deck containers) is built by Claude before the Codex session; Codex owns consumer api/hooks, view-state orchestration, playback modes, provider, and assembly; kit components are read-only for Codex.

## Clarifications required

- [x] All three `playback_mode`s are in v1 player scope (`timed` auto-advance, `manual` tap-next, `media_driven` video clock) — standing recommendation, unobjected; the backend can serve all three even though the studio only writes `timed`.
- [x] **Dismiss chrome — RESOLVED (user decision, 2026-07-23)**:
  - **slide_page**: the surface's built-in left-to-right slide-to-close gesture IS the dismiss affordance when `is_dismissible: true` (gesture close records `dismissed`). When `is_dismissible: false`, the gesture is **deactivated via the surface's own controller** — `setSwipeDismissDisabled(true)` from the `SlidePageSurface` context (verified: `packages/ui/src/components/surfaces/SlidePageSurface.tsx`; a `closeInterceptor` is also available) — and the user must acknowledge through a **footer button** (records `completed`, then closes).
  - **modal**: X top-right when dismissible; no X when not — acknowledge button on the final slide is the only exit (same principle, builder-proposed default standing).
  - **full_screen**: "Skip" text button top-right when dismissible; absent when not — final-slide acknowledge button exits (builder-proposed default standing).
  - In every type, the acknowledge/finish affordance records `completed`; dismiss affordances record `dismissed` and exist only when `is_dismissible`.

## Acceptance criteria

1. View-state loop matches `03_consumer_endpoints.md` exactly: `shown` (with `last_slide_index: 0`) on first display; `progressed` monotonic on advance; `completed` on finish; `dismissed` only when `is_dismissible`; all with `version`; 409/422 handled without crashing playback; after terminal action → `/active` refetch surfaces the next eligible presentation (one at a time).
2. Rendering parity: a presentation authored in the studio plays with identical timing/animation/position via the shared runtime renderer (fixture: same composition JSON rendered in builder preview test and player test).
3. All three `playback_mode`s honored (timed auto-advance, manual tap, media_driven video clock) and all three `presentation_type`s render in their surface form.
4. Non-dismissible presentations offer no dismiss path; completion is the only exit.
5. Presigned URL expiry (≈24h) handled by refetching `/active`, never persisting URLs.
6. The package exposes `activePresentationKeys` so Phase 9's realtime handler can invalidate without reaching into internals; provider dedupes so invalidation mid-show never double-opens (master risk).
7. No app-specific import anywhere; navigation/surface opening fully injected.

## Contracts and skills

### Contracts loaded

- Core set (01, 02, 04, 05, 06, 08, 13, 15).
- `architecture/16_feature_workflow.md`: build order.
- `architecture/07_components.md`, `architecture/10_pages.md`: player composition.
- `architecture/23_providers.md`: `ActivePresentationProvider` shell.
- `architecture/24_dto.md`: consumer shape → player view model.
- `architecture/28_surfaces.md` (+ `_local`): modal/full_screen/slide_page surface mapping.
- `architecture/27_responsive.md`: phone-first player.
- `architecture/31_animations.md`: surface enter/exit; deck transitions.
- `architecture/30_dynamic_loading.md` (+ `_local`): loader functions, preload.
- `architecture/35_shared_packages.md` §13–14: openers/loader conventions.
- `architecture/18_performance.md`: player must not weigh on app boot (lazy, preload-on-idle guidance for Phase 9).
- `architecture/17_testing.md`, `architecture/34_runtime_validation.md`.

### Local extensions loaded

- `architecture/28_surfaces_local.md`, `architecture/30_dynamic_loading_local.md`, `architecture/34_runtime_validation_local.md`.

### File read intent — pattern vs. relational

Permitted relational reads: `@beyo/presentation-runtime` public API (what shipped); `packages/celebration` or `packages/notifications` `surface-ids.ts` (relational confirmation of openers convention). Prohibited: reading phone-app feature UIs for structure.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Resolve both clarifications (modes scope + dismiss chrome) with the user.
2. Scaffold package; consumer types composing runtime schemas; keys/api/action hooks + MSW tests (view-state semantics incl. version guard + 409 dismiss-after-complete).
3. Multi-slide playback hook over runtime primitives (timed/manual/media_driven), tests with fake clock.
4. `PresentationPlayer` + deck chrome (progress, dots, CTA, dismiss per clarification); `data-testid` throughout.
5. Surface wrappers ×3 + `surface-ids.ts` + loader functions; provider orchestration (criterion 1, 6).
6. Parity fixture test (criterion 2); root scripts (`test:presentations`, typecheck).

## Risks and mitigations

- Risk: runtime API drift between Phase 5-as-planned and as-shipped.
  Mitigation: the re-validate note in metadata; step 2 starts from the shipped exports.
- Risk: view-state chattiness on flaky mobile networks.
  Mitigation: endpoint is idempotent/safe-to-retry per backend docs; mutations use retry; failures never block playback UI.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test:presentations`: view-state loop, playback modes, parity fixtures green.
- Playwright deferred to Phase 9 (player needs a host app to run in).

## Review log

- `2026-07-22` Claude: drafted from master Phase 8.

- `2026-07-23` User: approved — creation side (Phases 1–7) complete and reviewed clean. All clarifications resolved (dismiss-chrome matrix incl. `setSwipeDismissDisabled` for slide_page; all three playback modes in scope). Claude-builder player-chrome kit session precedes the lean-brief Codex session; kit scaffolds the package skeleton, Codex adds api/orchestration/surfaces.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `archived` (by the Codex session via `plan_lifecycle_orchestrator` after green validation; `debugging` if validation fails)
- Transition owner: `Claude`
