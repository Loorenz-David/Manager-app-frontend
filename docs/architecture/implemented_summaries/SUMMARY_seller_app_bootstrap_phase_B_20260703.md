# SUMMARY_seller_app_bootstrap_phase_B_20260703

## Metadata

- Summary ID: `SUMMARY_seller_app_bootstrap_phase_B_20260703`
- Source plan: `docs/architecture/archives/implementation/PLAN_seller_app_bootstrap_phase_B_20260703.md`
- Implemented at (UTC): `2026-07-03T19:51:35Z`

## Implementation summary

- Replaced the Phase A seller placeholder with the full Phase B app bootstrap: global providers, root route wiring, protected and guest routing, tab-shell routing, realtime registry, push and notification mounts, and seller-scoped auth boot.
- Added the shared shell layer from the manager app: `AppShell`, `TabOutlet`, bottom navigation, more-tabs popup, tab badge controller/provider, and primary-tab preload wiring so all tab routes render through the animated shell.
- Added the Phase B seller-specific route surfaces and stubs: notification deep-link handling, cases and PWA partial surface stubs, task socket events, sign-in page, case conversation route hydrator, and placeholder pages for home, stats, upholstery inventory, tasks, cases, settings, and not found.
- Fixed two typecheck blockers discovered during verification: narrowed the seller unread-case prefetch call and replaced the `@beyo/tasks` SVG `?react` export with a local React wrapper component so the workspace package builds cleanly under TypeScript.

## Verification

- `npm run typecheck`: passed in `apps/selleres-app/ManagerBeyo-app-sellers`.

## Notes

- `npm run dev` was not run in this pass.
- `npx playwright test --project=mobile` was not run in this pass.
