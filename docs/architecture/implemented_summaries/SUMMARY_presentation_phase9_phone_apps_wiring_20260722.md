# SUMMARY_presentation_phase9_phone_apps_wiring_20260722

## Metadata

- Original plan: `PLAN_presentation_phase9_phone_apps_wiring_20260722` (archived)
- Corrections plan: `PLAN_presentation_phase9_corrections_20260722` (approved; awaiting independent re-review)
- Governing master: `PLAN_presentation_capability_master_20260722` (archived with this phase — capability complete)
- Implemented at (UTC): 2026-07-22 → 2026-07-23
- Execution: original session stalled (zero output) → corrections plan → three lean Codex sessions (9a seams / 9b managers / 9c replicate) → operator+builder live matrix + close-out

## Outcome

`@beyo/presentations` is mounted in all three phone apps. A studio-published announcement reaches exactly its targeted app(s), auto-shows only on the home route, plays with authored timing through the shared runtime renderer, records its full view-state loop, arrives live over the socket while connected, and never reappears once completed.

## Delivered

- **9a (package seams)**: named surface entries (default exports removed, loaders map named→default for lazy hosts), reactive `canAutoShow` provider gate (deferral/home-release/off-home/mid-show/boot-race tested), typed `app_update_presentation:published`/`:archived` events + reusable invalidation-only socket helper.
- **9b (managers-app)**: provider (`appKey="manager"`) at the authenticated shell with exact-home + foreground gating, store-backed openers (with a stable `SurfaceHeaderContext` boundary for hosted entries), router-backed CTA, both socket events, lazy code-split player chunk verified out of boot.
- **9c (sellers + workers)**: recipe replicated (`seller`/`worker` keys), sellers gained its missing Playwright/vitest configuration, per-app glue tests + mobile-then-desktop `presentation-player` specs, bundle chunk evidence for all three apps.
- **Live-run fix**: consumer `category` made nullable (backend serves null; parse failed silently and blocked the player) + regression test. Earlier same-day: editor auto-creates the first slide for empty drafts.

## Live cross-app matrix (operator-run servers, 2026-07-23)

Three single-`app_key` announcements published against the live backend; 12/12 scripted assertions plus realtime/deferral flows:

| Check | Result |
|---|---|
| Each app auto-shows ONLY its targeted announcement (home route) | ✅ ×3 |
| Manager: timed deck auto-completes, closes, never reappears (cold reload) | ✅ |
| Worker: non-dismissible → no dismiss affordance; acknowledge-only exit; never reappears | ✅ |
| Seller: CTA renders and navigates in-app | ✅ |
| Realtime: publish while app open on home → auto-opens without reload | ✅ |
| Off-home deferral: no auto-open on tasks tab; released on returning home | ✅ |
| Frontend eligibility logic | none — backend decided every outcome |

Chrome check (builder): player visuals kit-faithful in all three apps (segmented progress, scaled composition text, acknowledge footer).

## Validation (final)

- Root `npm run typecheck`: green (all workspaces).
- `test:presentations` 18/18 (incl. the null-category regression) · per-app glue suites green · all three apps' `presentation-player` Playwright specs 1/1 mobile + desktop (9b/9c) · boot chunks player-free with named lazy chunks · `/history` + default-export + eligibility scans clean.

## Notes

- The capability (Phases 1–9) is complete. Optional follow-ups on record: backend structured publish-validation causes; backend list-endpoint enrichment already shipped mid-project.
