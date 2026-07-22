# SUMMARY_presentation_phase8_player_package_20260722

## Metadata

- Plan: `PLAN_presentation_phase8_player_package_20260722` (archived)
- Governing master: `PLAN_presentation_capability_master_20260722` (remains under construction)
- Implemented at (UTC): `2026-07-22`
- Package: `@beyo/presentations`

## Outcome

Phase 8 is complete. The phone-player package now owns the app-agnostic consumer loop from `/active` through display, monotonic progress, terminal state, close, and next-presentation refetch. Host apps inject `appKey`, navigation, and surface openers; no app implementation is imported.

## Delivered

- Runtime-composed, draft-lenient consumer schemas for presentations, slides, actions, media/composition elements, and view state.
- `activePresentationKeys`, `getActivePresentation`, and `useActivePresentation(appKey)` with the required token-scope-derived `app_key` argument.
- `recordPresentationViewState` and `useRecordViewState` for `shown`, `progressed`, `dismissed`, and `completed`, always carrying the presentation `version`; retries are non-blocking and non-dismissible dismissal is suppressed before the network.
- Multi-slide playback through `usePlaybackClock`: timed auto-advance, manual tap advance, and media-driven video `currentTime`/`ended` playback.
- `PresentationPlayer` assembly through the approved player kit and shared `SlideCompositionRenderer`, including segmented progress, tap zones, injected CTA navigation, media-expiry refetch, and the complete dismiss/acknowledge matrix.
- Modal and full-screen kit-frame wrappers plus a slide-page wrapper integrated with `SurfaceHeaderContext`. Non-dismissible slide pages call `setSwipeDismissDisabled(true)` and restore it on unmount; dismissible gesture closes are intercepted to record `dismissed` first.
- Surface IDs, typed `PresentationsSurfaceOpeners`, lazy loader functions, and `SurfacePropsContext` entry adapters for Phase 9 host registration.
- `ActivePresentationProvider` as the sole display owner, with shown-on-open, monotonic progress, terminal refetch, failure-safe closing, and mid-show invalidation dedupe.
- Root `test:presentations` script and tests for the MSW consumer loop, version/409 guards, orchestration dedupe, playback modes, surface matrix, and rendering parity.

## Rendering parity

One shared composition fixture in `@beyo/presentation-runtime` is rendered at the same reference dimensions in both a builder-preview test and a phone-player test. Both assertions pass for normalized placement and reference-scaled typography, confirming the two consumers use the same runtime recipe.

## Validation

- `npm run typecheck`: PASS, exit 0.
- `npm run test:presentations`: PASS — 5 files, 10 tests.
- `npm run test:presentation-runtime`: PASS — 4 files, 19 tests.
- `npm run test:presentation-builder`: PASS — 16 files, 95 tests, including the builder half of the parity fixture.
- `rg -n "/history" packages/presentations`: PASS — no matches.
- `rg -n "@beyo/presentation-builder|apps/" packages/presentations/src`: PASS — no matches.
- `git diff -- packages/presentations/src/components`: PASS — empty; the Claude-built kit was not changed.
- `git diff --check`: PASS.

## Deviations and follow-up

- No specification deviations. The shared parity fixture and builder assertion are additive test support required by acceptance criterion 2.
- Playwright is explicitly deferred to Phase 9 because the player needs a registered host app and surface stack.

