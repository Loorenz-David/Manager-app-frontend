# Codex — Phase 8: `@beyo/presentations` phone player (single session, lean brief)

You are implementing Phase 8 of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. The creation side (Phases 1–7) is complete, reviewed, and committed. The `packages/presentations` skeleton EXISTS (package.json, tsconfig, the Claude-built player chrome kit, dev preview) — you add the consumer API, orchestration, playback, and surface wrappers. Start coding early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase8_player_package_20260722.md` (status `approved`) — all acceptance criteria. Both clarifications are **resolved in the plan**, including the full dismiss-chrome matrix (read it carefully — slide_page uses the surface's own `setSwipeDismissDisabled` controller).

## Read (only this)

1. The phase plan, fully (esp. the resolved dismiss-chrome matrix and acceptance criteria 1–7).
2. Backend `docs/presentation_capability/backend/03_consumer_endpoints.md` — the exact `/active` + `view-state` semantics, errors, and the typical loop — and `02_conventions.md` §"Role vs. app_scope" (`app_key` must equal the token's `app_scope`; the host app passes it, never hardcode).
3. Master plan — decision #10 and the "Package boundaries" section (player is app-agnostic; everything app-specific is injected).
4. Relational only: the kit files below (READ-ONLY), `src/dev/PlayerKitPreview.tsx` (**reference consumer** — shows chrome assembly incl. the dismissible/acknowledge conditional logic), `@beyo/presentation-runtime` public exports (`usePlaybackClock`, `SlideCompositionRenderer`), `packages/ui/src/components/surfaces/SlidePageSurface.tsx` (the `setSwipeDismissDisabled` + `closeInterceptor` context surface — relational), one existing package's `surface-ids.ts` (openers convention), `packages/presentation-builder/src/preview/use-presentation-preview-playback.ts` (multi-slide playback precedent — mirror the approach, do not import builder).

## Component kit — READ-ONLY (pre-built by Claude, in `packages/presentations/src/components/player/`)

`PlayerViewport` (measures itself, render-prop `{width,height}` for the runtime renderer), `PlayerSegmentedProgress` (story-style segments, `activeFraction` from your clock), `PlayerTapZones` (prev/next), `PlayerDismissButton` (`variant: "x" | "skip"`), `PlayerCtaButton`, `PlayerAcknowledgeFooter`, `PlayerModalFrame`, `PlayerFullScreenFrame`. Never edit kit DOM/classes/styling; `git diff -- packages/presentations/src/components` must show no non-additive change; additive optional props only, recorded in the plan Review log first.

## Deliver (per the plan's criteria)

1. **Consumer layer**: `types.ts` composing runtime schemas (consumer presentation shape + `view_state`; schemas stay draft-lenient where the wire allows), `api/` (`useActivePresentation(appKey)` + exported `activePresentationKeys`), `actions/useRecordViewState` (all four actions, `version` guard; failures never block playback; `dismissed` only when `is_dismissible`).
2. **Playback**: multi-slide hook over runtime primitives honoring all three `playback_mode`s — `timed` auto-advance at `duration_ms`, `manual` tap-next (kit `PlayerTapZones`), `media_driven` video `currentTime` clock. Presigned URLs never persisted; expiry → `/active` refetch.
3. **`PresentationPlayer`** assembly through the kit: renderer inside `PlayerViewport`, segmented progress, tap zones, CTA via injected navigate callback, dismiss/acknowledge per the matrix (acknowledge → `completed` → close; dismiss → `dismissed` → close).
4. **Surfaces**: three wrappers — modal/full_screen use the kit frames; **slide_page** renders inside the host's `SlidePageSurface` and, when `is_dismissible: false`, calls `setSwipeDismissDisabled(true)` from the surface context (restore on unmount) and shows the acknowledge footer; when dismissible, the surface's gesture close records `dismissed` (use the surface context's close-interception point). `surface-ids.ts` + `PresentationsSurfaceOpeners` + loader functions per §13–14.
5. **Orchestration**: `ActivePresentationProvider` — single owner of "currently presenting": `shown` (index 0) on display, `progressed` monotonic, terminal action → `/active` refetch → next presentation; dedupe so a mid-show invalidation never double-opens.
6. **Tests**: MSW view-state loop (incl. version guard + dismiss-after-complete 409), playback modes with fake clock, and the **rendering-parity fixture** (same composition JSON rendered in a builder preview test and a player test). Register `test:presentations` in root scripts.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentations` && `npm run test:presentation-runtime` && `npm run test:presentation-builder`
- `rg -n "/history" packages/presentations` → nothing wrapped
- `rg -n "@beyo/presentation-builder|apps/" packages/presentations/src` → no forbidden imports
- `git diff -- packages/presentations/src/components` → no non-additive kit change
- Playwright is deferred to Phase 9 (needs a host app) — state this explicitly in the summary.

## Finish

Only after green validation, per `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_presentation_phase8_player_package_20260722.md` → archive the phase plan → dated master Review-log entry → never archive/move the master. If validation cannot go green: plan `Status: debugging`, defect in its Review log, stop with a report. If you run low on context, finish the current numbered deliverable cleanly and report exactly what remains — never stop before writing code.

## Report back

Lifecycle state, files created/modified, all validation outputs (parity fixture result explicitly), deviations with justification.
