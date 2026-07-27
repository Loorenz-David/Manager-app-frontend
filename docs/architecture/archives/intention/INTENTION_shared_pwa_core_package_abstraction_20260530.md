# INTENTION_shared_pwa_core_package_abstraction_20260530

## Metadata

- Intention ID: `INTENTION_shared_pwa_core_package_abstraction_20260530`
- Status: `active`
- Owner: `github-copilot`
- Created at (UTC): `2026-05-30T14:49:27Z`
- Last updated at (UTC): `2026-05-30T15:58:28Z`

## Goal

Abstract reusable PWA runtime behavior from the managers app into a shared package so multiple apps can adopt a consistent install and update lifecycle without duplicating logic.

## Immediate pre-migration gate (must happen first)

Before extracting runtime behavior into a shared package, stabilize current managers-app PWA behavior in-place:

1. Fix post-update UI instability after "Update now" (layout/viewport/nav must remain usable without force-closing the app).
2. Reduce time-to-detect available service-worker updates after app open/foreground.

Package abstraction work starts only after both are validated in the current managers app.

## Why this matters

PWA install/update reliability is currently implemented in one app, while other apps either duplicate or miss the behavior. A shared runtime reduces divergence, preserves the proven update flow that prevents installed versions from stalling, and accelerates adoption across apps.

## Success criteria

0. Current managers app passes the pre-migration stabilization gate:

- applying an update from the in-app update sheet results in a clean, immediately usable UI state,
- update availability is detected with an intentionally faster check cadence than current baseline.

1. A shared `@beyo/pwa` package exposes the reusable runtime lifecycle (service-worker update detection, install prompt capture, standalone detection, and action callbacks) with no app-specific routing or branding assumptions.
2. The workers app consumes the shared runtime first (validation gate) and can trigger equivalent update/install actions through its app-owned UI/surface wiring.
3. The managers app then consumes the same shared runtime with no regression to its current reliable update behavior sequence.
4. App-level PWA build configuration (Vite plugin config, manifest metadata, icons, and public assets) remains app-owned and unchanged in ownership boundaries.
5. Both target apps pass build/typecheck after adoption and preserve expected runtime behavior for update prompt and install prompt paths.

## Scope boundary

- In scope:
  - Managers-app-first stabilization for the two known PWA reliability issues (post-update UI breakage and delayed update discovery).
  - Reusable PWA runtime logic currently in managers app provider: service worker registration lifecycle, refresh gating, install prompt lifecycle, and cleanup semantics.
  - Shared package API design for callback-driven integration into app surfaces/components.
  - Workers-first validation strategy before managers migration.
  - Optional shared presentational surfaces only if they remain app-injected and do not violate package boundaries.
- Out of scope:
  - App-specific Vite PWA plugin configuration, manifest values, icon assets, and branding metadata.
  - Global app routing and app shell boot order redesign.
  - Non-PWA feature migration.
- Non-goals:
  - Forcing identical install/update UI copy across apps.
  - Moving all PWA concerns into packages regardless of ownership fit.
  - Bypassing workers-first validation.

## Linked implementation plans

| Plan ID                                                | Path                                                                                                | Status     | Covers                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| `PLAN_managers_pwa_update_reliability_hotfix_20260530` | `docs/architecture/archives/implementation/PLAN_managers_pwa_update_reliability_hotfix_20260530.md` | `archived` | Fix post-update UI instability after update sheet apply flow in current managers app          |
| `PLAN_managers_pwa_update_detection_latency_20260530`  | `docs/architecture/archives/implementation/PLAN_managers_pwa_update_detection_latency_20260530.md`  | `archived` | Speed up update discovery cadence in current managers app before extraction                   |
| `PLAN_shared_pwa_runtime_contract_20260530`            | `docs/architecture/archives/implementation/PLAN_shared_pwa_runtime_contract_20260530.md`            | `archived` | Define `@beyo/pwa` package API, ownership boundaries, and callback/surface injection contract |
| `PLAN_workers_first_pwa_runtime_adoption_20260530`     | `docs/architecture/archives/implementation/PLAN_workers_first_pwa_runtime_adoption_20260530.md`     | `archived` | Integrate shared runtime in workers app first and validate update/install behavior            |
| `PLAN_managers_pwa_runtime_migration_20260530`         | `docs/architecture/archives/implementation/PLAN_managers_pwa_runtime_migration_20260530.md`         | `archived` | Switch managers app from local PWA runtime provider to shared package runtime                 |

## Progress notes

- `2026-05-30`: Added a hard sequencing gate: fix managers-app PWA reliability bugs first, then proceed with shared-package extraction.
- `2026-05-30`: Recorded two pre-migration implementation plan tracks for (1) post-update UI stability and (2) update-detection latency.
- `2026-05-30`: Audited current managers PWA feature and confirmed reusable core exists in provider-level runtime orchestration (`useRegisterSW`, `beforeinstallprompt`, `appinstalled`, one-shot prompt gates).
- `2026-05-30`: Confirmed workers app currently has a placeholder PWA provider, making it an appropriate first consumer for validation.
- `2026-05-30`: Confirmed contract constraint that PWA configuration ownership remains app-specific; only runtime logic is a package candidate.
- `2026-05-30`: Identified package-boundary requirement to avoid package-direct `openSurface` ownership; app should inject UI/surface openers through typed callbacks.
- `2026-05-30`: Implemented and archived both pre-migration gate plans in managers app (`reliability_hotfix` and `detection_latency`) with managers typecheck passing.
- `2026-05-30`: Authored all three extraction implementation plans (`shared_pwa_runtime_contract`, `workers_first_pwa_runtime_adoption`, `managers_pwa_runtime_migration`) with full file-level implementation detail. Open question about sheet components resolved: runtime-only provider with app-owned sheet pages (answer confirmed by `surfaceOpeners` injection pattern from `architecture/35_shared_packages.md` §13).
- `2026-05-30`: Implemented and archived `PLAN_shared_pwa_runtime_contract_20260530`; created `packages/pwa` source package and validated both managers `npm run typecheck` and package `npx tsc --noEmit`.
- `2026-05-30`: Implemented and archived `PLAN_workers_first_pwa_runtime_adoption_20260530`; workers app now consumes `@beyo/pwa`, workers `npm run typecheck` and `npm run build` pass, and PWA manifest/service worker are generated.
- `2026-05-30`: Implemented and archived `PLAN_managers_pwa_runtime_migration_20260530`; managers app now consumes `@beyo/pwa` with app-owned PWA sheets/surfaces preserved, managers/workers typechecks pass, and managers build passes.

## Open questions

- ~~Should `@beyo/pwa` include default sheet components or expose runtime-only hooks/provider and let each app own UI?~~ **Resolved**: runtime-only `PwaProvider` with `PwaSurfaceOpeners` injection; sheet pages stay app-owned.
- Should the shared package expose telemetry/debug hooks for update/install events? — impact if unresolved: cross-app diagnosis of PWA lifecycle issues may remain inconsistent.
- What minimum browser support matrix should gate the shared runtime contract (iOS Safari nuances, Android Chrome behavior)? — impact if unresolved: behavior differences could appear after cross-app rollout.

## Lifecycle transition

- Current status: `active`
- Next status: `achieved`
- Transition trigger: shared runtime package defined and adopted by workers then managers, with contract boundaries respected and success criteria met.
