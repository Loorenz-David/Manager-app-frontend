# 60 — Testing & validation playbook

How to prove a presentation-capability change works, from cheapest to most complete.
Run from the frontend repo root.

## Commands

| Level | Command | Covers |
|---|---|---|
| Types | `npm run typecheck` | All apps + all packages (includes the three presentation packages + studio). |
| Runtime unit | `npm run test:presentation-runtime` | Renderer, animation registry, clock, ordering, parity fixture. |
| Builder unit | `npm run test:presentation-builder` | Draft store, composition mapping (round-trips), timeline geometry, publish form, dashboard derivations, controllers, upload flow, **rendering parity**, MSW-backed hook tests. |
| Player unit | `npm run test:presentations` | Provider orchestration (deferral/release/boot-race/mid-show), view-state loop, playback, surfaces + dismiss matrix, socket events, consumer schema regressions (null category), player parity. |
| App glue | per-app vitest configs (e.g. `apps/workers-app/…/vitest.config.ts`) | The four glue files' behavior per app. |
| E2E | each app's Playwright `presentation-player` spec (+ studio dashboard/editor specs) — run **mobile project first, then desktop**; servers are **user-started** | Real routing + surface store + lazy chunks. |

When a change spans layers, run the packages in dependency order: runtime → builder
and/or presentations → app glue.

## What guards what (pick the suite matching your change)

- **Renderer/schema change (doc 10)** → runtime suite **plus both** parity suites
  (`rendering-parity.test.tsx` in builder, `PresentationPlayer.parity.test.tsx` in
  player). If output legitimately changes, update
  `rendering-parity-fixture.ts` and both expectations together.
- **Editor↔server mapping (doc 21)** → always add a round-trip case to
  `composition-mapping.test.ts`; corrupt mappings save silently.
- **Consumer schema (doc 40)** → add a regression fixture case in
  `packages/presentations/src/types.test.ts` mirroring the *live* payload shape
  (pattern: the null-category test). Parse a real `/active` response before
  tightening anything.
- **Provider policy (doc 40)** → extend `ActivePresentationProvider.test.tsx`;
  deferral/release and terminal-once are pinned there.
- **Publish flow (doc 21)** → `publish-form.test.ts` (payloads + 422 mapping).
- **Kit styling (docs 22/40)** → verify visually in the studio kit routes
  `/kit/{dashboard,editor,timeline,publish,player}` (DEV-only; user starts the
  server). Update the matching `dev/*KitPreview.tsx` for new variants.

## Test infrastructure

Each package has `src/test/`: `fixtures.ts` (canonical payloads — extend, don't
fork), `server.ts` (MSW handlers), `setup.ts`, `test-utils.tsx` (providers wrapper).
Builder MSW handlers must serve **route-appropriate payloads** — a glob that fed a
detail route a list payload once produced a phantom Playwright failure.

## E2E pitfalls

- **Mobile Playwright taps:** clicks inside gesture-wrapped containers (PullToRefresh
  etc.) are swallowed by `filterTaps`; use `tap()` (the shared press helper), not
  `click()`.
- Servers are user-started (studio 5176, managers 5173, workers 5174, sellers 5175
  locally); ask, never launch.
- Lazy-chunk check: after touching surface registration, confirm the player is not
  in any app's boot chunk (build output lists named lazy chunks).

## Live verification (the full matrix)

For lifecycle-level changes, replay the phase-9 matrix approach: publish targeted
announcements per `app_key` via the admin API, then assert per-app receipt,
completion persistence (cold reload), non-dismissible chrome, CTA navigation,
realtime auto-open, and off-home deferral. The matrix definition and last green run:
`docs/architecture/implemented_summaries/SUMMARY_presentation_phase9_phone_apps_wiring_20260722.md`.

## Environment repair

`Cannot find module '@rolldown/binding-darwin-arm64'` (all vitest suites dead):
`npm install @rolldown/binding-darwin-arm64 --save-optional`; fallback
`rm -rf node_modules package-lock.json && npm install`.
