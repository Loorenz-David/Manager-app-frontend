# Codex — Phase 2: `presentation-studio` app bootstrap (thin desktop shell)

You are implementing exactly **one phase** of the ManagerBeyo presentation capability, working in the `frontend/` monorepo root. Phase 1 (`@beyo/presentation-builder` logic layer) is already implemented and archived.

## Your plan

- Implement: `docs/architecture/under_construction/implementation/PLAN_presentation_phase2_studio_bootstrap_20260722.md`
- Governing master: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md`

## Read before writing any code, in this order

1. The child plan, fully.
2. The master plan — "Decisions resolved with the user" (#1, #2), "Open verification items" (**V1**), "Package boundaries" (what the app may and may not own).
3. `task_system/frontend_contract_goal_mapping_guide.md`.
4. Every contract in the child plan's "Contracts loaded" (canonical first, `_local` second; local wins).
5. Permitted relational reads only (child plan "File read intent"): managers-app `package.json`, `vite.config.ts`, `index.css`, `src/main.tsx`, `src/app/RootRoute.tsx`; `packages/auth` AuthProvider prop surface.

## Hard rules

- The app is a **thin shell**: auth, routing, providers, styling, desktop chrome. Zero builder logic — anything that would survive a port to another host app belongs in `@beyo/presentation-builder`. Routed pages stay empty placeholders.
- No PWA/service worker; no mobile/responsive work; desktop only.
- **V1 is resolved (backend team, 2026-07-22):** the studio signs in with **`appScope="manager"`** — the `manager` scope permits both manager and admin roles; the `admin` scope is restricted to the admin role. Role, not app_scope, gates authoring endpoints. Never hardcode `app_key="admin"` anywhere; if a consumer endpoint is ever called, `app_key` comes from the JWT `app_scope` claim. See master "Open verification items — ALL RESOLVED" and backend `02_conventions.md` → "Role vs. app_scope — two independent axes".
- Do not invent requirements; unresolved ambiguity without a stated default → stop and ask.

## Validation (must be green before lifecycle processing)

- `npm run typecheck` — zero errors (new workspace included).
- Manual: admin + manager sign-in/refresh/sign-out; worker-role rejection state; `/editor/:id` deep-link guard round-trip.
- `npx playwright test --grep presentation-studio-auth --project=desktop` — sign-in → dashboard placeholder smoke spec passes.

## After implementation — process the plan

Follow `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md`:

1. Only once validation is green: write `docs/architecture/implemented_summaries/SUMMARY_presentation_phase2_studio_bootstrap_20260722.md`.
2. Create the archive record in `docs/architecture/archives/`.
3. Set plan `Status: archived`, update `Last updated at`, `mv` to `docs/architecture/archives/implementation/`, verify the move.
4. Append a dated entry to the master plan's Review log (include the dual-role sign-in smoke result). Never archive or move the master.
5. If validation fails: leave the plan in place, set `Status: debugging`, record it in the plan Review log, stop with a report.

## Report back

End with: lifecycle state, dual-role sign-in result, files created/modified, validation output, deviations with justification.
