# Codex — Phase 3: `floor-app` bootstrap (thin kiosk shell)

You are implementing exactly **one phase** of the ManagerBeyo clock-in/out floor kiosk capability, working in the `frontend/` monorepo root. Phase 2 (floor auth) is implemented and archived. A Claude session has already committed the **chrome kit** (KioskFrame, KioskHeader, DeviceSignInCard, DeviceSettingsSurface chrome, the `RiseSurface` shell in `@beyo/ui`, kiosk tokens in `@beyo/styles`, fonts) — those files are **read-only** for you.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/clock_in_out_app/plans/PLAN_clock_kiosk_phase3_floor_app_bootstrap_20260729.md`
- Governing master: `docs/architecture/under_construction/implementation/clock_in_out_app/PLAN_clock_kiosk_master_20260729.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — decisions #1, #2, #6, #7, #9, #12; "Package boundaries" (what the app may own: nothing kiosk-logical).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Contracts from the child plan — `14_styling.md` §14 (`@source` registration) is mandatory; `12_auth_local.md`; `28_surfaces_local.md`.
5. Permitted relational reads only: `apps/presentation-studio/.../src/app/*` (the minimal shell you copy), managers-app `{vite.config.ts, index.css, package.json, index.html, src/main.tsx, playwright.config.ts}`, `packages/styles/src/index.css`, `packages/auth` component prop surfaces, root `package.json`.
6. The chrome kit's prop types (`read`, never edit).

## Hard rules

- **Thin shell.** Auth, routing, providers, device config, styling, chrome assembly. Zero kiosk flow logic — the `/` route holds an empty placeholder inside the real chrome. Anything that would survive a port to another host app does not belong in this app.
- No tabs, no `TabSlideStack`, no `RealtimeProvider` (master decisions #2, #8). The surface registry + `SurfaceProvider` engine IS kept. You register the kit's `RiseSurface` shell as the new surface type `"rise"` in the `@beyo/ui` SurfaceProvider renderer — **additively**: existing surface types byte-untouched, `@beyo/ui` surface tests extended, `architecture/28_surfaces_local.md` gains the `rise` entry (child plan criterion 4b). The device-settings surface registers with type `rise`.
- `AuthProvider appScope="floor"` — device sign-in per Phase 2; a 401/`auth:session-expired` lands on sign-in with the "terminal signed out" note.
- Device settings opens ONLY via 600ms long-press on the header identity block; logout lives inside it behind a confirm step.
- Kit components are read-only: never restyle, never restructure, never edit class lists; additive optional props only, recorded in the plan's Review log.
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm install` clean from `frontend/`; `npm run typecheck` — zero errors including the new workspace.
- Floor app `npm run test:unit` — clock hook, device store, router guards green.
- `npx playwright test --grep floor-bootstrap --project=desktop` — mocked sign-in → chrome with terminal label + ticking clock.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`: summary `SUMMARY_clock_kiosk_phase3_floor_app_bootstrap_20260729.md` → archive record → plan archived + moved → dated master Review log entry. On failed validation: `Status: debugging`, record, stop with a report.

## Report back

End with: lifecycle state, the final `@source` list, files created/modified, validation output, deviations with justification.
