# PLAN_presentation_phase2_studio_bootstrap_20260722

## Metadata

- Plan ID: `PLAN_presentation_phase2_studio_bootstrap_20260722`
- Status: `under_construction`
- Owner agent: `Claude`
- Created at (UTC): `2026-07-22T00:00:00Z`
- Last updated at (UTC): `2026-07-22T00:00:00Z`
- Related issue/ticket: none provided
- Intention plan: `docs/architecture/under_construction/implementation/PLAN_presentation_capability_master_20260722.md` (master — Phase 2)

## Goal and intent

- Goal: Bootstrap the new **desktop** app `apps/presentation-studio/ManagerBeyo-app-presentation-studio` as a thin shell: Vite + TS + Tailwind, auth (admin + manager users), routing, providers, `@source` styling registration, and desktop chrome. Routed pages exist but are empty placeholders.
- Business/user intent: a standalone PC application for building announcements, deletable/replaceable without touching `@beyo/presentation-builder`.
- Non-goals: any dashboard/editor content (Phases 3–6); PWA/service-worker features (phone-app concern; the studio is a plain desktop web app in v1); responsive/mobile layout.

## Scope

- In scope: app workspace scaffold, root `package.json` workspaces entry (already covered by `apps/*/*` globs — verify), `index.css` per `14_styling.md` §14 with `@source` for every consumed package, `AuthProvider` wiring + sign-in page, router (`/` dashboard, `/editor/:presentationId`, sign-in route), QueryClient + notification + surface providers per existing app conventions, minimal desktop top-level layout (the mockup's top bar shell without dashboard content), env plumbing (`03_environment.md`), root `typecheck` extension.
- Out of scope: everything rendered inside the two routes; permission-based UI (Phase 3+ consumes the Phase 1 helper).
- Assumptions: master decision #2 (admin + manager users); **V1 resolved** — sign in with `appScope="manager"`.

## Clarifications required

- [x] **V1 — RESOLVED (backend team, 2026-07-22)**: the `admin` scope is restricted to the admin role; the `manager` scope permits both manager and admin roles. The studio uses **`appScope="manager"`**. Role — not app_scope — gates authoring endpoints, so both roles author fully. If the studio ever calls consumer endpoints, `app_key` comes from the JWT `app_scope` claim, never hardcoded.

## Acceptance criteria

1. `npm run dev --workspace managerbeyo-app-presentation-studio` serves a sign-in → empty dashboard flow with working session (sign-in, refresh, sign-out) for both an admin and a manager account.
2. Both routes lazy-load per `11_routing.md`/`30_dynamic_loading_local.md`; deep-linking `/editor/:id` unauthenticated redirects to sign-in and back.
3. `index.css` `@source` covers `@beyo/ui`, `@beyo/presentation-builder` (and later `@beyo/presentation-runtime`) so no styles are missing (the `14_styling.md` §14 failure mode).
4. Worker/seller-role sign-in is rejected or lands on a clear "not for this app" state (backend 403s are surfaced, not blank-screened).
5. Root `typecheck` includes the new workspace; zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: app skeleton baseline.
- `architecture/03_environment.md`: `VITE_` env conventions (API base URL).
- `architecture/04_api_client.md`: client setup provided app-side.
- `architecture/11_routing.md`: lazy routes, guarded routes.
- `architecture/12_auth.md`: AuthProvider/session baseline.
- `architecture/14_styling.md` (§14 especially): `@source` table + template `index.css`.
- `architecture/23_providers.md`: provider shell composition.
- `architecture/30_dynamic_loading.md`: lazyRoute/lazyWithPreload.
- `architecture/28_surfaces.md`: surface host setup (dialogs/modals used from Phase 3 on).
- `architecture/20_notifications.md`: notify host.
- `architecture/35_shared_packages.md`: what the app owns vs. the package.

### Local extensions loaded

- `architecture/01_architecture_local.md`: `route-entry.tsx` pattern.
- `architecture/12_auth_local.md`: sign-in body (`app_scope`), `/logout`, JWT-claims boot.
- `architecture/28_surfaces_local.md`: valid surface types (`slide`, `sheet`, `modal`).
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path.

### File read intent — pattern vs. relational

Permitted relational reads: `apps/managers-app/ManagerBeyo-app-managers/` — `package.json`, `vite.config.ts`, `index.css`, `src/main.tsx`, `src/app/RootRoute.tsx` (what an app shell concretely wires: `appScope` prop, provider order, route entries). Prohibited: reading managers-app features/pages for structure.

### Skill selection

- Primary skill: none. Trigger terms: n/a. Excluded: n/a.

## Implementation plan

1. Scaffold `apps/presentation-studio/ManagerBeyo-app-presentation-studio` (Vite react-ts, name `managerbeyo-app-presentation-studio`), mirroring managers-app config surface (aliases, tsconfig, eslint) minus PWA/service worker.
2. `index.css` from `14_styling.md` §14 template with `@source` entries for all consumed packages.
3. Env: `VITE_API_BASE_URL` (+ any names `03_environment.md` mandates), `.env.example`.
4. App shell: `main.tsx` → providers (QueryClient, Auth with `appScope="manager"` [V1 resolved], notifications, surface host) → router. Desktop-width layout container (`#f4f4f4` app background per design tokens; content chrome only).
5. Routes: sign-in, `/` (empty `DashboardPage` placeholder), `/editor/:presentationId` (empty `EditorPage` placeholder), catch-all → `/`. Auth guard + post-login redirect.
6. Sign-in page reusing `@beyo/auth` components/hooks per `12_auth_local.md`.
7. Register workspace in root `typecheck`; confirm workspaces glob picks the app up; `npm install` lockfile update.
8. Smoke-verify both roles in dev: manager-role and admin-role sign-in with `appScope="manager"` (V1 already resolved on paper; this confirms wiring, not policy).

## Risks and mitigations

- Risk: V1 wrong → manager users locked out. — **Closed**: resolved by backend team before implementation; `appScope="manager"` fixed.
- Risk: missing `@source` entries produce silently unstyled package UI in Phase 3.
  Mitigation: acceptance criterion 3 + checklist against the §14 table at review.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Manual: admin + manager sign-in/refresh/sign-out; worker rejection state; deep-link guard.
- `npx playwright test --grep presentation-studio-auth --project=desktop`: sign-in → dashboard placeholder smoke spec (first studio spec; fixtures per `34_runtime_validation_local.md`).

## Review log

- `2026-07-22` Claude: drafted from master Phase 2.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `Claude`
